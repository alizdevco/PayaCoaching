create table if not exists multipart_uploads (
  upload_id text primary key,
  object_key text not null,
  scope text not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table multipart_uploads enable row level security;

-- No client-facing policies needed: this table is only ever touched by the
-- multipart-upload Edge Function using the service-role key, which bypasses RLS.
-- RLS is enabled here purely as defense-in-depth in case anon/authenticated
-- roles are ever accidentally granted access.
