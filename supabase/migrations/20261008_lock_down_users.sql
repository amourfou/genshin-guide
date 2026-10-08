-- 선택: 공유 users 표를 anon 키에서 닫습니다.
-- 주의: users 는 WordCatch / ShortJapan / HaanRiver 와 같이 씁니다. 그 앱들이 anon 키로 users 를
-- 읽거나 쓰면 이 파일을 실행하는 순간 그 앱들의 로그인이 멈춥니다. 원신 가이드는 이 표를 서버에서만 읽으므로
-- 영향이 없습니다. 다른 앱 코드에서 from("users") 를 anon 키로 쓰는 곳이 없음을 확인한 다음에만 실행합니다.

begin;

alter table public.users enable row level security;

do $$
declare
  policy record;
begin
  for policy in
    select policyname from pg_policies where schemaname = 'public' and tablename = 'users'
  loop
    execute format('drop policy if exists %I on public.users', policy.policyname);
  end loop;
end $$;

revoke all on public.users from anon, authenticated;
grant select, insert, update, delete on public.users to service_role;

commit;
