#!/usr/bin/env node
// Read-only waiting helper. It never requests exit or terminates an application.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { takeRoot, requireNode, readInstallation, managerState } from './installer-common.mjs';

export async function acquireActivationLock(root, { isPidPresent } = {}) {
  const filename = path.join(root, 'activation.lock');
  const value = JSON.stringify({ pid: process.pid, id: crypto.randomUUID(), startedAt: new Date().toISOString() });
  let handle;
  try { handle = await fs.open(filename, 'wx', 0o600); }
  catch (error) {
    if (error.code === 'EEXIST' && isPidPresent) {
      const previous = await fs.readFile(filename, 'utf8');
      let record;
      try { record = JSON.parse(previous); } catch { throw new Error('Invalid activation.lock; refusing to remove it automatically.'); }
      if (!Number.isInteger(record.pid) || record.pid <= 0) throw new Error('Invalid activation lock PID.');
      if (!await isPidPresent(record.pid)) {
        // Only remove a dead owner's exact record, never a changed or live lock.
        if (await fs.readFile(filename, 'utf8') !== previous) throw new Error('Activation lock changed; retry after checking the active helper.');
        await fs.unlink(filename);
        return acquireActivationLock(root);
      }
    }
    if (error.code === 'EEXIST') throw new Error('Another activation helper already holds activation.lock. Do not start a second helper.');
    throw error;
  }
  await handle.writeFile(value);
  await handle.close();
  return async () => {
    try { if (await fs.readFile(filename, 'utf8') === value) await fs.unlink(filename); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  };
}

// Dependencies are explicit so safety behavior can be checked without touching Codex.
export async function waitAndActivate({ listPids, cdpReady, apply, update, checkContinue = async () => true, now = Date.now, sleep = ms => new Promise(resolve => setTimeout(resolve, ms)), timeoutMs = 600000, pollMs = 3000 }) {
  const deadline = now() + timeoutMs;
  let previousCount = null;
  while (true) {
    if (!await checkContinue()) {
      await update({ phase: 'cancelled', message: 'Activation was cancelled or the installation was removed or changed. No activation command was launched.' });
      return { phase: 'cancelled', exitCode: 3 };
    }
    const pids = await listPids();
    const ready = pids.length > 0 && await cdpReady();
    if (pids.length === 0 || ready) {
      if (!await checkContinue()) {
        await update({ phase: 'cancelled', message: 'Activation was cancelled or the installation was removed or changed. No activation command was launched.' });
        return { phase: 'cancelled', exitCode: 3 };
      }
      await update({ phase: 'applying', runningProcesses: pids.length, message: ready ? 'Codex already exposes the theme debugging endpoint; applying once.' : 'Codex has exited. Applying once and opening the official app.' });
      // Deliberately one call, without --restart-existing, even if it fails.
      const result = await apply();
      const ok = result === undefined || result === 0;
      await update({ phase: ok ? 'applied' : 'failed', runningProcesses: pids.length, exitCode: result ?? 0, message: ok ? 'Theme application command completed. Check live status and verification before reporting success.' : 'Theme application command failed. No automatic retry or application termination was attempted.' });
      return { phase: ok ? 'applied' : 'failed', exitCode: result ?? 0 };
    }
    if (now() >= deadline) {
      await update({ phase: 'timed-out', runningProcesses: pids.length, message: 'Stopped waiting after the time limit. Codex was left running and no activation command was launched.' });
      return { phase: 'timed-out', exitCode: 2 };
    }
    await update({ phase: 'waiting', runningProcesses: pids.length, heartbeatOnly: pids.length === previousCount, message: 'Waiting for you to fully exit Codex from its menu. This helper will not close or terminate it.' });
    previousCount = pids.length;
    await sleep(Math.min(pollMs, Math.max(0, deadline - now())));
  }
}

async function safeFile(filename) {
  try {
    const info = await fs.lstat(filename);
    if (!info.isFile() || info.isSymbolicLink()) throw new Error('Activation output must be a regular file: ' + path.basename(filename));
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
}

async function main() {
  requireNode();
  const { root, args } = takeRoot(process.argv.slice(2));
  let timeoutMs = 600000;
  if (args.length) {
    if (args.length !== 2 || args[0] !== '--timeout-ms' || !/^\d+$/.test(args[1])) throw new Error('Usage: node activate-after-exit.mjs [--root directory] [--timeout-ms 1000..600000]');
    timeoutMs = Number(args[1]);
    if (timeoutMs < 1000 || timeoutMs > 600000) throw new Error('Timeout must be between 1000 and 600000 milliseconds.');
  }
  const installation = await readInstallation(root);
  const platform = await import(pathToFileURL(path.join(installation.release, 'runtime/scripts/platform-runtime.mjs')).href);
  const unlock = await acquireActivationLock(installation.root, { isPidPresent: async pid => platform.processRows().some(row => row.pid === pid) });
  const startedAt = new Date().toISOString();
  const statusPath = path.join(installation.root, 'activation.json');
  const logPath = path.join(installation.root, 'activation.log');
  const update = async value => {
    // Never recreate an uninstalled root, including from error/cancellation paths.
    try { await readInstallation(installation.root); }
    catch { console.log(value.message); return; }
    await safeFile(statusPath);
    await safeFile(logPath);
    const { heartbeatOnly, ...publicValue } = value;
    const record = { ...publicValue, helperPid: process.pid, startedAt, updatedAt: new Date().toISOString(), timeoutMs, theme: 'mirror-protocol-auto' };
    await fs.writeFile(statusPath, JSON.stringify(record, null, 2) + '\n', { mode: 0o600 });
    if (!heartbeatOnly) {
      await fs.appendFile(logPath, `[${record.updatedAt}] ${value.phase}: ${value.message}\n`, { mode: 0o600 });
      console.log(value.message);
    }
  };
  try {
    const manager = await managerState(installation);
    if (manager?.alive && !manager.owned) throw new Error('Another Theme Studio installation owns the running manager. This helper will not take it over.');
    const executable = await platform.findOfficialApp({ explicitPath: process.env.CODEX_THEME_STUDIO_APP_PATH });
    const result = await waitAndActivate({
      timeoutMs,
      checkContinue: async () => {
        try {
          const current = await readInstallation(installation.root);
          if (current.release !== installation.release) return false;
          try { await fs.lstat(path.join(installation.root, 'activation.cancel')); return false; }
          catch (error) { if (error.code !== 'ENOENT') throw error; }
          return true;
        } catch { return false; }
      },
      listPids: () => platform.officialAppPids(executable),
      cdpReady: async () => {
        try {
          const response = await fetch('http://127.0.0.1:9335/json/list', { signal: AbortSignal.timeout(900) });
          if (!response.ok) return false;
          const pages = await response.json();
          return Array.isArray(pages) && pages.some(item => item.type === 'page' && String(item.url).startsWith('app://'));
        } catch { return false; }
      },
      apply: () => new Promise((resolve, reject) => {
        // Capture neither private manager state nor command output in the log.
        const child = spawn(process.execPath, [path.join(installation.root, 'mirror.mjs'), '--root', installation.root, 'use', 'mirror-protocol-auto', '--app-path', executable], { cwd: installation.root, stdio: 'ignore', windowsHide: true });
        child.once('error', reject);
        child.once('exit', code => resolve(code ?? 1));
      }),
      update,
    });
    process.exitCode = result.exitCode;
  } catch (error) {
    // Errors from discovery and this helper contain no state tokens. Never log
    // child stdout/stderr or state.json, including on a failed activation.
    await update({ phase: 'failed', message: 'Activation helper stopped: ' + error.message });
    process.exitCode = 1;
  } finally { await unlock(); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
