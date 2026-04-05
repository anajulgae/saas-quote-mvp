-- 직인(이미지 URL 또는 data URL) 및 사용 여부
alter table public.business_settings
  add column if not exists seal_image_url text,
  add column if not exists seal_enabled boolean not null default false;

-- 고객 공유용 견적 조회 토큰 (고유)
alter table public.quotes
  add column if not exists public_share_token text;

create unique index if not exists quotes_public_share_token_uidx
  on public.quotes (public_share_token)
  where public_share_token is not null;

comment on column public.business_settings.seal_image_url is '직인 이미지 (https URL 또는 PNG data URL, 권장 400KB 이하)';
comment on column public.quotes.public_share_token is '로그인 없이 견적서 열람용 비밀 토큰';

-- 공개 견적서 페이지용: 토큰으로 견적·항목·고객·발신 설정 조회 (RLS 우회, 토큰 일치 시만)
create or replace function public.get_quote_share_payload(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if p_token is null or length(trim(p_token)) < 8 then
    return null;
  end if;

  select jsonb_build_object(
    'quote', jsonb_build_object(
      'id', q.id,
      'quote_number', q.quote_number,
      'title', q.title,
      'summary', coalesce(q.summary, ''),
      'status', q.status,
      'subtotal', q.subtotal,
      'tax', q.tax,
      'total', q.total,
      'valid_until', q.valid_until,
      'sent_at', q.sent_at,
      'created_at', q.created_at
    ),
    'items', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', qi.id,
            'name', qi.name,
            'description', qi.description,
            'quantity', qi.quantity,
            'unit_price', qi.unit_price,
            'line_total', qi.line_total
          )
          order by qi.sort_order
        )
        from quote_items qi
        where qi.quote_id = q.id
      ),
      '[]'::jsonb
    ),
    'customer', case
      when c.id is null then null
      else jsonb_build_object(
        'id', c.id,
        'name', c.name,
        'company_name', c.company_name,
        'email', c.email,
        'phone', c.phone
      )
    end,
    'issuer', jsonb_build_object(
      'business_name', coalesce(b.business_name, ''),
      'owner_name', coalesce(b.owner_name, ''),
      'email', b.email,
      'phone', b.phone,
      'payment_terms', b.payment_terms,
      'bank_account', b.bank_account,
      'seal_image_url', b.seal_image_url,
      'seal_enabled', coalesce(b.seal_enabled, false)
    )
  )
  into result
  from quotes q
  left join customers c on c.id = q.customer_id
  left join business_settings b on b.user_id = q.user_id
  where q.public_share_token = p_token
  limit 1;

  return result;
end;
$$;

revoke all on function public.get_quote_share_payload(text) from public;
grant execute on function public.get_quote_share_payload(text) to anon, authenticated, service_role;
