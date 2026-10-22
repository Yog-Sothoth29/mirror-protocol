# 发布方式

本仓库在发布前执行 npm run build、npm test、node tools/qa/qa-install.mjs，并检查 git diff --cached --check。

npm run release 生成 dist/ 下的可安装目录，包含 runtime、四套编译主题、安装器和许可。将目录打包成 ZIP，并为 ZIP 生成 SHA-256。GitHub Release 同时提供四个 .codex-theme 静态包；完整自动切换功能使用 ZIP 或本仓库源码中的 node tools/install.mjs。

公开源码不包含 node_modules、账号凭据、桌面状态、本机运行日志或用户聊天。代码 MIT，插画许可单列。首次实机激活可能需要一次明确授权的正常重启；没有实机验证结果时不得把独立浏览器预览当成实机成功。
