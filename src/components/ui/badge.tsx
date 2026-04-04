import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide whitespace-nowrap transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/45 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow-sm [a]:hover:bg-primary/90",
        secondary:
          "border-border/55 bg-muted/70 text-foreground [a]:hover:bg-muted dark:bg-muted/50",
        destructive:
          "border-destructive/20 bg-destructive/10 text-destructive focus-visible:ring-destructive/20 dark:border-destructive/30 dark:bg-destructive/15 dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive/15",
        outline:
          "border-border/75 bg-card text-foreground [a]:hover:bg-muted/80",
        ghost:
          "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground dark:hover:bg-muted/50",
        link: "border-transparent text-primary underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
