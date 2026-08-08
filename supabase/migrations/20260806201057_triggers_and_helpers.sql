-- Shared triggers and RLS helper functions in a non-exposed schema.

create schema if not exists private;

revoke all on schema private from public;
grant usage on schema private to postgres, service_role, authenticated;

-- ---------------------------------------------------------------------------
-- RLS helpers (SECURITY DEFINER — read role from profiles, not JWT metadata)
-- ---------------------------------------------------------------------------

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function private.is_student()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'student'
  );
$$;

revoke all on function private.is_admin() from public;
revoke all on function private.is_student() from public;
grant execute on function private.is_admin() to authenticated, service_role;
grant execute on function private.is_student() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

create trigger student_contents_set_updated_at
  before update on public.student_contents
  for each row
  execute function public.set_updated_at();

create trigger exam_analyses_set_updated_at
  before update on public.exam_analyses
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Auto-create profile when auth.users row is inserted
-- ---------------------------------------------------------------------------

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, phone, role)
  values (new.id, new.phone, 'student');
  return new;
end;
$$;

revoke all on function private.handle_new_user() from public;
grant execute on function private.handle_new_user() to service_role;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function private.handle_new_user();

-- ---------------------------------------------------------------------------
-- student_contents: student_id must be student, uploaded_by must be admin
-- ---------------------------------------------------------------------------

create or replace function private.validate_student_content_roles()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  student_role text;
  uploader_role text;
begin
  select role into student_role
  from public.profiles
  where id = new.student_id;

  if student_role is distinct from 'student' then
    raise exception 'student_id must reference a profile with role student';
  end if;

  select role into uploader_role
  from public.profiles
  where id = new.uploaded_by;

  if uploader_role is distinct from 'admin' then
    raise exception 'uploaded_by must reference a profile with role admin';
  end if;

  return new;
end;
$$;

revoke all on function private.validate_student_content_roles() from public;
grant execute on function private.validate_student_content_roles() to authenticated, service_role;

create trigger student_contents_validate_roles
  before insert or update of student_id, uploaded_by on public.student_contents
  for each row
  execute function private.validate_student_content_roles();
