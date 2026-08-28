-- Global SMS send quota: cap total OTP attempts across all phones/IPs in a rolling window.

create or replace function public.check_global_sms_quota(
  p_limit int,
  p_window_seconds int
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  select count(*) into v_count
  from otp_send_attempts
  where created_at > now() - (p_window_seconds || ' seconds')::interval;

  return v_count < p_limit;
end;
$$;

revoke execute on function public.check_global_sms_quota(int, int)
  from public, anon, authenticated;

grant execute on function public.check_global_sms_quota(int, int)
  to service_role;
