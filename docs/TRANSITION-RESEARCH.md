# 转场研究与当前实现

## v2.2.8 · 定格与条带残像，减少明暗闪烁

第一段0.18–0.30秒快速入镜，完整碎镜定格至1.1秒；后段以4px平滑轻回震和两层裁切原画残像（约32px / 24px）进行交接，信号条更密，关闭整屏和局部明暗闪烁。长征机在1.52–2.16秒交接，2.3秒收束，总时长3秒。残像只在水平条带复制同位置原画，不增加RGB通道副本；圆形按钮、正文几何、原图比例保持。下面各旧版是历史时序。

## v2.2.7 · 快速入镜，后段集中交接

根据用户对连贯性的反馈，将两次独立撞击改成一段连贯交接：DS 0.18–0.30秒快速切入原始碎镜，第一段不回震、不全屏闪断；0.52秒才开始连续黄青故障窗口，1.28–1.84秒以560ms平滑淡入长征机，2秒收束回震。保留原图、3秒总时长、全窗口覆盖和固定圆形按键。独立Edge检查早段无闪光/位移、0.3秒碎镜完整、后段有中间opacity而非硬切、日夜/窄屏与清理。下列2.2.6及更早时序均为历史记录。

## v2.2.6 · 三秒与全窗口闪断

用户要求加快一倍、多次回震并让整个画面参与闪断。正向由6秒改为3秒：0.54秒破镜、1.8秒长征机交接；两处撞点分别使用6px与8px幅度、620ms内9次方向反转。回程冷色溶解缩到1.125秒。独立的body同级、pointer-inert、aria-hidden画面层覆盖完整视口，黄青信号条与透明闪光覆盖侧栏和主区域；对话框仍用边缘信号层。按钮固定、原图尺寸不变，无红蓝通道副本。减少动态效果、中断、恢复与dispose均清理画面层。截图为`previews/v226-cp2077-dialog-glitch.png`与`previews/v226-night-impact-1820.png`；录像仍使用`previews/three-photo-cyberpunk-lock.webm`。独立Edge测试不等于真实Codex验证。

## 历史 v2.2.5 · Cyberpunk 2077 logo 动画参考

用户要求撤掉红蓝三原色重影与不自然的切换按钮抖动，改为完全参考公开的 Cyberpunk 2077 logo 动画开源实现。研究了 [IshankaDSenevirathne/Cyberpunk_2077](https://github.com/IshankaDSenevirathne/Cyberpunk_2077)：其 `app.js` 把字形拆成独立SVG片段，先以约2.1秒渐近归位，再在字标上进行约20毫秒的强倾斜闪断；其后对文字段与小线条进行多轮短促错位、闪隐和归位。源仓库 README 自述是作者制作的游戏logo fan animation。仓库文件树没有列出许可证文件，因此本主题没有复制该仓库的代码、logo、SVG或素材。此为对公开自制实现的结构借鉴，不代表CD Projekt Red官方源代码或官方动画工程。

- 将碎镜转场的两处撞点分别放在1.08秒和3.56秒。主题UI中的可见dialog、modal、menu与Radix浮层叠加四条细分段扫描线，以短促分拍方式错位；dialog本身、文字和按钮不移动。
- logo只在内部标记图形做像素级裁切闪断与极轻微影层偏移；圆形切换按钮外框固定38×38，保持正圆且不平移、不旋转、不缩放。深浅两态logo仍按原中间碎镜图交接时间淡入淡出。
- 配色采用赛博黄与青绿两条信号色，不生成红蓝/ RGB分离重影。照片构图不旋转，回震上限3–4px；扰动和冲击光限制于左侧空白。
- 动效只在用户明确选择转换状态时播放；后台、输入、IME、菜单及弹窗期间自动切换仍延后。`prefers-reduced-motion`会跳过动效，取消/恢复会清理切片层和logo状态。

独立预览的截图与录像见 `previews/v225-cp2077-dialog-glitch.png` 与 `previews/three-photo-cyberpunk-lock.webm`。浏览器测试不是Codex实机验证。

## 历史尝试

# v2.1：三条常驻合成层，移除SVG/SMIL

用户反馈6秒切换卡顿、元素太少。v1.9每次点击都把三张完整WebP拼进约1.5MB的SVG，建Blob设为背景，并用SMIL在主线程做全屏opacity；420ms还要切换2.7MB主题CSS。2.1改为：

- `main.main-surface`内三条常驻opacity层（中间图、长征机、冷色），图片直接引用`--mp-fractured-day/night`、`--mp-red-art`，不经过JS读取base64。
- install后约700ms预解码三张WebP，并以0.1%透明度预栅格化两帧；第一次点击不再付纹理上传成本。
- 正向用WAAPI：中间层1.08s起1.2s淡入，红色层3.6s起1.32s淡入，6.2s清理；回程红色层先盖住420ms的蓝底切换，再2.25s淡出。
- 中间图用深色过渡遮罩（日间左86%/中64%/右8%），确保切色后正文可读；末尾红色层与静态红主题共用遮罩与裁切。
- `dispose`/中断会cancel WAAPI并复位三层；减少动态效果直接切换。

性能与复测见`MOTION-PERFORMANCE.md`。1× Edge实测无long task，p95 13.4ms；4×节流p95 26.6ms，唯一179ms长任务在420ms配色提交处。半屏最终帧与静态帧平均差0.32/255。

# v1.9补充：6秒与半屏

用户将完整三图切换指定为6秒，并要求图标在破碎中间图出现时切换。当前阶段：DS停留1.08秒，1.2秒淡入破碎图，中间图完整停留1.32秒，1.32秒淡入长征机，末尾停留1.08秒。图标在1.08秒开始、约2.28秒完成身份交接，红回蓝仍为2.25秒溶解。

静态背景与SVG过渡统一采用1672×941源画布。半屏仅改变整幅背景的等比绘制与渐隐，不改变人物像素或原生控件几何。验证见half-screen-report与split-screen-demo-report。以下v1.8记录保留历史。

# 转场参考与当前选择

## v1.8：原图三阶段慢切

用户最新要求先做三个照片切换，放缓切换并完善图标动画；撤销此前为对齐头部所作的配准，恢复原图。该要求覆盖此前的逐片脱落动画尝试。

当前顺序为DS原图 → 破碎中间图 → 长征机原图，总计12秒，两段交叠分别2.4秒、2.64秒。中间图完整停留约2.64秒。人物保持原图坐标与比例；没有片状几何运动，没有头部修正。日间 / 夜间独立中间图均从对应原图同坐标合成。

采用 `deepseek-blue.png`、`deepseek-night.png`、`longmarch-black.png` 原稿；主题使用各自WebP编码。`transition-day-original.*` / `transition-night-original.*` 的透明缺口取自原玻璃素材的连通透明区域，玻璃材质只合成一次，没有另画圈、肖像框或运行时玻璃叠层。未覆盖玻璃处对原像素逐值核对，报告见 `previews/alignment-report.json`。

手动正圆按钮内的蓝鲸与红标独立绘制，以旋转、渐隐 / 渐显、轻微缩放和模糊收敛过渡，外圆缓慢转动。图标交接与第三张照片同步；文本和输入面板立即使用成对语义色，保证中途可读。

验证见 `previews/three-photo-report.json` 与 `three-photo-preview-report.json`。仅独立浏览器验证，未应用到真实Codex。无需登录服务。

## 先前研究（不参与当前转场）

- Yalantis / StarWars.iOS：https://github.com/Yalantis/StarWars.iOS 。曾查看原作者preview.gif及190/210/230帧，学习当前画面内容随碎片离场；未复制实现或把GIF打包进主题。
- cdgugler / Shatter.js：https://github.com/cdgugler/shatter.js 。曾学习保留源图坐标与纹理的原则；未复制实现。
- v1.6曾以Three.js / Delaunator渲染182块原画UV碎片，并按眼位配准长征机头部。用户否定头部修图，已停用这些资产。
- 后续裂纹生长尝试曾形成单裂纹、分叉、逐片转动与下落的约12秒版本。用户随后明确先要三图版本，故不作为当前交付。相关 `tools/render/`、`shatter-*.webp`、`longmarch-head-aligned.*` 和 `animation-*` 记录仅为历史研究。

Three.js 0.181.0：https://github.com/mrdoob/three.js ；Delaunator 5.0.1：https://github.com/mapbox/delaunator 。MIT许可保留于历史研究目录 `tools/render/vendor/`，当前运行时不加载这些库。
