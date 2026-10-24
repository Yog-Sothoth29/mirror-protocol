# 安装镜面协议

需要 **Node.js 22+**。Windows 是本主题主要验证环境；macOS 启动与恢复沿用上游运行时，仍需实机检查。Linux 可构建、测试和预览。

## 让其他 Codex 安装

把仓库链接交给 Codex，并说明：

> 阅读仓库 INSTALL.md，下载可信源码，运行 node tools/install.mjs 为我安装镜面协议，再尝试应用。不要静默重启 Codex；如果需要重启，先告诉我具体原因。安装后运行状态与实机验证，给出恢复命令。

仓库：https://github.com/Yog-Sothoth29/mirror-protocol

可下载安装包：https://github.com/Yog-Sothoth29/mirror-protocol/releases/latest

从 GitHub 克隆或解压源码后，在项目目录运行：

```sh
node tools/install.mjs
```

安装器用 Node 内置模块构建并校验四套主题，将便携 runtime 放入 **~/.mirror-protocol/releases/**，保留 MIT 与素材许可，建立统一入口 **~/.mirror-protocol/mirror.mjs**。安装本身不需 npm、管理员权限，不连接或重启 Codex，不修改系统 PATH、签名应用、WindowsApps 或 app.asar。开发预览和浏览器测试才需要 npm ci。

重复安装相同内容复用同一版本目录；升级建立新目录并保留旧版。源文件有改动时会产生新的内容摘要，避免覆盖正在运行的版本。默认不安装任何 Skill，也不改已安装 Skill。

## 应用和检查

在 PowerShell：

```powershell
node "$HOME/.mirror-protocol/mirror.mjs" list --json
node "$HOME/.mirror-protocol/mirror.mjs" use mirror-protocol-auto
node "$HOME/.mirror-protocol/mirror.mjs" status --json
node "$HOME/.mirror-protocol/mirror.mjs" verify --screenshot "$HOME/mirror-protocol-check.png"
```

macOS 的 shell 可运行相同三条命令。也可初次安装时运行 **node tools/install.mjs --apply**；它同样不会自动授权重启。

自动主题以深蓝夜间为默认基底；圆形按钮菜单可锁定长征机或恢复随机入侵。日间在当前 Codex 仍存在白字浅底兼容问题，保留为实验选项，不作为默认。只有预览通过不能说明真实 Codex 已成功应用。应用后还应运行：

```sh
node <安装目录>/releases/<当前版本>/runtime/scripts/runtime.mjs --verify --theme mirror-protocol-auto --screenshot <本机截图路径>
```

安装目录和当前版本见安装输出或 installation.json。统一入口的 **verify** 命令也会调用同一实机验证器。只有验证和截图检查通过，才报告实机成功。

自动发现官方应用失败时，使用 **use mirror-protocol-auto --app-path <官方可执行文件>**，或安装时使用 **--apply --app-path <官方可执行文件>**。运行时仍会检查OpenAI签名；不能换成无签名程序或放宽检查。

本版所有应用操作均为 **attach-only**：只连接已经开放 `127.0.0.1:9335` 且已有可见主界面的 Codex。缺少端口、只有辅助窗口或空壳时拒绝应用，不打开、关闭或重启客户端。`--restart-existing` 和 `--profile-path` 已停用。

首次启用调试端口须另按 [codexthemes.ai 的 codex-theme-switcher](https://github.com/codexthemes/skills/tree/main/skills/codex-theme-switcher) 处理，且必须先取得用户对正常重启的明确授权。该站是第三方主题项目。本项目不再自建替代启动器，不指定或复制 Codex 配置目录。不能强制结束 Codex、补丁签名应用或静默改变官方原生设置。新版配色通过语义变量适配界面，但仍需实机逐页检查。

右键正圆徽章、Shift+单击或按 ↓，可选择 **☀ DeepSeek 日间 / ☾ DeepSeek 夜间**；普通单击切换 DeepSeek 与长征机。验证失败会撤回主题与管理器，并将实际校验结果写入本机私有 `CodexThemeStudio/startup-verification.json`。

如果另一份 Theme Studio 管理器正在运行，安装器拒绝接管它。先用该管理器原本的 **theme.mjs restore** 恢复、停止，再应用本安装；不要同时运行两个主题管理器。

## 旧启动器已停用

v2.3.3 及更早的退出后重开流程存在用户配置覆盖、重复客户端与失败后残留风险。`launch-activation.mjs` 和 `activate-after-exit.mjs` 现直接拒绝运行。请从当前 main 源码更新；旧 latest Release v2.3.1 不包含这些修复。

可用 `node "$HOME/.mirror-protocol/attach-theme.mjs" --check` 只读检查现有窗口；不带 `--check` 时尝试连接和验证主题。不要为绕过拒绝逻辑再创建配置目录、WMI 辅助或重启脚本。

## 恢复与卸载

```powershell
node "$HOME/.mirror-protocol/mirror.mjs" native
node "$HOME/.mirror-protocol/mirror.mjs" restore
node "$HOME/.mirror-protocol/uninstall.mjs"
```

native 清除主题绘制并保留管理器；restore 清除主题、按钮与管理器；uninstall 会先恢复本安装拥有的活动主题，再移除带本项目所有权标记的安装目录，不删除 Codex 聊天、登录或其他主题库。遇到外部管理器不主动改动它。

自定义安装位置：**node tools/install.mjs --root <目录>**。后续入口或卸载也加 **--root <同一目录>**，或配置 MIRROR_PROTOCOL_HOME。安装器拒绝以驱动器根目录、用户主目录、当前目录、源码目录或未标记的非空目录作为目标。

完整自动调度需要本项目便携 runtime。仅导入 packages/*.codex-theme 是静态主题，不能替代本安装器。
