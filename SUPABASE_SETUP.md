# Supabase 설정

WordCatch와 같은 Supabase 프로젝트를 씁니다. 처음 화면은 공유 `users` 표의 이름과, 원신 가이드에서 따로 정하는 비밀번호로 로그인합니다. UID와 쿠키는 그 사용자에게 매입니다.

## 보안 구조

- 브라우저는 Supabase에 직접 붙지 않습니다. 모든 읽기·쓰기는 Next.js API 라우트(`app/api/*`)가 `SUPABASE_SERVICE_ROLE_KEY`로 합니다. 그 키는 `lib/server/db.ts`에만 있고 `server-only`로 막혀 있습니다.
- 호요랩 쿠키는 서버에만 저장됩니다. 계정 목록 API는 쿠키 값 대신 `hasCookie`와 길이만 돌려줍니다. 프로필 조회는 계정 id만 보내고, 서버가 쿠키를 꺼내 호요랩에 묻습니다.
- 로그인은 이름 + 비밀번호입니다. 처음 들어오는 이름은 비밀번호를 두 번 입력해 정합니다(`genshin_logins`). 5번 틀리면 10분 잠깁니다. 로그인하면 HttpOnly 서명 쿠키(`genshin_session`, 180일)가 생깁니다.
- 비밀번호를 잊으면 SQL Editor에서 `delete from public.genshin_logins where user_id = '...';` 후 다시 정합니다.

## 테이블

1. 새 프로젝트: SQL Editor에서 `supabase-schema.sql`을 실행합니다.
2. 이미 쓰던 프로젝트: 새 코드를 배포한 다음 `supabase/migrations/20261008_lock_down.sql`을 실행합니다. `genshin_logins`가 생기고, `genshin_accounts`/`genshin_parties`의 공개 정책이 사라집니다.
3. `supabase/migrations/20261008_lock_down_users.sql`은 공유 `users` 표를 anon 키에서 닫습니다. WordCatch 등 다른 앱이 anon 키로 `users`를 쓰지 않는지 확인한 다음에만 실행합니다.

`genshin_guides`는 읽기 공개, 쓰기는 SQL Editor로만 합니다. 앱은 표가 없어도 공략을 보여 줍니다.

## 환경 변수

`.env.example`을 `.env.local`로 복사합니다. Vercel(Production, Preview)에도 같은 값을 넣습니다.

- `NEXT_PUBLIC_SUPABASE_URL`: Project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Project Settings > API 의 service_role 키
- `OPENAI_API_KEY`: 파티 전투 설명
- `SESSION_SECRET`(선택): 세션 서명 키

## 실행

```bash
pnpm install
pnpm dev
```
