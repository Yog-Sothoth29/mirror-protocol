// Real CDP integration against disposable Edge, never the user's Codex.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require=createRequire(import.meta.url), {chromium}=require(process.env.MIRROR_PLAYWRIGHT||'playwright');
const root=fileURLToPath(new URL('../..',import.meta.url));
const scratch=await fs.mkdtemp(path.join(os.tmpdir(),'mp-rollback-'));
const probe=http.createServer();await new Promise(resolve=>probe.listen(0,'127.0.0.1',resolve));const debugPort=probe.address().port;await new Promise(resolve=>probe.close(resolve));
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--remote-debugging-address=127.0.0.1','--remote-debugging-port='+debugPort]});
let proxy;
try {
  const page=await browser.newPage({viewport:{width:1400,height:900}});
  // One native control passes readiness but intentionally fails the >=5 gate.
  await page.setContent('<!doctype html><style>body{margin:0}main{height:100vh;width:100vw;position:relative}</style><main><button>Native fixture</button></main>');
  proxy=http.createServer(async(req,res)=>{
    if(req.url!=='/json/list'){res.writeHead(404);res.end();return;}
    try{const rows=await(await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json();res.setHeader('content-type','application/json');res.end(JSON.stringify(rows.filter(row=>row.type==='page').map(row=>({...row,url:'app://-/index.html'}))));}catch{res.writeHead(502);res.end();}
  });
  await new Promise(resolve=>proxy.listen(0,'127.0.0.1',resolve));const port=proxy.address().port;
  const result=await new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,[path.join(root,'runtime/scripts/start-theme.mjs'),'--theme','mirror-protocol-auto','--port',String(port),'--attach-only','--verification-timeout-ms','2000'],{cwd:root,env:{...process.env,LOCALAPPDATA:scratch,HOME:scratch},windowsHide:true,stdio:['ignore','pipe','pipe']});
    let output='';child.stdout.on('data',bytes=>output+=bytes);child.stderr.on('data',bytes=>output+=bytes);child.once('error',reject);child.once('exit',code=>resolve({code,output}));
  });
  assert.notEqual(result.code,0);assert.match(result.output,/Live verification failed; renderer cleanup confirmed: true/);
  const stateRoot=path.join(scratch,'CodexThemeStudio');
  const diagnostic=JSON.parse(await fs.readFile(path.join(stateRoot,'startup-verification.json'),'utf8'));
  assert.equal(diagnostic.cleanup.cleanupConfirmed,true);assert.equal(diagnostic.lastVerification.exitCode,2);
  assert.match(diagnostic.lastVerification.stdout,/"nativeControls": 1/);
  assert.equal(await fs.stat(path.join(stateRoot,'state.json')).then(()=>true,()=>false),false);
  const remains=await page.evaluate(()=>Boolean(window.__MIRROR_PROTOCOL__||window.__CODEX_THEME_STUDIO_STATE__||window.__CODEX_THEME_STUDIO_SWITCHER_STATE__||document.querySelector('#codex-theme-studio-style,#codex-theme-studio-decorations,#codex-theme-studio-switcher,.mp-stage')));
  assert.equal(remains,false);
  const report={pass:true,actualCdp:true,verificationFailureCaptured:true,watcherStopped:true,rendererCleanupConfirmed:true,recoveryStateCleared:true,actualCodexTouched:false};
  await fs.writeFile(path.join(root,'docs/qa/startup-rollback-report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
} finally {
  if(proxy)await new Promise(resolve=>proxy.close(resolve));await browser.close();
  const resolved=await fs.realpath(scratch);assert.equal(path.dirname(resolved).toLowerCase(),(await fs.realpath(os.tmpdir())).toLowerCase());assert.ok(path.basename(resolved).startsWith('mp-rollback-'));await fs.rm(resolved,{recursive:true,force:true});
}
