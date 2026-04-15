export type ProviderFieldType = "text" | "password" | "select"

export type ProviderField = {
  key: string
  label: string
  type: ProviderFieldType
  placeholder?: string
  required?: boolean
  helpText?: string
  options?: Array<{ value: string; label: string }>
}

export type ProviderMeta = {
  id: string
  displayName: string
  shortDescription: string
  apiType: "REST" | "SOAP" | "SDK"
  website: string
  docsUrl: string
  fields: ProviderField[]
}

export const TAX_INVOICE_PROVIDERS: ProviderMeta[] = [
  {
    id: "popbill",
    displayName: "팝빌 (Popbill)",
    shortDescription: "REST API · Bearer Token 인증 · Node.js SDK 제공",
    apiType: "REST",
    website: "https://www.popbill.com",
    docsUrl: "https://developers.popbill.com/reference/taxinvoice/node/api",
    fields: [
      { key: "linkId", label: "LinkID", type: "text", placeholder: "파트너 링크 ID", required: true, helpText: "팝빌 파트너 등록 후 발급받는 LinkID" },
      { key: "secretKey", label: "SecretKey", type: "password", placeholder: "비밀키", required: true, helpText: "LinkID와 함께 발급되는 API 비밀키" },
      { key: "corpNum", label: "사업자번호", type: "text", placeholder: "0000000000 (하이픈 제외)", required: true },
      { key: "isTest", label: "환경", type: "select", required: true, options: [{ value: "true", label: "테스트 (test.popbill.com)" }, { value: "false", label: "운영 (popbill.com)" }] },
    ],
  },
  {
    id: "barobill",
    displayName: "바로빌 (BaroBill)",
    shortDescription: "SOAP API · CERTKEY 인증 · Java/Python/PHP/.NET 지원",
    apiType: "SOAP",
    website: "https://www.barobill.co.kr",
    docsUrl: "https://dev.barobill.co.kr/docs/guides/%EB%B0%94%EB%A1%9C%EB%B9%8C-API-%EA%B0%9C%EB%B0%9C%EC%A4%80%EB%B9%84",
    fields: [
      { key: "certKey", label: "CERTKEY (연동인증키)", type: "password", placeholder: "36자리 UUID", required: true, helpText: "바로빌 파트너 콘솔에서 발급받은 인증키" },
      { key: "corpNum", label: "사업자번호", type: "text", placeholder: "0000000000 (하이픈 제외)", required: true },
      { key: "userId", label: "바로빌 회원 ID", type: "text", placeholder: "바로빌 아이디", required: true },
      { key: "isTest", label: "환경", type: "select", required: true, options: [{ value: "true", label: "테스트 (test.barobill.co.kr)" }, { value: "false", label: "운영 (barobill.co.kr)" }] },
    ],
  },
  {
    id: "smartbill",
    displayName: "스마트빌 (SmartBill)",
    shortDescription: "REST API · 32자리 인증코드 · ERP 연동 특화",
    apiType: "REST",
    website: "https://www.smartbill.co.kr",
    docsUrl: "https://www.smartbill.co.kr/Svc/svc_openAPI.aspx",
    fields: [
      { key: "authCode", label: "인증코드 (32자리)", type: "password", placeholder: "스마트빌 포털에서 생성", required: true, helpText: "관리자함 → Open API → 인증 코드 생성" },
      { key: "smartbillId", label: "스마트빌 ID", type: "text", placeholder: "스마트빌 로그인 ID", required: true },
      { key: "corpNum", label: "사업자번호", type: "text", placeholder: "0000000000 (하이픈 제외)", required: true },
    ],
  },
  {
    id: "bolta",
    displayName: "볼타 (Bolta)",
    shortDescription: "REST API · Access Token 인증 · 샌드박스 지원",
    apiType: "REST",
    website: "https://bolta.io",
    docsUrl: "https://api-docs.bolta.io",
    fields: [
      { key: "accessToken", label: "Access Token", type: "password", placeholder: "볼타 API 토큰", required: true, helpText: "볼타 대시보드에서 발급받은 API Access Token" },
      { key: "isTest", label: "환경", type: "select", required: true, options: [{ value: "true", label: "샌드박스 (테스트)" }, { value: "false", label: "운영" }] },
    ],
  },
  {
    id: "hometaxbill",
    displayName: "홈택스빌 (HometaxBill)",
    shortDescription: "REST API · 국세청 ASP 표준인증 · Bulk API 지원",
    apiType: "REST",
    website: "https://www.hometaxbill.co.kr",
    docsUrl: "https://www.hometaxbill.co.kr/taxsub.php",
    fields: [
      { key: "apiKey", label: "API Key", type: "password", placeholder: "홈택스빌 API 키", required: true },
      { key: "corpNum", label: "사업자번호", type: "text", placeholder: "0000000000 (하이픈 제외)", required: true },
      { key: "userId", label: "홈택스빌 ID", type: "text", placeholder: "홈택스빌 로그인 ID", required: true },
      { key: "isTest", label: "환경", type: "select", required: true, options: [{ value: "true", label: "테스트" }, { value: "false", label: "운영" }] },
    ],
  },
  {
    id: "tilko",
    displayName: "틸코 (Tilko)",
    shortDescription: "REST API · API Key 인증 · 홈택스 스크래핑 특화",
    apiType: "REST",
    website: "https://tilko.net",
    docsUrl: "https://tilko.net/Help/Api/Main",
    fields: [
      { key: "apiKey", label: "API Key", type: "password", placeholder: "틸코 API 키", required: true, helpText: "틸코 콘솔에서 발급받은 API Key" },
      { key: "corpNum", label: "사업자번호", type: "text", placeholder: "0000000000", required: true },
    ],
  },
  {
    id: "taxfree",
    displayName: "이세로 (eSero/NTS)",
    shortDescription: "국세청 직접 전송 · 공동인증서 기반 · 무료",
    apiType: "SOAP",
    website: "https://www.esero.go.kr",
    docsUrl: "https://www.esero.go.kr",
    fields: [
      { key: "certPem", label: "공동인증서 PEM", type: "password", placeholder: "인증서 PEM 데이터", required: true, helpText: "전자세금용 또는 범용 공동인증서" },
      { key: "certPassword", label: "인증서 비밀번호", type: "password", placeholder: "인증서 비밀번호", required: true },
      { key: "corpNum", label: "사업자번호", type: "text", placeholder: "0000000000", required: true },
    ],
  },
  {
    id: "kiwoom",
    displayName: "키움빌 (KiwoomBill)",
    shortDescription: "REST API · API Key 인증 · 키움증권 연계",
    apiType: "REST",
    website: "https://bill.kiwoom.com",
    docsUrl: "https://bill.kiwoom.com",
    fields: [
      { key: "apiKey", label: "API Key", type: "password", placeholder: "키움빌 API 키", required: true },
      { key: "apiSecret", label: "API Secret", type: "password", placeholder: "API Secret", required: true },
      { key: "corpNum", label: "사업자번호", type: "text", placeholder: "0000000000", required: true },
    ],
  },
  {
    id: "truebill",
    displayName: "트루빌 (TrueBill)",
    shortDescription: "REST API · Token 인증 · 중소기업 특화",
    apiType: "REST",
    website: "https://www.truebill.co.kr",
    docsUrl: "https://www.truebill.co.kr",
    fields: [
      { key: "apiKey", label: "API Key", type: "password", placeholder: "트루빌 API 키", required: true },
      { key: "corpNum", label: "사업자번호", type: "text", placeholder: "0000000000", required: true },
      { key: "userId", label: "트루빌 ID", type: "text", placeholder: "트루빌 로그인 ID", required: true },
    ],
  },
  {
    id: "bizbox",
    displayName: "더존 위하고 (Douzone Wehago)",
    shortDescription: "REST API · OAuth2 인증 · ERP 통합",
    apiType: "REST",
    website: "https://www.wehago.com",
    docsUrl: "https://www.wehago.com",
    fields: [
      { key: "clientId", label: "Client ID", type: "text", placeholder: "OAuth2 Client ID", required: true, helpText: "위하고 개발자센터에서 발급" },
      { key: "clientSecret", label: "Client Secret", type: "password", placeholder: "OAuth2 Client Secret", required: true },
      { key: "corpNum", label: "사업자번호", type: "text", placeholder: "0000000000", required: true },
    ],
  },
]

export const CUSTOM_PROVIDER_META: ProviderMeta = {
  id: "custom",
  displayName: "수동 입력 (기타 제공사)",
  shortDescription: "위 목록에 없는 제공사를 직접 설정합니다",
  apiType: "REST",
  website: "",
  docsUrl: "",
  fields: [
    { key: "providerName", label: "제공사 이름", type: "text", placeholder: "예: OO빌", required: true },
    { key: "apiEndpoint", label: "API 엔드포인트 URL", type: "text", placeholder: "https://api.example.com/tax-invoice", required: true },
    { key: "apiKey", label: "API Key", type: "password", placeholder: "제공사가 안내한 키" },
    { key: "apiSecret", label: "API Secret", type: "password", placeholder: "비워 두면 사용 안 함" },
    { key: "companyCode", label: "회사/가맹 코드", type: "text", placeholder: "선택" },
    { key: "corpNum", label: "사업자번호", type: "text", placeholder: "0000000000" },
  ],
}

export function getProviderMeta(id: string): ProviderMeta | null {
  if (id === "custom") return CUSTOM_PROVIDER_META
  return TAX_INVOICE_PROVIDERS.find((p) => p.id === id) ?? null
}

export function getAllProviderOptions(): Array<{ id: string; displayName: string }> {
  return [
    ...TAX_INVOICE_PROVIDERS.map((p) => ({ id: p.id, displayName: p.displayName })),
    { id: "custom", displayName: CUSTOM_PROVIDER_META.displayName },
    { id: "mock", displayName: "테스트용 (Mock)" },
  ]
}
