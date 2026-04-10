import type { Metadata } from "next"

import { helpFaqExtra } from "@/content/help-center"

export const metadata: Metadata = { title: "FAQ" }

const baseFaq = [
  {
    q: "어떤 업종에 적합한가요?",
    a: "견적·청구 대화가 잦은 서비스업·프리랜서·소규모 팀에 맞습니다. 랜딩의 업종 카드도 참고하세요.",
  },
  {
    q: "공개 문의 폼은 어떻게 쓰나요?",
    a: "설정에서 공개 문의를 켜고 발급된 URL을 카톡·SNS에 올립니다. 접수는 문의함에 쌓입니다.",
  },
  {
    q: "고객용 포털은 무엇인가요?",
    a: "고객이 로그인 없이 견적·청구 요약을 볼 수 있는 링크입니다. 플랜별로 활성화할 수 있는 고객 수에 한도가 있습니다.",
  },
  {
    q: "AI는 어떤 일을 도와주나요?",
    a: "문의 분석·견적 풀 초안·수금 문구·발송 메일 초안 등을 돕습니다. 사용 횟수는 플랜·한도에 따릅니다.",
  },
  {
    q: "플랜은 어떻게 바꾸나요?",
    a: "/billing 구독 콘솔에서 플랜 선택·다운그레이드 예약·해지 예약을 할 수 있습니다.",
  },
  {
    q: "체험 기간이 끝나면 어떻게 되나요?",
    a: "7일 Pro 체험 후 플랜을 고르지 않으면 trial_expired 상태가 되고 Starter 기준으로 돌아갑니다.",
  },
  {
    q: "구독을 해지하면 어떻게 되나요?",
    a: "해지 예약 시 갱신일까지 이용 가능합니다. 이후 Pro·Business 전용 기능과 높은 한도는 제한됩니다.",
  },
  {
    q: "전자세금계산서는 어떻게 발행하나요?",
    a: "Business 플랜에서 ASP를 설정한 뒤 청구 상세에서 발행 흐름을 진행합니다.",
  },
  {
    q: "카카오 연동은 어떻게 하나요?",
    a: "Pro 이상에서 알림톡 BYOA 엔드포인트를 설정에 저장합니다. 체험 중에도 동일하게 시험할 수 있습니다.",
  },
]

const all = [...baseFaq, ...helpFaqExtra]

export default function HelpFaqPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">자주 묻는 질문</h1>
      <div className="space-y-2">
        {all.map((item) => (
          <details
            key={item.q}
            className="rounded-xl border border-border/55 bg-card px-4 py-3 shadow-sm open:shadow-md"
          >
            <summary className="cursor-pointer text-sm font-semibold">{item.q}</summary>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
          </details>
        ))}
      </div>
    </div>
  )
}
