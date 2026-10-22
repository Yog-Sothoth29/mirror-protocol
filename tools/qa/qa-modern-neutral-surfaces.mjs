import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { surfacePalettes, generateSurfaceCss } from '../surface-design.mjs';
import { contrastRatio } from '../../runtime/scripts/theme-core.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.MIRROR_PLAYWRIGHT || 'playwright');
const output = process.env.MIRROR_QA_OUTPUT || await fs.mkdtemp(path.join(os.tmpdir(), 'mp-modern-surfaces-'));
await fs.mkdir(output, { recursive: true });
const scope = 'html.codex-theme-studio-skin';
const css = generateSurfaceCss('blue', scope)
  + generateSurfaceCss('night', scope + '[data-mirror-appearance="night"]:not([data-mirror-mode="red"])')
  + generateSurfaceCss('red', scope + '[data-mirror-mode="red"]');

// This is an isolated, static browser fixture built from observed public UI
// attributes and neutral token names. It contains no user/chat data.
const fixture = `<!doctype html><html class="codex-theme-studio-skin" data-theme="dark" data-mirror-mode="blue" data-mirror-appearance="day"><head><meta charset="utf-8"><style>
:root[data-theme="dark"] {--color-text-prose:#dfdfdf;--user-message-text-color:#dfdfdf;--input-text-color:#dfdfdf;--color-text-emphasis:#dfdfdf;--color-text-primary-ghost:#dfdfdf;--color-text-primary-outline:#dfdfdf;--color-text-primary-soft:#dfdfdf;--color-text-primary-surface:#dfdfdf;--color-background-panel:#232323;--color-background-composer-surface:#363636;--color-background-composer-action-bar:#282828;--color-background-execution-output:#141414;--color-text-execution-output:#dfdfdf;--color-background-primary-solid:#dfdfdf;--color-text-primary-solid:#2d2d2d;--color-text-danger:#ff6764;--color-text-success:#40c977;--color-text-warning:#ff8549;--color-background-danger-solid:#e02e2a;--input-border-color-invalid:#ba2623;}
body{margin:0;padding:20px;font:16px/1.5 sans-serif;background:var(--color-background-surface);color:var(--color-text-primary)}
main{max-width:1000px;margin:auto}.row{display:flex;gap:12px;margin:10px 0}.sample{padding:12px;border:1px solid var(--color-border-primary-outline);border-radius:12px;flex:1}button{padding:12px;border:1px solid var(--color-border-primary-outline)}
.panel{background:var(--color-background-panel)}[data-markdown-text-tone]{color:var(--color-text-prose)}[data-user-message-bubble]{background:var(--user-message-background-color);color:var(--user-message-text-color)}
[data-color=primary][data-variant=ghost]{background:var(--color-background-primary-ghost-hover);color:var(--color-text-primary-ghost)}[data-color=primary][data-variant=outline]{background:var(--color-background-primary-outline-hover);color:var(--color-text-primary-outline)}[data-color=primary][data-variant=soft]{background:var(--color-background-primary-soft);color:var(--color-text-primary-soft)}[data-color=primary][data-variant=surface]{background:var(--color-background-primary-surface);color:var(--color-text-primary-surface)}[data-color=primary][data-variant=solid]{background:var(--color-background-primary-solid);color:var(--color-text-primary-solid)}
[data-execution-output]{background:var(--color-background-execution-output);color:var(--color-text-execution-output)}.composer-outer{background:var(--color-background-composer-surface);padding:12px}[data-composer-body]{background:var(--color-background-composer-surface)}.native-actionbar{background:var(--color-background-composer-action-bar);color:var(--color-text-toolbar-action)}input{padding:10px;background:var(--input-soft-background-color);color:var(--input-text-color);border:1px solid var(--input-outline-border-color)}input::placeholder{color:var(--input-placeholder-text-color)}
.native-send{background:var(--color-background-composer-primary);color:var(--color-text-composer-primary)}[data-native-selected]{background:var(--color-background-segmented-selected);color:var(--color-text-mode-toggle-primary)}[role=menuitem]{color:var(--color-text-primary-ghost)}.danger{color:var(--color-text-danger)}.success{color:var(--color-text-success)}.warning{color:var(--color-text-warning)}.danger-solid{background:var(--color-background-danger-solid)}
</style><style>${css}</style></head><body><main><h1>Mirror Protocol / native neutral surfaces</h1><header data-app-shell-application-menu-bar><div data-app-shell-main-titlebar>Native toolbar</div></header><div class="row"><section class="sample panel"><div data-markdown-text-tone>Assistant prose / readable neutral ink</div><div data-user-message-bubble class="sample">User bubble</div><div data-execution-output class="sample">Execution output</div><button data-native-selected>Selected sidebar row</button></section><section role="menu" class="sample"><button role="menuitem">Menu item</button><p class="danger">Danger semantic</p><p class="success">Success semantic</p><p class="warning">Warning semantic</p><button class="danger-solid">Danger action</button></section></div><div class="row">${['ghost','outline','soft','surface','solid'].map(v=>`<button data-color="primary" data-variant="${v}">${v}</button>`).join('')}</div><div class="composer-outer sample"><div data-composer-body><input value="Input ink"><div class="native-actionbar sample">Native action bar <button class="native-send">Send</button></div></div></div></main></body></html>`;

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const report = { pass: false, modes: [], preservedOfficialTheme: true, fixtureOnly: true };
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  await page.setContent(fixture);
  await page.addStyleTag({ content: '._MainContentTopFade_fixture_2{height:16px;background-image:linear-gradient(rgb(24,24,24),transparent)}[data-thread-scroll-footer] ._fade_fixture_2{height:32px;background-image:linear-gradient(to top,rgb(24,24,24),transparent)}[data-thread-scroll-footer] ._surface_fixture_2{height:40px;background-color:rgb(24,24,24)}.native-sidebar-popover{background:var(--app-shell-sidebar-popover-background);border:1px solid var(--app-shell-sidebar-popover-border);padding:10px}:root[data-theme=dark]{--app-shell-sidebar-popover-background:#2d2d2d;--app-shell-sidebar-popover-border:#42424a}' });
  await page.evaluate(() => {
    const main = document.querySelector('main');
    const top = document.createElement('div'); top.className = '_MainContentTopFade_fixture_2'; main.prepend(top);
    const footer = document.createElement('div'); footer.dataset.threadScrollFooter = ''; footer.innerHTML = '<div class="_fade_fixture_2"></div><div class="_surface_fixture_2">Native footer surface</div>'; main.append(footer);
    const popup = document.createElement('div'); popup.className = 'native-sidebar-popover'; popup.textContent = 'Native sidebar popover'; main.append(popup);
  });
  const rgb = hex => 'rgb(' + [1,3,5].map(i => parseInt(hex.slice(i,i+2),16)).join(', ') + ')';
  const canvases = { blue: '#f4f9ff', night: '#081322', red: '#0b0c14' };
  for (const mode of ['blue','night','red']) {
    await page.evaluate(({ mode, canvas }) => { document.documentElement.dataset.mirrorAppearance = mode === 'night' ? 'night' : 'day'; document.documentElement.dataset.mirrorMode = mode === 'red' ? 'red' : 'blue'; document.documentElement.style.setProperty('--mp-canvas', canvas); }, { mode, canvas: canvases[mode] });
    const p = surfacePalettes[mode];
    const computed = await page.evaluate(() => {
      const style = selector => { const value = getComputedStyle(document.querySelector(selector)); return { color: value.color, background: value.backgroundColor, image: value.backgroundImage, border: value.borderColor }; };
      return { theme: document.documentElement.dataset.theme, prose: style('[data-markdown-text-tone]'), bubble: style('[data-user-message-bubble]'), output: style('[data-execution-output]'), composer: style('.composer-outer'), actionbar: style('.native-actionbar'), input: style('input'), send: style('.native-send'), selected: style('[data-native-selected]'), menu: style('[role=menu]'), menuitem: style('[role=menuitem]'), toolbar: style('header'), topFade: style('._MainContentTopFade_fixture_2'), bottomFade: style('._fade_fixture_2'), footerSurface: style('._surface_fixture_2'), sidebarPopover: style('.native-sidebar-popover'), variants: Object.fromEntries(['ghost','outline','soft','surface','solid'].map(v => [v,style('[data-variant="'+v+'"]')])), danger: style('.danger'), success: style('.success'), warning: style('.warning'), dangerSolid: style('.danger-solid'), invalid: getComputedStyle(document.documentElement).getPropertyValue('--input-border-color-invalid').trim(), overflow: document.documentElement.scrollWidth > innerWidth };
    });
    assert.equal(computed.theme, 'dark');
    for (const sample of [computed.prose,computed.bubble,computed.input,computed.menuitem,computed.selected]) assert.equal(sample.color, rgb(p.ink));
    for (const variant of ['ghost','outline','soft','surface']) assert.equal(computed.variants[variant].color, rgb(p.ink));
    assert.equal(computed.variants.solid.color, rgb(p.accentInk));
    assert.equal(computed.variants.solid.background, rgb(p.accent));
    assert.equal(computed.bubble.background, rgb(p.selected));
    assert.equal(computed.output.background, rgb(p.code));
    assert.equal(computed.output.color, rgb(p.codeInk));
    assert.equal(computed.composer.background, rgb(p.input));
    assert.equal(computed.actionbar.background, rgb(p.toolbar));
    assert.equal(computed.send.color, rgb(p.accentInk));
    assert.equal(computed.send.background, rgb(p.accent));
    assert.ok(computed.toolbar.image.includes('gradient'));
    assert.ok(computed.topFade.image.includes(rgb(canvases[mode])));
    assert.ok(computed.bottomFade.image.includes(rgb(canvases[mode])));
    assert.equal(computed.footerSurface.background, rgb(canvases[mode]));
    assert.equal(computed.sidebarPopover.background, rgb(p.elevated));
    assert.equal(computed.sidebarPopover.border, rgb(p.border));
    assert.equal(computed.danger.color, rgb(p.error));
    assert.equal(computed.success.color, rgb(p.success));
    assert.equal(computed.warning.color, rgb(p.warning));
    assert.equal(computed.dangerSolid.background, 'rgb(224, 46, 42)');
    assert.equal(computed.invalid, '#ba2623');
    assert.equal(computed.overflow, false);
    const checks = [[p.ink,p.panel],[p.ink,p.selected],[p.ink,p.input],[p.muted,p.toolbar],[p.codeInk,p.code],[p.accentInk,p.accent],[p.warning,p.input],[p.success,p.panel],[p.error,p.panel]];
    for (const [fg,bg] of checks) assert.ok(contrastRatio(fg,bg) >= 4.5);
    await page.screenshot({ path: path.join(output, 'modern-neutral-' + mode + '.png') });
    report.modes.push({ mode, computed, minimumContrast: Math.min(...checks.map(([fg,bg])=>contrastRatio(fg,bg))) });
  }
  report.pass = true;
  await fs.writeFile(path.join(output, 'modern-neutral-report.json'), JSON.stringify(report,null,2));
  console.log(JSON.stringify({ pass: true, modes: report.modes.length, officialDataTheme: 'dark (unchanged)', semanticColorsPreserved: true, output }));
} finally { await browser.close(); }
