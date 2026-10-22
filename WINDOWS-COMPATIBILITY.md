# Windows 运行时兼容性

已对 Microsoft Store 的 OpenAI Codex 26.1016.6573.0 做只读发现验证：自动找到 `app/ChatGPT.exe`，并通过 Windows Authenticode 的 `Valid` 状态和 OpenAI 签名主体检查。未因本项验证关闭、重启或注入应用。

本次修复了两处 Windows PowerShell 兼容问题：

- `powershell.exe -Command` 后的路径参数可能被当成命令正文。带参数的内部脚本改用 UTF-16 `-EncodedCommand`，将参数单独编码为 JSON，并传入脚本块；空格、中文、引号和 PowerShell 语法不会改变参数含义。正常关闭操作使用相同传参方式。
- 从 PowerShell 7 启动 Node.js 时可能继承不兼容的 Security 模块搜索路径。签名检查显式载入 Windows PowerShell 自己的 `$PSHOME/Modules/Microsoft.PowerShell.Security` 模块，并在加载或签名读取错误时拒绝继续。

签名要求、可执行文件名称限制、精确进程路径匹配和仅正常关闭策略保持原样。不修改 `WindowsApps`、`app.asar` 或系统执行策略。

平台测试命令：

```sh
node runtime/scripts/platform-runtime-test.mjs
```

36 项平台检查通过，包括参数传递、非 OpenAI/未签名候选拒绝、私有状态 ACL 和回环 URL 限制。测试对正常关闭行为只检查命令构造，不实际关闭 Codex。发现验证不等于主题已在真实应用中激活；仍需以安装后的 `status` 和实时验证结果为准。
