const{chromium}=require('playwright');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const out=path.resolve(__dirname,'../previews'),browser=await chromium.launch({channel:'msedge',headless:true}),context=await browser.newContext({viewport:{width:1254,height:706},recordVideo:{dir:out,size:{width:1254,height:706}}}),page=await context.newPage();
 await page.goto('http://127.0.0.1:8791/Transition.html?capture=1&v=2.3.1');await page.waitForFunction(()=>window.photoReady);
 const timing=await page.evaluate(()=>new Promise(resolve=>{const frames=[];startPhotos();let before=performance.now(),start=before;const tick=now=>{frames.push(now-before);before=now;if(now-start<4000)requestAnimationFrame(tick);else resolve(frames.slice(2));};requestAnimationFrame(tick);}));
 const file=await page.video().path();await context.close();await fs.rename(file,path.join(out,'title-motion.webm'));
 const check=await browser.newPage();await check.goto('http://127.0.0.1:8791/Demo.html');await check.setContent('<video muted src="http://127.0.0.1:8791/previews/title-motion.webm"></video>');await check.waitForFunction(()=>document.querySelector('video').readyState>=2);await check.locator('video').evaluate(v=>v.play());await check.waitForTimeout(500);const decode=await check.locator('video').evaluate(v=>({width:v.videoWidth,height:v.videoHeight,frames:v.getVideoPlaybackQuality().totalVideoFrames,error:v.error?.message||null}));assert.ok(decode.frames>3);assert.equal(decode.error,null);
 timing.sort((a,b)=>a-b);const perf={samples:timing.length,p95Ms:timing[Math.floor(timing.length*.95)],framesOver100ms:timing.filter(x=>x>100).length,decode};await fs.writeFile(path.join(out,'title-motion-playback.json'),JSON.stringify(perf,null,2));console.log(JSON.stringify(perf));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
