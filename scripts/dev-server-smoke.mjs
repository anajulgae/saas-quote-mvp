/**
 * `next dev`를 잠깐 띄운 뒤 홈이 응답하는지 확인하고 종료합니다.
 * CI/에이전트에서 "npm run dev 가 돌아갈 수 있는지"만 검증할 때 사용합니다.
 */
import { spawn } from "node:child_process"
import { createRequire } from "node:module"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, "..")
const require = createRequire(path.join(root, "package.json"))
const nextBin = require.resolve("next/dist/bin/next")

const port = Number(process.env.DEV_SMOKE_PORT || "3999")
const timeoutMs = Number(process.env.DEV_SMOKE_TIMEOUT_MS || "120000")

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function tryFetch(url) {
  try {
    const res = await fetch(url, { redirect: "manual" })
    return res.status
  } catch {
    return 0
  }
}

const isWin = process.platform === "win32"
const child = spawn(process.execPath, [nextBin, "dev", "-p", String(port)], {
  cwd: root,
  stdio: ["ignore", "pipe", "pipe"],
  env: { ...process.env, NODE_ENV: "development" },
})

let log = ""
const append = (c) => {
  log += c.toString()
}
child.stdout?.on("data", append)
child.stderr?.on("data", append)

const start = Date.now()
let status = 0
while (Date.now() - start < timeoutMs) {
  status = await tryFetch(`http://127.0.0.1:${port}/`)
  if (status >= 200 && status < 500) break
  await sleep(400)
}

if (child.pid) {
  try {
    child.kill(isWin ? undefined : "SIGTERM")
  } catch {
    /* ignore */
  }
  if (isWin && child.pid) {
    try {
      spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], { shell: true, stdio: "ignore" })
    } catch {
      /* ignore */
    }
  }
}

if (!(status >= 200 && status < 500)) {
  console.error("[dev-server-smoke] 실패: HTTP", status, "timeout", timeoutMs + "ms")
  if (log.trim()) console.error(log.slice(-4000))
  process.exit(1)
}

console.log("[dev-server-smoke] OK — http://127.0.0.1:" + port + "/ →", status)
