-- student_contents: add 'report' file type and a report_date for dated daily work reports.
-- Reuses the existing table so student report history joins the same
-- RLS-gated query students already use for their other content.

alter table public.student_contents
  add column report_date date;

comment on column public.student_contents.report_date is 'Date the work report covers (e.g. Farvardin 1st); only set when file_type = report.';

alter table public.student_contents
  drop constraint student_contents_file_type_check;

alter table public.student_contents
  add constraint student_contents_file_type_check
    check (file_type in ('video', 'pdf', 'image', 'report'));

alter table public.student_contents
  add constraint student_contents_report_date_only_for_reports check (
    report_date is null or file_type = 'report'
  );

-- Lets the student/admin report list sort newest-first without a full scan.
create index student_contents_report_date_idx
  on public.student_contents (student_id, report_date desc)
  where file_type = 'report' and deleted_at is null;
