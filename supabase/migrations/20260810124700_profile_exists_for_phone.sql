-- Normalize phone digits for comparison (989123456789 from any common input format).
create or replace function private.normalize_phone_digits(raw text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when length(d) = 11 and d like '09%' then '98' || substring(d from 2)
    when length(d) = 12 and d like '98%' then d
    when length(d) = 10 and d like '9%' then '98' || d
    else d
  end
  from (
    select regexp_replace(coalesce(raw, ''), '\D', '', 'g') as d
  ) s;
$$;

revoke all on function private.normalize_phone_digits(text) from public;

-- SECURITY DEFINER lookup for pre-registration duplicate check (anon cannot SELECT profiles).
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
  );
$$;

revoke all on function public.profile_exists_for_phone(text) from public;
grant execute on function public.profile_exists_for_phone(text) to anon, authenticated;
