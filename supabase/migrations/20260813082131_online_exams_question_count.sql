-- Add flexible question_count to online exams (1–150).

alter table public.online_exams
  add column question_count integer not null default 150;

alter table public.online_exams
  add constraint online_exams_question_count_range
  check (question_count >= 1 and question_count <= 150);

comment on column public.online_exams.question_count is 'Number of scored questions (1–150); answer key and scoring use questions 1..question_count only.';

-- Scoring helper: only score questions 1..p_question_count
create or replace function private.score_online_exam_answers(
  p_answer_key jsonb,
  p_answers jsonb,
  p_question_count integer
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
  for question_num in 1..p_question_count loop
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

revoke all on function private.score_online_exam_answers(jsonb, jsonb, integer) from public;
grant execute on function private.score_online_exam_answers(jsonb, jsonb, integer) to authenticated, service_role;

-- Drop old 2-arg overload if present
drop function if exists private.score_online_exam_answers(jsonb, jsonb);

-- Student RPCs: return type changes require drop + recreate
drop function if exists public.list_student_online_exams();
drop function if exists public.get_student_online_exam(uuid);

create function public.list_student_online_exams()
returns table (
  id uuid,
  title text,
  start_at timestamptz,
  duration_minutes integer,
  question_count integer,
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
    e.question_count,
    e.created_at,
    e.updated_at
  from public.online_exams e
  where e.start_at <= now()
  order by e.start_at desc;
$$;

create function public.get_student_online_exam(p_exam_id uuid)
returns table (
  id uuid,
  title text,
  start_at timestamptz,
  duration_minutes integer,
  question_count integer,
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
    e.question_count,
    e.created_at,
    e.updated_at
  from public.online_exams e
  where e.id = p_exam_id
    and e.start_at <= now();
$$;

revoke all on function public.list_student_online_exams() from public;
revoke all on function public.get_student_online_exam(uuid) from public;
grant execute on function public.list_student_online_exams() to authenticated, service_role;
grant execute on function public.get_student_online_exam(uuid) to authenticated, service_role;

-- Finalize: use question_count as percentage denominator
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

  computed_score := private.score_online_exam_answers(
    exam_row.answer_key,
    attempt_row.answers,
    exam_row.question_count
  );

  perform set_config('app.online_exam_finalizing', 'true', true);

  update public.online_exam_attempts
  set
    status = 'finalized',
    raw_score = computed_score,
    percentage = (computed_score / exam_row.question_count) * 100,
    finalized_at = now()
  where id = p_attempt_id
  returning * into attempt_row;

  return attempt_row;
end;
$$;
