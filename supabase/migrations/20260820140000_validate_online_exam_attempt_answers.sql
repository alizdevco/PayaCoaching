-- Validate online_exam_attempts.answers on UPDATE: bounded JSON object of
-- question number (1..150) -> option (1..4). Rejects oversized or malformed
-- payloads at the API boundary without changing scoring, finalize, or guards.

create or replace function private.validate_online_exam_attempt_answers()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  kv record;
  key_num integer;
  val_num numeric;
  key_count integer := 0;
begin
  if new.answers is null then
    raise exception 'answers must not be null';
  end if;

  if jsonb_typeof(new.answers) <> 'object' then
    raise exception 'answers must be a JSON object';
  end if;

  if pg_column_size(new.answers) > 8192 then
    raise exception 'answers payload is too large';
  end if;

  for kv in select key, value from jsonb_each(new.answers)
  loop
    key_count := key_count + 1;
    if key_count > 150 then
      raise exception 'answers contain too many entries';
    end if;

    if kv.key !~ '^[1-9][0-9]*$' then
      raise exception 'invalid answer key';
    end if;

    key_num := kv.key::integer;
    if key_num < 1 or key_num > 150 then
      raise exception 'invalid answer key';
    end if;

    if jsonb_typeof(kv.value) <> 'number' then
      raise exception 'invalid answer value';
    end if;

    val_num := (kv.value #>> '{}')::numeric;
    if val_num <> trunc(val_num) or val_num < 1 or val_num > 4 then
      raise exception 'invalid answer value';
    end if;
  end loop;

  return new;
end;
$$;

revoke all on function private.validate_online_exam_attempt_answers() from public;
grant execute on function private.validate_online_exam_attempt_answers() to authenticated, service_role;

create trigger online_exam_attempts_validate_answers
  before update of answers on public.online_exam_attempts
  for each row
  when (new.answers is distinct from old.answers)
  execute function private.validate_online_exam_attempt_answers();
