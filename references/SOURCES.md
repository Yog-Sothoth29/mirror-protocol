# 参考来源（不随主题包发布）

本目录只用于研究记录。主题包只包含另绘的 `assets/longmarch-sigil.svg` 与运行时样式，不包含下列第三方代码、截图或模组美术。

## dsh-theme-longmarch（MIT）

- 仓库：https://github.com/Soviet-Dreadnaught/dsh-theme-longmarch
- 许可：MIT，见同目录 `tfr-longmarch/LICENSE`（下载副本）。
- 读取内容：`README.md`、`client.js`、`CHANGELOG.md`、`icon.png`、`docs/presets.jpg`。
- 借鉴范围：数据雨列（`width:1ch` + `word-break` + `translateY`）、CRT扫描线/过扫带、雷达锥形渐变、同心环与十字准线、覆盖层分层（纹样→徽记→雨→扫描→暗角→HUD）、`prefers-reduced-motion` 处理。
- 未使用：其 React 组件、四套部门预设、徽记资源、设置页与宿主注入代码。本主题的数据雨/HUD由 `runtime/scripts/mirror-protocol.mjs` 另写。

## 《烈焰升腾》/ The Fire Rises

- 长征机国策图标路径：`gfx/interface/ideas/PRC/PRC_the_long_march_idea.png`（机柜、红星、镰刀锤头、二进制串）。
- 同人参考（用户提供，见 README）：
  - 大白兔喝柠檬水《征征征！》：https://xhslink.cn/o/9jkweYkXQVo
  - 夭予《【TFR】长征机二创绘画》：https://xhslink.cn/o/PVuk7LWnvS
  - BurnICE《给长征机做了个logo》：https://xhslink.cn/o/3RuphSUriYC
  - Torped / u/Active_Composer9406：https://www.reddit.com/r/TheFireRisesMod/comments/1iafax9/meet_the_long_march_chinas_big_sister/
  - Zheng-Chan 创意工坊：https://steamcommunity.com/sharedfiles/filedetails/?id=3415498087
- 使用边界：只提取「机柜/终端 + 红星 + 二进制 + 圆环」的视觉语法，另绘为 `longmarch-sigil.svg`；不复制、不打包上述同人图或模组图标。主题仍标注为同人再设计，非 TFR 官方。

## 其他

- 运行时上游：https://github.com/Way-To-AGI/codex-theme-studio ，MIT。
- Playwright / Edge：仅用于本地 QA。
- 本目录的 `tfr-longmarch/` 仅作个人研究缓存，发布包不收录。


## Cyberpunk 2077 logo 动画（公开 fan project）

- https://github.com/IshankaDSenevirathne/Cyberpunk_2077
- 读取 README、app.js 时间线与SVG文件清单。仓库根目录没有列出LICENSE；未复制代码或素材。仅观察分件归位、短斜切、线段闪隐与故障重现的节奏。实现及范围说明见 `../CP2077-LOGO-RESEARCH.md`。


2026-10-22 · 标题动画主要参考：https://adamblumert.pl/work/cp2077 。核对范围和实现边界见CP2077-LOGO-RESEARCH.md；未再分发原作者视频或工程。
