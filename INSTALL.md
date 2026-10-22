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

自动主题以浅蓝日间为默认基底；圆形按钮菜单可选择夜间、锁定长征机或恢复随机入侵。只有预览通过不能说明真实 Codex 已成功应用。应用后还应运行：

```sh
node <安装目录>/releases/<当前版本>/runtime/scripts/runtime.mjs --verify --theme mirror-protocol-auto --screenshot <本机截图路径>
```

安装目录和当前版本见安装输出或 installation.json。统一入口的 **verify** 命令也会调用同一实机验证器。只有验证和截图检查通过，才报告实机成功。

自动发现官方应用失败时，使用 **use mirror-protocol-auto --app-path <官方可执行文件>**，或安装时使用 **--apply --app-path <官方可执行文件>**。运行时仍会检查OpenAI签名；不能换成无签名程序或放宽检查。

如果第一次启用时提示当前 Codex 没有本机调试端口，安装文件已保存；**先获得用户对一次正常重启的明确同意**，再使用：

```powershell
node "$HOME/.mirror-protocol/mirror.mjs" use mirror-protocol-auto --restart-existing
```

不能强制结束 Codex、补丁签名应用、绕过端口冲突或静默改变官方原生外观。自动包设计为浅蓝基底/深色入侵，原生外观不匹配时需用户调整并重新检查。当前版本的原生结构不兼容时应报告并恢复。

如果另一份 Theme Studio 管理器正在运行，安装器拒绝接管它。先用该管理器原本的 **theme.mjs restore** 恢复、停止，再应用本安装；不要同时运行两个主题管理器。

## 普通启动或关闭后驻留导致无法激活

如果 `status` 仍是 inactive，且启动提示 Codex 已运行但没有调试端口，使用独立等待入口：

```powershell
node "$HOME/.mirror-protocol/launch-activation.mjs"
```

Windows 入口通过系统 WMI 进程服务启动隐藏辅助程序，读回进程身份与新的等待状态后才报告已就绪；不创建计划任务或开机启动项。不能只用 Codex 内的 `Start-Process`、Node `detached` 或直接运行 `activate-after-exit.mjs`：这些方式可能随 Codex 退出一同中断，留下旧的 waiting 状态。

看到独立等待程序已就绪后，从 Codex 的菜单**完全退出**应用；不要只关闭窗口，也不要从任务栏重新打开。辅助程序最多等待10分钟，观察到官方进程全部退出后，仅调用原安装入口启动一次带本机调试端口的 Codex。它不请求退出、不结束进程、不自动重试，不创建其他主题管理器。启动完成后仍需 status、verify 和截图检查。

等待状态在 `~/.mirror-protocol/activation.json`，`updatedAt` 会随轮询刷新；摘要日志在 `activation.log`。仅有旧 waiting 记录不能证明程序仍在运行，须核对 helperPid、进程身份与更新时间。入口只在确认旧锁的进程已不存在后清理旧锁，遇到活动进程拒绝并行启动。建立 `activation.cancel` 文件可以取消等待；下次重新等待前删除该取消文件。卸载或更换安装版本也会自动停止等待。一个安装目录只允许一个等待程序。

## 恢复与卸载

```powershell
node "$HOME/.mirror-protocol/mirror.mjs" native
node "$HOME/.mirror-protocol/mirror.mjs" restore
node "$HOME/.mirror-protocol/uninstall.mjs"
```

native 清除主题绘制并保留管理器；restore 清除主题、按钮与管理器；uninstall 会先恢复本安装拥有的活动主题，再移除带本项目所有权标记的安装目录，不删除 Codex 聊天、登录或其他主题库。遇到外部管理器不主动改动它。

自定义安装位置：**node tools/install.mjs --root <目录>**。后续入口或卸载也加 **--root <同一目录>**，或配置 MIRROR_PROTOCOL_HOME。安装器拒绝以驱动器根目录、用户主目录、当前目录、源码目录或未标记的非空目录作为目标。

完整自动调度需要本项目便携 runtime。仅导入 packages/*.codex-theme 是静态主题，不能替代本安装器。
