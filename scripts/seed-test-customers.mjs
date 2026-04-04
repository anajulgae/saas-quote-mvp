/**
 * 실제 Supabase DB에 테스트 고객 10명을 삽입합니다.
 *
 * 필요 환경 변수 (.env.local 권장, node --env-file 로 로드):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY  (Supabase 대시보드 → Project Settings → API → service_role)
 *
 * 대상 사용자 지정 (하나만 사용):
 *   SEED_TARGET_USER_ID=uuid
 *   또는 SEED_TARGET_USER_EMAIL=로그인이메일
 *   둘 다 없으면 Auth 사용자가 정확히 1명일 때 그 계정에만 넣습니다.
 *
 * 실행 (프로젝트 루트):
 *   node --env-file=.env.local scripts/seed-test-customers.mjs
 */

import { createClient } from "@supabase/supabase-js"
import { readFileSync, existsSync } from "fs"
import { resolve } from "path"

function loadEnvLocal() {
  const p = resolve(process.cwd(), ".env.local")
  if (!existsSync(p)) return
  const raw = readFileSync(p, "utf8")
  for (const line of raw.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eq = trimmed.indexOf("=")
    if (eq <= 0) continue
    const k = trimmed.slice(0, eq).trim()
    let v = trimmed.slice(eq + 1).trim()
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1)
    }
    if (process.env[k] === undefined) process.env[k] = v
  }
}

loadEnvLocal()

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const TEST_CUSTOMERS = [
  {
    name: "김민서",
    company_name: "테스트원 주식회사",
    phone: "010-2001-0001",
    email: "test.customer.01@example.com",
    notes: "시드 스크립트로 생성된 테스트 고객입니다.",
    tags: ["테스트"],
  },
  {
    name: "이도현",
    company_name: "블루핀 스튜디오",
    phone: "010-2001-0002",
    email: "test.customer.02@example.com",
    notes: "견적·청구 UI 테스트용",
    tags: ["테스트", "스튜디오"],
  },
  {
    name: "박지우",
    company_name: null,
    phone: "010-2001-0003",
    email: "test.customer.03@example.com",
    notes: null,
    tags: ["테스트"],
  },
  {
    name: "최서준",
    company_name: "노던랩",
    phone: "010-2001-0004",
    email: "test.customer.04@example.com",
    notes: "B2B 문의 패턴",
    tags: ["테스트", "B2B"],
  },
  {
    name: "정하은",
    company_name: "하은컴퍼니",
    phone: "010-2001-0005",
    email: "test.customer.05@example.com",
    notes: null,
    tags: ["테스트"],
  },
  {
    name: "강유진",
    company_name: null,
    phone: "010-2001-0006",
    email: "test.customer.06@example.com",
    notes: "개인 프리랜서",
    tags: ["테스트", "프리랜서"],
  },
  {
    name: "조시우",
    company_name: "시우마케팅",
    phone: "010-2001-0007",
    email: "test.customer.07@example.com",
    notes: null,
    tags: ["테스트", "마케팅"],
  },
  {
    name: "윤채원",
    company_name: "채원뷰티",
    phone: "010-2001-0008",
    email: "test.customer.08@example.com",
    notes: "뷰티 업종 샘플",
    tags: ["테스트", "뷰티"],
  },
  {
    name: "임준혁",
    company_name: "테크솔루션",
    phone: "010-2001-0009",
    email: "test.customer.09@example.com",
    notes: null,
    tags: ["테스트", "IT"],
  },
  {
    name: "한소율",
    company_name: "소율디자인",
    phone: "010-2001-0010",
    email: "test.customer.10@example.com",
    notes: "디자인 의뢰 샘플",
    tags: ["테스트", "디자인"],
  },
]

async function main() {
  if (!url || !serviceKey) {
    console.error(
      "[오류] NEXT_PUBLIC_SUPABASE_URL 과 SUPABASE_SERVICE_ROLE_KEY 가 필요합니다.\n" +
        "Supabase → Project Settings → API 에서 service_role 키를 복사해 .env.local 에만 넣으세요."
    )
    process.exit(1)
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  let userId = process.env.SEED_TARGET_USER_ID?.trim() || null

  if (!userId) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    })
    if (error) throw error
    const users = data.users

    const email = process.env.SEED_TARGET_USER_EMAIL?.trim().toLowerCase()
    if (email) {
      const found = users.find((u) => u.email?.toLowerCase() === email)
      if (!found) {
        console.error(`[오류] Auth에서 이메일을 찾을 수 없습니다: ${email}`)
        process.exit(1)
      }
      userId = found.id
    } else if (users.length === 1) {
      userId = users[0].id
      console.log(`[안내] Auth 사용자 1명만 있어 해당 계정에 삽입합니다: ${users[0].email ?? userId}`)
    } else {
      console.error(
        "[오류] 대상 계정을 지정하세요.\n" +
          "  SEED_TARGET_USER_EMAIL=로그인이메일\n" +
          "  또는 SEED_TARGET_USER_ID=uuid\n" +
          `(현재 Auth 사용자 ${users.length}명)`
      )
      process.exit(1)
    }
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("id")
    .eq("id", userId)
    .maybeSingle()

  if (profileError) throw profileError
  if (!profile) {
    console.error(
      "[오류] public.users 에 해당 사용자가 없습니다. 운영 앱에 한 번 로그인한 뒤 다시 실행하세요."
    )
    process.exit(1)
  }

  const { data: existing, error: countError } = await supabase
    .from("customers")
    .select("email")
    .eq("user_id", userId)
    .in(
      "email",
      TEST_CUSTOMERS.map((c) => c.email)
    )

  if (countError) throw countError
  const existingEmails = new Set((existing ?? []).map((r) => r.email))
  const toInsert = TEST_CUSTOMERS.filter((c) => !existingEmails.has(c.email)).map((c) => ({
    user_id: userId,
    name: c.name,
    company_name: c.company_name,
    phone: c.phone,
    email: c.email,
    notes: c.notes,
    tags: c.tags,
  }))

  if (toInsert.length === 0) {
    console.log("[완료] 동일한 테스트 이메일의 고객이 이미 있어 추가하지 않았습니다.")
    return
  }

  const { data: inserted, error: insertError } = await supabase
    .from("customers")
    .insert(toInsert)
    .select("id, name, email")

  if (insertError) throw insertError

  console.log(`[완료] 고객 ${inserted.length}명 삽입 (user_id=${userId})`)
  for (const row of inserted ?? []) {
    console.log(`  - ${row.name} <${row.email}> (${row.id})`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
