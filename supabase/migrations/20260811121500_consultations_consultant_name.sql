-- consultations: store consultant name per session.

alter table public.consultations
  add column consultant_name text;

update public.consultations
set consultant_name = coalesce(nullif(btrim(consultant_name), ''), 'نامشخص')
where consultant_name is null;

alter table public.consultations
  alter column consultant_name set not null;

alter table public.consultations
  add constraint consultations_consultant_name_not_blank
    check (btrim(consultant_name) <> '');

comment on column public.consultations.consultant_name is 'Name of the consultant for this phone session.';
