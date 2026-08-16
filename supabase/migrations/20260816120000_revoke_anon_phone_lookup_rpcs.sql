-- Close phone enumeration: profile lookup RPCs are server-side only (Edge Functions).
-- Rate-limit table for unauthenticated OTP request endpoints.

create table public.otp_send_attempts (
  id bigint generated always as identity primary key,
  purpose text not null check (purpose in ('registration', 'password_reset')),
  phone_digits text not null,
  client_ip inet,
  created_at timestamptz not null default now()
);

comment on table public.otp_send_attempts is
  'Tracks OTP send requests for rate limiting (registration / password reset Edge Functions).';

create index otp_send_attempts_phone_purpose_created_idx
  on public.otp_send_attempts (purpose, phone_digits, created_at desc);

create index otp_send_attempts_ip_created_idx
  on public.otp_send_attempts (client_ip, created_at desc)
  where client_ip is not null;

alter table public.otp_send_attempts enable row level security;

revoke all on table public.otp_send_attempts from public;
grant select, insert on table public.otp_send_attempts to service_role;

-- Lookup RPCs: service_role only (called from Edge Functions, not browsers).
revoke execute on function public.profile_exists_for_phone(text) from anon, authenticated;
grant execute on function public.profile_exists_for_phone(text) to service_role;

revoke execute on function public.student_can_reset_password(text) from anon, authenticated;
grant execute on function public.student_can_reset_password(text) to service_role;
