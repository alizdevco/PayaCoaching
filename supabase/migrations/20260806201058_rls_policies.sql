-- Row Level Security for all application tables.
-- RLS is enabled here and never disabled. Authorization reads role from
-- public.profiles via private.is_admin() / private.is_student(), never from
-- client-editable JWT metadata.

-- ---------------------------------------------------------------------------
-- Enable RLS
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.student_contents enable row level security;
alter table public.exam_analyses enable row level security;

-- ---------------------------------------------------------------------------
-- Table privileges for the API roles.
-- RLS gates rows; roles still need table-level DML grants. These are explicit
-- (not relying on default privileges) so behavior is deterministic locally and
-- on remote. Row visibility is always constrained by the policies below.
-- ---------------------------------------------------------------------------

-- profiles: students update own row, admins read all. No client inserts/deletes
-- (rows are created by the handle_new_user trigger).
grant select, update on public.profiles to authenticated;

-- student_contents: admin full CRUD, student read (all gated by RLS).
grant select, insert, update, delete on public.student_contents to authenticated;

-- exam_analyses: public read of published rows; admin CRUD (gated by RLS).
grant select on public.exam_analyses to anon, authenticated;
grant insert, update, delete on public.exam_analyses to authenticated;

-- service_role (Edge Functions) bypasses RLS but still needs table grants.
grant select, insert, update, delete
  on public.profiles, public.student_contents, public.exam_analyses
  to service_role;

-- ---------------------------------------------------------------------------
-- profiles
--   student: reads and updates own row (cannot change role)
--   admin:   reads all rows
-- ---------------------------------------------------------------------------

create policy profiles_select_own
  on public.profiles
  for select
  to authenticated
  using (id = (select auth.uid()));

create policy profiles_select_admin
  on public.profiles
  for select
  to authenticated
  using ((select private.is_admin()));

create policy profiles_update_own
  on public.profiles
  for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Defense in depth: a student updating their own row must not be able to
-- escalate their role. RLS WITH CHECK cannot compare against the old row, so
-- a trigger guards role changes. Admins and backend/service contexts
-- (auth.uid() is null) are allowed through.
create or replace function private.prevent_profile_role_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role is distinct from old.role
     and (select auth.uid()) is not null
     and not (select private.is_admin())
  then
    raise exception 'role can only be changed by an admin';
  end if;
  return new;
end;
$$;

revoke all on function private.prevent_profile_role_change() from public;
grant execute on function private.prevent_profile_role_change() to authenticated, service_role;

create trigger profiles_prevent_role_change
  before update of role on public.profiles
  for each row
  execute function private.prevent_profile_role_change();

-- ---------------------------------------------------------------------------
-- student_contents
--   student: reads own active content (deleted_at is null)
--   admin:   full CRUD
-- ---------------------------------------------------------------------------

create policy student_contents_select_own
  on public.student_contents
  for select
  to authenticated
  using (
    student_id = (select auth.uid())
    and deleted_at is null
  );

create policy student_contents_select_admin
  on public.student_contents
  for select
  to authenticated
  using ((select private.is_admin()));

create policy student_contents_insert_admin
  on public.student_contents
  for insert
  to authenticated
  with check ((select private.is_admin()));

create policy student_contents_update_admin
  on public.student_contents
  for update
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy student_contents_delete_admin
  on public.student_contents
  for delete
  to authenticated
  using ((select private.is_admin()));

-- ---------------------------------------------------------------------------
-- exam_analyses
--   anon + student: read published rows only
--   admin:          full CRUD (and can read unpublished drafts)
-- ---------------------------------------------------------------------------

create policy exam_analyses_select_published
  on public.exam_analyses
  for select
  to anon, authenticated
  using (is_published = true);

create policy exam_analyses_select_admin
  on public.exam_analyses
  for select
  to authenticated
  using ((select private.is_admin()));

create policy exam_analyses_insert_admin
  on public.exam_analyses
  for insert
  to authenticated
  with check ((select private.is_admin()));

create policy exam_analyses_update_admin
  on public.exam_analyses
  for update
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy exam_analyses_delete_admin
  on public.exam_analyses
  for delete
  to authenticated
  using ((select private.is_admin()));
