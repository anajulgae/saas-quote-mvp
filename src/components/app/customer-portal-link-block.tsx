"use client"

import { useState } from "react"
import { Link2, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { ensureCustomerPortalTokenAction } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function CustomerPortalLinkBlock({
  customerId,
  initialToken,
  siteOrigin,
  portalAllowed,
}: {
  customerId: string
  initialToken?: string
  siteOrigin: string
  portalAllowed: boolean
}) {
  const [token, setToken] = useState(initialToken?.trim() ?? "")
  const [busy, setBusy] = useState(false)

  const portalUrl = token ? `${siteOrigin}/c/${encodeURIComponent(token)}` : ""

  const copyLink = async () => {
    setBusy(true)
    try {
      let t = token.trim()
      if (!t) {
        const res = await ensureCustomerPortalTokenAction(customerId)
        if (!res.ok) {
          toast.error(res.error)
          return
        }
        t = res.token
        setToken(t)
      }
      const url = `${siteOrigin}/c/${encodeURIComponent(t)}`
      await navigator.clipboard.writeText(url)
      toast.success("고객 미니 포털 링크를 복사했습니다.")
    } catch {
      toast.error("복사에 실패했습니다.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="border-border/70">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-base font-semibold">고객 미니 포털</CardTitle>
          <span className="rounded-md border border-border/70 bg-muted/40 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            Pro
          </span>
        </div>
        <CardDescription className="text-xs leading-relaxed">
          고객이 로그인 없이 견적·청구 요약을 볼 수 있는 단일 링크입니다. 최초 복사 시 토큰이 발급됩니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {!portalAllowed ? (
          <p className="text-xs text-muted-foreground">
            Pro 플랜에서 링크를 발급할 수 있습니다. 무료 플랜에서는 개별 견적·청구 공유 링크를 사용해 주세요.
          </p>
        ) : (
          <>
            {portalUrl ? (
              <p className="break-all rounded-md border border-dashed border-border/70 bg-muted/20 px-2 py-1.5 font-mono text-[11px] text-muted-foreground">
                {portalUrl}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">아직 발급된 링크가 없습니다. 아래에서 발급·복사하세요.</p>
            )}
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-1.5"
              disabled={busy}
              onClick={() => void copyLink()}
            >
              {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Link2 className="size-3.5" />}
              {token.trim() ? "링크 다시 복사" : "링크 발급 후 복사"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
