import { cn } from "@/lib/utils"

/** 인증 계열 전체 페이지 배경 */
export const authPageBgClass =
  "min-h-screen bg-[radial-gradient(circle_at_top_left,#ffffff,#f4f4f5_50%,#eef2ff)]"

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
  "border-border/80 bg-background/95 shadow-md ring-1 ring-border/40"

/** 카드 상단 아이콘 박스 */
export const authIconBoxClass =
  "flex size-11 shrink-0 items-center justify-center rounded-xl bg-foreground text-background"

/** 인증 화면 보조 링크(하단) */
export const authFooterLinkClass =
  "text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
