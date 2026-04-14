"use client"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-white font-sans text-zinc-900 antialiased">
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
          <div className="max-w-md rounded-xl border border-zinc-200 bg-white p-8 text-center shadow-lg">
            <h1 className="text-lg font-bold">오류가 발생했습니다</h1>
            <p className="mt-3 text-sm leading-relaxed text-zinc-600">
              예기치 않은 문제가 생겼습니다. 잠시 후 다시 시도해 주세요.
            </p>
            {error.digest && (
              <p className="mt-2 text-xs text-zinc-400">오류 코드: {error.digest}</p>
            )}
            <button
              type="button"
              onClick={reset}
              className="mt-6 inline-flex items-center rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
            >
              다시 시도
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
