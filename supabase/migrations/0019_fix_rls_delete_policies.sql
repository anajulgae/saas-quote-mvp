-- Fix: split "for all" RLS policies into per-operation policies so that
-- DELETE uses only USING (owner check) without WITH CHECK.
-- WITH CHECK on "for all" can block FK cascade SET NULL updates,
-- preventing record deletion even when the user owns the row.

-- ═══════════════════════════════════════════════════════════
-- inquiries
-- ═══════════════════════════════════════════════════════════
drop policy if exists "inquiries by owner" on public.inquiries;

create policy "inquiries_select" on public.inquiries
  for select using (auth.uid() = user_id);

create policy "inquiries_insert" on public.inquiries
  for insert with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.customers c
      where c.id = customer_id and c.user_id = auth.uid()
    )
  );

create policy "inquiries_update" on public.inquiries
  for update using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.customers c
      where c.id = customer_id and c.user_id = auth.uid()
    )
  );

create policy "inquiries_delete" on public.inquiries
  for delete using (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════
-- quotes
-- ═══════════════════════════════════════════════════════════
drop policy if exists "quotes by owner" on public.quotes;

create policy "quotes_select" on public.quotes
  for select using (auth.uid() = user_id);

create policy "quotes_insert" on public.quotes
  for insert with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.customers c
      where c.id = customer_id and c.user_id = auth.uid()
    )
    and (
      inquiry_id is null
      or exists (
        select 1 from public.inquiries i
        where i.id = inquiry_id and i.user_id = auth.uid()
      )
    )
  );

create policy "quotes_update" on public.quotes
  for update using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.customers c
      where c.id = customer_id and c.user_id = auth.uid()
    )
    and (
      inquiry_id is null
      or exists (
        select 1 from public.inquiries i
        where i.id = inquiry_id and i.user_id = auth.uid()
      )
    )
  );

create policy "quotes_delete" on public.quotes
  for delete using (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════
-- invoices
-- ═══════════════════════════════════════════════════════════
drop policy if exists "invoices by owner" on public.invoices;

create policy "invoices_select" on public.invoices
  for select using (auth.uid() = user_id);

create policy "invoices_insert" on public.invoices
  for insert with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.customers c
      where c.id = customer_id and c.user_id = auth.uid()
    )
    and (
      quote_id is null
      or exists (
        select 1 from public.quotes q
        where q.id = quote_id and q.user_id = auth.uid()
      )
    )
  );

create policy "invoices_update" on public.invoices
  for update using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.customers c
      where c.id = customer_id and c.user_id = auth.uid()
    )
    and (
      quote_id is null
      or exists (
        select 1 from public.quotes q
        where q.id = quote_id and q.user_id = auth.uid()
      )
    )
  );

create policy "invoices_delete" on public.invoices
  for delete using (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════
-- reminders
-- ═══════════════════════════════════════════════════════════
drop policy if exists "reminders by invoice owner" on public.reminders;

create policy "reminders_select" on public.reminders
  for select using (
    auth.uid() = user_id
    and exists (
      select 1 from public.invoices i
      where i.id = invoice_id and i.user_id = auth.uid()
    )
  );

create policy "reminders_insert" on public.reminders
  for insert with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.invoices i
      where i.id = invoice_id and i.user_id = auth.uid()
    )
  );

create policy "reminders_update" on public.reminders
  for update using (
    auth.uid() = user_id
    and exists (
      select 1 from public.invoices i
      where i.id = invoice_id and i.user_id = auth.uid()
    )
  )
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.invoices i
      where i.id = invoice_id and i.user_id = auth.uid()
    )
  );

create policy "reminders_delete" on public.reminders
  for delete using (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════
-- activity_logs
-- ═══════════════════════════════════════════════════════════
drop policy if exists "activity logs by owner" on public.activity_logs;

create policy "activity_logs_select" on public.activity_logs
  for select using (auth.uid() = user_id);

create policy "activity_logs_insert" on public.activity_logs
  for insert with check (
    auth.uid() = user_id
    and (
      customer_id is null
      or exists (select 1 from public.customers c where c.id = customer_id and c.user_id = auth.uid())
    )
    and (
      inquiry_id is null
      or exists (select 1 from public.inquiries i where i.id = inquiry_id and i.user_id = auth.uid())
    )
    and (
      quote_id is null
      or exists (select 1 from public.quotes q where q.id = quote_id and q.user_id = auth.uid())
    )
    and (
      invoice_id is null
      or exists (select 1 from public.invoices inv where inv.id = invoice_id and inv.user_id = auth.uid())
    )
  );

create policy "activity_logs_update" on public.activity_logs
  for update using (auth.uid() = user_id);

create policy "activity_logs_delete" on public.activity_logs
  for delete using (auth.uid() = user_id);
