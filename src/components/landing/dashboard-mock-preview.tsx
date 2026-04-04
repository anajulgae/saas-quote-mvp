import { cn } from "@/lib/utils"

/** 히어로용 앱 UI 목업 — 실제 데이터 없음 */
export function DashboardMockPreview({ className }: { className?: string }) {
  return (
    <div className={cn("relative lg:pl-2 lg:pr-1 lg:pb-2", className)}>
      {/* 아주 약한 뒤 레이어: 깊이만 살짝 */}
      <div
        className="pointer-events-none absolute inset-x-2 bottom-0 top-6 -z-10 hidden rounded-2xl border border-border/40 bg-muted/50 shadow-sm sm:block"
        aria-hidden
      />
      <div
        className={cn(
          "shadow-elevated relative overflow-hidden rounded-2xl border border-border/60 bg-card ring-1 ring-primary/[0.08]",
          "sm:shadow-[0_20px_50px_-12px_rgba(15,23,42,0.12)]"
        )}
        aria-hidden
      >
        {/* 플로팅 미니 패널 — 데스크톱만 */}
        <div className="absolute -left-1 top-10 z-10 hidden w-[5.5rem] rounded-xl border border-border/70 bg-card/95 p-2 shadow-md ring-1 ring-black/[0.04] backdrop-blur-sm sm:block">
          <p className="text-[9px] font-medium text-muted-foreground">오늘 후속</p>
          <p className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">3건</p>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full w-2/3 rounded-full bg-primary/80" />
          </div>
        </div>
        <div className="absolute right-3 top-3 z-10 hidden rounded-lg border border-primary/20 bg-primary/10 px-2 py-1 text-[9px] font-semibold text-primary shadow-sm sm:flex sm:items-center sm:gap-1">
          <span className="size-1.5 rounded-full bg-primary" />
          실시간 동기화
        </div>

        <div className="flex h-[min(460px,72vw)] min-h-[300px] text-[10px] sm:h-[480px] sm:text-[11px]">
          <div className="hidden w-[30%] shrink-0 border-r border-border/60 bg-muted/35 p-3 sm:block">
            <div className="mb-3 flex items-center gap-2">
              <div className="size-6 rounded-lg bg-primary/15 ring-1 ring-primary/20" />
              <div className="h-2 flex-1 max-w-[4.5rem] rounded-full bg-foreground/12" />
            </div>
            <div className="space-y-1.5">
              {["대시보드", "고객", "문의", "견적", "청구"].map((label, i) => (
                <div
                  key={label}
                  className={cn(
                    "rounded-lg px-2 py-1.5 font-medium text-muted-foreground",
                    i === 0 &&
                      "bg-background font-semibold text-foreground shadow-sm ring-1 ring-border/70"
                  )}
                >
                  {label}
                </div>
              ))}
            </div>
          </div>
          <div className="flex min-w-0 flex-1 flex-col bg-background">
            <div className="flex items-center justify-between border-b border-border/60 px-3 py-2.5 sm:px-4">
              <div>
                <div className="h-2 w-28 rounded-full bg-foreground/10 sm:w-36" />
                <div className="mt-1.5 h-1.5 w-16 rounded-full bg-foreground/5" />
              </div>
              <div className="flex items-center gap-1.5">
                <div className="hidden h-6 items-center rounded-md border border-border/60 bg-muted/30 px-2 text-[9px] font-medium text-muted-foreground sm:flex">
                  4월
                </div>
                <div className="h-7 w-7 rounded-lg bg-muted/80 ring-1 ring-border/50" />
                <div className="h-7 w-7 rounded-lg bg-muted/80 ring-1 ring-border/50" />
              </div>
            </div>

            <div className="grid flex-1 grid-rows-[auto_auto_1fr] gap-2.5 p-2.5 sm:gap-3 sm:p-3">
              <div className="grid gap-2.5 sm:grid-cols-2 sm:gap-3">
                <div className="rounded-xl border border-border/55 bg-gradient-to-b from-muted/25 to-card p-3 ring-1 ring-black/[0.02] sm:p-3.5">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-[10px] font-semibold text-muted-foreground sm:text-[11px]">
                      이번 달 청구 합계
                    </span>
                    <span className="rounded-full bg-primary/12 px-2 py-0.5 text-[9px] font-bold text-primary ring-1 ring-primary/15">
                      +12%
                    </span>
                  </div>
                  <div className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
                    ₩ 12,420,000
                  </div>
                  <p className="mt-0.5 text-[9px] text-muted-foreground">전월 대비</p>
                  <div className="mt-2.5 flex h-14 items-end gap-0.5 sm:h-16">
                    {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-t-[3px] bg-primary/80"
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border border-border/55 bg-card p-3 ring-1 ring-black/[0.02] sm:p-3.5">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-muted-foreground sm:text-[11px]">
                      청구 상태
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <span className="rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[9px] font-semibold text-foreground">
                      입금 대기 4
                    </span>
                    <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[9px] font-semibold text-primary ring-1 ring-primary/20">
                      선금 완료 2
                    </span>
                    <span className="rounded-full border border-primary/25 bg-primary/[0.08] px-2 py-0.5 text-[9px] font-semibold text-primary">
                      완납 5
                    </span>
                  </div>
                  <div className="mt-3 space-y-1.5 border-t border-border/50 pt-2.5">
                    {[
                      { n: "INV-1042", a: "₩ 1.8M", st: "잔금" },
                      { n: "INV-1041", a: "₩ 0.9M", st: "선금" },
                    ].map((row) => (
                      <div
                        key={row.n}
                        className="flex items-center justify-between gap-2 text-[9px] sm:text-[10px]"
                      >
                        <span className="font-medium text-foreground">{row.n}</span>
                        <span className="tabular-nums text-muted-foreground">{row.a}</span>
                        <span className="rounded bg-muted/50 px-1.5 py-0.5 text-[9px] text-muted-foreground">
                          {row.st}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border/55 bg-muted/15 p-2.5 ring-1 ring-border/40 sm:p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-muted-foreground sm:text-[11px]">
                    미수 · 후속
                  </span>
                  <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-amber-900">
                    확인 필요 2
                  </span>
                </div>
                {[
                  { t: "A사 견적서 발송", s: "선금 대기", c: "amber" as const },
                  { t: "B클리닉 청구", s: "잔금 미입금", c: "rose" as const },
                  { t: "C스튜디오 문의", s: "견적 초안", c: "slate" as const },
                ].map((row) => (
                  <div
                    key={row.t}
                    className="flex items-center justify-between gap-2 border-b border-border/40 py-1.5 last:border-0 last:pb-0"
                  >
                    <span className="truncate font-medium text-foreground">{row.t}</span>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold",
                        row.c === "amber" && "bg-amber-500/12 text-amber-900",
                        row.c === "rose" && "bg-rose-500/10 text-rose-900",
                        row.c === "slate" && "bg-slate-500/10 text-slate-800"
                      )}
                    >
                      {row.s}
                    </span>
                  </div>
                ))}
              </div>

              <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-dashed border-border/50 bg-muted/10 p-2.5 sm:p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-muted-foreground sm:text-[11px]">
                    최근 활동
                  </span>
                  <span className="text-[9px] text-muted-foreground">오늘</span>
                </div>
                <div className="space-y-2">
                  {[
                    { dot: "primary", line: "견적 #Q-218 승인됨", sub: "디자인 스튜디오 O" },
                    { dot: "muted", line: "청구 INV-1039 리마인드 발송", sub: "2일 전" },
                    { dot: "primary", line: "문의 ‘웹 리뉴얼’ 단계 변경", sub: "견적 발송" },
                  ].map((row, i) => (
                    <div key={i} className="flex gap-2">
                      <div
                        className={cn(
                          "mt-1 size-1.5 shrink-0 rounded-full",
                          row.dot === "primary" ? "bg-primary" : "bg-muted-foreground/35"
                        )}
                      />
                      <div className="min-w-0">
                        <p className="text-[9px] font-medium leading-tight text-foreground sm:text-[10px]">
                          {row.line}
                        </p>
                        <p className="text-[9px] text-muted-foreground">{row.sub}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
