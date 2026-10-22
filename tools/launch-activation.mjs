#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { takeRoot, requireNode, readInstallation } from './installer-common.mjs';

export function quoteWindowsArgument(value) {
  return '"' + String(value).replace(/(\\*)"/g, '$1$1\\"').replace(/(\\+)$/, '$1$1') + '"';
}

function powershellJson(script, data, run = spawnSync) {
  const encodedData = Buffer.from(JSON.stringify(data), 'utf8').toString('base64');
  const source = `$ErrorActionPreference='Stop'; $ProgressPreference='SilentlyContinue'; $mpData=ConvertFrom-Json -InputObject ([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${encodedData}'))); ${script}`;
  const encodedCommand = Buffer.from(source, 'utf16le').toString('base64');
  const result = run('powershell.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-EncodedCommand', encodedCommand], { encoding: 'utf8', windowsHide: true });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error('Windows activation launcher command failed. No fallback launcher was used.');
  try { return JSON.parse(String(result.stdout).trim()); }
  catch { throw new Error('Windows activation launcher returned invalid output.'); }
}

export function startWindowsProcess(argv, cwd, { run } = {}) {
  const commandLine = argv.map(quoteWindowsArgument).join(' ');
  const result = powershellJson("$mpStartup=New-CimInstance -ClassName Win32_ProcessStartup -ClientOnly -Property @{ShowWindow=[uint16]0; CreateFlags=[uint32]0x01000000; WinstationDesktop='WinSta0\\Default'}; $mpResult=Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{CommandLine=[string]$mpData.commandLine; CurrentDirectory=[string]$mpData.cwd; ProcessStartupInformation=$mpStartup}; [pscustomobject]@{returnValue=[uint32]$mpResult.ReturnValue;pid=[uint32]$mpResult.ProcessId;sessionId=[int](Get-Process -Id $PID).SessionId} | ConvertTo-Json -Compress", { commandLine, cwd }, run);
  if (result.returnValue !== 0 || !Number.isInteger(result.pid) || result.pid <= 0) throw new Error(`Windows WMI launch failed (${result.returnValue}). No fallback launcher was used.`);
  return { ...result, commandLine };
}

export function inspectWindowsProcess(pid, { run } = {}) {
  if (!Number.isInteger(pid) || pid <= 0) throw new Error('Invalid child PID.');
  return powershellJson("$mpProcess=Get-CimInstance Win32_Process -Filter ('ProcessId=' + [int]$mpData.pid); if($mpProcess){[pscustomobject]@{pid=[int]$mpProcess.ProcessId;executable=[string]$mpProcess.ExecutablePath;command=[string]$mpProcess.CommandLine;sessionId=[int]$mpProcess.SessionId} | ConvertTo-Json -Compress}else{'null'}", { pid }, run);
}

export async function verifyLaunch({ root, pid, expectedExecutable, expectedCommand, expectedSession, inspect = inspectWindowsProcess, now = Date.now, sleep = ms => new Promise(resolve => setTimeout(resolve, ms)), startedMs, timeoutMs = 15000 }) {
  const deadline = now() + timeoutMs;
  let identified = false;
  while (now() <= deadline) {
    const processInfo = await inspect(pid);
    if (processInfo) {
      if (path.win32.normalize(processInfo.executable).toLowerCase() !== path.win32.normalize(expectedExecutable).toLowerCase() || processInfo.command !== expectedCommand || (expectedSession !== undefined && processInfo.sessionId !== expectedSession)) throw new Error('New activation process identity or desktop session did not match. No success was reported.');
      identified = true;
    }
    let record;
    try { record = JSON.parse(await fs.readFile(path.join(root, 'activation.json'), 'utf8')); } catch { /* await its first complete status write */ }
    if (record?.helperPid === pid && Date.parse(record.startedAt) >= startedMs && Date.parse(record.updatedAt) >= startedMs) {
      if (['failed', 'cancelled', 'timed-out'].includes(record.phase)) throw new Error('Activation helper stopped in phase: ' + record.phase);
      if (identified && processInfo && ['waiting', 'applying'].includes(record.phase)) return { launched: true, pid, phase: record.phase, message: 'Independent helper is running. Fully exit Codex from its menu; activation will be attempted once.' };
      if (record.phase === 'applied' && identified) return { launched: true, pid, phase: 'applied', message: 'Activation command completed; verify the real Codex window before reporting success.' };
    }
    if (identified && !processInfo) throw new Error('Activation helper exited before a successful completion record was observed.');
    await sleep(250);
  }
  throw new Error('Independent helper startup could not be verified. No activation success was reported.');
}

async function main() {
  throw new Error('The custom exit/relaunch helper is disabled. Keep Codex open and use mirror.mjs use with an existing loopback endpoint.');
  requireNode();
  const { root, args } = takeRoot(process.argv.slice(2));
  if (args.length) throw new Error('Usage: node launch-activation.mjs [--root directory]');
  const installation = await readInstallation(root);
  const helper = path.join(installation.root, 'activate-after-exit.mjs');
  const info = await fs.lstat(helper);
  if (!info.isFile() || info.isSymbolicLink()) throw new Error('Installed activation helper is not a regular file.');
  const argv = [process.execPath, helper, '--root', installation.root];
  const startedMs = Date.now();
  if (process.platform === 'win32') {
    const child = startWindowsProcess(argv, installation.root);
    console.log(JSON.stringify(await verifyLaunch({ root: installation.root, pid: child.pid, expectedExecutable: process.execPath, expectedCommand: child.commandLine, expectedSession: child.sessionId, startedMs }), null, 2));
  } else {
    const child = spawn(argv[0], argv.slice(1), { cwd: installation.root, detached: true, stdio: 'ignore' });
    await new Promise((resolve, reject) => { child.once('spawn', resolve); child.once('error', reject); });
    child.unref();
    // The helper's new PID and timestamp still have to appear; do not trust spawn alone.
    const deadline = Date.now() + 15000;
    while (Date.now() <= deadline) {
      let record;
      try { record = JSON.parse(await fs.readFile(path.join(installation.root, 'activation.json'), 'utf8')); } catch { /* wait */ }
      if (record?.helperPid === child.pid && Date.parse(record.startedAt) >= startedMs) {
        if (['failed', 'cancelled', 'timed-out'].includes(record.phase)) throw new Error('Activation helper stopped in phase: ' + record.phase);
        console.log(JSON.stringify({ launched: true, pid: child.pid, phase: record.phase }, null, 2));
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    throw new Error('Detached helper startup could not be verified.');
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => { console.error(error.message); process.exitCode = 1; });
