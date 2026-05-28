#!/usr/bin/env node
// Apply targeted patches to vendor/hermes-web-ui's built server bundle.
// All edits are idempotent (a marker comment is searched for first).
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const SERVER_JS = resolve(ROOT, 'vendor/hermes-web-ui/dist/server/index.js')

const BRIDGE_PY = resolve(ROOT, 'vendor/hermes-web-ui/dist/server/agent-bridge/hermes_bridge.py')

if (!existsSync(SERVER_JS)) {
  console.error(`server bundle not found at ${SERVER_JS}`)
  process.exit(1)
}
if (!existsSync(BRIDGE_PY)) {
  console.error(`bridge script not found at ${BRIDGE_PY}`)
  process.exit(1)
}

let src = readFileSync(SERVER_JS, 'utf-8')
const before = src
let applied = 0
let skipped = 0

function patch(id, marker, find, replace) {
  if (typeof find === 'string' ? src.includes(marker) : marker.test(src)) {
    console.log(`  · ${id}  (already applied)`)
    skipped++
    return
  }
  if (typeof find === 'string') {
    if (!src.includes(find)) {
      console.log(`  ✗ ${id}  (anchor not found)`)
      return
    }
    src = src.replace(find, replace)
  } else {
    if (!find.test(src)) {
      console.log(`  ✗ ${id}  (regex anchor not matched)`)
      return
    }
    src = src.replace(find, replace)
  }
  console.log(`  ✓ ${id}`)
  applied++
}

console.log(`Patching ${SERVER_JS}`)

// Suppress the "请修改默认账户和密码" prompt — `currentUser` always returns
// requiresCredentialChange:false on desktop. The minified expression looks
// like `requiresCredentialChange:X.username===Y&&Fn(Z,X.password_hash)` —
// match the && verifyPassword(...) call including the inner comma so we
// don't truncate mid-expression and break the bundle.
patch(
  'webui-no-credential-change-prompt',
  /requiresCredentialChange:!1\b/,
  /requiresCredentialChange:[A-Za-z0-9_.$]+===[A-Za-z0-9_.$]+&&[A-Za-z0-9_.$]+\([^)]+\)/,
  'requiresCredentialChange:!1',
)

if (src !== before) writeFileSync(SERVER_JS, src)

// ── Patch the Python bridge script: force TCP worker endpoint on macOS too.
// Default is unix socket which macOS EDR/sandbox kills (same root cause as
// the broker SIGKILL we fixed by setting HERMES_AGENT_BRIDGE_ENDPOINT).
{
  console.log(`Patching ${BRIDGE_PY}`)
  let py = readFileSync(BRIDGE_PY, 'utf-8')
  const pyBefore = py
  const marker = '# patch:worker-tcp-everywhere'
  if (py.includes(marker)) {
    console.log(`  · worker-tcp-everywhere  (already applied)`)
  } else {
    // Match the whole `if os.name == "nt": ... else ipc:// fallback` branch
    // tolerant of any function signature changes upstream may make. We replace
    // just the platform branch with a single TCP return.
    const find = /(\n {4})if os\.name == "nt":\s*\n {8}port_base = int\(os\.environ\.get\("HERMES_AGENT_BRIDGE_WORKER_PORT_BASE", "18780"\)\)\s*\n {8}return f"tcp:\/\/127\.0\.0\.1:\{port_base \+ int\(safe\[:4\], 16\) % 1000\}"\s*\n {4}root = Path\(tempfile\.gettempdir\(\)\) \/ "hermes-agent-bridge-workers"\s*\n {4}return f"ipc:\/\/\{root \/ f'\{safe\}\.sock'\}"/
    const replace = `$1${marker}\n    # Always use TCP loopback for worker endpoints. Unix sockets in /tmp are\n    # rejected by some macOS EDR/sandbox setups when the broker is spawned\n    # from an unsigned Electron child, causing the worker to be SIGKILL'd\n    # before reporting ready. TCP works identically and is safe on all OSes.\n    port_base = int(os.environ.get("HERMES_AGENT_BRIDGE_WORKER_PORT_BASE", "18780"))\n    return f"tcp://127.0.0.1:{port_base + int(safe[:4], 16) % 1000}"`
    if (!find.test(py)) {
      console.log(`  ✗ worker-tcp-everywhere  (anchor not found)`)
    } else {
      py = py.replace(find, replace)
      console.log(`  ✓ worker-tcp-everywhere`)
      applied++
    }
  }
  if (py !== pyBefore) writeFileSync(BRIDGE_PY, py)
}

console.log(`Done. Applied ${applied}, skipped ${skipped}.`)
