-- Restrict privileged SECURITY DEFINER RPCs: require authenticated (or service_role)
-- instead of default public grants to anon. Public exam catalog RPCs
-- (get_student_online_exam, list_student_online_exams) remain callable by anon.

revoke execute on function public.ensure_own_profile() from anon;

revoke execute on function public.start_online_exam_attempt(uuid) from anon;

revoke execute on function public.finalize_online_exam_attempt(uuid, boolean) from anon;

revoke execute on function public.finalize_due_online_exam_attempts(uuid) from anon;

revoke execute on function public.rls_auto_enable() from anon, authenticated;
