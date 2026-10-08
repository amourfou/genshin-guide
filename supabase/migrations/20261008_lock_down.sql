-- 원신 가이드: 호요랩 쿠키와 계정·파티 표를 서버 전용으로 잠급니다.
-- 이 파일은 Vercel에 SUPABASE_SERVICE_ROLE_KEY 를 넣고, 그 키를 쓰는 코드(security/server-cookies)를
-- 배포한 다음에 SQL Editor에서 실행합니다. 먼저 실행하면 지금 배포된 앱은 계정을 못 읽습니다.
-- service_role 키는 RLS를 건너뛰므로 서버 API는 그대로 읽고 씁니다. anon 키로는 아무것도 못 읽습니다.
-- genshin_guides 의 공개 읽기는 그대로 둡니다. users 표는 다른 앱과 같이 쓰므로 20261008_lock_down_users.sql 에서 따로 다룹니다.

begin;

-- 이름마다 원신 가이드 비밀번호. 처음 들어올 때 정합니다. 초기화는 이 표에서 그 행을 지웁니다.
create table if not exists public.genshin_logins (
  user_id uuid primary key references public.users(id) on delete cascade,
  secret_hash text not null,
  failed_count integer not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.genshin_logins enable row level security;
alter table public.genshin_accounts enable row level security;
alter table public.genshin_parties enable row level security;

drop policy if exists "genshin_accounts_all" on public.genshin_accounts;
drop policy if exists "genshin_parties_all" on public.genshin_parties;

revoke all on public.genshin_logins from anon, authenticated;
revoke all on public.genshin_accounts from anon, authenticated;
revoke all on public.genshin_parties from anon, authenticated;

grant select, insert, update, delete on public.genshin_logins to service_role;
grant select, insert, update, delete on public.genshin_accounts to service_role;
grant select, insert, update, delete on public.genshin_parties to service_role;

-- 공략 표: 읽기만 공개, 쓰기는 SQL Editor(또는 service_role)만.
alter table public.genshin_guides enable row level security;
revoke insert, update, delete on public.genshin_guides from anon, authenticated;

commit;

-- 확인: 아래 결과에 genshin_accounts / genshin_parties / genshin_logins 정책이 없어야 합니다.
-- select tablename, policyname, roles, cmd from pg_policies where schemaname = 'public' and tablename like 'genshin_%';
