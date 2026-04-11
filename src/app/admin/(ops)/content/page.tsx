import { requireAdminAccess } from "@/lib/server/admin-auth"

export default async function AdminContentPage() {
  await requireAdminAccess()

  return (
    <div className="prose prose-zinc max-w-3xl text-zinc-700">
      <h1 className="text-xl font-extrabold text-zinc-900">콘텐츠·정책</h1>
      <p className="text-sm leading-relaxed text-zinc-600">
        FAQ·공지·가이드는 현재 앱 라우트와 코드 기반으로 제공됩니다. DB CMS로 옮기려면 `help_*` 테이블과 편집 UI를 추가하면
        됩니다.
      </p>
      <ul className="mt-4 list-disc space-y-2 pl-5 text-sm">
        <li>
          <strong className="text-zinc-900">FAQ / 공지 / 가이드</strong> —{" "}
          <code className="rounded bg-zinc-100 px-1 text-xs text-zinc-800">src/app/(app)/help/</code> 하위 페이지
        </li>
        <li>
          <strong className="text-zinc-900">플랜·가격 문구</strong> —{" "}
          <code className="rounded bg-zinc-100 px-1 text-xs text-zinc-800">src/lib/billing/catalog.ts</code>, 랜딩{" "}
          <code className="rounded bg-zinc-100 px-1 text-xs text-zinc-800">src/components/landing/</code>
        </li>
        <li>
          <strong className="text-zinc-900">약관·개인정보</strong> — 공개 경로{" "}
          <code className="rounded bg-zinc-100 px-1 text-xs text-zinc-800">/terms</code>,{" "}
          <code className="rounded bg-zinc-100 px-1 text-xs text-zinc-800">/privacy</code>
        </li>
      </ul>
      <p className="mt-6 text-xs text-zinc-600">
        다음 단계: `cms_pages` (slug, body_md, updated_at) + 이 화면에서 목록/미리보기만 열어도 운영 부담이 줄어듭니다.
      </p>
    </div>
  )
}
