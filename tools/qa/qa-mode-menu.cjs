const {chromium}=require(process.env.MIRROR_PLAYWRIGHT || 'playwright');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');

// Isolated browser fixture: exercises the actual switcher and manager bridge contract.
// It does not connect to, launch, or modify a running Codex instance.
(async()=>{
  const source=await fs.readFile(path.resolve(__dirname,'../../runtime/assets/theme-switcher.js'),'utf8');
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try {
    const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.setContent('<!doctype html><html data-codex-theme-studio="mirror-protocol-auto"><head></head><body><main>Theme control fixture</main></body></html>');
    await page.evaluate(()=>{
      const state={mode:'blue',appearance:'day',automatic:true};
      const announce=()=>dispatchEvent(new Event('mirror-mode-change'));
      window.__menuTest={calls:[],routes:[],activeTheme:'mirror-protocol-auto',stop:()=>clearInterval(transport)};
      window.__MIRROR_PROTOCOL__={
        snapshot:()=>({...state}),
        choose:mode=>{__menuTest.calls.push(['choose',mode]);state.mode=mode==='night'?'blue':mode;if(mode!=='red')state.appearance=mode==='night'?'night':'day';state.automatic=false;announce();},
        toggle:()=>{__menuTest.calls.push(['toggle']);state.mode=state.mode==='red'?'blue':'red';state.automatic=false;announce();},
        resume:()=>{__menuTest.calls.push(['resume']);state.automatic=true;announce();},
      };
      const themes=['mirror-protocol-auto','deepseek-blue','deepseek-night','longmarch-black'].map(id=>({id,displayName:id,designedFor:id==='deepseek-blue'?'light':'dark'}));
      const transport=setInterval(()=>{
        const bridge=window.__CODEX_THEME_STUDIO_SWITCHER_STATE__;
        if(!bridge)return;
        for(const message of bridge.drainRequests()){
          __menuTest.routes.push([message.route,message.body]);
          if(message.route==='switch'&&!window.__MIRROR_PROTOCOL__){__menuTest.activeTheme=message.body.theme;document.documentElement.dataset.codexThemeStudio=message.body.theme;bridge.place();}
          bridge.deliver(message.id,message.route==='themes'?{activeTheme:__menuTest.activeTheme,themes}:{});
        }
      },10);
    });
    await page.evaluate(source.replace('__CTS_CONTROL_JSON__',JSON.stringify({bridge:'isolated-test'})));
    const button=page.locator('.cts-switch-button'),panel=page.locator('.cts-switch-panel');
    const day=page.getByRole('button',{name:'☀ DeepSeek 日间',exact:true}),night=page.getByRole('button',{name:'☾ DeepSeek 夜间',exact:true});
    const baseBox=await button.boundingBox();assert.equal(baseBox.width,38);assert.equal(baseBox.height,38);
    assert.equal(await button.evaluate(node=>getComputedStyle(node).borderRadius),'50%');
    assert.match(await button.getAttribute('title'),/右键.*DeepSeek 日间 \/ 夜间/);
    await button.click({button:'right'});await day.waitFor();
    assert.equal(await night.isVisible(),true);assert.equal(await day.getAttribute('aria-pressed'),'true');assert.equal(await night.getAttribute('aria-pressed'),'false');
    assert.equal(await page.locator('.cts-switch-list .cts-switch-item').count(),7,'Both DS choices, resume, and all four installed themes remain available');
    await night.click();assert.equal(await panel.isVisible(),false);
    assert.deepEqual(await page.evaluate(()=>__MIRROR_PROTOCOL__.snapshot()),{mode:'blue',appearance:'night',automatic:false});
    await button.click();assert.equal(await page.evaluate(()=>__MIRROR_PROTOCOL__.snapshot().mode),'red');
    assert.deepEqual(await button.boundingBox(),baseBox,'The circular control stays fixed through mode changes');
    await button.click({modifiers:['Shift']});await day.waitFor();
    assert.equal(await night.getAttribute('aria-pressed'),'true','Red mode retains and displays the selected DeepSeek base');
    assert.equal(await day.getAttribute('aria-pressed'),'false');
    await day.click();assert.deepEqual(await page.evaluate(()=>__MIRROR_PROTOCOL__.snapshot()),{mode:'blue',appearance:'day',automatic:false});
    await button.focus();await page.keyboard.press('ArrowDown');await night.waitFor();
    await page.getByRole('button',{name:/恢复自动/}).click();assert.equal(await page.evaluate(()=>__MIRROR_PROTOCOL__.snapshot().automatic),true);
    await button.click({button:'right'});await day.waitFor();
    await page.getByRole('button',{name:'◐  deepseek-night',exact:true}).click();
    await page.waitForFunction(()=>__menuTest.routes.some(([route,body])=>route==='switch'&&body?.theme==='deepseek-night'));
    await day.waitFor();await button.focus();await page.keyboard.press('Escape');assert.equal(await panel.isVisible(),false);assert.equal(await button.evaluate(node=>node===document.activeElement),true);
    await button.click({button:'right'});await day.waitFor();
    await page.getByRole('button',{name:'主题库 ↗',exact:true}).click();
    await page.waitForFunction(()=>__menuTest.routes.some(([route])=>route==='open'));
    await page.getByRole('button',{name:'原生外观',exact:true}).click();
    await page.waitForFunction(()=>__menuTest.routes.some(([route])=>route==='native'));
    assert.deepEqual(await page.evaluate(()=>__menuTest.calls),[['choose','night'],['toggle'],['choose','blue'],['resume']]);
    await page.evaluate(()=>{delete window.__MIRROR_PROTOCOL__;__menuTest.activeTheme='longmarch-black';document.documentElement.dataset.codexThemeStudio='longmarch-black';__CODEX_THEME_STUDIO_SWITCHER_STATE__.place();});
    await button.click({button:'right'});await day.waitFor();
    assert.equal(await night.isVisible(),true,'Explicit DS entries remain visible on static Long March');
    assert.equal(await day.getAttribute('aria-pressed'),'false');assert.equal(await night.getAttribute('aria-pressed'),'false','Static red must not claim a remembered DeepSeek base');
    assert.equal(await page.getByRole('button',{name:/恢复自动/}).count(),0,'Resume action requires the automatic runtime');
    assert.equal(await page.locator('.cts-switch-list .cts-switch-item').count(),6,'Static menu retains two direct DS entries and four installed themes');
    await night.click();await page.waitForFunction(()=>document.documentElement.dataset.codexThemeStudio==='deepseek-night');
    assert.equal(await panel.isVisible(),false);assert.equal(await page.locator('#codex-theme-studio-switcher').getAttribute('data-mirror'),'night');
    await button.click({button:'right'});await day.waitFor();
    assert.equal(await night.getAttribute('aria-pressed'),'true');assert.equal(await day.getAttribute('aria-pressed'),'false');
    await day.click();await page.waitForFunction(()=>document.documentElement.dataset.codexThemeStudio==='deepseek-blue');
    await button.click({button:'right'});await night.waitFor();
    assert.equal(await day.getAttribute('aria-pressed'),'true');assert.equal(await night.getAttribute('aria-pressed'),'false');
    assert.deepEqual(await page.evaluate(()=>__menuTest.routes.filter(([route])=>route==='switch').slice(-2)),[['switch',{theme:'deepseek-night'}],['switch',{theme:'deepseek-blue'}]]);
    assert.deepEqual(errors,[]);
    await page.evaluate(()=>{__menuTest.stop();__CODEX_THEME_STUDIO_SWITCHER_STATE__.cleanup();});
    assert.equal(await button.count(),0);
    console.log(JSON.stringify({pass:true,checks:['both named day/night entries visible','selected DeepSeek base exposed with aria-pressed, including red state','night/day choice invokes runtime and closes menu','single click still toggles DeepSeek/Long March','right-click, Shift+click and ArrowDown entry points','resume automatic, four installed themes, library and native actions preserved','static Long March exposes both DS entries without claiming a remembered base','static day/night choices send manager switch requests and display correct selection','38px circular fixed control','Escape and cleanup'],scope:'Isolated browser fixture; no real Codex instance changed.'},null,2));
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
