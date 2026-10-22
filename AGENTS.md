# 使用本仓库的 Codex

先读 INSTALL.md。用户要求安装时，执行 node tools/install.mjs；编译仅需 Node.js 22+，不要为了安装主题额外下载浏览器或要求 npm ci。

默认用户级安装目录为 ~/.mirror-protocol，使用版本化 runtime 与 mirror.mjs 统一入口。安装不等于激活：只有用户要求应用时，才运行安装输出的 use 命令或 --apply。应用后检查 status、runtime --verify 与实际截图；preview 的浏览器截图不能当作 Codex 实机证据。

绝不从「安装」推断用户同意重启。仅在明确获得一次正常重启授权后使用 --restart-existing；不强制结束 Codex，不修改签名应用、WindowsApps、app.asar 或已安装 Skill。后台管理器只监听 127.0.0.1；遇到端口冲突或结构不兼容应停止并报告。

如果别的 Theme Studio 管理器正在运行，不并行启动本管理器；先按 INSTALL.md 正常恢复旧管理器。不要输出 state.json 的 token 或私有日志内容。

若用户选择手动退出后启用，运行安装目录的 launch-activation.mjs。Windows 必须由 WMI 独立启动并验证 helperPid 与心跳；直接在 Codex 子进程中 Start-Process 或 Node detached 不保证跨退出存活。不要把旧 waiting JSON 当作就绪证明，也不要循环请求重启。

提供用户恢复入口：node ~/.mirror-protocol/mirror.mjs restore。用户要求卸载时，使用安装器提供的 uninstall.mjs，不手写递归删除命令。

保留代码 MIT、runtime/LICENSE、ASSET-LICENSE.md 与第三方来源。素材许可不自动授予第三方角色和品牌权利。发布前检查不含本机路径、账号凭证、Codex 状态与用户聊天。
