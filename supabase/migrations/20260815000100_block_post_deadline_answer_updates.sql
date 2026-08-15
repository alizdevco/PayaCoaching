-- Block student answer edits after their personal exam deadline while the
-- attempt is still in_progress.

create or replace function private.guard_online_exam_attempt_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  duration_minutes integer;
  deadline timestamptz;
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

  if new.started_at is distinct from old.started_at
     and current_setting('app.online_exam_starting', true) <> 'true' then
    raise exception 'started_at cannot be changed directly';
  end if;

  if old.status <> 'in_progress' and new.answers is distinct from old.answers then
    raise exception 'answers cannot be changed after finalization';
  end if;

  if new.answers is distinct from old.answers
     and old.started_at is not null
  then
    select e.duration_minutes
    into duration_minutes
    from public.online_exams e
    where e.id = old.exam_id;

    if not found then
      raise exception 'exam not found';
    end if;

    deadline := old.started_at + (duration_minutes * interval '1 minute');

    if now() >= deadline then
      raise exception 'answers cannot be changed after the exam deadline';
    end if;
  end if;

  return new;
end;
$$;
