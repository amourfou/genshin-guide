# Supabase 설정

WordCatch와 같은 Supabase 프로젝트를 씁니다. 공유 `users` 테이블은 이 앱에서 쓰지 않습니다.

## 테이블

1. Supabase SQL Editor에서 `supabase-schema.sql`을 실행합니다.
2. `genshin_guides`가 생깁니다. 읽기는 공개, 쓰기는 SQL Editor로만 합니다.

앱은 표가 없어도 동작합니다. `lib/guides.ts`가 기본 공략이고, 테이블에 같은 `character_id` 행이 있으면 그 캐릭터만 덮어씁니다.

## 환경 변수

`.env.example`을 `.env.local`로 복사하고 WordCatch와 같은 URL, anon key를 넣습니다.

쿠키, UID, 파티 구성은 데이터베이스에 저장하지 않습니다.

## 실행

```bash
pnpm install
pnpm dev
```
