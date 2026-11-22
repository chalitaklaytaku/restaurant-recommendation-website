create or replace function private.update_survey_statistics()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  question_number integer;
  current_question_key text;
  score integer;
  delta integer;
begin
  if tg_op = 'INSERT'
     and current_setting('request.jwt.claim.role', true) = 'authenticated'
     and auth.uid() is null then
    raise exception 'Authenticated survey inserts require a valid user';
  end if;

  delta := case when tg_op = 'INSERT' then 1 else -1 end;

  for question_number in 1..10 loop
    current_question_key := 'q' || question_number;
    if tg_op = 'INSERT' and coalesce(new.scores ->> current_question_key, '') !~ '^[1-5]$' then
      raise exception 'Survey scores must contain q1 through q10 with values from 1 to 5';
    end if;

    score := (case when tg_op = 'INSERT' then new.scores else old.scores end ->> current_question_key)::integer;
    update public.survey_statistics
    set response_count = response_count + delta,
        score_sum = score_sum + (delta * score),
        score_squared_sum = score_squared_sum + (delta * score * score)
    where public.survey_statistics.question_key = current_question_key;
  end loop;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function private.update_survey_statistics() from public, anon, authenticated;

drop trigger if exists update_survey_statistics_after_delete on public.survey_responses;
create trigger update_survey_statistics_after_delete
  after delete on public.survey_responses
  for each row execute function private.update_survey_statistics();

