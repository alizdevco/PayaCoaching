-- exam_analyses: public exam analysis pages keyed by exam_date (/exam-analysis/:exam_date).

create table public.exam_analyses (
  id uuid primary key default gen_random_uuid(),
  exam_date date not null unique,
  title text not null,
  content text not null,
  is_published boolean not null default false,
  created_by uuid not null references public.profiles (id) on delete restrict,
  updated_by uuid references public.profiles (id) on delete restrict,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint exam_analyses_title_not_blank check (btrim(title) <> ''),
  constraint exam_analyses_content_not_blank check (btrim(content) <> ''),
  constraint exam_analyses_published_at_check check (
    (is_published = false and published_at is null)
    or (is_published = true and published_at is not null)
  )
);

comment on table public.exam_analyses is 'Public exam analysis content; exam_date is the URL slug.';
comment on column public.exam_analyses.exam_date is 'Unique date slug for /exam-analysis/:exam_date routes.';
comment on column public.exam_analyses.is_published is 'When true, content is visible to students and anonymous visitors.';

create index exam_analyses_published_idx
  on public.exam_analyses (exam_date desc)
  where is_published = true;

create index exam_analyses_created_at_idx on public.exam_analyses (created_at desc);
