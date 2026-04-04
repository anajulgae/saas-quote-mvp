import type { ReactNode } from "react"

import { authEyebrowClass, authNarrowPagePaddingClass, authNarrowStackClass, authPageBgClass } from "@/lib/auth-ui"
import { cn } from "@/lib/utils"

export function AuthScreenShell({
  eyebrow,
  children,
  className,
}: {
  eyebrow?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn(authPageBgClass, authNarrowPagePaddingClass)}>
      <div className={cn(authNarrowStackClass, className)}>
        {eyebrow ? <p className={authEyebrowClass}>{eyebrow}</p> : null}
        {children}
      </div>
    </div>
  )
}
