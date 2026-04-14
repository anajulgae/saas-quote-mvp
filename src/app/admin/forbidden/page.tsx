import Link from "next/link"

import { buttonVariants } from "@/components/ui/button-variants"
import { cn } from "@/lib/utils"

export default async function AdminForbiddenPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>
}) {
  const sp = await searchParams
  const reason = sp.reason

  const detail =
    reason === "demo"
      ? "데모 세션으로는 운영 콘솔에 접근할 수 없습니다."
      : reason === "db"
        ? "데이터베이스(Supabase)가 구성되지 않았습니다."
        : reason === "lookup"
          ? "권한 정보를 확인하지 못했습니다."
          : "이 영역은 Bill-IO 운영자(관리자)만 사용할 수 있습니다."

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
      <div className="max-w-md rounded-xl border border-zinc-200 bg-white p-8 text-center shadow-lg shadow-zinc-200/60">
        <h1 className="text-lg font-bold text-zinc-900">접근 거부</h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-600">{detail}</p>
        <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link href="/dashboard" className={cn(buttonVariants({ variant: "secondary" }), "w-full sm:w-auto")}>
            앱으로 돌아가기
          </Link>
          <Link href="/login" className={cn(buttonVariants({ variant: "outline" }), "w-full border-zinc-300 sm:w-auto")}>
            로그인
          </Link>
        </div>
      </div>
      <p className="text-center text-xs text-zinc-500">
        최초 운영자 지정: Supabase SQL —{" "}
        <code className="rounded bg-zinc-100 px-1 py-0.5 text-zinc-700">
          {"update public.users set is_admin = true, admin_role = 'owner' where email = '…';"}
        </code>
      </p>
    </div>
  )
}
