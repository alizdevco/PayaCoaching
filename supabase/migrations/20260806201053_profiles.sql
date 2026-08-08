-- profiles: one row per auth.users record; role drives authorization (not user_metadata).

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'student' check (role in ('admin', 'student')),
  phone text unique,
  first_name text,
  last_name text,
  academic_major text,
  grade text,
  province text,
  city text,
  consultant_name text,
  profile_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_completed_fields_check check (
    profile_completed_at is null
    or (
      first_name is not null
      and last_name is not null
      and academic_major is not null
      and grade is not null
      and province is not null
      and city is not null
      and consultant_name is not null
    )
  )
);

comment on table public.profiles is 'Application user profiles linked to auth.users; role is the authorization source of truth.';
comment on column public.profiles.role is 'Either admin or student; never sourced from client-editable JWT metadata.';
comment on column public.profiles.phone is 'Student login identifier; unique when present (admins may use email auth without a phone).';
comment on column public.profiles.profile_completed_at is 'Set when the student finishes the post-registration profile form.';

create index profiles_role_student_idx on public.profiles (role) where role = 'student';

create index profiles_created_at_idx on public.profiles (created_at desc);
