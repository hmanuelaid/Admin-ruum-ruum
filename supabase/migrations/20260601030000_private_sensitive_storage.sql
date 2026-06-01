-- Keep documents and evidence private. Store object paths in data rows and
-- grant object access only to active admins through short-lived signed URLs.

alter table public.documents
  add column if not exists storage_path text,
  add column if not exists mime_type text,
  add column if not exists file_size_bytes integer;

alter table public.evidence_photos
  add column if not exists storage_path text,
  add column if not exists mime_type text,
  add column if not exists file_size_bytes integer;

update public.documents
   set storage_path = case
     when url like 'http%/storage/v1/object/public/documents/%'
       then split_part(split_part(url, '/storage/v1/object/public/documents/', 2), '?', 1)
     when url like 'http%/storage/v1/object/sign/documents/%'
       then split_part(split_part(url, '/storage/v1/object/sign/documents/', 2), '?', 1)
     when url is not null and url not like 'http%'
       then url
     else storage_path
   end
 where storage_path is null;

update public.documents
   set url = storage_path
 where storage_path is not null
   and (url is null or url like 'http%');

update public.evidence_photos
   set storage_path = case
     when url like 'http%/storage/v1/object/public/evidence/%'
       then split_part(split_part(url, '/storage/v1/object/public/evidence/', 2), '?', 1)
     when url like 'http%/storage/v1/object/sign/evidence/%'
       then split_part(split_part(url, '/storage/v1/object/sign/evidence/', 2), '?', 1)
     when url like 'http%/storage/v1/object/public/trip-evidence/%'
       then split_part(split_part(url, '/storage/v1/object/public/trip-evidence/', 2), '?', 1)
     when url is not null and url not like 'http%'
       then url
     else storage_path
   end
 where storage_path is null;

update public.evidence_photos
   set url = storage_path
 where storage_path is not null
   and url like 'http%';

update storage.buckets
   set public = false,
       file_size_limit = 10485760,
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
 where id = 'documents';

update storage.buckets
   set public = false,
       file_size_limit = 10485760,
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
 where id = 'evidence';

drop policy if exists "allow_all_reads" on storage.objects;
drop policy if exists "allow_all_uploads" on storage.objects;
drop policy if exists "allow_all_updates" on storage.objects;
drop policy if exists "users_read_own_documents" on storage.objects;
drop policy if exists "users_upload_documents" on storage.objects;

drop policy if exists "Evidencia publica lectura" on storage.objects;
drop policy if exists "Conductores pueden subir evidencias" on storage.objects;
drop policy if exists "Conductores pueden actualizar sus evidencias" on storage.objects;
drop policy if exists "Admin puede eliminar evidencias" on storage.objects;
drop policy if exists "drivers_upload_evidence_files" on storage.objects;
drop policy if exists "drivers_update_evidence_files" on storage.objects;

drop policy if exists admin_manage_sensitive_documents on storage.objects;
create policy admin_manage_sensitive_documents
  on storage.objects
  for all
  to authenticated
  using (
    bucket_id = 'documents'
    and public.is_active_admin()
  )
  with check (
    bucket_id = 'documents'
    and public.is_active_admin()
  );

drop policy if exists admin_manage_sensitive_evidence on storage.objects;
create policy admin_manage_sensitive_evidence
  on storage.objects
  for all
  to authenticated
  using (
    bucket_id = 'evidence'
    and public.is_active_admin()
  )
  with check (
    bucket_id = 'evidence'
    and public.is_active_admin()
  );
