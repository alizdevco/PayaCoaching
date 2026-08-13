-- Fix online_exam_attempts_insert_own: students cannot SELECT online_exams, so the
-- raw EXISTS subquery in WITH CHECK always evaluated to false. Use a SECURITY
-- DEFINER helper that reads online_exams as the function owner instead.

create or replace function private.student_can_start_exam(p_exam_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.online_exams e
    where e.id = p_exam_id
      and e.start_at <= now()
  );
$$;

revoke all on function private.student_can_start_exam(uuid) from public;
grant execute on function private.student_can_start_exam(uuid) to authenticated, service_role;

drop policy if exists online_exam_attempts_insert_own on public.online_exam_attempts;

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
    and (select private.student_can_start_exam(exam_id))
  );
