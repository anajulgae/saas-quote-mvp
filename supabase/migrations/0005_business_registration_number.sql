-- 견적서·공유 페이지 발신자 정보용
alter table public.business_settings
  add column if not exists business_registration_number text;

comment on column public.business_settings.business_registration_number is '사업자 등록번호 (견적서 발신 블록 표시)';

-- 공개 견적 RPC: issuer에 사업자등록번호 포함
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
      'business_registration_number', coalesce(b.business_registration_number, ''),
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
