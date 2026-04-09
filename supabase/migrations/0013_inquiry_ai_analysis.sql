-- 문의 AI 운영 분석 결과(유형·긴급도·다음 액션 등) — 선택 저장
alter table public.inquiries
  add column if not exists ai_analysis jsonb,
  add column if not exists ai_analysis_updated_at timestamptz;

comment on column public.inquiries.ai_analysis is 'AI inquiry triage: request type, urgency, summary, next actions (JSON)';
comment on column public.inquiries.ai_analysis_updated_at is 'Last time ai_analysis was written';
