const{chromium}=require('playwright');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
(async()=>{
 const root=path.resolve(__dirname,'../..'),out=path.join(root,'previews'),browser=await chromium.launch({channel:'msedge',headless:true}),errors=[];
 const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();
 page.on('pageerror',e=>errors.push(e.message));
 await context.route('**/*',r=>new URL(r.request().url()).protocol==='file:'?r.continue():r.abort());
 await page.goto(pathToFileURL(path.join(root,'Transition.html')).href);await page.waitForFunction(()=>photoReady);
 const frames=[];
 for(const variant of ['day','night']){
  await page.locator('#'+variant).click();await page.waitForFunction(()=>photoReady);
  for(const time of[100,300,480,900,1320,1400,1480,1680,1800,1860,2100,2250,2800,3600]){
   await page.evaluate(t=>seekPhoto(t),time);
   const state=await page.evaluate(()=>({state:photoState,filter:getComputedStyle(document.querySelector('.title-photo-stack')).filter,button:getComputedStyle(document.querySelector('.sigil')).transform,scale:[...document.querySelectorAll('.photo')].map(e=>getComputedStyle(e).transform),warp:document.querySelector('#mp-preview-title-motion-photo feDisplacementMap').getAttribute('scale'),overflow:document.documentElement.scrollWidth>innerWidth}));
   const active=[1320,1480,1680,1860,2100,2250].includes(time);
   assert.equal(state.state.titleMotion.active,active);assert.equal(state.filter==='none',!active);assert.equal(state.button,'none');assert.deepEqual(state.scale,['none','none','none']);assert.equal(state.overflow,false);
   if(time===300)assert.ok(Math.abs(state.state.titleMotion.recoil)>1,'glass entry must have a short recoil');
   if(time===900){assert.equal(state.state.titleMotion.recoil,0);assert.equal(state.state.titleMotion.stripes,0);}
   if(time>=400&&time<=900){assert.equal(state.state.middle,1);assert.equal(state.state.red,0);}
   if(time===3600){assert.equal(state.state.red,1);assert.equal(state.state.icon,1);}
   if([480,1480,1680,1860,3600].includes(time))await page.screenshot({path:path.join(out,`v230-${variant}-${time}.png`)});
   frames.push({variant,time,...state});
  }
 }
 await page.setViewportSize({width:600,height:900});await page.evaluate(()=>seekPhoto(1480));assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:path.join(out,'v230-narrow.png')});
 await context.close();
 const runtime=await browser.newPage({viewport:{width:1600,height:1000}});runtime.on('pageerror',e=>errors.push(e.message));await runtime.goto('http://127.0.0.1:8791');await runtime.waitForFunction(()=>window.previewReady);
 const geometry=()=>runtime.evaluate(()=>['main','textarea','.send-button','#codex-theme-studio-switcher .cts-switch-button'].map(s=>{const e=document.querySelector(s),r=e.getBoundingClientRect();return[s,r.x,r.y,r.width,r.height]}));
 await runtime.emulateMedia({reducedMotion:'reduce'});await runtime.evaluate(()=>choose('blue'));await runtime.emulateMedia({reducedMotion:'no-preference'});const before=await geometry();
 const sourceBytes={};for(const [property,file]of[['--mp-blue-art','deepseek-blue.webp'],['--mp-night-art','deepseek-night.webp'],['--mp-red-art','longmarch-black.webp'],['--mp-fractured-day','transition-day-original.webp'],['--mp-fractured-night','transition-night-original.webp']]){const encoded=await runtime.evaluate(p=>{const v=getComputedStyle(document.documentElement).getPropertyValue(p).trim();return v.slice(v.indexOf('base64,')+7).replace(/["')]+$/,'');},property),bytes=await fs.readFile(path.join(root,'assets',file));assert.deepEqual(Buffer.from(encoded,'base64'),bytes);sourceBytes[file]=require('node:crypto').createHash('sha256').update(bytes).digest('hex');}
 await runtime.clock.install();await runtime.clock.pauseAt(new Date(Date.now()+1000));await runtime.evaluate(()=>{document.querySelector('dialog').showModal();choose('red')});await runtime.clock.runFor(421);
 await runtime.evaluate(()=>{for(const a of document.getAnimations()){a.pause();a.currentTime=1480;}__MIRROR_PROTOCOL__.sampleMotion(1480)});
 assert.deepEqual((await geometry()).slice(0,3),before.slice(0,3));const real=await runtime.evaluate(()=>({motion:JSON.parse(document.querySelector('#mp-title-motion').dataset.frame),photo:getComputedStyle(document.querySelector('.mp-shot')).filter,dialog:getComputedStyle(document.querySelector('dialog')).filter,button:getComputedStyle(document.querySelector('#codex-theme-studio-switcher .cts-switch-button')).transform}));assert.ok(real.photo.includes('mp-title-motion-photo'));assert.ok(real.dialog.includes('mp-title-motion-surface'));assert.equal(real.button,'none');
 await runtime.screenshot({path:path.join(out,'v230-runtime-dialog.png')});
 await runtime.evaluate(()=>__MIRROR_PROTOCOL__.sampleMotion(1600));assert.equal(await runtime.evaluate(()=>getComputedStyle(document.querySelector('dialog')).filter),'none');
 await runtime.evaluate(()=>document.querySelector('dialog').close());await runtime.clock.runFor(3900);assert.equal(await runtime.evaluate(()=>document.querySelector('#mp-title-motion')),null);assert.equal(await runtime.evaluate(()=>__MIRROR_PROTOCOL__.snapshot().transitioning),false);
 await runtime.evaluate(()=>choose('blue'));await runtime.clock.runFor(1400);await runtime.evaluate(()=>choose('red'));await runtime.clock.runFor(90);await runtime.evaluate(()=>choose('blue'));await runtime.clock.runFor(1400);assert.equal(await runtime.evaluate(()=>document.querySelector('#mp-title-motion')),null);
 await runtime.emulateMedia({reducedMotion:'reduce'});await runtime.evaluate(()=>choose('red'));assert.equal(await runtime.evaluate(()=>document.querySelector('#mp-title-motion')),null);
 await runtime.evaluate(()=>{__CODEX_THEME_STUDIO_STATE__.cleanup();__CODEX_THEME_STUDIO_SWITCHER_STATE__.cleanup();stopPreviewTransport()});assert.equal(await runtime.evaluate(()=>document.querySelectorAll('.mp-stage,#mp-motion-style,#mp-title-motion').length),0);
 assert.deepEqual(errors,[]);
 await fs.writeFile(path.join(out,'title-motion-report.json'),JSON.stringify({pass:true,version:'2.3.1',frames,sourceBytes,runtime:real,geometryUnchanged:true,reducedMotion:true,interruptionCleanup:true,errors,limitation:'Independent browser preview, not live Codex.'},null,2));
 console.log(JSON.stringify({pass:true,samples:frames.length,runtime:real,errors}));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
