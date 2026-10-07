"use client";

import Link from "next/link";
import { GameImage } from "@/components/GameImage";
import { ELEMENT_CLASS, ELEMENT_LABEL } from "@/lib/stats";
import type { CharacterBuild } from "@/lib/types";
import { cn } from "@/lib/utils";

export function CharacterCard({ character, compact = false }: { character: CharacterBuild; compact?: boolean }) {
  if (compact) {
    return (
      <Link
        href={`/characters/${character.id}`}
        className="flex min-h-[4.5rem] items-center gap-2 rounded-2xl border border-border bg-card px-2 py-2 shadow-sm active:border-primary/50"
      >
        <GameImage src={character.icon} alt="" className="h-11 w-11 shrink-0 rounded-xl bg-secondary" />
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-1">
            <span className="truncate text-sm font-medium">{character.name}</span>
            <span className="shrink-0 text-sm font-semibold tabular-nums text-primary">{character.guide.score}</span>
          </span>
          <span className={cn("mt-0.5 block truncate text-[11px]", ELEMENT_CLASS[character.element], "bg-transparent ring-0")}>
            {ELEMENT_LABEL[character.element]} · Lv.{character.level}
          </span>
        </span>
      </Link>
    );
  }

  return (
    <Link
      href={`/characters/${character.id}`}
      className="flex min-h-[4.5rem] gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm active:border-primary/50"
    >
      <GameImage
        src={character.icon}
        alt={character.name}
        className="h-16 w-16 shrink-0 rounded-xl bg-secondary"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-semibold">{character.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              Lv.{character.level} · 운명 {character.constellation}
              {character.weapon ? ` · ${character.weapon.name}` : ""}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">
            {character.guide.score}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className={cn("rounded-full px-2 py-0.5 text-[11px] ring-1", ELEMENT_CLASS[character.element])}>
            {ELEMENT_LABEL[character.element]}
          </span>
          <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-secondary-foreground">
            {character.guide.role}
          </span>
          {character.showcase && (
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">전시</span>
          )}
        </div>
      </div>
    </Link>
  );
}
