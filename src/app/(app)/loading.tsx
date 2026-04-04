import { Loader2 } from "lucide-react"

export default function AppLoading() {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 px-4">
      <Loader2 className="size-8 animate-spin text-muted-foreground" aria-hidden />
      <p className="text-sm text-muted-foreground">불러오는 중…</p>
    </div>
  )
}
