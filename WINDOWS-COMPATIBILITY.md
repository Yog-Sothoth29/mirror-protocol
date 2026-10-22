# Windows 运行时兼容性

## v2.3.4 启动安全修复，实机验收尚未完成

v2.3.3 后续启动出现验证失败和残留；下方早期聊天页成功记录只代表当时会话。自制生产启动器曾指定 user-data-dir，另有未退出的隔离测试实例，因此不能把旧流程称为稳定。后端还出现连接超时，当前证据不足以确定其与主题、实例数或网络的因果关系。

本版禁用自制重启和配置覆盖，只连接既有端口。识别 main 时检查祖先可见性，排除隐藏登录容器；装饰、验证和动态层使用相同的可见主区域。辅助 detached-window 不参与主题注入与验收。空壳没有就绪界面时拒绝注入。

启动验证保留具体 stdout/stderr；失败时停止本项目 watcher，撤回页面 CSS、动态层与管理器，确认后才清除状态。恢复不再忽略页面清理失败。真实 CDP 回滚测试在独立 Edge 中通过，未触碰用户 Codex。日夜语义配色与菜单也通过独立浏览器检查；当前新版的完整实机截图验收仍待完成。真实聊天截图及私有日志不公开。

以下为历史检查记录，不是新版实机验收证明。

## v2.3.3 真实聊天页背景修复

Store Codex 26.1016.6573.0 的实际主区域使用 main 元素和 CSS module 类名，未保留旧 main-surface 类名。旧绘制规则因此未命中，图片仍能解码，但只有独立粒子层可见。背景改为兼容语义 main，输入区兼容 data-composer-body，聊天阅读遮罩兼容 data-turn-key；未改原生布局。

在已连接的本机 9335 上热切换完成，不重启应用。完整校验通过：主界面有图、185个可见交互矩形、无横向溢出、按键零碰撞。辅助 detached-window.html 空壳独立标记，截图选真实主窗口。真实截图留在本机，公开画廊仍是无私人信息的独立预览。此结果只覆盖当前聊天页，不代表首页、所有菜单和弹窗的完整实机验收。

## 退出后辅助程序的独立性

从 Codex 内用 `Start-Process` 或 Node `detached` 启动的程序，可能仍属于 Codex 的 Windows 进程 Job。实测旧等待程序退出后未写完成/失败记录，留下已不存在的 helperPid 和旧 waiting 状态。

新入口 `launch-activation.mjs` 通过 WMI `Win32_Process.Create` 启动，读回路径、完整参数、桌面会话与新状态。真实临时 sentinel 检查确认父进程为 WmiPrvSE、处于同一用户会话、未加入源 launcher 的专用生命周期 Job；源 Job 关闭后仍完成延迟写入并自然退出。13项辅助检查及安装回归通过，测试不关闭或注入用户 Codex。

独立新 profile 的官方 Codex 已在 `127.0.0.1` 返回 Chrome 155 / CDP 1.3 响应。这仅证实可执行文件支持本机 CDP，不代表主窗口的主题已激活；仍以主窗口 status、verify 与截图为准。

## 应用发现与参数传递

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
