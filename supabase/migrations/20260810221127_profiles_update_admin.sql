-- Allow admins to update any profile row (e.g. student management in admin panel).

create policy profiles_update_admin
  on public.profiles
  for update
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));
