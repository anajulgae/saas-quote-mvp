"use client"

import { useMemo, useRef, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronRight, ListOrdered, Pencil, Plus, Search, Sparkles, UserPlus } from "lucide-react"
import { toast } from "sonner"

import { createInquiryAction, updateInquiryAction } from "@/app/actions"
import { EmptyState } from "@/components/app/empty-state"
import { PageHeader } from "@/components/app/page-header"
import { InquiryStageBadge } from "@/components/app/status-badge"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { inquiryStageOptions } from "@/lib/constants"
import { formatCurrency, formatDateTime } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Customer, InquiryWithCustomer, InquiryStage } from "@/types/domain"

function toLocalDateTimeValue(value?: string) {
  if (!value) {
    return ""
  }

  return value.slice(0, 16)
}

const flowSteps = [
  { step: 1, title: "고객 등록", hint: "거래처를 먼저 등록합니다" },
  { step: 2, title: "문의 등록", hint: "채널·일정·예산을 함께 기록합니다" },
  { step: 3, title: "견적 단계로 이동", hint: "견적 메뉴에서 이어서 진행합니다" },
] as const

export function InquiriesBoard({
  inquiries,
  customers,
  stageSummary,
}: {
  inquiries: InquiryWithCustomer[]
  customers: Customer[]
  stageSummary: Record<"new" | "qualified" | "quoted", number>
}) {
  const router = useRouter()
  const flowStepsRef = useRef<HTMLDivElement>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [errorMessage, setErrorMessage] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [form, setForm] = useState({
    title: "",
    customerId: customers[0]?.id ?? "",
    serviceCategory: "",
    channel: "카카오톡",
    details: "",
    budgetMin: "",
    budgetMax: "",
    stage: "new" as InquiryStage,
    followUpAt: "",
  })

  /** 고객 1명 이상 — 문의 등록 가능 */
  const hasCustomers = customers.length > 0
  /** 문의 1건 이상 — 검색·CSV 안내 노출 */
  const hasInquiries = inquiries.length > 0
  /** 문의 0건 — 빠른 시작·히어로·(완화된) KPI */
  const isEmptyInquiries = inquiries.length === 0

  const scrollToFlowSteps = () => {
    flowStepsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const editingInquiry = useMemo(
    () => inquiries.find((item) => item.id === editingId) ?? null,
    [editingId, inquiries]
  )

  const filteredInquiries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) {
      return inquiries
    }
    return inquiries.filter((inquiry) => {
      const customer = inquiry.customer
      const haystack = [
        inquiry.title,
        inquiry.details,
        inquiry.serviceCategory,
        inquiry.channel,
        customer?.name,
        customer?.companyName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [inquiries, searchQuery])

  const resetForm = () => {
    setForm({
      title: "",
      customerId: customers[0]?.id ?? "",
      serviceCategory: "",
      channel: "카카오톡",
      details: "",
      budgetMin: "",
      budgetMax: "",
      stage: "new" as InquiryStage,
      followUpAt: "",
    })
    setErrorMessage("")
    setEditingId(null)
  }

  const handleCreate = () => {
    setErrorMessage("")

    startTransition(async () => {
      const result = await createInquiryAction(form)

      if (!result.ok) {
        setErrorMessage(result.error)
        toast.error(result.error)
        return
      }

      toast.success("문의가 등록되었습니다.")
      resetForm()
      setIsCreateOpen(false)
      router.refresh()
    })
  }

  const handleEdit = () => {
    if (!editingInquiry) {
      return
    }

    setErrorMessage("")

    startTransition(async () => {
      const result = await updateInquiryAction(editingInquiry.id, form)

      if (!result.ok) {
        setErrorMessage(result.error)
        toast.error(result.error)
        return
      }

      toast.success("문의가 수정되었습니다.")
      resetForm()
      router.refresh()
    })
  }

  const openEdit = (inquiry: InquiryWithCustomer) => {
    setIsCreateOpen(false)
    setEditingId(inquiry.id)
    setErrorMessage("")
    setForm({
      title: inquiry.title,
      customerId: inquiry.customerId,
      serviceCategory: inquiry.serviceCategory,
      channel: inquiry.channel,
      details: inquiry.details,
      budgetMin: inquiry.budgetMin ? String(inquiry.budgetMin) : "",
      budgetMax: inquiry.budgetMax ? String(inquiry.budgetMax) : "",
      stage: inquiry.stage,
      followUpAt: toLocalDateTimeValue(inquiry.followUpAt),
    })
  }

  const openCreateDialog = () => {
    if (!hasCustomers) {
      toast.message("먼저 고객을 등록해 주세요.", {
        description: "문의 등록 전에 먼저 고객을 추가해주세요.",
      })
      return
    }
    resetForm()
    setIsCreateOpen(true)
  }

  const FormFields = (
    <div className="grid gap-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">문의 제목</label>
        <Input
          value={form.title}
          onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
          placeholder="예: 매장 홍보 영상 4편"
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">고객</label>
          <Select
            value={form.customerId}
            onValueChange={(value) =>
              setForm((current) => ({
                ...current,
                customerId: value ?? current.customerId,
              }))
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="고객 선택" />
            </SelectTrigger>
            <SelectContent>
              {customers.map((customer) => (
                <SelectItem key={customer.id} value={customer.id}>
                  {customer.companyName ?? customer.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">상태</label>
          <Select
            value={form.stage}
            onValueChange={(value) =>
              setForm((current) => ({
                ...current,
                stage: (value as InquiryStage | null) ?? current.stage,
              }))
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="상태 선택" />
            </SelectTrigger>
            <SelectContent>
              {inquiryStageOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">서비스 카테고리</label>
          <Input
            value={form.serviceCategory}
            onChange={(event) =>
              setForm((current) => ({ ...current, serviceCategory: event.target.value }))
            }
            placeholder="영상 제작, 에어컨 청소"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">문의 채널</label>
          <Input
            value={form.channel}
            onChange={(event) => setForm((current) => ({ ...current, channel: event.target.value }))}
            placeholder="카카오톡, 전화"
          />
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">상세 요청</label>
        <Textarea
          value={form.details}
          onChange={(event) => setForm((current) => ({ ...current, details: event.target.value }))}
          placeholder="요청 범위, 납기, 특이사항"
          className="min-h-28"
        />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <label className="text-sm font-medium">예산 최소</label>
          <Input
            value={form.budgetMin}
            onChange={(event) =>
              setForm((current) => ({ ...current, budgetMin: event.target.value }))
            }
            inputMode="numeric"
            placeholder="300000"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">예산 최대</label>
          <Input
            value={form.budgetMax}
            onChange={(event) =>
              setForm((current) => ({ ...current, budgetMax: event.target.value }))
            }
            inputMode="numeric"
            placeholder="800000"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">팔로업 일정</label>
          <Input
            type="datetime-local"
            value={form.followUpAt}
            onChange={(event) =>
              setForm((current) => ({ ...current, followUpAt: event.target.value }))
            }
          />
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-5 md:space-y-6">
      <PageHeader
        title="문의 관리"
        description="문의에 채널·일정·예상 금액을 남기고, 후속조치와 견적까지 한 흐름으로 관리합니다."
        action={
          <div className="flex w-full flex-col gap-2 sm:max-w-[17rem] sm:items-end">
            {hasInquiries ? (
              <p className="text-right text-[11px] leading-tight text-muted-foreground">
                CSV 일괄 가져오기 · 준비 중
              </p>
            ) : null}
            {hasCustomers ? (
              <Button type="button" className="h-10 w-full gap-2 sm:w-auto" onClick={openCreateDialog}>
                <Plus className="size-4" />
                문의 등록
              </Button>
            ) : (
              <div className="flex w-full flex-col gap-2 sm:items-end">
                <Link
                  href="/customers"
                  className={cn(
                    buttonVariants({ size: "default" }),
                    "inline-flex h-10 w-full items-center justify-center gap-2 sm:w-auto"
                  )}
                >
                  <UserPlus className="size-4" />
                  고객 등록하기
                </Link>
                <Button
                  type="button"
                  variant="outline"
                  disabled
                  className="h-10 w-full cursor-not-allowed opacity-60 sm:w-auto"
                  title="문의 등록 전에 먼저 고객을 추가해주세요"
                >
                  <Plus className="size-4" />
                  문의 등록
                </Button>
                <p className="text-center text-xs leading-snug text-muted-foreground sm:text-right">
                  문의 등록 전에 먼저 고객을 추가해주세요
                </p>
              </div>
            )}
          </div>
        }
      />

      <Dialog
        open={isCreateOpen}
        onOpenChange={(open) => {
          setIsCreateOpen(open)
          if (!open) {
            resetForm()
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>새 문의 등록</DialogTitle>
            <DialogDescription>
              고객, 서비스 범위, 예산, 팔로업 일정을 함께 기록합니다.
            </DialogDescription>
          </DialogHeader>
          {FormFields}
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setIsCreateOpen(false)}>
              취소
            </Button>
            <Button
              type="button"
              onClick={handleCreate}
              disabled={isPending || !form.title || !form.serviceCategory}
            >
              저장
            </Button>
          </DialogFooter>
          {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={editingId !== null}
        onOpenChange={(open) => {
          if (!open) {
            resetForm()
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>문의 수정</DialogTitle>
            <DialogDescription>
              상태와 다음 후속조치를 업데이트하세요.
            </DialogDescription>
          </DialogHeader>
          {FormFields}
          <DialogFooter>
            <Button variant="outline" type="button" onClick={resetForm}>
              닫기
            </Button>
            <Button type="button" onClick={handleEdit} disabled={isPending || !editingInquiry}>
              <Sparkles className="size-4" />
              저장
            </Button>
          </DialogFooter>
          {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
        </DialogContent>
      </Dialog>

      {isEmptyInquiries ? (
        <Card className="overflow-hidden border-2 border-primary/40 bg-gradient-to-b from-primary/[0.09] via-background to-background shadow-md ring-1 ring-primary/15">
          <CardContent className="space-y-5 p-5 sm:p-7">
            <div className="space-y-2">
              <p className="text-xs font-semibold tracking-wide text-primary uppercase">빠른 시작</p>
              <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                먼저 고객을 등록한 뒤 문의를 추가하세요
              </h2>
              <p className="text-base leading-relaxed text-muted-foreground">
                문의는 고객과 연결되어야 견적과 청구로 자연스럽게 이어집니다.
              </p>
              {!hasCustomers ? (
                <p className="text-sm font-medium text-amber-900 dark:text-amber-100/90">
                  지금은 등록된 고객이 없습니다. 아래에서 고객 등록하기를 눌러 시작하세요.
                </p>
              ) : (
                <p className="text-sm font-medium text-muted-foreground">
                  고객이 준비되었습니다. 문의 등록으로 첫 건을 남기거나 단계 안내를 확인하세요.
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <Link
                href="/customers"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "inline-flex h-11 w-full items-center justify-center gap-2 font-semibold shadow-sm sm:min-w-[11rem] sm:w-auto"
                )}
              >
                <UserPlus className="size-4" />
                고객 등록하기
              </Link>
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="h-11 w-full gap-2 border-primary/30 sm:w-auto"
                onClick={scrollToFlowSteps}
              >
                <ListOrdered className="size-4" />
                문의 흐름 보기
              </Button>
              {hasCustomers ? (
                <Button
                  type="button"
                  size="lg"
                  className="h-11 w-full gap-2 font-semibold sm:w-auto"
                  onClick={openCreateDialog}
                >
                  <Plus className="size-4" />
                  첫 문의 만들기
                </Button>
              ) : null}
            </div>

            <div
              ref={flowStepsRef}
              id="inquiry-flow-steps"
              className="rounded-xl border border-border/70 bg-background/90 p-3 sm:p-4"
            >
              <p className="mb-3 flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase">
                <ListOrdered className="size-3.5" aria-hidden />
                진행 순서
              </p>
              <ol className="grid gap-3 sm:grid-cols-3">
                {flowSteps.map((item) => (
                  <li
                    key={item.step}
                    className="flex gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-3 text-sm"
                  >
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                      {item.step}
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground">{item.title}</p>
                      <p className="mt-1 text-xs leading-snug text-muted-foreground">{item.hint}</p>
                      {item.step === 3 ? (
                        <Link
                          href="/quotes"
                          className="mt-2 inline-flex items-center gap-0.5 text-xs font-semibold text-primary hover:underline"
                        >
                          견적 화면 열기
                          <ChevronRight className="size-3" />
                        </Link>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <section
        className={cn(
          "grid gap-3 md:grid-cols-3",
          isEmptyInquiries && "order-none opacity-60"
        )}
      >
        <Card
          className={cn(
            "border-border/70",
            isEmptyInquiries && "scale-[0.98] border-dashed bg-muted/15"
          )}
        >
          <CardContent className="p-3 sm:p-4">
            <p className="text-[11px] font-medium text-muted-foreground">신규 문의</p>
            <p
              className={cn(
                "mt-0.5 font-semibold tabular-nums tracking-tight",
                isEmptyInquiries ? "text-lg" : "text-2xl"
              )}
            >
              {stageSummary.new}건
            </p>
          </CardContent>
        </Card>
        <Card
          className={cn(
            "border-border/70",
            isEmptyInquiries && "scale-[0.98] border-dashed bg-muted/15"
          )}
        >
          <CardContent className="p-3 sm:p-4">
            <p className="text-[11px] font-medium text-muted-foreground">검토 중</p>
            <p
              className={cn(
                "mt-0.5 font-semibold tabular-nums tracking-tight",
                isEmptyInquiries ? "text-lg" : "text-2xl"
              )}
            >
              {stageSummary.qualified}건
            </p>
          </CardContent>
        </Card>
        <Card
          className={cn(
            "border-border/70",
            isEmptyInquiries && "scale-[0.98] border-dashed bg-muted/15"
          )}
        >
          <CardContent className="p-3 sm:p-4">
            <p className="text-[11px] font-medium text-muted-foreground">견적 발송 단계</p>
            <p
              className={cn(
                "mt-0.5 font-semibold tabular-nums tracking-tight",
                isEmptyInquiries ? "text-lg" : "text-2xl"
              )}
            >
              {stageSummary.quoted}건
            </p>
          </CardContent>
        </Card>
      </section>

      {!isEmptyInquiries ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-muted/30 p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium">운영 팁</p>
            <p className="mt-1 text-sm text-muted-foreground">
              문의를 등록한 뒤 팔로업 시간을 지정하고, 견적 단계로 넘기면 견적·청구와 연결됩니다.
            </p>
          </div>
          <Button type="button" className="shrink-0" onClick={openCreateDialog}>
            <Plus className="size-4" />
            문의 등록
          </Button>
        </div>
      ) : null}

      {hasInquiries ? (
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="제목, 내용, 고객명, 회사명으로 검색…"
            className="pl-10"
            aria-label="문의 검색"
          />
        </div>
      ) : null}

      {hasInquiries && !filteredInquiries.length ? (
        <EmptyState
          title="검색 결과가 없습니다"
          description="다른 검색어로 다시 시도해 보세요."
        />
      ) : null}

      <div className="grid gap-4">
        {filteredInquiries.map((inquiry) => {
          const customer = inquiry.customer

          return (
            <div
              key={inquiry.id}
              className="grid gap-4 rounded-2xl border border-border/70 bg-background p-4 lg:grid-cols-[1.4fr_0.6fr_0.8fr_auto]"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <InquiryStageBadge stage={inquiry.stage} />
                  <span className="text-xs text-muted-foreground">{inquiry.channel}</span>
                </div>
                <div>
                  <p className="font-medium">{inquiry.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {customer?.companyName ?? customer?.name} · {inquiry.serviceCategory}
                  </p>
                </div>
                <p className="text-sm leading-6 text-muted-foreground">{inquiry.details}</p>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                  예상 예산
                </p>
                <p className="font-medium">
                  {formatCurrency(inquiry.budgetMin ?? 0)} -{" "}
                  {formatCurrency(inquiry.budgetMax ?? 0)}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                  팔로업
                </p>
                <p className="font-medium">{formatDateTime(inquiry.followUpAt)}</p>
              </div>
              <div className="flex items-start justify-end">
                <Button variant="outline" size="sm" type="button" onClick={() => openEdit(inquiry)}>
                  <Pencil className="size-4" />
                  수정
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
