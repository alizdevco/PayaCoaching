-- Defer student profile creation until registration completes (OTP + profile form).
-- signInWithOtp creates auth.users at Step 1; the old trigger inserted profiles.phone
-- immediately, causing false "already registered" blocks on abandoned signups.

-- Only fully completed registrations count as duplicate phone numbers.
create or replace function public.profile_exists_for_phone(lookup_phone text)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.phone is not null
      and private.normalize_phone_digits(p.phone) = private.normalize_phone_digits(lookup_phone)
      and private.normalize_phone_digits(lookup_phone) <> ''
      and p.profile_completed_at is not null
  );
$$;

-- Phone-only OTP signups: profile is created by ensure_own_profile() after Step 3.
-- Email-based users (e.g. admins) still get a profile from this trigger.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.phone is not null and coalesce(new.email, '') = '' then
    return new;
  end if;

  insert into public.profiles (id, phone, role)
  values (new.id, new.phone, 'student')
  on conflict (id) do nothing;
  return new;
end;
$$;
