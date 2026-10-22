(async (control) => {
  const ID = "codex-theme-studio-switcher";
  const STYLE_ID = `${ID}-style`;
  const STATE_KEY = "__CODEX_THEME_STUDIO_SWITCHER_STATE__";
  window[STATE_KEY]?.cleanup?.();
  if (!control?.bridge || !document.body) return false;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
#${ID}{position:fixed;left:0;top:0;z-index:2147483000;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#f4f7fb;pointer-events:auto}
#${ID}[hidden],#${ID} [hidden]{display:none!important}
#${ID} .cts-switch-button{width:38px;height:38px;padding:0;border:1px solid #ffffff2b;border-radius:12px;background:#0b111ce8;color:#f5f8fc;box-shadow:0 12px 34px #0008;cursor:pointer;font-size:17px;line-height:1}
#${ID} .cts-switch-button:hover,#${ID} .cts-switch-button:focus-visible{border-color:#72e6ff99;background:#122335;outline:2px solid #72e6ff66;outline-offset:2px}
#${ID} .cts-switch-panel{position:absolute;right:0;bottom:46px;width:244px;padding:10px;border:1px solid #ffffff24;border-radius:15px;background:#08111df5;box-shadow:0 22px 64px #000c}
#${ID}[data-panel-below="true"] .cts-switch-panel{top:46px;bottom:auto}
#${ID}[data-align="left"] .cts-switch-panel{left:0;right:auto}
#${ID} .cts-switch-title{display:flex;align-items:center;justify-content:space-between;padding:3px 6px 9px;color:#96a7ba;font-size:10px;font-weight:750;letter-spacing:.12em}
#${ID} .cts-switch-list{display:grid;gap:4px;max-height:260px;overflow:auto}
#${ID} .cts-switch-item,#${ID} .cts-switch-action{width:100%;padding:8px 10px;border:0;border-radius:9px;background:transparent;color:#edf4f8;text-align:left;cursor:pointer;font-size:12px}
#${ID} .cts-switch-item:hover,#${ID} .cts-switch-item[aria-current="true"],#${ID} .cts-switch-item[aria-pressed="true"],#${ID} .cts-switch-action:hover{background:#72e6ff18}
#${ID} .cts-switch-item[aria-current="true"],#${ID} .cts-switch-item[aria-pressed="true"]{color:#8eeaff;font-weight:700}
#${ID} .cts-switch-footer{display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-top:7px;padding-top:7px;border-top:1px solid #ffffff16}
#${ID} .cts-switch-action{color:#b9c7d6;text-align:center}.cts-switch-error{padding:7px;color:#ffabab;font-size:11px}
#${ID}[data-mirror] .cts-switch-button{border-radius:50%;color:var(--mp-accent,#2380bc);background:var(--mp-panel,#eff8ff);border-color:currentColor;box-shadow:0 0 0 3px color-mix(in srgb,currentColor,transparent 90%),0 5px 20px #0003;position:relative;font-size:19px;transition:color 2.6s ease,background-color 2.6s ease,box-shadow 2.6s ease}
#${ID}[data-mirror] .cts-switch-button::before{content:"";position:absolute;inset:3px;border:1px dashed currentColor;border-radius:50%;opacity:.4;pointer-events:none}
#${ID}[data-mirror] .cts-switch-button::after{content:"";position:absolute;inset:-4px;border:1px solid currentColor;border-radius:50%;opacity:.12;pointer-events:none}
#${ID} .cts-mirror-symbol{position:absolute;inset:7px;background:var(--mp-blue-mark) center/contain no-repeat;pointer-events:none;transition:opacity 360ms linear}
#${ID}[data-mirror-base=night] .cts-mirror-blue{background-image:var(--mp-night-mark)}
#${ID} .cts-mirror-red{background-image:var(--mp-red-mark);opacity:0}
#${ID}[data-mirror=red] .cts-mirror-blue{opacity:0}
#${ID}[data-mirror=red] .cts-mirror-red{opacity:1}
#${ID}[data-mirror=red] .cts-switch-button{box-shadow:0 0 0 3px #ff385314,0 0 20px #ff385333}
html[data-mirror-phase=breach] #${ID} .cts-mirror-symbol{transition-delay:0s}
@media(prefers-reduced-motion:reduce){#${ID}[data-mirror] .cts-switch-button,#${ID} .cts-mirror-symbol{transition:none!important}}
#${ID}[data-mirror] .cts-switch-panel{background:linear-gradient(145deg,var(--mp-ui-elevated,var(--mp-panel)),var(--mp-panel));color:var(--mp-ink);border-color:var(--mp-border);box-shadow:0 22px 64px var(--mp-ui-shadow,#0008),inset 0 1px color-mix(in srgb,var(--mp-ui-sheen,#fff) 18%,transparent)}
#${ID}[data-mirror] .cts-switch-title,#${ID}[data-mirror] .cts-switch-action{color:var(--mp-muted)}
#${ID}[data-mirror] .cts-switch-item{color:var(--mp-ink)}
#${ID}[data-mirror] .cts-switch-item:hover,#${ID}[data-mirror] .cts-switch-item[aria-current=true],#${ID}[data-mirror] .cts-switch-item[aria-pressed=true],#${ID}[data-mirror] .cts-switch-action:hover{background:var(--mp-ui-selected,color-mix(in srgb,var(--mp-accent),transparent 90%));color:var(--mp-ink)}
`;
  (document.head || document.documentElement).appendChild(style);
  const root = document.createElement("div");
  root.id = ID;
  root.hidden = true;
  const button = document.createElement("button");
  button.type = "button"; button.className = "cts-switch-button"; button.textContent = "◐";
  button.setAttribute("aria-label", "切换 Codex 主题 / Switch Codex theme"); button.setAttribute("aria-expanded", "false");
  const panel = document.createElement("div"); panel.className = "cts-switch-panel"; panel.hidden = true;
  const title = document.createElement("div"); title.className = "cts-switch-title";
  const titleText = document.createElement("span"); titleText.textContent = "CODEX THEMES";
  const current = document.createElement("span"); current.textContent = "—"; title.append(titleText, current);
  const list = document.createElement("div"); list.className = "cts-switch-list";
  const footer = document.createElement("div"); footer.className = "cts-switch-footer";
  const nativeButton = document.createElement("button"); nativeButton.type = "button"; nativeButton.className = "cts-switch-action"; nativeButton.textContent = "原生外观";
  const webButton = document.createElement("button"); webButton.type = "button"; webButton.className = "cts-switch-action"; webButton.textContent = "主题库 ↗";
  footer.append(nativeButton, webButton); panel.append(title, list, footer); root.append(button, panel); document.body.appendChild(root);

  const requests = [];
  const pending = new Map();
  let nextRequestId = 1;
  const request = (route, body) => new Promise((resolve, reject) => {
    const id = nextRequestId++;
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error("Theme manager did not respond"));
    }, 20000);
    pending.set(id, { resolve, reject, timer });
    requests.push({ id, route, body: body ?? null });
  });
  const deliver = (id, result, error) => {
    const entry = pending.get(id);
    if (!entry) return false;
    pending.delete(id); clearTimeout(entry.timer);
    if (error) entry.reject(new Error(error)); else entry.resolve(result);
    return true;
  };
  const showError = (error) => { list.replaceChildren(); const node = document.createElement("div"); node.className = "cts-switch-error"; node.textContent = error.message; list.append(node); };
  const mirrorId = () => document.documentElement.dataset.codexThemeStudio;
  let deepseekTheme='deepseek-blue';
  const setMirrorSymbol=active=>{
    if(!active){if(button.querySelector('.cts-mirror-symbol'))button.textContent='◐';return;}
    if(button.querySelector('.cts-mirror-symbol'))return;
    const blue=document.createElement('span'),red=document.createElement('span');blue.className='cts-mirror-symbol cts-mirror-blue';red.className='cts-mirror-symbol cts-mirror-red';blue.setAttribute('aria-hidden','true');red.setAttribute('aria-hidden','true');button.replaceChildren(blue,red);
  };
  const updateMirrorButton = () => {
    const api = window.__MIRROR_PROTOCOL__;
    const id = mirrorId();
    const active = Boolean(api || ['mirror-protocol-auto','deepseek-blue','deepseek-night','longmarch-black'].includes(id));
    if(['deepseek-blue','deepseek-night'].includes(id))deepseekTheme=id;
    const heading=active?'MIRROR / CONTROL':'CODEX THEMES';if(titleText.textContent!==heading)titleText.textContent=heading;
    if (!active) { delete root.dataset.mirror;delete root.dataset.mirrorBase;setMirrorSymbol(false); button.title='切换 Codex 主题'; button.setAttribute('aria-label','切换 Codex 主题 / Switch Codex theme'); return; }
    const state=api?.snapshot();
    const mode=state?(state.mode==='red'?'red':state.appearance==='night'?'night':'blue'):(id==='longmarch-black'?'red':id==='deepseek-night'?'night':'blue');
    root.dataset.mirror=mode;root.dataset.mirrorBase=state?(state.appearance==='night'?'night':'day'):(deepseekTheme==='deepseek-night'?'night':'day');setMirrorSymbol(true);
    button.title=`镜面切换 · ${state?.automatic?'自动频段':'手动锁定'} · 点击切换${mode==='red'?(state?.appearance==='night'?'DeepSeek 夜间':'DeepSeek 日间'):'黑红'}；右键、Shift+点击或 ↓ 选择 DeepSeek 日间 / 夜间与自动模式`;
    button.setAttribute('aria-label',`镜面切换：当前${mode==='red'?'黑红':mode==='night'?'深蓝夜间':'蓝白'}，切换为${mode==='red'?(state?.appearance==='night'?'深蓝夜间':'DeepSeek 日间'):'黑红'}；右键、Shift+点击或向下键选择日间和夜间`);
  };
  const render = async () => {
    try {
      const data = await request("themes"); list.replaceChildren();
      const state=window.__MIRROR_PROTOCOL__?.snapshot();
      current.textContent=root.dataset.mirror?(state?.automatic?'AUTO':root.dataset.mirror==='red'?'RED / LOCK':root.dataset.mirror==='night'?'NIGHT / LOCK':'BLUE / LOCK'):(data.activeTheme || "NATIVE");
      if(window.__MIRROR_PROTOCOL__ || ['mirror-protocol-auto','deepseek-blue','deepseek-night','longmarch-black'].includes(mirrorId())) {
        const baseMode=state?(state.appearance==='night'?'night':'blue'):(mirrorId()==='deepseek-night'?'night':mirrorId()==='deepseek-blue'?'blue':null);
        for (const [mode,label] of [['blue','☀ DeepSeek 日间'],['night','☾ DeepSeek 夜间']]) {
          const appearance=document.createElement('button');appearance.type='button';appearance.className='cts-switch-item';appearance.textContent=label;
          appearance.setAttribute('aria-pressed',String(mode===baseMode));
          appearance.title=`${label} · 手动锁定`;
          appearance.addEventListener('click',async()=>{
            appearance.disabled=true;panel.hidden=true;button.setAttribute('aria-expanded','false');
            try {
              const api=window.__MIRROR_PROTOCOL__;
              if(api)api.choose(mode);
              else {await request('switch',{theme:mode==='night'?'deepseek-night':'deepseek-blue'});await render();}
              updateMirrorButton();
            } catch(error) {panel.hidden=false;button.setAttribute('aria-expanded','true');showError(error);}
            finally {appearance.disabled=false;}
          });list.append(appearance);
        }
      }
      if(window.__MIRROR_PROTOCOL__) {
        const auto=document.createElement('button'); auto.type='button'; auto.className='cts-switch-item'; auto.textContent='⌁ 恢复自动 · 低频随机入侵';
        auto.addEventListener('click',()=>{panel.hidden=true;button.setAttribute('aria-expanded','false');window.__MIRROR_PROTOCOL__?.resume();updateMirrorButton();}); list.append(auto);
      }
      for (const item of data.themes) {
        const option = document.createElement("button"); option.type = "button"; option.className = "cts-switch-item";
        option.textContent = `${item.designedFor === "dark" ? "◐" : "◑"}  ${item.displayName}`;
        option.setAttribute("aria-current", String(item.id === data.activeTheme));
        option.addEventListener("click", async () => { option.disabled = true; try { await request("switch", { theme: item.id }); await render(); } catch (error) { showError(error); } });
        list.append(option);
      }
    } catch (error) { showError(error); }
  };
  const openPanel=async()=>{panel.hidden=!panel.hidden;button.setAttribute('aria-expanded',String(!panel.hidden));if(!panel.hidden)await render();};
  button.addEventListener('click', async event => {
    if(event.shiftKey || !root.dataset.mirror) { await openPanel(); return; }
    panel.hidden=true;button.setAttribute('aria-expanded','false');
    const api=window.__MIRROR_PROTOCOL__;
    if(api)api.toggle();
    else try {await request('switch',{theme:root.dataset.mirror==='red'?deepseekTheme:'longmarch-black'});} catch(error){panel.hidden=false;button.setAttribute('aria-expanded','true');showError(error);}
    updateMirrorButton();
  });
  button.addEventListener('contextmenu',event=>{event.preventDefault();void openPanel();});
  button.addEventListener('keydown',event=>{if(event.key==='ArrowDown'){event.preventDefault();if(panel.hidden)void openPanel();}});
  const escapePanel=event=>{if(event.key==='Escape'&&!panel.hidden){panel.hidden=true;button.setAttribute('aria-expanded','false');button.focus();}};
  root.addEventListener('keydown',escapePanel);
  addEventListener('mirror-mode-change',updateMirrorButton);
  nativeButton.addEventListener("click", async () => { try { await request("native", {}); panel.hidden = true; button.setAttribute("aria-expanded", "false"); } catch (error) { showError(error); } });
  webButton.addEventListener("click", () => request("open", {}).catch(showError));

  const visible = (node) => { const s = getComputedStyle(node); if (s.display === "none" || s.visibility === "hidden") return null; const r = node.getBoundingClientRect(); return r.width > 1 && r.height > 1 ? r : null; };
  const overlaps = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  const place = () => {
    updateMirrorButton();
    const dialog = [...document.querySelectorAll('[role="dialog"],[aria-modal="true"]')].some(node => visible(node));
    if (dialog || innerWidth < 600 || innerHeight < 540) { root.hidden = true; return; }
    const controls = [...document.querySelectorAll('button,a[href],input,textarea,select,[contenteditable="true"],[role="button"],[role="link"]')]
      .filter((node) => !root.contains(node) && !node.closest('#codex-theme-studio-decorations')).map(visible).filter(Boolean);
    const size = 38; const candidates = [
      { left: innerWidth - size - 18, top: innerHeight - size - 76, align: "right" },
      { left: 18, top: innerHeight - size - 76, align: "left" },
      { left: innerWidth - size - 18, top: 72, align: "right", below: true },
    ];
    const safe = candidates.find((p) => !controls.some((r) => overlaps({ ...p, right:p.left+size, bottom:p.top+size }, { left:r.left-7, top:r.top-7, right:r.right+7, bottom:r.bottom+7 })));
    if (!safe) { root.hidden = true; return; }
    root.style.left = `${safe.left}px`; root.style.top = `${safe.top}px`; root.dataset.align = safe.align; root.dataset.panelBelow = String(Boolean(safe.below)); root.hidden = false;
  };
  const close = (event) => { if (!root.contains(event.target)) { panel.hidden = true; button.setAttribute("aria-expanded", "false"); } };
  document.addEventListener("pointerdown", close, true); addEventListener("resize", place, { passive:true });
  let placeTimer = 0;
  const requestPlace = () => {
    if (document.documentElement.dataset.mirrorPhase || placeTimer) return;
    placeTimer = setTimeout(() => { placeTimer = 0; place(); }, 220);
  };
  const observer = new MutationObserver(requestPlace); if (document.body) observer.observe(document.body, { childList:true, subtree:true });
  const timer = setInterval(place, 8000);
  const cleanup = () => {
    observer.disconnect(); clearInterval(timer); clearTimeout(placeTimer); removeEventListener("resize", place); document.removeEventListener("pointerdown", close, true);
    removeEventListener('mirror-mode-change',updateMirrorButton);
    for (const entry of pending.values()) { clearTimeout(entry.timer); entry.reject(new Error("Theme manager reloaded")); }
    pending.clear(); requests.length = 0; root.remove(); style.remove(); delete window[STATE_KEY]; return true;
  };
  window[STATE_KEY] = { cleanup, place, drainRequests: () => requests.splice(0), deliver }; place();
  return true;
})(__CTS_CONTROL_JSON__)
