"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import {
  adminAddUserNoteAction,
  adminAppendBillingNoteAction,
  adminEndTrialAction,
  adminExtendTrialAction,
  adminSetAccountDisabledAction,
  adminSetSubscriptionStatusAction,
  adminSetUserPlanAction,
} from "@/app/admin/actions"

export function AdminUserActions({ userId }: { userId: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [note, setNote] = useState("")
  const [billingNote, setBillingNote] = useState("")
  const [trialDays, setTrialDays] = useState("7")

  function refresh() {
    router.refresh()
  }

  return (
    <div className="space-y-6 rounded-lg border border-zinc-200 bg-zinc-50 p-4 shadow-sm">
      <h3 className="text-sm font-bold text-zinc-900">운영 액션</h3>
      <p className="text-xs text-zinc-500">파괴적 작업은 브라우저 확인 창을 통과해야 합니다.</p>

      <div className="flex flex-wrap gap-2">
        <select
          id="plan"
          className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900"
          defaultValue="starter"
        >
          <option value="starter">스타터</option>
          <option value="pro">프로</option>
          <option value="business">비즈니스</option>
        </select>
        <button
          type="button"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
          onClick={() => {
            const el = document.getElementById("plan") as HTMLSelectElement
            if (!confirm(`플랜을 ${el.value}(으)로 변경할까요?`)) return
            start(async () => {
              const r = await adminSetUserPlanAction({ userId, plan: el.value })
              if (!r.ok) alert(r.error)
              else refresh()
            })
          }}
        >
          플랜 적용
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          id="substatus"
          className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900"
          defaultValue="active"
        >
          <option value="trialing">trialing</option>
          <option value="active">active</option>
          <option value="past_due">past_due</option>
          <option value="canceled">canceled</option>
          <option value="trial_expired">trial_expired</option>
        </select>
        <button
          type="button"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
          onClick={() => {
            const el = document.getElementById("substatus") as HTMLSelectElement
            if (!confirm(`구독 상태를 ${el.value}(으)로 설정할까요?`)) return
            start(async () => {
              const r = await adminSetSubscriptionStatusAction({
                userId,
                status: el.value as "trialing" | "active" | "past_due" | "canceled" | "trial_expired",
              })
              if (!r.ok) alert(r.error)
              else refresh()
            })
          }}
        >
          구독 상태
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label className="text-xs text-zinc-500">체험 연장(일)</label>
          <input
            value={trialDays}
            onChange={(e) => setTrialDays(e.target.value)}
            className="mt-0.5 w-20 rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900"
          />
        </div>
        <button
          type="button"
          disabled={pending}
          className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700"
          onClick={() => {
            const d = parseInt(trialDays, 10)
            if (!confirm(`체험을 ${d}일 연장할까요?`)) return
            start(async () => {
              const r = await adminExtendTrialAction({ userId, extraDays: d })
              if (!r.ok) alert(r.error)
              else refresh()
            })
          }}
        >
          체험 연장
        </button>
        <button
          type="button"
          disabled={pending}
          className="rounded-md bg-amber-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-600"
          onClick={() => {
            if (!confirm("체험을 즉시 종료(trial_expired) 처리할까요?")) return
            start(async () => {
              const r = await adminEndTrialAction({ userId })
              if (!r.ok) alert(r.error)
              else refresh()
            })
          }}
        >
          체험 종료
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-800 hover:bg-red-100"
          onClick={() => {
            if (!confirm("이 계정을 비활성화할까요? 로그인이 차단됩니다.")) return
            start(async () => {
              const r = await adminSetAccountDisabledAction({ userId, disabled: true })
              if (!r.ok) alert(r.error)
              else refresh()
            })
          }}
        >
          계정 비활성화
        </button>
        <button
          type="button"
          disabled={pending}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
          onClick={() => {
            if (!confirm("계정을 다시 활성화할까요?")) return
            start(async () => {
              const r = await adminSetAccountDisabledAction({ userId, disabled: false })
              if (!r.ok) alert(r.error)
              else refresh()
            })
          }}
        >
          재활성화
        </button>
      </div>

      <div>
        <label className="text-xs font-semibold text-zinc-500">운영 메모 (내부)</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
        />
        <button
          type="button"
          disabled={pending}
          className="mt-2 rounded-md bg-primary px-3 py-1.5 text-sm font-bold text-primary-foreground"
          onClick={() => {
            start(async () => {
              const r = await adminAddUserNoteAction({ userId, body: note })
              if (!r.ok) alert(r.error)
              else {
                setNote("")
                refresh()
              }
            })
          }}
        >
          메모 저장
        </button>
      </div>

      <div>
        <label className="text-xs font-semibold text-zinc-500">빌링 이벤트 메모 (고객 타임라인에 남음)</label>
        <textarea
          value={billingNote}
          onChange={(e) => setBillingNote(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
        />
        <button
          type="button"
          disabled={pending}
          className="mt-2 rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-zinc-800"
          onClick={() => {
            start(async () => {
              const r = await adminAppendBillingNoteAction({ userId, message: billingNote })
              if (!r.ok) alert(r.error)
              else {
                setBillingNote("")
                refresh()
              }
            })
          }}
        >
          빌링 로그 추가
        </button>
      </div>
    </div>
  )
}
