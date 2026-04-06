"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Bell, CheckCheck, Loader2 } from "lucide-react"
import { toast } from "sonner"

import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/app/actions"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { defaultNotificationPreferences } from "@/lib/notification-defaults"
import { createBrowserSupabaseClient } from "@/lib/supabase/browser"
import type { BillNotification, NotificationPreferences } from "@/types/domain"
import { cn } from "@/lib/utils"

type NotifRow = {
  id: string
  user_id: string
  type: string
  title: string
  body: string
  link_path: string | null
  related_entity_type: string | null
  related_entity_id: string | null
  is_read: boolean
  dedupe_key: string
  created_at: string
}

function mapNotifRow(row: NotifRow): BillNotification {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    body: row.body,
    linkPath: row.link_path,
    relatedEntityType: row.related_entity_type,
    relatedEntityId: row.related_entity_id,
    isRead: row.is_read,
    dedupeKey: row.dedupe_key,
    createdAt: row.created_at,
  }
}

function allowsInAppChannel(type: string, prefs: NotificationPreferences): boolean {
  if (type === "new_inquiry") {
    return prefs.inquiryInApp
  }
  if (type.startsWith("quote_")) {
    return prefs.quoteEventsInApp
  }
  if (type.startsWith("invoice_")) {
    return prefs.invoiceEventsInApp
  }
  if (type.startsWith("reminder_")) {
    return prefs.reminderEventsInApp
  }
  return true
}

function allowsBrowserChannel(type: string, prefs: NotificationPreferences): boolean {
  if (type === "new_inquiry") {
    return prefs.inquiryBrowser
  }
  if (type.startsWith("quote_")) {
    return prefs.quoteEventsBrowser
  }
  if (type.startsWith("invoice_")) {
    return prefs.invoiceEventsBrowser
  }
  if (type.startsWith("reminder_")) {
    return prefs.reminderEventsBrowser
  }
  return false
}

function formatNotifTime(iso: string) {
  try {
    const d = new Date(iso)
    return d.toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
  } catch {
    return ""
  }
}

export function NotificationCenter({ userId, isDemoSession }: { userId: string | null; isDemoSession: boolean }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<BillNotification[]>([])
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [markBusy, setMarkBusy] = useState(false)
  const processedIdsRef = useRef(new Set<string>())
  const supabaseRef = useRef(createBrowserSupabaseClient())
  const prefsRef = useRef<NotificationPreferences | null>(null)

  const unreadCount = useMemo(
    () => items.filter((n) => !n.isRead && (prefs ? allowsInAppChannel(n.type, prefs) : true)).length,
    [items, prefs]
  )

  const refreshList = useCallback(async () => {
    if (!userId || isDemoSession) {
      setItems([])
      setLoading(false)
      return
    }
    const sb = supabaseRef.current
    const { data, error } = await sb
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(80)

    if (error) {
      setLoading(false)
      return
    }
    setItems(((data ?? []) as NotifRow[]).map(mapNotifRow))
    setLoading(false)
  }, [userId, isDemoSession])

  const loadPrefs = useCallback(async () => {
    if (!userId || isDemoSession) {
      setPrefs(null)
      return
    }
    const sb = supabaseRef.current
    const { data, error } = await sb.from("notification_preferences").select("*").eq("user_id", userId).maybeSingle()
    if (error || !data) {
      setPrefs(null)
      return
    }
    const r = data as Record<string, unknown>
    const next: NotificationPreferences = {
      userId,
      inquiryInApp: Boolean(r.inquiry_in_app),
      inquiryBrowser: Boolean(r.inquiry_browser),
      inquiryEmail: Boolean(r.inquiry_email),
      quoteEventsInApp: Boolean(r.quote_events_in_app),
      quoteEventsBrowser: Boolean(r.quote_events_browser),
      quoteEventsEmail: Boolean(r.quote_events_email),
      invoiceEventsInApp: Boolean(r.invoice_events_in_app),
      invoiceEventsBrowser: Boolean(r.invoice_events_browser),
      invoiceEventsEmail: Boolean(r.invoice_events_email),
      reminderEventsInApp: Boolean(r.reminder_events_in_app),
      reminderEventsBrowser: Boolean(r.reminder_events_browser),
      reminderEventsEmail: Boolean(r.reminder_events_email),
    }
    setPrefs(next)
    prefsRef.current = next
  }, [userId, isDemoSession])

  useEffect(() => {
    prefsRef.current = prefs
  }, [prefs])

  useEffect(() => {
    void refreshList()
    void loadPrefs()
  }, [refreshList, loadPrefs])

  const handleIncoming = useCallback(
    (row: NotifRow) => {
      if (!userId) {
        return
      }
      const n = mapNotifRow(row)
      if (processedIdsRef.current.has(n.id)) {
        return
      }
      processedIdsRef.current.add(n.id)

      setItems((prev) => {
        if (prev.some((x) => x.id === n.id)) {
          return prev
        }
        return [n, ...prev].slice(0, 100)
      })

      const p = prefsRef.current ?? defaultNotificationPreferences(userId)

      if (allowsInAppChannel(n.type, p)) {
        toast.info(n.title, { description: n.body.slice(0, 160) })
      }

      if (typeof window !== "undefined" && "Notification" in window && allowsBrowserChannel(n.type, p)) {
        if (Notification.permission === "granted") {
          try {
            const nn = new Notification(n.title, {
              body: n.body.slice(0, 200),
              tag: n.dedupeKey,
            })
            nn.onclick = () => {
              window.focus()
              if (n.linkPath?.startsWith("/")) {
                router.push(n.linkPath)
              }
              nn.close()
            }
          } catch {
            // ignore
          }
        }
      }
    },
    [router, userId]
  )

  useEffect(() => {
    if (!userId || isDemoSession) {
      return
    }
    const sb = supabaseRef.current
    const channel = sb
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as NotifRow
          if (row?.id) {
            handleIncoming(row)
          }
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          toast.message("실시간 알림 연결에 문제가 있습니다.", {
            description: "페이지를 새로고침하거나 잠시 후 다시 시도해 주세요.",
            duration: 4000,
          })
        }
      })

    return () => {
      void sb.removeChannel(channel)
    }
  }, [userId, isDemoSession, handleIncoming])

  const requestBrowserPermission = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      toast.error("이 브라우저에서는 데스크톱 알림을 지원하지 않습니다.")
      return
    }
    const r = await Notification.requestPermission()
    if (r === "granted") {
      toast.success("브라우저 알림이 허용되었습니다.")
    } else if (r === "denied") {
      toast.error("알림이 차단되었습니다. 브라우저 설정에서 허용할 수 있습니다.")
    }
  }

  const onOpenNotif = async (n: BillNotification) => {
    if (!n.isRead) {
      const res = await markNotificationReadAction(n.id)
      if (res.ok) {
        setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)))
      }
    }
    setOpen(false)
    if (n.linkPath?.startsWith("/")) {
      router.push(n.linkPath)
    }
  }

  const onMarkAll = async () => {
    setMarkBusy(true)
    try {
      const res = await markAllNotificationsReadAction()
      if (res.ok) {
        setItems((prev) => prev.map((x) => ({ ...x, isRead: true })))
        toast.success("모든 알림을 읽음으로 표시했습니다.")
      } else {
        toast.error(res.error)
      }
    } finally {
      setMarkBusy(false)
    }
  }

  const visibleItems = useMemo(() => {
    if (!prefs) {
      return items
    }
    return items.filter((n) => allowsInAppChannel(n.type, prefs))
  }, [items, prefs])

  if (!userId || isDemoSession) {
    return (
      <Button variant="outline" size="icon-sm" aria-label="알림" className="shrink-0" disabled title="데모·비로그인에서는 알림을 사용할 수 없습니다">
        <Bell className="size-4 opacity-50" />
      </Button>
    )
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        className={cn(
          buttonVariants({ variant: "outline", size: "icon-sm" }),
          "relative shrink-0 outline-none"
        )}
        aria-label="알림"
      >
        <Bell className="size-4" />
        {unreadCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(100vw-2rem,22rem)] p-0">
        <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
          <p className="text-sm font-semibold">알림</p>
          <div className="flex items-center gap-1">
            <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={() => void requestBrowserPermission()}>
              브라우저 알림
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1 px-2 text-xs"
              disabled={markBusy || visibleItems.every((n) => n.isRead)}
              onClick={() => void onMarkAll()}
            >
              {markBusy ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCheck className="size-3.5" />}
              모두 읽음
            </Button>
          </div>
        </div>
        <div className="max-h-[min(70vh,24rem)] overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8 text-muted-foreground">
              <Loader2 className="size-6 animate-spin" />
            </div>
          ) : visibleItems.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">새 알림이 없습니다.</p>
          ) : (
            <ul className="divide-y divide-border/50">
              {visibleItems.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    className={cn(
                      "flex w-full flex-col gap-0.5 px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/50",
                      !n.isRead && "bg-primary/[0.04]"
                    )}
                    onClick={() => void onOpenNotif(n)}
                  >
                    <span className="font-medium leading-snug">{n.title}</span>
                    <span className="line-clamp-2 text-xs text-muted-foreground">{n.body}</span>
                    <span className="text-[10px] text-muted-foreground">{formatNotifTime(n.createdAt)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="border-t border-border/60 px-3 py-2">
          <Link href="/settings" className="text-xs font-medium text-primary underline-offset-4 hover:underline">
            알림 설정
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
