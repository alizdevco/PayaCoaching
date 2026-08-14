-- SECURITY DEFINER lookup for password reset: completed student profile only (anon cannot SELECT profiles).
create or replace function public.student_can_reset_password(lookup_phone text)
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
      and p.role = 'student'
      and p.profile_completed_at is not null
  );
$$;

revoke all on function public.student_can_reset_password(text) from public;
grant execute on function public.student_can_reset_password(text) to anon, authenticated;
