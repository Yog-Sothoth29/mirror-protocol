# 镜面协议 · 开源 Agent 前端风格研究

研究日期：2026-10-21。新版 2.1.0 在现有作品上完善配色；人物、三图转场、6 秒时序、手动按钮和半屏逻辑保留。所有实际运行检查为独立浏览器样稿，尚未应用真实 Codex。

## 实际查阅的项目

| 来源 | 查看的内容 | 本主题采用的设计原则 |
| --- | --- | --- |
| [LobeHub DESIGN](https://github.com/lobehub/lobehub/blob/canary/DESIGN.md) / [Lobe UI tokens](https://ui.lobehub.com/design-tokens) | 页面、容器、次级容器、浮层与文本分别分级；阅读主次、边框与交互填充色 | 同一色相建立明暗、饱和度和材质层级，弹窗不再和输入框同底色 |
| [Cherry Studio DESIGN](https://github.com/CherryHQ/cherry-studio/blob/main/DESIGN.md) | 语义色、侧栏与浮层独立表面、选中/悬停/焦点与反馈状态 | 选中、悬停、输入聚焦有独立表现；成功/警告/错误使用对应前景与浅底，保留原有含义 |
| [CherryStudio-Aero](https://github.com/hakadao/CherryStudio-Aero) | README 中的真实暗色界面截图与材质 CSS | 冷色环境光、较实的阅读底、细内高光；保留圆角与层次，不照搬其依赖宿主的窗口透明效果 |
| [Open WebUI](https://github.com/open-webui/open-webui/blob/main/src/app.css) | 实际排版、代码、引用、菜单样式与对比修正 | 代码有独立底层、文本优先；菜单保持不透明，避免复杂背景透过正文 |
| [OpenCode desktop themes](https://github.com/anomalyco/opencode/tree/dev/packages/ui/src/theme/themes) | 实际 Tokyonight、Catppuccin、Nord JSON，区分 neutral/ink/primary/status/syntax | 语法高亮不再全用主色：关键字紫、字符串青绿、数值暖金、注释灰；diff 仍用增绿删红 |

研究原始文本与 Aero 截图缓存位于工作区 `work/agent-theme-research/`，不打包第三方截图和完整源码。上表记录视觉原则，不将这些项目的 Skill、CSS 或脚本直接注入 Codex。

## 发现的问题

原版主要为大面积图片加一种面板底色：侧栏、输入区、菜单和代码明暗相近；蓝色主调几乎承担了所有语义；全屏扫描线和网格穿过文字与人物，增加噪声。已经保存 `previews/style-before-{blue,night,red}.png` 作为同窗口基线。

## 本版落实

| 状态 | 主色与辅助色 | 层次 |
| --- | --- | --- |
| DeepSeek 日间 | 钴蓝 `#326cb2` / 鸢尾紫 `#7762a6` | 冰蓝画布 → 蓝灰瓷感侧栏 → 瓷白卡片 → 珠光蓝输入区 → 白色浮层；代码用淡靛蓝底 |
| DeepSeek 夜间 | 冰蓝 `#83c9ff` / 冷紫 `#b3a1e7` | 深海画布 → 午夜蓝侧栏 → 钢蓝阅读层 → 低光蓝紫输入层 → 浮起的靛蓝菜单；代码用深海军蓝底 |
| 长征机 | 信号红 `#fb7185` / 冷钢灰 `#a7b8d2` | 黑色空间 → 黑红侧栏 → 炭灰卡片 → 葡萄酒红输入层 → 暗玫瑰浮层；代码用近黑底 |

增加选中渐变与内侧标记、输入聚焦高光、发送键的双色微渐变、独立菜单、代码语法和状态色。移除覆盖整屏的高密扫描线，保留非常轻的边缘暗角。原生界面只更改颜色、背景、边框、阴影和现有 token；没有移动原生控件，也不添加挡住交互的装饰层。

`tools/surface-design.mjs` 是三套语义颜色与 paint-only CSS 的单一来源，由现有构建器纳入全部静态与自动包。演示页的语法与状态样例用于显示配色；真实 Codex 的版本相关语法节点仍需应用后验证，不能把样稿当作实机证明。

## 验证证据

新版截图、层次/对比报告位于 `previews/surface-design-*`；半屏、日夜、三图图标与包加载沿用现有回归脚本并对明确改变的代码底色断言作对应更新。报告均明确区分独立浏览器检查与真实 Codex 验证。
