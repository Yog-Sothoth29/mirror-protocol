const {chromium}=require(process.env.MIRROR_PLAYWRIGHT||'playwright');
const sharp=require(process.env.MIRROR_SHARP||'sharp');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
(async()=>{
 const root=path.resolve(__dirname,'../..'),out=path.join(root,'previews');
 const {surfacePalettes}=await import(pathToFileURL(path.join(root,'tools/surface-design.mjs')));
 const {contrastRatio,loadTheme,validateCss}=await import(pathToFileURL(path.join(root,'runtime/scripts/theme-core.mjs')));
 const ratios=[];
 for(const [mode,p] of Object.entries(surfacePalettes)){
  const pairs=[['body',p.ink,p.panel],['input',p.ink,p.input],['input-end',p.ink,p.inputEnd],['navigation',p.ink,p.sidebar],['secondary',p.muted,p.input],['secondary-end',p.muted,p.inputEnd],['overlay',p.ink,p.elevated],['overlay-secondary',p.muted,p.elevated],['keyword',p.keyword,p.code],['string',p.string,p.code],['number',p.number,p.code],['comment',p.comment,p.code],['code',p.codeInk,p.code],['success',p.success,p.successBg],['warning',p.warning,p.warningBg],['error',p.error,p.errorBg],['primary-button',p.accentInk,p.accent]];
  for(const [role,fg,bg] of pairs){const ratio=contrastRatio(fg,bg);assert.ok(ratio>=4.5,`${mode} ${role}: ${ratio}`);ratios.push({mode,role,ratio:Number(ratio.toFixed(2))});}
  for(const [role,fg,bg] of [['selection',p.ink,p.selected],['selection-end',p.ink,p.selectedEnd],['navigation-secondary',p.muted,p.sidebar],['panel-secondary',p.muted,p.panel],['support',p.support,p.panel]]){const ratio=contrastRatio(fg,bg);assert.ok(ratio>=4.5,`${mode} ${role}: ${ratio}`);ratios.push({mode,role,ratio:Number(ratio.toFixed(2))});}
 }
 for(const id of ['deepseek-blue','deepseek-night','longmarch-black','mirror-protocol-auto']){const t=await loadTheme(id);validateCss(t.css);assert.equal(t.manifest.version,'2.2.5');}
 const b=await chromium.launch({channel:'msedge',headless:true}),page=await b.newPage({viewport:{width:1600,height:1000},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8791');await page.waitForFunction(()=>window.previewReady);
 const states=[];
 for(const mode of ['blue','night','red']){
  await page.evaluate(m=>{previewNavigate('home');choose(m);},mode);
  await page.screenshot({path:path.join(out,`surface-design-${mode}-home.png`)});
  const s=await page.evaluate(()=>{const style=s=>getComputedStyle(document.querySelector(s));return {sidebar:style('aside').backgroundImage,input:style('.composer-surface-chrome').backgroundImage,toolbar:style('.composer-toolbar').backgroundImage,selected:style('[aria-current=page]').backgroundImage,inputColor:style('textarea').color,overflow:document.documentElement.scrollWidth>innerWidth,button:document.querySelector('.cts-switch-button').getBoundingClientRect().toJSON()};});
  assert.notEqual(s.sidebar,s.input);assert.notEqual(s.toolbar,s.input);assert.equal(s.overflow,false);assert.equal(s.button.width,s.button.height);assert.ok(s.input.includes('gradient'));states.push({mode,...s});
  await page.locator('textarea').fill('配色检查');await page.locator('textarea').blur();
  await page.locator('.cts-switch-button').click({modifiers:['Shift']});await page.locator('.cts-switch-panel').waitFor({state:'visible'});await page.screenshot({path:path.join(out,`surface-design-${mode}-menu.png`)});assert.ok((await page.locator('.cts-switch-panel').evaluate(n=>getComputedStyle(n).backgroundImage)).includes('gradient'));await page.keyboard.press('Escape');
  await page.evaluate(()=>previewNavigate('task'));await page.screenshot({path:path.join(out,`surface-design-${mode}-task.png`)});
  const code=await page.locator('pre').evaluate(n=>({background:getComputedStyle(n).backgroundColor,color:getComputedStyle(n).color}));
  const rgb=hex=>'rgb('+[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)).join(', ')+')';
  assert.equal(code.background,rgb(surfacePalettes[mode].code));assert.equal(code.color,rgb(surfacePalettes[mode].codeInk));
  const syntax=await page.locator('pre [data-syntax]').evaluateAll(nodes=>nodes.map(n=>getComputedStyle(n).color));assert.equal(new Set(syntax).size,4);
  await page.getByRole('button',{name:'打开设置'}).click();await page.screenshot({path:path.join(out,`surface-design-${mode}-dialog.png`)});await page.getByRole('button',{name:'完成',exact:true}).click();
  await page.setViewportSize({width:768,height:1000});await page.evaluate(()=>previewNavigate('home'));await page.screenshot({path:path.join(out,`surface-design-${mode}-half.png`)});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.setViewportSize({width:1600,height:1000});
 }
 // Actual rendered screenshots form a contact sheet; artwork is never edited.
 const tiles=[];
 for(const [i,mode]of ['blue','night','red'].entries())for(const [row,view]of ['home','task'].entries()){const input=await sharp(path.join(out,`surface-design-${mode}-${view}.png`)).resize(800,500).toBuffer();tiles.push({input,left:i*800,top:row*500});}
 await sharp({create:{width:2400,height:1000,channels:3,background:'#101725'}}).composite(tiles).png().toFile(path.join(out,'surface-design-overview.png'));
 assert.equal(errors.length,0);const report={pass:true,version:'2.2.5',ratios,minContrast:Math.min(...ratios.map(x=>x.ratio)),renderedStates:states,syntaxDistinct:true,circularControl:true,halfScreenNoOverflow:true,pageErrors:errors,limitation:'Independent browser fixture. Actual Codex was not applied, injected, restarted, or terminated.'};await fs.writeFile(path.join(out,'surface-design-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({pass:true,contrastPairs:ratios.length,minContrast:report.minContrast,states:states.length,pageErrors:errors}));await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
