-- ensure_own_profile must not recreate a profile when auth.users is gone
-- (e.g. after admin deleteUser). FK would also block INSERT; this fails clearly.

create or replace function public.ensure_own_profile()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  user_phone text;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  if not exists (
    select 1 from auth.users where id = uid
  ) then
    raise exception 'user account no longer exists';
  end if;

  select phone into user_phone from auth.users where id = uid;

  insert into public.profiles (id, phone, role)
  values (uid, user_phone, 'student')
  on conflict (id) do update
    set phone = coalesce(public.profiles.phone, excluded.phone);
end;
$$;
