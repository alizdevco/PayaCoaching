-- work_reports: student-uploaded daily work report metadata.
-- Binary PDFs live in Arvan private storage; rows are soft-deleted via Edge Functions.

create table public.work_reports (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  title text,
  description text,
  report_date date not null,
  file_path text not null,
  original_filename text not null,
  file_size bigint not null check (file_size > 0),
  mime_type text not null check (mime_type = 'application/pdf'),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint work_reports_title_not_blank check (title is null or btrim(title) <> ''),
  constraint work_reports_original_filename_not_blank check (btrim(original_filename) <> '')
);

comment on table public.work_reports is 'Student-uploaded work report metadata; PDF objects live in Arvan private storage.';
comment on column public.work_reports.file_path is 'Arvan object key, e.g. work-reports/{student_id}/reports/{uuid}.pdf';
comment on column public.work_reports.report_date is 'Calendar date the work report covers.';
comment on column public.work_reports.deleted_at is 'Soft-delete timestamp; active rows have deleted_at IS NULL.';

create index work_reports_student_report_date_active_idx
  on public.work_reports (student_id, report_date desc)
  where deleted_at is null;

create index work_reports_student_id_active_idx
  on public.work_reports (student_id)
  where deleted_at is null;

create index work_reports_created_at_idx
  on public.work_reports (created_at desc);

-- ---------------------------------------------------------------------------
-- Ownership: file_path must match work-reports/{student_id}/reports/{uuid}.pdf
-- ---------------------------------------------------------------------------

create or replace function private.validate_work_report_file_path()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  expected_prefix text;
begin
  expected_prefix := 'work-reports/' || new.student_id::text || '/reports/';

  if left(new.file_path, length(expected_prefix)) is distinct from expected_prefix then
    raise exception 'file_path must belong to the student work-reports prefix';
  end if;

  if new.file_path !~ (
    '^work-reports/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/reports/'
    || '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$'
  ) then
    raise exception 'file_path must match work-reports/{student_id}/reports/{uuid}.pdf';
  end if;

  return new;
end;
$$;

revoke all on function private.validate_work_report_file_path() from public;
grant execute on function private.validate_work_report_file_path() to authenticated, service_role;

create trigger work_reports_validate_file_path
  before insert or update of student_id, file_path on public.work_reports
  for each row
  execute function private.validate_work_report_file_path();

-- ---------------------------------------------------------------------------
-- RLS
--   student: read own active rows; insert own rows only (defense in depth)
--   admin:   read all active rows
--   soft-delete and storage cleanup: Edge Functions (service role)
-- ---------------------------------------------------------------------------

alter table public.work_reports enable row level security;

grant select, insert on public.work_reports to authenticated;
grant select, insert, update, delete on public.work_reports to service_role;

create policy work_reports_select_own
  on public.work_reports
  for select
  to authenticated
  using (
    student_id = (select auth.uid())
    and deleted_at is null
  );

create policy work_reports_select_admin
  on public.work_reports
  for select
  to authenticated
  using (
    (select private.is_admin())
    and deleted_at is null
  );

create policy work_reports_insert_own
  on public.work_reports
  for insert
  to authenticated
  with check (
    (select private.is_student())
    and student_id = (select auth.uid())
  );
