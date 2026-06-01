-- Secure admin configuration and activity log access.
-- These policies depend on Supabase Auth and active rows in public.admin_users.

create table if not exists public.system_config (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value text not null,
  updated_at timestamptz default now()
);

create table if not exists public.admin_activity_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.admin_users(id) on delete set null,
  admin_name text,
  action text not null,
  entity text,
  entity_id text,
  detail text,
  created_at timestamptz default now()
);

create or replace function public.current_admin_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from public.admin_users
  where auth_id = auth.uid()
    and active = true
  limit 1
$$;

create or replace function public.current_admin_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.admin_users
  where auth_id = auth.uid()
    and active = true
  limit 1
$$;

create or replace function public.is_active_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_admin_id() is not null
$$;

create or replace function public.log_admin_activity(
  p_action text,
  p_entity text default null,
  p_entity_id text default null,
  p_detail text default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  admin_row record;
  log_id uuid;
begin
  select id, name
    into admin_row
    from public.admin_users
   where auth_id = auth.uid()
     and active = true
   limit 1;

  if not found then
    raise exception 'Not an active admin' using errcode = '42501';
  end if;

  if p_action is null or p_action not in (
    'create',
    'update',
    'delete',
    'approve',
    'reject',
    'assign',
    'escalate',
    'resolve',
    'login',
    'logout',
    'export'
  ) then
    raise exception 'Invalid activity action' using errcode = '22023';
  end if;

  if p_entity is not null and p_entity not in (
    'trip',
    'driver',
    'user',
    'payment',
    'incident',
    'document',
    'config',
    'admin'
  ) then
    raise exception 'Invalid activity entity' using errcode = '22023';
  end if;

  insert into public.admin_activity_log (
    admin_id,
    admin_name,
    action,
    entity,
    entity_id,
    detail
  )
  values (
    admin_row.id,
    coalesce(admin_row.name, 'Admin'),
    p_action,
    p_entity,
    nullif(btrim(p_entity_id), ''),
    nullif(left(btrim(p_detail), 1000), '')
  )
  returning id into log_id;

  return log_id;
end;
$$;

revoke all on function public.current_admin_id() from public;
revoke all on function public.current_admin_role() from public;
revoke all on function public.is_active_admin() from public;
revoke all on function public.log_admin_activity(text, text, text, text) from public;
grant execute on function public.current_admin_id() to authenticated;
grant execute on function public.current_admin_role() to authenticated;
grant execute on function public.is_active_admin() to authenticated;
grant execute on function public.log_admin_activity(text, text, text, text) to authenticated;

alter table public.system_config enable row level security;
alter table public.admin_activity_log enable row level security;

revoke all on table public.system_config from anon;
revoke all on table public.admin_activity_log from anon;
revoke insert, update, delete on table public.admin_activity_log from authenticated;
grant select, insert, update, delete on table public.system_config to authenticated;
grant select on table public.admin_activity_log to authenticated;

drop policy if exists "Solo admins" on public.system_config;
drop policy if exists system_config_super_admin_all on public.system_config;
create policy system_config_super_admin_all
  on public.system_config
  for all
  to authenticated
  using (public.current_admin_role() = 'super_admin')
  with check (public.current_admin_role() = 'super_admin');

drop policy if exists "Admins pueden leer bitacora" on public.admin_activity_log;
drop policy if exists "Admins pueden leer bitácora" on public.admin_activity_log;
drop policy if exists admin_activity_log_select_auditors on public.admin_activity_log;
create policy admin_activity_log_select_auditors
  on public.admin_activity_log
  for select
  to authenticated
  using (public.current_admin_role() in ('super_admin', 'admin_operativo'));

drop policy if exists "Admins pueden insertar en bitacora" on public.admin_activity_log;
drop policy if exists "Admins pueden insertar en bitácora" on public.admin_activity_log;
drop policy if exists admin_activity_log_insert_own_admin on public.admin_activity_log;

create index if not exists admin_activity_log_created_at_idx
  on public.admin_activity_log (created_at desc);

create index if not exists admin_activity_log_admin_id_idx
  on public.admin_activity_log (admin_id);
