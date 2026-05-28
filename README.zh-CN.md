# Hermes Desktop

[English](README.md) · 中文

为 [Hermes Agent](https://github.com/NousResearch/hermes-agent) 打造的全平台一体化桌面应用 ——
内置 Python 运行时 + `hermes-agent` + [`hermes-web-ui`](https://github.com/EKKOLearnAI/hermes-web-ui),
用户下载即用,无需自行安装 Python 或 Node。

![Hermes Desktop chat](docs/screenshot-chat.png)

<p align="center">
  <a href="docs/demo.mp4"><img src="docs/demo.gif" alt="Hermes Desktop 演示" width="720" /></a><br/>
  <em>Hermes Desktop ↔ 钉钉 ↔ DeepSeek 实录(50 秒)</em>
</p>

## 致谢

如果没有下面这两个上游项目,Hermes Desktop 根本不可能存在。这个仓库本身只是一个
打包壳,几乎所有用户能看到的界面、能力、对话体验,都来自:

- **[Hermes Agent](https://github.com/NousResearch/hermes-agent)** —— 由
  [Nous Research](https://nousresearch.com) 开发。能自我改进的 AI Agent,
  本应用所有的对话推理、工具调用、技能和消息平台 gateway 都由它驱动。
  Hermes Desktop 直接从 PyPI 原样打包它。
- **[hermes-web-ui](https://github.com/EKKOLearnAI/hermes-web-ui)** —— 由
  [EKKO Learn AI](https://github.com/EKKOLearnAI) 开发的 Vue 3 + Koa
  多平台聊天 Dashboard。Hermes Desktop 通过 git submodule 引入它,
  并把它的 Koa server 跑在 Electron 主进程下。

如果你觉得 Hermes Desktop 好用,**请去给上面这两个仓库点 Star** —— 真正干活的是它们。

## 架构

```
Electron Main (Node)
 ├─ 内嵌 hermes-web-ui Koa server (ELECTRON_RUN_AS_NODE) → 127.0.0.1:8648
 │   └─ HERMES_BIN → 内置 Python 的 hermes CLI (gateway / bridge)
 └─ BrowserWindow 加载 http://127.0.0.1:8648,preload 注入 token + 自动登录
```

- Web UI:`vendor/hermes-web-ui` git submodule
- Python:`python-build-standalone` 解压在 `resources/python/<os>-<arch>/`
- `hermes-agent`:在构建时 `pip install` 进内置 Python

## 安装

到 [GitHub Releases](https://github.com/sir1st/hermes-desktop/releases/latest)
下载对应平台的安装包:

| 平台 | 文件 |
|------|------|
| macOS Apple Silicon | `Hermes-Desktop-<v>-arm64.dmg` |
| macOS Intel | `Hermes-Desktop-<v>-x64.dmg` |
| Windows x64 | `Hermes-Desktop-<v>-x64.exe` |
| Linux x64 | `Hermes-Desktop-<v>-x86_64.AppImage` / `.deb` |
| Linux arm64 | `Hermes-Desktop-<v>-arm64.AppImage` |

v0.x 阶段**还没做代码签名**,首次启动按以下方式处理:

- **macOS**:把 dmg 里的 app 拖到「应用程序」后,在终端跑一次:
  ```sh
  xattr -cr "/Applications/Hermes Desktop.app"
  ```
  否则 Gatekeeper 会因为 `com.apple.quarantine` 隔离属性 + 未签名,
  弹「已损坏,无法打开」—— 这其实并没有损坏。
- **Windows**:SmartScreen 会提示「未识别的应用」,点 **更多信息 → 仍要运行**。

## 配置消息平台(钉钉为例)

打开 Hermes Desktop → 左侧「频道」→ DingTalk:

1. 填 **Client ID**、**Client Secret**(在钉钉开发者后台创建机器人时拿到)
2. (可选)**AI 卡片模板 ID** —— 不填则降级用 webhook 回复
3. **允许所有用户** 打开,或在「允许用户」里填 OpenID 白名单
4. 点保存,gateway 自动重启,几秒后会显示「已连接」

> 💡 v0.0.9 起内置 `GATEWAY_ALLOW_ALL_USERS=true` 默认值,所以单机使用
> 不需要再手工改 `~/.hermes/.env`。

## 开发

```sh
git clone --recurse-submodules https://github.com/sir1st/hermes-desktop
cd hermes-desktop
npm install

# 一次性:构建内嵌的 web-ui
cd vendor/hermes-web-ui && npm ci && npm run build && cd ../..

# 一次性(每平台/架构一次):下载 Python + 装 hermes-agent + 应用补丁
npm run prepare:python   # 优先用 uv,否则 fallback pip

npm run dev              # 用开发版构建启动 Electron
```

强烈推荐 `uv` —— 在某些公司 PyPI 镜像下,pip 解析 hermes-agent 的依赖图会
卡住几分钟没输出,uv 几秒就完事。

## 打包

```sh
npm run dist:mac     # → release/Hermes Desktop-<version>-arm64.dmg + x64.dmg
npm run dist:win     # → release/...-x64.exe (NSIS)
npm run dist:linux   # → release/...-x64.AppImage + .deb
```

## 发版

`.github/workflows/release.yml` 在打 `vX.Y.Z` tag 时自动构建 5 平台并发布
到 GitHub Releases。每个矩阵 job 用 `--publish never` 构建并上传 workflow
artifact;最后由一个 `publish` job 下载所有 artifact、用 `gh release create`
统一建 release(避免 electron-builder 并发产生多个 draft)。
`electron-updater` 会在下次启动时自动检查更新。

## 仓库结构

```
hermes-desktop/
├── src/main/                    # Electron 主进程
├── src/preload/                 # 渲染层 preload(token + 自动登录)
├── vendor/hermes-web-ui/        # 锁版本的 submodule
├── resources/python/            # CI / 本地构建产物,gitignore
├── patches/                     # 上游补丁说明
├── scripts/
│   ├── fetch-python.mjs         # 下载 python-build-standalone
│   ├── install-hermes.mjs       # uv pip install + 可重定位启动器 + run_agent symlink
│   ├── prune-python.mjs         # 删 __pycache__/tests/idle/tkinter
│   ├── apply-hermes-patches.mjs # 给 bundled hermes-agent 打本地补丁
│   └── apply-webui-patches.mjs  # 给 bundled hermes-web-ui 打本地补丁
└── electron-builder.yml
```

## 内置补丁清单(idempotent,可重复应用)

打包时给 hermes-agent 的 `gateway/platforms/dingtalk.py` 应用 6 个修复:

| ID | 解决什么 |
|----|----------|
| dt-pre-start | dingtalk-stream ≥ 0.24 启动时报 `_IncomingHandler.pre_start` 缺失 |
| dt-card-tpl-env | `card_template_id` 支持 `DINGTALK_CARD_TEMPLATE_ID` 环境变量回退 |
| dt-card-before-webhook | AI Card 在 session_webhook 校验之前先尝试,避免 DM 卡片走不通 |
| dt-dm-robot-code | DM 场景的 deliver model 补 `robot_code`(宽屏修复之一) |
| dt-card-autolayout | 通过 `sys_full_json_obj` 注入 `autoLayout=true`,解决 PC 端窄屏 |

打包时给 hermes-web-ui 的 `dist/server/index.js` + `hermes_bridge.py` 应用 2 个修复:

| ID | 解决什么 |
|----|----------|
| webui-no-credential-change-prompt | 桌面单机场景关闭「请修改默认密码」弹窗 |
| worker-tcp-everywhere | 桌面端 macOS 的 EDR/沙箱会 SIGKILL ipc:// unix socket;改全平台用 TCP loopback |

上游修了对应问题后,把 `apply-*-patches.mjs` 里相应条目删掉即可。

## 锁定版本

- `python-build-standalone`:`20260510`
- Python:`3.12.13`
- `hermes-agent`:`0.14.0`
- `hermes-web-ui`:跟随 submodule HEAD

升级时改 `scripts/fetch-python.mjs`、`scripts/install-hermes.mjs`,以及 submodule。

## 许可证

Hermes Desktop 本身 MIT 协议。打包进来的产物保留各自上游许可:

- `hermes-agent` —— MIT(Nous Research)
- `hermes-web-ui` —— BSL-1.1(EKKO Learn AI)
- `python-build-standalone` —— Python Software Foundation License + 其他

详见各上游仓库。
