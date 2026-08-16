-- Enforce http/https-only external links at the database layer (file_type = 'link').
-- Aligns with isSafeExternalUrl in the app: only http:// and https:// schemes.
-- Non-link rows are unaffected.

alter table public.student_contents
  add constraint student_contents_link_file_path_check
  check (
    file_type <> 'link'
    or btrim(file_path) ~* '^https?://'
  );

comment on constraint student_contents_link_file_path_check on public.student_contents is
  'When file_type is link, file_path must be an http or https URL (trimmed).';
