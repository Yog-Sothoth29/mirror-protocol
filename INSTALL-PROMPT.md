# 复制给其他 Codex

```text
请为我安装并应用这个 Codex 桌面主题：
https://github.com/Yog-Sothoth29/mirror-protocol

先阅读仓库 README.md、INSTALL.md、AGENTS.md 和 WINDOWS-COMPATIBILITY.md，下载可信源码或最新 Release 完整安装包。需要 Node.js 22+；在解压或克隆的目录运行 node tools/install.mjs，不需要为了安装执行 npm ci。

然后使用安装器返回的 mirror.mjs 入口，应用 mirror-protocol-auto。它包含 DeepSeek 日间/夜间、黑红长征机、手动正圆按钮和低频随机切换，并支持半屏。

首次激活如果需要正常重启 Codex，请先说明并征得我的同意。不能强制结束进程、修改 WindowsApps/app.asar 或放宽 OpenAI 签名检查。若正常退出未成功，停止并提示我从应用菜单完整退出后再用安装入口启动，不要循环重启。

如果我选择手动退出后自动启用，使用安装目录的 launch-activation.mjs，确认独立辅助进程身份与心跳后再提示我退出。不要直接从 Codex 中用 Start-Process 或 Node detached 启动等待脚本；旧 waiting 记录不能证明等待程序还活着。

应用后检查 status、实机 verify 和截图；只有确认实际界面生效才能说安装成功。不要将独立浏览器预览当成实机验证。最后给我恢复原生外观和卸载命令。
```
