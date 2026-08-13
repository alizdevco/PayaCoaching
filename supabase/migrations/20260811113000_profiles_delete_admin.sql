-- Allow admins to delete profile rows (e.g. student removal from admin panel).

grant delete on public.profiles to authenticated;

create policy profiles_delete_admin
  on public.profiles
  for delete
  to authenticated
  using ((select private.is_admin()));
