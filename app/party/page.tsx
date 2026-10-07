"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAccounts } from "@/components/AccountProvider";
import { GameImage } from "@/components/GameImage";
import { useProfile } from "@/components/ProfileProvider";
import { partyAdvice, resonances } from "@/lib/party";
import { ELEMENT_CLASS, ELEMENT_LABEL } from "@/lib/stats";
import type { CharacterBuild } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function PartyPage() {
  const { ready, active } = useAccounts();
  const { profile, loading } = useProfile();
  const [slots, setSlots] = useState<Array<number | null>>([null, null, null, null]);
  const [picking, setPicking] = useState<number | null>(null);

  useEffect(() => {
    if (!active) return;
    const raw = localStorage.getItem(`genshin-party:${active.id}`);
    if (!raw) {
      setSlots([null, null, null, null]);
      return;
    }
    try {
      const parsed = JSON.parse(raw) as Array<number | null>;
      if (Array.isArray(parsed) && parsed.length === 4) setSlots(parsed);
    } catch {
      setSlots([null, null, null, null]);
    }
  }, [active]);

  function update(next: Array<number | null>) {
    setSlots(next);
    if (active) localStorage.setItem(`genshin-party:${active.id}`, JSON.stringify(next));
  }

  const roster = useMemo(() => profile?.characters ?? [], [profile]);
  const chosen = useMemo(
    () => slots.map((id) => roster.find((character) => character.id === id) ?? null),
    [slots, roster]
  );
  const notes = resonances(chosen.map((character) => character?.element));
  const advice = partyAdvice(chosen);

  if (!ready) return null;
  if (!active) {
    return (
      <p className="text-sm text-muted-foreground">
        <Link href="/accounts" className="text-primary">계정</Link>을 먼저 추가하세요.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <section>
        <h1 className="font-display text-2xl font-semibold">파티</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          지금 필드에 편성된 4인은 공개 기록에 없습니다. 여기서 직접 짜고, 나선·환상극에서 가져온 파티와 비교합니다.
        </p>
      </section>

      <section className="rounded-3xl border border-border bg-card p-4">
        <h2 className="font-display text-xl font-semibold">내가 짠 파티</h2>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {chosen.map((character, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setPicking(index)}
              className="rounded-2xl bg-secondary p-2 text-center"
            >
              {character ? (
                <>
                  <GameImage src={character.icon} alt={character.name} className="mx-auto h-14 w-14 rounded-xl" />
                  <p className="mt-1 truncate text-xs font-medium">{character.name}</p>
                </>
              ) : (
                <span className="grid h-14 place-items-center text-xs text-muted-foreground">비움</span>
              )}
            </button>
          ))}
        </div>
        <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
          {notes.map((note) => (
            <li key={note.title}>
              <span className="font-medium text-foreground">{note.title}.</span> {note.detail}
            </li>
          ))}
          {advice.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>

      {picking != null && (
        <section className="rounded-3xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">{picking + 1}번 자리</h2>
            <button type="button" className="text-sm text-muted-foreground" onClick={() => setPicking(null)}>
              닫기
            </button>
          </div>
          <button
            type="button"
            className="mt-2 text-sm text-destructive"
            onClick={() => {
              const next = [...slots];
              next[picking] = null;
              update(next);
              setPicking(null);
            }}
          >
            이 자리 비우기
          </button>
          <div className="mt-3 grid max-h-80 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
            {roster.map((character) => (
              <PickerButton
                key={character.id}
                character={character}
                onPick={() => {
                  const next = [...slots];
                  const duplicate = next.findIndex((id) => id === character.id);
                  if (duplicate >= 0) next[duplicate] = null;
                  next[picking] = character.id;
                  update(next);
                  setPicking(null);
                }}
              />
            ))}
          </div>
          {loading && roster.length === 0 && <p className="mt-2 text-sm text-muted-foreground">명단을 불러오는 중입니다.</p>}
        </section>
      )}

      <TeamList title="최근 나선" teams={profile?.abyss ?? []} empty="쿠키가 있고 이번 시즌 기록이 있으면 12층·11층 파티가 나옵니다." />
      <TeamList title="환상극" teams={profile?.theater ?? []} empty="쿠키가 있고 이번 시즌 환상극 기록이 있으면 파티가 나옵니다." />
    </div>
  );
}

function PickerButton({ character, onPick }: { character: CharacterBuild; onPick: () => void }) {
  return (
    <button type="button" onClick={onPick} className="flex items-center gap-2 rounded-2xl bg-secondary px-2 py-2 text-left">
      <GameImage src={character.icon} alt="" className="h-10 w-10 rounded-lg" />
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">{character.name}</span>
        <span className={cn("text-[11px]", ELEMENT_CLASS[character.element])}>{ELEMENT_LABEL[character.element]}</span>
      </span>
    </button>
  );
}

function TeamList({
  title,
  teams,
  empty,
}: {
  title: string;
  teams: { source: string; characters: { id: number; name: string; icon: string; level: number }[] }[];
  empty: string;
}) {
  return (
    <section className="space-y-2">
      <h2 className="font-display text-xl font-semibold">{title}</h2>
      {teams.length === 0 && <p className="text-sm text-muted-foreground">{empty}</p>}
      {teams.map((team) => (
        <article key={team.source + team.characters.map((character) => character.id).join("-")} className="rounded-2xl border border-border bg-card p-3">
          <p className="text-sm font-medium">{team.source}</p>
          <div className="mt-2 flex gap-2 overflow-x-auto">
            {team.characters.map((character) => (
              <Link key={character.id} href={`/characters/${character.id}`} className="w-16 shrink-0 text-center">
                <GameImage src={character.icon} alt={character.name} className="mx-auto h-14 w-14 rounded-xl bg-secondary" />
                <p className="mt-1 truncate text-[11px]">{character.name}</p>
              </Link>
            ))}
          </div>
        </article>
      ))}
    </section>
  );
}
