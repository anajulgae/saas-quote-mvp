import type { ReactNode } from"react"
import Link from"next/link"
import { ArrowLeft, ExternalLink } from"lucide-react"

import { PageHeader } from"@/components/app/page-header"
import { buttonVariants } from"@/components/ui/button-variants"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from"@/components/ui/card"
import { cn } from"@/lib/utils"

function OutLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
    >
      {children}
      <ExternalLink className="size-3 shrink-0 opacity-70" aria-hidden />
    </a>
  )
}

const payloadExample = `{"billIoVersion": 1,"channelKind":"kakao_alimtalk","senderKey":"설정에 입력한 발신 프로필 키","templateCode":"설정에 입력한 템플릿 코드","recipientPhone":"01012345678","variables": {"shareUrl":"https://…/invoice-view/… 또는 /quote-view/…","docType":"invoice | quote","invoiceNumber":"청구 시에만","amountWon":"청구 시에만 (원 단위 문자열)","quoteNumber":"견적 시에만","title":"견적 시에만 (제목 일부)"
  }
}`

export default function KakaoAlimtalkGuidePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-10">
      <PageHeader
        title="카카오 알림톡(BYOA) 설정 가이드"
        description="Bill-IO Pro에서 견적·청구 발송 시 알림톡을 쓰려면, 카카오·발송 대행사·본인 프록시를 순서대로 준비합니다. Bill-IO는 메시지 비용을 받지 않으며, 실제 발송은 귀하의 계정으로 이루어집니다."
        action={
          <Link
            href="/settings#messaging-byoa"
            className={cn(buttonVariants({ variant:"outline", size:"sm" }),"inline-flex gap-1.5")}
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            설정으로 돌아가기
          </Link>
        }
      />

      <Card className="border-border/70">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">1. 전체 흐름 이해하기</CardTitle>
          <CardDescription className="text-sm leading-relaxed">
            BYOA(Bring Your Own Account)는 Bill-IO 서버가 <strong className="text-foreground">귀하가 지정한 HTTPS 주소</strong>
            로 JSON만 POST하고, 그 뒤 알림톡 API 호출·과금은 <strong className="text-foreground">귀하의 프록시 + 발송 대행사</strong>가
            담당하는 방식입니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <ol className="list-inside list-decimal space-y-2">
            <li>
              <span className="text-foreground">카카오</span>에서 채널·발신 프로필을 만들고, 알림톡 템플릿을 검수·승인받습니다.
            </li>
            <li>
              <span className="text-foreground">Solapi, NHN Cloud(Notification)</span> 등 알림톡을 지원하는 대행사에 가입하고, API 키·발신
              프로필 키(senderKey)·템플릿 코드를 확보합니다.
            </li>
            <li>
              Bill-IO가 보내는 페이로드 형식(
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">BillIoMessagingPayloadV1</code>)을 대행사 API
              형식으로 바꿔 주는 <span className="text-foreground">프록시</span>(서버리스·자체 API)를 만듭니다.
            </li>
            <li>
              설정의 <span className="text-foreground">「메시지 채널 연결」</span>에 프록시 URL·인증 헤더·senderKey·템플릿 코드를 넣고
              저장합니다.
            </li>
            <li>견적·청구 「보내기」에서 수신 번호를 넣고 알림톡 발송 요청을 누릅니다.</li>
          </ol>
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">2. 카카오·발송 대행사 (공식 페이지)</CardTitle>
          <CardDescription className="text-sm leading-relaxed">
            아래에서 채널 개설, 알림톡 템플릿 작성·검수, 발신 프로필 키 확인을 진행합니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2.5 text-sm">
            <li className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-2">
              <span className="shrink-0 font-medium text-foreground">카카오 비즈니스</span>
              <OutLink href="https://business.kakao.com/">채널·비즈니스 계정 관리</OutLink>
            </li>
            <li className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-2">
              <span className="shrink-0 font-medium text-foreground">알림톡(카카오 비즈니스 가이드)</span>
              <OutLink href="https://kakaobusiness.gitbook.io/main/ad/infotalk.md">알림톡 개요 · 유형 · 심사</OutLink>
            </li>
            <li className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-2">
              <span className="shrink-0 font-medium text-foreground">Solapi</span>
              <OutLink href="https://solapi.com/">홈페이지</OutLink>
              <span className="hidden text-muted-foreground sm:inline">·</span>
              <OutLink href="https://developers.solapi.com/">개발자 문서</OutLink>
            </li>
            <li className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-2">
              <span className="shrink-0 font-medium text-foreground">NHN Cloud Notification</span>
              <OutLink href="https://www.nhncloud.com/kr/service/notification">서비스 소개</OutLink>
              <span className="hidden text-muted-foreground sm:inline">·</span>
              <OutLink href="https://docs.nhncloud.com/ko/Notification/KakaoTalk%20Bizmessage/ko/Overview/">
                카카오톡 비즈메시지 문서
              </OutLink>
            </li>
          </ul>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            사용 중인 대행사가 다르면 해당 업체 문서에서「알림톡」「카카오 비즈메시지」「senderKey·templateCode」항목을 검색해 주세요.
          </p>
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">3. 설정 화면에 넣을 값</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <dl className="space-y-3">
            <div>
              <dt className="font-medium text-foreground">HTTPS 발송 엔드포인트</dt>
              <dd className="mt-1 text-xs">
                Bill-IO가 <code className="rounded bg-muted px-1 font-mono">POST</code>로 JSON을 보낼 수 있는 주소입니다. 반드시{""}
                <code className="rounded bg-muted px-1 font-mono">https://</code> 로 시작해야 합니다. Cloudflare Workers, Vercel
                Serverless, 자체 백엔드 등 어디든 가능합니다.
              </dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">인증 헤더 이름 · API 키</dt>
              <dd className="mt-1 text-xs">
                프록시가 검증에 쓰도록 설계합니다. 예: 헤더 이름 <code className="rounded bg-muted px-1 font-mono">Authorization</code>,
                값에 <code className="rounded bg-muted px-1 font-mono">Bearer …</code> 형태로 대행사 API 키를 넣고, 프록시에서 대행사 API를
                호출할 때 동일하게 사용합니다. Bill-IO DB에 암호화 저장되며, 발송 요청 시에만 서버에서 읽습니다.
              </dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">발신 프로필 키(senderKey)</dt>
              <dd className="mt-1 text-xs">카카오·대행사 콘솔에서 확인하는 발신 프로필(채널) 식별자입니다.</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">알림톡 템플릿 코드</dt>
              <dd className="mt-1 text-xs">
                검수 승인된 템플릿의 코드입니다. 템플릿 본문의 변수 칸은 아래 <code className="rounded bg-muted px-1 font-mono">variables</code>{""}
                키와 맞춰 대행사 규칙에 따라 매핑해야 합니다.
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">4. Bill-IO가 보내는 JSON (BillIoMessagingPayloadV1)</CardTitle>
          <CardDescription>
            <code className="rounded bg-muted px-1 font-mono text-xs">Content-Type: application/json</code> 본문 예시입니다.{""}
            <code className="rounded bg-muted px-1 font-mono text-xs">variables</code>는 템플릿에 맞게 프록시에서 대행사 필드로 옮깁니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <pre className="max-h-[min(420px,55vh)] overflow-auto rounded-lg border border-border/70 bg-muted/25 p-3 font-mono text-sm leading-relaxed text-foreground">
            {payloadExample}
          </pre>
          <div className="space-y-2 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">청구 발송 시 variables</p>
            <ul className="list-inside list-disc space-y-1">
              <li>
                <code className="font-mono">shareUrl</code>, <code className="font-mono">docType</code> ={""}
                <code className="font-mono">invoice</code>, <code className="font-mono">invoiceNumber</code>,{""}
                <code className="font-mono">amountWon</code>
              </li>
            </ul>
            <p className="font-medium text-foreground">견적 발송 시 variables</p>
            <ul className="list-inside list-disc space-y-1">
              <li>
                <code className="font-mono">shareUrl</code>, <code className="font-mono">docType</code> ={""}
                <code className="font-mono">quote</code>, <code className="font-mono">quoteNumber</code>,{""}
                <code className="font-mono">title</code>
              </li>
            </ul>
            <p>
              수신 번호는 본문의 <code className="font-mono">recipientPhone</code>에 숫자만(국가번호 제외 010 형태 등)으로 들어갑니다. 고객
              카드 전화번호 또는 발송 창에 입력한 값이 사용됩니다.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">5. 자주 막히는 지점</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <ul className="list-inside list-disc space-y-2">
            <li>
              <span className="text-foreground">템플릿 미승인·변수 불일치</span> — 카카오 검수 전이거나, 템플릿 변수 개수·이름이 프록시
              매핑과 다르면 대행사 API가 거절합니다.
            </li>
            <li>
              <span className="text-foreground">프록시 4xx/5xx</span> — Bill-IO는 응답 본문 앞부분을 에러 메시지로 보여 줍니다. 프록시
              로그와 대행사 응답 코드를 확인하세요.
            </li>
            <li>
              <span className="text-foreground">수신 번호 없음</span> — 고객에 전화번호가 없으면 발송 창에 직접 입력해야 합니다.
            </li>
            <li>
              <span className="text-foreground">Pro 플랜</span> — 무료 플랜에서는 이 채널 설정·발송 요청이 비활성화됩니다.
            </li>
          </ul>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Link href="/settings#messaging-byoa" className={cn(buttonVariants({ size:"default" }),"inline-flex")}>
          설정에서 엔드포인트 입력하기
        </Link>
      </div>
    </div>
  )
}
