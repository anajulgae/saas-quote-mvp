import Link from "next/link"
import { ArrowLeft, ExternalLink } from "lucide-react"

import { TAX_INVOICE_PROVIDERS, CUSTOM_PROVIDER_META } from "@/lib/tax-invoice/provider-catalog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata = {
  title: "전자세금계산서 ASP 연동 가이드 — Bill-IO",
}

export default function TaxInvoiceGuidePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-20">
      <div className="flex items-center gap-3">
        <Link href="/settings#tax-invoice-asp">
          <Button variant="ghost" size="sm" className="h-8 gap-1.5">
            <ArrowLeft className="size-4" />
            설정으로 돌아가기
          </Button>
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">전자세금계산서 ASP 연동 가이드</h1>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          Bill-IO에서 전자세금계산서를 발행하려면 외부 ASP(발급대행) 서비스에 가입하고 API 인증 정보를 등록해야 합니다.
          아래에서 지원하는 제공사별 연동 방법을 확인하세요.
        </p>
      </div>

      {/* 전체 흐름 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">연동 전체 흐름</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <ol className="list-decimal list-inside space-y-2 text-sm leading-relaxed">
            <li>
              <strong>ASP 제공사 가입</strong> — 아래 목록에서 제공사를 선택하고 해당 사이트에서 회원가입합니다.
              대부분 무료 가입 후 건당 과금 방식입니다.
            </li>
            <li>
              <strong>API 인증 정보 발급</strong> — 제공사의 개발자센터/파트너 콘솔에서 API Key, Secret 등을 발급받습니다.
            </li>
            <li>
              <strong>공동인증서 등록</strong> — 대부분의 제공사에서 전자세금용 또는 범용 공동인증서를 등록해야 합니다.
              이 작업은 제공사 사이트에서 직접 수행합니다.
            </li>
            <li>
              <strong>Bill-IO 설정</strong> — 설정 → 전자세금계산서 ASP 연동에서 제공사를 선택하고 인증 정보를 입력합니다.
            </li>
            <li>
              <strong>연결 테스트</strong> — &quot;연결 테스트&quot; 버튼으로 API 통신이 정상인지 확인합니다.
            </li>
            <li>
              <strong>청구서에서 발행</strong> — 청구서 상세에서 &quot;전자세금계산서 발행&quot; 버튼을 누르면
              등록한 ASP를 통해 국세청에 전송됩니다.
            </li>
          </ol>
        </CardContent>
      </Card>

      {/* 제공사별 가이드 */}
      <div>
        <h2 className="text-lg font-semibold mb-4">지원 제공사 ({TAX_INVOICE_PROVIDERS.length}곳)</h2>
        <div className="space-y-4">
          {TAX_INVOICE_PROVIDERS.map((p) => (
            <Card key={p.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">{p.displayName}</CardTitle>
                  <span className="rounded border border-border/50 bg-muted/30 px-1.5 py-0.5 text-xs font-mono">
                    {p.apiType}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{p.shortDescription}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <h4 className="text-sm font-medium mb-1.5">필요한 설정 항목</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    {p.fields.map((f) => (
                      <li key={f.key}>
                        <strong className="text-foreground">{f.label}</strong>
                        {f.required ? <span className="text-destructive ml-0.5">*</span> : <span className="ml-1">(선택)</span>}
                        {f.helpText ? <span className="ml-1">— {f.helpText}</span> : null}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-1.5">연동 순서</h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                    <li>
                      <a href={p.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        {p.displayName} 사이트
                      </a>
                      에서 회원가입 및 파트너/개발자 등록
                    </li>
                    {p.id === "popbill" ? (
                      <>
                        <li>파트너 콘솔에서 LinkID와 SecretKey 발급</li>
                        <li>테스트 환경에서 개발 후 운영 환경으로 전환</li>
                      </>
                    ) : p.id === "barobill" ? (
                      <>
                        <li>파트너 콘솔에서 CERTKEY(연동인증키) 발급</li>
                        <li>테스트/운영 사이트에 공동인증서 등록</li>
                        <li>CERTKEY, 사업자번호, 회원 ID를 Bill-IO에 입력</li>
                      </>
                    ) : p.id === "smartbill" ? (
                      <>
                        <li>스마트빌 포털에서 요금제 설정</li>
                        <li>관리자함 → Open API → 인증 코드 생성 (32자리)</li>
                        <li>공동인증서를 스마트빌 포털에 등록</li>
                      </>
                    ) : p.id === "bolta" ? (
                      <>
                        <li>볼타 대시보드에서 API Access Token 발급</li>
                        <li>샌드박스 환경에서 테스트 후 운영 전환</li>
                      </>
                    ) : (
                      <>
                        <li>개발자센터에서 API Key/인증정보 발급</li>
                        <li>필요 시 공동인증서 등록</li>
                      </>
                    )}
                    <li>Bill-IO 설정에서 제공사 선택 후 인증 정보 입력</li>
                    <li>&quot;연결 테스트&quot;로 통신 확인</li>
                  </ol>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {p.website ? (
                    <a
                      href={p.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-md border border-border/60 px-2.5 py-1 text-sm hover:bg-muted/30 transition-colors"
                    >
                      <ExternalLink className="size-3.5" />
                      홈페이지
                    </a>
                  ) : null}
                  {p.docsUrl ? (
                    <a
                      href={p.docsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-md border border-border/60 px-2.5 py-1 text-sm hover:bg-muted/30 transition-colors"
                    >
                      <ExternalLink className="size-3.5" />
                      API 문서
                    </a>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}

          {/* 수동 입력 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{CUSTOM_PROVIDER_META.displayName}</CardTitle>
              <p className="text-sm text-muted-foreground">{CUSTOM_PROVIDER_META.shortDescription}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground leading-relaxed">
                위 목록에 없는 제공사를 사용하는 경우, &quot;수동 입력 (기타 제공사)&quot;를 선택하면
                API 엔드포인트 URL과 인증 정보를 직접 입력할 수 있습니다.
              </p>
              <div>
                <h4 className="text-sm font-medium mb-1.5">입력 항목</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  {CUSTOM_PROVIDER_META.fields.map((f) => (
                    <li key={f.key}>
                      <strong className="text-foreground">{f.label}</strong>
                      {f.required ? <span className="text-destructive ml-0.5">*</span> : <span className="ml-1">(선택)</span>}
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* FAQ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">자주 묻는 질문</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold">공동인증서는 어디에 등록하나요?</h4>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
              공동인증서는 Bill-IO가 아닌 <strong>ASP 제공사 사이트</strong>에 등록합니다.
              각 제공사의 관리자 콘솔에서 전자세금용 또는 범용 공동인증서를 업로드하세요.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold">테스트 환경과 운영 환경의 차이는?</h4>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
              테스트 환경에서 발행한 세금계산서는 국세청에 실제 전송되지 않습니다.
              개발·검증이 끝나면 환경 설정을 &quot;운영&quot;으로 바꾸고, 운영용 인증키를 사용하세요.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold">API 인증 정보는 안전하게 저장되나요?</h4>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
              인증 정보는 Supabase 데이터베이스에 저장됩니다. 운영 환경에서는 암호화 또는 Vault 적용을 권장합니다.
              API Secret은 저장 후 마스킹 처리되어 화면에 표시되지 않습니다.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold">건당 비용은 어떻게 되나요?</h4>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
              Bill-IO는 발행 건당 추가 과금을 하지 않습니다. 비용은 선택한 ASP 제공사의 요금 정책에 따릅니다.
              대부분 건당 50~100원 수준이며, 볼륨 할인이 적용되는 곳도 있습니다.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold">연결 테스트가 실패하면?</h4>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
              인증 정보(Key, Secret, 사업자번호 등)가 정확한지 확인하세요.
              테스트/운영 환경이 일치하는지, 제공사 사이트에서 인증서가 등록되어 있는지도 점검합니다.
              문제가 지속되면 고객센터로 문의해 주세요.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
