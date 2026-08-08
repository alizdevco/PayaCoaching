-- RLS access tests: mock admin + two students, verify policy isolation.
-- Run against the local stack. Seeds are committed; assertions run inside a
-- rolled-back transaction so no test DML persists.

-- Fixed UUIDs for repeatable runs.
--   admin    = 11111111-1111-1111-1111-111111111111
--   studentA = 22222222-2222-2222-2222-222222222222
--   studentB = 33333333-3333-3333-3333-333333333333

-- Clean any previous run (cascades to profiles/contents).
delete from auth.users where id in (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333'
);

-- Create auth users; handle_new_user trigger auto-inserts profiles as student.
insert into auth.users (id, aud, role, phone) values
  ('11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', '+989120000001'),
  ('22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', '+989120000002'),
  ('33333333-3333-3333-3333-333333333333', 'authenticated', 'authenticated', '+989120000003');

-- Promote the admin (runs as postgres, so the role-change guard allows it).
update public.profiles set role = 'admin'
  where id = '11111111-1111-1111-1111-111111111111';

-- Seed content: A active, A soft-deleted, B active. Uploaded by admin.
insert into public.student_contents
  (student_id, title, file_type, file_path, mime_type, file_size, uploaded_by, deleted_at)
values
  ('22222222-2222-2222-2222-222222222222', 'A active', 'pdf',
   'students/A/1.pdf', 'application/pdf', 1000,
   '11111111-1111-1111-1111-111111111111', null),
  ('22222222-2222-2222-2222-222222222222', 'A deleted', 'pdf',
   'students/A/2.pdf', 'application/pdf', 1000,
   '11111111-1111-1111-1111-111111111111', now()),
  ('33333333-3333-3333-3333-333333333333', 'B active', 'pdf',
   'students/B/1.pdf', 'application/pdf', 1000,
   '11111111-1111-1111-1111-111111111111', null);

-- Seed exam analyses: one published, one draft.
insert into public.exam_analyses
  (exam_date, title, content, is_published, created_by, published_at)
values
  ('2026-01-01', 'Published', 'body', true,
   '11111111-1111-1111-1111-111111111111', now()),
  ('2026-02-01', 'Draft', 'body', false,
   '11111111-1111-1111-1111-111111111111', null);

-- ---------------------------------------------------------------------------
-- Assertions (rolled back at the end)
-- ---------------------------------------------------------------------------

begin;

do $$
declare
  a_id text := '22222222-2222-2222-2222-222222222222';
  b_id text := '33333333-3333-3333-3333-333333333333';
  admin_id text := '11111111-1111-1111-1111-111111111111';
  c int;
  ok boolean;
begin
  -- helper to impersonate
  -- profiles: student A sees only own row
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', a_id, 'role', 'authenticated')::text, true);
  select count(*) into c from public.profiles;
  raise notice '[%] profiles: studentA sees own only (want 1) -> %', case when c = 1 then 'PASS' else 'FAIL' end, c;

  -- profiles: student A cannot read B
  select count(*) into c from public.profiles where id = b_id::uuid;
  raise notice '[%] profiles: studentA cannot read studentB (want 0) -> %', case when c = 0 then 'PASS' else 'FAIL' end, c;
  perform set_config('role', 'postgres', true);

  -- profiles: admin sees all three
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', admin_id, 'role', 'authenticated')::text, true);
  select count(*) into c from public.profiles;
  raise notice '[%] profiles: admin sees all (want 3) -> %', case when c = 3 then 'PASS' else 'FAIL' end, c;
  perform set_config('role', 'postgres', true);

  -- student_contents: student A sees only own active row
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', a_id, 'role', 'authenticated')::text, true);
  select count(*) into c from public.student_contents;
  raise notice '[%] contents: studentA sees own active only (want 1) -> %', case when c = 1 then 'PASS' else 'FAIL' end, c;
  select count(*) into c from public.student_contents where student_id <> a_id::uuid or deleted_at is not null;
  raise notice '[%] contents: studentA sees no others/deleted (want 0) -> %', case when c = 0 then 'PASS' else 'FAIL' end, c;
  perform set_config('role', 'postgres', true);

  -- student_contents: student B sees only own active row
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', b_id, 'role', 'authenticated')::text, true);
  select count(*) into c from public.student_contents;
  raise notice '[%] contents: studentB sees own active only (want 1) -> %', case when c = 1 then 'PASS' else 'FAIL' end, c;
  perform set_config('role', 'postgres', true);

  -- student_contents: admin sees all three (incl deleted)
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', admin_id, 'role', 'authenticated')::text, true);
  select count(*) into c from public.student_contents;
  raise notice '[%] contents: admin sees all incl deleted (want 3) -> %', case when c = 3 then 'PASS' else 'FAIL' end, c;
  perform set_config('role', 'postgres', true);

  -- student_contents: student cannot insert
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', a_id, 'role', 'authenticated')::text, true);
  ok := true;
  begin
    insert into public.student_contents
      (student_id, title, file_type, file_path, mime_type, file_size, uploaded_by)
    values (a_id::uuid, 'hack', 'pdf', 'x', 'application/pdf', 1, admin_id::uuid);
    ok := false; -- should not reach
  exception when insufficient_privilege or others then
    ok := true;
  end;
  raise notice '[%] contents: studentA insert blocked -> %', case when ok then 'PASS' else 'FAIL' end, ok;
  perform set_config('role', 'postgres', true);

  -- student_contents: admin can insert
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', admin_id, 'role', 'authenticated')::text, true);
  ok := true;
  begin
    insert into public.student_contents
      (student_id, title, file_type, file_path, mime_type, file_size, uploaded_by)
    values (a_id::uuid, 'admin upload', 'pdf', 'y', 'application/pdf', 1, admin_id::uuid);
  exception when others then
    ok := false;
  end;
  raise notice '[%] contents: admin insert allowed -> %', case when ok then 'PASS' else 'FAIL' end, ok;
  perform set_config('role', 'postgres', true);

  -- profiles: student can update own name but not role
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', a_id, 'role', 'authenticated')::text, true);
  update public.profiles set first_name = 'Ali' where id = a_id::uuid;
  raise notice '[PASS] profiles: studentA updated own first_name';
  ok := true;
  begin
    update public.profiles set role = 'admin' where id = a_id::uuid;
    ok := false; -- guard should raise
  exception when others then
    ok := true;
  end;
  raise notice '[%] profiles: studentA role escalation blocked -> %', case when ok then 'PASS' else 'FAIL' end, ok;
  perform set_config('role', 'postgres', true);

  -- exam_analyses: anon reads published only
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  select count(*) into c from public.exam_analyses;
  raise notice '[%] exams: anon sees published only (want 1) -> %', case when c = 1 then 'PASS' else 'FAIL' end, c;
  perform set_config('role', 'postgres', true);

  -- exam_analyses: student reads published only
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', a_id, 'role', 'authenticated')::text, true);
  select count(*) into c from public.exam_analyses;
  raise notice '[%] exams: studentA sees published only (want 1) -> %', case when c = 1 then 'PASS' else 'FAIL' end, c;
  perform set_config('role', 'postgres', true);

  -- exam_analyses: admin reads all incl draft
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', admin_id, 'role', 'authenticated')::text, true);
  select count(*) into c from public.exam_analyses;
  raise notice '[%] exams: admin sees all incl draft (want 2) -> %', case when c = 2 then 'PASS' else 'FAIL' end, c;
  perform set_config('role', 'postgres', true);

  -- exam_analyses: student cannot insert
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', a_id, 'role', 'authenticated')::text, true);
  ok := true;
  begin
    insert into public.exam_analyses (exam_date, title, content, is_published, created_by)
    values ('2026-03-01', 't', 'b', false, a_id::uuid);
    ok := false;
  exception when others then
    ok := true;
  end;
  raise notice '[%] exams: studentA insert blocked -> %', case when ok then 'PASS' else 'FAIL' end, ok;
  perform set_config('role', 'postgres', true);
end $$;

rollback;

-- Cleanup: remove content first (uploaded_by is ON DELETE RESTRICT), then users.
delete from public.student_contents
  where uploaded_by = '11111111-1111-1111-1111-111111111111';
delete from public.exam_analyses
  where created_by = '11111111-1111-1111-1111-111111111111';
delete from auth.users where id in (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333'
);
