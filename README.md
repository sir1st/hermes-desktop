# Hermes Desktop

All-in-one cross-platform desktop app for [Hermes Agent](https://github.com/NousResearch/hermes-agent).
Bundles a Python runtime + `hermes-agent` + [`hermes-web-ui`](https://github.com/EKKOLearnAI/hermes-web-ui)
into a single download — users don't need to install Python or Node.

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

## Development

```sh
git clone --recurse-submodules <this-repo>
cd hermes-desktop
npm install

# One-time per machine: build vendored web-ui
cd vendor/hermes-web-ui && npm ci && npm run build && cd ../..

# One-time per (os, arch): fetch Python + install hermes-agent
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

Configuration in `electron-builder.yml`. Signing is **disabled** in v0.x —
macOS users will need to right-click → Open the first time, Windows will
show a SmartScreen warning.

## Releases

CI in `.github/workflows/release.yml` builds the matrix on `vX.Y.Z` tags
and uploads to GitHub Releases. `electron-updater` auto-detects updates
on next launch.

## Layout

```
hermes-desktop/
├── src/main/             # Electron main process
├── src/preload/          # Renderer preload (token injection)
├── vendor/hermes-web-ui/ # submodule, locked version
├── resources/python/     # CI / dev artifact, gitignored
├── scripts/
│   ├── fetch-python.mjs
│   ├── install-hermes.mjs
│   └── prune-python.mjs
└── electron-builder.yml
```

## Versions pinned

- `python-build-standalone`: `20260510`
- Python: `3.12.13`
- `hermes-agent`: `0.14.0`
- `hermes-web-ui`: tracked at the submodule's HEAD

Bump in `scripts/fetch-python.mjs`, `scripts/install-hermes.mjs`, and the submodule.
