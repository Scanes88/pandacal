# EFPT Portal

The coaching portal for **Elite Formula Performance Training** — programmes,
progress and outcomes for athletes and their coaches.

> **Stage 1** — this is the deploy-ready foundation: a branded-but-empty shell
> with passwordless auth, three roles, the full database schema, and Row-Level
> Security. Feature UIs (programme builder, logging, charts) come in later
> stages.

## Stack

- **Next.js** (App Router, TypeScript) — deployed to **Vercel**
- **Supabase** — Postgres, Auth (magic link), Storage, Row-Level Security
- **Tailwind CSS** — brand tokens centralised for one-place re-skinning
- **`@supabase/ssr`** — cookie-based session handling across server & client

## Roles

| Role       | Sees / can do                                                                 |
| ---------- | ----------------------------------------------------------------------------- |
| **Admin**  | All coaches and all clients; manages the shared exercise library. (`is_admin` flag on a coach.) |
| **Coach**  | Only their own clients (`coach_id`); reads the shared exercise library; adds bespoke exercises. |
| **Client** | Only their own programme; logs their own sessions, markers and goals.          |

A signed-in user's role is resolved from the database: a row in `coaches`
(with `is_admin` deciding admin vs coach) or a row in `clients`. Users with no
matching row land on a "pending access" page until an admin provisions them.

## Project layout

```
app/
  (app)/                 authenticated area (shared shell + role-aware nav)
    clients/             coach: their clients · admin: all clients
    coaches/             admin: all coaches
    library/             admin: shared exercise library
    training/            client: their programmes
    progress/            client: outcomes placeholder
    dashboard/           post-login router → role home
  auth/callback/         magic-link code exchange
  login/                 magic-link request form
  no-access/             authenticated but unprovisioned
  page.tsx               public landing
components/              shell, nav, brand, empty states
lib/
  supabase/{client,server,middleware}.ts   Supabase helpers
  auth.ts                role resolution + page guards
  types.ts               shared types
middleware.ts            session refresh + coarse route protection
supabase/
  migrations/            schema + RLS (run these on your DB)
  seed.sql               Stage 1 test accounts
```

## Database schema

Two migrations under `supabase/migrations/`:

1. **`…_init_schema.sql`** — all tables (training tree + outcomes), enums,
   `updated_at` triggers, and a trigger that links new auth users to their
   coach/client row by email.
2. **`…_rls_policies.sql`** — enables RLS on every table and adds the
   admin/coach/client policies via `SECURITY DEFINER` ownership helpers.

### Deliberate additions beyond the brief's column lists

These were required to make Supabase Auth + RLS work and are intentional:

- `coaches.user_id` / `clients.user_id` → links a row to an `auth.users` id so
  RLS can identify "me". Set automatically on first sign-in (matched by email).
- `metrics.client_id` (nullable) → set when a metric is client-specific
  (`is_global = false`); null for global/shared definitions. A `CHECK` enforces
  the pairing.
- `metric_entries.entered_by_coach_id` / `entered_by_client_id` → models the
  "coach OR client" author as two nullable FKs with a `CHECK` that exactly one
  is set (cleaner than a polymorphic column).

---

## Local setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Supabase project

1. Go to <https://supabase.com> → **New project**.
2. Once created, open **Project Settings → API** and copy:
   - **Project URL**
   - **anon / public** key
   - **service_role** key (optional for Stage 1; keep it secret)

### 3. Apply the database migrations

**Option A — Supabase SQL Editor (no CLI):**
Open **SQL Editor**, paste and run each file in `supabase/migrations/` in
order, then (optionally) `supabase/seed.sql` after editing the emails.

**Option B — Supabase CLI:**

```bash
npm i -g supabase           # if you don't have it
supabase login
supabase link --project-ref <your-project-ref>
supabase db push            # applies migrations/ to the linked project
```

For a fully local stack you can instead run `supabase start` then
`supabase db reset` (runs migrations + `seed.sql`).

### 4. Configure auth (magic link)

In the Supabase dashboard → **Authentication**:

- **Providers → Email**: ensure **Email** is enabled. Magic links work out of
  the box (no password needed).
- **URL Configuration**:
  - **Site URL**: `http://localhost:3000` for local (your Vercel URL in prod).
  - **Redirect URLs**: add `http://localhost:3000/auth/callback` (and your
    production `https://<your-app>/auth/callback`).

### 5. Environment variables

Copy `.env.example` to `.env.local` and fill it in:

```bash
cp .env.example .env.local
```

| Variable                         | Where to find it                       | Notes                          |
| -------------------------------- | -------------------------------------- | ------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`       | Supabase → Settings → API → Project URL | Public                         |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`  | Supabase → Settings → API → anon key    | Public; RLS protects data      |
| `SUPABASE_SERVICE_ROLE_KEY`      | Supabase → Settings → API → service_role | **Secret**, server-only, optional in Stage 1 |
| `NEXT_PUBLIC_SITE_URL`           | Your app's URL                          | `http://localhost:3000` locally |

### 6. Seed test accounts and run

1. Edit emails in `supabase/seed.sql` to addresses you can receive mail at, and
   run it (SQL Editor or `supabase db reset`).
2. Start the app:

   ```bash
   npm run dev
   ```

3. Open <http://localhost:3000>, click **Sign in**, enter the **coach** email,
   and follow the magic link. You should see a **Clients** page listing the one
   seeded test client. Sign in as the **admin** email to see **Coaches** + all
   clients; the **client** email to see empty **Training** / **Progress**.

That is the Stage 1 done-check: a test coach logs in and sees one test client
with correct `coach_id`-scoped access.

---

## Deploy to Vercel

1. Push this repo to GitHub.
2. In Vercel → **Add New… → Project** → import the repo. Framework preset:
   **Next.js** (auto-detected). Root directory: repository root.
3. Under **Settings → Environment Variables**, add the same four variables from
   `.env.local`, setting `NEXT_PUBLIC_SITE_URL` to your Vercel URL
   (e.g. `https://efpt-portal.vercel.app`).
4. **Deploy.**
5. Back in Supabase → **Authentication → URL Configuration**, add your Vercel
   URL as the **Site URL** and add `https://<your-app>/auth/callback` to the
   **Redirect URLs**.
6. Apply the migrations to your production Supabase project (Step 3 above)
   if you haven't already.

### What you must do by hand

- Create the Supabase project and apply the two migrations.
- Enable Email auth and set the Site URL + `…/auth/callback` redirect URLs (for
  both localhost and production).
- Provide the four env vars locally (`.env.local`) and in Vercel.
- Seed/insert at least one admin coach, one coach, and one client (by email).

## Security notes

- The `anon` key is meant to be public; **all** data access is gated by RLS.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser (no `NEXT_PUBLIC_`
  prefix) — it bypasses RLS.
- Middleware refreshes the session on every request and blocks unauthenticated
  access to app routes; each page additionally enforces its allowed role.
