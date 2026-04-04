import { redirect } from "next/navigation"

import { getAppSession } from "@/lib/auth"

/** 미들웨어와 동일한 기준으로 진입 경로를 나눕니다. (이 페이지가 렌더되면 빈 화면이 되지 않도록 redirect만 수행) */
export default async function HomePage() {
  const session = await getAppSession()

  if (session) {
    redirect("/dashboard")
  }

  redirect("/login")
}
