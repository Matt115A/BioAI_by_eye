-- BioAI by eye: anonymous contributions.  Paste into Supabase → SQL editor → Run.
-- Design: append-only datapoints, no identifiers. No IP, user agent, name or email is stored; the date is kept to the month.
-- Withdrawal needs a random token that only the contributor's browser holds (we store its SHA-256, never the token).

create extension if not exists pgcrypto;

create table if not exists public.submissions (
  id              bigint generated always as identity primary key,
  game            text    not null check (game in ('nanopore', 'mutations', 'seq', 'struct')),
  app_version     text    not null check (length(app_version) <= 20),
  dataset_version text    not null check (length(dataset_version) <= 40),
  month           date    not null default date_trunc('month', now())::date,
  n               int     not null check (n between 20 and 1000),
  items           int[]   not null,
  responses       text    not null check (responses ~ '^[A-Z0-9]+$'),
  phases          text    not null check (phases ~ '^[0-9]+$'),
  rt              int[]   not null,
  delete_hash     text    not null check (delete_hash ~ '^[0-9a-f]{64}$'),
  check (cardinality(items) = n and length(responses) = n and length(phases) = n and cardinality(rt) = n)
);

alter table public.submissions enable row level security;

-- anyone may add a row; nobody (with the public key) may read, change or delete rows directly
drop policy if exists "anonymous insert" on public.submissions;
create policy "anonymous insert" on public.submissions for insert to anon with check (true);
revoke all on public.submissions from anon, authenticated;
grant insert (game, app_version, dataset_version, n, items, responses, phases, rt, delete_hash) on public.submissions to anon;

-- public, read-only view without the withdrawal hash
create or replace view public.public_submissions as
  select id, game, app_version, dataset_version, month, n, items, responses, phases, rt from public.submissions;
grant select on public.public_submissions to anon;

-- withdraw your own submission with the token your browser kept
create or replace function public.withdraw(token text) returns boolean
language sql security definer set search_path = public, extensions as $$   -- Supabase keeps pgcrypto's digest() in 'extensions'
  with d as (delete from public.submissions where delete_hash = encode(digest(token, 'sha256'), 'hex') returning 1)
  select exists(select 1 from d);
$$;
revoke all on function public.withdraw(text) from public;
grant execute on function public.withdraw(text) to anon;
