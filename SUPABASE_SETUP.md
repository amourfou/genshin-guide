# Supabase 설정

WordCatch와 같은 Supabase 프로젝트를 씁니다. 공유 `users` 테이블은 이 앱에서 쓰지 않습니다.

## 테이블

1. Supabase SQL Editor에서 `supabase-schema.sql`을 실행합니다.
2. `genshin_guides`가 생깁니다. 읽기는 공개, 쓰기는 SQL Editor로만 합니다.
3. `genshin_accounts`가 생깁니다. UID, 별칭, 호요랩 쿠키를 여기에 둡니다. 핸드폰과 컴퓨터가 같은 표를 읽어 계정을 바로 엽니다.

앱은 표가 없어도 동작합니다. `lib/guides.ts`가 기본 공략이고, `genshin_guides`에 같은 `character_id` 행이 있으면 그 캐릭터만 덮어씁니다. 계정 표가 없으면 계정은 그 브라우저에만 남습니다.

파티 구성은 데이터베이스에 넣지 않습니다.

`genshin_accounts`는 WordCatch 표와 같이 anon 키로 읽고 씁니다. 그 키는 사이트 안에 들어가므로, 이 표를 여는 사람은 저장된 호요랩 쿠키를 볼 수 있습니다. 쿠키를 무효로 하려면 호요랩에서 그 계정을 로그아웃합니다.

## 환경 변수

`.env.example`을 `.env.local`로 복사하고 WordCatch와 같은 URL, anon key를 넣습니다. Vercel에도 같은 두 값을 넣습니다.

## 실행

```bash
pnpm install
pnpm dev
```
