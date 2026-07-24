-- 013: the automated shoot runs as a first-class job so the dashboard can
-- show its status and errors over Realtime (previously it ran invisibly).
alter table jobs drop constraint jobs_type_check;
alter table jobs add constraint jobs_type_check
  check (type = any (array[
    'llm_generate'::text, 'llm_revise'::text,
    'image_gen'::text, 'image_edit'::text, 'video_gen'::text, 'tts'::text,
    'shoot_run'::text
  ]));
