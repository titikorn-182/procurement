begin;

create table if not exists public.system_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  constraint system_settings_key_format check (key ~ '^[a-z][a-z0-9_]{1,63}$')
);

alter table public.system_settings enable row level security;

drop policy if exists system_settings_admin_read on public.system_settings;
drop policy if exists system_settings_admin_insert on public.system_settings;
drop policy if exists system_settings_admin_update on public.system_settings;

create policy system_settings_admin_read on public.system_settings
for select to authenticated using (private.is_admin());
create policy system_settings_admin_insert on public.system_settings
for insert to authenticated with check (private.is_admin() and updated_by = (select auth.uid()));
create policy system_settings_admin_update on public.system_settings
for update to authenticated using (private.is_admin())
with check (private.is_admin() and updated_by = (select auth.uid()));

insert into public.system_settings (key, value)
values
  ('workflow', '{"approval_limit":500000,"require_head_procurement":true}'::jsonb),
  ('budget', '{"fiscal_year":2569,"default_fund":"เงินงบประมาณแผ่นดิน"}'::jsonb),
  ('documents', '{"purchase_prefix":"PR","payment_prefix":"PV"}'::jsonb),
  ('notifications', '{"in_app":true,"email":true,"line":false}'::jsonb),
  ('sla', '{"review_days":2,"approval_days":3,"business_days_only":true}'::jsonb),
  ('integrations', '{"sso":"pending","budget":"pending","digital_signature":"pending"}'::jsonb)
on conflict (key) do nothing;

commit;
