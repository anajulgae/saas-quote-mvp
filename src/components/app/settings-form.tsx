"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Save } from "lucide-react"
import { toast } from "sonner"

import { saveSettingsAction } from "@/app/actions"
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
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [settings, setSettings] = useState(initialSettings)
  const [templateState, setTemplateState] = useState<Template[]>(
    templates.length
      ? templates
      : [
          {
            id: "",
            userId: initialSettings.userId,
            type: "quote",
            name: "기본 견적 템플릿",
            content: "",
            isDefault: true,
          },
          {
            id: "",
            userId: initialSettings.userId,
            type: "reminder",
            name: "기본 리마인드 템플릿",
            content: "",
            isDefault: true,
          },
        ]
  )
  const [errorMessage, setErrorMessage] = useState("")

  const handleSave = () => {
    setErrorMessage("")

    startTransition(async () => {
      const result = await saveSettingsAction({
        businessName: settings.businessName,
        ownerName: settings.ownerName,
        email: settings.email,
        phone: settings.phone,
        paymentTerms: settings.paymentTerms,
        bankAccount: settings.bankAccount,
        reminderMessage: settings.reminderMessage,
        templates: templateState.map((template) => ({
          id: template.id || undefined,
          type: template.type,
          name: template.name,
          content: template.content,
          isDefault: template.isDefault,
        })),
      })

      if (!result.ok) {
        setErrorMessage(result.error)
        toast.error(result.error)
        return
      }

      toast.success("설정과 템플릿이 저장되었습니다.")
      router.refresh()
    })
  }

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
              사업자 정보와 기본 문구는 실제 Supabase 데이터로 저장됩니다.
            </p>
            <Button onClick={handleSave} disabled={isPending} className="gap-2">
              {isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Save className="size-4" aria-hidden />
              )}
              저장
            </Button>
          </div>
          {errorMessage ? (
            <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errorMessage}
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
          {templateState.map((template, index) => (
            <div
              key={`${template.id || template.type}-${index}`}
              className="rounded-2xl border border-border/70 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 space-y-2">
                  <Input
                    value={template.name}
                    onChange={(event) =>
                      setTemplateState((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, name: event.target.value }
                            : item
                        )
                      )
                    }
                  />
                  <p className="text-sm text-muted-foreground">{template.type}</p>
                </div>
                {template.isDefault ? (
                  <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                    기본값
                  </span>
                ) : null}
              </div>
              <Textarea
                value={template.content}
                onChange={(event) =>
                  setTemplateState((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, content: event.target.value }
                        : item
                    )
                  )
                }
                className="mt-3 min-h-28"
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
