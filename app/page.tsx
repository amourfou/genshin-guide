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
      <section className="rounded-3xl border border-border bg-card p-6">
        <p className="font-display text-2xl font-semibold text-primary">내 빌드를 이 브라우저에서</p>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          UID만 넣으면 프로필에 전시한 캐릭터의 스탯·무기·성유물을 봅니다. 호요랩 쿠키를 이 기기에 저장하면
          보유 캐릭터 전체와 나선·환상극 파티까지 가져옵니다. 쿠키는 Supabase에 올리지 않습니다.
        </p>
        <Link
          href="/accounts"
          className="mt-5 inline-flex h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground"
        >
          계정 추가
        </Link>
      </section>
    );
  }

  const top = profile?.characters.slice(0, 6) ?? [];

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-primary">{profile?.player.server ?? "원신"}</p>
            <h1 className="font-display text-2xl font-semibold">{profile?.player.nickname ?? active.label}</h1>
            <p className="mt-1 text-sm text-muted-foreground">UID {active.uid}</p>
          </div>
          <button
            type="button"
            onClick={refresh}
            className="inline-flex h-10 items-center gap-1 rounded-full border border-border px-3 text-sm"
            disabled={loading}
          >
            <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            새로고침
          </button>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
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
        <div className="grid gap-2 sm:grid-cols-2">
          {top.map((character) => (
            <CharacterCard key={character.id} character={character} />
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-secondary/70 px-3 py-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}
