"use client"

import { useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowRight, Pencil, Plus, Search, Sparkles } from "lucide-react"
import { toast } from "sonner"

import { createInquiryAction, updateInquiryAction } from "@/app/actions"
import { EmptyState } from "@/components/app/empty-state"
import { InquiryStageBadge } from "@/components/app/status-badge"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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

export function InquiriesBoard({
  inquiries,
  customers,
}: {
  inquiries: InquiryWithCustomer[]
  customers: Customer[]
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
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-muted/30 p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-medium">빠른 운영 가이드</p>
          <p className="mt-1 text-sm text-muted-foreground">
            문의가 들어오면 먼저 등록하고, 팔로업 시간을 지정한 뒤 견적 상태로 넘기세요.
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="size-4" />
            문의 등록
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>새 문의 등록</DialogTitle>
              <DialogDescription>
                고객, 서비스 범위, 예산, 팔로업 일정을 함께 기록합니다.
              </DialogDescription>
            </DialogHeader>
            {FormFields}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                취소
              </Button>
              <Button
                onClick={handleCreate}
                disabled={isPending || !form.title || !form.serviceCategory}
              >
                저장
              </Button>
            </DialogFooter>
            {errorMessage ? (
              <p className="text-sm text-destructive">{errorMessage}</p>
            ) : null}
          </DialogContent>
        </Dialog>
      </div>

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

      {!inquiries.length ? (
        <EmptyState
          title="문의가 없습니다"
          description={
            customers.length
              ? "상단의 새 문의로 첫 건을 등록해 보세요. 등록 후 견적·청구 메뉴에서 이어서 만들 수 있습니다."
              : "문의를 만들려면 먼저 연결할 고객이 필요합니다. 운영 안내에 따라 고객을 추가한 뒤 다시 시도해 주세요."
          }
        >
          {customers.length ? (
            <Button type="button" onClick={() => setIsCreateOpen(true)}>
              <Plus className="size-4" />
              첫 문의 등록
            </Button>
          ) : (
            <Link
              href="/dashboard"
              className={cn(buttonVariants({ variant: "outline" }), "inline-flex items-center gap-1")}
            >
              대시보드 안내 보기
              <ArrowRight className="size-3.5" />
            </Link>
          )}
        </EmptyState>
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
                <Dialog
                  open={editingId === inquiry.id}
                  onOpenChange={(open) => {
                    if (!open) {
                      resetForm()
                    }
                  }}
                >
                  <DialogTrigger
                    render={<Button variant="outline" size="sm" />}
                    onClick={() => openEdit(inquiry)}
                  >
                    <Pencil className="size-4" />
                    수정
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>문의 수정</DialogTitle>
                      <DialogDescription>
                        상태와 다음 후속조치를 업데이트하세요.
                      </DialogDescription>
                    </DialogHeader>
                    {FormFields}
                    <DialogFooter>
                      <Button variant="outline" onClick={resetForm}>
                        닫기
                      </Button>
                      <Button onClick={handleEdit} disabled={isPending}>
                        <Sparkles className="size-4" />
                        저장
                      </Button>
                    </DialogFooter>
                    {errorMessage ? (
                      <p className="text-sm text-destructive">{errorMessage}</p>
                    ) : null}
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
