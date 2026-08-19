-- Per-student online exam assignments: table, RLS, student RPC updates, admin RPCs.

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------

create table public.online_exam_assignments (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.online_exams (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  assigned_at timestamptz not null default now(),
  assigned_by uuid references public.profiles (id) on delete set null,
  constraint online_exam_assignments_exam_student_unique unique (exam_id, student_id)
);

comment on table public.online_exam_assignments is 'Admin-assigned students allowed to see and take an online exam.';

create index online_exam_assignments_student_id_idx
  on public.online_exam_assignments (student_id);

create index online_exam_assignments_exam_id_idx
  on public.online_exam_assignments (exam_id);

-- Attempts must reference an assignment row. RESTRICT blocks assignment removal
-- while an attempt exists (including concurrent admin/student races). Profile
-- hard-delete cascades attempts before assignments via FK dependency order.
alter table public.online_exam_attempts
  add constraint online_exam_attempts_assignment_fkey
  foreign key (exam_id, student_id)
  references public.online_exam_assignments (exam_id, student_id)
  on delete restrict;

-- ---------------------------------------------------------------------------
-- DELETE guard (attempt exists → block removal)
-- ---------------------------------------------------------------------------

create or replace function private.guard_online_exam_assignment_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.online_exam_attempts att
    where att.exam_id = old.exam_id
      and att.student_id = old.student_id
    for update
  ) then
    raise exception 'cannot remove assignment: student has already started this exam';
  end if;

  return old;
end;
$$;

revoke all on function private.guard_online_exam_assignment_delete() from public;
grant execute on function private.guard_online_exam_assignment_delete() to authenticated, service_role;

create trigger online_exam_assignments_guard_delete
  before delete on public.online_exam_assignments
  for each row
  execute function private.guard_online_exam_assignment_delete();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.online_exam_assignments enable row level security;

grant select, insert, delete on public.online_exam_assignments to authenticated;
grant select, insert, delete on public.online_exam_assignments to service_role;

create policy online_exam_assignments_select_admin
  on public.online_exam_assignments
  for select
  to authenticated
  using ((select private.is_admin()));

create policy online_exam_assignments_insert_admin
  on public.online_exam_assignments
  for insert
  to authenticated
  with check ((select private.is_admin()));

create policy online_exam_assignments_delete_admin
  on public.online_exam_assignments
  for delete
  to authenticated
  using ((select private.is_admin()));

create policy online_exam_assignments_select_own
  on public.online_exam_assignments
  for select
  to authenticated
  using (student_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Student access: require assignment
-- ---------------------------------------------------------------------------

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
      and exists (
        select 1
        from public.online_exam_assignments asn
        where asn.exam_id = e.id
          and asn.student_id = (select auth.uid())
      )
  );
$$;

create or replace function public.list_student_online_exams()
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
  inner join public.online_exam_assignments asn
    on asn.exam_id = e.id
   and asn.student_id = (select auth.uid())
  left join public.online_exam_attempts a
    on a.exam_id = e.id
   and a.student_id = (select auth.uid())
  order by e.start_at desc;
$$;

create or replace function public.get_student_online_exam(p_exam_id uuid)
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
    and e.start_at <= now()
    and exists (
      select 1
      from public.online_exam_assignments asn
      where asn.exam_id = e.id
        and asn.student_id = (select auth.uid())
    );
$$;

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
  assignment_id uuid;
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

  select asn.id
  into assignment_id
  from public.online_exam_assignments asn
  where asn.exam_id = p_exam_id
    and asn.student_id = uid
  for update;

  if not found then
    raise exception 'exam not assigned';
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

-- ---------------------------------------------------------------------------
-- Admin RPCs
-- ---------------------------------------------------------------------------

create or replace function public.list_online_exam_assigned_students(p_exam_id uuid)
returns table (
  student_id uuid,
  first_name text,
  last_name text,
  phone text,
  assigned_at timestamptz,
  has_attempt boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if not (select private.is_admin()) then
    raise exception 'not authorized';
  end if;

  return query
  select
    p.id,
    p.first_name,
    p.last_name,
    p.phone,
    asn.assigned_at,
    (att.id is not null) as has_attempt
  from public.online_exam_assignments asn
  join public.profiles p on p.id = asn.student_id
  left join public.online_exam_attempts att
    on att.exam_id = asn.exam_id
   and att.student_id = asn.student_id
  where asn.exam_id = p_exam_id
  order by asn.assigned_at desc;
end;
$$;

create or replace function public.set_online_exam_assignments(
  p_exam_id uuid,
  p_student_ids uuid[]
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  invalid_count integer;
  removal_student_id uuid;
  inserted_count integer;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if not (select private.is_admin()) then
    raise exception 'not authorized';
  end if;

  if not exists (
    select 1
    from public.online_exams
    where id = p_exam_id
  ) then
    raise exception 'exam not found';
  end if;

  select count(*)
  into invalid_count
  from unnest(coalesce(p_student_ids, array[]::uuid[])) as sid
  where not exists (
    select 1
    from public.profiles p
    where p.id = sid
      and p.role = 'student'
  );

  if invalid_count > 0 then
    raise exception 'invalid student id in assignment list';
  end if;

  for removal_student_id in
    select asn.student_id
    from public.online_exam_assignments asn
    where asn.exam_id = p_exam_id
      and asn.student_id <> all (coalesce(p_student_ids, array[]::uuid[]))
    for update of asn
  loop
    if exists (
      select 1
      from public.online_exam_attempts att
      where att.exam_id = p_exam_id
        and att.student_id = removal_student_id
    ) then
      raise exception 'cannot remove assignment: student has already started this exam';
    end if;
  end loop;

  delete from public.online_exam_assignments asn
  where asn.exam_id = p_exam_id
    and asn.student_id <> all (coalesce(p_student_ids, array[]::uuid[]));

  insert into public.online_exam_assignments (exam_id, student_id, assigned_by)
  select p_exam_id, sid, auth.uid()
  from unnest(coalesce(p_student_ids, array[]::uuid[])) as sid
  on conflict (exam_id, student_id) do nothing;

  get diagnostics inserted_count = row_count;

  return inserted_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------

revoke all on function public.list_online_exam_assigned_students(uuid) from public;
revoke all on function public.set_online_exam_assignments(uuid, uuid[]) from public;

grant execute on function public.list_online_exam_assigned_students(uuid) to authenticated, service_role;
grant execute on function public.set_online_exam_assignments(uuid, uuid[]) to authenticated, service_role;

revoke execute on function public.list_online_exam_assigned_students(uuid) from anon;
revoke execute on function public.set_online_exam_assignments(uuid, uuid[]) from anon;
