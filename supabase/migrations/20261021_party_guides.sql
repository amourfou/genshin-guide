-- 원신 가이드: AI 파티 정리 결과 저장 표. 서버(service role) 전용.
-- RLS를 켜고 정책은 두지 않으며 anon/authenticated 권한은 모두 회수합니다.
-- 이 파일을 SQL Editor에서 먼저 적용한 뒤 앱을 배포합니다. 표가 없어도 앱은 AI 직접 호출로 동작합니다.

create table if not exists public.genshin_party_guides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  member_key text not null,
  brief_key text not null,
  body jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, brief_key)
);

create index if not exists genshin_party_guides_member_idx
  on public.genshin_party_guides (user_id, member_key, updated_at desc);

alter table public.genshin_party_guides enable row level security;

revoke all on public.genshin_party_guides from anon, authenticated;
grant select, insert, update, delete on public.genshin_party_guides to service_role;
