-- Server-side exam start: started_at is set with now() inside a SECURITY DEFINER RPC.
-- Students can no longer supply or update started_at from the client.

create or replace function public.start_online_exam_attempt(p_exam_id uuid)
returns public.online_exam_attempts
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  exam_row public.online_exams;
  attempt_row public.online_exam_attempts;
  window_end timestamptz;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  if not (select private.is_student()) then
    raise exception 'not authorized';
  end if;

  select *
  into exam_row
  from public.online_exams
  where id = p_exam_id;

  if not found then
    raise exception 'exam not found';
  end if;

  if exam_row.start_at > now() then
    raise exception 'exam has not started yet';
  end if;

  window_end := exam_row.start_at + (exam_row.duration_minutes * interval '1 minute');

  insert into public.online_exam_attempts (exam_id, student_id)
  values (p_exam_id, uid)
  on conflict (exam_id, student_id) do nothing;

  select *
  into attempt_row
  from public.online_exam_attempts
  where exam_id = p_exam_id
    and student_id = uid
  for update;

  if not found then
    raise exception 'could not create or load attempt';
  end if;

  if attempt_row.status = 'finalized' then
    return attempt_row;
  end if;

  if attempt_row.started_at is not null then
    return attempt_row;
  end if;

  if now() >= window_end then
    raise exception 'exam window has expired';
  end if;

  perform set_config('app.online_exam_starting', 'true', true);

  update public.online_exam_attempts
  set started_at = now()
  where id = attempt_row.id
    and started_at is null
  returning * into attempt_row;

  return attempt_row;
end;
$$;

revoke all on function public.start_online_exam_attempt(uuid) from public;
grant execute on function public.start_online_exam_attempt(uuid) to authenticated, service_role;

-- Block client-controlled started_at on UPDATE (only RPC / admin may set it).
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

  if new.started_at is distinct from old.started_at
     and current_setting('app.online_exam_starting', true) <> 'true' then
    raise exception 'started_at cannot be changed directly';
  end if;

  if old.status <> 'in_progress' and new.answers is distinct from old.answers then
    raise exception 'answers cannot be changed after finalization';
  end if;

  return new;
end;
$$;
