-- Move critical admin mutations into transactional RPCs with row locks,
-- state checks, and audit logs written in the same transaction.

create or replace function public.assign_trip_driver(
  p_trip_id text,
  p_driver_id uuid
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_admin_id uuid;
  v_admin_name text;
  v_admin_role text;
  v_trip record;
  v_driver record;
  v_now timestamptz := now();
begin
  select id, name, role::text
    into v_admin_id, v_admin_name, v_admin_role
    from public.admin_users
   where auth_id = auth.uid()
     and active = true
   limit 1;

  if v_admin_id is null or v_admin_role not in ('super_admin', 'admin_operativo', 'soporte') then
    raise exception 'Not authorized to assign drivers' using errcode = '42501';
  end if;

  select id, status, driver_id
    into v_trip
    from public.trips
   where id = p_trip_id
   for update;

  if not found then
    raise exception 'Trip not found' using errcode = 'P0002';
  end if;

  select id, name, status
    into v_driver
    from public.drivers
   where id = p_driver_id
   for update;

  if not found then
    raise exception 'Driver not found' using errcode = 'P0002';
  end if;

  if v_trip.driver_id = p_driver_id and v_trip.status = 'conductor_asignado'::public.trip_status then
    update public.drivers
       set status = 'en_viaje'::public.driver_status,
           updated_at = v_now
     where id = p_driver_id
       and status <> 'en_viaje'::public.driver_status;

    return jsonb_build_object('ok', true, 'idempotent', true, 'trip_id', p_trip_id, 'driver_id', p_driver_id);
  end if;

  if v_trip.driver_id is not null then
    raise exception 'Trip already has a driver' using errcode = '23505';
  end if;

  if v_trip.status::text not in ('solicitud_recibida', 'pendiente_revision', 'pendiente_asignacion') then
    raise exception 'Trip is not pending assignment' using errcode = '22023';
  end if;

  if v_driver.status::text not in ('disponible', 'activo') then
    raise exception 'Driver is not available' using errcode = '22023';
  end if;

  if exists (
    select 1
      from public.trips
     where driver_id = p_driver_id
       and id <> p_trip_id
       and status::text in (
         'conductor_asignado',
         'conductor_en_camino',
         'recoleccion_proceso',
         'evidencia_inicial_pendiente',
         'traslado_curso',
         'entrega_proceso',
         'evidencia_final_pendiente'
       )
  ) then
    raise exception 'Driver already has an active trip' using errcode = '23505';
  end if;

  update public.trips
     set driver_id = p_driver_id,
         status = 'conductor_asignado'::public.trip_status,
         updated_at = v_now
   where id = p_trip_id;

  update public.drivers
     set status = 'en_viaje'::public.driver_status,
         updated_at = v_now
   where id = p_driver_id;

  insert into public.admin_activity_log (admin_id, admin_name, action, entity, entity_id, detail)
  values (
    v_admin_id,
    coalesce(v_admin_name, 'Admin'),
    'assign',
    'trip',
    p_trip_id,
    format('Asignó conductor %s al viaje %s', coalesce(v_driver.name, p_driver_id::text), p_trip_id)
  );

  return jsonb_build_object('ok', true, 'trip_id', p_trip_id, 'driver_id', p_driver_id);
end;
$$;

create or replace function public.update_trip_status_atomic(
  p_trip_id text,
  p_status public.trip_status,
  p_expected_status public.trip_status default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_admin_id uuid;
  v_admin_name text;
  v_admin_role text;
  v_trip record;
  v_now timestamptz := now();
begin
  select id, name, role::text
    into v_admin_id, v_admin_name, v_admin_role
    from public.admin_users
   where auth_id = auth.uid()
     and active = true
   limit 1;

  if v_admin_id is null or v_admin_role not in ('super_admin', 'admin_operativo', 'soporte') then
    raise exception 'Not authorized to update trips' using errcode = '42501';
  end if;

  select id, status
    into v_trip
    from public.trips
   where id = p_trip_id
   for update;

  if not found then
    raise exception 'Trip not found' using errcode = 'P0002';
  end if;

  if v_trip.status = p_status then
    return jsonb_build_object('ok', true, 'idempotent', true, 'trip_id', p_trip_id, 'status', p_status::text);
  end if;

  if p_expected_status is not null and v_trip.status <> p_expected_status then
    raise exception 'Trip status changed from % to %', p_expected_status::text, v_trip.status::text using errcode = '40001';
  end if;

  update public.trips
     set status = p_status,
         updated_at = v_now
   where id = p_trip_id;

  insert into public.admin_activity_log (admin_id, admin_name, action, entity, entity_id, detail)
  values (
    v_admin_id,
    coalesce(v_admin_name, 'Admin'),
    'update',
    'trip',
    p_trip_id,
    format('Cambió estatus de viaje de %s a %s', v_trip.status::text, p_status::text)
  );

  return jsonb_build_object('ok', true, 'trip_id', p_trip_id, 'status', p_status::text);
end;
$$;

create or replace function public.review_document_atomic(
  p_document_id uuid,
  p_status public.doc_status,
  p_notes text default null,
  p_expected_status public.doc_status default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_admin_id uuid;
  v_admin_name text;
  v_admin_role text;
  v_doc record;
  v_required text[];
  v_approved_count int := 0;
  v_owner_activated boolean := false;
  v_notes text := nullif(btrim(coalesce(p_notes, '')), '');
  v_now timestamptz := now();
begin
  select id, name, role::text
    into v_admin_id, v_admin_name, v_admin_role
    from public.admin_users
   where auth_id = auth.uid()
     and active = true
   limit 1;

  if v_admin_id is null or v_admin_role not in ('super_admin', 'admin_operativo', 'finanzas', 'validador') then
    raise exception 'Not authorized to review documents' using errcode = '42501';
  end if;

  if p_status::text not in ('aprobado', 'rechazado', 'en_revision') then
    raise exception 'Invalid document review status' using errcode = '22023';
  end if;

  if p_status = 'rechazado'::public.doc_status and v_notes is null then
    raise exception 'Reject notes are required' using errcode = '22023';
  end if;

  select id, owner_id, owner_type, owner_name, type, status, notes
    into v_doc
    from public.documents
   where id = p_document_id
   for update;

  if not found then
    raise exception 'Document not found' using errcode = 'P0002';
  end if;

  if v_doc.status = p_status and coalesce(v_doc.notes, '') = coalesce(v_notes, '') then
    return jsonb_build_object('ok', true, 'idempotent', true, 'document_id', p_document_id, 'status', p_status::text);
  end if;

  if p_expected_status is not null and v_doc.status <> p_expected_status then
    raise exception 'Document status changed from % to %', p_expected_status::text, v_doc.status::text using errcode = '40001';
  end if;

  update public.documents
     set status = p_status,
         notes = case
           when p_status = 'rechazado'::public.doc_status then v_notes
           else null
         end,
         reviewed_by = case
           when p_status = 'en_revision'::public.doc_status then null
           else v_admin_id
         end,
         updated_at = v_now
   where id = p_document_id;

  if p_status in ('aprobado'::public.doc_status, 'rechazado'::public.doc_status) then
    insert into public.notifications (user_id, user_type, title, body, type, metadata)
    values (
      v_doc.owner_id,
      v_doc.owner_type,
      case
        when p_status = 'aprobado'::public.doc_status then 'Documento aprobado'
        else 'Documento rechazado'
      end,
      case
        when p_status = 'aprobado'::public.doc_status then format('Tu %s fue aprobado correctamente.', v_doc.type)
        else format('Tu %s fue rechazado. Motivo: %s', v_doc.type, v_notes)
      end,
      'document',
      jsonb_build_object('doc_id', p_document_id, 'doc_type', v_doc.type, 'notes', v_notes)
    );
  end if;

  if p_status = 'aprobado'::public.doc_status then
    if v_doc.owner_type = 'driver' then
      v_required := array['ine', 'licencia', 'comprobante', 'antecedentes', 'foto_perfil'];
    elsif v_doc.owner_type = 'user' then
      v_required := array['ine', 'comprobante'];
    else
      v_required := array[]::text[];
    end if;

    if cardinality(v_required) > 0 then
      select count(distinct type)
        into v_approved_count
        from public.documents
       where owner_id = v_doc.owner_id
         and owner_type = v_doc.owner_type
         and type = any(v_required)
         and status = 'aprobado'::public.doc_status;

      if v_approved_count = cardinality(v_required) then
        if v_doc.owner_type = 'driver' then
          update public.drivers
             set status = 'activo'::public.driver_status,
                 updated_at = v_now
           where id = v_doc.owner_id
             and status::text not in ('en_viaje', 'suspendido', 'bloqueado');
        elsif v_doc.owner_type = 'user' then
          update public.app_users
             set status = 'activo',
                 updated_at = v_now
           where id = v_doc.owner_id
             and status <> 'suspendido';
        end if;

        v_owner_activated := true;
      end if;
    end if;
  end if;

  insert into public.admin_activity_log (admin_id, admin_name, action, entity, entity_id, detail)
  values (
    v_admin_id,
    coalesce(v_admin_name, 'Admin'),
    case
      when p_status = 'aprobado'::public.doc_status then 'approve'
      when p_status = 'rechazado'::public.doc_status then 'reject'
      else 'update'
    end,
    'document',
    p_document_id::text,
    format('Documento %s cambiado de %s a %s', v_doc.type, v_doc.status::text, p_status::text)
  );

  return jsonb_build_object(
    'ok', true,
    'document_id', p_document_id,
    'status', p_status::text,
    'owner_activated', v_owner_activated
  );
end;
$$;

create or replace function public.update_payment_statuses_atomic(
  p_payment_ids uuid[],
  p_status public.payment_status
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_admin_id uuid;
  v_admin_name text;
  v_admin_role text;
  v_ids uuid[];
  v_expected_count int;
  v_found_count int;
  v_conflict_count int;
  v_updated_count int;
  v_now timestamptz := now();
begin
  select id, name, role::text
    into v_admin_id, v_admin_name, v_admin_role
    from public.admin_users
   where auth_id = auth.uid()
     and active = true
   limit 1;

  if v_admin_id is null or v_admin_role not in ('super_admin', 'admin_operativo', 'finanzas') then
    raise exception 'Not authorized to update payments' using errcode = '42501';
  end if;

  if p_status::text not in ('pagado', 'rechazado', 'ajustado') then
    raise exception 'Invalid payment status transition' using errcode = '22023';
  end if;

  select array_agg(distinct id)
    into v_ids
    from unnest(p_payment_ids) as ids(id)
   where id is not null;

  v_expected_count := coalesce(cardinality(v_ids), 0);
  if v_expected_count = 0 then
    raise exception 'At least one payment id is required' using errcode = '22023';
  end if;

  perform 1
    from public.payments
   where id = any(v_ids)
   for update;

  select count(*)
    into v_found_count
    from public.payments
   where id = any(v_ids);

  if v_found_count <> v_expected_count then
    raise exception 'One or more payments were not found' using errcode = 'P0002';
  end if;

  if p_status in ('pagado'::public.payment_status, 'rechazado'::public.payment_status) then
    select count(*)
      into v_conflict_count
      from public.payments
     where id = any(v_ids)
       and status not in ('pendiente'::public.payment_status, 'en_revision'::public.payment_status, p_status);
  else
    select count(*)
      into v_conflict_count
      from public.payments
     where id = any(v_ids)
       and status not in ('pagado'::public.payment_status, 'ajustado'::public.payment_status);
  end if;

  if v_conflict_count > 0 then
    raise exception 'One or more payments are not in a valid state for this transition' using errcode = '40001';
  end if;

  update public.payments
     set status = p_status,
         paid_at = case when p_status = 'pagado'::public.payment_status then v_now else paid_at end,
         approved_by = v_admin_id,
         updated_at = v_now
   where id = any(v_ids)
     and status is distinct from p_status;

  get diagnostics v_updated_count = row_count;

  insert into public.admin_activity_log (admin_id, admin_name, action, entity, entity_id, detail)
  values (
    v_admin_id,
    coalesce(v_admin_name, 'Admin'),
    case
      when p_status = 'pagado'::public.payment_status then 'approve'
      when p_status = 'rechazado'::public.payment_status then 'reject'
      else 'update'
    end,
    'payment',
    array_to_string(v_ids, ','),
    format('Cambió %s pago(s) a %s', v_expected_count, p_status::text)
  );

  return jsonb_build_object(
    'ok', true,
    'status', p_status::text,
    'requested_count', v_expected_count,
    'updated_count', v_updated_count
  );
end;
$$;

revoke all on function public.assign_trip_driver(text, uuid) from public;
revoke all on function public.update_trip_status_atomic(text, public.trip_status, public.trip_status) from public;
revoke all on function public.review_document_atomic(uuid, public.doc_status, text, public.doc_status) from public;
revoke all on function public.update_payment_statuses_atomic(uuid[], public.payment_status) from public;

grant execute on function public.assign_trip_driver(text, uuid) to authenticated;
grant execute on function public.update_trip_status_atomic(text, public.trip_status, public.trip_status) to authenticated;
grant execute on function public.review_document_atomic(uuid, public.doc_status, text, public.doc_status) to authenticated;
grant execute on function public.update_payment_statuses_atomic(uuid[], public.payment_status) to authenticated;
