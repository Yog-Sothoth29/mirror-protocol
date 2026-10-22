#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import net from "node:net";
import crypto from "node:crypto";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  acquireWatcherLock,
  isThemeWatcherCommand,
  releaseWatcherLock,
  stopThemeWatcher,
  stopThemeWatchers,
  themeWatcherPids,
  watcherLockPath,
} from "./runtime-lifecycle.mjs";

const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "codex-theme-lifecycle-"));
const runtimePath = path.join(temporary, "runtime fixture.mjs");
const statePath = path.join(temporary, "state.json");
const port = 19335;
let checks = 0;

try {
  const command = `${process.execPath} "${runtimePath}" --watch --port ${port}`;
  assert.equal(isThemeWatcherCommand(command, runtimePath, port), true); checks += 1;
  assert.equal(isThemeWatcherCommand(command, runtimePath, port + 1), false); checks += 1;
  assert.equal(isThemeWatcherCommand(`${process.execPath} "${runtimePath}" --remove --port ${port}`, runtimePath, port), false); checks += 1;
  assert.deepEqual(themeWatcherPids(runtimePath, port, { processRowsImpl: () => [
    { pid: 10, command },
    { pid: 11, command: `${process.execPath} other.mjs --watch --port ${port}` },
  ] }), [10]); checks += 1;

  const signals = [];
  let fakeCommand = command;
  assert.equal(await stopThemeWatcher(10, runtimePath, port, {
    commandForImpl: () => fakeCommand,
    killImpl: (_pid, signal) => { signals.push(signal); fakeCommand = ""; },
    graceMs: 0,
  }), true); checks += 1;
  assert.deepEqual(signals, ["SIGTERM"]); checks += 1;

  fakeCommand = command;
  signals.length = 0;
  await stopThemeWatcher(10, runtimePath, port, {
    commandForImpl: () => fakeCommand,
    killImpl: (_pid, signal) => { signals.push(signal); if (signal === "SIGKILL") fakeCommand = ""; },
    graceMs: 0,
    killMs: 0,
  });
  assert.deepEqual(signals, ["SIGTERM", "SIGKILL"]); checks += 1;

  signals.length = 0;
  assert.equal(await stopThemeWatcher(10, runtimePath, port, {
    commandForImpl: () => `${process.execPath} unrelated.mjs`,
    killImpl: (_pid, signal) => signals.push(signal),
  }), false); checks += 1;
  assert.deepEqual(signals, []); checks += 1;

  const stopped = [];
  const commands = new Map([[20, command], [21, command]]);
  await stopThemeWatchers(runtimePath, port, {
    processRowsImpl: () => [...commands].map(([pid, value]) => ({ pid, command: value })),
    commandForImpl: (pid) => commands.get(pid) ?? "",
    killImpl: (pid) => { stopped.push(pid); commands.delete(pid); },
    graceMs: 0,
  });
  assert.deepEqual(stopped, [20, 21]); checks += 1;

  await fs.writeFile(watcherLockPath(statePath, port), `${JSON.stringify({ pid: 99999, port })}\n`);
  const staleRecovered = await acquireWatcherLock(statePath, port, { runtimePath, commandForImpl: () => "" });
  assert.equal(staleRecovered, watcherLockPath(statePath, port)); checks += 1;
  await releaseWatcherLock(staleRecovered);
  await assert.rejects(fs.access(staleRecovered)); checks += 1;

  await fs.writeFile(watcherLockPath(statePath, port), `${JSON.stringify({ pid: 42, port })}\n`);
  await assert.rejects(
    acquireWatcherLock(statePath, port, { runtimePath, commandForImpl: () => command }),
    /already owns CDP port/,
  ); checks += 1;
  await fs.rm(watcherLockPath(statePath, port), { force: true });

  await fs.writeFile(runtimePath, "process.on('SIGTERM', () => process.exit(0)); setInterval(() => {}, 1000);\n");
  const child = spawn(process.execPath, [runtimePath, "--watch", "--port", String(port)], { stdio: "ignore" });
  await new Promise((resolve, reject) => {
    child.once("error", reject);
    const deadline = Date.now() + 3000;
    const poll = () => {
      try { process.kill(child.pid, 0); resolve(); }
      catch { if (Date.now() >= deadline) reject(new Error("fixture did not start")); else setTimeout(poll, 20); }
    };
    poll();
  });
  await stopThemeWatcher(child.pid, runtimePath, port);
  if (child.exitCode === null && child.signalCode === null) await new Promise((resolve) => child.once("exit", resolve));
  assert.throws(() => process.kill(child.pid, 0)); checks += 1;

  const actualRuntimePath = fileURLToPath(new URL("./runtime.mjs", import.meta.url));
  const signalPort = 29335;
  const signalStatePath = path.join(temporary, "signal-state.json");
  const signalLockPath = watcherLockPath(signalStatePath, signalPort);
  // Windows terminates a child on SIGTERM without running JS signal handlers.
  // Verify its graceful cleanup through the supported authenticated manager API instead.
  const controlPort=await new Promise(resolve=>{const probe=net.createServer();probe.listen(0,'127.0.0.1',()=>{const p=probe.address().port;probe.close(()=>resolve(p));});});
  const token=crypto.randomBytes(32).toString('hex');
  const args=[actualRuntimePath, "--watch", "--port", String(signalPort), "--theme", "deepseek-blue", "--state-path", signalStatePath];
  if(process.platform==='win32')args.push('--control-port',String(controlPort),'--control-token',token);
  const runtime = spawn(process.execPath, args, { stdio: "ignore" });
  const lockDeadline = Date.now() + 5000;
  while (true) {
    try { await fs.access(signalLockPath); break; }
    catch {
      if (runtime.exitCode !== null) throw new Error(`runtime exited before acquiring lock: ${runtime.exitCode}`);
      if (Date.now() >= lockDeadline) throw new Error("runtime did not acquire watcher lock");
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }
  if(process.platform==='win32') {
    let response;
    for(let attempt=0;attempt<100;attempt++){
      try {response=await fetch(`http://127.0.0.1:${controlPort}/api/shutdown`,{method:'POST',headers:{'x-cts-token':token,'content-type':'application/json'},body:'{}'});break;}
      catch{await new Promise(resolve=>setTimeout(resolve,25));}
    }
    assert.equal(response?.status,200);checks+=1;
  }else runtime.kill("SIGTERM");
  if (runtime.exitCode === null && runtime.signalCode === null) await new Promise((resolve) => runtime.once("exit", resolve));
  assert.equal(runtime.exitCode, 0); checks += 1;
  await assert.rejects(fs.access(signalLockPath)); checks += 1;

  console.log(JSON.stringify({ pass: true, checks, gracefulExit:process.platform==='win32'?'authenticated control API (Windows SIGTERM is abrupt)':'SIGTERM' }, null, 2));
} finally {
  await fs.rm(temporary, { recursive: true, force: true });
}
