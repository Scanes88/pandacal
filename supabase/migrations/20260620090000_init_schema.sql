-- =============================================================================
-- EFPT Portal — Stage 1 schema
-- =============================================================================
-- Notes on additions beyond the brief's column lists (all required to make
-- Supabase Auth + RLS work, and called out in the README):
--   * coaches.user_id / clients.user_id  -> link a row to an auth.users id so
--     RLS can identify "me". Linked automatically on sign-in by email (see the
--     handle_new_user trigger below).
--   * metrics.client_id                  -> nullable; set when a metric is
--     client-specific (is_global = false). Null for global/shared definitions.
--   * metric_entries.entered_by_*        -> modelled as two nullable FKs
--     (coach OR client) with a CHECK, rather than one polymorphic column.
-- =============================================================================

-- Enums -----------------------------------------------------------------------
create type metric_type as enum ('time', 'weight', 'scale', 'test', 'number');
create type direction_of_better as enum ('lower', 'higher');
create type who_can_log as enum ('coach', 'client', 'both');
create type goal_status as enum ('in_progress', 'achieved', 'missed');

-- Generic updated_at trigger ---------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =============================================================================
-- Training tree
-- =============================================================================

-- coaches (includes physios; is_admin flag marks an administrator) ------------
create table public.coaches (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid unique references auth.users (id) on delete set null,
  name        text not null,
  email       text not null unique,
  is_admin    boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- clients ---------------------------------------------------------------------
create table public.clients (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid unique references auth.users (id) on delete set null,
  coach_id        uuid not null references public.coaches (id) on delete cascade,
  name            text not null,
  email           text not null,
  -- profile fields
  date_of_birth   date,
  sex             text,
  phone           text,
  height_cm       numeric,
  weight_kg       numeric,
  injury_history  text,
  goals_summary   text,
  -- coach-private
  coach_notes     text,
  status          text not null default 'active',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index clients_coach_id_idx on public.clients (coach_id);

-- exercises: SHARED master library --------------------------------------------
create table public.exercises (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  category        text,
  tags            text[] not null default '{}',
  coaching_cues   text,
  video_provider  text,
  video_id        text,
  created_by      uuid references public.coaches (id) on delete set null,
  is_bespoke      boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- templates: a programme with no client attached ------------------------------
create table public.templates (
  id          uuid primary key default gen_random_uuid(),
  coach_id    uuid not null references public.coaches (id) on delete cascade,
  name        text not null,
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index templates_coach_id_idx on public.templates (coach_id);

-- programmes ------------------------------------------------------------------
create table public.programmes (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.clients (id) on delete cascade,
  coach_id    uuid not null references public.coaches (id) on delete cascade,
  name        text not null,
  start_date  date,
  status      text not null default 'active',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index programmes_client_id_idx on public.programmes (client_id);
create index programmes_coach_id_idx on public.programmes (coach_id);

-- phases ----------------------------------------------------------------------
create table public.phases (
  id            uuid primary key default gen_random_uuid(),
  programme_id  uuid not null references public.programmes (id) on delete cascade,
  name          text not null,
  order_index   integer not null default 0
);
create index phases_programme_id_idx on public.phases (programme_id);

-- sessions --------------------------------------------------------------------
create table public.sessions (
  id           uuid primary key default gen_random_uuid(),
  phase_id     uuid not null references public.phases (id) on delete cascade,
  name         text not null,
  order_index  integer not null default 0
);
create index sessions_phase_id_idx on public.sessions (phase_id);

-- programme_exercises ---------------------------------------------------------
create table public.programme_exercises (
  id                      uuid primary key default gen_random_uuid(),
  session_id              uuid not null references public.sessions (id) on delete cascade,
  exercise_id             uuid not null references public.exercises (id) on delete restrict,
  order_index             integer not null default 0,
  prescribed_sets         integer,
  prescribed_reps         text,
  tempo                   text,
  rpe_rir                 text,
  rest_seconds            integer,
  prescribed_load         text,
  notes                   text,
  video_override_provider text,
  video_override_id       text
);
create index programme_exercises_session_id_idx on public.programme_exercises (session_id);
create index programme_exercises_exercise_id_idx on public.programme_exercises (exercise_id);

-- exercise_logs ---------------------------------------------------------------
create table public.exercise_logs (
  id                     uuid primary key default gen_random_uuid(),
  programme_exercise_id  uuid not null references public.programme_exercises (id) on delete cascade,
  client_id              uuid not null references public.clients (id) on delete cascade,
  set_number             integer,
  performed_reps         integer,
  performed_load         numeric,
  performed_rpe          numeric,
  pain_score             integer check (pain_score is null or pain_score between 0 and 10),
  note                   text,
  logged_at              timestamptz not null default now()
);
create index exercise_logs_programme_exercise_id_idx on public.exercise_logs (programme_exercise_id);
create index exercise_logs_client_id_idx on public.exercise_logs (client_id);

-- =============================================================================
-- Outcomes (hang off client)
-- =============================================================================

-- metrics: definition table (global/shared OR client-specific) ----------------
create table public.metrics (
  id                   uuid primary key default gen_random_uuid(),
  client_id            uuid references public.clients (id) on delete cascade,
  name                 text not null,
  type                 metric_type not null,
  unit                 text,
  direction_of_better  direction_of_better not null default 'higher',
  who_can_log          who_can_log not null default 'both',
  is_global            boolean not null default false,
  created_by           uuid references public.coaches (id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  -- global metrics are shared (no client); client-specific metrics need a client
  constraint metrics_scope_chk check (
    (is_global = true and client_id is null)
    or (is_global = false and client_id is not null)
  )
);
create index metrics_client_id_idx on public.metrics (client_id);

-- metric_entries --------------------------------------------------------------
create table public.metric_entries (
  id                   uuid primary key default gen_random_uuid(),
  client_id            uuid not null references public.clients (id) on delete cascade,
  metric_id            uuid not null references public.metrics (id) on delete cascade,
  date                 date not null default current_date,
  value                numeric not null,
  note                 text,
  -- entered_by is a coach OR a client (exactly one set)
  entered_by_coach_id  uuid references public.coaches (id) on delete set null,
  entered_by_client_id uuid references public.clients (id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint metric_entries_entered_by_chk check (
    (entered_by_coach_id is not null)::int
    + (entered_by_client_id is not null)::int = 1
  )
);
create index metric_entries_client_id_idx on public.metric_entries (client_id);
create index metric_entries_metric_id_idx on public.metric_entries (metric_id);

-- goals -----------------------------------------------------------------------
create table public.goals (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references public.clients (id) on delete cascade,
  metric_id     uuid references public.metrics (id) on delete set null,
  description   text not null,
  target_value  numeric,
  target_date   date,
  status        goal_status not null default 'in_progress',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index goals_client_id_idx on public.goals (client_id);

-- updated_at triggers ---------------------------------------------------------
create trigger set_updated_at before update on public.coaches
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.clients
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.exercises
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.templates
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.programmes
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.metrics
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.metric_entries
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.goals
  for each row execute function public.set_updated_at();

-- =============================================================================
-- Auto-link auth users to coach/client rows by email on sign-up.
-- Lets an admin provision an account (insert a coach/client row with an email)
-- before the person ever logs in; the link is made the first time they do.
-- =============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.coaches
     set user_id = new.id
   where lower(email) = lower(new.email) and user_id is null;

  update public.clients
     set user_id = new.id
   where lower(email) = lower(new.email) and user_id is null;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
