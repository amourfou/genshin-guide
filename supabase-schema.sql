-- 원신 가이드 공략 표와 계정 표
-- WordCatch와 같은 Supabase 프로젝트의 SQL Editor에서 실행합니다.
-- 파티 구성은 넣지 않습니다. 그 값은 각 기기의 로컬 저장소에 남습니다.
-- genshin_guides 행이 있으면 lib/guides.ts 의 같은 character_id 를 덮어씁니다.
-- genshin_accounts / genshin_parties / genshin_logins 는 서버(SUPABASE_SERVICE_ROLE_KEY)만 읽고 씁니다.
-- anon 키에는 정책도 권한도 주지 않습니다. 이미 만든 프로젝트는 supabase/migrations/20261008_lock_down.sql 을 실행합니다.

create table if not exists public.genshin_guides (
  character_id integer primary key,
  role text not null,
  scaling text not null check (scaling in ('atk', 'hp', 'def', 'em', 'heal')),
  sands text[] not null,
  goblet text[] not null,
  circlet text[] not null,
  sets jsonb not null,
  set_note text not null default '',
  substats text not null default '',
  er_min integer not null default 100,
  er_note text not null default '',
  talent_focus text not null default 'burst' check (talent_focus in ('normal', 'skill', 'burst')),
  talent_note text not null default '',
  weapon_note text not null default '',
  team_note text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.genshin_guides enable row level security;
revoke insert, update, delete on public.genshin_guides from anon, authenticated;

drop policy if exists "public read genshin guides" on public.genshin_guides;
create policy "public read genshin guides"
  on public.genshin_guides
  for select
  using (true);

-- sets 예시:
-- [{"pieces":4,"aliases":["절연","emblem"]}]
-- sands/goblet/circlet 값: hp hp_ atk atk_ def def_ em er cr cd heal pyro hydro electro cryo anemo geo dendro physical

-- UID와 호요랩 쿠키는 users.id 에 연결됩니다.
create table if not exists public.genshin_accounts (
  id uuid primary key,
  user_id uuid references public.users(id) on delete cascade,
  label text not null,
  uid text not null,
  cookie text not null default '',
  active boolean not null default false,
  position integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.genshin_accounts
  add column if not exists user_id uuid references public.users(id) on delete cascade;

-- 이미 저장돼 있던 UID와 쿠키는 광란의 사랑 계정으로 붙입니다.
update public.genshin_accounts
set user_id = (select id from public.users where name = '광란의 사랑')
where user_id is null
  and exists (select 1 from public.users where name = '광란의 사랑');

do $$
begin
  if not exists (select 1 from public.genshin_accounts where user_id is null) then
    alter table public.genshin_accounts alter column user_id set not null;
  end if;
end $$;

drop index if exists genshin_accounts_one_active;
create unique index if not exists genshin_accounts_one_active
  on public.genshin_accounts (user_id)
  where active;

alter table public.genshin_accounts enable row level security;

drop policy if exists "genshin_accounts_all" on public.genshin_accounts;
revoke all on public.genshin_accounts from anon, authenticated;
grant select, insert, update, delete on public.genshin_accounts to service_role;

-- 파티 화면에서 저장한 구성. 원신 계정 하나에 파일 하나.
create table if not exists public.genshin_parties (
  account_id uuid primary key references public.genshin_accounts(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.genshin_parties enable row level security;

drop policy if exists "genshin_parties_all" on public.genshin_parties;
revoke all on public.genshin_parties from anon, authenticated;
grant select, insert, update, delete on public.genshin_parties to service_role;

-- 원신 가이드 로그인 비밀번호. 이름마다 한 행, 처음 들어올 때 정합니다.
-- 비밀번호를 잊으면 이 표에서 그 user_id 행을 지우고, 다음 로그인에서 새로 정합니다.
create table if not exists public.genshin_logins (
  user_id uuid primary key references public.users(id) on delete cascade,
  secret_hash text not null,
  failed_count integer not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.genshin_logins enable row level security;
revoke all on public.genshin_logins from anon, authenticated;
grant select, insert, update, delete on public.genshin_logins to service_role;

-- users 표는 다른 앱과 같이 씁니다. 잠그려면 supabase/migrations/20261008_lock_down_users.sql 을 확인 후 실행합니다.
