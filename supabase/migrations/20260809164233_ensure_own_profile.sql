-- Some phone OTP signups do not get a profiles row from on_auth_user_created.
-- This RPC lets the authenticated student create/backfill their own profile
-- before completing registration (RLS still governs all subsequent updates).

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

  select phone into user_phone from auth.users where id = uid;

  insert into public.profiles (id, phone, role)
  values (uid, user_phone, 'student')
  on conflict (id) do update
    set phone = coalesce(public.profiles.phone, excluded.phone);
end;
$$;

revoke all on function public.ensure_own_profile() from public;
grant execute on function public.ensure_own_profile() to authenticated;

-- Make the signup trigger idempotent in case it is retried.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, phone, role)
  values (new.id, new.phone, 'student')
  on conflict (id) do nothing;
  return new;
end;
$$;
