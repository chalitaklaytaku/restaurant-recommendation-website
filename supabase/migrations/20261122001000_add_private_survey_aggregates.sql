create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists public.survey_statistics (
  question_key text primary key check (question_key in ('q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9', 'q10')),
  response_count bigint not null default 0 check (response_count >= 0),
  score_sum bigint not null default 0 check (score_sum >= 0),
  score_squared_sum bigint not null default 0 check (score_squared_sum >= 0)
);

insert into public.survey_statistics (question_key)
select 'q' || question_number
from generate_series(1, 10) as series(question_number)
on conflict (question_key) do nothing;

alter table public.survey_statistics enable row level security;
grant select on public.survey_statistics to anon, authenticated;

create policy "Anyone can view aggregate survey statistics"
  on public.survey_statistics for select
  to anon, authenticated
  using (true);

create or replace function private.update_survey_statistics()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  question_number integer;
  question_key text;
  score integer;
begin
  if current_setting('request.jwt.claim.role', true) = 'authenticated' and auth.uid() is null then
    raise exception 'Authenticated survey inserts require a valid user';
  end if;

  for question_number in 1..10 loop
    question_key := 'q' || question_number;
    if coalesce(new.scores ->> question_key, '') !~ '^[1-5]$' then
      raise exception 'Survey scores must contain q1 through q10 with values from 1 to 5';
    end if;

    score := (new.scores ->> question_key)::integer;
    update public.survey_statistics
    set response_count = response_count + 1,
        score_sum = score_sum + score,
        score_squared_sum = score_squared_sum + (score * score)
    where public.survey_statistics.question_key = question_key;
  end loop;

  return new;
end;
$$;

revoke all on function private.update_survey_statistics() from public, anon, authenticated;

drop trigger if exists update_survey_statistics_after_insert on public.survey_responses;
create trigger update_survey_statistics_after_insert
  after insert on public.survey_responses
  for each row execute function private.update_survey_statistics();
