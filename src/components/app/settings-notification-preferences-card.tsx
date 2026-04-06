"use client"

import { useState, useTransition } from "react"
import { Loader2, Save } from "lucide-react"
import { toast } from "sonner"

import { saveNotificationPreferencesAction } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { NotificationPreferences } from "@/types/domain"

function ToggleRow({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-border/50 bg-muted/10 px-3 py-2 text-sm">
      <span>{label}</span>
      <input
        type="checkbox"
        className="size-4 accent-primary"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  )
}

export function SettingsNotificationPreferencesCard({
  initial,
}: {
  initial: NotificationPreferences
}) {
  const [p, setP] = useState(initial)
  const [pending, startTransition] = useTransition()

  const save = () => {
    startTransition(async () => {
      const res = await saveNotificationPreferencesAction({
        inquiryInApp: p.inquiryInApp,
        inquiryBrowser: p.inquiryBrowser,
        inquiryEmail: p.inquiryEmail,
        quoteEventsInApp: p.quoteEventsInApp,
        quoteEventsBrowser: p.quoteEventsBrowser,
        quoteEventsEmail: p.quoteEventsEmail,
        invoiceEventsInApp: p.invoiceEventsInApp,
        invoiceEventsBrowser: p.invoiceEventsBrowser,
        invoiceEventsEmail: p.invoiceEventsEmail,
        reminderEventsInApp: p.reminderEventsInApp,
        reminderEventsBrowser: p.reminderEventsBrowser,
        reminderEventsEmail: p.reminderEventsEmail,
      })
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success("알림 설정을 저장했습니다.")
    })
  }

  return (
    <Card className="border-border/70">
      <CardHeader className="space-y-1 pb-3">
        <CardTitle className="text-base font-semibold">알림 설정</CardTitle>
        <CardDescription className="text-xs leading-relaxed">
          문의·견적·청구·리마인드 이벤트를 앱 내 목록, 브라우저(데스크톱) 알림, 이메일로 받을지 선택합니다. SMS·카카오
          자동 발송은 이후 단계에서 연결할 수 있습니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <section className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">새 문의</p>
          <ToggleRow label="앱 내 알림 센터" checked={p.inquiryInApp} onChange={(v) => setP((x) => ({ ...x, inquiryInApp: v }))} />
          <ToggleRow
            label="브라우저 알림"
            checked={p.inquiryBrowser}
            onChange={(v) => setP((x) => ({ ...x, inquiryBrowser: v }))}
          />
          <ToggleRow label="이메일 알림" checked={p.inquiryEmail} onChange={(v) => setP((x) => ({ ...x, inquiryEmail: v }))} />
        </section>
        <section className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">견적 이벤트 (발송·승인·거절)</p>
          <ToggleRow label="앱 내" checked={p.quoteEventsInApp} onChange={(v) => setP((x) => ({ ...x, quoteEventsInApp: v }))} />
          <ToggleRow
            label="브라우저"
            checked={p.quoteEventsBrowser}
            onChange={(v) => setP((x) => ({ ...x, quoteEventsBrowser: v }))}
          />
          <ToggleRow label="이메일" checked={p.quoteEventsEmail} onChange={(v) => setP((x) => ({ ...x, quoteEventsEmail: v }))} />
        </section>
        <section className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">청구 (등록·연체·상태 변경)</p>
          <ToggleRow
            label="앱 내"
            checked={p.invoiceEventsInApp}
            onChange={(v) => setP((x) => ({ ...x, invoiceEventsInApp: v }))}
          />
          <ToggleRow
            label="브라우저"
            checked={p.invoiceEventsBrowser}
            onChange={(v) => setP((x) => ({ ...x, invoiceEventsBrowser: v }))}
          />
          <ToggleRow
            label="이메일"
            checked={p.invoiceEventsEmail}
            onChange={(v) => setP((x) => ({ ...x, invoiceEventsEmail: v }))}
          />
        </section>
        <section className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">리마인드 기록</p>
          <ToggleRow
            label="앱 내"
            checked={p.reminderEventsInApp}
            onChange={(v) => setP((x) => ({ ...x, reminderEventsInApp: v }))}
          />
          <ToggleRow
            label="브라우저"
            checked={p.reminderEventsBrowser}
            onChange={(v) => setP((x) => ({ ...x, reminderEventsBrowser: v }))}
          />
          <ToggleRow
            label="이메일"
            checked={p.reminderEventsEmail}
            onChange={(v) => setP((x) => ({ ...x, reminderEventsEmail: v }))}
          />
        </section>
        <Button type="button" size="sm" className="gap-2" disabled={pending} onClick={save}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          알림 설정 저장
        </Button>
      </CardContent>
    </Card>
  )
}
