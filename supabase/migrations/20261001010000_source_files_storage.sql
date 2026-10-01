-- Private original files for source materials.
-- Store each object at <auth.uid()>/<source id>/<safe filename>.

begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'source-files',
  'source-files',
  false,
  10485760,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ]::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Users upload their source files"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'source-files'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

-- SELECT is also needed when Storage returns metadata for an uploaded object.
create policy "Users read their source files"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'source-files'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "Users delete their source files"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'source-files'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

-- No UPDATE policy: upload to a unique path and keep upsert disabled.

commit;
