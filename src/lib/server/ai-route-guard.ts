import { NextResponse } from "next/server"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { assertAiFeatureAllowed, getAuthenticatedUserForApi, type ApiAuthOk } from "@/lib/server/api-auth"

export type AiRouteGuardOk = {
  auth: ApiAuthOk
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
}

export async function guardAiPost(): Promise<{ ok: true; ctx: AiRouteGuardOk } | { ok: false; response: NextResponse }> {
  const auth = await getAuthenticatedUserForApi()
  if (!auth.ok) {
    return { ok: false, response: NextResponse.json({ error: auth.message }, { status: auth.status }) }
  }
  const block = assertAiFeatureAllowed(auth)
  if (block) {
    return { ok: false, response: NextResponse.json({ error: block.message }, { status: block.status }) }
  }
  const supabase = await createServerSupabaseClient()
  if (!supabase) {
    return {
      ok: false,
      response: NextResponse.json({ error: "서버 구성을 확인할 수 없습니다." }, { status: 503 }),
    }
  }
  return { ok: true, ctx: { auth, supabase } }
}
