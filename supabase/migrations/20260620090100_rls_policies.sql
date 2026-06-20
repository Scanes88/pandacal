-- =============================================================================
-- EFPT Portal — Stage 1 Row-Level Security
-- =============================================================================
-- Three roles:
--   admin  -> a coach row with is_admin = true; full read/write everywhere.
--   coach  -> a coach row; read/write rows scoped to coach_id = their id;
--             reads the shared exercise library; writes exercises only as
--             bespoke (or admin).
--   client -> a client row; reads their own programme tree; writes their own
--             logs; reads/writes their own metric_entries & goals subject to
--             each metric's who_can_log.
--
-- Ownership is resolved through SECURITY DEFINER helper functions so policy
-- sub-queries don't trigger recursive RLS on the referenced tables.
-- =============================================================================

-- Identity helpers ------------------------------------------------------------
create or replace function public.current_coach_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.coaches where user_id = auth.uid() limit 1;
$$;

create or replace function public.current_client_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.clients where user_id = auth.uid() limit 1;
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    (select is_admin from public.coaches where user_id = auth.uid() limit 1),
    false
  );
$$;

-- Ownership lookups (bypass RLS via SECURITY DEFINER) -------------------------
create or replace function public.client_coach_id(p_client_id uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select coach_id from public.clients where id = p_client_id;
$$;

create or replace function public.programme_coach_id(p_programme_id uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select coach_id from public.programmes where id = p_programme_id;
$$;

create or replace function public.programme_client_id(p_programme_id uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select client_id from public.programmes where id = p_programme_id;
$$;

create or replace function public.phase_coach_id(p_phase_id uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select pr.coach_id
    from public.phases ph
    join public.programmes pr on pr.id = ph.programme_id
   where ph.id = p_phase_id;
$$;

create or replace function public.phase_client_id(p_phase_id uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select pr.client_id
    from public.phases ph
    join public.programmes pr on pr.id = ph.programme_id
   where ph.id = p_phase_id;
$$;

create or replace function public.session_coach_id(p_session_id uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select pr.coach_id
    from public.sessions s
    join public.phases ph on ph.id = s.phase_id
    join public.programmes pr on pr.id = ph.programme_id
   where s.id = p_session_id;
$$;

create or replace function public.session_client_id(p_session_id uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select pr.client_id
    from public.sessions s
    join public.phases ph on ph.id = s.phase_id
    join public.programmes pr on pr.id = ph.programme_id
   where s.id = p_session_id;
$$;

create or replace function public.metric_who_can_log(p_metric_id uuid)
returns who_can_log language sql stable security definer set search_path = public as $$
  select who_can_log from public.metrics where id = p_metric_id;
$$;

-- Enable RLS on every table ---------------------------------------------------
alter table public.coaches              enable row level security;
alter table public.clients              enable row level security;
alter table public.exercises            enable row level security;
alter table public.templates            enable row level security;
alter table public.programmes           enable row level security;
alter table public.phases               enable row level security;
alter table public.sessions             enable row level security;
alter table public.programme_exercises  enable row level security;
alter table public.exercise_logs        enable row level security;
alter table public.metrics              enable row level security;
alter table public.metric_entries       enable row level security;
alter table public.goals                enable row level security;

-- =============================================================================
-- coaches
-- =============================================================================
-- Admin: everything. Coach: read & update own row.
create policy coaches_admin_all on public.coaches
  for all using (public.is_admin()) with check (public.is_admin());

create policy coaches_self_select on public.coaches
  for select using (user_id = auth.uid());

create policy coaches_self_update on public.coaches
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Clients may read their own coach's basic record (needed to display "your coach").
create policy coaches_readable_by_their_clients on public.coaches
  for select using (id = public.client_coach_id(public.current_client_id()));

-- =============================================================================
-- clients
-- =============================================================================
create policy clients_admin_all on public.clients
  for all using (public.is_admin()) with check (public.is_admin());

create policy clients_coach_all on public.clients
  for all
  using (coach_id = public.current_coach_id())
  with check (coach_id = public.current_coach_id());

-- Client reads their own record.
create policy clients_self_select on public.clients
  for select using (user_id = auth.uid());

-- =============================================================================
-- exercises (shared master library)
-- =============================================================================
create policy exercises_admin_all on public.exercises
  for all using (public.is_admin()) with check (public.is_admin());

-- Any authenticated user can read the shared library.
create policy exercises_read_all on public.exercises
  for select to authenticated using (true);

-- A coach may add an exercise only as bespoke and owned by them.
create policy exercises_coach_insert_bespoke on public.exercises
  for insert
  with check (
    is_bespoke = true and created_by = public.current_coach_id()
  );

-- A coach may edit/delete only their own bespoke exercises.
create policy exercises_coach_update_bespoke on public.exercises
  for update
  using (is_bespoke = true and created_by = public.current_coach_id())
  with check (is_bespoke = true and created_by = public.current_coach_id());

create policy exercises_coach_delete_bespoke on public.exercises
  for delete
  using (is_bespoke = true and created_by = public.current_coach_id());

-- =============================================================================
-- templates
-- =============================================================================
create policy templates_admin_all on public.templates
  for all using (public.is_admin()) with check (public.is_admin());

create policy templates_coach_all on public.templates
  for all
  using (coach_id = public.current_coach_id())
  with check (coach_id = public.current_coach_id());

-- =============================================================================
-- programmes
-- =============================================================================
create policy programmes_admin_all on public.programmes
  for all using (public.is_admin()) with check (public.is_admin());

create policy programmes_coach_all on public.programmes
  for all
  using (coach_id = public.current_coach_id())
  with check (coach_id = public.current_coach_id());

create policy programmes_client_select on public.programmes
  for select using (client_id = public.current_client_id());

-- =============================================================================
-- phases  (scoped via parent programme)
-- =============================================================================
create policy phases_admin_all on public.phases
  for all using (public.is_admin()) with check (public.is_admin());

create policy phases_coach_all on public.phases
  for all
  using (public.programme_coach_id(programme_id) = public.current_coach_id())
  with check (public.programme_coach_id(programme_id) = public.current_coach_id());

create policy phases_client_select on public.phases
  for select using (public.programme_client_id(programme_id) = public.current_client_id());

-- =============================================================================
-- sessions  (scoped via phase -> programme)
-- =============================================================================
create policy sessions_admin_all on public.sessions
  for all using (public.is_admin()) with check (public.is_admin());

create policy sessions_coach_all on public.sessions
  for all
  using (public.phase_coach_id(phase_id) = public.current_coach_id())
  with check (public.phase_coach_id(phase_id) = public.current_coach_id());

create policy sessions_client_select on public.sessions
  for select using (public.phase_client_id(phase_id) = public.current_client_id());

-- =============================================================================
-- programme_exercises  (scoped via session -> phase -> programme)
-- =============================================================================
create policy programme_exercises_admin_all on public.programme_exercises
  for all using (public.is_admin()) with check (public.is_admin());

create policy programme_exercises_coach_all on public.programme_exercises
  for all
  using (public.session_coach_id(session_id) = public.current_coach_id())
  with check (public.session_coach_id(session_id) = public.current_coach_id());

create policy programme_exercises_client_select on public.programme_exercises
  for select using (public.session_client_id(session_id) = public.current_client_id());

-- =============================================================================
-- exercise_logs
-- =============================================================================
create policy exercise_logs_admin_all on public.exercise_logs
  for all using (public.is_admin()) with check (public.is_admin());

-- Coach reads/manages logs for their own clients.
create policy exercise_logs_coach_all on public.exercise_logs
  for all
  using (public.client_coach_id(client_id) = public.current_coach_id())
  with check (public.client_coach_id(client_id) = public.current_coach_id());

-- Client reads & writes only their own logs.
create policy exercise_logs_client_select on public.exercise_logs
  for select using (client_id = public.current_client_id());

create policy exercise_logs_client_insert on public.exercise_logs
  for insert with check (client_id = public.current_client_id());

create policy exercise_logs_client_update on public.exercise_logs
  for update
  using (client_id = public.current_client_id())
  with check (client_id = public.current_client_id());

create policy exercise_logs_client_delete on public.exercise_logs
  for delete using (client_id = public.current_client_id());

-- =============================================================================
-- metrics (definitions: global/shared OR client-specific)
-- =============================================================================
create policy metrics_admin_all on public.metrics
  for all using (public.is_admin()) with check (public.is_admin());

-- Reads: anyone may read global definitions; coaches read their clients'
-- metrics; clients read their own.
create policy metrics_read_global on public.metrics
  for select to authenticated using (is_global = true);

create policy metrics_coach_select on public.metrics
  for select using (public.client_coach_id(client_id) = public.current_coach_id());

create policy metrics_client_select on public.metrics
  for select using (client_id = public.current_client_id());

-- Coaches manage client-specific metrics for their own clients (not global).
create policy metrics_coach_insert on public.metrics
  for insert
  with check (
    is_global = false and public.client_coach_id(client_id) = public.current_coach_id()
  );

create policy metrics_coach_update on public.metrics
  for update
  using (is_global = false and public.client_coach_id(client_id) = public.current_coach_id())
  with check (is_global = false and public.client_coach_id(client_id) = public.current_coach_id());

create policy metrics_coach_delete on public.metrics
  for delete
  using (is_global = false and public.client_coach_id(client_id) = public.current_coach_id());

-- =============================================================================
-- metric_entries  (subject to the metric's who_can_log for clients)
-- =============================================================================
create policy metric_entries_admin_all on public.metric_entries
  for all using (public.is_admin()) with check (public.is_admin());

-- Coach: full access to entries for their own clients.
create policy metric_entries_coach_all on public.metric_entries
  for all
  using (public.client_coach_id(client_id) = public.current_coach_id())
  with check (public.client_coach_id(client_id) = public.current_coach_id());

-- Client reads their own entries.
create policy metric_entries_client_select on public.metric_entries
  for select using (client_id = public.current_client_id());

-- Client writes their own entries only when the metric allows client logging,
-- and must stamp themselves as the author.
create policy metric_entries_client_insert on public.metric_entries
  for insert
  with check (
    client_id = public.current_client_id()
    and entered_by_client_id = public.current_client_id()
    and public.metric_who_can_log(metric_id) in ('client', 'both')
  );

create policy metric_entries_client_update on public.metric_entries
  for update
  using (
    client_id = public.current_client_id()
    and public.metric_who_can_log(metric_id) in ('client', 'both')
  )
  with check (
    client_id = public.current_client_id()
    and entered_by_client_id = public.current_client_id()
    and public.metric_who_can_log(metric_id) in ('client', 'both')
  );

create policy metric_entries_client_delete on public.metric_entries
  for delete
  using (
    client_id = public.current_client_id()
    and public.metric_who_can_log(metric_id) in ('client', 'both')
  );

-- =============================================================================
-- goals
-- =============================================================================
create policy goals_admin_all on public.goals
  for all using (public.is_admin()) with check (public.is_admin());

create policy goals_coach_all on public.goals
  for all
  using (public.client_coach_id(client_id) = public.current_coach_id())
  with check (public.client_coach_id(client_id) = public.current_coach_id());

create policy goals_client_select on public.goals
  for select using (client_id = public.current_client_id());

create policy goals_client_insert on public.goals
  for insert with check (client_id = public.current_client_id());

create policy goals_client_update on public.goals
  for update
  using (client_id = public.current_client_id())
  with check (client_id = public.current_client_id());

create policy goals_client_delete on public.goals
  for delete using (client_id = public.current_client_id());
