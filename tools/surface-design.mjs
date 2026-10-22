// Original Mirror Protocol surface system. References and decisions: FRONTEND-STYLE-RESEARCH.md.
// Paint only: no native geometry, nodes, hit targets, or transition timing changes.
export const surfacePalettes = {
  blue: {
    sidebar:'#e8eef9', sidebarEnd:'#f2f6fe', panel:'#ffffff', elevated:'#fcfdff',
    input:'#f8faff', inputEnd:'#edf2fd', toolbar:'#e6edf9', border:'#afbed8',
    subtle:'#cbd5e8', accent:'#326cb2', support:'#7762a6', ink:'#20334c', muted:'#52627e',
    selected:'#dce8fa', selectedEnd:'#e9e4f7', hover:'#e2eaf7', accentInk:'#ffffff',
    code:'#edf1fa', codeInk:'#263653', keyword:'#7650a4', string:'#246c63',
    number:'#935627', comment:'#596985', codeBorder:'#bac9e1',
    success:'#27714d', successBg:'#e2f2e9', warning:'#815c19', warningBg:'#fbefd2',
    error:'#ad405c', errorBg:'#fae6ed', sheen:'#ffffff', shadow:'#334a7c1c',
  },
  night: {
    sidebar:'#0e192d', sidebarEnd:'#172038', panel:'#15243b', elevated:'#202d49',
    input:'#1b2c48', inputEnd:'#111e34', toolbar:'#26334e', border:'#52698c',
    subtle:'#354967', accent:'#83c9ff', support:'#b3a1e7', ink:'#e4efff', muted:'#a6b6cf',
    selected:'#263f60', selectedEnd:'#353451', hover:'#26344f', accentInk:'#0b2035',
    code:'#0b1425', codeInk:'#d4e2fa', keyword:'#c6aff2', string:'#91d6bc',
    number:'#edbc87', comment:'#8fa1bc', codeBorder:'#344866',
    success:'#91d6b4', successBg:'#17382f', warning:'#e7c182', warningBg:'#3b3020',
    error:'#f4a0b2', errorBg:'#3d2438', sheen:'#a8d5ff', shadow:'#00000055',
  },
  red: {
    sidebar:'#111017', sidebarEnd:'#1e151e', panel:'#201b25', elevated:'#302530',
    input:'#2b202c', inputEnd:'#17151e', toolbar:'#352531', border:'#795260',
    subtle:'#48333e', accent:'#fb7185', support:'#a7b8d2', ink:'#f1eff5', muted:'#c2afc0',
    selected:'#512738', selectedEnd:'#332636', hover:'#38222d', accentInk:'#260e18',
    code:'#100f18', codeInk:'#e6dfe9', keyword:'#d3ace7', string:'#a4d7c5',
    number:'#edc395', comment:'#b09eaf', codeBorder:'#533a4a',
    success:'#a2d4bc', successBg:'#21362e', warning:'#edc691', warningBg:'#403021',
    error:'#ff9eae', errorBg:'#462335', sheen:'#fbcad3', shadow:'#00000066',
  },
};

// Codex 26.1016 uses separate neutral component tokens even when its official
// data-theme remains dark. Bridge paint tokens without changing settings.
// Semantic fills/variants stay native; basic status text keeps its palette hue.
function modernNeutralTokens(p) {
  const values = {};
  const set = (names, value) => { for (const name of names.split(/\s+/).filter(Boolean)) values[name] = value; };
  set(`--color-text-primary --color-text-foreground --color-text-prose --color-text-emphasis
    --color-text-user-message --user-message-text-color --input-text-color
    --color-text-button-outline --color-text-mode-toggle-primary
    --color-text-activity-control-active`, p.ink);
  set(`--color-text-secondary --color-text-tertiary --color-text-disabled
    --color-text-toolbar-action --color-text-mode-toggle-inactive
    --color-text-activity-control --input-placeholder-text-color`, p.muted);
  for (const variant of ['ghost','ghost-hover','outline','outline-hover','soft','soft-alt','surface']) {
    set(`--color-text-primary-${variant}`, p.ink);
    set(`--color-text-secondary-${variant}`, variant.endsWith('hover') ? p.ink : p.muted);
  }
  set('--color-text-primary-solid --color-text-composer-primary --color-text-accent-action --color-text-inverse', p.accentInk);
  set('--color-text-secondary-solid', p.ink);
  set('--color-text-composer-reference --color-text-mode-toggle-accent --color-text-connected', p.accent);
  set('--color-text-execution-output --color-text-execution-traceback', p.codeInk);
  set('--color-text-execution-output-label', p.muted);
  // Keep the green/amber/red meaning while making basic status text readable
  // on this mode's neutral surfaces. Solid actions and semantic fills stay native.
  set('--color-text-success', p.success);
  set('--color-text-warning', p.warning);
  set('--color-text-danger', p.error);
  set('--color-text-tooltip --color-text-tooltip-classic --color-text-tooltip-shortcut', p.ink);
  set('--color-text-tooltip-secondary --color-text-tooltip-tertiary --color-text-tooltip-description', p.muted);

  set('--color-background-surface --color-background-surface-primary', `var(--mp-canvas,${p.panel})`);
  set('--color-background-surface-under', p.sidebar);
  set('--color-background-surface-secondary --color-background-panel --color-background-elevated-secondary', p.panel);
  set('--color-background-elevated-primary --color-background-control-opaque --color-background-page-search --color-background-viewer-control', p.elevated);
  set('--color-background-composer-surface --color-background-activity-input --input-soft-background-color', p.input);
  set('--color-background-composer-action-bar --color-background-activity-control', p.toolbar);
  set('--color-background-composer-primary --color-background-accent-action', p.accent);
  set('--color-background-execution-output --color-background-execution-traceback --color-background-artifact-preview', p.code);
  set('--color-background-user-message --color-background-other-user-message --user-message-background-color', p.selected);
  set('--color-background-user-message-compact --color-background-message-reaction', p.inputEnd);
  set('--color-background-tooltip --color-background-tooltip-classic --color-background-callout-surface', p.elevated);
  set('--color-background-tooltip-shortcut --color-background-mode-toggle-track --color-background-segmented-form-track --color-background-disabled', p.toolbar);
  set('--color-background-mode-toggle-selected --color-background-segmented-form-selected --color-background-segmented-selected --color-background-text-selection --color-background-attribution-highlight', p.selected);
  set('--color-background-button-outline-hover --color-background-home-suggestion-hover --color-background-segmented-selected-hover --color-background-activity-control-hover --color-background-activity-stop-hover', p.hover);
  for (const family of ['primary','secondary']) {
    for (const suffix of ['ghost-hover','ghost-focus','outline-hover','soft-hover','soft-alpha-hover']) set(`--color-background-${family}-${suffix}`, p.hover);
    for (const suffix of ['ghost-active','outline-active','soft-active','soft-alpha-active']) set(`--color-background-${family}-${suffix}`, p.selected);
    set(`--color-background-${family}-soft`, p.input);
    set(`--color-background-${family}-soft-alpha --color-background-${family}-soft-alt`, p.toolbar);
    set(`--color-background-${family}-surface`, p.panel);
    for (const suffix of ['solid','solid-hover','solid-active']) set(`--color-background-${family}-${suffix}`, family === 'primary' ? p.accent : p.toolbar);
    set(`--color-border-${family}-outline`, p.border);
    set(`--color-border-${family}-outline-hover`, p.accent);
    set(`--color-border-${family}-soft-alt --color-border-${family}-surface`, p.subtle);
  }
  set('--color-border --color-border-strong --color-border-overlay --color-border-button-outline --input-outline-border-color', p.border);
  set('--color-border-secondary --color-border-subtle --color-border-disabled --color-border-tooltip --color-border-tooltip-classic --color-border-mode-toggle-selected --button-surface-border-color', p.subtle);
  set('--color-border-focus --input-outline-border-color-focus --input-outline-border-color-hover --input-soft-border-color-focus', p.accent);
  set('--button-surface-shadow', `0 2px 8px ${p.shadow}`);
  set('--app-shell-sidebar-popover-background', p.elevated);
  set('--app-shell-sidebar-popover-border', p.border);
  return Object.entries(values).map(([name,value]) => `${name}:${value}!important;`).join('\n ');
}

export function generateSurfaceCss(mode, scope) {
  const p=surfacePalettes[mode], red=mode==='red', light=mode==='blue';
  const tokens=Object.entries(p).map(([key,value])=>`--mp-ui-${key.replace(/[A-Z]/g,c=>'-'+c.toLowerCase())}:${value};`).join('');
  return `
/* Mirror Protocol 2.1: independent canvas, navigation, content, input, overlay and code surfaces. */
${scope} {
 ${tokens}
 ${modernNeutralTokens(p)}
 --mp-panel:${p.panel};--mp-muted:${p.muted};--mp-border:${p.border};--mp-support:${p.support};
 --color-token-side-bar-background:${p.sidebar}!important;
 --color-token-input-background:${p.input}!important;
 --color-token-input-border:${p.border}!important;
 --color-token-editor-background:${p.code}!important;
 --color-token-list-hover-background:${p.hover}!important;
 --color-token-list-selected-background:${p.selected}!important;
 --color-background-elevated-primary:${p.elevated}!important;
 --color-background-elevated-secondary:${p.panel}!important;
 --color-text-secondary:${p.muted}!important;--color-text-tertiary:${p.muted}!important;
 --color-token-description-foreground:${p.muted}!important;
 --color-border:${p.border}!important;--color-border-secondary:${p.subtle}!important;
 --color-success:${p.success};--color-warning:${p.warning};--color-error:${p.error};
 --color-token-diff-added-background:${p.successBg};--color-token-diff-removed-background:${p.errorBg};
 --color-token-terminal-background:${p.code};--color-token-terminal-foreground:${p.codeInk};
 --color-token-terminal-ansi-green:${p.success};--color-token-terminal-ansi-yellow:${p.warning};
 --color-token-terminal-ansi-red:${p.error};--color-token-terminal-ansi-blue:${p.accent};
 --color-token-terminal-ansi-magenta:${p.support};
 --shiki-light-bg:${p.code};--shiki-dark-bg:${p.code};
 --shiki-light:${p.codeInk};--shiki-dark:${p.codeInk};
}
${scope} aside.app-shell-left-panel {
 background:radial-gradient(ellipse at 0% 0%,${p.support}15,transparent 60%),linear-gradient(165deg,${p.sidebar},${p.sidebarEnd})!important;
 border-color:${p.subtle}!important;box-shadow:inset -1px 0 ${p.sheen}${light?'aa':'0c'}!important;
}
${scope} :is(header.appbar,[data-app-shell-tabs="true"],header[data-app-shell-application-menu-bar],[data-app-shell-main-titlebar]) {
 background:linear-gradient(90deg,${p.sidebar}${light?'e8':'e8'},${p.panel}${light?'a0':'cc'})!important;
 border-color:${p.subtle}!important;
}
/* The current native fades contain dark paint outside the main background.
   Replace only their paint, preserving native geometry and hit behavior. */
${scope} main [class*="_MainContentTopFade_"] {
 background-image:linear-gradient(to bottom,var(--mp-canvas,${p.panel}),transparent)!important;
}
${scope} [data-thread-scroll-footer] [class*="_fade_"] {
 background-image:linear-gradient(to top,var(--mp-canvas,${p.panel}) 0%,transparent 100%)!important;
}
${scope} [data-thread-scroll-footer] [class*="_surface_"] {
 background-color:var(--mp-canvas,${p.panel})!important;
}
${scope} aside :is(button,a):hover,${scope} [role="menuitem"]:hover {
 background-color:${p.hover}!important;color:${p.ink}!important;
}
${scope} [aria-current="page"],${scope} button[aria-pressed="true"] {
 background:linear-gradient(110deg,${p.selected},${p.selectedEnd})!important;
 color:${p.ink}!important;box-shadow:inset 2px 0 ${p.accent}!important;
}
${scope} .composer-surface-chrome {
 background:radial-gradient(ellipse at 0% 0%,${p.support}${light?'0b':'14'},transparent 65%),linear-gradient(145deg,${p.input},${p.inputEnd})!important;
 border-color:${p.border}!important;
 box-shadow:0 14px 38px ${p.shadow},inset 0 1px ${p.sheen}${light?'ff':'35'},inset 0 -1px ${p.sheen}${light?'90':'09'}!important;
}
${scope} .composer-surface-chrome:focus-within {
 border-color:${p.accent}!important;box-shadow:0 0 0 3px ${p.accent}1c,0 16px 42px ${p.shadow},inset 0 1px ${p.sheen}55!important;
}
${scope} .composer-toolbar {background:linear-gradient(90deg,${p.toolbar}bb,${p.toolbar}00)!important;}
${scope} .send-button {
 background:linear-gradient(145deg,${p.accent},${light?'#4b66b3':red?'#df526e':'#b1baff'})!important;
 color:${p.accentInk}!important;box-shadow:inset 0 1px ${p.sheen}66,0 3px 9px ${p.accent}33!important;
}
${scope} :is([role="dialog"],[aria-modal="true"],[role="menu"],[data-radix-popper-content-wrapper]) {
 background:linear-gradient(145deg,${p.elevated},${p.panel})!important;
 color:${p.ink}!important;border-color:${p.border}!important;
 box-shadow:0 22px 64px ${p.shadow},inset 0 1px ${p.sheen}25!important;
}
${scope} :is(pre,pre code) {
 background-color:${p.code}!important;color:${p.codeInk}!important;border-color:${p.codeBorder}!important;
 --color-token-editor-background:${p.code};
}
${scope} pre {background-image:linear-gradient(110deg,${p.support}0b,transparent 70%)!important;box-shadow:inset 0 1px ${p.sheen}12!important;}
${scope} :not(pre)>code {background-color:${p.toolbar}!important;color:${p.support}!important;}
${scope} pre :is(.token.keyword,.hljs-keyword,[data-syntax="keyword"]) {color:${p.keyword}!important;}
${scope} pre :is(.token.string,.hljs-string,[data-syntax="string"]) {color:${p.string}!important;}
${scope} pre :is(.token.number,.hljs-number,[data-syntax="number"]) {color:${p.number}!important;}
${scope} pre :is(.token.comment,.hljs-comment,[data-syntax="comment"]) {color:${p.comment}!important;}
${scope} .diff-add {color:${p.success}!important;background-color:${p.successBg}!important;}
${scope} .diff-remove {color:${p.error}!important;background-color:${p.errorBg}!important;}
${scope} [data-status="success"] {color:${p.success}!important;background-color:${p.successBg}!important;}
${scope} [data-status="warning"] {color:${p.warning}!important;background-color:${p.warningBg}!important;}
${scope} [data-status="error"] {color:${p.error}!important;background-color:${p.errorBg}!important;}
${scope} :is(.suggestion,.new-chat) {
 background:linear-gradient(145deg,${p.panel}${light?'f5':'ee'},${p.inputEnd}${light?'ee':'ee'})!important;
 border-color:${p.subtle}!important;box-shadow:inset 0 1px ${p.sheen}1a!important;
}
${scope} .suggestion:hover {border-color:${p.accent}!important;background-color:${p.hover}!important;}
${scope} .suggestion b {color:${p.support}!important;}
${scope} .markdown {background:linear-gradient(145deg,${p.panel},${p.inputEnd})!important;border-color:${p.subtle}!important;}
${scope} .cts-decoration-card {
 background:linear-gradient(145deg,${p.elevated},${p.sidebarEnd})!important;border-color:${p.border}!important;
 box-shadow:0 10px 28px ${p.shadow},inset 2px 0 ${p.accent},inset 0 1px ${p.sheen}22!important;
}
${scope} .cts-decoration-card::after {background:none!important;}
${scope} .mp-stage .mp-scan {opacity:0!important;}
${scope} .mp-stage .mp-grid {opacity:.18!important;}
${scope} .mp-stage .mp-cross {opacity:.15!important;}
${scope} .mp-stage .mp-rings {opacity:.22!important;}
${scope} #codex-theme-studio-decorations {
 background-image:radial-gradient(120% 92% at 50% 46%,transparent 52%,${light?'#10263f08':'#00000033'} 100%)!important;
 box-shadow:inset 0 0 0 1px ${p.accent}14!important;
}
${scope} ::selection {background:${p.selected};color:${p.ink};}
${scope} :is(button,[role="button"],a):focus-visible {outline-color:${p.accent}!important;}
${scope} button:disabled {color:${p.muted}!important;box-shadow:none!important;}
`;
}
