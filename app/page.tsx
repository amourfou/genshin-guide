"use client";

import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { useAccounts } from "@/components/AccountProvider";
import { CharacterCard } from "@/components/CharacterCard";
import { useProfile } from "@/components/ProfileProvider";

export default function HomePage() {
  const { ready, active } = useAccounts();
  const { profile, loading, error, refresh } = useProfile();

  if (!ready) return <p className="text-sm text-muted-foreground">계정을 읽고 있습니다.</p>;

  if (!active) {
    return (
      <section className="rounded-3xl border border-border bg-card p-5">
        <p className="font-display text-2xl font-semibold leading-tight text-primary">내 빌드를 이 핸드폰에서</p>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          로그인한 이름에 UID를 등록합니다. UID만 넣으면 전시한 캐릭터를 보고, 호요랩 쿠키를 넣으면
          보유 캐릭터 전체와 나선·환상극 파티까지 가져옵니다.
        </p>
        <Link
          href="/accounts"
          className="mt-5 flex h-12 w-full items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground"
        >
          계정 추가
        </Link>
      </section>
    );
  }

  const top = profile?.characters.slice(0, 6) ?? [];

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-border bg-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-xs text-primary">{profile?.player.server ?? "원신"}</p>
            <h1 className="truncate font-display text-2xl font-semibold leading-tight">
              {profile?.player.nickname ?? active.label}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">UID {active.uid}</p>
          </div>
          <button
            type="button"
            onClick={refresh}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-border"
            aria-label="새로고침"
            disabled={loading}
          >
            <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          </button>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <Stat label="모험 등급" value={profile?.player.adventureRank ?? "—"} />
          <Stat label="세계 등급" value={profile?.player.worldLevel ?? "—"} />
          <Stat label="업적" value={profile?.player.achievements ?? "—"} />
          <Stat label="나선" value={profile?.player.abyss || "—"} />
        </dl>
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        {profile?.warnings.map((warning) => (
          <p key={warning} className="mt-2 text-sm text-muted-foreground">
            {warning}
          </p>
        ))}
      </section>

      <section className="space-y-2">
        <div className="flex items-end justify-between">
          <h2 className="font-display text-xl font-semibold">빌드 점수</h2>
          <Link href="/characters" className="text-sm text-primary">
            전체
          </Link>
        </div>
        {loading && top.length === 0 && <p className="text-sm text-muted-foreground">불러오는 중입니다.</p>}
        <div className="grid grid-cols-2 gap-2">
          {top.map((character) => (
            <CharacterCard key={character.id} character={character} compact />
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-0 rounded-2xl bg-secondary/70 px-3 py-2.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="truncate font-semibold">{value}</dd>
    </div>
  );
}
