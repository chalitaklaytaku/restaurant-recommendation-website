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
begin
  if current_setting('request.jwt.claim.role', true) = 'authenticated' and auth.uid() is null then
    raise exception 'Authenticated survey inserts require a valid user';
  end if;

  for question_number in 1..10 loop
    current_question_key := 'q' || question_number;
    if coalesce(new.scores ->> current_question_key, '') !~ '^[1-5]$' then
      raise exception 'Survey scores must contain q1 through q10 with values from 1 to 5';
    end if;

    score := (new.scores ->> current_question_key)::integer;
    update public.survey_statistics
    set response_count = response_count + 1,
        score_sum = score_sum + score,
        score_squared_sum = score_squared_sum + (score * score)
    where public.survey_statistics.question_key = current_question_key;
  end loop;

  return new;
end;
$$;

revoke all on function private.update_survey_statistics() from public, anon, authenticated;
