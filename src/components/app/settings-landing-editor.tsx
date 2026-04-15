"use client"

import { useCallback, useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ExternalLink, Loader2, Save, Sparkles } from "lucide-react"
import { toast } from "sonner"

import {
  generateBusinessLandingDraftAction,
  saveBusinessPublicPageAction,
} from "@/app/actions"
import { LandingShareDialog } from "@/components/app/landing-share-dialog"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type {
  BusinessLandingFaqItem,
  BusinessLandingServiceItem,
  BusinessLandingSocialLink,
  BusinessPublicPage,
} from "@/types/domain"

function emptyService(): BusinessLandingServiceItem {
  return { title: "", description: "" }
}

function emptySocial(): BusinessLandingSocialLink {
  return { label: "", url: "" }
}

function emptyFaq(): BusinessLandingFaqItem {
  return { question: "", answer: "" }
}

export function SettingsLandingEditor({
  initialPage,
  siteOrigin,
  inquiryFormEnabled,
  inquiryFormToken,
}: {
  initialPage: BusinessPublicPage
  siteOrigin: string
  inquiryFormEnabled: boolean
  inquiryFormToken: string | null
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [aiPending, startAi] = useTransition()
  const [shareOpen, setShareOpen] = useState(false)

  const [slug, setSlug] = useState(initialPage.slug)
  const [isPublished, setIsPublished] = useState(initialPage.isPublished)
  const [template, setTemplate] = useState<"default" | "minimal">(initialPage.template)
  const [businessName, setBusinessName] = useState(initialPage.businessName)
  const [headline, setHeadline] = useState(initialPage.headline)
  const [introOneLine, setIntroOneLine] = useState(initialPage.introOneLine)
  const [about, setAbout] = useState(initialPage.about)
  const [services, setServices] = useState<BusinessLandingServiceItem[]>(() => {
    const s = initialPage.services.length ? initialPage.services : [emptyService(), emptyService(), emptyService()]
    return s.slice(0, 6)
  })
  const [contactPhone, setContactPhone] = useState(initialPage.contactPhone)
  const [contactEmail, setContactEmail] = useState(initialPage.contactEmail)
  const [location, setLocation] = useState(initialPage.location)
  const [businessHours, setBusinessHours] = useState(initialPage.businessHours)
  const [socialLinks, setSocialLinks] = useState<BusinessLandingSocialLink[]>(() => {
    const s = initialPage.socialLinks.length ? initialPage.socialLinks : [emptySocial()]
    return s.slice(0, 8)
  })
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(initialPage.heroImageUrl ?? null)
  const [seoTitle, setSeoTitle] = useState(initialPage.seoTitle)
  const [seoDescription, setSeoDescription] = useState(initialPage.seoDescription)
  const [faq, setFaq] = useState<BusinessLandingFaqItem[]>(() => {
    const f = initialPage.faq.length ? initialPage.faq : [emptyFaq(), emptyFaq()]
    return f.slice(0, 3)
  })
  const [trustPointsText, setTrustPointsText] = useState(() =>
    initialPage.trustPoints.length ? initialPage.trustPoints.join("\n") : ""
  )
  const [ctaText, setCtaText] = useState(initialPage.ctaText || "문의하기")
  const [inquiryCtaEnabled, setInquiryCtaEnabled] = useState(initialPage.inquiryCtaEnabled)
  const [aiGeneratedAt, setAiGeneratedAt] = useState<string | null>(initialPage.aiGeneratedAt ?? null)

  const [aiBusinessName, setAiBusinessName] = useState(initialPage.businessName)
  const [aiIndustry, setAiIndustry] = useState("")
  const [aiRegion, setAiRegion] = useState("")
  const [aiServicesHint, setAiServicesHint] = useState("")
  const [aiStrengths, setAiStrengths] = useState("")
  const [aiTarget, setAiTarget] = useState("")
  const [aiTone, setAiTone] = useState<"default" | "friendly" | "professional">("default")

  const publicUrl = useMemo(() => {
    if (!slug.trim() || !isPublished) {
      return ""
    }
    return `${siteOrigin.replace(/\/$/, "")}/biz/${encodeURIComponent(slug.trim().toLowerCase())}`
  }, [siteOrigin, slug, isPublished])

  const applyDraft = useCallback(
    (draft: {
      headline: string
      introOneLine: string
      about: string
      services: BusinessLandingServiceItem[]
      ctaText: string
      faq: BusinessLandingFaqItem[]
      trustPoints: string[]
      seoTitle: string
      seoDescription: string
    }) => {
      setHeadline(draft.headline)
      setIntroOneLine(draft.introOneLine)
      setAbout(draft.about)
      const next = draft.services.slice(0, 6)
      setServices(next.length >= 3 ? next : [...next, ...Array(3 - next.length).fill(null).map(() => emptyService())])
      setCtaText(draft.ctaText)
      const fq = draft.faq.slice(0, 3)
      setFaq(fq.length >= 2 ? fq : [...fq, ...Array(2 - fq.length).fill(null).map(() => emptyFaq())])
      setTrustPointsText(draft.trustPoints.join("\n"))
      if (draft.seoTitle.trim()) {
        setSeoTitle(draft.seoTitle)
      }
      if (draft.seoDescription.trim()) {
        setSeoDescription(draft.seoDescription)
      }
    },
    []
  )

  const onPickHero = (file: File | null) => {
    if (!file) {
      return
    }
    if (file.size > 480_000) {
      toast.error("이미지는 약 480KB 이하로 올려 주세요.")
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const r = String(reader.result ?? "")
      if (r.startsWith("data:image/")) {
        setHeroImageUrl(r)
      } else {
        toast.error("이미지 파일만 업로드할 수 있습니다.")
      }
    }
    reader.readAsDataURL(file)
  }

  const save = () => {
    const trustPoints = trustPointsText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, 6)

    const cleanedServices = services
      .map((s) => ({
        title: s.title.trim(),
        description: s.description.trim(),
      }))
      .filter((s) => s.title.length > 0)
      .slice(0, 6)

    const cleanedSocial = socialLinks
      .map((s) => ({ label: s.label.trim(), url: s.url.trim() }))
      .filter((s) => s.label && s.url)
      .slice(0, 8)

    const cleanedFaq = faq
      .map((f) => ({ question: f.question.trim(), answer: f.answer.trim() }))
      .filter((f) => f.question && f.answer)
      .slice(0, 6)

    startTransition(async () => {
      const res = await saveBusinessPublicPageAction({
        slug,
        isPublished,
        template,
        businessName,
        headline,
        introOneLine,
        about,
        services: cleanedServices,
        contactPhone,
        contactEmail,
        location,
        businessHours,
        socialLinks: cleanedSocial,
        heroImageUrl: heroImageUrl ?? null,
        seoTitle,
        seoDescription,
        faq: cleanedFaq,
        trustPoints,
        ctaText,
        inquiryCtaEnabled,
        aiGeneratedAt,
      })
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      setSlug(res.page.slug)
      toast.success("업체 소개 페이지를 저장했습니다.")
      router.refresh()
    })
  }

  const runAi = () => {
    startAi(async () => {
      const res = await generateBusinessLandingDraftAction({
        businessName: aiBusinessName,
        industry: aiIndustry,
        region: aiRegion,
        servicesHint: aiServicesHint,
        strengths: aiStrengths,
        targetCustomers: aiTarget,
        tone: aiTone,
      })
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      applyDraft(res.draft)
      setAiGeneratedAt(res.generatedAt)
      if (!businessName.trim() && res.draft.headline) {
        setBusinessName(aiBusinessName.trim())
      }
      toast.success("AI 초안을 폼에 반영했습니다. 문구를 확인한 뒤 저장해 주세요.")
    })
  }

  return (
    <div className="space-y-6">
      <LandingShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        landingUrl={publicUrl}
        businessName={businessName}
      />

      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">공개·링크</CardTitle>
          <CardDescription>
            공개 문의 폼이 켜져 있어야 랜딩의 &quot;문의하기&quot;가 연결됩니다.{" "}
            <Link href="/settings#public-inquiry" className="font-medium text-primary underline-offset-2 hover:underline">
              공개 문의 설정
            </Link>
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!publicUrl}
            onClick={() => setShareOpen(true)}
          >
            링크·QR 공유
          </Button>
          {publicUrl ? (
            <Link
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "inline-flex items-center")}
            >
              <ExternalLink className="mr-1.5 size-3.5" aria-hidden />
              새 탭에서 보기
            </Link>
          ) : null}
          {!inquiryFormEnabled || !inquiryFormToken ? (
            <p className="w-full text-xs text-amber-700 dark:text-amber-200">
              문의 폼이 비활성이거나 토큰이 없으면 CTA 버튼이 숨겨집니다.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base">AI 소개 초안</CardTitle>
              <CardDescription>입력한 정보를 바탕으로 문구 초안만 생성합니다. 저장 전에 반드시 검토하세요.</CardDescription>
            </div>
            <Button type="button" size="sm" disabled={aiPending} onClick={runAi}>
              {aiPending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Sparkles className="size-4" aria-hidden />}
              <span className="ml-1.5">{aiPending ? "생성 중…" : "초안 생성"}</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-xs font-medium text-foreground">업체명 (AI)</label>
            <Input value={aiBusinessName} onChange={(e) => setAiBusinessName(e.target.value)} placeholder="예: 햇살 청소" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">업종</label>
            <Input value={aiIndustry} onChange={(e) => setAiIndustry(e.target.value)} placeholder="예: 입주 청소" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">지역</label>
            <Input value={aiRegion} onChange={(e) => setAiRegion(e.target.value)} placeholder="예: 수원·용인" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-xs font-medium text-foreground">주요 서비스·키워드</label>
            <Textarea value={aiServicesHint} onChange={(e) => setAiServicesHint(e.target.value)} rows={2} placeholder="콤마로 구분해도 됩니다." />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-xs font-medium text-foreground">강점·특징</label>
            <Textarea value={aiStrengths} onChange={(e) => setAiStrengths(e.target.value)} rows={2} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-xs font-medium text-foreground">타깃 고객</label>
            <Input value={aiTarget} onChange={(e) => setAiTarget(e.target.value)} placeholder="예: 소규모 사무실, 1인 가구" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">톤</label>
            <select
              className={cn(
                "flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm",
                "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              )}
              value={aiTone}
              onChange={(e) => setAiTone(e.target.value as typeof aiTone)}
            >
              <option value="default">기본</option>
              <option value="friendly">친근</option>
              <option value="professional">전문적</option>
            </select>
          </div>
          {aiGeneratedAt ? (
            <p className="text-xs text-muted-foreground sm:col-span-2">
              마지막 AI 반영: {new Date(aiGeneratedAt).toLocaleString("ko-KR")}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">페이지 설정</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} className="size-4 rounded border-input" />
            공개 (끄면 /biz 주소로 접근할 수 없습니다)
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">페이지 주소 (slug)</label>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <span className="shrink-0">/biz/</span>
                <Input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase())} placeholder="my-studio" className="font-mono text-xs" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">템플릿</label>
              <select
                className={cn(
                  "flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm",
                  "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                )}
                value={template}
                onChange={(e) => setTemplate(e.target.value as "default" | "minimal")}
              >
                <option value="default">기본</option>
                <option value="minimal">미니멀</option>
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">페이지 제목(업체명)</label>
            <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">한 줄 소개</label>
            <Input value={introOneLine} onChange={(e) => setIntroOneLine(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">메인 헤드라인</label>
            <Input value={headline} onChange={(e) => setHeadline(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">상세 소개</label>
            <Textarea value={about} onChange={(e) => setAbout(e.target.value)} rows={6} className="min-h-[120px]" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">대표 이미지</label>
            <Input type="file" accept="image/*" className="text-xs" onChange={(e) => onPickHero(e.target.files?.[0] ?? null)} />
            {heroImageUrl ? (
              <div className="mt-2 flex items-start gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={heroImageUrl} alt="" className="max-h-28 rounded-md border object-cover" />
                <Button type="button" variant="ghost" size="sm" onClick={() => setHeroImageUrl(null)}>
                  제거
                </Button>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">서비스 (3~6개 권장)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {services.map((s, i) => (
            <div key={i} className="rounded-lg border border-border/50 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">서비스 {i + 1}</span>
                {services.length > 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setServices(services.filter((_, j) => j !== i))}
                  >
                    삭제
                  </Button>
                ) : null}
              </div>
              <Input
                placeholder="제목"
                value={s.title}
                onChange={(e) => {
                  const next = [...services]
                  next[i] = { ...next[i], title: e.target.value }
                  setServices(next)
                }}
              />
              <Textarea
                placeholder="설명"
                value={s.description}
                onChange={(e) => {
                  const next = [...services]
                  next[i] = { ...next[i], description: e.target.value }
                  setServices(next)
                }}
                rows={2}
              />
            </div>
          ))}
          {services.length < 6 ? (
            <Button type="button" variant="outline" size="sm" onClick={() => setServices([...services, emptyService()])}>
              서비스 추가
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">연락·위치</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium">전화</label>
            <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">이메일</label>
            <Input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} type="email" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-xs font-medium">지역</label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-xs font-medium">영업시간</label>
            <Textarea value={businessHours} onChange={(e) => setBusinessHours(e.target.value)} rows={2} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">SNS 링크</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {socialLinks.map((s, i) => (
            <div key={i} className="flex flex-wrap gap-2 sm:flex-nowrap">
              <Input
                placeholder="라벨 (예: 인스타그램)"
                className="sm:w-40"
                value={s.label}
                onChange={(e) => {
                  const next = [...socialLinks]
                  next[i] = { ...next[i], label: e.target.value }
                  setSocialLinks(next)
                }}
              />
              <Input
                placeholder="https://"
                className="min-w-0 flex-1"
                value={s.url}
                onChange={(e) => {
                  const next = [...socialLinks]
                  next[i] = { ...next[i], url: e.target.value }
                  setSocialLinks(next)
                }}
              />
              {socialLinks.length > 1 ? (
                <Button type="button" variant="ghost" size="sm" onClick={() => setSocialLinks(socialLinks.filter((_, j) => j !== i))}>
                  삭제
                </Button>
              ) : null}
            </div>
          ))}
          {socialLinks.length < 8 ? (
            <Button type="button" variant="outline" size="sm" onClick={() => setSocialLinks([...socialLinks, emptySocial()])}>
              링크 추가
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">신뢰 포인트·FAQ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium">신뢰 포인트 (줄바꿈으로 구분, 2~3개 권장)</label>
            <Textarea value={trustPointsText} onChange={(e) => setTrustPointsText(e.target.value)} rows={3} />
          </div>
          {faq.map((f, i) => (
            <div key={i} className="rounded-lg border border-border/50 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">FAQ {i + 1}</span>
                {faq.length > 1 ? (
                  <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setFaq(faq.filter((_, j) => j !== i))}>
                    삭제
                  </Button>
                ) : null}
              </div>
              <Input
                placeholder="질문"
                value={f.question}
                onChange={(e) => {
                  const next = [...faq]
                  next[i] = { ...next[i], question: e.target.value }
                  setFaq(next)
                }}
              />
              <Textarea
                placeholder="답변"
                value={f.answer}
                onChange={(e) => {
                  const next = [...faq]
                  next[i] = { ...next[i], answer: e.target.value }
                  setFaq(next)
                }}
                rows={2}
              />
            </div>
          ))}
          {faq.length < 3 ? (
            <Button type="button" variant="outline" size="sm" onClick={() => setFaq([...faq, emptyFaq()])}>
              FAQ 추가
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">문의 CTA·SEO</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={inquiryCtaEnabled}
              onChange={(e) => setInquiryCtaEnabled(e.target.checked)}
              className="size-4 rounded border-input"
            />
            문의하기 버튼 표시 (공개 문의 폼으로 연결)
          </label>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">CTA 버튼 문구</label>
            <Input value={ctaText} onChange={(e) => setCtaText(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">SEO 제목</label>
            <Input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} placeholder="비우면 업체명 기준으로 표시" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">SEO 설명</label>
            <Textarea value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} rows={3} />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={save} disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Save className="size-4" aria-hidden />}
          <span className="ml-1.5">{pending ? "저장 중…" : "저장"}</span>
        </Button>
      </div>
    </div>
  )
}
