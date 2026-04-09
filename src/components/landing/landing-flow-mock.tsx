import { cn } from "@/lib/utils"

/** 사용 흐름 — 단계별로 실무 장면이 떠오르게 */
export function LandingFlowMock({ className }: { className?: string }) {
  const rows = [
    {
      k: "접수",
      v: "공개 폼 · 링크",
      scene: "고객이 휴대폰으로 요청 제출",
      tone: "primary" as const,
    },
    {
      k: "정리",
      v: "AI 요약 · 단계",
      scene: "문의 내용이 카드로 정리됨",
      tone: "muted" as const,
    },
    {
      k: "견적",
      v: "템플릿 · 초안",
      scene: "항목·금액을 빠르게 채움",
      tone: "muted" as const,
    },
    {
      k: "발송",
      v: "링크 · PDF · 직인",
      scene: "카톡·메일로 바로 전달",
      tone: "muted" as const,
    },
    {
      k: "청구",
      v: "공개 URL · 단계",
      scene: "승인 뒤 선금·잔금 청구",
      tone: "muted" as const,
    },
    {
      k: "수금",
      v: "입금 · 리마인드",
      scene: "연체 시 다음 연락 안 잊음",
      tone: "primary" as const,
    },
  ]

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[0_20px_48px_-14px_rgba(15,23,42,0.16)] ring-1 ring-black/[0.05]",
        className
      )}
      aria-hidden
    >
      <div className="border-b border-border/60 bg-muted/40 px-3 py-2">
        <div className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-rose-400/90" />
          <span className="size-2 rounded-full bg-amber-400/90" />
          <span className="size-2 rounded-full bg-emerald-400/90" />
          <span className="ml-2 text-[10px] font-bold text-muted-foreground">Bill-IO · 한 줄 흐름</span>
        </div>
      </div>
      <div className="divide-y divide-border/50 p-3">
        {rows.map((row) => (
          <div key={row.k} className="flex flex-col gap-1 py-2.5 first:pt-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{row.k}</span>
              <span
                className={cn(
                  "shrink-0 rounded-md px-2 py-1 text-[11px] font-bold",
                  row.tone === "primary"
                    ? "bg-primary/14 text-primary ring-1 ring-primary/22"
                    : "bg-muted/60 text-foreground"
                )}
              >
                {row.v}
              </span>
            </div>
            <p className="text-[10px] font-medium leading-snug text-muted-foreground">{row.scene}</p>
          </div>
        ))}
      </div>
      <div className="border-t border-border/50 bg-primary/[0.07] px-3 py-2.5">
        <p className="text-center text-[10px] font-bold text-primary">견적만 보내고 끝나지 않게 이어짐</p>
      </div>
    </div>
  )
}
