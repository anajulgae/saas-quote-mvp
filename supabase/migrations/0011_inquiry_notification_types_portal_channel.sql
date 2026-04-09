-- 알림 타입 분리(공개 폼 vs 고객 포털) + 문의 채널 값 정리
-- customer_portal 출처 제출 시 inquiries.channel = '고객 포털'

create or replace function public.trg_notify_new_inquiry()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cname text;
  v_type text;
  v_title text;
  v_body text;
begin
  select coalesce(nullif(trim(c.company_name), ''), nullif(trim(c.name), ''), '고객')
  into v_cname
  from public.customers c
  where c.id = new.customer_id;

  if new.channel = '고객 포털' then
    v_type := 'new_inquiry_customer_portal';
    v_title := '고객 포털에서 추가 문의가 접수되었습니다';
  elsif new.channel = '웹폼' then
    v_type := 'new_inquiry_public_form';
    v_title := '공개 문의 폼에서 새 문의가 접수되었습니다';
  else
    v_type := 'new_inquiry';
    v_title := '새 문의가 접수되었습니다';
  end if;

  v_body := format(
    '「%s」· %s · %s',
    left(trim(new.title), 200),
    v_cname,
    case
      when new.channel = '고객 포털' then '경로: 고객 포털'
      when new.channel = '웹폼' then '경로: 공개 문의 폼'
      else '채널 ' || left(coalesce(new.channel, ''), 40)
    end
  );

  insert into public.notifications (
    user_id,
    type,
    title,
    body,
    link_path,
    related_entity_type,
    related_entity_id,
    dedupe_key
  )
  values (
    new.user_id,
    v_type,
    v_title,
    v_body,
    '/inquiries?focus=' || new.id::text,
    'inquiry',
    new.id,
    'new_inquiry:' || new.id::text
  )
  on conflict (user_id, dedupe_key) do nothing;

  return new;
end;
$$;

create or replace function public.submit_public_inquiry(
  p_token text,
  p_name text,
  p_phone text,
  p_email text,
  p_title text,
  p_details text,
  p_service_category text,
  p_hoped_date date,
  p_budget_min integer,
  p_budget_max integer,
  p_extra_notes text,
  p_consent boolean,
  p_honeypot text,
  p_source text default null,
  p_source_slug text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_phone_norm text;
  v_email_trim text;
  v_cid uuid;
  v_title text;
  v_cat text;
  v_details text;
  v_iid uuid;
  v_now timestamptz := now();
  v_source text;
  v_slug text;
  v_new_customer boolean := false;
  v_channel text := '웹폼';
begin
  if p_honeypot is not null and length(trim(p_honeypot)) > 0 then
    return jsonb_build_object('ok', true, 'skipped', true);
  end if;

  if not coalesce(p_consent, false) then
    return jsonb_build_object('ok', false, 'error', 'consent_required');
  end if;

  if p_token is null or length(trim(p_token)) < 16 then
    return jsonb_build_object('ok', false, 'error', 'invalid_token');
  end if;

  select b.user_id
  into v_owner
  from business_settings b
  where b.public_inquiry_form_token = trim(p_token)
    and coalesce(b.public_inquiry_form_enabled, false) = true
  limit 1;

  if v_owner is null then
    return jsonb_build_object('ok', false, 'error', 'form_unavailable');
  end if;

  v_title := trim(coalesce(p_title, ''));
  if length(v_title) < 1 or length(v_title) > 500 then
    return jsonb_build_object('ok', false, 'error', 'validation_title');
  end if;

  if length(trim(coalesce(p_name, ''))) < 1 or length(trim(p_name)) > 120 then
    return jsonb_build_object('ok', false, 'error', 'validation_name');
  end if;

  if length(trim(coalesce(p_phone, ''))) < 8 or length(trim(p_phone)) > 40 then
    return jsonb_build_object('ok', false, 'error', 'validation_phone');
  end if;

  if length(trim(coalesce(p_details, ''))) < 4 or length(trim(p_details)) > 20000 then
    return jsonb_build_object('ok', false, 'error', 'validation_details');
  end if;

  v_phone_norm := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
  if length(v_phone_norm) < 8 then
    return jsonb_build_object('ok', false, 'error', 'validation_phone');
  end if;

  v_email_trim := nullif(lower(trim(coalesce(p_email, ''))), '');

  if exists (
    select 1
    from public_inquiry_submissions s
    where s.owner_user_id = v_owner
      and s.form_token = trim(p_token)
      and s.phone_normalized = v_phone_norm
      and s.created_at > v_now - interval '45 seconds'
  ) then
    return jsonb_build_object('ok', false, 'error', 'rate_limited');
  end if;

  insert into public_inquiry_submissions (owner_user_id, form_token, phone_normalized)
  values (v_owner, trim(p_token), v_phone_norm);

  select c.id
  into v_cid
  from customers c
  where c.user_id = v_owner
    and (
      regexp_replace(coalesce(c.phone, ''), '[^0-9]', '', 'g') = v_phone_norm
      or (
        v_email_trim is not null
        and length(v_email_trim) > 3
        and lower(trim(coalesce(c.email, ''))) = v_email_trim
      )
    )
  order by case
    when regexp_replace(coalesce(c.phone, ''), '[^0-9]', '', 'g') = v_phone_norm then 0
    else 1
  end
  limit 1;

  v_source := nullif(trim(lower(coalesce(p_source, ''))), '');
  v_slug := nullif(trim(coalesce(p_source_slug, '')), '');

  if v_cid is null then
    v_new_customer := true;
    insert into customers (user_id, name, phone, email, notes, tags)
    values (
      v_owner,
      trim(p_name),
      trim(p_phone),
      v_email_trim,
      case
        when v_source = 'customer_portal' then '고객 포털(거래 안내)에서 유입'
        else '공개 문의 폼(web)으로 최초 유입'
      end,
      '{}'::text[]
    )
    returning id into v_cid;
  else
    update customers
    set
      name = case when length(trim(coalesce(name, ''))) < 1 then trim(p_name) else name end,
      email = coalesce(customers.email, v_email_trim),
      phone = case when customers.phone is null or length(trim(customers.phone)) < 1 then trim(p_phone) else customers.phone end,
      updated_at = v_now
    where id = v_cid;
  end if;

  v_cat := nullif(trim(coalesce(p_service_category, '')), '');
  if v_cat is null then
    v_cat := '일반';
  end if;
  if length(v_cat) > 200 then
    v_cat := left(v_cat, 200);
  end if;

  v_details := trim(p_details);
  if p_extra_notes is not null and length(trim(p_extra_notes)) > 0 then
    v_details := v_details || E'\n\n■ 추가 메모\n' || trim(p_extra_notes);
  end if;

  if v_source = 'customer_portal' then
    v_channel := '고객 포털';
    v_details := v_details || E'\n\n— 고객 포털(거래 안내 링크)에서 추가 문의됨';
  else
    v_channel := '웹폼';
    v_details := v_details || E'\n\n— 공개 문의 폼(웹)에서 제출됨';
    if v_source is not null then
      v_details := v_details || E'\n■ 유입 출처: ' || v_source;
      if v_slug is not null then
        v_details := v_details || ' · ' || v_slug;
      end if;
    end if;
  end if;

  insert into inquiries (
    user_id,
    customer_id,
    title,
    channel,
    service_category,
    details,
    requested_date,
    budget_min,
    budget_max,
    stage,
    follow_up_at
  )
  values (
    v_owner,
    v_cid,
    v_title,
    v_channel,
    v_cat,
    v_details,
    coalesce(p_hoped_date, (v_now at time zone 'Asia/Seoul')::date),
    p_budget_min,
    p_budget_max,
    'new'::inquiry_stage,
    case
      when p_hoped_date is not null
      then (p_hoped_date::timestamp + time '10:00') at time zone 'Asia/Seoul'
      else null
    end
  )
  returning id into v_iid;

  insert into activity_logs (
    user_id,
    customer_id,
    inquiry_id,
    action,
    description,
    metadata
  )
  values (
    v_owner,
    v_cid,
    v_iid,
    'public_inquiry.submitted',
    case
      when v_channel = '고객 포털' then '고객 포털에서 문의가 접수되었습니다.'
      else '공개 문의 폼으로 접수되었습니다.'
    end,
    jsonb_build_object(
      'title', v_title,
      'channel', v_channel,
      'source', case when v_source = 'customer_portal' then 'customer_portal' else coalesce(v_source, 'web_form') end,
      'sourceSlug', v_slug,
      'newCustomer', v_new_customer
    )
  );

  if v_new_customer then
    insert into activity_logs (
      user_id,
      customer_id,
      inquiry_id,
      action,
      description,
      metadata
    )
    values (
      v_owner,
      v_cid,
      v_iid,
      'customer.auto_created_public_form',
      case
        when v_channel = '고객 포털' then '고객 포털로 신규 고객이 자동 등록되었습니다.'
        else '공개 문의 폼으로 신규 고객이 자동 등록되었습니다.'
      end,
      jsonb_build_object('name', trim(p_name), 'via', case when v_channel = '고객 포털' then 'customer_portal' else 'public_inquiry_form' end)
    );
  end if;

  insert into activity_logs (
    user_id,
    customer_id,
    inquiry_id,
    action,
    description,
    metadata
  )
  values (
    v_owner,
    v_cid,
    v_iid,
    'inquiry.created',
    v_title || ' 문의가 등록되었습니다.',
    jsonb_build_object(
      'via', case when v_channel = '고객 포털' then 'customer_portal' else 'public_inquiry_form' end,
      'title', v_title,
      'channel', v_channel,
      'source', case when v_source = 'customer_portal' then 'customer_portal' else coalesce(v_source, 'web_form') end,
      'sourceSlug', v_slug
    )
  );

  return jsonb_build_object(
    'ok', true,
    'inquiryId', v_iid,
    'customerId', v_cid,
    'ownerUserId', v_owner,
    'ownerPlan', (select u.plan from users u where u.id = v_owner limit 1)
  );
end;
$$;

revoke all on function public.submit_public_inquiry(
  text, text, text, text, text, text, text, date, integer, integer, text, boolean, text, text, text
) from public;
grant execute on function public.submit_public_inquiry(
  text, text, text, text, text, text, text, date, integer, integer, text, boolean, text, text, text
) to anon, authenticated, service_role;
