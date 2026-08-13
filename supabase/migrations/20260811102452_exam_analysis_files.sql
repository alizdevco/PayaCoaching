-- exam_analysis_files: public exam media (videos/PDFs) stored in the public bucket.
-- Replaces the single video_path column on exam_analyses.

create table public.exam_analysis_files (
  id uuid primary key default gen_random_uuid(),
  exam_analysis_id uuid not null references public.exam_analyses (id) on delete cascade,
  title text not null,
  file_type text not null check (file_type in ('video', 'pdf')),
  file_path text not null,
  public_url text not null,
  mime_type text,
  file_size bigint check (file_size is null or file_size > 0),
  sort_order int not null default 0,
  uploaded_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint exam_analysis_files_title_not_blank check (btrim(title) <> ''),
  constraint exam_analysis_files_file_path_not_blank check (btrim(file_path) <> ''),
  constraint exam_analysis_files_public_url_not_blank check (btrim(public_url) <> '')
);

comment on table public.exam_analysis_files is
  'Public exam analysis media metadata; objects live in the public Arvan bucket.';
comment on column public.exam_analysis_files.file_path is
  'Object key in the public bucket, e.g. exam-analyses/{exam_date}/videos/{uuid}.mp4';
comment on column public.exam_analysis_files.public_url is
  'Permanent public URL for embedding in video tags or download links.';

create index exam_analysis_files_exam_type_order_idx
  on public.exam_analysis_files (exam_analysis_id, file_type, sort_order);

-- Migrate legacy single-video rows before dropping video_path.
insert into public.exam_analysis_files (
  exam_analysis_id,
  title,
  file_type,
  file_path,
  public_url,
  uploaded_by
)
select
  ea.id,
  'ویدیو',
  'video',
  case
    when ea.video_path ~ '^https?://' then
      regexp_replace(ea.video_path, '^https?://[^/]+/', '')
    else btrim(ea.video_path)
  end,
  case
    when ea.video_path ~ '^https?://' then btrim(ea.video_path)
    else btrim(ea.video_path)
  end,
  ea.created_by
from public.exam_analyses ea
where ea.video_path is not null
  and btrim(ea.video_path) <> '';

alter table public.exam_analyses
  drop column video_path;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.exam_analysis_files enable row level security;

grant select on public.exam_analysis_files to anon, authenticated;
grant insert, update, delete on public.exam_analysis_files to authenticated;
grant select, insert, update, delete on public.exam_analysis_files to service_role;

-- anon + authenticated: read files only when the parent exam is published.
create policy exam_analysis_files_select_published
  on public.exam_analysis_files
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.exam_analyses ea
      where ea.id = exam_analysis_id
        and ea.is_published = true
    )
  );

-- admin: full CRUD (including files on unpublished exams).
create policy exam_analysis_files_select_admin
  on public.exam_analysis_files
  for select
  to authenticated
  using ((select private.is_admin()));

create policy exam_analysis_files_insert_admin
  on public.exam_analysis_files
  for insert
  to authenticated
  with check ((select private.is_admin()));

create policy exam_analysis_files_update_admin
  on public.exam_analysis_files
  for update
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy exam_analysis_files_delete_admin
  on public.exam_analysis_files
  for delete
  to authenticated
  using ((select private.is_admin()));
