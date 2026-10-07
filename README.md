# 원신 가이드

내 원신 계정의 캐릭터 스탯, 무기, 성유물, 파티를 보고 빌드가 추천과 맞는지 한글로 점검하는 웹앱입니다. 홈 화면에 설치하면 앱처럼 열립니다.

## 실행

```bash
pnpm install
pnpm dev
```

브라우저에서 http://localhost:3000 을 엽니다.

## 데이터

- **UID**: [Enka](https://enka.network)가 프로필 전시 캐릭터의 전투 스탯, 특성, 무기, 성유물을 줍니다. 게임에서 캐릭터 상세 정보 공개가 켜져 있어야 합니다.
- **호요랩 쿠키**: 보유 캐릭터 전체와 이번 시즌 나선·환상극 파티를 가져옵니다. 쿠키는 이 브라우저 로컬 저장소에만 저장합니다.
- 필드에 지금 편성된 4인 파티는 공개 기록에 없습니다. 파티 화면에서 직접 짜고 원소 공명과 역할을 봅니다.

## 기술

- Next.js 14, TypeScript, Tailwind CSS, pnpm
- PWA (`app/manifest.ts`, `public/sw.js`)
- Supabase는 공략 표 `genshin_guides`만 선택 사항입니다. `SUPABASE_SETUP.md`

## Git

로컬 저장소입니다. 원격은 따로 연결합니다.
