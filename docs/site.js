const copyToast = document.querySelector("#copy-toast");
const translations = {
  "zh-CN": {
    skip: "跳到主要内容", navLabel: "主导航", navHow: "工作原理", navDownload: "下载安装", navFaq: "常见问题",
    eyebrow: "为 Codex × DeepSeek 而做", heroLine1: "图片还在。", heroLine2: "请求更轻。",
    heroDescription: "把已上传的历史图片换成 DeepSeek 文件引用。让长图片会话继续向前，少被 413 打断。",
    downloadMac: "下载 macOS 版", downloadWindows: "下载 Windows 版", scriptPackages: "脚本安装包", viewInstall: "查看安装步骤 ↘",
    pointLocal: "本机运行", pointQuality: "原始图片画质", pointControl: "随时恢复直连",
    heroArtAlt: "历史 A 和新 B 仍从 Codex 发到代理；A 复用旧 ID，B 上传获得新 ID，DeepSeek 读取两个文件",
    artCurrent: "下一轮请求", artHistory: "历史图片", artNew: "新图片", artLocalHop: "Codex → 本机代理，仍携带图片字节", artProxy: "本机图片缓存代理", artHit: "命中已有上传", artReuse: "复用", artUpload: "上传至 /files", artReturns: "DS 返回", artUpstreamHop: "代理 → DeepSeek，图片改用文件引用", artResolves: "DeepSeek 读取已存图片，模型仍能理解 A 和 B。", artFootnote: "文件 ID 由 DeepSeek 生成，哈希只负责查找。",
    proofLabel: "一次真实会话的观测结果", proofEyebrow: "来自一次真实图片会话", proofScope: "比较改写前后的上游 Responses 请求体；不含单独的图片文件上传。", metricReduction: "单次请求体减少", metricImagesUnit: " 张", metricImages: "该次请求中的图片", metricQuality: "保留全部图片输入", metricHits: "累计图片缓存复用次数", metricSample: "455 次请求的观测样本",
    howEyebrow: "01 / 原理", howTitle: "DeepSeek 已有能力，代理接上流程。", howIntro: "当前接入路径会再次发送历史 Base64 图片。代理补齐上传、记住 ID、下次复用这三个环节。",
    step1Title: "首次出现，上传原图", step1Body: "代理解码并计算图片哈希。没有有效映射时，调用 DeepSeek Files API 上传原始字节。", step2Title: "DeepSeek 返回文件 ID", step2Body: "DeepSeek 保存图片并返回 id。代理在本机持久化“凭证指纹 + 图片哈希 → file_id”。", step3Title: "历史再出现，直接复用", step3Body: "下一轮的 A 命中旧记录，只上传新 B。Responses 改用两个文件 ID，DeepSeek 依然读取完整图片。",
    diagramKicker: "完整生命周期图", diagramTitle: "跟着同一张 A，看两轮请求如何变化", diagramCaption: "“重复”指当前请求再次携带与历史上传字节完全相同的图片。重启保留映射；默认请求 30 天有效期，过期后在图片下次出现时重新上传。", diagramOpen: "打开完整大图 ↗",
    downloadEyebrow: "02 / 下载", downloadTitle: "选好平台，就能开始。", downloadIntro: "开源、无额外 npm 依赖。先准备 Node.js 22.15+ 和已配置 DeepSeek 的 Codex。", macType: "LaunchAgent · 统一控制命令", macDescription: "安装时启动本机代理、备份 Codex 配置并接入代理路由。登录后自动启动。", macArchive: "正式发布包 · 含 install.sh", checksum: "SHA-256 校验", macSteps: "查看 macOS 安装步骤 →", winType: "PowerShell · 计划任务脚本", winDescription: "下载正式 Windows ZIP，使用 pixelpass.cmd 完成安装、状态检查和恢复直连。计划任务在登录后启动。", winArchive: "正式发布包 · 含 pixelpass.cmd", winScript: "Windows 脚本支持", winSteps: "查看 Windows 安装步骤 →", downloadNote: "两种下载都是独立发布包，包含可阅读的安装脚本；需 Node.js 运行环境。安装后请保留解压目录。", allReleases: "所有版本 ↗",
    quickTitle: "从下载到接入，只需三步。", platformLabel: "安装平台", macStep1: "解压并打开终端", macStep1Body: "解压下载的 TAR.GZ，将得到的 pixelpass 文件夹放到固定位置。在这个文件夹内打开终端。", macStep2: "运行安装脚本", macStep2Body: "脚本会备份配置、启动代理，并把当前 DeepSeek provider 的 base_url 指向本机。", restartTitle: "重开 Codex，再检查状态", macStep3Body: "完全退出并重新打开 Codex，然后新建或 fork 一个任务。检查代理和路由：", copy: "复制", restoreTitle: "需要恢复直连？", macRestore: "恢复 Codex 直连并关闭代理。再次启用用 ./pixelpass on，之后重开 Codex。",
    winStep1: "解压并打开 PowerShell", winStep1Body: "将 ZIP 解压到固定目录，在解压后的项目文件夹打开 PowerShell。确认 node.exe 已在 PATH 中。", winStep2: "指定已有 provider，运行安装", winStep2Body: "把 custom 换成 Codex config.toml 中 DeepSeek provider 的实际名称。脚本会注册计划任务、备份并修改该 provider 的地址。", winStep3Body: "完全退出并重新打开 Codex，再新建或 fork 任务。在项目目录检查代理和路由：", winRestore: "关闭代理并按安装记录恢复 Codex 配置，之后重开 Codex。stop 只停止服务，不恢复路由。", prerequisiteLabel: "准备好环境：", providerGuide: "DeepSeek provider 配置与完整文档 ↗",
    faqEyebrow: "03 / 你可能还想知道", faqTitle: "开始之前，心里有底。", issueLink: "反馈问题 ↗", faq1Q: "它压缩图片，还是删除历史？", faq1A: "它将本机发往 DeepSeek Responses 的 Base64 图片改成文件引用。图片字节、画质和消息位置保留；模型仍能读取图片，视觉 token 不会因此减少。Codex 到本机这一段仍可能携带完整 Base64。", faq2Q: "什么算重复图片？file_id 从哪里来？", faq2A: "重复指当前请求中的图片与历史上传图片的字节完全相同。SHA-256 仅用于本地查找；file_id 来自 DeepSeek /files 上传响应中的 id。重新压缩后，即使肉眼相似，也可能无法命中。", faq3Q: "重启、到期或者上传失败会怎样？", faq3A: "重启会保留本地映射。默认请求文件 30 天后过期，以 DeepSeek 返回的到期时间为准；到期后在图片再次出现时重新上传。可重试上传默认最多重试 3 次，最终失败终止该请求。远端文件被提前删除时，当前版本不会自动修复旧 ID，需要处理本地缓存。", faq4Q: "macOS 和 Windows 的支持一样吗？", faq4A: "两者使用同一 Node.js 代理核心。macOS 提供 LaunchAgent 和 pixelpass on/off/status，托管入口默认 1 GiB；Windows 使用 PowerShell、计划任务和 pixelpass.cmd 提供相同日常入口，入口默认 256 MiB。Windows 发布任务会在 windows-latest 上实际执行安装、健康检查、停止、启动和恢复直连。", faq5Q: "需要把 API Key 再交给这个网页吗？", faq5A: "不需要。网页只是项目介绍和下载入口。代理运行在本机，默认只监听 127.0.0.1，沿用 Codex 请求中的凭证。本地缓存保存凭证指纹、图片哈希、文件 ID 与有效期，不保存图片本体。",
    closingTitle: "下一轮，让历史图片轻一点。", closingCta: "选择平台并下载", footerNote: "开源 · MIT License · 社区项目", fullDocs: "完整文档", releaseNotes: "版本记录"
  },
  en: {
    skip: "Skip to main content", navLabel: "Main navigation", navHow: "How it works", navDownload: "Download", navFaq: "FAQ",
    eyebrow: "For Codex × DeepSeek", heroLine1: "The images stay.", heroLine2: "The request gets lighter.",
    heroDescription: "Turn historical uploads into DeepSeek file references. Keep long image sessions moving without another 413 interruption.",
    downloadMac: "Download for macOS", downloadWindows: "Download for Windows", scriptPackages: "Script-based packages", viewInstall: "See install steps ↘",
    pointLocal: "Runs locally", pointQuality: "Original image quality", pointControl: "Direct route anytime",
    heroArtAlt: "Historical image A and new image B reach the proxy from Codex; A reuses an old ID, B gets a new ID, and DeepSeek resolves both files",
    artCurrent: "NEXT REQUEST", artHistory: "history", artNew: "new", artLocalHop: "Codex → localhost, image bytes still arrive", artProxy: "LOCAL IMAGE CACHE PROXY", artHit: "existing upload", artReuse: "reuse", artUpload: "upload to /files", artReturns: "DS returns", artUpstreamHop: "proxy → DeepSeek, images become file references", artResolves: "DeepSeek resolves the stored images; the model still understands A and B.", artFootnote: "DeepSeek generates file IDs. The hash only finds the mapping.",
    proofLabel: "Observed results from one real session", proofEyebrow: "FROM A REAL IMAGE SESSION", proofScope: "Upstream Responses bodies before and after rewrite; separate file uploads are excluded.", metricReduction: "smaller request body", metricImagesUnit: " images", metricImages: "in that request", metricQuality: "all image inputs preserved", metricHits: "cached image reuses", metricSample: "455-request observation",
    howEyebrow: "01 / HOW IT WORKS", howTitle: "DeepSeek already has the capability. The proxy connects it.", howIntro: "The current integration path sends historical Base64 images again. The proxy adds upload, ID persistence, and reuse on the next request.",
    step1Title: "First sight: upload the original", step1Body: "The proxy decodes the image and computes its hash. Without an active mapping, it uploads the original bytes through DeepSeek Files API.", step2Title: "DeepSeek returns the file ID", step2Body: "DeepSeek stores the image and returns an id. The proxy persists credential fingerprint + image hash → file_id locally.", step3Title: "History returns: reuse it", step3Body: "A hits its previous mapping; only new B is uploaded. Responses uses both file IDs, and DeepSeek still resolves the full images.",
    diagramKicker: "FULL LIFECYCLE", diagramTitle: "Follow the same A across two requests", diagramCaption: "A duplicate means the current request carries bytes identical to an earlier upload. Restart keeps the mapping; the default requested lifetime is 30 days, then the next appearance uploads again.", diagramOpen: "Open full diagram ↗",
    downloadEyebrow: "02 / DOWNLOAD", downloadTitle: "Choose a platform and start.", downloadIntro: "Open source, with no extra npm dependencies. Prepare Node.js 22.15+ and a DeepSeek provider configured in Codex.", macType: "LaunchAgent · unified controls", macDescription: "Starts the local proxy, backs up Codex configuration, and routes the provider through localhost. Starts again at login.", macArchive: "Release package · includes install.sh", checksum: "SHA-256 checksum", macSteps: "See macOS install steps →", winType: "PowerShell · Task Scheduler scripts", winDescription: "Download the dedicated Windows ZIP, then use pixelpass.cmd to install, inspect, or restore direct routing. Task Scheduler starts it at sign-in.", winArchive: "Release package · includes pixelpass.cmd", winScript: "Windows support", winSteps: "See Windows install steps →", downloadNote: "Both downloads are dedicated release packages with readable scripts and require Node.js. Keep the extracted folder in place.", allReleases: "All releases ↗",
    quickTitle: "From download to connected, in three steps.", platformLabel: "Install platform", macStep1: "Extract and open Terminal", macStep1Body: "Extract the TAR.GZ and place the pixelpass folder somewhere permanent. Open Terminal in that folder.", macStep2: "Run the installer", macStep2Body: "The script backs up configuration, starts the proxy, and points the current DeepSeek provider base_url at localhost.", restartTitle: "Restart Codex and check status", macStep3Body: "Fully quit and reopen Codex, then create or fork a task. Check the proxy and route:", copy: "Copy", restoreTitle: "Need the direct route again?", macRestore: "Run ./pixelpass off to restore direct Codex traffic and stop the proxy. Re-enable with ./pixelpass on, then restart Codex.",
    winStep1: "Extract and open PowerShell", winStep1Body: "Extract the ZIP to a permanent folder and open PowerShell there. Make sure node.exe is on PATH.", winStep2: "Choose the existing provider and install", winStep2Body: "Replace custom with the actual DeepSeek provider name in Codex config.toml. The script registers a task, backs up config, and changes that provider URL.", winStep3Body: "Fully quit and reopen Codex, then create or fork a task. Check the proxy and route from the project folder:", winRestore: "Run .\\pixelpass.cmd off to stop the proxy and restore the recorded Codex route, then restart Codex. stop only stops the service.", prerequisiteLabel: "Prepare:", providerGuide: "DeepSeek provider setup and full docs ↗",
    faqEyebrow: "03 / BEFORE YOU START", faqTitle: "Know what will happen.", issueLink: "Report an issue ↗", faq1Q: "Does it compress images or delete history?", faq1A: "It changes Base64 images sent from localhost to DeepSeek Responses into file references. Image bytes, quality, and message positions remain; the model still reads the images, and visual token usage does not decrease. Codex may still send full Base64 to localhost.", faq2Q: "What counts as a duplicate? Where does file_id come from?", faq2A: "A duplicate has bytes identical to an image uploaded in an earlier request. SHA-256 is only the local lookup key; file_id comes from the id in DeepSeek's /files upload response. Re-encoding can miss even when images look alike.", faq3Q: "What happens after restart, expiry, or upload failure?", faq3A: "Restart keeps the local mapping. The default requested file lifetime is 30 days, subject to DeepSeek's returned expiry; after expiry the next appearance uploads again. Uploads retry up to three times by default, then the request stops. Early remote deletion is not automatically repaired in the current version.", faq4Q: "Are macOS and Windows supported the same way?", faq4A: "Both use the same Node.js proxy core. macOS has LaunchAgent plus pixelpass on/off/status and a 1 GiB managed entry limit. Windows uses PowerShell, Task Scheduler, and pixelpass.cmd for the same everyday actions, with a 256 MiB default entry limit. The Windows release job executes install, health, stop, start, and direct-route restoration on windows-latest.", faq5Q: "Do I need to enter an API key on this page?", faq5A: "No. This page is only the project guide and download entry. The proxy runs locally on 127.0.0.1 and uses credentials already sent by Codex. The local cache stores a credential fingerprint, image hash, file ID, and expiry, not the image itself.",
    closingTitle: "Next request, lighter history.", closingCta: "Choose a platform", footerNote: "Open source · MIT License · Community project", fullDocs: "Full docs", releaseNotes: "Releases"
  }
};

let savedLang;
try { savedLang = localStorage.getItem("pixelpass-language"); } catch { /* Storage can be disabled. */ }
const requestedLang = new URLSearchParams(location.search).get("lang");
let currentLang = requestedLang || savedLang || (navigator.language.startsWith("zh") ? "zh-CN" : "en");
if (!translations[currentLang]) currentLang = "zh-CN";

function setText(lang) {
  const strings = translations[lang];
  document.documentElement.lang = lang;
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const value = strings[el.dataset.i18n];
    if (value !== undefined) el.textContent = value;
  });
  document.querySelectorAll("[data-i18n-aria]").forEach((el) => {
    const value = strings[el.dataset.i18nAria];
    if (value !== undefined) el.setAttribute("aria-label", value);
  });
  document.querySelectorAll("[data-lang]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.lang === lang));
  });
  const stem = "assets/deepseek-image-cache-proxy." + lang;
  const source = document.querySelector("[data-lifecycle-picture] source");
  const image = document.querySelector("[data-lifecycle-picture] img");
  if (source) source.srcset = stem + "-lifecycle-mobile.png";
  if (image) {
    image.src = stem + "-lifecycle.png";
    image.alt = lang === "zh-CN" ? "图片 A 首次上传，DeepSeek 返回 file_A，下一轮历史 A 复用旧 ID，新 B 单独上传获得 file_B；缓存到期后再上传" : "Image A is uploaded first and DeepSeek returns file_A; the next request reuses A, uploads new B as file_B, and uploads A again after expiry";
  }
  const diagram = document.querySelector("[data-full-diagram]");
  if (diagram) diagram.href = stem + "-lifecycle.png";
  document.querySelectorAll("[data-readme]").forEach((link) => {
    link.href = lang === "en" ? "https://github.com/aPuffdog/pixelpass/blob/main/README.en.md" : "https://github.com/aPuffdog/pixelpass#readme";
  });
  document.querySelector("meta[name=description]").content = lang === "en"
    ? "Add DeepSeek file upload and reference reuse to Codex image sessions. Download script-based packages for macOS and Windows."
    : "为 Codex 接上 DeepSeek 图片上传与文件引用复用流程，减少历史图片造成的 Responses 请求体膨胀。支持 macOS 与 Windows 脚本安装。";
  document.title = lang === "zh-CN" ? "DeepSeek Image Cache Proxy — 图片还在，请求更轻" : "DeepSeek Image Cache Proxy — Keep the image, lighten the request";
  try { localStorage.setItem("pixelpass-language", lang); } catch { /* Preference stays in memory. */ }
  const url = new URL(location.href);
  url.searchParams.set("lang", lang);
  try { history.replaceState(null, "", url); } catch { /* Local file previews may deny history changes. */ }
  currentLang = lang;
}

function selectPlatform(platform) {
  document.querySelectorAll("[data-platform]").forEach((tab) => {
    const selected = tab.dataset.platform === platform;
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
  });
  document.querySelectorAll("[role=tabpanel]").forEach((panel) => {
    panel.hidden = panel.id !== "panel-" + platform;
  });
}

document.querySelectorAll("[data-lang]").forEach((button) => button.addEventListener("click", () => setText(button.dataset.lang)));
document.querySelectorAll("[data-platform]").forEach((tab) => tab.addEventListener("click", () => selectPlatform(tab.dataset.platform)));
document.querySelectorAll("[data-select-platform]").forEach((link) => link.addEventListener("click", () => selectPlatform(link.dataset.selectPlatform)));
document.querySelectorAll("[data-copy]").forEach((button) => button.addEventListener("click", async () => {
  const text = document.querySelector("#" + button.dataset.copy)?.textContent || "";
  try {
    await navigator.clipboard.writeText(text);
    copyToast.textContent = currentLang === "zh-CN" ? "命令已复制" : "Command copied";
  } catch {
    const code = document.querySelector("#" + button.dataset.copy);
    const range = document.createRange();
    range.selectNodeContents(code);
    const selection = getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    copyToast.textContent = currentLang === "zh-CN" ? "自动复制不可用，命令已选中，请按 ⌘C / Ctrl+C" : "Clipboard unavailable. Command selected; press ⌘C / Ctrl+C.";
  }
  copyToast.classList.add("is-visible");
  setTimeout(() => copyToast.classList.remove("is-visible"), 1800);
}));
document.querySelectorAll("[role=tab]").forEach((tab) => tab.addEventListener("keydown", (event) => {
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
  event.preventDefault();
  const tabs = [...document.querySelectorAll("[role=tab]")];
  const next = event.key === "Home" ? tabs[0] : event.key === "End" ? tabs.at(-1) : tabs[(tabs.indexOf(tab) + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length];
  selectPlatform(next.dataset.platform);
  next.focus();
}));
setText(currentLang);
selectPlatform(/Windows/i.test(navigator.userAgent) ? "windows" : "macos");
