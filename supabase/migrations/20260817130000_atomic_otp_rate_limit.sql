-- Atomically check OTP send rate limits and record the attempt in one transaction.
-- Serializes concurrent requests for the same purpose+phone via a transaction-scoped advisory lock.

create or replace function public.check_and_record_otp_attempt(
  p_purpose text,
  p_phone_digits text,
  p_client_ip inet,
  p_phone_limit int,
  p_phone_window_seconds int,
  p_ip_limit int,
  p_ip_window_seconds int
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phone_count int;
  v_ip_count int;
begin
  perform pg_advisory_xact_lock(hashtext(p_purpose || ':' || p_phone_digits));

  select count(*) into v_phone_count
  from otp_send_attempts
  where purpose = p_purpose
    and phone_digits = p_phone_digits
    and created_at >= now() - (p_phone_window_seconds || ' seconds')::interval;

  if v_phone_count >= p_phone_limit then
    return false;
  end if;

  if p_client_ip is not null then
    select count(*) into v_ip_count
    from otp_send_attempts
    where client_ip = p_client_ip
      and created_at >= now() - (p_ip_window_seconds || ' seconds')::interval;

    if v_ip_count >= p_ip_limit then
      return false;
    end if;
  end if;

  insert into otp_send_attempts (purpose, phone_digits, client_ip)
  values (p_purpose, p_phone_digits, p_client_ip);

  return true;
end;
$$;

revoke execute on function public.check_and_record_otp_attempt(text, text, inet, int, int, int, int)
  from public, anon, authenticated;

grant execute on function public.check_and_record_otp_attempt(text, text, inet, int, int, int, int)
  to service_role;
