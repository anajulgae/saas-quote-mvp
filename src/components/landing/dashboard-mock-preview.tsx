import { cn } from "@/lib/utils"

/** 히어로용 앱 UI 목업 — 실제 데이터 없음 */
export function DashboardMockPreview({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border/80 bg-card shadow-[0_24px_48px_-12px_rgba(15,23,42,0.12)] ring-1 ring-black/5",
        className
      )}
      aria-hidden
    >
      <div className="flex h-[min(420px,70vw)] min-h-[280px] text-[11px] sm:h-[440px] sm:text-xs">
        <div className="hidden w-[28%] shrink-0 border-r border-border/70 bg-muted/40 p-3 sm:block">
          <div className="mb-3 h-2 w-16 rounded-full bg-foreground/15" />
          <div className="space-y-2">
            {["대시보드", "고객", "문의", "견적", "청구"].map((label, i) => (
              <div
                key={label}
                className={cn(
                  "rounded-lg px-2 py-1.5 font-medium text-muted-foreground",
                  i === 0 && "bg-background text-foreground shadow-sm ring-1 ring-border/80"
                )}
              >
                {label}
              </div>
            ))}
          </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col bg-background">
          <div className="flex items-center justify-between border-b border-border/70 px-3 py-2.5 sm:px-4">
            <div className="h-2 w-24 rounded-full bg-foreground/10 sm:w-32" />
            <div className="flex gap-1.5">
              <div className="h-7 w-7 rounded-lg bg-muted" />
              <div className="h-7 w-7 rounded-lg bg-muted" />
            </div>
          </div>
          <div className="grid flex-1 gap-3 p-3 sm:grid-cols-2 sm:gap-4 sm:p-4">
            <div className="rounded-xl border border-border/60 bg-muted/20 p-3 sm:p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[10px] font-semibold text-muted-foreground sm:text-xs">
                  이번 달 청구
                </span>
                <span className="rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800">
                  +12%
                </span>
              </div>
              <div className="mb-2 text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                ₩ 12.4M
              </div>
              <div className="flex h-16 items-end gap-1">
                {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t-sm bg-emerald-500/80"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-2 rounded-xl border border-border/60 p-3 sm:p-4">
              <div className="text-[10px] font-semibold text-muted-foreground sm:text-xs">
                미수·후속
              </div>
              {[
                { t: "A사 견적서 발송", s: "선금 대기", c: "amber" },
                { t: "B클리닉 청구", s: "잔금 미입금", c: "rose" },
                { t: "C스튜디오 문의", s: "견적 작성", c: "slate" },
              ].map((row) => (
                <div
                  key={row.t}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border/50 bg-muted/15 px-2 py-2"
                >
                  <span className="truncate font-medium text-foreground">{row.t}</span>
                  <span
                    className={cn(
                      "shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium",
                      row.c === "amber" && "bg-amber-500/15 text-amber-900",
                      row.c === "rose" && "bg-rose-500/12 text-rose-900",
                      row.c === "slate" && "bg-slate-500/12 text-slate-800"
                    )}
                  >
                    {row.s}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
