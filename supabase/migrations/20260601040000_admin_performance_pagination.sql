-- Reduce admin read amplification with bounded RPCs and supporting indexes.

create extension if not exists pg_trgm;

create index if not exists trips_status_updated_at_idx
  on public.trips (status, updated_at desc);

create index if not exists trips_status_scheduled_at_idx
  on public.trips (status, scheduled_at);

create index if not exists drivers_status_idx
  on public.drivers (status);

create index if not exists incidents_status_idx
  on public.incidents (status);

create index if not exists documents_status_uploaded_at_idx
  on public.documents (status, uploaded_at desc);

create index if not exists documents_owner_name_trgm_idx
  on public.documents using gin (owner_name gin_trgm_ops);

create index if not exists documents_type_idx
  on public.documents (type);

create index if not exists payments_status_created_at_idx
  on public.payments (status, created_at desc);

create index if not exists payments_type_created_at_idx
  on public.payments (type, created_at desc);

create index if not exists payments_concept_trgm_idx
  on public.payments using gin (concept gin_trgm_ops);

do $$
begin
  if exists (
    select 1
      from information_schema.columns
     where table_schema = 'public'
       and table_name = 'payments'
       and column_name = 'driver_id'
  ) then
    execute 'create index if not exists payments_driver_id_idx on public.payments (driver_id)';
  end if;

  if exists (
    select 1
      from information_schema.columns
     where table_schema = 'public'
       and table_name = 'payments'
       and column_name = 'user_id'
  ) then
    execute 'create index if not exists payments_user_id_idx on public.payments (user_id)';
  end if;
end;
$$;

create index if not exists drivers_name_trgm_idx
  on public.drivers using gin (name gin_trgm_ops);

create index if not exists app_users_name_trgm_idx
  on public.app_users using gin (name gin_trgm_ops);

create or replace function public.get_admin_dashboard_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_admin_role text;
  v_today_start timestamptz := date_trunc('day', timezone('America/Mexico_City', now())) at time zone 'America/Mexico_City';
  v_active_statuses text[] := array[
    'conductor_asignado',
    'conductor_en_camino',
    'recoleccion_proceso',
    'evidencia_inicial_pendiente',
    'traslado_curso',
    'entrega_proceso',
    'evidencia_final_pendiente'
  ];
  v_sin_conductor bigint;
  v_viajes_activos bigint;
  v_finalizados_hoy bigint;
  v_conductores_disponibles bigint;
  v_incidencias_abiertas bigint;
  v_docs_pendientes bigint;
  v_pagos_pendientes bigint;
  v_ingresos_hoy numeric := 0;
  v_active jsonb := '[]'::jsonb;
  v_upcoming jsonb := '[]'::jsonb;
  v_activity jsonb := '[]'::jsonb;
begin
  select role::text
    into v_admin_role
    from public.admin_users
   where auth_id = auth.uid()
     and active = true
   limit 1;

  if v_admin_role is null then
    raise exception 'Not an active admin' using errcode = '42501';
  end if;

  select count(*)
    into v_viajes_activos
    from public.trips
   where status::text = any(v_active_statuses);

  select count(*)
    into v_sin_conductor
    from public.trips
   where status::text in ('solicitud_recibida', 'pendiente_revision', 'pendiente_asignacion');

  select count(*)
    into v_finalizados_hoy
    from public.trips
   where status::text = 'finalizado'
     and updated_at >= v_today_start;

  select count(*)
    into v_conductores_disponibles
    from public.drivers
   where status::text in ('disponible', 'activo');

  select count(*)
    into v_incidencias_abiertas
    from public.incidents
   where status::text in ('nueva', 'en_revision', 'en_seguimiento', 'escalada');

  select count(*)
    into v_docs_pendientes
    from public.documents
   where status::text = 'en_revision';

  select count(*)
    into v_pagos_pendientes
    from public.payments
   where status::text in ('pendiente', 'en_revision');

  select coalesce(sum(amount), 0)
    into v_ingresos_hoy
    from public.payments
   where type = 'cobro_usuario'
     and status::text = 'pagado'
     and created_at >= v_today_start;

  select coalesce(jsonb_agg(jsonb_build_object(
      'id', t.id,
      'status', t.status::text,
      'origin_address', t.origin_address,
      'destination_address', t.destination_address,
      'vehicle_plates', t.vehicle_plates,
      'driver_name', t.driver_name,
      'user_name', t.user_name,
      'updated_at', t.updated_at
    ) order by t.updated_at desc nulls last), '[]'::jsonb)
    into v_active
    from (
      select trips.id, trips.status, trips.origin_address, trips.destination_address,
             trips.vehicle_plates, trips.updated_at, drivers.name as driver_name,
             app_users.name as user_name
        from public.trips
        left join public.drivers on drivers.id = trips.driver_id
        left join public.app_users on app_users.id = trips.user_id
       where trips.status::text = any(v_active_statuses)
       order by trips.updated_at desc nulls last
       limit 20
    ) as t;

  select coalesce(jsonb_agg(jsonb_build_object(
      'id', t.id,
      'status', t.status::text,
      'origin_address', t.origin_address,
      'destination_address', t.destination_address,
      'vehicle_plates', t.vehicle_plates,
      'driver_name', null,
      'user_name', t.user_name,
      'updated_at', t.scheduled_at
    ) order by t.scheduled_at asc nulls last), '[]'::jsonb)
    into v_upcoming
    from (
      select trips.id, trips.status, trips.origin_address, trips.destination_address,
             trips.vehicle_plates, trips.scheduled_at, app_users.name as user_name
        from public.trips
        left join public.app_users on app_users.id = trips.user_id
       where trips.status::text = 'solicitud_recibida'
         and trips.scheduled_at is not null
         and trips.scheduled_at >= now()
       order by trips.scheduled_at asc nulls last
       limit 5
    ) as t;

  select coalesce(jsonb_agg(jsonb_build_object(
      'id', t.id,
      'status', t.status::text,
      'user_name', t.user_name,
      'updated_at', t.updated_at
    ) order by t.updated_at desc nulls last), '[]'::jsonb)
    into v_activity
    from (
      select trips.id, trips.status, trips.updated_at, app_users.name as user_name
        from public.trips
        left join public.app_users on app_users.id = trips.user_id
       order by trips.updated_at desc nulls last
       limit 8
    ) as t;

  return jsonb_build_object(
    'metrics', jsonb_build_object(
      'viajesActivos', v_viajes_activos,
      'sinConductor', v_sin_conductor,
      'finalizadosHoy', v_finalizados_hoy,
      'conductoresDisponibles', v_conductores_disponibles,
      'incidenciasAbiertas', v_incidencias_abiertas,
      'docsPendientes', v_docs_pendientes,
      'pagosPendientes', v_pagos_pendientes,
      'ingresosHoy', v_ingresos_hoy
    ),
    'active', v_active,
    'upcoming', v_upcoming,
    'activity', v_activity
  );
end;
$$;

create or replace function public.get_admin_document_status_counts()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_admin_role text;
  v_total bigint;
  v_en_revision bigint;
  v_aprobado bigint;
  v_rechazado bigint;
begin
  select role::text
    into v_admin_role
    from public.admin_users
   where auth_id = auth.uid()
     and active = true
   limit 1;

  if v_admin_role is null or v_admin_role not in ('super_admin', 'admin_operativo', 'finanzas', 'validador') then
    raise exception 'Not authorized to read documents' using errcode = '42501';
  end if;

  select count(*),
         count(*) filter (where status = 'en_revision'::public.doc_status),
         count(*) filter (where status = 'aprobado'::public.doc_status),
         count(*) filter (where status = 'rechazado'::public.doc_status)
    into v_total, v_en_revision, v_aprobado, v_rechazado
    from public.documents;

  return jsonb_build_object(
    'todos', v_total,
    'en_revision', v_en_revision,
    'aprobado', v_aprobado,
    'rechazado', v_rechazado
  );
end;
$$;

create or replace function public.get_admin_documents_total(
  p_status public.doc_status default null,
  p_search text default null
)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_admin_role text;
  v_search text := nullif(btrim(coalesce(p_search, '')), '');
  v_total integer;
begin
  select role::text
    into v_admin_role
    from public.admin_users
   where auth_id = auth.uid()
     and active = true
   limit 1;

  if v_admin_role is null or v_admin_role not in ('super_admin', 'admin_operativo', 'finanzas', 'validador') then
    raise exception 'Not authorized to read documents' using errcode = '42501';
  end if;

  select count(*)::integer
    into v_total
    from public.documents d
   where (p_status is null or d.status = p_status)
     and (
       v_search is null
       or d.owner_name ilike ('%' || v_search || '%')
       or d.type::text ilike ('%' || v_search || '%')
       or d.id::text ilike ('%' || v_search || '%')
     );

  return v_total;
end;
$$;

create or replace function public.get_admin_documents_page(
  p_status public.doc_status default null,
  p_search text default null,
  p_limit integer default 25,
  p_offset integer default 0
)
returns table (
  id uuid,
  owner_id uuid,
  owner_type text,
  owner_name text,
  type text,
  status text,
  url text,
  storage_path text,
  mime_type text,
  notes text,
  uploaded_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_admin_role text;
  v_search text := nullif(btrim(coalesce(p_search, '')), '');
  v_limit integer := least(greatest(coalesce(p_limit, 25), 1), 100);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
begin
  select role::text
    into v_admin_role
    from public.admin_users
   where auth_id = auth.uid()
     and active = true
   limit 1;

  if v_admin_role is null or v_admin_role not in ('super_admin', 'admin_operativo', 'finanzas', 'validador') then
    raise exception 'Not authorized to read documents' using errcode = '42501';
  end if;

  return query
    select d.id,
           d.owner_id,
           d.owner_type::text,
           d.owner_name,
           d.type::text,
           d.status::text,
           d.url,
           d.storage_path,
           d.mime_type,
           d.notes,
           d.uploaded_at,
           d.updated_at
      from public.documents d
     where (p_status is null or d.status = p_status)
       and (
         v_search is null
         or d.owner_name ilike ('%' || v_search || '%')
         or d.type::text ilike ('%' || v_search || '%')
         or d.id::text ilike ('%' || v_search || '%')
       )
     order by d.uploaded_at desc nulls last, d.updated_at desc nulls last, d.id desc
     limit v_limit
    offset v_offset;
end;
$$;

create or replace function public.get_admin_payment_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_admin_role text;
  v_pendientes bigint;
  v_pagados bigint;
  v_total_pagado numeric := 0;
  v_rechazados bigint;
begin
  select role::text
    into v_admin_role
    from public.admin_users
   where auth_id = auth.uid()
     and active = true
   limit 1;

  if v_admin_role is null or v_admin_role not in ('super_admin', 'admin_operativo', 'finanzas') then
    raise exception 'Not authorized to read payments' using errcode = '42501';
  end if;

  select count(*) filter (where status in ('pendiente'::public.payment_status, 'en_revision'::public.payment_status)),
         count(*) filter (where status = 'pagado'::public.payment_status),
         coalesce(sum(amount) filter (where status = 'pagado'::public.payment_status), 0),
         count(*) filter (where status = 'rechazado'::public.payment_status)
    into v_pendientes, v_pagados, v_total_pagado, v_rechazados
    from public.payments;

  return jsonb_build_object(
    'pendientes', v_pendientes,
    'pagados', v_pagados,
    'totalPagado', v_total_pagado,
    'rechazados', v_rechazados
  );
end;
$$;

create or replace function public.get_admin_payments_total(
  p_status text default null,
  p_type text default null,
  p_search text default null
)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_admin_role text;
  v_search text := nullif(btrim(coalesce(p_search, '')), '');
  v_total integer;
begin
  select role::text
    into v_admin_role
    from public.admin_users
   where auth_id = auth.uid()
     and active = true
   limit 1;

  if v_admin_role is null or v_admin_role not in ('super_admin', 'admin_operativo', 'finanzas') then
    raise exception 'Not authorized to read payments' using errcode = '42501';
  end if;

  select count(*)::integer
    into v_total
    from public.payments p
   where (p_status is null or p.status = p_status::public.payment_status)
     and (p_type is null or p.type::text = p_type)
     and (
       v_search is null
       or p.concept ilike ('%' || v_search || '%')
       or p.trip_id ilike ('%' || v_search || '%')
       or p.method ilike ('%' || v_search || '%')
       or p.id::text ilike ('%' || v_search || '%')
     );

  return v_total;
end;
$$;

create or replace function public.get_admin_payments_page(
  p_status text default null,
  p_type text default null,
  p_search text default null,
  p_limit integer default 25,
  p_offset integer default 0
)
returns table (
  id uuid,
  type text,
  status text,
  amount numeric,
  concept text,
  trip_id text,
  driver_id uuid,
  user_id uuid,
  created_at timestamptz,
  paid_at timestamptz,
  notes text,
  driver_name text,
  user_name text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_admin_role text;
  v_search text := nullif(btrim(coalesce(p_search, '')), '');
  v_limit integer := least(greatest(coalesce(p_limit, 25), 1), 100);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
begin
  select role::text
    into v_admin_role
    from public.admin_users
   where auth_id = auth.uid()
     and active = true
   limit 1;

  if v_admin_role is null or v_admin_role not in ('super_admin', 'admin_operativo', 'finanzas') then
    raise exception 'Not authorized to read payments' using errcode = '42501';
  end if;

  return query
    select p.id,
           p.type::text,
           p.status::text,
           p.amount,
           p.concept,
           p.trip_id,
           null::uuid as driver_id,
           null::uuid as user_id,
           p.created_at,
           p.paid_at,
           null::text as notes,
           null::text as driver_name,
           null::text as user_name
      from public.payments p
     where (p_status is null or p.status = p_status::public.payment_status)
       and (p_type is null or p.type::text = p_type)
       and (
         v_search is null
         or p.concept ilike ('%' || v_search || '%')
         or p.trip_id ilike ('%' || v_search || '%')
         or p.method ilike ('%' || v_search || '%')
         or p.id::text ilike ('%' || v_search || '%')
       )
     order by p.created_at desc nulls last, p.id desc
     limit v_limit
    offset v_offset;
end;
$$;

revoke all on function public.get_admin_dashboard_summary() from public;
revoke all on function public.get_admin_document_status_counts() from public;
revoke all on function public.get_admin_documents_total(public.doc_status, text) from public;
revoke all on function public.get_admin_documents_page(public.doc_status, text, integer, integer) from public;
revoke all on function public.get_admin_payment_summary() from public;
revoke all on function public.get_admin_payments_total(text, text, text) from public;
revoke all on function public.get_admin_payments_page(text, text, text, integer, integer) from public;

grant execute on function public.get_admin_dashboard_summary() to authenticated;
grant execute on function public.get_admin_document_status_counts() to authenticated;
grant execute on function public.get_admin_documents_total(public.doc_status, text) to authenticated;
grant execute on function public.get_admin_documents_page(public.doc_status, text, integer, integer) to authenticated;
grant execute on function public.get_admin_payment_summary() to authenticated;
grant execute on function public.get_admin_payments_total(text, text, text) to authenticated;
grant execute on function public.get_admin_payments_page(text, text, text, integer, integer) to authenticated;
