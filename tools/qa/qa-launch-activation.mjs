import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { quoteWindowsArgument, startWindowsProcess, verifyLaunch } from '../launch-activation.mjs';

test('WMI launcher uses EncodedCommand and base64 data with no interpolated paths', () => {
  const argv = ['C:\\runtime\\node.exe', 'C:\\path with space & $x;中文\\helper.mjs', '--root', 'C:\\user root'];
  const result = startWindowsProcess(argv, 'C:\\user root', { run: (executable, args) => {
    assert.equal(executable, 'powershell.exe');
    assert.equal(args.at(-2), '-EncodedCommand');
    const source = Buffer.from(args.at(-1), 'base64').toString('utf16le');
    assert.match(source, /Win32_Process/);
    assert.match(source, /0x01000000/);
    assert.match(source, /ShowWindow=\[uint16\]0/);
    assert.equal(source.includes(argv[1]), false);
    const encodedData = source.match(/FromBase64String\('([^']+)'\)/)[1];
    const data = JSON.parse(Buffer.from(encodedData, 'base64').toString());
    assert.equal(data.commandLine, argv.map(quoteWindowsArgument).join(' '));
    assert.equal(data.cwd, 'C:\\user root');
    return { status: 0, stdout: '{"returnValue":0,"pid":123,"sessionId":7}' };
  } });
  assert.equal(result.pid, 123);
});

test('WMI failure never falls back to a job-bound launcher', () => {
  assert.throws(() => startWindowsProcess(['node.exe'], '.', { run: () => ({ status: 0, stdout: '{"returnValue":2,"pid":0}' }) }), /No fallback/);
});

test('process path, exact command line, new helper PID and timestamp must match', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mp-launch-identity-'));
  try {
    const timestamp = Date.now();
    await fs.writeFile(path.join(root, 'activation.json'), JSON.stringify({ helperPid: 123, startedAt: new Date(timestamp).toISOString(), updatedAt: new Date(timestamp).toISOString(), phase: 'waiting' }));
    const options = { root, pid: 123, expectedExecutable: 'C:\\node.exe', expectedCommand: 'expected', expectedSession: 7, startedMs: timestamp, inspect: async () => ({ executable: 'C:\\node.exe', command: 'expected', sessionId: 7 }) };
    assert.equal((await verifyLaunch(options)).phase, 'waiting');
    await assert.rejects(verifyLaunch({ ...options, inspect: async () => ({ executable: 'C:\\other.exe', command: 'expected', sessionId: 7 }) }), /identity/);
    await assert.rejects(verifyLaunch({ ...options, inspect: async () => ({ executable: 'C:\\node.exe', command: 'expected', sessionId: 0 }) }), /identity/);
    await fs.writeFile(path.join(root, 'activation.json'), JSON.stringify({ helperPid: 999, startedAt: new Date(timestamp).toISOString(), updatedAt: new Date(timestamp).toISOString(), phase: 'waiting' }));
    let queries = 0;
    await assert.rejects(verifyLaunch({ ...options, sleep: async () => {}, inspect: async () => ++queries === 1 ? { executable: 'C:\\node.exe', command: 'expected', sessionId: 7 } : null }), /exited/);
  } finally { await fs.unlink(path.join(root, 'activation.json')); await fs.rmdir(root); }
});

test('a failed new helper is never reported as success', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mp-launch-failure-'));
  try {
    const timestamp = Date.now();
    await fs.writeFile(path.join(root, 'activation.json'), JSON.stringify({ helperPid: 123, startedAt: new Date(timestamp).toISOString(), updatedAt: new Date(timestamp).toISOString(), phase: 'failed' }));
    await assert.rejects(verifyLaunch({ root, pid: 123, expectedExecutable: 'C:\\node.exe', expectedCommand: 'expected', startedMs: timestamp, inspect: async () => ({ executable: 'C:\\node.exe', command: 'expected' }) }), /phase: failed/);
  } finally { await fs.unlink(path.join(root, 'activation.json')); await fs.rmdir(root); }
});

test('real harmless WMI sentinel survives closing the source lifetime job', { skip: process.platform !== 'win32' }, async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mp-wmi-sentinel-'));
  const marker = path.join(root, 'sentinel.json');
  const readyMarker = path.join(root, 'ready.json');
  const launchMarker = path.join(root, 'launched.json');
  try {
    const jobName = 'Local\\MirrorProtocolSentinel-' + path.basename(root);
    const encodedData = Buffer.from(JSON.stringify({ marker, readyMarker, jobName })).toString('base64');
    const sentinelSource = `$ErrorActionPreference='Stop'; $mpData=ConvertFrom-Json ([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${encodedData}'))); Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public static class MpSentinelJob { [DllImport("kernel32.dll")] public static extern bool IsProcessInJob(IntPtr process, IntPtr job, out bool result); [DllImport("kernel32.dll")] public static extern IntPtr GetCurrentProcess(); [DllImport("kernel32.dll",CharSet=CharSet.Unicode)] public static extern IntPtr OpenJobObject(uint access,bool inherit,string name); [DllImport("kernel32.dll")] public static extern bool CloseHandle(IntPtr handle); }'; $mpHandle=[MpSentinelJob]::OpenJobObject(4,$false,[string]$mpData.jobName); if($mpHandle -eq [IntPtr]::Zero){throw 'Source job missing before membership check'}; $mpInSource=$false; $mpOk=[MpSentinelJob]::IsProcessInJob([MpSentinelJob]::GetCurrentProcess(),$mpHandle,[ref]$mpInSource); $null=[MpSentinelJob]::CloseHandle($mpHandle); $mpSelf=Get-CimInstance Win32_Process -Filter ('ProcessId=' + $PID); $mpParent=Get-CimInstance Win32_Process -Filter ('ProcessId=' + $mpSelf.ParentProcessId); $mpResult=[pscustomobject]@{pid=$PID;queryOk=$mpOk;inSourceJob=$mpInSource;parentName=[string]$mpParent.Name;sessionId=[int]$mpSelf.SessionId}; [IO.File]::WriteAllText([string]$mpData.readyMarker,($mpResult | ConvertTo-Json -Compress)); Start-Sleep -Milliseconds 1500; [IO.File]::WriteAllText([string]$mpData.marker,($mpResult | ConvertTo-Json -Compress));`;
    const psPath = path.join(process.env.SystemRoot, 'System32/WindowsPowerShell/v1.0/powershell.exe');
    const sentinelArgs = [psPath, '-NoLogo', '-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(sentinelSource, 'utf16le').toString('base64')];
    const launcherUrl = pathToFileURL(path.resolve('tools/launch-activation.mjs')).href;
    const inner = `import fs from 'node:fs/promises'; import {startWindowsProcess} from ${JSON.stringify(launcherUrl)}; const result=startWindowsProcess(${JSON.stringify(sentinelArgs)},${JSON.stringify(root)}); await fs.writeFile(${JSON.stringify(launchMarker)},JSON.stringify(result)); for(let i=0;i<100;i++){try{await fs.access(${JSON.stringify(readyMarker)});break;}catch{await new Promise(r=>setTimeout(r,100));}}`;
    const sourceCommand = [process.execPath, '--input-type=module', '-e', inner].map(quoteWindowsArgument).join(' ');
    const harnessClass = `using System; using System.Text; using System.Runtime.InteropServices; public static class MpSourceJob { [StructLayout(LayoutKind.Sequential)] struct Basic { public long a,b; public uint flags; public UIntPtr min,max; public uint count; public UIntPtr affinity; public uint priority,schedule; } [StructLayout(LayoutKind.Sequential)] struct Io { public ulong a,b,c,d,e,f; } [StructLayout(LayoutKind.Sequential)] struct Extended { public Basic basic; public Io io; public UIntPtr a,b,c,d; } [StructLayout(LayoutKind.Sequential,CharSet=CharSet.Unicode)] struct Startup { public int cb; public string reserved,desktop,title; public uint x,y,xs,ys,xc,yc,fill,flags; public ushort show,res2; public IntPtr reserved2,input,output,error; } [StructLayout(LayoutKind.Sequential)] struct Proc { public IntPtr process,thread; public uint pid,tid; } [DllImport("kernel32.dll",CharSet=CharSet.Unicode)] static extern IntPtr CreateJobObject(IntPtr attr,string name); [DllImport("kernel32.dll")] static extern bool SetInformationJobObject(IntPtr job,int cls,IntPtr info,uint length); [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern bool CreateProcess(string app,StringBuilder cmd,IntPtr pa,IntPtr ta,bool inherit,uint flags,IntPtr env,string cwd,ref Startup startup,out Proc proc); [DllImport("kernel32.dll")] static extern bool AssignProcessToJobObject(IntPtr job,IntPtr process); [DllImport("kernel32.dll")] static extern uint ResumeThread(IntPtr thread); [DllImport("kernel32.dll")] static extern uint WaitForSingleObject(IntPtr handle,uint ms); [DllImport("kernel32.dll")] static extern bool GetExitCodeProcess(IntPtr process,out uint code); [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr handle); public static uint Run(string command,string cwd,string name) { IntPtr job=CreateJobObject(IntPtr.Zero,name); Extended ext=new Extended(); ext.basic.flags=0x2000; IntPtr mem=Marshal.AllocHGlobal(Marshal.SizeOf(ext)); Proc proc=new Proc(); try { Marshal.StructureToPtr(ext,mem,false); if(!SetInformationJobObject(job,9,mem,(uint)Marshal.SizeOf(ext))) throw new Exception("set job failed"); Startup startup=new Startup(); startup.cb=Marshal.SizeOf(startup); if(!CreateProcess(null,new StringBuilder(command),IntPtr.Zero,IntPtr.Zero,false,4,IntPtr.Zero,cwd,ref startup,out proc)) throw new Exception("create source failed"); if(!AssignProcessToJobObject(job,proc.process)) throw new Exception("assign source job failed"); ResumeThread(proc.thread); if(WaitForSingleObject(proc.process,30000)!=0) throw new Exception("source timeout"); uint code; GetExitCodeProcess(proc.process,out code); return code; } finally { Marshal.FreeHGlobal(mem); if(proc.thread!=IntPtr.Zero)CloseHandle(proc.thread); if(proc.process!=IntPtr.Zero)CloseHandle(proc.process); CloseHandle(job); } } }`;
    const harnessData = Buffer.from(JSON.stringify({ sourceCommand, root, jobName })).toString('base64');
    const harnessSource = `$ErrorActionPreference='Stop'; $mpData=ConvertFrom-Json ([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${harnessData}'))); Add-Type -TypeDefinition '${harnessClass}'; $mpCode=[MpSourceJob]::Run([string]$mpData.sourceCommand,[string]$mpData.root,[string]$mpData.jobName); [pscustomobject]@{exitCode=$mpCode;sessionId=[int](Get-Process -Id $PID).SessionId} | ConvertTo-Json -Compress;`;
    const launcher = spawnSync(psPath, ['-NoLogo', '-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(harnessSource, 'utf16le').toString('base64')], { encoding: 'utf8', windowsHide: true });
    assert.equal(launcher.status, 0, launcher.stderr);
    const harnessResult = JSON.parse(launcher.stdout.trim());
    assert.equal(harnessResult.exitCode, 0);
    const launched = JSON.parse(await fs.readFile(launchMarker, 'utf8'));
    let result;
    for (let attempt = 0; attempt < 40; attempt++) {
      try { result = JSON.parse(await fs.readFile(marker, 'utf8')); break; } catch { await new Promise(resolve => setTimeout(resolve, 250)); }
    }
    assert.ok(result, 'sentinel must finish after the launcher exits');
    assert.equal(result.pid, launched.pid);
    assert.equal(result.queryOk, true);
    assert.equal(result.inSourceJob, false);
    assert.equal(result.parentName.toLowerCase(), 'wmiprvse.exe');
    assert.equal(result.sessionId, harnessResult.sessionId);
  } finally {
    for (const filename of [marker, readyMarker, launchMarker]) try { await fs.unlink(filename); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    await fs.rmdir(root);
  }
});
