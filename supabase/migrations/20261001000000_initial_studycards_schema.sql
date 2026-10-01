-- StudyCards initial schema.
-- Every exposed table is owner-scoped and has RLS enabled.

begin;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 240),
  source_type text not null check (source_type in ('pdf', 'docx', 'text')),
  status text not null default 'ready' check (status in ('uploaded', 'processing', 'ready', 'failed', 'archived')),
  storage_path text,
  source_text text,
  byte_size bigint check (byte_size is null or byte_size >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create table public.decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  description text,
  subject text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create table public.deck_sources (
  user_id uuid not null references auth.users (id) on delete cascade,
  deck_id uuid not null,
  source_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (deck_id, source_id),
  foreign key (deck_id, user_id) references public.decks (id, user_id) on delete cascade,
  foreign key (source_id, user_id) references public.sources (id, user_id) on delete cascade
);

create table public.cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  deck_id uuid not null,
  source_id uuid,
  front text not null check (char_length(front) between 1 and 4000),
  back text not null check (char_length(back) between 1 and 8000),
  explanation text,
  card_type text not null default 'basic' check (card_type in ('basic', 'cloze', 'definition', 'comparison')),
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  difficulty smallint check (difficulty is null or difficulty between 1 and 5),
  tags text[] not null default '{}',
  source_excerpt text,
  source_location text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (deck_id, user_id) references public.decks (id, user_id) on delete cascade,
  foreign key (source_id, user_id) references public.sources (id, user_id) on delete set null (source_id)
);

create table public.generation_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source_id uuid,
  deck_id uuid,
  status text not null default 'queued' check (status in ('queued', 'processing', 'completed', 'failed', 'cancelled')),
  output_mode text not null check (output_mode in ('flashcards', 'quiz', 'both')),
  requested_count smallint not null check (requested_count between 5 and 30),
  difficulty text not null check (difficulty in ('introductory', 'balanced', 'challenging')),
  language text not null default 'English',
  provider_id text check (provider_id is null or provider_id in ('gemini', 'deepseek')),
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  foreign key (source_id, user_id) references public.sources (id, user_id) on delete set null (source_id),
  foreign key (deck_id, user_id) references public.decks (id, user_id) on delete set null (deck_id)
);

create table public.review_states (
  user_id uuid not null references auth.users (id) on delete cascade,
  card_id uuid not null,
  due_at timestamptz not null default now(),
  stability_days double precision not null default 0 check (stability_days >= 0),
  difficulty double precision not null default 5 check (difficulty between 1 and 10),
  repetitions integer not null default 0 check (repetitions >= 0),
  lapses integer not null default 0 check (lapses >= 0),
  scheduled_days integer not null default 0 check (scheduled_days >= 0),
  last_reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, card_id),
  foreign key (card_id, user_id) references public.cards (id, user_id) on delete cascade
);

create table public.review_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  card_id uuid not null,
  rating text not null check (rating in ('again', 'hard', 'good', 'easy')),
  reviewed_at timestamptz not null default now(),
  elapsed_days double precision not null default 0 check (elapsed_days >= 0),
  scheduled_days integer not null default 0 check (scheduled_days >= 0),
  response_ms integer check (response_ms is null or response_ms >= 0),
  due_before timestamptz,
  due_after timestamptz,
  foreign key (card_id, user_id) references public.cards (id, user_id) on delete cascade
);

create table public.quiz_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  deck_id uuid,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'abandoned')),
  question_count smallint not null check (question_count between 1 and 100),
  correct_count smallint check (correct_count is null or correct_count between 0 and question_count),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  foreign key (deck_id, user_id) references public.decks (id, user_id) on delete set null (deck_id),
  unique (id, user_id)
);

create table public.quiz_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  session_id uuid not null,
  card_id uuid not null,
  response_text text,
  response_data jsonb,
  is_correct boolean,
  answered_at timestamptz,
  unique (session_id, card_id),
  foreign key (session_id, user_id) references public.quiz_sessions (id, user_id) on delete cascade,
  foreign key (card_id, user_id) references public.cards (id, user_id) on delete cascade
);

create index sources_user_created_idx on public.sources (user_id, created_at desc);
create index decks_user_updated_idx on public.decks (user_id, updated_at desc);
create index cards_deck_status_position_idx on public.cards (deck_id, status, position);
create index cards_user_status_idx on public.cards (user_id, status);
create index generation_jobs_user_created_idx on public.generation_jobs (user_id, created_at desc);
create index review_states_due_idx on public.review_states (user_id, due_at);
create index review_events_user_reviewed_idx on public.review_events (user_id, reviewed_at desc);
create index quiz_sessions_user_started_idx on public.quiz_sessions (user_id, started_at desc);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), 'Student')
  );
  return new;
end;
$$;

revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;

create trigger auth_user_profile_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger sources_updated_at before update on public.sources
  for each row execute function public.set_updated_at();
create trigger decks_updated_at before update on public.decks
  for each row execute function public.set_updated_at();
create trigger cards_updated_at before update on public.cards
  for each row execute function public.set_updated_at();
create trigger review_states_updated_at before update on public.review_states
  for each row execute function public.set_updated_at();

-- Revoke the default API grants, then grant only the operations used by the app.
revoke all on table
  public.profiles,
  public.sources,
  public.decks,
  public.deck_sources,
  public.cards,
  public.generation_jobs,
  public.review_states,
  public.review_events,
  public.quiz_sessions,
  public.quiz_responses
from anon, authenticated;

grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.sources to authenticated;
grant select, insert, update, delete on public.decks to authenticated;
grant select, insert, delete on public.deck_sources to authenticated;
grant select, insert, update, delete on public.cards to authenticated;
grant select, insert, update on public.generation_jobs to authenticated;
grant select, insert, update on public.review_states to authenticated;
grant select, insert on public.review_events to authenticated;
grant select, insert, update on public.quiz_sessions to authenticated;
grant select, insert, update, delete on public.quiz_responses to authenticated;

alter table public.profiles enable row level security;
alter table public.sources enable row level security;
alter table public.decks enable row level security;
alter table public.deck_sources enable row level security;
alter table public.cards enable row level security;
alter table public.generation_jobs enable row level security;
alter table public.review_states enable row level security;
alter table public.review_events enable row level security;
alter table public.quiz_sessions enable row level security;
alter table public.quiz_responses enable row level security;

create policy "Users read their profile" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "Users update their profile" on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "Users read their sources" on public.sources
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users create their sources" on public.sources
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users update their sources" on public.sources
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users delete their sources" on public.sources
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy "Users read their decks" on public.decks
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users create their decks" on public.decks
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users update their decks" on public.decks
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users delete their decks" on public.decks
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy "Users read their deck sources" on public.deck_sources
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users link their own sources" on public.deck_sources
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users unlink their own sources" on public.deck_sources
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy "Users read their cards" on public.cards
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users create their cards" on public.cards
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users update their cards" on public.cards
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users delete their cards" on public.cards
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy "Users read their generation jobs" on public.generation_jobs
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users create their generation jobs" on public.generation_jobs
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users update their generation jobs" on public.generation_jobs
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "Users read their review states" on public.review_states
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users create their review states" on public.review_states
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users update their review states" on public.review_states
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "Users read their review events" on public.review_events
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users create their review events" on public.review_events
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "Users read their quiz sessions" on public.quiz_sessions
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users create their quiz sessions" on public.quiz_sessions
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users update their quiz sessions" on public.quiz_sessions
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "Users read their quiz responses" on public.quiz_responses
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users create their quiz responses" on public.quiz_responses
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users update their quiz responses" on public.quiz_responses
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users delete their quiz responses" on public.quiz_responses
  for delete to authenticated using ((select auth.uid()) = user_id);

commit;
