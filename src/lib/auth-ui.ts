import { cn } from "@/lib/utils"

/** 인증 계열 전체 페이지 배경 — 은은한 틸 하이라이트 */
export const authPageBgClass =
  "min-h-screen bg-[radial-gradient(ellipse_100%_70%_at_50%_-8%,oklch(0.93_0.045_175_/_0.45),transparent_52%),linear-gradient(180deg,oklch(0.998_0.004_260),oklch(0.97_0.01_260))]"

/** 로그인·회원가입 2열 레이아웃 바깥 컨테이너 */
export const authSplitOuterClass = cn(authPageBgClass, "px-4 py-8 sm:py-10 lg:px-8")

/** 단일 열 인증 페이지(찾기·재설정·인증 안내) 세로 패딩 */
export const authNarrowPagePaddingClass = "px-4 py-10 sm:py-14"

/** 좁은 인증 콘텐츠 스택 */
export const authNarrowStackClass = "mx-auto w-full max-w-md space-y-5"

/** 상단 맥락 라벨(계정 · …) */
export const authEyebrowClass =
  "text-center text-xs font-medium tracking-wide text-muted-foreground"

/** 기본 인증 카드 */
export const authCardClass =
  "border-border/55 bg-card/95 shadow-elevated ring-1 ring-border/45 backdrop-blur-[1px]"

/** 카드 상단 아이콘 박스 */
export const authIconBoxClass =
  "flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm"

/** 인증 화면 보조 링크(하단) */
export const authFooterLinkClass =
  "text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
