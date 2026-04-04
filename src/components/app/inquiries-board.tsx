"use client"

import { useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronRight, FileText, Pencil, Plus, Search, Sparkles, UserPlus } from "lucide-react"
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
import type { InquiryWithCustomer, InquiryStage } from "@/types/domain"

function toLocalDateTimeValue(value?: string) {
  if (!value) {
    return ""
  }

  return value.slice(0, 16)
}

const flowSteps = [
  { step: 1, title: "고객 등록", hint: "거래처를 먼저 등록합니다" },
  { step: 2, title: "문의 등록", hint: "채널·일정·예산을 함께 기록합니다" },
  { step: 3, title: "견적 단계", hint: "견적 메뉴에서 이어서 진행합니다" },
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

  const hasCustomers = customers.length > 0
  const isInitialEmpty = inquiries.length === 0

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
        description: "문의는 등록된 고객에 연결됩니다.",
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

  const headerPrimary =
    hasCustomers ? (
      <Button type="button" className="w-full sm:w-auto" onClick={openCreateDialog}>
        <Plus className="size-4" />
        문의 등록
      </Button>
    ) : (
      <Link
        href="/customers"
        className={cn(buttonVariants(), "inline-flex w-full items-center justify-center gap-2 sm:w-auto")}
      >
        <UserPlus className="size-4" />
        첫 고객 등록
      </Link>
    )

  return (
    <div className="space-y-5 md:space-y-6">
      <PageHeader
        title="문의 관리"
        description="고객 문의를 등록하고, 후속 일정과 예상 매출을 함께 관리합니다. 먼저 고객을 등록한 뒤 문의를 추가하면 견적까지 자연스럽게 이어집니다."
        action={
          <div className="flex w-full flex-col gap-1.5 sm:w-auto sm:items-end">
            {inquiries.length > 0 ? (
              <p className="text-right text-[11px] text-muted-foreground">CSV 일괄 가져오기 · 준비 중</p>
            ) : null}
            {headerPrimary}
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

      {isInitialEmpty ? (
        <Card
          id="inquiries-quick-start"
          className="border-primary/20 bg-primary/[0.04] shadow-none"
        >
          <CardContent className="space-y-3 p-4 sm:p-5">
            <p className="text-sm font-semibold text-foreground">빠른 시작</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="text-foreground">·</span>
                고객부터 등록하면 문의와 견적 연결이 쉬워집니다.
              </li>
              <li className="flex gap-2">
                <span className="text-foreground">·</span>
                문의에 채널·일정·예상 금액을 적어 두면 후속조치를 놓치지 않습니다.
              </li>
            </ul>
            <div className="flex flex-wrap gap-2 border-t border-border/50 pt-3 text-xs text-muted-foreground">
              <span className="rounded-md border border-border/60 bg-background/80 px-2 py-1">
                입력 팁: 팔로업 일정을 넣으면 대시보드에 표시됩니다
              </span>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <section
        className={cn(
          "grid gap-3 md:grid-cols-3",
          isInitialEmpty && "opacity-[0.72]"
        )}
      >
        <Card
          className={cn(
            "border-border/70",
            isInitialEmpty && "border-dashed bg-muted/20"
          )}
        >
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">신규 문의</p>
            <p
              className={cn(
                "mt-1 font-semibold tabular-nums tracking-tight",
                isInitialEmpty ? "text-xl" : "text-2xl"
              )}
            >
              {stageSummary.new}건
            </p>
          </CardContent>
        </Card>
        <Card
          className={cn(
            "border-border/70",
            isInitialEmpty && "border-dashed bg-muted/20"
          )}
        >
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">검토 중</p>
            <p
              className={cn(
                "mt-1 font-semibold tabular-nums tracking-tight",
                isInitialEmpty ? "text-xl" : "text-2xl"
              )}
            >
              {stageSummary.qualified}건
            </p>
          </CardContent>
        </Card>
        <Card
          className={cn(
            "border-border/70",
            isInitialEmpty && "border-dashed bg-muted/20"
          )}
        >
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">견적 발송 단계</p>
            <p
              className={cn(
                "mt-1 font-semibold tabular-nums tracking-tight",
                isInitialEmpty ? "text-xl" : "text-2xl"
              )}
            >
              {stageSummary.quoted}건
            </p>
          </CardContent>
        </Card>
      </section>

      {!isInitialEmpty ? (
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

      {inquiries.length > 0 ? (
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

      {!inquiries.length ? (
        <Card className="border-dashed border-border/70 bg-muted/15 shadow-none">
          <CardContent className="space-y-4 p-4 sm:p-5">
            <div>
              <p className="text-sm font-semibold text-foreground">아직 등록된 문의가 없습니다</p>
              <p className="mt-1 text-sm text-muted-foreground">
                아래 순서대로 진행하면 첫 문의를 바로 남길 수 있습니다.
              </p>
            </div>
            <ol className="grid gap-2 sm:grid-cols-3">
              {flowSteps.map((item) => (
                <li
                  key={item.step}
                  className="flex items-start gap-2 rounded-lg border border-border/60 bg-background/80 px-3 py-2.5 text-sm"
                >
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                    {item.step}
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{item.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{item.hint}</p>
                    {item.step === 3 ? (
                      <Link
                        href="/quotes"
                        className="mt-2 inline-flex items-center gap-0.5 text-xs font-medium text-primary hover:underline"
                      >
                        견적 화면
                        <ChevronRight className="size-3" />
                      </Link>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Link
                href="/customers"
                className={cn(
                  buttonVariants({ variant: hasCustomers ? "outline" : "default", size: "default" }),
                  "inline-flex h-10 w-full items-center justify-center gap-2 sm:w-auto"
                )}
              >
                <UserPlus className="size-4" />
                고객 등록하기
              </Link>
              {hasCustomers ? (
                <Button
                  type="button"
                  className="h-10 w-full gap-2 sm:w-auto"
                  onClick={openCreateDialog}
                >
                  <Plus className="size-4" />
                  첫 문의 만들기
                </Button>
              ) : (
                <span
                  className="inline-flex w-full sm:w-auto"
                  title="문의는 등록된 고객에 연결됩니다. 먼저 고객을 등록해 주세요."
                >
                  <Button type="button" className="h-10 w-full gap-2 sm:w-auto" disabled>
                    <Plus className="size-4" />
                    첫 문의 만들기
                  </Button>
                </span>
              )}
              <Link
                href="/quotes"
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "inline-flex h-9 w-full items-center justify-center text-muted-foreground sm:w-auto"
                )}
              >
                <FileText className="size-3.5" />
                견적 단계로 이동
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : !filteredInquiries.length ? (
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
