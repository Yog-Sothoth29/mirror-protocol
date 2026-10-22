// Original implementation informed by Adam Blumert's public process clips.
// No CDPR artwork, video, project files or third-party animation code is embedded.
export function createTitleMotion({ photo, surfaces = [], marks = [], id = 'mp-title-motion' } = {}) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.id = id;
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;pointer-events:none;overflow:hidden';
  const defs = document.createElementNS(ns, 'defs');
  svg.appendChild(defs);
  const node = (tag, attrs, parent) => {
    const el = document.createElementNS(ns, tag);
    for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, String(value));
    parent.appendChild(el);
    return el;
  };
  const filters = [];
  for (const [name, factor] of [['photo', 1], ['surface', .24], ['mark', .16]]) {
    const filter = node('filter', { id: id + '-' + name, x: '-15%', y: '-25%', width: '130%', height: '150%', 'color-interpolation-filters': 'sRGB' }, defs);
    const noise = node('feTurbulence', { type: 'turbulence', baseFrequency: '0 .036', numOctaves: 1, seed: 4, result: 'noise' }, filter);
    const transfer = node('feComponentTransfer', { in: 'noise', result: 'map' }, filter);
    node('feFuncR', { type: 'discrete', tableValues: '0 .2 .2 .5 .5 .5 .8 1' }, transfer);
    node('feFuncG', { type: 'linear', slope: 0, intercept: .5 }, transfer);
    const warp = node('feDisplacementMap', { in: 'SourceGraphic', in2: 'map', scale: 0, xChannelSelector: 'R', yChannelSelector: 'G', result: 'displaced' }, filter);
    // Extract real image/text edges. Trails follow the source contours instead
    // of placing decorative, evenly spaced scanlines over an intact picture.
    node('feConvolveMatrix', { in: 'displaced', order: 3, kernelMatrix: '-1 -1 -1 -1 8 -1 -1 -1 -1', divisor: 1, bias: 0, edgeMode: 'duplicate', result: 'edge' }, filter);
    node('feColorMatrix', { in: 'edge', type: 'matrix', values: '0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 .055 .055 .055 0 0', result: 'edgeAlpha' }, filter);
    node('feFlood', { 'flood-color': '#9ae2da', result: 'cyan' }, filter);
    node('feComposite', { in: 'cyan', in2: 'edgeAlpha', operator: 'in', result: 'contour' }, filter);
    const offsets = [];
    for (let i = 0; i < 3; i++) offsets.push(node('feOffset', { in: 'contour', dx: 0, dy: 0, result: 'trail' + i }, filter));
    const merge = node('feMerge', {}, filter);
    node('feMergeNode', { in: 'displaced' }, merge);
    for (let i = 2; i >= 0; i--) node('feMergeNode', { in: 'trail' + i }, merge);
    // Output is a source image plus contour trails; no full-screen flash layer.
    filters.push({ name, factor, noise, warp, offsets });
  }
  document.body.appendChild(svg);
  const originalTransform = photo?.style.getPropertyValue('transform') || '';
  const originalTransformPriority = photo?.style.getPropertyPriority('transform') || '';
  const stripes = document.createElement('div');
  stripes.className = 'mp-title-stripes';
  stripes.setAttribute('aria-hidden', 'true');
  stripes.style.cssText = 'position:absolute;inset:0;pointer-events:none;opacity:0;background:linear-gradient(90deg,transparent 5%,#9ae2da99 5% 21%,transparent 21%) 0 19%/100% 1px no-repeat,linear-gradient(90deg,transparent 19%,#e4ce7899 19% 36%,transparent 36%) 0 43%/100% 1px no-repeat,linear-gradient(90deg,transparent 9%,#9ae2da99 9% 31%,transparent 31%) 0 74%/100% 2px no-repeat';
  photo?.appendChild(stripes);
  const records = [];
  const attach = (el, name) => {
    if (!el || records.some(r => r.el === el)) return;
    records.push({ el, name, value: el.style.getPropertyValue('filter'), priority: el.style.getPropertyPriority('filter') });
  };
  attach(photo, 'photo');
  surfaces.forEach(el => attach(el, 'surface'));
  marks.forEach(el => attach(el, 'mark'));
  // Short unequal impulses, each followed by a genuinely clean locked frame.
  const beats = [
    [1280, 1360, -34, 5], [1440, 1560, 54, 12],
    [1650, 1750, -46, 9], [1830, 1930, 32, 6],
    [2040, 2120, -24, 4], [2230, 2290, 14, 2],
  ];
  let active = false, disposed = false, raf = 0, startedAt = 0, lastFrame = -1;
  function sample(time) {
    if (disposed) return null;
    const beat = beats.find(b => time >= b[0] && time < b[1]);
    const index = beat ? beats.indexOf(beat) : -1;
    const frame = Math.floor(time / 40);
    const phase = beat ? Math.floor((time - beat[0]) / 40) : 0;
    const decay = [1, -.48, .22][Math.min(2, phase)];
    const amount = beat ? beat[2] * decay : 0;
    const impact = [[180,0],[240,-2],[315,1.6],[400,-.8],[500,.4],[620,0]];
    let recoil = 0;
    for (let i=0;i<impact.length-1;i++) {
      const a=impact[i],b=impact[i+1];
      if(time>=a[0]&&time<b[0]) {const u=(time-a[0])/(b[0]-a[0]),ease=u*u*(3-2*u);recoil=a[1]+(b[1]-a[1])*ease;break;}
    }
    if(photo) {
      if(Math.abs(recoil)>.001)photo.style.setProperty('transform','translate3d('+recoil.toFixed(2)+'px,0,0)');
      else if(originalTransform)photo.style.setProperty('transform',originalTransform,originalTransformPriority);
      else photo.style.removeProperty('transform');
    }
    stripes.style.opacity=beat?'.46':time>=220&&time<520?'.18':'0';
    if (active !== Boolean(beat)) {
      active = Boolean(beat);
      for (const r of records) {
        if (active) r.el.style.setProperty('filter', 'url(#' + id + '-' + r.name + ')', 'important');
        else if (r.value) r.el.style.setProperty('filter', r.value, r.priority);
        else r.el.style.removeProperty('filter');
      }
    }
    if (frame !== lastFrame) {
      lastFrame = frame;
      for (const f of filters) {
        f.noise.setAttribute('seed', String(7 + index * 11 + phase * 3));
        f.noise.setAttribute('baseFrequency', '0 ' + (.003 + Math.max(0, index) * .0008).toFixed(4));
        f.warp.setAttribute('scale', (amount * f.factor).toFixed(2));
        for (let i = 0; i < 3; i++) {
          const fraction = (i + 1) / 3;
          f.offsets[i].setAttribute('dx', (amount * .7 * f.factor * fraction).toFixed(2));
          f.offsets[i].setAttribute('dy', (beat ? -beat[3] * f.factor * fraction * Math.abs(decay) : 0).toFixed(2));
        }
      }
    }
    const state = { time, active, beat: index, amount, phase, recoil, stripes: Number(stripes.style.opacity), source: 'contour-displacement', wholeFrameFlash: false };
    svg.dataset.frame = JSON.stringify(state);
    return state;
  }
  function stop() { cancelAnimationFrame(raf); raf = 0; }
  function play() {
    stop(); startedAt = performance.now();
    const tick = now => { sample(now - startedAt); if (now - startedAt < 3600 && !disposed) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
  }
  function dispose() {
    if (disposed) return;
    stop(); sample(3600); disposed = true;
    stripes.remove();
    svg.remove();
  }
  return { sample, play, stop, dispose, beats };
}
