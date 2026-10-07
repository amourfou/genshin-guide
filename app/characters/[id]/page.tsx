"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { GameImage } from "@/components/GameImage";
import { StatMarks } from "@/components/StatMarks";
import { useProfile } from "@/components/ProfileProvider";
import { graduationMarks } from "@/lib/graduation";
import { ELEMENT_CLASS, ELEMENT_LABEL, STAT_LABEL } from "@/lib/stats";
import type { ArtifactSlot, StatKey, StatLine } from "@/lib/types";
import { cn } from "@/lib/utils";

const SLOT_LABEL: Record<ArtifactSlot, string> = {
  flower: "꽃",
  plume: "깃털",
  sands: "시계",
  goblet: "성배",
  circlet: "왕관",
};

const SHOW_STATS = ["hp", "atk", "def", "em", "er", "cr", "cd", "heal"] as const;

export default function CharacterDetailPage() {
  const params = useParams<{ id: string }>();
  const { profile, loading } = useProfile();
  const character = profile?.characters.find((item) => String(item.id) === params.id);

  if (loading && !character) {
    return (
      <div className="space-y-3">
        <BackToList />
        <p className="text-sm text-muted-foreground">불러오는 중입니다.</p>
      </div>
    );
  }
  if (!character) {
    return (
      <div className="space-y-3">
        <BackToList />
        <p className="text-sm text-muted-foreground">이 캐릭터를 찾지 못했습니다.</p>
      </div>
    );
  }

  const dmg = character.stats
    ? Object.entries(character.stats.dmg).filter(([, value]) => (value ?? 0) > 0)
    : [];
  const marks = character.stats ? graduationMarks(character.id, character.stats) : [];
  const marked = new Set(marks.map((mark) => mark.key));

  return (
    <div className="space-y-4">
      <BackToList />
      <section className="flex gap-3 rounded-3xl border border-border bg-card p-4">
        <GameImage src={character.icon} alt={character.name} className="h-20 w-20 shrink-0 rounded-2xl bg-secondary" />
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold leading-tight">{character.name}</h1>
          <span className={cn("mt-1 inline-flex rounded-full px-2 py-0.5 text-xs ring-1", ELEMENT_CLASS[character.element])}>
            {ELEMENT_LABEL[character.element]} · {character.weaponType}
          </span>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Lv.{character.level} · 운명 {character.constellation} · 호감 {character.friendship}
            {character.talents
              ? ` · 특성 ${talentText(character.talents.normal)}/${talentText(character.talents.skill)}/${talentText(character.talents.burst)}`
              : ""}
          </p>
          <p className="mt-2 text-sm leading-6">{character.guide.headline}</p>
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-card p-4">
        <div className="flex items-start justify-between gap-3">
          <h2 className="min-w-0 font-display text-xl font-semibold leading-tight">가이드 · {character.guide.role}</h2>
          <span className="shrink-0 text-2xl font-semibold text-primary">{character.guide.score}</span>
        </div>
        <ul className="mt-3 space-y-2">
          {character.guide.checks.map((check) => (
            <li key={check.label} className="rounded-2xl bg-secondary/60 px-3 py-3 text-sm leading-6">
              <p className={check.ok ? "font-medium text-accent" : "font-medium text-destructive"}>
                {check.ok ? "맞음" : "손볼 곳"} · {check.label}
              </p>
              <p className="mt-1 text-muted-foreground">{check.detail}</p>
            </li>
          ))}
        </ul>
        {character.guide.suggestions.length > 0 && (
          <div className="mt-3 text-sm">
            <p className="font-medium">다음으로</p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-muted-foreground">
              {character.guide.suggestions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}
        <p className="mt-3 text-sm text-muted-foreground">{character.guide.teamNote}</p>
      </section>

      {character.stats && (
        <section className="rounded-3xl border border-border bg-card p-4">
          <h2 className="font-display text-xl font-semibold">전투 스탯</h2>
          <StatMarks marks={marks} />
          <dl className="mt-4 grid grid-cols-2 gap-2">
            {SHOW_STATS.filter((key) => !marked.has(key)).map((key) => (
              <div key={key} className="min-w-0 rounded-2xl bg-secondary/70 px-3 py-2.5">
                <dt className="text-xs text-muted-foreground">{STAT_LABEL[key]}</dt>
                <dd className="truncate font-semibold">{formatCombat(key, character.stats?.[key] ?? 0)}</dd>
              </div>
            ))}
            {dmg.map(([key, value]) => (
              <div key={key} className="min-w-0 rounded-2xl bg-secondary/70 px-3 py-2.5">
                <dt className="truncate text-xs text-muted-foreground">{STAT_LABEL[key as StatKey] ?? key}</dt>
                <dd className="truncate font-semibold">{Number(value).toFixed(1)}%</dd>
              </div>
            ))}
          </dl>
          {!character.showcase && (
            <p className="mt-2 text-xs text-muted-foreground">
              최종 합산 스탯은 전시에 올린 캐릭터에 한해 Enka가 계산합니다.
            </p>
          )}
        </section>
      )}

      {character.weapon && (
        <section className="flex gap-3 rounded-3xl border border-border bg-card p-4">
          <GameImage src={character.weapon.icon} alt={character.weapon.name} className="h-16 w-16 shrink-0 rounded-xl bg-secondary" />
          <div className="min-w-0">
            <h2 className="font-semibold leading-6">{character.weapon.name}</h2>
            <p className="text-sm leading-6 text-muted-foreground">
              {"★".repeat(character.weapon.rarity)} · Lv.{character.weapon.level} · 재련 {character.weapon.refinement}
            </p>
            <p className="text-sm leading-6">
              {character.weapon.main}
              {character.weapon.sub ? ` · ${character.weapon.sub}` : ""}
            </p>
          </div>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="font-display text-xl font-semibold">성유물</h2>
        {character.artifacts.length === 0 && (
          <p className="text-sm text-muted-foreground">성유물 정보가 없습니다.</p>
        )}
        {character.artifacts.map((artifact) => (
          <article key={`${artifact.slot}-${artifact.name}`} className="flex gap-3 rounded-2xl border border-border bg-card p-3">
            <GameImage src={artifact.icon} alt={artifact.name} className="h-14 w-14 shrink-0 rounded-xl bg-secondary" />
            <div className="min-w-0 flex-1 text-sm">
              <p className="text-xs text-muted-foreground">
                {SLOT_LABEL[artifact.slot]} · +{artifact.level}
              </p>
              <p className="font-medium leading-6">{artifact.setName}</p>
              <p className="leading-6">{statText(artifact.main)}</p>
              {artifact.subs.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {artifact.subs.map((sub, index) => (
                    <span
                      key={`${sub.key}-${index}`}
                      className="rounded-full bg-secondary px-2 py-0.5 text-xs leading-5 text-muted-foreground"
                    >
                      {statText(sub)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

function BackToList() {
  return (
    <Link
      href="/characters"
      className="-ml-2 inline-flex h-11 items-center gap-0.5 rounded-full pr-3 text-sm font-medium"
    >
      <ChevronLeft className="h-5 w-5 text-primary" />
      뒤로
    </Link>
  );
}

function talentText(level: number | undefined): string {
  return level ? String(level) : "—";
}

function statText(line: StatLine): string {
  const label = (STAT_LABEL[line.key] ?? line.key).replace(/%$/, "");
  return `${label} ${line.display}`;
}

function formatCombat(key: (typeof SHOW_STATS)[number], value: number): string {
  if (key === "hp" || key === "atk" || key === "def" || key === "em") return Math.round(value).toLocaleString("ko-KR");
  return `${value.toFixed(1)}%`;
}
