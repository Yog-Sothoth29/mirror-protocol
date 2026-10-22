const {chromium}=require(process.env.MIRROR_PLAYWRIGHT || 'playwright');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
(async()=>{
 const root=path.resolve(__dirname,'../..');
 const core=await import(pathToFileURL(path.join(root,'runtime/scripts/theme-core.mjs')));
 const {extendRendererExpression}=await import(pathToFileURL(path.join(root,'runtime/scripts/mirror-protocol.mjs')));
 const template=await fs.readFile(path.join(root,'runtime/assets/renderer-inject.js'),'utf8');
 const payloads={};
 for(const id of ['deepseek-blue','deepseek-night','longmarch-black','mirror-protocol-auto']) {
   const t=await core.loadTheme(id);const art='data:image/webp;base64,'+(await fs.readFile(t.artPath)).toString('base64');
   const publicTheme={id,displayName:t.manifest.displayName,version:t.manifest.version,decorations:t.manifest.decorations};
   const base=template.replace('__CTS_CSS_JSON__',JSON.stringify(t.css)).replace('__CTS_ART_JSON__',JSON.stringify(art)).replace('__CTS_THEME_JSON__',JSON.stringify(publicTheme)).replace('__CTS_USAGE_JSON__','null');
   payloads[id]=extendRendererExpression(base,t.manifest.mirrorProtocol);
 }
 const browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1600,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.clock.install({time:new Date('2026-10-15T16:30:00Z')});await page.goto('http://127.0.0.1:8791');await page.waitForFunction(()=>window.previewReady);await page.evaluate(()=>{stopPreviewTransport();window.__CODEX_THEME_STUDIO_STATE__.cleanup()});
 // Supply the fixture's native border independently of the skin variables.
 await page.addStyleTag({content:'.composer-surface-chrome{border:1px solid #bacde2}'});
 const geometry=()=>page.evaluate(()=>['main.main-surface','aside.app-shell-left-panel','textarea','.send-button'].map(s=>{const r=document.querySelector(s).getBoundingClientRect();return [s,r.x,r.y,r.width,r.height]}));const before=await geometry();
 const manager=(await fs.readFile(path.join(root,'runtime/assets/theme-switcher.js'),'utf8')).replace('__CTS_CONTROL_JSON__',JSON.stringify({bridge:true}));await page.evaluate(manager);
 const rows=[];
 const snapshot=()=>page.evaluate(()=>{
   const visible=n=>n.getClientRects().length&&getComputedStyle(n).display!=='none'&&getComputedStyle(n).visibility!=='hidden';
   const controls=[...document.querySelectorAll('button,a[href],input,textarea,[contenteditable=true]')].filter(n=>visible(n)&&!n.closest('#codex-theme-studio-decorations'));
   const overlap=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
   const cards=[...document.querySelectorAll('.cts-decoration-card')].filter(n=>!n.hidden&&visible(n));
   const bg=getComputedStyle(document.querySelector('main')).backgroundImage;
   const style=getComputedStyle(document.documentElement);
   return {id:document.documentElement.dataset.codexThemeStudio,mode:document.documentElement.dataset.mirrorMode||null,controller:Boolean(window.__MIRROR_PROTOCOL__),canvas:style.getPropertyValue('--mp-canvas').trim(),ink:style.getPropertyValue('--mp-ink').trim(),panel:style.getPropertyValue('--mp-panel').trim(),inputColor:getComputedStyle(document.querySelector('textarea')).color,backgroundLoaded:bg.includes('data:image/webp'),nativeButtons:controls.length,overflow:document.documentElement.scrollWidth>innerWidth,decorations:cards.length,collisions:cards.flatMap(c=>controls.filter(n=>overlap(c.getBoundingClientRect(),n.getBoundingClientRect()))).length,managerVisible:!document.querySelector('#codex-theme-studio-switcher').hidden};
 });
 for(let round=0;round<8;round++)for(const id of Object.keys(payloads)){
   await page.evaluate(payloads[id]);await page.clock.runFor(400);const row=await snapshot();assert.equal(row.id,id);assert.equal(row.controller,id==='mirror-protocol-auto');assert.equal(row.backgroundLoaded,true);assert.equal(row.overflow,false);assert.equal(row.collisions,0);assert.equal(row.managerVisible,true);assert.deepEqual(await geometry(),before);
   if(round===0)rows.push(row);
 }
 await page.evaluate(()=>window.__MIRROR_PROTOCOL__.choose('red'));await page.clock.runFor(12400);const red=await snapshot();assert.equal(red.canvas,'#0b0c14');assert.equal(red.inputColor,'rgb(241, 239, 245)');assert.equal(red.backgroundLoaded,true);rows.push(red);
 await page.evaluate(()=>window.__MIRROR_PROTOCOL__.choose('blue'));await page.clock.runFor(2600);const blue=await snapshot();assert.equal(blue.canvas,'#f4f9ff');assert.equal(blue.inputColor,'rgb(32, 51, 76)');assert.equal(blue.backgroundLoaded,true);rows.push(blue);
 // Test the same in-page bridge and picker that the real manager uses, without a CDP connection.
 await page.locator('.cts-switch-button').click({modifiers:['Shift']});await page.clock.runFor(1);
 const requests=await page.evaluate(()=>window.__CODEX_THEME_STUDIO_SWITCHER_STATE__.drainRequests());assert.equal(requests[0].route,'themes');
 await page.evaluate(({id,themes})=>window.__CODEX_THEME_STUDIO_SWITCHER_STATE__.deliver(id,{activeTheme:'mirror-protocol-auto',themes}),{id:requests[0].id,themes:await core.listThemes()});
 await page.getByRole('button',{name:/镜面协议 · 长征/}).click();await page.clock.runFor(1);const switchRequests=await page.evaluate(()=>window.__CODEX_THEME_STUDIO_SWITCHER_STATE__.drainRequests());assert.equal(switchRequests[0].route,'switch');assert.equal(switchRequests[0].body.theme,'longmarch-black');
 await page.evaluate(payloads['longmarch-black']);await page.evaluate(id=>window.__CODEX_THEME_STUDIO_SWITCHER_STATE__.deliver(id,{activeTheme:'longmarch-black'}),switchRequests[0].id);await page.clock.runFor(1);
 const listRequests=await page.evaluate(()=>window.__CODEX_THEME_STUDIO_SWITCHER_STATE__.drainRequests());await page.evaluate(({id,themes})=>window.__CODEX_THEME_STUDIO_SWITCHER_STATE__.deliver(id,{activeTheme:'longmarch-black',themes}),{id:listRequests[0].id,themes:await core.listThemes()});await page.clock.runFor(1);assert.equal(await page.locator('.cts-switch-item[aria-current=true]').count(),1);
 await page.evaluate(()=>{window.__CODEX_THEME_STUDIO_STATE__.cleanup();window.__CODEX_THEME_STUDIO_SWITCHER_STATE__.cleanup()});await page.clock.runFor(600000);
 const removed=await page.evaluate(()=>!window.__MIRROR_PROTOCOL__&&!document.getElementById('codex-theme-studio-style')&&!document.documentElement.hasAttribute('data-mirror-mode')&&!document.getElementById('codex-theme-studio-switcher'));assert.equal(removed,true);assert.equal(errors.length,0);
 const report={pass:true,roundTrips:8,themeApplications:32,nativeGeometryPreserved:true,bridgePickerVerified:true,cleanupSurvivesTenVirtualMinutes:removed,computedStates:rows,pageErrors:errors,limitations:'Native-hook browser fixture and real Theme Studio payloads; not a live Codex renderer.'};await fs.writeFile(path.join(root,'previews/integration-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
