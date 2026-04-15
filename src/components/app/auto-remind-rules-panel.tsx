"use client"

import { useState, useTransition } from"react"
import { useRouter } from"next/navigation"
import { Bell, Plus, Trash2 } from"lucide-react"
import { toast } from"sonner"
import Link from"next/link"

import { saveAutoRemindRuleAction, deleteAutoRemindRuleAction } from"@/app/actions"
import { Button } from"@/components/ui/button"
import { buttonVariants } from"@/components/ui/button-variants"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from"@/components/ui/card"
import { Input } from"@/components/ui/input"
import { Textarea } from"@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from"@/components/ui/dialog"
import { cn } from"@/lib/utils"
import type { AutoRemindRule } from"@/lib/data"

type RuleForm = {
  id?: string
  name: string
  enabled: boolean
  triggerType: string
  triggerDays: number
  channel: string
  messageTemplate: string
}

const emptyForm: RuleForm = {
  name:"",
  enabled: true,
  triggerType:"overdue_days",
  triggerDays: 3,
  channel:"email",
  messageTemplate:"",
}

export function AutoRemindRulesPanel({
  rules: initialRules,
  allowed,
  currentPlan,
}: {
  rules: AutoRemindRule[]
  allowed: boolean
  currentPlan: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [editing, setEditing] = useState<RuleForm | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AutoRemindRule | null>(null)

  if (!allowed) {
    return (
      <Card className="border-dashed border-border/70 bg-muted/10">
        <CardContent className="flex flex-col gap-3 p-6 text-center">
          <Bell className="mx-auto size-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            자동 리마인드 스케줄러는 <strong>Pro 이상 플랜</strong>에서 이용할 수 있습니다.
          </p>
          <Link href="/billing" className={cn(buttonVariants({ size:"sm" }),"mx-auto")}>
            플랜 업그레이드
          </Link>
        </CardContent>
      </Card>
    )
  }

  function openNew() {
    setEditing({ ...emptyForm })
  }

  function openEdit(rule: AutoRemindRule) {
    setEditing({
      id: rule.id,
      name: rule.name,
      enabled: rule.enabled,
      triggerType: rule.triggerType,
      triggerDays: rule.triggerDays,
      channel: rule.channel,
      messageTemplate: rule.messageTemplate,
    })
  }

  function handleSave() {
    if (!editing) return
    startTransition(async () => {
      const result = await saveAutoRemindRuleAction(editing)
      if (result.ok) {
        toast.success(editing.id ?"규칙을 수정했습니다." :"규칙을 추가했습니다.")
        setEditing(null)
        router.refresh()
      } else {
        toast.error(result.error ??"저장에 실패했습니다.")
      }
    })
  }

  function handleDelete() {
    if (!deleteTarget) return
    startTransition(async () => {
      const result = await deleteAutoRemindRuleAction(deleteTarget.id)
      if (result.ok) {
        toast.success("규칙을 삭제했습니다.")
        setDeleteTarget(null)
        router.refresh()
      } else {
        toast.error(result.error ??"삭제에 실패했습니다.")
      }
    })
  }

  return (
    <>
      <Card className="border-border/70">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div>
            <CardTitle className="text-base font-semibold">자동 리마인드 규칙</CardTitle>
            <CardDescription>
              입금 기한 경과 청구에 자동으로 리마인드를 발송합니다. 매일 오전 9시에 실행됩니다.
            </CardDescription>
          </div>
          <Button size="sm" className="gap-1.5" onClick={openNew}>
            <Plus className="size-3.5" />
            규칙 추가
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {initialRules.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/60 bg-muted/15 px-4 py-8 text-center">
              <Bell className="mx-auto size-6 text-muted-foreground/40" />
              <p className="mt-2 text-sm text-muted-foreground">등록된 자동 리마인드 규칙이 없습니다.</p>
              <Button variant="outline" size="sm" className="mt-3 gap-1.5" onClick={openNew}>
                <Plus className="size-3.5" />
                첫 규칙 만들기
              </Button>
            </div>
          ) : (
            initialRules.map((rule) => (
              <div
                key={rule.id}
                className={cn("flex items-center gap-3 rounded-xl border p-3 transition-colors",
                  rule.enabled ?"border-border/70 bg-card" :"border-border/40 bg-muted/20 opacity-60"
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{rule.name ||"이름 없는 규칙"}</p>
                  <p className="text-xs text-muted-foreground">
                    입금 기한 {rule.triggerDays}일 경과 · {rule.channel ==="email" ?"이메일" : rule.channel} ·{""}
                    {rule.enabled ?"활성" :"비활성"}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => openEdit(rule)}>
                  수정
                </Button>
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDeleteTarget(rule)}>
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Edit/Create Dialog */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing?.id ?"규칙 수정" :"새 규칙 만들기"}</DialogTitle>
            <DialogDescription>
              입금 기한 경과 조건과 메시지 템플릿을 설정합니다.
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">규칙 이름</label>
                <Input
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  placeholder="예: 3일 경과 자동 리마인드"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">경과 일수</label>
                  <Input
                    type="number"
                    min={1}
                    max={90}
                    value={editing.triggerDays}
                    onChange={(e) => setEditing({ ...editing, triggerDays: Number(e.target.value) || 1 })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">채널</label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                    value={editing.channel}
                    onChange={(e) => setEditing({ ...editing, channel: e.target.value })}
                  >
                    <option value="email">이메일</option>
                    <option value="manual">수동 기록</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">메시지 템플릿</label>
                <Textarea
                  value={editing.messageTemplate}
                  onChange={(e) => setEditing({ ...editing, messageTemplate: e.target.value })}
                  rows={4}
                  placeholder={"비워두면 기본 메시지가 사용됩니다.\n변수: {{invoiceNumber}}, {{amount}}, {{dueDate}}"}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {"{{invoiceNumber}}, {{amount}}, {{dueDate}} 변수를 사용할 수 있습니다."}
                </p>
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={editing.enabled}
                  onChange={(e) => setEditing({ ...editing, enabled: e.target.checked })}
                  className="size-4 rounded border-neutral-400"
                />
                <span className="text-sm">규칙 활성화</span>
              </label>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={isPending}>
              취소
            </Button>
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ?"저장 중…" :"저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>규칙 삭제</DialogTitle>
            <DialogDescription>
              &ldquo;{deleteTarget?.name ||"이름 없는 규칙"}&rdquo;을(를) 삭제합니다. 이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={isPending}>
              취소
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
              {isPending ?"삭제 중…" :"삭제"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
