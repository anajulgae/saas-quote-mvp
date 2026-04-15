"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { CalendarClock, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

import { saveRecurringSeriesAction, deleteRecurringSeriesAction } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/format"
import type { RecurringSeries } from "@/lib/data"

type SeriesForm = {
  id?: string
  customerId: string
  name: string
  enabled: boolean
  documentType: string
  frequency: string
  dayOfMonth: number
  amount: number
  title: string
  notes: string
  invoiceType: string
  nextRunDate: string
  maxRuns: number | null
}

const emptyForm: SeriesForm = {
  customerId: "",
  name: "",
  enabled: true,
  documentType: "invoice",
  frequency: "monthly",
  dayOfMonth: 1,
  amount: 0,
  title: "",
  notes: "",
  invoiceType: "final",
  nextRunDate: new Date().toISOString().slice(0, 10),
  maxRuns: null,
}

const FREQ_LABELS: Record<string, string> = {
  weekly: "매주",
  biweekly: "격주",
  monthly: "매월",
  quarterly: "매분기",
  yearly: "매년",
}

export function RecurringSeriesPanel({
  series: initialSeries,
  customers,
  allowed,
  currentPlan,
}: {
  series: RecurringSeries[]
  customers: { id: string; label: string }[]
  allowed: boolean
  currentPlan: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [editing, setEditing] = useState<SeriesForm | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<RecurringSeries | null>(null)

  if (!allowed) {
    return (
      <Card className="border-dashed border-border/70 bg-muted/10">
        <CardContent className="flex flex-col gap-3 p-6 text-center">
          <CalendarClock className="mx-auto size-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            반복 견적/청구 자동화는 <strong>Pro 이상 플랜</strong>에서 이용할 수 있습니다.
          </p>
          <Link href="/billing" className={cn(buttonVariants({ size: "sm" }), "mx-auto")}>
            플랜 업그레이드
          </Link>
        </CardContent>
      </Card>
    )
  }

  function openNew() {
    setEditing({ ...emptyForm, customerId: customers[0]?.id ?? "" })
  }

  function openEdit(s: RecurringSeries) {
    setEditing({
      id: s.id,
      customerId: s.customerId,
      name: s.name,
      enabled: s.enabled,
      documentType: s.documentType,
      frequency: s.frequency,
      dayOfMonth: s.dayOfMonth,
      amount: s.amount,
      title: s.title,
      notes: s.notes,
      invoiceType: s.invoiceType,
      nextRunDate: s.nextRunDate,
      maxRuns: s.maxRuns,
    })
  }

  function handleSave() {
    if (!editing || !editing.customerId) {
      toast.error("고객을 선택해 주세요.")
      return
    }
    startTransition(async () => {
      const result = await saveRecurringSeriesAction(editing)
      if (result.ok) {
        toast.success(editing.id ? "시리즈를 수정했습니다." : "시리즈를 추가했습니다.")
        setEditing(null)
        router.refresh()
      } else {
        toast.error(result.error ?? "저장에 실패했습니다.")
      }
    })
  }

  function handleDelete() {
    if (!deleteTarget) return
    startTransition(async () => {
      const result = await deleteRecurringSeriesAction(deleteTarget.id)
      if (result.ok) {
        toast.success("시리즈를 삭제했습니다.")
        setDeleteTarget(null)
        router.refresh()
      } else {
        toast.error(result.error ?? "삭제에 실패했습니다.")
      }
    })
  }

  return (
    <>
      <Card className="border-border/70">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div>
            <CardTitle className="text-base font-semibold">반복 시리즈</CardTitle>
            <CardDescription className="text-xs">
              설정된 주기에 맞춰 매일 오전 6시에 자동으로 견적/청구를 생성합니다.
            </CardDescription>
          </div>
          <Button size="sm" className="gap-1.5" onClick={openNew} disabled={customers.length === 0}>
            <Plus className="size-3.5" />
            시리즈 추가
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {customers.length === 0 && (
            <p className="text-sm text-muted-foreground">먼저 고객을 등록해 주세요.</p>
          )}
          {initialSeries.length === 0 && customers.length > 0 ? (
            <div className="rounded-xl border border-dashed border-border/60 bg-muted/15 px-4 py-8 text-center">
              <CalendarClock className="mx-auto size-6 text-muted-foreground/40" />
              <p className="mt-2 text-sm text-muted-foreground">등록된 반복 시리즈가 없습니다.</p>
              <Button variant="outline" size="sm" className="mt-3 gap-1.5" onClick={openNew}>
                <Plus className="size-3.5" />
                첫 시리즈 만들기
              </Button>
            </div>
          ) : (
            initialSeries.map((s) => (
              <div
                key={s.id}
                className={cn(
                  "flex items-center gap-3 rounded-xl border p-3 transition-colors",
                  s.enabled ? "border-border/70 bg-card" : "border-border/40 bg-muted/20 opacity-60"
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{s.name || "이름 없는 시리즈"}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.customerLabel} · {s.documentType === "invoice" ? "청구" : "견적"} ·{" "}
                    {FREQ_LABELS[s.frequency] || s.frequency} · {formatCurrency(s.amount)} ·{" "}
                    다음 실행: {s.nextRunDate} · 총 {s.totalRuns}회 실행
                    {s.maxRuns != null ? ` / 최대 ${s.maxRuns}회` : ""}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => openEdit(s)}>
                  수정
                </Button>
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDeleteTarget(s)}>
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Edit/Create Dialog */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "시리즈 수정" : "새 반복 시리즈"}</DialogTitle>
            <DialogDescription>반복 생성 조건과 내용을 설정합니다.</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">시리즈 이름</label>
                <Input
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  placeholder="예: A사 월정기 유지보수"
                />
              </div>
              <div>
                <label className="text-sm font-medium">고객</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={editing.customerId}
                  onChange={(e) => setEditing({ ...editing, customerId: e.target.value })}
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">문서 유형</label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={editing.documentType}
                    onChange={(e) => setEditing({ ...editing, documentType: e.target.value })}
                  >
                    <option value="invoice">청구서</option>
                    <option value="quote">견적서</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">주기</label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={editing.frequency}
                    onChange={(e) => setEditing({ ...editing, frequency: e.target.value })}
                  >
                    <option value="weekly">매주</option>
                    <option value="biweekly">격주</option>
                    <option value="monthly">매월</option>
                    <option value="quarterly">매분기</option>
                    <option value="yearly">매년</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-medium">실행 일</label>
                  <Input
                    type="number"
                    min={1}
                    max={28}
                    value={editing.dayOfMonth}
                    onChange={(e) => setEditing({ ...editing, dayOfMonth: Number(e.target.value) || 1 })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">금액 (원)</label>
                  <Input
                    type="number"
                    min={0}
                    value={editing.amount}
                    onChange={(e) => setEditing({ ...editing, amount: Number(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">최대 횟수</label>
                  <Input
                    type="number"
                    min={0}
                    placeholder="무제한"
                    value={editing.maxRuns ?? ""}
                    onChange={(e) => {
                      const v = e.target.value.trim()
                      setEditing({ ...editing, maxRuns: v ? Number(v) : null })
                    }}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">제목</label>
                <Input
                  value={editing.title}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  placeholder="문서에 표시될 제목"
                />
              </div>
              <div>
                <label className="text-sm font-medium">비고</label>
                <Textarea
                  value={editing.notes}
                  onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                  rows={2}
                  placeholder="선택 사항"
                />
              </div>
              <div>
                <label className="text-sm font-medium">다음 실행일</label>
                <Input
                  type="date"
                  value={editing.nextRunDate}
                  onChange={(e) => setEditing({ ...editing, nextRunDate: e.target.value })}
                />
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={editing.enabled}
                  onChange={(e) => setEditing({ ...editing, enabled: e.target.checked })}
                  className="size-4 rounded border-neutral-400"
                />
                <span className="text-sm">시리즈 활성화</span>
              </label>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={isPending}>
              취소
            </Button>
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? "저장 중…" : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>시리즈 삭제</DialogTitle>
            <DialogDescription>
              &ldquo;{deleteTarget?.name || "이름 없는 시리즈"}&rdquo;를 삭제합니다. 이미 생성된 문서는 유지됩니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={isPending}>
              취소
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
              {isPending ? "삭제 중…" : "삭제"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
