# Hermes Desktop

English · [中文](README.zh-CN.md)

All-in-one cross-platform desktop app for [Hermes Agent](https://github.com/NousResearch/hermes-agent).
Bundles a Python runtime + `hermes-agent` + [`hermes-web-ui`](https://github.com/EKKOLearnAI/hermes-web-ui)
into a single download — users don't need to install Python or Node.

![Hermes Desktop chat](docs/screenshot-chat.png)

## Acknowledgements

This project would not exist without two upstream projects, and the
maintainers behind them. Hermes Desktop is a packaging shell — almost
all of the user-visible surface comes from these two:

- **[Hermes Agent](https://github.com/NousResearch/hermes-agent)** by
  [Nous Research](https://nousresearch.com) — the self-improving AI
  agent that powers every conversation, tool call, skill, and gateway
  in this app. Hermes Desktop bundles it verbatim from PyPI.
- **[hermes-web-ui](https://github.com/EKKOLearnAI/hermes-web-ui)** by
  [EKKO Learn AI](https://github.com/EKKOLearnAI) — the Vue 3 +
  Koa multi-platform chat dashboard. Hermes Desktop vendors it as a git
  submodule and runs its server inside Electron.

If you find Hermes Desktop useful, please go give those repositories a
star — they're doing the hard work.

## Architecture

```
Electron Main (Node)
 ├─ Spawns vendored hermes-web-ui Koa server (ELECTRON_RUN_AS_NODE) on 127.0.0.1:8648
 │   └─ HERMES_BIN → bundled python's hermes CLI (gateway)
 └─ BrowserWindow loads http://127.0.0.1:8648 with auth token injected via preload
```

- Web UI: git submodule at `vendor/hermes-web-ui`
- Python: `python-build-standalone` extracted under `resources/python/<os>-<arch>/`
- `hermes-agent` is `pip install`ed into that bundled Python at build time

## Install

Grab the latest installer for your platform from
[GitHub Releases](https://github.com/sir1st/hermes-desktop/releases/latest):

| Platform | File |
|----------|------|
| macOS Apple Silicon | `Hermes-Desktop-<v>-arm64.dmg` |
| macOS Intel | `Hermes-Desktop-<v>-x64.dmg` |
| Windows x64 | `Hermes-Desktop-<v>-x64.exe` |
| Linux x64 | `Hermes-Desktop-<v>-x86_64.AppImage` / `.deb` |
| Linux arm64 | `Hermes-Desktop-<v>-arm64.AppImage` |

The app is **not code-signed yet** in v0.x. First-run hints:

- **macOS**: after dragging to `Applications`, run once:
  ```sh
  xattr -cr "/Applications/Hermes Desktop.app"
  ```
  Otherwise Gatekeeper says "已损坏" because the download has the
  `com.apple.quarantine` attribute and the binary is unsigned.
- **Windows**: SmartScreen will show "Unrecognized app" — click *More info → Run anyway*.

## Development

```sh
git clone --recurse-submodules https://github.com/sir1st/hermes-desktop
cd hermes-desktop
npm install

# One-time per machine: build vendored web-ui
cd vendor/hermes-web-ui && npm ci && npm run build && cd ../..

# One-time per (os, arch): fetch Python + install hermes-agent + apply patches
npm run prepare:python   # uses uv if available, else pip

npm run dev              # launches Electron with the dev build
```

`uv` is strongly recommended for `prepare:python` — pip on some networks/mirrors
silently hangs while uv resolves the full hermes-agent dep tree in seconds.

## Packaging

```sh
npm run dist:mac     # → release/Hermes Desktop-<version>-arm64.dmg + x64.dmg
npm run dist:win     # → release/...-x64.exe (NSIS)
npm run dist:linux   # → release/...-x64.AppImage + .deb
```

## Releases

CI in `.github/workflows/release.yml` builds the matrix on `vX.Y.Z` tags
and uploads to GitHub Releases. Each matrix job builds with `--publish never`
and uploads workflow artifacts; a final `publish` job downloads them and
creates one Release via `gh release create` (avoids electron-builder's
parallel-draft race). `electron-updater` auto-detects updates on next launch.

## Layout

```
hermes-desktop/
├── src/main/                  # Electron main process
├── src/preload/               # Renderer preload (token + auto-login)
├── vendor/hermes-web-ui/      # submodule, locked version
├── resources/python/          # CI / dev artifact, gitignored
├── patches/                   # README of curated upstream patches
├── scripts/
│   ├── fetch-python.mjs       # download python-build-standalone
│   ├── install-hermes.mjs     # uv pip install hermes-agent + relocatable launcher
│   ├── prune-python.mjs       # strip __pycache__/tests/idle/tkinter
│   ├── apply-hermes-patches.mjs   # local fixes to bundled hermes-agent
│   └── apply-webui-patches.mjs    # local fixes to bundled hermes-web-ui
└── electron-builder.yml
```

## Versions pinned

- `python-build-standalone`: `20260510`
- Python: `3.12.13`
- `hermes-agent`: `0.14.0`
- `hermes-web-ui`: tracked at the submodule's HEAD

Bump in `scripts/fetch-python.mjs`, `scripts/install-hermes.mjs`, and the submodule.

## License

Hermes Desktop itself is MIT. Bundled artifacts retain their upstream licenses:

- `hermes-agent` — MIT (Nous Research)
- `hermes-web-ui` — BSL-1.1 (EKKO Learn AI)
- `python-build-standalone` — Python Software Foundation License + others

See each project's repository for full terms.
