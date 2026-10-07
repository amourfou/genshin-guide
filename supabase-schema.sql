-- 원신 가이드 공략 표와 계정 표
-- WordCatch와 같은 Supabase 프로젝트의 SQL Editor에서 실행합니다.
-- 파티 구성은 넣지 않습니다. 그 값은 각 기기의 로컬 저장소에 남습니다.
-- genshin_guides 행이 있으면 lib/guides.ts 의 같은 character_id 를 덮어씁니다.
-- genshin_accounts 는 anon 키로 읽고 씁니다. 호요랩 쿠키가 그 키를 가진 요청에 보입니다.

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

drop policy if exists "public read genshin guides" on public.genshin_guides;
create policy "public read genshin guides"
  on public.genshin_guides
  for select
  using (true);

-- sets 예시:
-- [{"pieces":4,"aliases":["절연","emblem"]}]
-- sands/goblet/circlet 값: hp hp_ atk atk_ def def_ em er cr cd heal pyro hydro electro cryo anemo geo dendro physical

-- UID와 호요랩 쿠키. 같은 표를 읽는 기기는 계정을 그대로 엽니다.
create table if not exists public.genshin_accounts (
  id uuid primary key,
  label text not null,
  uid text not null,
  cookie text not null default '',
  active boolean not null default false,
  position integer not null default 0,
  updated_at timestamptz not null default now()
);

create unique index if not exists genshin_accounts_one_active
  on public.genshin_accounts (active)
  where active;

alter table public.genshin_accounts enable row level security;

drop policy if exists "genshin_accounts_all" on public.genshin_accounts;
create policy "genshin_accounts_all"
  on public.genshin_accounts
  for all
  using (true)
  with check (true);

grant select, insert, update, delete on public.genshin_accounts to anon, authenticated;
