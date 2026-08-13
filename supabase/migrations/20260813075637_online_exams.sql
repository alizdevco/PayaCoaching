-- online_exams + online_exam_attempts: timed PDF exams with auto-scored attempts.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.online_exams (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  start_at timestamptz not null,
  duration_minutes integer not null,
  pdf_file_path text,
  answer_key jsonb not null,
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint online_exams_title_not_blank check (length(trim(title)) > 0),
  constraint online_exams_duration_positive check (duration_minutes > 0)
);

comment on table public.online_exams is 'Admin-created timed online exams; answer_key is hidden from students via RPC-only reads.';
comment on column public.online_exams.pdf_file_path is 'Private storage object key for the exam PDF.';
comment on column public.online_exams.answer_key is 'JSON map of question number (string key) to correct option (1–4), e.g. {"1":2,"150":4}.';

create table public.online_exam_attempts (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.online_exams (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  started_at timestamptz,
  status text not null default 'in_progress',
  answers jsonb not null default '{}'::jsonb,
  raw_score numeric,
  percentage numeric,
  finalized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint online_exam_attempts_exam_student_unique unique (exam_id, student_id),
  constraint online_exam_attempts_status_check
    check (status in ('in_progress', 'finalized')),
  constraint online_exam_attempts_finalized_fields_check check (
    (
      status = 'finalized'
      and raw_score is not null
      and percentage is not null
      and finalized_at is not null
    )
    or (
      status = 'in_progress'
      and raw_score is null
      and percentage is null
      and finalized_at is null
    )
  )
);

comment on table public.online_exam_attempts is 'One attempt per student per exam; timer starts when the student downloads the PDF.';
comment on column public.online_exam_attempts.started_at is 'Set once when the student first downloads the exam PDF.';
comment on column public.online_exam_attempts.answers is 'JSON map of question number (string key) to selected option (1–4).';

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index online_exams_start_at_idx on public.online_exams (start_at desc);

create index online_exams_created_by_idx on public.online_exams (created_by);

create index online_exam_attempts_exam_id_idx on public.online_exam_attempts (exam_id);

create index online_exam_attempts_student_id_idx on public.online_exam_attempts (student_id);

create index online_exam_attempts_status_idx
  on public.online_exam_attempts (exam_id, status)
  where status = 'in_progress';

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------

create trigger online_exams_set_updated_at
  before update on public.online_exams
  for each row
  execute function public.set_updated_at();

create trigger online_exam_attempts_set_updated_at
  before update on public.online_exam_attempts
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Scoring helper (private)
-- ---------------------------------------------------------------------------

create or replace function private.score_online_exam_answers(
  p_answer_key jsonb,
  p_answers jsonb
)
returns numeric
language plpgsql
immutable
set search_path = ''
as $$
declare
  question_num integer;
  student_answer integer;
  correct_answer integer;
  total_score numeric := 0;
begin
  for question_num in 1..150 loop
    student_answer := null;
    correct_answer := (p_answer_key ->> question_num::text)::integer;

    if p_answers ? question_num::text then
      student_answer := nullif(trim(p_answers ->> question_num::text), '')::integer;
    end if;

    if student_answer is null then
      continue;
    elsif student_answer = correct_answer then
      total_score := total_score + 1;
    else
      total_score := total_score - (1::numeric / 3);
    end if;
  end loop;

  return total_score;
end;
$$;

revoke all on function private.score_online_exam_answers(jsonb, jsonb) from public;
grant execute on function private.score_online_exam_answers(jsonb, jsonb) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Attempt update guard (one trigger)
-- ---------------------------------------------------------------------------

create or replace function private.guard_online_exam_attempt_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if current_setting('app.online_exam_finalizing', true) = 'true' then
    return new;
  end if;

  if (select private.is_admin()) then
    return new;
  end if;

  if new.exam_id is distinct from old.exam_id then
    raise exception 'exam_id cannot be changed';
  end if;

  if new.student_id is distinct from old.student_id then
    raise exception 'student_id cannot be changed';
  end if;

  if new.status is distinct from old.status then
    raise exception 'status cannot be changed directly';
  end if;

  if new.finalized_at is distinct from old.finalized_at then
    raise exception 'finalized_at cannot be changed directly';
  end if;

  if new.raw_score is distinct from old.raw_score then
    raise exception 'raw_score cannot be changed directly';
  end if;

  if new.percentage is distinct from old.percentage then
    raise exception 'percentage cannot be changed directly';
  end if;

  if old.started_at is not null and new.started_at is distinct from old.started_at then
    raise exception 'started_at cannot be changed once set';
  end if;

  if old.status <> 'in_progress' and new.answers is distinct from old.answers then
    raise exception 'answers cannot be changed after finalization';
  end if;

  return new;
end;
$$;

revoke all on function private.guard_online_exam_attempt_update() from public;
grant execute on function private.guard_online_exam_attempt_update() to authenticated, service_role;

create trigger online_exam_attempts_guard_update
  before update on public.online_exam_attempts
  for each row
  execute function private.guard_online_exam_attempt_update();

-- ---------------------------------------------------------------------------
-- RPCs (SECURITY DEFINER)
-- ---------------------------------------------------------------------------

create or replace function public.list_student_online_exams()
returns table (
  id uuid,
  title text,
  start_at timestamptz,
  duration_minutes integer,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    e.id,
    e.title,
    e.start_at,
    e.duration_minutes,
    e.created_at,
    e.updated_at
  from public.online_exams e
  where e.start_at <= now()
  order by e.start_at desc;
$$;

create or replace function public.get_student_online_exam(p_exam_id uuid)
returns table (
  id uuid,
  title text,
  start_at timestamptz,
  duration_minutes integer,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    e.id,
    e.title,
    e.start_at,
    e.duration_minutes,
    e.created_at,
    e.updated_at
  from public.online_exams e
  where e.id = p_exam_id
    and e.start_at <= now();
$$;

create or replace function public.finalize_online_exam_attempt(
  p_attempt_id uuid,
  p_force boolean default false
)
returns public.online_exam_attempts
language plpgsql
security definer
set search_path = ''
as $$
declare
  attempt_row public.online_exam_attempts;
  exam_row public.online_exams;
  computed_score numeric;
  deadline timestamptz;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select *
  into attempt_row
  from public.online_exam_attempts
  where id = p_attempt_id
  for update;

  if not found then
    raise exception 'attempt not found';
  end if;

  if attempt_row.student_id <> auth.uid()
     and not (select private.is_admin())
  then
    raise exception 'not authorized';
  end if;

  if attempt_row.status = 'finalized' then
    return attempt_row;
  end if;

  select *
  into exam_row
  from public.online_exams
  where id = attempt_row.exam_id;

  if not found then
    raise exception 'exam not found';
  end if;

  if not p_force then
    if attempt_row.started_at is null then
      return attempt_row;
    end if;

    deadline := attempt_row.started_at + (exam_row.duration_minutes * interval '1 minute');

    if now() < deadline then
      return attempt_row;
    end if;
  end if;

  computed_score := private.score_online_exam_answers(exam_row.answer_key, attempt_row.answers);

  perform set_config('app.online_exam_finalizing', 'true', true);

  update public.online_exam_attempts
  set
    status = 'finalized',
    raw_score = computed_score,
    percentage = (computed_score / 150) * 100,
    finalized_at = now()
  where id = p_attempt_id
  returning * into attempt_row;

  return attempt_row;
end;
$$;

create or replace function public.finalize_due_online_exam_attempts(p_exam_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  attempt_row public.online_exam_attempts;
  finalized_count integer := 0;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if not (select private.is_admin()) then
    raise exception 'not authorized';
  end if;

  for attempt_row in
    select a.*
    from public.online_exam_attempts a
    join public.online_exams e on e.id = a.exam_id
    where a.exam_id = p_exam_id
      and a.status = 'in_progress'
      and a.started_at is not null
      and now() >= a.started_at + (e.duration_minutes * interval '1 minute')
    for update of a
  loop
    perform public.finalize_online_exam_attempt(attempt_row.id, false);
    finalized_count := finalized_count + 1;
  end loop;

  return finalized_count;
end;
$$;

revoke all on function public.list_student_online_exams() from public;
revoke all on function public.get_student_online_exam(uuid) from public;
revoke all on function public.finalize_online_exam_attempt(uuid, boolean) from public;
revoke all on function public.finalize_due_online_exam_attempts(uuid) from public;

grant execute on function public.list_student_online_exams() to authenticated, service_role;
grant execute on function public.get_student_online_exam(uuid) to authenticated, service_role;
grant execute on function public.finalize_online_exam_attempt(uuid, boolean) to authenticated, service_role;
grant execute on function public.finalize_due_online_exam_attempts(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- RLS
--   online_exams: admin-only (students use RPCs; no direct SELECT policy)
--   online_exam_attempts: student own rows; admin full access
-- ---------------------------------------------------------------------------

alter table public.online_exams enable row level security;
alter table public.online_exam_attempts enable row level security;

grant select, insert, update, delete on public.online_exams to authenticated;
grant select, insert, update, delete on public.online_exam_attempts to authenticated;
grant select, insert, update, delete on public.online_exams to service_role;
grant select, insert, update, delete on public.online_exam_attempts to service_role;

-- online_exams (admin only)

create policy online_exams_select_admin
  on public.online_exams
  for select
  to authenticated
  using ((select private.is_admin()));

create policy online_exams_insert_admin
  on public.online_exams
  for insert
  to authenticated
  with check ((select private.is_admin()));

create policy online_exams_update_admin
  on public.online_exams
  for update
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy online_exams_delete_admin
  on public.online_exams
  for delete
  to authenticated
  using ((select private.is_admin()));

-- online_exam_attempts (student own + admin full)

create policy online_exam_attempts_select_own
  on public.online_exam_attempts
  for select
  to authenticated
  using (student_id = (select auth.uid()));

create policy online_exam_attempts_select_admin
  on public.online_exam_attempts
  for select
  to authenticated
  using ((select private.is_admin()));

create policy online_exam_attempts_insert_own
  on public.online_exam_attempts
  for insert
  to authenticated
  with check (
    student_id = (select auth.uid())
    and status = 'in_progress'
    and started_at is null
    and raw_score is null
    and percentage is null
    and finalized_at is null
    and exists (
      select 1
      from public.online_exams e
      where e.id = exam_id
        and e.start_at <= now()
    )
  );

create policy online_exam_attempts_insert_admin
  on public.online_exam_attempts
  for insert
  to authenticated
  with check ((select private.is_admin()));

create policy online_exam_attempts_update_own
  on public.online_exam_attempts
  for update
  to authenticated
  using (student_id = (select auth.uid()))
  with check (student_id = (select auth.uid()));

create policy online_exam_attempts_update_admin
  on public.online_exam_attempts
  for update
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy online_exam_attempts_delete_admin
  on public.online_exam_attempts
  for delete
  to authenticated
  using ((select private.is_admin()));
