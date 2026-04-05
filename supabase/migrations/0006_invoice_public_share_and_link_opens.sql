-- 공개 청구서 링크 + 열람 카운트(견적·청구)

alter table public.quotes
  add column if not exists share_open_count integer not null default 0,
  add column if not exists share_last_opened_at timestamptz;

alter table public.invoices
  add column if not exists public_share_token text,
  add column if not exists share_open_count integer not null default 0,
  add column if not exists share_last_opened_at timestamptz;

create unique index if not exists invoices_public_share_token_uidx
  on public.invoices (public_share_token)
  where public_share_token is not null;

comment on column public.invoices.public_share_token is '로그인 없이 청구서(고객용) 열람용 비밀 토큰';
comment on column public.quotes.share_open_count is '공개 견적 링크 누적 열람(페이지 로드) 횟수';
comment on column public.invoices.share_open_count is '공개 청구 링크 누적 열람 횟수';

-- 공개 청구서: 토큰으로 청구·고객·발신·연결 견적 요약
create or replace function public.get_invoice_share_payload(p_token text)
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
    'invoice', jsonb_build_object(
      'id', inv.id,
      'invoice_number', inv.invoice_number,
      'invoice_type', inv.invoice_type,
      'amount', inv.amount,
      'payment_status', inv.payment_status,
      'due_date', inv.due_date,
      'requested_at', inv.requested_at,
      'paid_at', inv.paid_at,
      'notes', coalesce(inv.notes, ''),
      'created_at', inv.created_at
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
    ),
    'linked_quote', case
      when q.id is null then null
      else jsonb_build_object(
        'quote_number', q.quote_number,
        'title', q.title
      )
    end
  )
  into result
  from invoices inv
  left join customers c on c.id = inv.customer_id
  left join business_settings b on b.user_id = inv.user_id
  left join quotes q on q.id = inv.quote_id
  where inv.public_share_token = p_token
  limit 1;

  return result;
end;
$$;

revoke all on function public.get_invoice_share_payload(text) from public;
grant execute on function public.get_invoice_share_payload(text) to anon, authenticated, service_role;

-- 공개 견적 링크 열람 기록 (첫 열람 시 활동 로그 1건)
create or replace function public.bump_quote_share_open(p_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old int;
  v_id uuid;
  v_user_id uuid;
  v_customer_id uuid;
  v_quote_number text;
  v_title text;
begin
  if p_token is null or length(trim(p_token)) < 8 then
    return;
  end if;

  select coalesce(q.share_open_count, 0), q.id, q.user_id, q.customer_id, q.quote_number, q.title
  into v_old, v_id, v_user_id, v_customer_id, v_quote_number, v_title
  from quotes q
  where q.public_share_token = p_token
  limit 1;

  if v_id is null then
    return;
  end if;

  update quotes q
  set
    share_open_count = coalesce(q.share_open_count, 0) + 1,
    share_last_opened_at = now()
  where q.id = v_id;

  if v_old = 0 then
    insert into activity_logs (
      user_id, customer_id, quote_id, action, description, metadata
    ) values (
      v_user_id,
      v_customer_id,
      v_id,
      'quote.public_link_opened',
      format('고객이 공개 견적 링크를 처음 열람했습니다. (%s)', v_quote_number),
      jsonb_build_object('quote_number', v_quote_number, 'title', v_title)
    );
  end if;
end;
$$;

revoke all on function public.bump_quote_share_open(text) from public;
grant execute on function public.bump_quote_share_open(text) to anon, authenticated, service_role;

create or replace function public.bump_invoice_share_open(p_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old int;
  v_id uuid;
  v_user_id uuid;
  v_customer_id uuid;
  v_invoice_number text;
begin
  if p_token is null or length(trim(p_token)) < 8 then
    return;
  end if;

  select coalesce(inv.share_open_count, 0), inv.id, inv.user_id, inv.customer_id, inv.invoice_number
  into v_old, v_id, v_user_id, v_customer_id, v_invoice_number
  from invoices inv
  where inv.public_share_token = p_token
  limit 1;

  if v_id is null then
    return;
  end if;

  update invoices inv
  set
    share_open_count = coalesce(inv.share_open_count, 0) + 1,
    share_last_opened_at = now()
  where inv.id = v_id;

  if v_old = 0 then
    insert into activity_logs (
      user_id, customer_id, invoice_id, action, description, metadata
    ) values (
      v_user_id,
      v_customer_id,
      v_id,
      'invoice.public_link_opened',
      format('고객이 공개 청구 링크를 처음 열람했습니다. (%s)', v_invoice_number),
      jsonb_build_object('invoice_number', v_invoice_number)
    );
  end if;
end;
$$;

revoke all on function public.bump_invoice_share_open(text) from public;
grant execute on function public.bump_invoice_share_open(text) to anon, authenticated, service_role;
