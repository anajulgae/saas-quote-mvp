-- FK 타깃이 동일 테넌트(user) 소유인지 WITH CHECK로 보강합니다.
-- (이전 정책은 user_id만 검사해, 알려진 UUID로 타인의 customer/quote 등을 끼워 넣을 수 있었습니다.)

drop policy if exists "inquiries by owner" on public.inquiries;
create policy "inquiries by owner" on public.inquiries
  for all
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.customers c
      where c.id = customer_id
        and c.user_id = auth.uid()
    )
  );

drop policy if exists "quotes by owner" on public.quotes;
create policy "quotes by owner" on public.quotes
  for all
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.customers c
      where c.id = customer_id
        and c.user_id = auth.uid()
    )
    and (
      inquiry_id is null
      or exists (
        select 1
        from public.inquiries i
        where i.id = inquiry_id
          and i.user_id = auth.uid()
      )
    )
  );

drop policy if exists "invoices by owner" on public.invoices;
create policy "invoices by owner" on public.invoices
  for all
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.customers c
      where c.id = customer_id
        and c.user_id = auth.uid()
    )
    and (
      quote_id is null
      or exists (
        select 1
        from public.quotes q
        where q.id = quote_id
          and q.user_id = auth.uid()
      )
    )
  );

drop policy if exists "reminders by invoice owner" on public.reminders;
create policy "reminders by invoice owner" on public.reminders
  for all
  using (
    auth.uid() = user_id
    and exists (
      select 1
      from public.invoices i
      where i.id = invoice_id
        and i.user_id = auth.uid()
    )
  )
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.invoices i
      where i.id = invoice_id
        and i.user_id = auth.uid()
    )
  );

drop policy if exists "activity logs by owner" on public.activity_logs;
create policy "activity logs by owner" on public.activity_logs
  for all
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and (
      customer_id is null
      or exists (
        select 1
        from public.customers c
        where c.id = customer_id
          and c.user_id = auth.uid()
      )
    )
    and (
      inquiry_id is null
      or exists (
        select 1
        from public.inquiries i
        where i.id = inquiry_id
          and i.user_id = auth.uid()
      )
    )
    and (
      quote_id is null
      or exists (
        select 1
        from public.quotes q
        where q.id = quote_id
          and q.user_id = auth.uid()
      )
    )
    and (
      invoice_id is null
      or exists (
        select 1
        from public.invoices inv
        where inv.id = invoice_id
          and inv.user_id = auth.uid()
      )
    )
  );
