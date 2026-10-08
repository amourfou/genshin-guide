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
- **호요랩 쿠키**: 보유 캐릭터 전체와 이번 시즌 나선·환상극 파티를 가져옵니다. UID와 쿠키는 Supabase `genshin_accounts`에 저장해 다른 기기에서도 같은 계정을 엽니다.
- 필드에 지금 편성된 4인 파티는 공개 기록에 없습니다. 파티 화면에서 직접 짜고, 그 구성은 로그인한 이름에 저장되어 다른 기기에서 이어집니다.

## 기술

- Next.js 14, TypeScript, Tailwind CSS, pnpm
- PWA (`app/manifest.ts`, `public/sw.js`)
- Supabase는 공략 표 `genshin_guides`와 계정 표 `genshin_accounts`를 씁니다. `SUPABASE_SETUP.md`

## Git

https://github.com/amourfou/genshin-guide
