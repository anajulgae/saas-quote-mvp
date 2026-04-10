import type { Metadata } from "next"

import { getAppSession } from "@/lib/auth"
import { submitSupportTicketAction } from "@/app/(app)/help/actions"
import { buttonVariants } from "@/components/ui/button-variants"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "문의 접수" }

export default async function HelpContactPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; e?: string }>
}) {
  const sp = await searchParams
  const session = await getAppSession()
  const defaultEmail = session?.user?.email ?? ""

  const errMsg: Record<string, string> = {
    category: "문의 유형을 선택해 주세요.",
    subject: "제목을 2~200자로 입력해 주세요.",
    body: "내용을 8자 이상 입력해 주세요.",
    email: "올바른 이메일을 입력해 주세요.",
    server: "접수 시스템에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.",
    db: "저장에 실패했습니다. 마이그레이션(support_tickets) 적용 여부를 확인해 주세요.",
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">문의 접수</h1>
      <p className="text-sm text-muted-foreground">
        유형을 고르고 제목·내용을 남겨 주세요. 로그인 중이면 계정과 연결됩니다. 답변은 이메일로 드립니다.
      </p>

      {sp.ok === "1" ? (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-950">
          접수되었습니다. 확인 후 연락드리겠습니다.
        </p>
      ) : null}
      {sp.e ? (
        <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-950">
          {errMsg[sp.e] ?? "접수에 실패했습니다."}
        </p>
      ) : null}

      <form action={submitSupportTicketAction} className="space-y-4 rounded-xl border border-border/60 bg-card p-4 shadow-sm">
        <div className="space-y-1">
          <label htmlFor="category" className="text-sm font-medium">
            문의 유형
          </label>
          <select
            id="category"
            name="category"
            required
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            defaultValue=""
          >
            <option value="" disabled>
              선택
            </option>
            <option value="general">일반 문의</option>
            <option value="bug">오류 신고</option>
            <option value="billing">결제·구독</option>
            <option value="feature">기능 제안</option>
            <option value="refund">환불</option>
            <option value="cancel">해지</option>
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="subject" className="text-sm font-medium">
            제목
          </label>
          <input
            id="subject"
            name="subject"
            required
            maxLength={200}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            placeholder="한 줄로 요약"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="body" className="text-sm font-medium">
            내용
          </label>
          <textarea
            id="body"
            name="body"
            required
            rows={6}
            maxLength={8000}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="재현 방법, 계정 이메일(로그인용), 기대 동작 등을 적어 주세요."
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="contact_email" className="text-sm font-medium">
            답변 받을 이메일
          </label>
          <input
            id="contact_email"
            name="contact_email"
            type="email"
            required
            defaultValue={defaultEmail}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          />
        </div>
        <button type="submit" className={cn(buttonVariants({ size: "lg" }), "h-11 w-full sm:w-auto")}>
          접수하기
        </button>
      </form>
    </div>
  )
}
