-- D Byk Product Academy: one new table in the dbyk-crm Supabase project.
-- Adds nothing to and changes nothing in the existing CRM tables.
create table public.academy_results (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  quiz text not null check (char_length(quiz) between 1 and 60),
  read boolean not null default false,
  best int check (best is null or best between 0 and 50),
  attempts int not null default 0 check (attempts >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, quiz)
);

alter table public.academy_results enable row level security;

-- Every signed-in CRM user can see the scoreboard.
create policy "academy read" on public.academy_results
  for select to authenticated using (true);

-- Only store managers (role staff) and owners can save scores, and only their own.
create policy "academy insert own" on public.academy_results
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('staff','owner'))
  );

create policy "academy update own" on public.academy_results
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('staff','owner'))
  );

grant select, insert, update on public.academy_results to authenticated;
