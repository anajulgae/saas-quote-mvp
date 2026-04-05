"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

type Payload =
  | { valid: false; reason?: string; businessName?: string }
  | {
      valid: true
      businessName: string
      ownerName: string
      contactEmail: string
      contactPhone: string
      intro: string
      consentIntro: string
      consentRetention: string
      completionMessage: string
    }

function isValidPayload(p: unknown): p is Payload {
  return typeof p === "object" && p !== null && "valid" in p
}

export function PublicInquiryRequestPage({
  token,
  initialPayload,
}: {
  token: string
  initialPayload: unknown
}) {
  const router = useRouter()
  const payload = isValidPayload(initialPayload) ? initialPayload : { valid: false as const, reason: "invalid" }

  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [title, setTitle] = useState("")
  const [details, setDetails] = useState("")
  const [category, setCategory] = useState("")
  const [hopedDate, setHopedDate] = useState("")
  const [budgetMin, setBudgetMin] = useState("")
  const [budgetMax, setBudgetMax] = useState("")
  const [extraNotes, setExtraNotes] = useState("")
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  if (!payload.valid) {
    const biz = "businessName" in payload ? payload.businessName : undefined
    return (
      <div className="min-h-screen bg-[#f6f5f2] px-4 py-16 text-neutral-900">
        <div className="mx-auto max-w-lg rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-semibold tracking-tight">문의를 받을 수 없습니다</h1>
          <p className="mt-3 text-sm leading-relaxed text-neutral-600">
            {payload.reason === "disabled"
              ? `${biz ? `「${biz}」` : "해당 사업장"}의 공개 문의 폼이 현재 비활성화되어 있습니다.`
              : "링크가 잘못되었거나 만료되었을 수 있습니다. 담당자에게 연락해 주세요."}
          </p>
        </div>
      </div>
    )
  }

  const p = payload

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!consent) {
      setError("개인정보 수집·이용에 동의해 주세요.")
      return
    }
    setBusy(true)
    try {
      const companyWebsite = (
        e.target as HTMLFormElement & { elements: HTMLFormControlsCollection & { company_website?: HTMLInputElement } }
      ).company_website?.value

      const res = await fetch("/api/public/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          name,
          phone,
          email,
          title,
          details,
          serviceCategory: category,
          hopedDate,
          budgetMin: budgetMin.trim() ? Number(budgetMin.replace(/[^\d]/g, "")) : undefined,
          budgetMax: budgetMax.trim() ? Number(budgetMax.replace(/[^\d]/g, "")) : undefined,
          extraNotes,
          consent: true as const,
          companyWebsite: companyWebsite ?? "",
        }),
      })
      const data = (await res.json()) as { ok?: boolean; error?: string }
      if (!res.ok || !data.ok) {
        setError(data.error ?? "접수에 실패했습니다.")
        return
      }
      router.push(`/request/${encodeURIComponent(token)}/thanks`)
      router.refresh()
    } catch {
      setError("네트워크 오류가 발생했습니다.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f6f5f2] text-neutral-900">
      <header className="border-b border-neutral-200/80 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl flex-col gap-1 px-4 py-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-500">문의</p>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">{p.businessName}</h1>
          {p.ownerName ? <p className="text-sm text-neutral-600">담당 {p.ownerName}</p> : null}
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8 pb-16">
        {p.intro?.trim() ? (
          <p className="mb-6 whitespace-pre-wrap text-sm leading-relaxed text-neutral-700">{p.intro.trim()}</p>
        ) : (
          <p className="mb-6 text-sm leading-relaxed text-neutral-700">
            아래 항목만 입력해 주시면 접수 후 담당자가 확인하여 연락드립니다.
          </p>
        )}

        <form
          onSubmit={onSubmit}
          className="relative space-y-5 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-7"
        >
          <div className="pointer-events-none absolute -left-[9999px] h-px w-px overflow-hidden opacity-0" aria-hidden>
            <label htmlFor="company_website">웹사이트</label>
            <input id="company_website" name="company_website" type="text" tabIndex={-1} autoComplete="off" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-neutral-800" htmlFor="pi-name">
                이름 <span className="text-red-600">*</span>
              </label>
              <Input
                id="pi-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={120}
                className="h-11 border-neutral-300 bg-white"
                placeholder="홍길동"
                autoComplete="name"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-neutral-800" htmlFor="pi-phone">
                연락처(휴대전화) <span className="text-red-600">*</span>
              </label>
              <Input
                id="pi-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                maxLength={40}
                className="h-11 border-neutral-300 bg-white"
                placeholder="010-0000-0000"
                inputMode="tel"
                autoComplete="tel"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-neutral-800" htmlFor="pi-email">
              이메일 <span className="text-neutral-400">(선택)</span>
            </label>
            <Input
              id="pi-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={200}
              className="h-11 border-neutral-300 bg-white"
              placeholder="name@example.com"
              autoComplete="email"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-neutral-800" htmlFor="pi-title">
              요청 제목 <span className="text-red-600">*</span>
            </label>
            <Input
              id="pi-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={500}
              className="h-11 border-neutral-300 bg-white"
              placeholder="한 줄로 요청을 적어 주세요"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-neutral-800" htmlFor="pi-details">
              요청 내용 <span className="text-red-600">*</span>
            </label>
            <Textarea
              id="pi-details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              required
              rows={5}
              maxLength={20000}
              className="min-h-[120px] resize-y border-neutral-300 bg-white text-[15px] leading-relaxed"
              placeholder="필요한 서비스, 일정, 참고 사항을 자유롭게 적어 주세요."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-neutral-800" htmlFor="pi-cat">
                서비스 종류 <span className="text-neutral-400">(선택)</span>
              </label>
              <Input
                id="pi-cat"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                maxLength={200}
                className="h-11 border-neutral-300 bg-white"
                placeholder="예: 영상 제작, 웹사이트"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-neutral-800" htmlFor="pi-date">
                희망 일정 <span className="text-neutral-400">(선택)</span>
              </label>
              <Input
                id="pi-date"
                type="date"
                value={hopedDate}
                onChange={(e) => setHopedDate(e.target.value)}
                className="h-11 border-neutral-300 bg-white"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-neutral-800" htmlFor="pi-bmin">
                예산(최소, 원) <span className="text-neutral-400">(선택)</span>
              </label>
              <Input
                id="pi-bmin"
                value={budgetMin}
                onChange={(e) => setBudgetMin(e.target.value)}
                inputMode="numeric"
                className="h-11 border-neutral-300 bg-white"
                placeholder="숫자만"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-neutral-800" htmlFor="pi-bmax">
                예산(최대, 원) <span className="text-neutral-400">(선택)</span>
              </label>
              <Input
                id="pi-bmax"
                value={budgetMax}
                onChange={(e) => setBudgetMax(e.target.value)}
                inputMode="numeric"
                className="h-11 border-neutral-300 bg-white"
                placeholder="숫자만"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-neutral-800" htmlFor="pi-extra">
              추가 메모 <span className="text-neutral-400">(선택)</span>
            </label>
            <Textarea
              id="pi-extra"
              value={extraNotes}
              onChange={(e) => setExtraNotes(e.target.value)}
              rows={3}
              maxLength={8000}
              className="resize-y border-neutral-300 bg-white text-[15px]"
              placeholder="기타 전달 사항"
            />
          </div>

          <section className="rounded-xl border border-neutral-200 bg-neutral-50/80 p-4 text-sm leading-relaxed text-neutral-700">
            <p className="font-semibold text-neutral-900">개인정보 수집·이용 안내</p>
            <p className="mt-2 whitespace-pre-wrap">{p.consentIntro?.trim() || "문의 처리를 위해 최소한의 정보를 수집합니다."}</p>
            <p className="mt-3 whitespace-pre-wrap">{p.consentRetention?.trim()}</p>
            <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs">
              <Link href="/privacy" className="text-neutral-900 underline underline-offset-4" target="_blank" rel="noreferrer">
                개인정보처리방침
              </Link>
              <Link href="/terms" className="text-neutral-900 underline underline-offset-4" target="_blank" rel="noreferrer">
                이용약관
              </Link>
            </p>
            <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-lg border border-neutral-200 bg-white p-3">
              <input
                id="pi-consent"
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-1 size-4 shrink-0 rounded border-neutral-400 text-neutral-900"
              />
              <span className="text-sm leading-snug">
                위 내용을 확인하였으며, 개인정보 수집·이용에 동의합니다. <span className="text-red-600">*</span>
              </span>
            </label>
          </section>

          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
              {error}
            </p>
          ) : null}

          <Button
            type="submit"
            disabled={busy}
            className="h-12 w-full text-base font-semibold"
          >
            {busy ? "제출 중…" : "문의 접수하기"}
          </Button>

          <p className="text-center text-xs text-neutral-500">
            제출 후 내용 수정은 불가합니다. 잘못 입력한 경우 다시 접수해 주세요.
          </p>
        </form>

        {(p.contactEmail || p.contactPhone) && (
          <div className="mt-10 rounded-xl border border-dashed border-neutral-300 bg-white/60 px-4 py-3 text-center text-sm text-neutral-600">
            문의 관련 연락:{" "}
            {p.contactPhone ? <span className="tabular-nums text-neutral-800">{p.contactPhone}</span> : null}
            {p.contactPhone && p.contactEmail ? " · " : null}
            {p.contactEmail ? <span className="text-neutral-800">{p.contactEmail}</span> : null}
          </div>
        )}
      </main>
    </div>
  )
}
