export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="space-y-3 text-center">
        <div className="mx-auto size-10 animate-pulse rounded-2xl bg-foreground/10" />
        <p className="text-sm text-muted-foreground">화면을 불러오는 중입니다...</p>
      </div>
    </div>
  )
}
