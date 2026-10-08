"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAccounts } from "@/components/AccountProvider";
import { CharacterCard } from "@/components/CharacterCard";
import { useProfile } from "@/components/ProfileProvider";
import { ELEMENT_LABEL } from "@/lib/stats";
import type { ElementKey, HoyolabState, ProfilePayload } from "@/lib/types";
import { cn } from "@/lib/utils";

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

type View = "all" | "showcase";

const VIEW_KEY = "genshin-character-view";

/** Older cached payloads have no hoyolab field. */
function hoyolabOf(profile: ProfilePayload): HoyolabState {
  if (profile.hoyolab) return profile.hoyolab;
  return profile.usedHoyolab
    ? { status: "ok", message: "" }
    : { status: "no-cookie", message: "" };
}

export default function CharactersPage() {
  const { ready, active } = useAccounts();
  const { profile, loading, error } = useProfile();
  const [query, setQuery] = useState("");
  const [element, setElement] = useState<ElementKey | "all">("all");
  const [view, setView] = useState<View>("all");

  useEffect(() => {
    if (localStorage.getItem(VIEW_KEY) === "showcase") setView("showcase");
  }, []);

  function chooseView(next: View) {
    setView(next);
    localStorage.setItem(VIEW_KEY, next);
  }

  const hoyolab = profile ? hoyolabOf(profile) : null;
  const fullRoster = hoyolab?.status === "ok";
  const shownView: View = fullRoster ? view : "showcase";
  const allCount = profile?.characters.length ?? 0;
  const showcaseCount = profile?.characters.filter((character) => character.showcase).length ?? 0;

  const characters = useMemo(() => {
    const list = profile?.characters ?? [];
    return list.filter((character) => {
      if (shownView === "showcase" && !character.showcase) return false;
      const text = `${character.name} ${character.weapon?.name ?? ""}`.includes(query.trim());
      const elementOk = element === "all" || character.element === element;
      return text && elementOk;
    });
  }, [profile, query, element, shownView]);

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
          {profile ? `${characters.length}명` : "불러오는 중"}
          {profile?.usedHoyolab ? " · 호요랩 명단" : ""}
          {profile?.usedEnka ? " · 전시 스탯" : ""}
        </p>
      </div>
      {profile && (
        <div className="grid grid-cols-2 gap-1 rounded-full bg-secondary p-1" role="tablist" aria-label="보기">
          <button
            type="button"
            role="tab"
            aria-selected={shownView === "all"}
            disabled={!fullRoster}
            onClick={() => chooseView("all")}
            className={cn(
              "h-10 rounded-full text-sm disabled:opacity-50",
              shownView === "all" ? "bg-primary font-semibold text-primary-foreground" : "text-secondary-foreground"
            )}
          >
            전체 캐릭터{fullRoster ? ` ${allCount}` : ""}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={shownView === "showcase"}
            onClick={() => chooseView("showcase")}
            className={cn(
              "h-10 rounded-full text-sm",
              shownView === "showcase" ? "bg-primary font-semibold text-primary-foreground" : "text-secondary-foreground"
            )}
          >
            전시 캐릭터 {showcaseCount}
          </button>
        </div>
      )}
      {hoyolab && hoyolab.status !== "ok" && !loading && (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/10 px-3 py-3 text-sm leading-6">
          <p className="font-medium text-destructive">
            {hoyolab.status === "error"
              ? "호요랩 요청이 실패해 전시 캐릭터만 표시 중입니다."
              : "호요랩 쿠키가 없어 전시 캐릭터만 표시 중입니다."}
          </p>
          {hoyolab.message && <p className="text-muted-foreground">{hoyolab.message}</p>}
          <Link href="/accounts" className="mt-1 inline-flex min-h-11 items-center font-medium text-primary">
            계정 화면에서 쿠키 다시 넣기
          </Link>
        </div>
      )}
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
