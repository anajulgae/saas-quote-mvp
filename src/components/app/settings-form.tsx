"use client"

import { useState } from "react"
import { Save } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { BusinessSettings, Template } from "@/types/domain"

export function SettingsForm({
  initialSettings,
  templates,
}: {
  initialSettings: BusinessSettings
  templates: Template[]
}) {
  const [settings, setSettings] = useState(initialSettings)
  const [savedMessage, setSavedMessage] = useState("")

  return (
    <div className="space-y-4">
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle>기본 사업자 설정</CardTitle>
          <CardDescription>
            견적과 청구에 반복해서 들어가는 사업자 정보를 관리합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">사업장명</label>
              <Input
                value={settings.businessName}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    businessName: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">대표자명</label>
              <Input
                value={settings.ownerName}
                onChange={(event) =>
                  setSettings((current) => ({ ...current, ownerName: event.target.value }))
                }
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">이메일</label>
              <Input
                value={settings.email}
                onChange={(event) =>
                  setSettings((current) => ({ ...current, email: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">연락처</label>
              <Input
                value={settings.phone}
                onChange={(event) =>
                  setSettings((current) => ({ ...current, phone: event.target.value }))
                }
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">결제 조건</label>
            <Input
              value={settings.paymentTerms}
              onChange={(event) =>
                setSettings((current) => ({ ...current, paymentTerms: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">계좌 안내</label>
            <Input
              value={settings.bankAccount}
              onChange={(event) =>
                setSettings((current) => ({ ...current, bankAccount: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">기본 리마인드 문구</label>
            <Textarea
              value={settings.reminderMessage}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  reminderMessage: event.target.value,
                }))
              }
              className="min-h-28"
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              현재는 로컬 상태로 저장됩니다. Phase 2에서 Supabase에 연결됩니다.
            </p>
            <Button
              onClick={() => setSavedMessage("로컬 데모 설정이 저장되었습니다.")}
            >
              <Save className="size-4" />
              저장
            </Button>
          </div>
          {savedMessage ? (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {savedMessage}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle>기본 템플릿</CardTitle>
          <CardDescription>견적/리마인드 템플릿 초안을 빠르게 재사용합니다.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {templates.map((template) => (
            <div key={template.id} className="rounded-2xl border border-border/70 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{template.name}</p>
                  <p className="text-sm text-muted-foreground">{template.type}</p>
                </div>
                {template.isDefault ? (
                  <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                    기본값
                  </span>
                ) : null}
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {template.content}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
