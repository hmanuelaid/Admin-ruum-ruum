-- Remove legacy open RLS policies that were created from older UI snippets.

alter table public.admin_activity_log enable row level security;

revoke all on table public.admin_activity_log from public;
revoke all on table public.admin_activity_log from anon;
revoke insert, update, delete on table public.admin_activity_log from authenticated;
grant select on table public.admin_activity_log to authenticated;

revoke all on table public.system_config from public;
revoke all on table public.system_config from anon;
grant select, insert, update, delete on table public.system_config to authenticated;

drop policy if exists "Admins leen bitacora" on public.admin_activity_log;
drop policy if exists "Admins leen bitácora" on public.admin_activity_log;
drop policy if exists "Admins pueden leer bitacora" on public.admin_activity_log;
drop policy if exists "Admins pueden leer bitácora" on public.admin_activity_log;

drop policy if exists "Admins insertan en bitacora" on public.admin_activity_log;
drop policy if exists "Admins insertan en bitácora" on public.admin_activity_log;
drop policy if exists "Admins pueden insertar en bitacora" on public.admin_activity_log;
drop policy if exists "Admins pueden insertar en bitácora" on public.admin_activity_log;
drop policy if exists admin_activity_log_insert_own_admin on public.admin_activity_log;

drop policy if exists admin_activity_log_select_auditors on public.admin_activity_log;
create policy admin_activity_log_select_auditors
  on public.admin_activity_log
  for select
  to authenticated
  using (public.current_admin_role() in ('super_admin', 'admin_operativo'));
