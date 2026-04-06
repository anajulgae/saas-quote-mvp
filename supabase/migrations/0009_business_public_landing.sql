-- Pro 전용 업체 소개 미니 랜딩(/biz/[slug]) + 공개 문의 유입 출처(source)

create table if not exists public.business_public_pages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users (id) on delete cascade,
  slug text not null,
  is_published boolean not null default false,
  template text not null default 'default',
  business_name text not null default '',
  headline text not null default '',
  intro_one_line text not null default '',
  about text not null default '',
  services jsonb not null default '[]'::jsonb,
  contact_phone text not null default '',
  contact_email text not null default '',
  location text not null default '',
  business_hours text not null default '',
  social_links jsonb not null default '[]'::jsonb,
  hero_image_url text,
  seo_title text not null default '',
  seo_description text not null default '',
  faq jsonb not null default '[]'::jsonb,
  trust_points jsonb not null default '[]'::jsonb,
  cta_text text not null default '문의하기',
  inquiry_cta_enabled boolean not null default true,
  ai_generated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_public_pages_slug_format check (
    slug ~ '^([a-z0-9]|[a-z0-9][a-z0-9-]{0,46}[a-z0-9])$'
    and length(slug) between 2 and 48
  ),
  constraint business_public_pages_template_check check (template in ('default', 'minimal'))
);

create unique index if not exists business_public_pages_slug_uidx
  on public.business_public_pages (slug);

comment on table public.business_public_pages is 'Pro 업체 소개 공개 랜딩(단일 페이지). slug 전역 유일.';

drop trigger if exists set_business_public_pages_updated_at on public.business_public_pages;
create trigger set_business_public_pages_updated_at
  before update on public.business_public_pages
  for each row
  execute function public.set_updated_at();

alter table public.business_public_pages enable row level security;

create policy "business_public_pages_select_own"
  on public.business_public_pages
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "business_public_pages_insert_own"
  on public.business_public_pages
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "business_public_pages_update_own"
  on public.business_public_pages
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "business_public_pages_delete_own"
  on public.business_public_pages
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- 공개 조회: Pro + 게시된 페이지만 (비공개·다운그레이드는 not_found 와 동일 응답)
create or replace function public.get_public_business_landing(p_slug text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slug text;
  v_row record;
  v_token text;
  v_form_on boolean;
begin
  v_slug := lower(trim(coalesce(p_slug, '')));
  if v_slug is null or length(v_slug) < 2 then
    return jsonb_build_object('valid', false, 'reason', 'invalid_slug');
  end if;

  select
    p.user_id,
    p.is_published,
    p.slug,
    p.template,
    p.business_name,
    p.headline,
    p.intro_one_line,
    p.about,
    p.services,
    p.contact_phone,
    p.contact_email,
    p.location,
    p.business_hours,
    p.social_links,
    p.hero_image_url,
    p.seo_title,
    p.seo_description,
    p.faq,
    p.trust_points,
    p.cta_text,
    p.inquiry_cta_enabled,
    p.updated_at,
    u.plan as owner_plan
  into v_row
  from business_public_pages p
  join users u on u.id = p.user_id
  where p.slug = v_slug
  limit 1;

  if v_row is null then
    return jsonb_build_object('valid', false, 'reason', 'not_found');
  end if;

  if not coalesce(v_row.is_published, false) then
    return jsonb_build_object('valid', false, 'reason', 'not_found');
  end if;

  if coalesce(v_row.owner_plan, 'free') <> 'pro' then
    return jsonb_build_object('valid', false, 'reason', 'not_found');
  end if;

  select
    coalesce(b.public_inquiry_form_enabled, false),
    b.public_inquiry_form_token
  into v_form_on, v_token
  from business_settings b
  where b.user_id = v_row.user_id
  limit 1;

  return jsonb_build_object(
    'valid', true,
    'page', jsonb_build_object(
      'slug', v_row.slug,
      'template', v_row.template,
      'businessName', coalesce(v_row.business_name, ''),
      'headline', coalesce(v_row.headline, ''),
      'introOneLine', coalesce(v_row.intro_one_line, ''),
      'about', coalesce(v_row.about, ''),
      'services', coalesce(v_row.services, '[]'::jsonb),
      'contactPhone', coalesce(v_row.contact_phone, ''),
      'contactEmail', coalesce(v_row.contact_email, ''),
      'location', coalesce(v_row.location, ''),
      'businessHours', coalesce(v_row.business_hours, ''),
      'socialLinks', coalesce(v_row.social_links, '[]'::jsonb),
      'heroImageUrl', v_row.hero_image_url,
      'seoTitle', coalesce(v_row.seo_title, ''),
      'seoDescription', coalesce(v_row.seo_description, ''),
      'faq', coalesce(v_row.faq, '[]'::jsonb),
      'trustPoints', coalesce(v_row.trust_points, '[]'::jsonb),
      'ctaText', coalesce(nullif(trim(v_row.cta_text), ''), '문의하기'),
      'inquiryCtaEnabled', coalesce(v_row.inquiry_cta_enabled, true),
      'updatedAt', v_row.updated_at
    ),
    'inquiryToken',
      case
        when coalesce(v_row.inquiry_cta_enabled, true)
          and v_form_on
          and v_token is not null
          and length(trim(v_token)) >= 16
        then trim(v_token)
        else null
      end
  );
end;
$$;

revoke all on function public.get_public_business_landing(text) from public;
grant execute on function public.get_public_business_landing(text) to anon, authenticated, service_role;

-- 공개 문의: 유입 출처(랜딩 slug 등) 기록 — 시그니처 교체(기존 13인자 호출은 그대로 동작)
drop function if exists public.submit_public_inquiry(
  text, text, text, text, text, text, text, date, integer, integer, text, boolean, text
);

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

  if v_cid is null then
    insert into customers (user_id, name, phone, email, notes, tags)
    values (
      v_owner,
      trim(p_name),
      trim(p_phone),
      v_email_trim,
      '공개 문의 폼(web)으로 최초 유입',
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

  v_source := nullif(trim(lower(coalesce(p_source, ''))), '');
  v_slug := nullif(trim(coalesce(p_source_slug, '')), '');

  v_details := v_details || E'\n\n— 공개 문의 폼(웹)에서 제출됨';
  if v_source is not null then
    v_details := v_details || E'\n■ 유입 출처: ' || v_source;
    if v_slug is not null then
      v_details := v_details || ' · ' || v_slug;
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
    '웹폼',
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
    'inquiry.created',
    v_title || ' 문의가 등록되었습니다.',
    jsonb_build_object(
      'via', 'public_inquiry_form',
      'title', v_title,
      'channel', '웹폼',
      'source', coalesce(v_source, 'web_form'),
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
