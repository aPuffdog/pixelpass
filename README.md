# Codex DeepSeek Media Proxy

一个只监听本机的 Responses API 反向代理。它把 Codex 请求中的内联图片上传到
DeepSeek Files API，再用 `file_id` 替换 Base64，避免长会话反复携带大量历史
截图并触发 HTTP 413。

## 快速安装（macOS）

环境要求：

- macOS
- 已配置为 DeepSeek Responses provider 的 Codex
- Node.js 22.15 或更高版本；Codex 自带的 Node.js 也可使用

从源码目录安装：

```bash
git clone https://github.com/aPuffdog/deepseek-media-proxy.git
cd deepseek-media-proxy
./install.sh
```

或者从 GitHub Release 下载 `deepseek-media-proxy-v*.tar.gz`：

```bash
tar -xzf deepseek-media-proxy-v*.tar.gz
cd deepseek-media-proxy
./install.sh
```

安装完成后完全退出并重新打开 Codex，再新建或 fork 任务。以后使用：

```bash
./deepseek-proxy status
./deepseek-proxy off
```

`install.sh` 不会读取、打印或复制 API Key。它启动本地代理，健康检查通过后
自动备份 Codex 配置，并只修改当前 provider 的 `base_url`。

## 当前能力

- 拦截 `POST /responses` 和 `POST /v1/responses`。
- 支持 gzip、deflate、Brotli 和 zstd 请求体。
- 处理用户消息、`function_call_output` 和 `custom_tool_call_output` 中的图片。
- 按图片内容 SHA-256 去重。
- 将哈希到 DeepSeek `file_id` 的映射持久化到本地缓存。
- 原样流式转发上游 SSE 响应。
- 提供健康状态和聚合统计，不记录 prompt、图片或凭证。
- 其他上游路径，例如模型探测，直接透传。

Codex 当前模型必须使用 `wire_api = "responses"` 的 HTTP 传输，并且 DeepSeek
模型支持 `input_image.file_id`。托管模式使用 Node.js 24 验证。

可选的 DeepSeek 实机连通测试会上传一张 1×1 PNG、发送一次最小 Responses
请求，并立即删除该测试文件：

```powershell
$env:DEEPSEEK_API_KEY = "<your key>"
npm run live-smoke
```

### macOS 统一控制

在项目目录执行可执行控制脚本：

```bash
./deepseek-proxy status
./deepseek-proxy on
./deepseek-proxy off
```

- `status`：查看代理是否运行、Codex 是否经过代理，以及图片上传和请求体缩减统计。
- `on`：安装并启动当前用户登录时运行的 LaunchAgent，健康检查通过后把 Codex
  当前 provider 切换到本地代理。修改前自动备份 Codex 配置。
- `off`：先把 Codex 恢复为最初记录的 DeepSeek 直连地址，再停止代理。
- `start` / `stop` / `restart`：只控制代理进程，不修改 Codex 配置。
- `doctor`：检查 Node.js、Codex 配置、代理健康和路由是否一致。

`on` 或 `off` 修改配置后，需要完全退出并重新打开 Codex，再新建或 fork 任务。
只执行 `start` 不会让 Codex 自动使用代理。

macOS 托管模式默认允许最大 `1 GiB` 的 Responses 请求体。超过约 `480 MiB`
时会使用 Buffer 级图片替换，避免把超大请求转换成超过 Node.js 单字符串上限的
JavaScript 字符串。这个上限只解决本地代理入口；DeepSeek 最终收到的仍是
`file_id` 小请求。

### 手动运行

```bash
npm test
npm start
```

默认监听：

```text
http://127.0.0.1:17892
```

检查状态：

```powershell
npm run health
Invoke-RestMethod http://127.0.0.1:17892/__media_proxy/stats |
  ConvertTo-Json -Depth 5
```

统计中的 `incomingResponsesBytes` 和 `outgoingResponsesBytes` 分别表示改写前后
的 Responses 请求体字节数。`lastRequest` 保留最近一次请求的明细。

## 接入 Codex

### Windows 旧版脚本

Windows 继续提供原有的计划任务脚本。新的统一 `deepseek-proxy` 控制入口目前
只在 macOS 上实现。

在资源管理器中双击 `install.cmd`，或运行：

```powershell
.\scripts\install-autostart.ps1
```

安装脚本会：

1. 注册当前 Windows 用户的登录计划任务。
2. 立即启动隐藏的本地代理并等待健康检查通过。
3. 备份 `~/.codex/config.toml`。
4. 只把 `[model_providers.custom].base_url` 改成
   `http://127.0.0.1:17892`。
5. 保存安装信息，便于以后恢复原 provider 地址。

完成后重启 Codex 一次。以后正常登录 Windows，再点击 Codex，代理会在后台
自动启动，不需要打开终端。

查看状态：

```powershell
.\scripts\status.ps1
```

停止、启动或重启后台代理：

```powershell
.\scripts\service.ps1 stop
.\scripts\service.ps1 start
.\scripts\service.ps1 restart
```

卸载并恢复 Codex 原地址：

```powershell
.\uninstall.cmd
```

### 手动接入

先保持代理运行，再修改 `~/.codex/config.toml` 中现有的 provider：

```toml
[model_providers.custom]
base_url = "http://127.0.0.1:17892"
wire_api = "responses"
```

修改后重启 Codex，并新建或 fork 一个任务。Codex 会在任务创建时固定 provider
路由，已经打开的任务不一定会切换到本地代理。

手动接入不会改动计划任务或安装信息；仍然需要自行备份和修改 provider 地址。

## 工作方式

```text
Codex
  -> http://127.0.0.1:17892/responses
  -> 解压请求
  -> 递归查找 image_url: data:image/...
  -> SHA-256 去重
  -> 未命中时上传 DeepSeek POST /files
  -> image_url 替换为 file_id
  -> https://api.deepseek.com/responses
  -> 原样流式返回 SSE
```

本地会话文件不会被修改。改写只发生在每次将要发给 DeepSeek 的 HTTP 请求上。

## 配置

可以通过环境变量调整：

| 变量 | 默认值 | 说明 |
|---|---:|---|
| `MEDIA_PROXY_HOST` | `127.0.0.1` | 监听地址，不建议修改 |
| `MEDIA_PROXY_PORT` | `17892` | 本地端口 |
| `DEEPSEEK_BASE_URL` | `https://api.deepseek.com` | 上游地址 |
| `MEDIA_PROXY_FILE_TTL_SECONDS` | `2592000` | DeepSeek 文件 30 天过期；`0` 表示永久 |
| `MEDIA_PROXY_MAX_REQUEST_BYTES` | `268435456` | 手动运行时默认值；macOS 托管模式为 `1073741824` |
| `MEDIA_PROXY_UPLOAD_CONCURRENCY` | `4` | 单次请求并发上传数 |
| `MEDIA_PROXY_UPLOAD_RETRIES` | `3` | 上传重试次数 |
| `MEDIA_PROXY_ALLOW_INLINE_FALLBACK` | `false` | 上传失败时是否退回内联图片 |

默认选择失败即报错，避免在用户不知情时继续发送一个可能触发 413 的请求。

## 安全边界

- 服务默认且建议只绑定 `127.0.0.1`。
- 代理会转发 Codex 自带认证头，但不会把凭证写进日志或缓存。
- 缓存只保存账号凭证指纹、图片哈希、文件 ID、大小和过期时间。
- 图片内容不会写入代理缓存。
- DeepSeek Files API 会让图片成为账户侧文件；默认设置 30 天过期。

## 已知限制

- 目前只实现 HTTP Responses，不支持 WebSocket。
- 支持 PNG、JPEG、WebP 和 GIF，与 DeepSeek 当前图片格式一致。
- `file_id` 解决请求体字节数，不消除图片 token 和模型处理成本。
- DeepSeek 文件 ID 只属于 DeepSeek 账户，不能与 OpenAI 或其他 provider 混用。
- 当前没有桌面控制面板；状态通过本地 health/stats JSON 查看。
