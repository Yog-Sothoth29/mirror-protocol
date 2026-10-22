import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import vm from 'node:vm';

// Compile the exact renderer verification expression without running the CLI or
// connecting to an application. The fixture includes only geometry and styles.
const source = await fs.readFile(new URL('../../runtime/scripts/runtime.mjs', import.meta.url), 'utf8');
const verifySource = source.slice(source.indexOf('const verifyExpression ='), source.indexOf('async function capture('));
const verifyExpression = vm.runInNewContext(verifySource + '; verifyExpression;');
const auxiliarySource = source.slice(source.indexOf('function isAuxiliaryTarget('), source.indexOf('async function apply('));
const isAuxiliaryTarget = vm.runInNewContext(auxiliarySource + '; isAuxiliaryTarget;', { URL });

function verify({ background = 'none', hasArt = true, smoke = false, auxiliary = false, hasMain = true } = {}) {
  const body = {};
  const rect = { left: 0, top: 0, right: 1440, bottom: 900, width: 1440, height: 900 };
  const native = Array.from({ length: 5 }, () => ({ getBoundingClientRect: () => ({ left: 10, top: 10, right: 40, bottom: 40, width: 30, height: 30 }), closest: () => null }));
  const main = hasMain ? { className: 'outline-none _MainContentSurface_build_2', getBoundingClientRect: () => rect } : null;
  const decorations = { parentElement: body, getAttribute: key => key === 'aria-hidden' ? 'true' : null, querySelectorAll: () => [] };
  const switcher = { parentElement: body, hidden: true, contains: () => false, querySelector: () => ({ getAttribute: () => 'Theme' }) };
  const root = { classList: { contains: () => true }, dataset: { codexThemeStudio: 'fixture', codexThemeStudioVersion: '2.3.3' }, scrollWidth: 1440, clientWidth: 1440 };
  const document = {
    body, documentElement: root,
    getElementById: id => id === 'codex-theme-studio-decorations' ? decorations : id === 'codex-theme-studio-switcher' ? switcher : {},
    querySelector: selector => selector === 'main' ? main : null,
    querySelectorAll: () => native,
  };
  const expression = verifyExpression({ id: 'fixture', version: '2.3.3', hasArt }, smoke, auxiliary);
  return vm.runInNewContext(expression, { document, innerWidth: 1440, innerHeight: 900, getComputedStyle: node => node === decorations ? { pointerEvents: 'none' } : { backgroundImage: background } });
}

test('primary UI with a module class passes only when its background includes artwork', () => {
  const result = verify({ background: 'linear-gradient(red,blue), url("blob:fixture-art")' });
  assert.equal(result.backgroundHasArt, true);
  assert.equal(result.pass, true);
});

test('particle or gradient-only primary UI fails despite installed styles and controls', () => {
  const result = verify({ background: 'linear-gradient(red,blue)' });
  assert.equal(result.installed, true);
  assert.equal(result.stylePresent, true);
  assert.equal(result.backgroundHasArt, false);
  assert.equal(result.pass, false);
});

test('smoke mode cannot waive missing artwork on the primary UI', () => {
  assert.equal(verify({ smoke: true }).pass, false);
});

test('themes intentionally containing no art are allowed', () => {
  assert.equal(verify({ hasArt: false }).pass, true);
});

test('detached empty shells are auxiliary while the index stays primary', () => {
  assert.equal(isAuxiliaryTarget({ url: 'app://-/detached-window.html' }), true);
  assert.equal(isAuxiliaryTarget({ url: 'app://-/detached-window.html?initialRoute=%2Foverlay' }), true);
  assert.equal(isAuxiliaryTarget({ url: 'app://-/index.html' }), false);
  assert.equal(verify({ hasMain: false, smoke: true, auxiliary: true }).pass, true);
  assert.equal(verify({ hasMain: false }).pass, false);
});
