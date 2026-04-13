/**
 * CI/로컬 스모크: 브라우저 없이 Paddle 체크아웃 연동 필수 코드 존재 여부만 검증합니다.
 * 실제 카드 UI는 Paddle 샌드박스 + 로그인 세션에서 확인하세요.
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, "..")

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8")
}

const errors = []

const launcher = read("src/components/billing/paddle-checkout-launcher.tsx")
if (!launcher.includes("paddleInitializeDone")) {
  errors.push("paddle-checkout-launcher: paddleInitializeDone (Initialize 1회) 없음")
}
if (!launcher.includes('displayMode: "overlay"')) {
  errors.push("paddle-checkout-launcher: Initialize checkout displayMode overlay 없음")
}
if (!launcher.includes("Checkout.open")) {
  errors.push("paddle-checkout-launcher: Checkout.open 없음")
}

const paddle = read("src/lib/billing/providers/paddle-provider.ts")
if (!paddle.includes("paddleTrialEndsAtFromSubscription")) {
  errors.push("paddle-provider: 체험 종료일(next_billed_at) 동기화 함수 없음")
}

if (errors.length) {
  console.error("[verify-paddle-checkout] 실패:\n", errors.join("\n"))
  process.exit(1)
}

console.log("[verify-paddle-checkout] OK — Paddle 체크아웃·웹훅 동기화 코드 패턴 확인됨")
