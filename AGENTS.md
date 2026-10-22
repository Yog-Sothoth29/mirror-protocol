# 使用本仓库的 Codex

先读 INSTALL.md。用户要求安装时，执行 node tools/install.mjs；编译仅需 Node.js 22+，不要为了安装主题额外下载浏览器或要求 npm ci。

默认用户级安装目录为 ~/.mirror-protocol，使用版本化 runtime 与 mirror.mjs 统一入口。安装不等于激活：只有用户要求应用时，才运行安装输出的 use 命令或 --apply。应用后检查 status、runtime --verify 与实际截图；preview 的浏览器截图不能当作 Codex 实机证据。

激活仅连接现有本机调试端口。自制 --restart-existing、--profile-path、退出后重开辅助已停用；不要绕过拒绝逻辑，不指定或复制用户配置。首次需要端口时按 codexthemes.ai switcher 的官方流程处理，重启必须另有用户授权。不强制结束 Codex，不修改签名应用、WindowsApps、app.asar 或已安装 Skill。后台管理器只监听 127.0.0.1；结构不兼容应停止并报告。

如果别的 Theme Studio 管理器正在运行，不并行启动本管理器；先按 INSTALL.md 正常恢复旧管理器。不要输出 state.json 的 token 或私有日志内容。

不要运行旧版 launch-activation.mjs 或 start-after-exit.mjs 的退出后重开流程。新版 attach-theme.mjs 仅连接现有窗口，--check 仅检查现有界面。主界面与隐藏登录容器可能同时包含 main；运行时须选可见主区域。验证失败须撤回 renderer 及管理器，不能仅删状态文件。

提供用户恢复入口：node ~/.mirror-protocol/mirror.mjs restore。用户要求卸载时，使用安装器提供的 uninstall.mjs，不手写递归删除命令。

保留代码 MIT、runtime/LICENSE、ASSET-LICENSE.md 与第三方来源。素材许可不自动授予第三方角色和品牌权利。发布前检查不含本机路径、账号凭证、Codex 状态与用户聊天。
