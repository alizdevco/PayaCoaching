-- list_student_online_exams: return all exams with per-student status (including upcoming).

drop function if exists public.list_student_online_exams();

create function public.list_student_online_exams()
returns table (
  id uuid,
  title text,
  start_at timestamptz,
  duration_minutes integer,
  question_count integer,
  created_at timestamptz,
  updated_at timestamptz,
  status text,
  percentage numeric
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
    e.updated_at,
    case
      when e.start_at > now() then 'upcoming'
      when a.status = 'finalized' then 'finished'
      when now() >= e.start_at + (e.duration_minutes * interval '1 minute') then 'finished'
      when a.id is not null and a.status <> 'finalized' then 'in_progress'
      else 'open'
    end as status,
    case when a.status = 'finalized' then a.percentage else null end as percentage
  from public.online_exams e
  left join public.online_exam_attempts a
    on a.exam_id = e.id
   and a.student_id = (select auth.uid())
  order by e.start_at desc;
$$;

revoke all on function public.list_student_online_exams() from public;
grant execute on function public.list_student_online_exams() to authenticated, service_role;
