// Browser-side helpers contain no app data and never modify the renderer.
export function visibleMain() {
  const shown = node => {
    if (!node) return false;
    for (let parent = node; parent; parent = parent.parentElement) {
      const style = getComputedStyle(parent);
      if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse' || Number(style.opacity) === 0) return false;
    }
    const rect = node.getBoundingClientRect();
    return rect.width > 100 && rect.height > 100 && rect.right > 0 && rect.bottom > 0;
  };
  return [...document.querySelectorAll('main.main-surface,main,[role="main"]')].filter(shown)
    .sort((a, b) => Number(b.matches('main.main-surface,main[class*="_MainContentSurface_"]')) - Number(a.matches('main.main-surface,main[class*="_MainContentSurface_"]')))[0] ?? null;
}

export function isAuxiliaryTarget(target) {
  try {
    const url = new URL(target.url);
    const route = url.searchParams.get('initialRoute') ?? '';
    return url.pathname === '/detached-window.html' || route === '/hotkey-window' || route === '/avatar-overlay' || route.startsWith('/overlay') || route.startsWith('/diagnostic');
  } catch { return true; }
}

export const readinessExpression = `(() => {
  const main = (${visibleMain.toString()})();
  return { ready: document.readyState !== 'loading' && Boolean(main && document.querySelector('button,[contenteditable="true"],textarea')), mainFound: Boolean(main) };
})()`;
