import { createTitleMotion } from './title-motion.mjs';
import { visibleMain } from './page-policy.mjs';
// Constrained dual-state extension to Codex Theme Studio. No network or DOM controls.
export function mirrorSchedule(config, now) {
  let boundary = config.epochMs;
  const random = (index, salt) => {
    let value = (config.seed ^ Math.imul(index + 1, 0x45d9f3b) ^ salt) >>> 0;
    value = Math.imul(value ^ (value >>> 16), 0x45d9f3b) >>> 0;
    return ((value ^ (value >>> 16)) >>> 0) / 4294967296;
  };
  for (let cycle = 0; cycle < 100000; cycle += 1) {
    const quiet = config.quietMinMs + Math.floor(random(cycle, 17) * (config.quietMaxMs - config.quietMinMs));
    const red = config.redMinMs + Math.floor(random(cycle, 59) * (config.redMaxMs - config.redMinMs));
    if (now < boundary + quiet) return { mode: 'blue', nextAt: boundary + quiet, cycle };
    if (now < boundary + quiet + red) return { mode: 'red', nextAt: boundary + quiet + red, cycle };
    boundary += quiet + red;
  }
  return { mode: 'blue', nextAt: now + config.quietMinMs, cycle: -1 };
}

export function validateMirrorConfig(raw) {
  if (raw == null) return null;
  if (raw.version !== 1 || raw.enabled !== true) throw new Error('Unsupported mirror protocol configuration');
  const ranges = { epochMs: [0, 1e14], seed: [1, 4294967295], quietMinMs: [60000, 86400000], quietMaxMs: [60000, 86400000], redMinMs: [10000, 300000], redMaxMs: [10000, 300000] };
  const result = { version: 1, enabled: true };
  for (const [key, [min, max]] of Object.entries(ranges)) {
    if (!Number.isSafeInteger(raw[key]) || raw[key] < min || raw[key] > max) throw new Error(`Invalid mirror setting: ${key}`);
    result[key] = raw[key];
  }
  if (result.quietMaxMs < result.quietMinMs || result.redMaxMs < result.redMinMs) throw new Error('Inverted mirror timing bounds');
  return result;
}

export function extendRendererExpression(baseExpression, rawConfig) {
  const config = validateMirrorConfig(rawConfig);
  return `(() => { window.__MIRROR_PROTOCOL__?.dispose?.(); return (${baseExpression.trim()}).then(result => { (${installMirrorProtocol.toString()})(${JSON.stringify(config)}, ${mirrorSchedule.toString()}, ${createTitleMotion.toString()}, ${visibleMain.toString()}); return result; }); })()`;
}

export function installMirrorProtocol(config, schedule, titleMotionFactory = createTitleMotion, resolveMain = visibleMain) {
  const key = '__MIRROR_PROTOCOL__';
  window[key]?.dispose?.();
  if (!config) return { enabled: false };
  const root = document.documentElement;
  const STYLE_ID = 'mp-motion-style';
  const STAGE_CLASS = 'mp-stage';
  let disposed = false, automatic = true, current = 'blue', transitioning = false, composing = false;
  let appearance = 'day';
  let transitionGeneration = 0;
  let stage = null, mainEl = null, mainIsolation = null, mainPosition = null;
  let layerRefs = null, warmTimer = 0, warmIdle = false, cpEffectTimer = 0;
  let cpMotion = null;
  let anims = [];
  const decoded = new Set();

  const CSS = `
main.main-surface.mp-stage-parent{isolation:isolate}
.mp-stage{position:absolute;inset:0;z-index:-1;overflow:hidden;pointer-events:none;contain:layout paint style;font-family:"Cascadia Mono","JetBrains Mono",Consolas,"Microsoft YaHei UI",monospace;--mp-veil-breach:linear-gradient(90deg,rgba(9,10,16,.86) 0%,rgba(9,10,16,.64) 44%,rgba(9,10,16,.08) 82%);--mp-veil-breach-night:linear-gradient(90deg,rgba(4,9,18,.90) 0%,rgba(4,9,18,.72) 44%,rgba(4,9,18,.10) 82%);--mp-hud-line:rgba(50,108,178,.36);--mp-hud-dim:rgba(50,108,178,.10);--mp-hud-text:rgba(32,51,76,.58);--mp-hud-bg:rgba(244,249,255,.76);--mp-hud-hot:rgba(50,108,178,.78);--mp-hud-scan:rgba(32,51,76,.07);--mp-hud-vig:rgba(244,249,255,.58)}
.mp-stage[data-art="night"]{--mp-hud-line:rgba(131,201,255,.34);--mp-hud-dim:rgba(131,201,255,.10);--mp-hud-text:rgba(228,239,255,.58);--mp-hud-bg:rgba(8,19,34,.76);--mp-hud-hot:rgba(131,201,255,.78);--mp-hud-scan:rgba(228,239,255,.06);--mp-hud-vig:rgba(8,19,34,.58)}
.mp-stage[data-mode="red"]{--mp-hud-line:rgba(251,113,133,.44);--mp-hud-dim:rgba(251,113,133,.12);--mp-hud-text:rgba(241,239,245,.56);--mp-hud-bg:rgba(11,12,20,.78);--mp-hud-hot:rgba(251,113,133,.85);--mp-hud-scan:rgba(241,239,245,.06);--mp-hud-vig:rgba(11,12,20,.60)}
.mp-stage *{box-sizing:border-box}
.mp-shot{position:absolute;inset:0;opacity:0;background-image:var(--mp-fracture,none),var(--mp-veil),var(--mp-blue-art);background-repeat:no-repeat;background-size:cover,cover,var(--mp-art-size,cover);background-position:center,center,var(--mp-art-position,center right);will-change:opacity;}
.mp-stage[data-art="night"] .mp-shot{background-image:var(--mp-fracture,none),var(--mp-veil),var(--mp-night-art)}
.mp-stage[data-mp-active="true"] .mp-shot{opacity:1}
.mp-layer{position:absolute;inset:0;opacity:0;background-repeat:no-repeat;background-size:cover,cover,var(--mp-art-size,cover);background-position:center,center,var(--mp-art-position,center right);will-change:opacity;transform:translateZ(0)}
.mp-layer-middle{background-image:var(--mp-fracture,none),var(--mp-veil-breach),var(--mp-fractured-day,none)}
.mp-stage[data-art="night"] .mp-layer-middle{background-image:var(--mp-fracture,none),var(--mp-veil-breach-night),var(--mp-fractured-night,none)}
.mp-layer-red{background-image:var(--mp-fracture,none),var(--mp-veil,linear-gradient(90deg,transparent,transparent)),var(--mp-red-art,none)}
.mp-stage[data-mp-warm="true"] .mp-layer-middle,.mp-stage[data-mp-warm="true"] .mp-layer-red{opacity:.001!important;will-change:opacity}
.mp-stage[data-mp-warm="true"] .mp-shot{opacity:.001!important}
.mp-layer-cool{background:radial-gradient(120% 100% at 22% 28%,rgba(223,244,255,.30),transparent 62%),linear-gradient(180deg,rgba(234,247,255,.14),transparent)}
.mp-flash{position:absolute;inset:0;background:radial-gradient(circle at 28% 42%,rgba(255,226,110,.8),transparent 34%),radial-gradient(circle at 36% 48%,rgba(88,238,204,.42),transparent 47%);opacity:0;pointer-events:none}
.mp-sweep{position:absolute;left:-4%;right:53%;top:-24%;height:14%;background:linear-gradient(180deg,transparent,var(--mp-hud-text),transparent);opacity:0;pointer-events:none}
.mp-hud{position:absolute;inset:0;overflow:hidden;pointer-events:none;color:var(--mp-hud-text)}
.mp-hud>div{position:absolute}
.mp-grid{inset:0;background-image:repeating-linear-gradient(0deg,var(--mp-hud-dim) 0 1px,transparent 1px 38px),repeating-linear-gradient(90deg,var(--mp-hud-dim) 0 1px,transparent 1px 38px);opacity:.42;-webkit-mask-image:linear-gradient(90deg,#000 0 44%,transparent 68%);mask-image:linear-gradient(90deg,#000 0 44%,transparent 68%)}
.mp-rings{right:-18vmax;top:50%;width:74vmax;height:74vmax;transform:translateY(-50%);border-radius:50%;background:repeating-radial-gradient(circle,var(--mp-hud-dim) 0 1px,transparent 1px 52px);opacity:.5;-webkit-mask-image:radial-gradient(circle,#000 0 54%,transparent 76%);mask-image:radial-gradient(circle,#000 0 54%,transparent 76%)}
.mp-cross{inset:0;background:linear-gradient(90deg,transparent calc(50% - .5px),var(--mp-hud-dim) calc(50% - .5px) calc(50% + .5px),transparent calc(50% + .5px)),linear-gradient(0deg,transparent calc(50% - .5px),var(--mp-hud-dim) calc(50% - .5px) calc(50% + .5px),transparent calc(50% + .5px));opacity:.42}
.mp-radar{left:3%;top:24%;width:min(48vmax,620px);height:min(48vmax,620px);border-radius:50%;background:conic-gradient(from 0deg,var(--mp-hud-line) 0deg,transparent 30deg,transparent 360deg);opacity:.42;animation:mp-rotate 22s linear infinite;-webkit-mask-image:radial-gradient(circle,#000 0 61%,transparent 74%);mask-image:radial-gradient(circle,#000 0 61%,transparent 74%)}
.mp-wm{left:8%;right:auto;top:50%;width:min(48vh,32vw);height:min(48vh,32vw);transform:translateY(-50%);background:var(--mp-hud-hot);-webkit-mask:var(--mp-sigil,radial-gradient(circle,#000 0 38%,transparent 72%)) center/contain no-repeat;mask:var(--mp-sigil,radial-gradient(circle,#000 0 38%,transparent 72%)) center/contain no-repeat;opacity:.06;animation:mp-breathe 26s ease-in-out infinite}
.mp-rain{inset:0;display:none;opacity:.38;-webkit-mask-image:linear-gradient(90deg,#000 0 30%,transparent 44%);mask-image:linear-gradient(90deg,#000 0 30%,transparent 44%)}
.mp-stage[data-mode="red"] .mp-rain{display:block}
.mp-col{position:absolute;top:-42%;width:1ch;white-space:pre-wrap;word-break:break-all;font:10px/1.08 "Cascadia Mono",Consolas,monospace;color:var(--mp-hud-hot);text-shadow:0 0 7px var(--mp-hud-line);animation:mp-fall linear infinite;will-change:transform}
.mp-embers{inset:0;display:none;overflow:hidden}
.mp-stage[data-mode="red"] .mp-embers{display:block}
.mp-embers i{position:absolute;bottom:-8px;width:2px;height:2px;border-radius:50%;background:var(--mp-hud-hot);box-shadow:0 0 7px var(--mp-hud-line);opacity:0;animation:mp-ember 8s linear infinite;will-change:transform,opacity}
.mp-scan{inset:0;background:repeating-linear-gradient(0deg,var(--mp-hud-scan) 0 1px,transparent 1px 3px);opacity:.3}
.mp-vignette{inset:0;background:radial-gradient(115% 88% at 50% 45%,transparent 46%,var(--mp-hud-vig) 100%);opacity:.55}
.mp-frame{inset:14px}
.mp-frame i{position:absolute;width:26px;height:26px;border-color:var(--mp-hud-line);border-style:solid;opacity:.65}
.mp-frame i:nth-child(1){left:0;top:0;border-width:1px 0 0 1px}
.mp-frame i:nth-child(2){right:0;top:0;border-width:1px 1px 0 0}
.mp-frame i:nth-child(3){left:0;bottom:0;border-width:0 0 1px 1px}
.mp-frame i:nth-child(4){right:0;bottom:0;border-width:0 1px 1px 0}
.mp-hud-top{left:20px;bottom:40px;top:auto;display:flex;align-items:center;gap:12px;font-size:8.5px;letter-spacing:.16em;color:var(--mp-hud-text);text-transform:uppercase;white-space:nowrap}
.mp-hud-top b{font-weight:600;color:var(--mp-hud-line)}
.mp-dot{width:5px;height:5px;border-radius:50%;background:var(--mp-hud-hot);box-shadow:0 0 8px var(--mp-hud-hot);animation:mp-pulse 2.6s ease-in-out infinite}
.mp-hud-side{left:17px;top:50%;transform:translateY(-50%);writing-mode:vertical-rl;font-size:9px;letter-spacing:.34em;color:var(--mp-hud-text);opacity:.62;white-space:nowrap}
.mp-ruler{left:7px;top:16%;bottom:16%;width:5px;background:repeating-linear-gradient(180deg,var(--mp-hud-line) 0 1px,transparent 1px 14px);opacity:.5;-webkit-mask-image:linear-gradient(180deg,transparent,#000 12%,#000 88%,transparent);mask-image:linear-gradient(180deg,transparent,#000 12%,#000 88%,transparent)}
.mp-reticle{left:18%;right:auto;top:50%;width:min(30vh,260px);height:min(30vh,260px);transform:translateY(-50%);border:1px dashed var(--mp-hud-line);border-radius:50%;opacity:.22;animation:mp-spin 46s linear infinite}
.mp-reticle::before,.mp-reticle::after{content:"";position:absolute;background:var(--mp-hud-line)}
.mp-reticle::before{left:50%;top:-12%;width:1px;height:124%}
.mp-reticle::after{top:50%;left:-12%;height:1px;width:124%}
.mp-reticle b{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font:7px/1 "Cascadia Mono",Consolas,monospace;letter-spacing:.18em;color:var(--mp-hud-line);font-weight:400;white-space:nowrap}
.mp-status{left:20px;top:78px;display:flex;align-items:center;gap:10px;font-size:7.5px;letter-spacing:.16em;color:var(--mp-hud-text);text-transform:uppercase;white-space:nowrap}
.mp-status::before{content:"";width:54px;height:1px;background:var(--mp-hud-line)}
.mp-warning{left:0;right:0;top:0;height:4px;background:repeating-linear-gradient(45deg,var(--mp-hud-hot) 0 6px,transparent 6px 12px);opacity:0;transition:opacity .4s ease}
.mp-stage[data-mode="red"] .mp-warning{opacity:.55}
.mp-motes{inset:0;display:block;overflow:hidden}
.mp-rain,.mp-embers,.mp-motes{right:58%}
.mp-stage[data-mode="red"] .mp-motes{display:none}
.mp-motes i{position:absolute;bottom:-6px;width:3px;height:3px;border-radius:50%;background:var(--mp-hud-hot);opacity:0;animation:mp-mote 12s linear infinite;will-change:transform,opacity}
.mp-hud-meta{left:20px;bottom:16px;display:grid;gap:2px;font-size:8px;letter-spacing:.12em;color:var(--mp-hud-text);text-transform:uppercase}
.mp-hud-meta b{color:var(--mp-hud-line);font-weight:600}
.mp-alert{right:20px;bottom:16px;padding:4px 8px;border:1px solid var(--mp-hud-line);background:var(--mp-hud-bg);font-size:8px;letter-spacing:.14em;color:var(--mp-hud-line);opacity:0;transition:opacity .35s ease}
.mp-stage[data-mode="red"] .mp-alert{opacity:1}
.mp-progress{left:0;right:0;bottom:0;height:2px;background:var(--mp-hud-dim);opacity:0;transition:opacity .2s ease}
.mp-progress i{display:block;width:100%;height:100%;background:var(--mp-hud-hot);transform:scaleX(0);transform-origin:0 50%}
.mp-stage[data-mp-active="true"] .mp-progress{opacity:1}
.mp-stage[data-mode="red"] .mp-blue-only{display:none}
.mp-stage:not([data-mode="red"]) .mp-red-only{display:none}
.mp-wallpaper-motion{inset:0;opacity:.8;transition:opacity .5s ease}
.mp-whale-field{position:absolute;left:26%;right:auto;width:23%;bottom:6%;height:22%;overflow:hidden;opacity:.25}
.mp-whale-field svg{position:absolute;left:-12%;top:5%;width:124%;height:70%;fill:none;stroke:var(--mp-hud-line);stroke-width:.8;animation:mp-ocean-drift 18s ease-in-out infinite alternate}
.mp-whale-field svg+svg{top:22%;opacity:.6;animation-direction:alternate-reverse;animation-duration:23s}
.mp-sonar{position:absolute;left:25%;right:auto;top:13%;width:min(18vw,210px);aspect-ratio:1;opacity:.23}
.mp-sonar i{position:absolute;inset:0;border:1px solid var(--mp-hud-line);border-radius:50%;animation:mp-sonar-wave 12s ease-out infinite;will-change:transform,opacity}
.mp-sonar i:nth-child(2){animation-delay:-4s}.mp-sonar i:nth-child(3){animation-delay:-8s}
.mp-stage[data-mode="red"] .mp-whale-field,.mp-stage[data-mode="red"] .mp-sonar{display:none}
main.main-surface:has(.markdown) .mp-wallpaper-motion{opacity:.23}
main.main-surface:has(textarea:focus) .mp-wallpaper-motion{opacity:.26}
.mp-stage[data-wallpaper-paused="true"] *{animation-play-state:paused!important}
@keyframes mp-ocean-drift{from{transform:translateX(-3%) translateY(0)}to{transform:translateX(3%) translateY(10px)}}
@keyframes mp-sonar-wave{0%{transform:scale(.35);opacity:0}14%{opacity:.6}100%{transform:scale(1);opacity:0}}
@keyframes mp-fall{from{transform:translate3d(0,-110%,0)}to{transform:translate3d(0,1050%,0)}}
@keyframes mp-ember{0%{opacity:0;transform:translate3d(0,0,0) scale(.7)}12%{opacity:.7}70%{opacity:.35}100%{opacity:0;transform:translate3d(var(--mp-dx,0px),-88vh,0) scale(1.15)}}
@keyframes mp-rotate{to{transform:rotate(360deg)}}
@keyframes mp-spin{from{transform:translateY(-50%) rotate(0)}to{transform:translateY(-50%) rotate(360deg)}}
@keyframes mp-mote{0%{opacity:0;transform:translate3d(0,0,0)}18%{opacity:.4}75%{opacity:.18}100%{opacity:0;transform:translate3d(var(--mp-dx,0px),-72vh,0)}}
@keyframes mp-breathe{0%,100%{opacity:.05;transform:translateY(-50%) scale(1)}50%{opacity:.085;transform:translateY(-50%) scale(1.035)}}
@keyframes mp-pulse{0%,100%{opacity:.55}50%{opacity:1}}
@media(max-width:1120px){.mp-hud-side,.mp-hud-meta,.mp-wm,.mp-rain,.mp-embers,.mp-radar,.mp-reticle,.mp-ruler,.mp-status{display:none}}
@media(max-width:1120px){.mp-wallpaper-motion{opacity:.62}.mp-whale-field{left:16%;width:24%;bottom:26%}.mp-sonar{left:18%;right:auto;top:11%;width:min(14vw,110px)}.mp-stage[data-mode="red"] .mp-embers{display:block;opacity:.5}}
@media(max-height:680px){.mp-hud-meta,.mp-hud-side{display:none}}
@media(prefers-reduced-motion:reduce){.mp-stage *{animation:none!important}.mp-layer{transition:none!important}}
`;

  const ensureStyle = () => {
    const existing = document.getElementById(STYLE_ID);
    if (existing?.dataset.motionVersion === '6') return;
    let style = existing;
    if (!style) {
      style = document.createElement('style');
      style.id = STYLE_ID;
      (document.head || root).appendChild(style);
    }
    style.textContent = CSS;
    style.dataset.motionVersion = '6';
  };

  const makeRain = () => {
    let seed = 0x2f6e2b1;
    const rnd = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    const glyphs = '01';
    const cjk = '长征逻辑量子比特节点同步人民服务效率觉醒数字文明灯火光明真理实践道路解放自动化社会主义卫星计算红色数据流指令';
    const rain = document.createElement('div');
    rain.className = 'mp-rain';
    for (let index = 0; index < 16; index += 1) {
      const column = document.createElement('span');
      column.className = 'mp-col';
      let value = '';
      const length = 30 + Math.floor(rnd() * 36);
      for (let step = 0; step < length; step += 1) value += rnd() > 0.38 ? glyphs[Math.floor(rnd() * 2)] : cjk[Math.floor(rnd() * cjk.length)];
      column.textContent = value;
      column.style.left = `${(index * 2.55 + rnd() * 2.2).toFixed(2)}%`;
      column.style.fontSize = `${(10 + rnd() * 3).toFixed(1)}px`;
      column.style.opacity = (0.35 + rnd() * 0.5).toFixed(2);
      column.style.animationDuration = `${(8 + rnd() * 11).toFixed(2)}s`;
      column.style.animationDelay = `${(-rnd() * 19).toFixed(2)}s`;
      rain.appendChild(column);
    }
    return rain;
  };

  const makeEmbers = () => {
    let seed = 0x51f15e;
    const rnd = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    const embers = document.createElement('div');
    embers.className = 'mp-embers';
    for (let index = 0; index < 18; index += 1) {
      const ember = document.createElement('i');
      ember.style.left = `${(rnd() * 43).toFixed(2)}%`;
      ember.style.setProperty('--mp-dx', `${(rnd() * 44 - 22).toFixed(1)}px`);
      ember.style.animationDuration = `${(5 + rnd() * 6).toFixed(2)}s`;
      ember.style.animationDelay = `${(-rnd() * 9).toFixed(2)}s`;
      ember.style.width = `${(1.4 + rnd() * 1.6).toFixed(1)}px`;
      ember.style.height = ember.style.width;
      embers.appendChild(ember);
    }
    return embers;
  };

  const makeMotes = () => {
    let seed = 0x71a3c5;
    const rnd = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    const motes = document.createElement('div');
    motes.className = 'mp-motes';
    for (let index = 0; index < 14; index += 1) {
      const mote = document.createElement('i');
      mote.style.left = `${(rnd() * 43).toFixed(2)}%`;
      mote.style.setProperty('--mp-dx', `${(rnd() * 30 - 15).toFixed(1)}px`);
      mote.style.width = `${(1.5 + rnd() * 2).toFixed(1)}px`;
      mote.style.height = mote.style.width;
      mote.style.animationDuration = `${(9 + rnd() * 9).toFixed(2)}s`;
      mote.style.animationDelay = `${(-rnd() * 14).toFixed(2)}s`;
      motes.appendChild(mote);
    }
    return motes;
  };

  const makeHud = () => {
    const hud = document.createElement('div');
    hud.className = 'mp-hud';
    hud.setAttribute('aria-hidden', 'true');
    hud.innerHTML = `<div class="mp-grid"></div><div class="mp-rings"></div><div class="mp-cross"></div><div class="mp-radar"></div><div class="mp-wm"></div><div class="mp-scan"></div><div class="mp-vignette"></div><div class="mp-warning"></div><div class="mp-frame"><i></i><i></i><i></i><i></i></div><div class="mp-ruler"></div><div class="mp-reticle"><b>LOJI / 07</b></div><div class="mp-status"><span>LINK 87.4</span><span class="mp-blue-only">WHALE SONAR</span><span class="mp-red-only">LONG MARCH CORE</span><span>CPUPF-07</span></div><div class="mp-hud-top"><span class="mp-dot"></span><b>MIRROR PROTOCOL</b><span class="mp-blue-only">BLUE FREQUENCY / 01</span><span class="mp-red-only">BREACH / 02</span><span>CPUPF-07</span></div><div class="mp-hud-side"><span class="mp-blue-only">蓝鲸协议 · 镜面彼端</span><span class="mp-red-only">烈焰升腾 · 长征机</span></div><div class="mp-hud-meta"><span>SIGNAL <b>87.4</b> / LINK <b>STABLE</b></span><span class="mp-blue-only">SECTOR 01 · WHALE SONAR</span><span class="mp-red-only">SECTOR 07 · LONG MARCH CORE</span></div><div class="mp-alert">BREACH / 长征协议接管</div><div class="mp-progress"><i></i></div>`;
    hud.appendChild(makeRain());
    hud.appendChild(makeEmbers());
    hud.appendChild(makeMotes());
    const motion=document.createElement('div');motion.className='mp-wallpaper-motion';
    const sea=document.createElement('div');sea.className='mp-whale-field';
    sea.innerHTML='<svg viewBox="0 0 900 100" preserveAspectRatio="none"><path d="M0 50 Q75 10 150 50 T450 50 T750 50 T1050 50"/><path opacity=".4" d="M0 65 Q75 25 150 65 T450 65 T750 65 T1050 65"/></svg><svg viewBox="0 0 900 100" preserveAspectRatio="none"><path d="M0 50 Q75 90 150 50 T450 50 T750 50 T1050 50"/></svg>';
    motion.appendChild(sea);const sonar=document.createElement('div');sonar.className='mp-sonar';sonar.innerHTML='<i></i><i></i><i></i>';motion.appendChild(sonar);hud.appendChild(motion);
    return hud;
  };

  const preload = (name) => {
    if (decoded.has(name)) return;
    const raw = getComputedStyle(root).getPropertyValue(name).trim();
    const match = raw.match(/^url\(["']?(.+?)["']?\)$/);
    if (!match) return;
    decoded.add(name);
    const image = new Image();
    image.decoding = 'async';
    image.src = match[1];
    image.decode?.().catch(() => {});
  };

  const ensureStage = () => {
    if (disposed) return null;
    if (stage && mainEl && mainEl.isConnected && stage.parentElement === mainEl) return stage;
    const main = window.__CODEX_THEME_STUDIO_STATE__?.findMain?.() ?? resolveMain();
    if (!main) return null;
    // Keep native geometry intact; unsupported layouts retain theme paint only.
    if (getComputedStyle(main).position === 'static') return null;
    stage?.remove();
    mainEl = main;
    layerRefs = null;
    ensureStyle();
    if (mainIsolation === null) mainIsolation = main.style.isolation;
    main.style.isolation = 'isolate';
    main.classList.add('mp-stage-parent');
    const node = document.createElement('div');
    node.className = STAGE_CLASS;
    node.dataset.art = appearance === 'night' ? 'night' : 'day';
    node.dataset.mode = current;
    node.dataset.mpActive = 'false';
    node.setAttribute('aria-hidden', 'true');
    node.innerHTML = `<div class="mp-shot"><div class="mp-layer mp-layer-middle"></div><div class="mp-layer mp-layer-red"></div><div class="mp-layer mp-layer-cool"></div><div class="mp-flash"></div><div class="mp-sweep"></div></div>`;
    node.dataset.wallpaperPaused=String(document.hidden);
    node.appendChild(makeHud());
    main.insertBefore(node, main.firstChild);
    stage = node;
    const warm = () => {
      warmTimer = 0;
      if (!stage || disposed || transitioning || stage.dataset.mpActive === 'true') return;
      preload('--mp-fractured-day');
      preload('--mp-fractured-night');
      preload('--mp-red-art');
      // Rasterise the two full-screen photo layers once, at 0.1% opacity, so the
      // first real breach does not pay the texture-upload cost on its first frame.
      stage.dataset.mpWarm = 'true';
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (!stage) return;
        requestAnimationFrame(() => { if (stage) delete stage.dataset.mpWarm; });
      }));
    };
    if (warmTimer) {
      if (warmIdle) (window.cancelIdleCallback || clearTimeout)(warmTimer);
      else clearTimeout(warmTimer);
    }
    if (window.requestIdleCallback) {
      warmIdle = true;
      warmTimer = window.requestIdleCallback(warm, { timeout: 1200 });
    } else {
      warmIdle = false;
      warmTimer = setTimeout(warm, 700);
    }
    return stage;
  };

  const refs = () => {
    if (!layerRefs || !stage) {
      layerRefs = stage ? {
        middle: stage.querySelector('.mp-layer-middle'),
        red: stage.querySelector('.mp-layer-red'),
        cool: stage.querySelector('.mp-layer-cool'),
        flash: stage.querySelector('.mp-flash'),
        sweep: stage.querySelector('.mp-sweep'),
        progress: stage.querySelector('.mp-progress i'),
        shot: stage.querySelector('.mp-shot'),
        layers: [...stage.querySelectorAll('.mp-layer')],
      } : null;
    }
    return layerRefs;
  };

  const timers = new Set();
  const later = (fn, delay) => {
    const timer = setTimeout(() => { timers.delete(timer); if (!disposed) fn(); }, delay);
    timers.add(timer); return timer;
  };

  const clearCpEffects = () => {
    cpMotion?.dispose(); cpMotion = null; cpEffectTimer = 0;
  };
  const startCpEffects = () => {
    clearCpEffects();
    if (document.hidden || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const visible = node => { const s=getComputedStyle(node),r=node.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity)>0&&r.width>4&&r.height>4; };
    const surfaces=[...document.querySelectorAll('.composer-surface-chrome,.message-bubble,.bubble,pre,[role="dialog"],[aria-modal="true"],[role="menu"],[data-radix-popper-content-wrapper]')].filter(visible);
    const marks=[...document.querySelectorAll('.brand-mark,.cts-decoration-icon,.suggestions button,.send-button,main button')].filter(el=>visible(el)&&!el.closest('#codex-theme-studio-switcher'));
    cpMotion=titleMotionFactory({photo:stage?.querySelector('.mp-shot'),surfaces,marks});
    cpMotion.play();
    cpEffectTimer=later(clearCpEffects,3700);
  };

  const updateLabels = () => {
    const isRed = current === 'red', isNight = appearance === 'night';
    const labels = [
      ['.cts-sidebar-widget .cts-decoration-eyebrow', isRed ? 'THE LONG MARCH' : isNight ? 'DEEPSEEK / NIGHT' : 'DEEPSEEK / ONLINE'],
      ['.cts-sidebar-widget .cts-decoration-title', isRed ? '长征协议已接入' : isNight ? '蓝鲸协议 · 夜航' : '蓝鲸协议 · 待命'],
      ['.cts-sidebar-widget .cts-decoration-caption', isRed ? '红色信号 / 临时接管' : isNight ? '深蓝频段 / 低光待命' : '镜面稳定 / 静候信号'],
      ['.cts-corner-card .cts-decoration-title', isRed ? '你看到的我' : '镜面彼端'],
      ['.cts-corner-card .cts-decoration-caption', isRed ? '长征 · LOJI' : '蓝白 / 正常频段'],
      ['.cts-corner-card .cts-decoration-eyebrow', isRed ? 'MIRROR / 02' : 'MIRROR / 01'],
    ];
    for (const [selector, value] of labels) {
      const node = document.querySelector(selector);
      if (node && node.textContent !== value) node.textContent = value;
    }
  };

  const commit = (mode) => {
    current = mode; root.dataset.mirrorMode = mode; root.dataset.mirrorAppearance = appearance;
    if (stage) {
      stage.dataset.mode = mode;
      stage.dataset.art = appearance === 'night' ? 'night' : 'day';
    }
    updateLabels();
    window.dispatchEvent(new CustomEvent('mirror-mode-change', { detail: { mode, automatic, appearance } }));
  };

  const blocked = () => document.hidden || composing || [...document.querySelectorAll('[role="dialog"],[aria-modal="true"],[role="menu"],[data-state="open"][role="listbox"],#codex-theme-studio-switcher .cts-switch-panel:not([hidden])')].some(node => node.getClientRects().length && getComputedStyle(node).visibility !== 'hidden' && Number(getComputedStyle(node).opacity) > 0) || document.activeElement?.matches('input,textarea,[contenteditable="true"],[role="textbox"]');

  const resetLayers = () => {
    anims.forEach((animation) => { try { animation.cancel(); } catch { /* already finished */ } });
    anims = [];
    const currentRefs = refs();
    if (!currentRefs) return;
    // WAAPI fill:both is cancelled above, so the CSS opacity 0 is authoritative.
    // Only the recovery path writes an inline 1 (to cover the still-red base).
    if (currentRefs.red?.style.opacity) currentRefs.red.style.opacity = '';
    currentRefs.progress?.getAnimations().forEach((animation) => animation.cancel());
  };

  const clearLayers = () => {
    resetLayers();
    if (!stage) return;
    stage.dataset.mpActive = 'false';
    delete stage.dataset.mpMode;
  };

  const releaseVisual = () => {
    clearLayers();
    clearCpEffects();
    delete root.dataset.mirrorAnimation;
  };

  const cancelTransition = () => {
    transitionGeneration += 1;
    for (const timer of timers) clearTimeout(timer);
    timers.clear();
    releaseVisual();
    delete root.dataset.mirrorPhase;
    transitioning = false;
  };

  const prepareVisual = (mode) => {
    ensureStyle();
    const node = ensureStage();
    if (!node) return false;
    resetLayers();
    const art = appearance === 'night' ? 'night' : 'day';
    delete node.dataset.mpWarm;
    if (node.dataset.art !== art) node.dataset.art = art;
    if (node.dataset.mpActive !== 'true') node.dataset.mpActive = 'true';
    const stageMode = mode === 'red' ? 'breach' : 'recover';
    if (node.dataset.mpMode !== stageMode) node.dataset.mpMode = stageMode;
    const animation = mode === 'red' ? 'glass-cut' : 'cool-dissolve';
    if (root.dataset.mirrorAnimation !== animation) root.dataset.mirrorAnimation = animation;
    return true;
  };

  const startTransition = (mode) => {
    const currentRefs = refs();
    if (!stage || !currentRefs) return;
    const { middle, red, cool, flash, sweep, shot, bands } = currentRefs;
    const fade = (node, keyframes, options) => {
      if (!node) return null;
      const animation = node.animate(keyframes, options);
      anims.push(animation);
      return animation;
    };
    if (mode === 'red') {
      fade(middle, [{ opacity: 0 }, { opacity: 1 }], { delay: 180, duration: 240, easing: 'ease-out', fill: 'both' });
      fade(red, [{ opacity: 0 }, { opacity: 1 }], { delay: 1720, duration: 760, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'both' });
      // Pixel displacement is generated by the source-contour filter.

    } else {
      const middleStart = Number(getComputedStyle(middle).opacity) || 0;
      red.style.opacity = '1';
      fade(red, [{ opacity: 1 }, { opacity: 0 }], { duration: 1125, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'both' });
      fade(cool, [{ opacity: 0 }, { opacity: 0.5, offset: 0.24 }, { opacity: 0 }], { duration: 900, easing: 'ease-out', fill: 'both' });
      fade(sweep, [{ opacity: 0, transform: 'translate3d(0,-20%,0)' }, { opacity: 0.32, offset: 0.2 }, { opacity: 0, transform: 'translate3d(0,640%,0)' }], { duration: 700, easing: 'ease-out', fill: 'both' });
      if (middleStart > 0.01) fade(middle, [{ opacity: middleStart }, { opacity: 0 }], { duration: 320, fill: 'both' });
    }
    const progress = currentRefs.progress;
    if (progress) {
      progress.getAnimations().forEach((animation) => animation.cancel());
      progress.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: mode === 'red' ? 3600 : 1125, easing: 'linear', fill: 'both' });
    }
  };

  const setMode = (mode, animate = true, isAutomatic = false) => {
    if (disposed || !['blue', 'red'].includes(mode)) return false;
    if (transitioning) {
      if (isAutomatic) return false;
      cancelTransition();
    }
    if (current === mode) { if (!isAutomatic) commit(mode); return true; }
    if (!animate || matchMedia('(prefers-reduced-motion: reduce)').matches) { releaseVisual(); commit(mode); return true; }
    const generation = ++transitionGeneration;
    if (!prepareVisual(mode)) { commit(mode); return true; }
    transitioning = true;
    root.dataset.mirrorPhase = mode === 'red' ? 'breach' : 'recover';
    if(mode==='red')startCpEffects();
    startTransition(mode);
    later(() => {
      if (generation !== transitionGeneration) return;
      // Input or a modal may have appeared during the anticipation phase.
      if (isAutomatic && blocked()) { cancelTransition(); return; }
      commit(mode);
    }, 420);
    later(() => {
      if (generation === transitionGeneration) {
        releaseVisual();
        delete root.dataset.mirrorPhase;
        transitioning = false;
      }
    }, mode === 'red' ? 3800 : 1250);
    return true;
  };

  const tick = () => {
    updateLabels();
    ensureStage();
    if (!automatic || blocked()) return;
    const next = schedule(config, Date.now());
    // Skip an intrusion that was postponed until its final seconds.
    if (next.mode === 'red' && current === 'blue' && next.nextAt - Date.now() < 5000) return;
    setMode(next.mode, true, true);
  };

  const onStart = () => { composing = true; if (automatic && transitioning) cancelTransition(); };
  const onEnd = () => { composing = false; };
  const onVisibility = () => { if(stage)stage.dataset.wallpaperPaused=String(document.hidden);if (!document.hidden) tick(); };
  document.addEventListener('compositionstart', onStart);
  document.addEventListener('compositionend', onEnd);
  document.addEventListener('visibilitychange', onVisibility);
  const interval = setInterval(tick, 1500);

  const api = {
    snapshot: () => ({
      mode: current, automatic, appearance, transitioning,
      schedule: schedule(config, Date.now()), timers: timers.size,
      stage: Boolean(stage), hud: Boolean(stage?.querySelector('.mp-hud')),
      layers: stage ? [...stage.querySelectorAll('.mp-layer')].map((node) => Number(getComputedStyle(node).opacity)) : [],
    }),
    choose(mode) {
      if (!['blue', 'night', 'red'].includes(mode)) return false;
      automatic = false;
      if (mode !== 'red') appearance = mode === 'night' ? 'night' : 'day';
      return setMode(mode === 'night' ? 'blue' : mode);
    },
    toggle() { automatic = false; return setMode(current === 'red' ? 'blue' : 'red'); },
    resume() { automatic = true; commit(current); tick(); },
    preview(mode) { return api.choose(mode); },
    dispose() {
      if (disposed) return;
      disposed = true; clearInterval(interval); cancelTransition();
      if (warmTimer) {
        if (warmIdle) (window.cancelIdleCallback || clearTimeout)(warmTimer);
        else clearTimeout(warmTimer);
        warmTimer = 0;
      }
      document.removeEventListener('compositionstart', onStart);
      document.removeEventListener('compositionend', onEnd);
      document.removeEventListener('visibilitychange', onVisibility);
      delete root.dataset.mirrorMode; delete root.dataset.mirrorPhase; delete root.dataset.mirrorAppearance;
      delete root.dataset.mirrorAnimation;
      root.style.removeProperty('--mp-transition-art');
      stage?.remove(); stage = null;
      if (mainEl) {
        mainEl.classList.remove('mp-stage-parent');
        mainEl.style.isolation = mainIsolation ?? '';
        if (mainEl.dataset.mpPosition) { mainEl.style.position = mainPosition ?? ''; delete mainEl.dataset.mpPosition; }
      }
      mainEl = null;
      document.getElementById(STYLE_ID)?.remove();
      if (window[key] === api) delete window[key];
    },
  };
  api.sampleMotion = time => { cpMotion?.stop(); return cpMotion?.sample(time); };
  window[key] = api;
  const studioState = window.__CODEX_THEME_STUDIO_STATE__;
  if (studioState?.cleanup) {
    studioState.mirrorBaseCleanup ??= studioState.cleanup;
    studioState.cleanup = () => { window[key]?.dispose?.(); return studioState.mirrorBaseCleanup(); };
  }
  commit('blue'); tick();
  return { enabled: true, mode: current };
}
