"use client"

import { useRouter } from "next/navigation"
import { useTransition } from "react"

import { adminUpdateSupportTicketAction } from "@/app/admin/actions"

export function AdminTicketForm({
  ticketId,
  initialStatus,
  initialNote,
}: {
  ticketId: string
  initialStatus: string
  initialNote: string | null
}) {
  const router = useRouter()
  const [pending, start] = useTransition()

  return (
    <form
      className="space-y-4 rounded-lg border border-zinc-800 bg-zinc-900/40 p-4"
      action={(fd) => {
        start(async () => {
          const status = String(fd.get("status") ?? "")
          const operatorNote = String(fd.get("operator_note") ?? "")
          const r = await adminUpdateSupportTicketAction({
            ticketId,
            status,
            operatorNote,
          })
          if (!r.ok) alert(r.error)
          else router.refresh()
        })
      }}
    >
      <div>
        <label className="text-xs font-semibold text-zinc-500">상태</label>
        <select
          name="status"
          defaultValue={initialStatus === "open" ? "new" : initialStatus}
          disabled={pending}
          className="mt-1 block w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white"
        >
          <option value="new">신규</option>
          <option value="open">open (레거시)</option>
          <option value="in_progress">처리중</option>
          <option value="resolved">답변완료</option>
          <option value="on_hold">보류</option>
        </select>
      </div>
      <div>
        <label className="text-xs font-semibold text-zinc-500">운영 메모 (내부)</label>
        <textarea
          name="operator_note"
          rows={5}
          defaultValue={initialNote ?? ""}
          disabled={pending}
          className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50"
      >
        저장
      </button>
    </form>
  )
}
