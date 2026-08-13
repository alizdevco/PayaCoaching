-- student_contents: support external links (no mime_type or file_size).

alter table public.student_contents
  drop constraint student_contents_file_type_check;

alter table public.student_contents
  add constraint student_contents_file_type_check
    check (file_type in ('video', 'pdf', 'image', 'report', 'link'));

alter table public.student_contents
  alter column mime_type drop not null;

alter table public.student_contents
  alter column file_size drop not null;

-- Links omit file_size; uploaded files must still be > 0 when set.
alter table public.student_contents
  drop constraint student_contents_file_size_check;

alter table public.student_contents
  add constraint student_contents_file_size_check
    check (file_size is null or file_size > 0);

comment on column public.student_contents.mime_type is 'MIME type of the uploaded object; NULL for external links.';
comment on column public.student_contents.file_size is 'Byte size of the uploaded object; NULL for external links.';
