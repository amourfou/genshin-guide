"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useAccounts } from "@/components/AccountProvider";
import { CharacterCard } from "@/components/CharacterCard";
import { useProfile } from "@/components/ProfileProvider";
import { ELEMENT_LABEL } from "@/lib/stats";
import type { ElementKey } from "@/lib/types";

const FILTERS: Array<ElementKey | "all"> = [
  "all",
  "pyro",
  "hydro",
  "electro",
  "cryo",
  "anemo",
  "geo",
  "dendro",
];

export default function CharactersPage() {
  const { ready, active } = useAccounts();
  const { profile, loading, error } = useProfile();
  const [query, setQuery] = useState("");
  const [element, setElement] = useState<ElementKey | "all">("all");

  const characters = useMemo(() => {
    const list = profile?.characters ?? [];
    return list.filter((character) => {
      const text = `${character.name} ${character.weapon?.name ?? ""}`.includes(query.trim());
      const elementOk = element === "all" || character.element === element;
      return text && elementOk;
    });
  }, [profile, query, element]);

  if (!ready) return null;
  if (!active) {
    return (
      <p className="text-sm text-muted-foreground">
        계정이 없습니다. <Link href="/accounts" className="text-primary">계정 화면</Link>에서 UID를 추가하세요.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <h1 className="font-display text-2xl font-semibold">캐릭터</h1>
        <p className="text-sm text-muted-foreground">
          {profile ? `${profile.characters.length}명` : "불러오는 중"}
          {profile?.usedHoyolab ? " · 호요랩 명단" : ""}
          {profile?.usedEnka ? " · 전시 스탯" : ""}
        </p>
      </div>
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="이름, 무기 검색"
        enterKeyHint="search"
        className="h-12 w-full rounded-2xl border border-input bg-card px-4 text-base outline-none ring-primary focus:ring-2"
      />
      <div className="scroll-row -mx-1 px-1 pb-1">
        {FILTERS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setElement(item)}
            className={`flex h-11 shrink-0 items-center rounded-full px-4 text-sm ${
              element === item ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
            }`}
          >
            {item === "all" ? "전체" : ELEMENT_LABEL[item]}
          </button>
        ))}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {loading && characters.length === 0 && <p className="text-sm text-muted-foreground">불러오는 중입니다.</p>}
      <div className="grid grid-cols-2 gap-2">
        {characters.map((character) => (
          <CharacterCard key={character.id} character={character} compact />
        ))}
      </div>
    </div>
  );
}
