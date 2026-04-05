import Link from "next/link"

const linkClass =
  "font-medium text-foreground/80 underline-offset-4 hover:text-foreground hover:underline"

/** 로그인·비밀번호 재설정 등 인증 화면 하단 */
export function AuthLegalLinks({
  className,
  showBilling,
  navLabel,
}: {
  className?: string
  /** 앱 셸 사이드바 등: 요금·플랜 페이지 링크 */
  showBilling?: boolean
  /** 지정 시 `<nav aria-label="…">` 로 렌더 (접근성) */
  navLabel?: string
}) {
  const Root = navLabel ? "nav" : "div"
  return (
    <Root
      {...(navLabel ? { "aria-label": navLabel } : {})}
      className={
        className ??
        "text-center text-[11px] leading-relaxed text-muted-foreground"
      }
    >
      <Link href="/terms" className={linkClass}>
        이용약관
      </Link>
      <span className="mx-1.5 text-border" aria-hidden>
        ·
      </span>
      <Link href="/privacy" className={linkClass}>
        개인정보처리방침
      </Link>
      {showBilling ? (
        <>
          <span className="mx-1.5 text-border" aria-hidden>
            ·
          </span>
          <Link href="/billing" className={linkClass}>
            요금 안내
          </Link>
        </>
      ) : null}
    </Root>
  )
}
