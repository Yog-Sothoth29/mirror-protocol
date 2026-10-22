import fs from 'node:fs/promises';
import './build-title-motion.mjs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { generateSurfaceCss } from './surface-design.mjs';
const workspace = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = workspace;
const { createTheme, generateCss, validateCss, buildThemePackage, analyzePalette } = await import(pathToFileURL(path.join(out,'runtime/scripts/theme-core.mjs')));
const { validateMirrorConfig } = await import(pathToFileURL(path.join(out,'runtime/scripts/mirror-protocol.mjs')));
const urlSvg = svg => `url(data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')})`;
const starLogo = color => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="47" fill="none" stroke="${color}" stroke-width=".7" stroke-opacity=".65" stroke-dasharray="73 6 20 6"/><g fill="${color}"><path d="M50 3 58 24 50 19 42 24Z M6 34 30 35 22 42 25 48Z M94 34 70 35 78 42 75 48Z M20 89 28 65 30 77 40 76Z M80 89 60 76 70 77 72 65Z"/><path d="m50 23 29 27-6 6-23-23-23 23-6-6Zm-26 35 6-5 20 20 20-20 6 5-26 26Z"/><path fill="none" stroke="${color}" stroke-width="5" d="m50 39 10 10-10 10-10-10Zm0 20 15 15-15 15-15-15Z"/></g></svg>`;
const whaleLogo = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g fill="none" stroke="#3573bb" stroke-width="3"><circle cx="50" cy="50" r="42" stroke-dasharray="100 8 14 8"/><path d="M15 59h10m51-30 9-9M12 23h16l8 8"/></g><path fill="#3573bb" d="M26 45c12-15 28-15 40-3l14-7-4 13 9 9-18-2C51 81 21 64 26 45Zm14 1a3 3 0 1 0 0 .1Z"/></svg>`;
// Original Long March terminal sigil: cabinet, star, binary rails, CPUPF ring.
// Drawn for this theme; not a crop of the TFR mod icon.
const sigilLogo = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><g fill="none" stroke="#fff" stroke-width="1.1" stroke-linecap="square"><circle cx="100" cy="100" r="94" stroke-dasharray="2 7 18 6" opacity=".9"/><circle cx="100" cy="100" r="84" opacity=".45"/><path d="M100 18v10M100 172v10M18 100h10M172 100h10" opacity=".8"/><path d="M62 76h76v58H62z" opacity=".9"/><path d="M70 84h60v38H70z"/><path d="M70 92h60M70 100h38M70 108h52" opacity=".65"/><path d="M62 134h76M76 142v9M124 142v9" opacity=".8"/><path d="M100 46l4.2 10.4 11.2.9-8.5 7.4 2.6 11-9.5-6.2-9.5 6.2 2.6-11-8.5-7.4 11.2-.9z" opacity=".95"/><path d="M40 64v-8h8M160 56h-8v8M40 136v8h8M160 144h-8v-8" opacity=".7"/></g><g fill="#fff" font-family="monospace" font-size="6" letter-spacing="2.2" opacity=".8"><text x="100" y="24" text-anchor="middle">CPUPF // LONG MARCH</text><text x="100" y="185" text-anchor="middle">07 / MIRROR</text></g></svg>`;
await fs.writeFile(path.join(out,'assets/longmarch-sigil.svg'),sigilLogo);
await fs.writeFile(path.join(out,'assets/longmarch-mark.svg'),starLogo('#f45468'));
await fs.writeFile(path.join(out,'assets/deepseek-mark.svg'),whaleLogo);
const fractureSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000"><g fill="#ec5165" fill-opacity=".035" stroke="#fa687b" stroke-opacity=".7" stroke-width="1.3"><path d="M0 40 370 300 760 120 1020 420 1600 10 1340 580 1600 870 1060 700 810 1000 680 610 0 940 340 520Z"/><path fill="none" d="M0 40 340 520 370 300 680 610 1020 420 1060 700 1340 580M760 120 680 610 810 1000M0 940 1060 700 1600 870M1020 420 1340 580 1600 10M0 480 340 520 0 940M370 300 120 0M1060 700 1600 1000"/></g><g fill="none" stroke="#e6f0ff" stroke-opacity=".32" stroke-width=".65"><path d="M0 44 370 305 765 125 1024 425 1600 16M0 944 685 615 814 1000M1024 425 1064 705 1344 585 1600 875"/></g></svg>`;
await fs.writeFile(path.join(out,'assets/mirror-fracture.svg'),fractureSvg);
const blueBrief={id:'deepseek-blue',name:'镜面协议 · DeepSeek',version:'2.3.4',mode:'light',direction:'custom',palette:{accent:'#326cb2',support:'#7762a6',surface:'#f4f9ff',ink:'#20334c'},background:{source:'generated',position:'center right',veil:0.35,prompt:'浅蓝白全息空间，深蓝渐变发色，鲸形元素，人物右侧留出阅读区。'},shape:{radius:14,shadow:'soft'},decorations:{density:'standard',sidebarWidget:{enabled:true,icon:'◈',eyebrow:'DEEPSEEK / ONLINE',title:'蓝鲸协议 · 待命',caption:'镜面稳定 / 静候信号'},cornerCard:{enabled:false,icon:'◈',eyebrow:'MIRROR / 01',title:'镜面彼端',caption:'蓝白 / 正常频段'}},copy:{tagline:'镜面彼端，信号仍在。'}};
const redBrief={...blueBrief,id:'longmarch-black',name:'镜面协议 · 长征',mode:'dark',palette:{accent:'#fb7185',support:'#a7b8d2',surface:'#0b0c14',ink:'#f1eff5'},background:{...blueBrief.background,prompt:'黑色赛博空间，白发红瞳、星形发饰、红白水手服、暗红电路和碎镜。'},shape:{radius:14,shadow:'crisp'},decorations:{density:'standard',sidebarWidget:{enabled:true,icon:'◈',eyebrow:'THE LONG MARCH',title:'长征协议已接入',caption:'红色信号 / 临时接管'},cornerCard:{enabled:false,icon:'◈',eyebrow:'MIRROR / 02',title:'你看到的我',caption:'长征 · LOJI'}},copy:{tagline:'你看到的我。'}};
const blueData=`url(data:image/webp;base64,${(await fs.readFile(path.join(out,'assets/deepseek-blue.webp'))).toString('base64')})`;
const redData=`url(data:image/webp;base64,${(await fs.readFile(path.join(out,'assets/longmarch-black.webp'))).toString('base64')})`;
const fracturedDayData=`url(data:image/webp;base64,${(await fs.readFile(path.join(out,'assets/transition-day-original.webp'))).toString('base64')})`;
const fracturedNightData=`url(data:image/webp;base64,${(await fs.readFile(path.join(out,'assets/transition-night-original.webp'))).toString('base64')})`;
blueBrief.version='2.3.4';redBrief.version='2.3.4';
const marks=`--mp-blue-mark:${urlSvg(whaleLogo)};--mp-night-mark:${urlSvg(whaleLogo.replaceAll('#3573bb','#83c9ff'))};--mp-red-mark:${urlSvg(starLogo('#f45468'))};--mp-sigil:${urlSvg(sigilLogo)};`;
const nightBrief={...blueBrief,id:'deepseek-night',name:'镜面协议 · DeepSeek 夜间',mode:'dark',palette:{accent:'#83c9ff',support:'#b3a1e7',surface:'#081322',ink:'#e4efff'},background:{...blueBrief.background,prompt:'深海午夜玻璃观测台，冰蓝月光，原蓝发蓝瞳与蓝鲸饰物，右侧人物、左侧暗场。'},decorations:{...blueBrief.decorations,sidebarWidget:{...blueBrief.decorations.sidebarWidget,eyebrow:'DEEPSEEK / NIGHT',title:'蓝鲸协议 · 夜航',caption:'深蓝频段 / 低光待命'}}};
const nightData=`url(data:image/webp;base64,${(await fs.readFile(path.join(out,'assets/deepseek-night.webp'))).toString('base64')})`;
function extraCss(mode,scope='html.codex-theme-studio-skin') {
  const red=mode==='red',night=mode==='night',dark=red||night;
  const accent=red?'#fb7185':night?'#83c9ff':'#326cb2',ink=red?'#f1eff5':night?'#e4efff':'#20334c',muted=red?'#beb5c5':night?'#a7b9d1':'#526b85',panel=red?'#14131d':night?'#101f33':'#ffffff',canvas=red?'#0b0c14':night?'#081322':'#f4f9ff',border=red?'#65404e':night?'#3d6485':'#bacde2';
  const mark=urlSvg(red?starLogo('#f45468'):night?whaleLogo.replaceAll('#3573bb','#83c9ff'):whaleLogo);
  const homeVeil=red?'rgba(9,10,16,.91) 0%,rgba(9,10,16,.71) 44%,rgba(9,10,16,.10) 82%':night?'rgba(5,13,25,.92) 0%,rgba(5,13,25,.72) 44%,rgba(5,13,25,.08) 82%':'rgba(248,252,255,.84) 0%,rgba(248,252,255,.58) 43%,rgba(248,252,255,.04) 84%';
  const taskVeil=red?'rgba(9,10,16,.98),rgba(9,10,16,.94) 64%,rgba(9,10,16,.65)':night?'rgba(5,13,25,.99),rgba(5,13,25,.96) 64%,rgba(5,13,25,.7)':'rgba(248,252,255,.98),rgba(248,252,255,.95) 64%,rgba(248,252,255,.66)';
  return `
${scope} { ${marks} --mp-canvas:${canvas}; --mp-panel:${panel}; --mp-ink:${ink}; --mp-muted:${muted}; --mp-accent:${accent}; --mp-border:${border}; --mp-art:${red?redData:night?nightData:blueData}; --mp-fracture:none; --mp-mark:${mark}; --mp-veil:linear-gradient(90deg,${homeVeil}); --mp-task-veil:linear-gradient(90deg,${taskVeil}); --mp-art-size:cover; --mp-art-position:center right; --color-background-elevated-secondary:${panel} !important; --color-background-surface-secondary:${panel} !important; --color-background-surface-primary:${canvas} !important; --color-text-primary:${ink} !important; --color-text-tertiary:${muted} !important; --color-icon-primary:${ink} !important; --color-token-foreground:${ink} !important; --color-token-description-foreground:${muted} !important; }
${scope} :is(main.main-surface,main), ${scope} :is(main.main-surface,main).codex-theme-home-shell {
 background-image:var(--mp-fracture),var(--mp-veil),var(--mp-art) !important;
 background-size:cover,cover,var(--mp-art-size) !important; background-position:center,center,var(--mp-art-position) !important;background-repeat:no-repeat!important;background-color:${canvas}!important;
}
${scope}[data-codex-theme-studio-layout="half"] {--mp-art-size:auto min(80vh,760px);--mp-art-position:right top;--mp-fracture:linear-gradient(180deg,${canvas}00 0%,${canvas}00 38%,${canvas} 82%);}
@media(max-width:1200px),(max-aspect-ratio:5/4){${scope}{--mp-art-size:auto min(80vh,760px);--mp-art-position:right top;--mp-fracture:linear-gradient(180deg,${canvas}00 0%,${canvas}00 38%,${canvas} 82%);}}
${scope} :is(main.main-surface,main):has(:is(.markdown,[data-testid="conversation-turn"],[data-turn-key])) {--mp-veil:var(--mp-task-veil);background-image:var(--mp-fracture),var(--mp-veil),var(--mp-art) !important;}
${scope} :is(.composer-surface-chrome,[data-composer-body]) {background:${red?'rgba(20,19,29,.97)':night?'rgba(16,31,51,.97)':'rgba(255,255,255,.94)'} !important; border-color:${border} !important; box-shadow:0 12px 38px ${dark?'#0006':'#355d9219'},inset 0 2px ${red?'#f454685c':'#75b8f052'} !important;backdrop-filter:none!important;}
${scope} :is(.composer-surface-chrome,[data-composer-body]):focus-within {border-color:${accent} !important;box-shadow:0 0 0 3px ${red?'#f454681a':'#3573bb16'},0 14px 42px ${red?'#0006':'#355d9218'} !important;}
${scope} .cts-decoration-icon {color:transparent !important;background-color:transparent !important;background-image:var(--mp-mark) !important;background-size:contain !important;background-repeat:no-repeat !important;box-shadow:none !important;border-radius:0 !important;}
${scope} .cts-decoration-card {border-radius:14px;box-shadow:0 12px 35px ${red?'#0004':'#3573bb12'},inset 3px 0 ${accent};backdrop-filter:none!important;}
${scope} .cts-decoration-card::after {background:repeating-linear-gradient(0deg,transparent 0px,transparent 5px,${red?'#fa687b09':'#3573bb06'} 6px);border-radius:0;}
${scope} #codex-theme-studio-decorations {
 background-image:
  radial-gradient(120% 92% at 50% 46%,transparent 48%,${dark?'rgba(0,0,0,.30)':'rgba(15,48,78,.06)'} 100%),
  repeating-linear-gradient(0deg,color-mix(in srgb,${accent} 4%,transparent) 0 1px,transparent 1px 4px),
  repeating-linear-gradient(0deg,color-mix(in srgb,${accent} 3%,transparent) 0 1px,transparent 1px 46px),
  repeating-linear-gradient(90deg,color-mix(in srgb,${accent} 3%,transparent) 0 1px,transparent 1px 46px);
 background-size:cover,auto,auto,auto;
 box-shadow:inset 0 0 0 1px color-mix(in srgb,${accent} 14%,transparent);
}
${scope} #codex-theme-studio-decorations::before {content:"";position:absolute;inset:14px;border:1px solid color-mix(in srgb,${accent} 16%,transparent);border-radius:4px;pointer-events:none;}
${scope} #codex-theme-studio-decorations::after {content:"";position:absolute;left:14px;top:14px;width:30px;height:30px;border-left:2px solid color-mix(in srgb,${accent} 38%,transparent);border-top:2px solid color-mix(in srgb,${accent} 38%,transparent);pointer-events:none;}
${scope} .cts-decoration-eyebrow {letter-spacing:.12em;}
${scope} :is(textarea,input,[contenteditable="true"]) {color:${ink} !important;caret-color:${accent} !important;}
${scope} :is(textarea,input)::placeholder {color:${muted} !important;}
${scope} :is([role="dialog"],[aria-modal="true"],[role="menu"],[data-radix-popper-content-wrapper]) {background-color:${panel} !important;color:${ink} !important;border-color:${border} !important;}
${scope} pre,${scope} code {--color-token-editor-background:${panel};}
${scope} button[aria-pressed="true"],${scope} [aria-current="page"] {background-color:${red?'#4e2636':night?'#173958':'#dfedfc'} !important;}
${scope} .cts-corner-card {transform:none;}
${red?`${scope} .cts-decoration-icon {animation:mp-red-signal 5.6s ease-in-out infinite;}\n${scope} :is(.composer-surface-chrome,[data-composer-body]) {border-top-color:#fb7185 !important;}`:''}
${generateSurfaceCss(mode,scope).replaceAll('.composer-surface-chrome',':is(.composer-surface-chrome,[data-composer-body])')}
`;
}
const blue=await createTheme(blueBrief,{artPath:path.join(out,'assets/deepseek-blue.webp')});
const red=await createTheme(redBrief,{artPath:path.join(out,'assets/longmarch-black.webp')});
const night=await createTheme(nightBrief,{artPath:path.join(out,'assets/deepseek-night.webp')});
const blueCss=generateCss(blueBrief)+extraCss('blue');
const redCss=generateCss(redBrief)+extraCss('red');
const nightCss=generateCss(nightBrief)+extraCss('night');
await fs.writeFile(night.cssPath,nightCss);
await fs.writeFile(blue.cssPath,blueCss); await fs.writeFile(red.cssPath,redCss);
const autoBrief={...blueBrief,id:'mirror-protocol-auto',name:'镜面协议 · 蓝鲸 / 长征'};
const auto=await createTheme(autoBrief,{artPath:path.join(out,'assets/deepseek-blue.webp')});
let scopedRed=generateCss(redBrief).replaceAll(':root.codex-theme-studio-skin',':root.codex-theme-studio-skin[data-mirror-mode="red"]').replaceAll('html.codex-theme-studio-skin','html.codex-theme-studio-skin[data-mirror-mode="red"]');
// Every decoration rule also follows the submode; no red leakage into blue.
scopedRed=scopedRed.replace(/(^|\n)(#codex-theme-studio-decorations|\.cts-[^{\n,]+)(?=\s*[,\{])/g,'$1html[data-mirror-mode="red"] $2');
const nightScope='html.codex-theme-studio-skin[data-mirror-appearance="night"]:not([data-mirror-mode="red"])';
let scopedNight=generateCss(nightBrief).replaceAll(':root.codex-theme-studio-skin',':root.codex-theme-studio-skin[data-mirror-appearance="night"]:not([data-mirror-mode="red"])').replaceAll('html.codex-theme-studio-skin',nightScope);
scopedNight=scopedNight.replace(/(^|\n)(#codex-theme-studio-decorations|\.cts-[^{\n,]+)(?=\s*[,\{])/g,'$1html[data-mirror-appearance="night"]:not([data-mirror-mode="red"]) $2');
const effects=`
html.codex-theme-studio-skin[data-mirror-mode] .cts-decoration-icon {position:relative;background-image:none!important;animation:none;}
html.codex-theme-studio-skin[data-mirror-mode] .cts-decoration-icon::before,html.codex-theme-studio-skin[data-mirror-mode] .cts-decoration-icon::after {content:"";position:absolute;inset:0;background:var(--mp-blue-mark) center/contain no-repeat;transition:opacity .6s ease,transform 1.6s cubic-bezier(.22,.61,.36,1),filter .6s ease;pointer-events:none;}
html.codex-theme-studio-skin[data-mirror-appearance="night"] .cts-decoration-icon::before {background-image:var(--mp-night-mark);}
html.codex-theme-studio-skin[data-mirror-mode] .cts-decoration-icon::after {background-image:var(--mp-red-mark);opacity:0;transform:rotate(32deg) scale(.65);filter:blur(2px);}
html.codex-theme-studio-skin[data-mirror-mode="red"] .cts-decoration-icon::before {opacity:0;transform:rotate(-32deg) scale(.65);filter:blur(2px);}
html.codex-theme-studio-skin[data-mirror-mode="red"] .cts-decoration-icon::after {opacity:1;transform:rotate(0) scale(1);filter:blur(0);}
html.codex-theme-studio-skin[data-mirror-phase="breach"] .cts-decoration-icon::before,html.codex-theme-studio-skin[data-mirror-phase="breach"] .cts-decoration-icon::after {transition-delay:0s;}
@keyframes mp-red-signal {0%,82%,100% {filter:drop-shadow(0 0 3px #f4546838);} 88% {filter:drop-shadow(0 0 9px #f45468a0);} 94% {filter:drop-shadow(0 0 4px #f4546850);}}
@media(prefers-reduced-motion:reduce) {html.codex-theme-studio-skin .cts-decoration-icon {animation:none !important;}html.codex-theme-studio-skin[data-mirror-phase="breach"] .cts-decoration-icon {animation:none!important;}html.codex-theme-studio-skin .cts-decoration-icon::before,html.codex-theme-studio-skin .cts-decoration-icon::after {transition:none!important;}html.codex-theme-studio-skin[data-mirror-phase] :is(body,aside.app-shell-left-panel,.composer-surface-chrome,textarea){transition:none;}}
`;
const autoCss=(blueCss+'\n'+scopedNight+extraCss('night',nightScope)+scopedRed+extraCss('red','html.codex-theme-studio-skin[data-mirror-mode="red"]')+effects).replaceAll('--mp-art:'+blueData,'--mp-art:var(--mp-blue-art)').replaceAll('--mp-art:'+nightData,'--mp-art:var(--mp-night-art)').replaceAll('--mp-art:'+redData,'--mp-art:var(--mp-red-art)')+`\nhtml.codex-theme-studio-skin {--mp-blue-art:${blueData};--mp-night-art:${nightData};--mp-red-art:${redData};--mp-fractured-day:${fracturedDayData};--mp-fractured-night:${fracturedNightData};}`;
for(const css of [blueCss,redCss+effects,nightCss,autoCss])validateCss(css);
await fs.writeFile(auto.cssPath,autoCss); await fs.writeFile(red.cssPath,redCss+effects);
const priorConfig=await fs.readFile(path.join(out,'mirror-config.json'),'utf8').then(JSON.parse).catch(()=>null);
const config=validateMirrorConfig({version:1,enabled:true,epochMs:priorConfig?.epochMs??Date.now(),seed:20261015,quietMinMs:6*60000,quietMaxMs:14*60000,redMinMs:25000,redMaxMs:70000});
auto.manifest.mirrorProtocol=config;
auto.manifest.description='DeepSeek 可选蓝白日间或深蓝夜间，6–14分钟不定时切入黑红长征空间，停留25–70秒；回程返回已选日夜基底。输入中和对话框打开时延后。';
auto.manifest.appearance={...auto.manifest.appearance,message:'Dual appearance: light blue base, dark red intrusion. Uses semantic bridges; native appearance is not changed automatically.'};
await fs.writeFile(auto.manifestPath,JSON.stringify(auto.manifest,null,2));
await fs.writeFile(path.join(out,'mirror-config.json'),JSON.stringify(config,null,2));
await fs.mkdir(path.join(out,'packages'),{recursive:true});
for(const theme of [blue,night,red,auto]) {
  const pkg=await buildThemePackage(theme.manifestPath);
  await fs.writeFile(path.join(out,'packages',theme.manifest.id+'.codex-theme'),pkg.serialized);
}
const source=await fs.readFile(path.join(out,'runtime/assets/renderer-inject.js'),'utf8');
const art='data:image/webp;base64,'+(await fs.readFile(auto.artPath)).toString('base64');
const publicTheme={id:auto.manifest.id,displayName:auto.manifest.displayName,version:auto.manifest.version,decorations:auto.manifest.decorations};
const base=source.replace('__CTS_CSS_JSON__',JSON.stringify(autoCss)).replace('__CTS_ART_JSON__',JSON.stringify(art)).replace('__CTS_THEME_JSON__',JSON.stringify(publicTheme)).replace('__CTS_USAGE_JSON__','null');
await fs.writeFile(path.join(out,'preview-inject.js'),'export default '+base+';\n');
await fs.writeFile(path.join(out,'previews/palette-check.json'),JSON.stringify({blue:analyzePalette('light',blueBrief.palette),night:analyzePalette('dark',nightBrief.palette),red:analyzePalette('dark',redBrief.palette)},null,2));
console.log(JSON.stringify({themes:[blue.manifestPath,night.manifestPath,red.manifestPath,auto.manifestPath],autoCssBytes:Buffer.byteLength(autoCss),blueQuality:blue.manifest.quality.score,nightQuality:night.manifest.quality.score,redQuality:red.manifest.quality.score,config},null,2));
