-- student_contents: metadata for private files stored in Liara Object Storage.

create table public.student_contents (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text,
  file_type text not null check (file_type in ('video', 'pdf', 'image')),
  file_path text not null,
  mime_type text not null,
  file_size bigint not null check (file_size > 0),
  uploaded_by uuid not null references public.profiles (id) on delete restrict,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_contents_title_not_blank check (btrim(title) <> '')
);

comment on table public.student_contents is 'Private student file metadata; binary objects live in Liara, not in Postgres.';
comment on column public.student_contents.file_path is 'Liara object key, e.g. students/{student_id}/videos/{uuid}.mp4';
comment on column public.student_contents.deleted_at is 'Soft-delete timestamp; active rows have deleted_at IS NULL.';

create index student_contents_student_id_active_idx
  on public.student_contents (student_id)
  where deleted_at is null;

create index student_contents_uploaded_by_idx on public.student_contents (uploaded_by);

create index student_contents_created_at_idx on public.student_contents (created_at desc);
