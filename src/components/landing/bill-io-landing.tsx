import { LandingHeader } from "./landing-header"
import {
  LandingFaq,
  LandingFeatures,
  LandingFinalCta,
  LandingFooter,
  LandingHero,
  LandingHowItWorks,
  LandingPricing,
  LandingProblemSolution,
} from "./landing-sections"

export function BillIoLanding() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:text-primary-foreground focus:shadow-md"
      >
        본문으로 건너뛰기
      </a>
      <LandingHeader />
      <main id="main-content" tabIndex={-1}>
        <LandingHero />
        <LandingProblemSolution />
        <LandingFeatures />
        <LandingHowItWorks />
        <LandingPricing />
        <LandingFaq />
        <LandingFinalCta />
      </main>
      <LandingFooter />
    </div>
  )
}
