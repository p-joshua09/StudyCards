-- Reserve Gemini testing quota and create a generation job in one transaction.
-- The authenticated role must not be able to edit created_at or insert jobs
-- directly, because the rolling quota is based on that timestamp.

begin;

revoke insert, update on table public.generation_jobs from public, anon, authenticated;
grant select on table public.generation_jobs to authenticated;
grant update (status, error_message, completed_at, deck_id)
  on table public.generation_jobs to authenticated;

create function public.reserve_generation_job(
  p_source_id uuid,
  p_requested_count smallint,
  p_difficulty text,
  p_language text,
  p_provider_id text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_now timestamptz;
  v_job_id uuid;
  v_recent_count bigint;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Sign in to generate flashcards.';
  end if;

  if p_requested_count is null or p_requested_count not between 5 and 20
    or p_difficulty is null or p_difficulty not in ('introductory', 'balanced', 'challenging')
    or p_language is null or p_language not in ('English', 'Filipino')
    or p_provider_id is null or p_provider_id not in ('gemini', 'deepseek') then
    raise exception using errcode = '22023', message = 'Choose 5–20 cards and valid generation options.';
  end if;

  if p_source_id is null or not exists (
    select 1
    from public.sources as source
    where source.id = p_source_id
      and source.user_id = v_user_id
      and source.status = 'ready'
      and source.source_text is not null
      and pg_catalog.char_length(pg_catalog.btrim(source.source_text)) >= 100
  ) then
    raise exception using errcode = '22023', message = 'This source is unavailable or has no readable text.';
  end if;

  -- A transaction-scoped lock serializes reservations for the same user.
  -- The hash may collide across users, which only causes extra waiting.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('generation_jobs:' || v_user_id::text, 0)
  );

  v_now := pg_catalog.clock_timestamp();
  select pg_catalog.count(*) into v_recent_count
  from public.generation_jobs as job
  where job.user_id = v_user_id
    and job.created_at >= v_now - interval '24 hours';

  if v_recent_count >= 20 then
    raise exception using
      errcode = 'P0001',
      message = 'You have reached the testing limit of 20 generations in 24 hours.';
  end if;

  insert into public.generation_jobs (
    user_id,
    source_id,
    status,
    output_mode,
    requested_count,
    difficulty,
    language,
    provider_id,
    created_at
  ) values (
    v_user_id,
    p_source_id,
    'processing',
    'flashcards',
    p_requested_count,
    p_difficulty,
    p_language,
    p_provider_id,
    v_now
  ) returning id into v_job_id;

  return v_job_id;
end;
$$;

revoke all on function public.reserve_generation_job(uuid, smallint, text, text, text)
  from public, anon, authenticated;
grant execute on function public.reserve_generation_job(uuid, smallint, text, text, text)
  to authenticated;

commit;
