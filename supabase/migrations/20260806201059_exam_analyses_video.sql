-- exam_analyses: optional public video URL and short description.

alter table public.exam_analyses
  add column video_path text,
  add column description text;

comment on column public.exam_analyses.video_path is 'Public Liara URL for the exam analysis video.';
comment on column public.exam_analyses.description is 'Short description of the exam analysis.';
