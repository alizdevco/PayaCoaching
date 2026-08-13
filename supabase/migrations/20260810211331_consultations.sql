-- consultations: full history of phone consultations an admin logs for a student.

create table public.consultations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  scheduled_at timestamptz not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.consultations is 'Full history of phone consultations an admin has logged for a student (past and upcoming).';
comment on column public.consultations.scheduled_at is 'Exact date and time of the consultation.';
comment on column public.consultations.notes is 'Optional admin note, e.g. the topic of the consultation.';

create index consultations_student_id_idx on public.consultations (student_id);

create index consultations_scheduled_at_idx on public.consultations (scheduled_at desc);

create trigger consultations_set_updated_at
  before update on public.consultations
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
--   student: reads own rows only
--   admin:   full CRUD (all rows)
-- ---------------------------------------------------------------------------

alter table public.consultations enable row level security;

grant select, insert, update, delete on public.consultations to authenticated;
grant select, insert, update, delete on public.consultations to service_role;

create policy consultations_select_own
  on public.consultations
  for select
  to authenticated
  using (student_id = (select auth.uid()));

create policy consultations_select_admin
  on public.consultations
  for select
  to authenticated
  using ((select private.is_admin()));

create policy consultations_insert_admin
  on public.consultations
  for insert
  to authenticated
  with check ((select private.is_admin()));

create policy consultations_update_admin
  on public.consultations
  for update
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy consultations_delete_admin
  on public.consultations
  for delete
  to authenticated
  using ((select private.is_admin()));
