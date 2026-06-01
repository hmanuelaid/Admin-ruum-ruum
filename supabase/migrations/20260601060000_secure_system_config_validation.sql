-- Enforce a versioned contract for editable system_config keys and move writes
-- through a server/RPC path with validated values.

create table if not exists public.system_config (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value text not null,
  updated_at timestamptz default now()
);

alter table public.system_config
  add column if not exists updated_at timestamptz default now();

create or replace function public.is_valid_system_config_value(
  p_key text,
  p_value text
)
returns boolean
language plpgsql
immutable
set search_path = public
as $$
declare
  v_value text := btrim(coalesce(p_value, ''));
  v_num numeric;
begin
  if p_key is null or p_value is null then
    return false;
  end if;

  if p_key in ('tarifa_base_mxn', 'tarifa_km_mxn', 'radio_busqueda_km') then
    if v_value !~ '^[0-9]+(\.[0-9]+)?$' then
      return false;
    end if;

    v_num := v_value::numeric;

    if p_key = 'tarifa_base_mxn' then
      return v_num >= 0 and v_num <= 100000;
    elsif p_key = 'tarifa_km_mxn' then
      return v_num >= 0 and v_num <= 10000;
    elsif p_key = 'radio_busqueda_km' then
      return v_num >= 1 and v_num <= 500;
    end if;
  elsif p_key in ('comision_conductor_pct', 'iva_pct') then
    if v_value !~ '^[0-9]+(\.[0-9]+)?$' then
      return false;
    end if;

    v_num := v_value::numeric;
    return v_num >= 0 and v_num <= 100;
  elsif p_key in ('tiempo_asignacion_min', 'max_incidencias_conductor') then
    if v_value !~ '^[0-9]+$' then
      return false;
    end if;

    v_num := v_value::numeric;

    if p_key = 'tiempo_asignacion_min' then
      return v_num >= 1 and v_num <= 1440;
    elsif p_key = 'max_incidencias_conductor' then
      return v_num >= 0 and v_num <= 100;
    end if;
  elsif p_key in (
    'requiere_evidencia_inicial',
    'requiere_evidencia_final',
    'notif_viaje_sin_conductor',
    'notif_incidencia_nueva',
    'notif_doc_vencido'
  ) then
    return v_value in ('true', 'false');
  end if;

  return false;
exception when others then
  return false;
end;
$$;

alter table public.system_config
  drop constraint if exists system_config_known_key_value_check;

alter table public.system_config
  add constraint system_config_known_key_value_check
  check (public.is_valid_system_config_value(key, value)) not valid;

insert into public.system_config (key, value)
values
  ('tarifa_base_mxn', '150'),
  ('tarifa_km_mxn', '18'),
  ('comision_conductor_pct', '75'),
  ('iva_pct', '16'),
  ('tiempo_asignacion_min', '15'),
  ('radio_busqueda_km', '25'),
  ('max_incidencias_conductor', '3'),
  ('requiere_evidencia_inicial', 'true'),
  ('requiere_evidencia_final', 'true'),
  ('notif_viaje_sin_conductor', 'true'),
  ('notif_incidencia_nueva', 'true'),
  ('notif_doc_vencido', 'true')
on conflict (key) do nothing;

create or replace function public.upsert_system_config_values(
  p_items jsonb
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
  v_item jsonb;
  v_key text;
  v_value text;
  v_count integer := 0;
  v_keys text[] := array[]::text[];
begin
  select id, name, role::text
    into v_admin_id, v_admin_name, v_admin_role
    from public.admin_users
   where auth_id = auth.uid()
     and active = true
   limit 1;

  if v_admin_id is null or v_admin_role <> 'super_admin' then
    raise exception 'Not authorized to update system config' using errcode = '42501';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'Config payload must be an array' using errcode = '22023';
  end if;

  if jsonb_array_length(p_items) > 50 then
    raise exception 'Config payload has too many items' using errcode = '22023';
  end if;

  for v_item in select value from jsonb_array_elements(p_items) as items(value)
  loop
    if jsonb_typeof(v_item) <> 'object' then
      raise exception 'Invalid config item' using errcode = '22023';
    end if;

    v_key := v_item->>'key';
    v_value := v_item->>'value';

    if not public.is_valid_system_config_value(v_key, v_value) then
      raise exception 'Invalid value for config key %', coalesce(v_key, '<missing>') using errcode = '22023';
    end if;

    insert into public.system_config (key, value, updated_at)
    values (v_key, v_value, now())
    on conflict (key) do update
      set value = excluded.value,
          updated_at = excluded.updated_at;

    v_count := v_count + 1;
    v_keys := array_append(v_keys, v_key);
  end loop;

  if v_count > 0 then
    insert into public.admin_activity_log (admin_id, admin_name, action, entity, entity_id, detail)
    values (
      v_admin_id,
      coalesce(v_admin_name, 'Admin'),
      'update',
      'config',
      array_to_string(v_keys, ','),
      format('Actualizo %s parametro(s) de configuracion', v_count)
    );
  end if;

  return jsonb_build_object('ok', true, 'saved', v_count, 'keys', v_keys);
end;
$$;

revoke all on function public.is_valid_system_config_value(text, text) from public;
revoke all on function public.upsert_system_config_values(jsonb) from public;
grant execute on function public.is_valid_system_config_value(text, text) to authenticated;
grant execute on function public.upsert_system_config_values(jsonb) to authenticated;
