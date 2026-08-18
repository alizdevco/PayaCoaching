-- Server-side lookup: auth.users row for a phone (incomplete OTP signups).
-- Used by request-registration-otp to set shouldCreateUser correctly on retry.

create or replace function public.auth_user_exists_for_phone(lookup_phone text)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users u
    where u.phone is not null
      and private.normalize_phone_digits(u.phone) = private.normalize_phone_digits(lookup_phone)
      and private.normalize_phone_digits(lookup_phone) <> ''
  );
$$;

revoke all on function public.auth_user_exists_for_phone(text) from public;
grant execute on function public.auth_user_exists_for_phone(text) to service_role;
