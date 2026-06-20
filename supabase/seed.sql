-- =============================================================================
-- EFPT Portal — Stage 1 seed (test data)
-- =============================================================================
-- These rows let you prove the auth + roles + RLS pipeline. They are keyed by
-- EMAIL only. When each person signs in for the first time via magic link, the
-- handle_new_user() trigger links their auth.users id to the matching row.
--
-- HOW TO USE
--   1. Edit the email addresses below to ones you can actually receive mail at.
--   2. Run this against your Supabase project (SQL Editor, or `supabase db reset`
--      which runs migrations then this seed locally).
--   3. Sign in at /login with each email to receive a magic link.
--
-- Stage 1 "done" check: the coach below logs in and sees exactly the one test
-- client; the admin sees all coaches + all clients; the client sees an empty
-- Training/Progress.
-- =============================================================================

-- An administrator (a coach with is_admin = true) ----------------------------
insert into public.coaches (name, email, is_admin)
values ('EFPT Admin', 'admin@example.com', true)
on conflict (email) do nothing;

-- A regular coach -------------------------------------------------------------
insert into public.coaches (name, email, is_admin)
values ('Test Coach', 'coach@example.com', false)
on conflict (email) do nothing;

-- One client owned by the test coach -----------------------------------------
insert into public.clients (coach_id, name, email, status)
select c.id, 'Test Client', 'client@example.com', 'active'
from public.coaches c
where c.email = 'coach@example.com'
on conflict do nothing;
