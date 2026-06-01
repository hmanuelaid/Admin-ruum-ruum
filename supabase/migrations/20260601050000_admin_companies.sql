-- Add real company management for the admin Empresas module.
-- The production table already uses Spanish column names: nombre and razon_social.

create extension if not exists pg_trgm;

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  razon_social text not null,
  nombre text not null,
  rfc text,
  contact_name text,
  phone text,
  email text,
  type text,
  status text not null default 'activo',
  trips_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.companies
  add column if not exists trips_count integer not null default 0;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists companies_set_updated_at on public.companies;
create trigger companies_set_updated_at
  before update on public.companies
  for each row
  execute function public.set_updated_at();

create index if not exists companies_status_created_at_idx
  on public.companies (status, created_at desc);

create index if not exists companies_type_created_at_idx
  on public.companies (type, created_at desc);

create index if not exists companies_nombre_trgm_idx
  on public.companies using gin (nombre gin_trgm_ops);

create index if not exists companies_razon_social_trgm_idx
  on public.companies using gin (razon_social gin_trgm_ops);

create index if not exists companies_rfc_trgm_idx
  on public.companies using gin (rfc gin_trgm_ops);

create index if not exists companies_contact_name_trgm_idx
  on public.companies using gin (contact_name gin_trgm_ops);

alter table public.companies enable row level security;

revoke all on table public.companies from anon;
grant select, insert, update, delete on table public.companies to authenticated;

drop policy if exists admins_all_companies on public.companies;
drop policy if exists companies_admin_select on public.companies;
create policy companies_admin_select
  on public.companies
  for select
  to authenticated
  using (public.current_admin_role() in ('super_admin', 'admin_operativo', 'comercial'));

drop policy if exists companies_admin_write on public.companies;
create policy companies_admin_write
  on public.companies
  for all
  to authenticated
  using (public.current_admin_role() in ('super_admin', 'admin_operativo', 'comercial'))
  with check (public.current_admin_role() in ('super_admin', 'admin_operativo', 'comercial'));

create or replace function public.get_admin_companies_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_admin_role text;
  v_total bigint;
  v_activas bigint;
  v_suspendidas bigint;
  v_viajes_total bigint;
begin
  select role::text
    into v_admin_role
    from public.admin_users
   where auth_id = auth.uid()
     and active = true
   limit 1;

  if v_admin_role is null or v_admin_role not in ('super_admin', 'admin_operativo', 'comercial') then
    raise exception 'Not authorized to read companies' using errcode = '42501';
  end if;

  select count(*),
         count(*) filter (where status = 'activo'),
         count(*) filter (where status = 'suspendido'),
         coalesce(sum(trips_count), 0)
    into v_total, v_activas, v_suspendidas, v_viajes_total
    from public.companies;

  return jsonb_build_object(
    'total', v_total,
    'activas', v_activas,
    'suspendidas', v_suspendidas,
    'viajesTotal', v_viajes_total
  );
end;
$$;

revoke all on function public.get_admin_companies_summary() from public;
grant execute on function public.get_admin_companies_summary() to authenticated;
