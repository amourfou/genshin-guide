"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { useAccounts } from "@/components/AccountProvider";
import { GameImage } from "@/components/GameImage";
import { useProfile } from "@/components/ProfileProvider";
import { useSession } from "@/components/SessionProvider";
import {
  blankSlots,
  createParty,
  nextPartyName,
  partyAdvice,
  partyMisfits,
  resonances,
  type PartyFile,
} from "@/lib/party";
import { parseCombatAnswer, partyBriefKey, partyCombatBrief, type PartyGuide } from "@/lib/partyBrief";
import { clearCombatCache, readCombatCache, writeCombatCache } from "@/lib/partyCombatCache";
import { queuePartySave, reconcileParty } from "@/lib/partySync";
import { readStoredParty, writeStoredParty } from "@/lib/partyStore";
import { ELEMENT_CLASS, ELEMENT_LABEL } from "@/lib/stats";
import type { CharacterBuild } from "@/lib/types";
import { cn } from "@/lib/utils";

const PARTY_LIMIT = 8;

function GuideSections({ guide }: { guide: PartyGuide }) {
  return (
    <div className="mt-3 space-y-4">
      <section>
        <h4 className="text-sm font-semibold">부족한 점</h4>
        <ul className="mt-1 space-y-1">
          {guide.gaps.map((gap, index) => (
            <li key={`${gap}-${index}`} className="text-sm leading-6 text-muted-foreground">
              {gap}
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h4 className="text-sm font-semibold">교체</h4>
        {guide.swaps.length === 0 ? (
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{keptLine(guide)}</p>
        ) : (
          <ul className="mt-1 space-y-2">
            {guide.swaps.map((swap, index) => (
              <li key={`${swap.out}-${swap.inn}-${index}`} className="rounded-2xl bg-secondary/70 px-3 py-3">
                <p className="text-sm font-medium leading-6">
                  {swap.out} → {swap.inn}
                </p>
                <p className="text-sm leading-6 text-muted-foreground">{swap.reason}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h4 className="text-sm font-semibold">장비</h4>
        {guide.gear.length === 0 ? (
          <p className="mt-1 text-sm leading-6 text-muted-foreground">지금 장비로 충분합니다.</p>
        ) : (
          <ul className="mt-1 space-y-2">
            {guide.gear.map((item, index) => (
              <li key={`${item.name}-${item.item}-${index}`} className="rounded-2xl bg-secondary/70 px-3 py-3">
                <p className="text-sm font-medium leading-6">
                  {item.name} · {item.item}
                </p>
                <p className="text-sm leading-6">
                  {item.now} → {item.goal}
                </p>
                <p className="text-sm leading-6 text-muted-foreground">{item.reason}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h4 className="text-sm font-semibold">추천 조합</h4>
        <div className="mt-1 grid grid-cols-2 gap-2">
          {guide.lineup.map((slot, index) => (
            <div key={`${slot.name}-${index}`} className="rounded-2xl bg-secondary/70 px-3 py-3">
              <p className="text-[11px] text-muted-foreground">
                {index + 1}번{slot.state === "추가" ? " · 추가" : ""}
              </p>
              <p className="text-sm font-medium leading-6">{slot.name}</p>
              <p className="text-[11px] text-muted-foreground">{slot.role}</p>
            </div>
          ))}
        </div>
      </section>
      <section>
        <h4 className="text-sm font-semibold">전투 운용</h4>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">추천 조합의 버튼 순서입니다.</p>
        <ol className="mt-2 space-y-2">
          {guide.steps.map((step, index) => (
            <li key={`${step.title}-${index}`} className="flex gap-3 rounded-2xl bg-secondary/70 px-3 py-3">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                {index + 1}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium leading-6">{step.title}</span>
                <span className="mt-0.5 block text-sm leading-6 text-muted-foreground">{step.detail}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>
      {guide.note && <p className="text-sm leading-6 text-muted-foreground">{guide.note}</p>}
      {guide.sources.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {guide.sources.map((href) => (
            <a
              key={href}
              href={href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 items-center rounded-full bg-secondary px-3 text-sm text-primary"
            >
              {sourceLabel(href)}
            </a>
          ))}
        </div>
      )}
      <p className="text-xs leading-5 text-muted-foreground">
        지금 스탯과 정리 규칙에 맞춰 순서를 정했습니다. 모르는 항목만 검색합니다. 한 바퀴가 끝나면 같은 순서로 다시 돌립니다. 쿨다운과 적 수에 따라 원소폭발은 빼도 됩니다.
      </p>
    </div>
  );
}

function keptLine(guide: PartyGuide): string {
  const names = guide.lineup.filter((slot) => slot.state === "추가").map((slot) => slot.name);
  if (names.length === 0) return "지금 멤버를 유지합니다.";
  const last = names[names.length - 1];
  const list = names.length === 1 ? last : `${names.slice(0, -1).join(", ")}, ${last}`;
  return `${list}${objectParticle(last)} 추천 조합에 더합니다.`;
}

function objectParticle(name: string): string {
  const code = name.charCodeAt(name.length - 1);
  if (code < 0xac00 || code > 0xd7a3) return "을";
  return (code - 0xac00) % 28 === 0 ? "를" : "을";
}

function sourceLabel(href: string): string {
  try {
    const url = new URL(href);
    const host = url.hostname.replace(/^www\./, "");
    const slug = url.pathname.split("/").filter(Boolean).pop()?.replace(/[-_]/g, " ") ?? "";
    const label = slug ? `${host} · ${slug}` : host;
    return label.length > 42 ? `${label.slice(0, 41)}…` : label;
  } catch {
    return "출처";
  }
}

export default function PartyPage() {
  const { ready, active } = useAccounts();
  const { user } = useSession();
  const { profile, loading } = useProfile();
  const [file, setFile] = useState<PartyFile | null>(null);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [picking, setPicking] = useState<number | null>(null);
  const [pickQuery, setPickQuery] = useState("");
  const [combatAttempt, setCombatAttempt] = useState(0);
  const [combatStatus, setCombatStatus] = useState<"idle" | "loading" | "error">("idle");
  const [combatAnswer, setCombatAnswer] = useState<(PartyGuide & { key: string }) | null>(null);
  const edited = useRef(false);

  const activeId = active?.id ?? null;
  useEffect(() => {
    if (!activeId) return;
    edited.current = false;
    const local = readStoredParty(activeId);
    setFile(local.file);
    setLoadedFor(activeId);
    const userId = user?.id;
    if (!userId) return;
    let cancel = false;
    void reconcileParty(userId, activeId).then((next) => {
      if (cancel || edited.current) return;
      setFile(next);
    });
    return () => {
      cancel = true;
    };
  }, [activeId, user?.id]);

  useEffect(() => {
    if (picking == null) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [picking]);

  function commit(next: PartyFile) {
    edited.current = true;
    setFile(next);
    if (!active) return;
    const updatedAt = writeStoredParty(active.id, next);
    if (user) void queuePartySave(user.id, active.id, next, updatedAt);
  }

  const roster = useMemo(() => profile?.characters ?? [], [profile]);
  const visibleRoster = useMemo(() => {
    const query = pickQuery.trim();
    if (!query) return roster;
    return roster.filter((character) => `${character.name} ${character.weapon?.name ?? ""}`.includes(query));
  }, [roster, pickQuery]);
  const party = file?.parties.find((item) => item.id === file.activeId) ?? file?.parties[0] ?? null;
  const slots = party?.slots ?? blankSlots();
  const chosen = useMemo(
    () => slots.map((id) => roster.find((character) => character.id === id) ?? null),
    [slots, roster]
  );
  const notes = resonances(chosen.map((character) => character?.element));
  const misfits = useMemo(() => partyMisfits(chosen), [chosen]);
  const advice = partyAdvice(chosen);
  const brief = useMemo(() => partyCombatBrief(chosen), [chosen]);
  const briefKey = useMemo(() => partyBriefKey(brief), [brief]);
  const pickMisfit = useMemo(() => {
    const reasons = new Map<number, string>();
    if (picking == null) return reasons;
    for (const character of roster) {
      const preview = chosen.map((member, index) => {
        if (index === picking) return character;
        if (member?.id === character.id) return null;
        return member;
      });
      const hit = partyMisfits(preview).find((item) => item.id === character.id);
      if (hit) reasons.set(character.id, hit.reason);
    }
    return reasons;
  }, [picking, chosen, roster]);

  useEffect(() => {
    if (brief.length < 2) {
      setCombatAnswer(null);
      setCombatStatus("idle");
      return;
    }
    const cached = readCombatCache(briefKey);
    if (cached) {
      setCombatAnswer({ key: briefKey, ...cached });
      setCombatStatus("idle");
      return;
    }
    const controller = new AbortController();
    setCombatStatus("loading");
    setCombatAnswer(null);
    const timer = window.setTimeout(() => {
      void fetch("/api/party-combat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ members: brief }),
        signal: controller.signal,
      })
        .then(async (response) => {
          if (!response.ok) throw new Error(String(response.status));
          return response.json() as Promise<unknown>;
        })
        .then((body) => {
          const guide = parseCombatAnswer(body);
          if (controller.signal.aborted || !guide) {
            if (!controller.signal.aborted) setCombatStatus("error");
            return;
          }
          const rawSources = body && typeof body === "object" ? (body as { sources?: unknown }).sources : undefined;
          if (Array.isArray(rawSources)) {
            for (const source of rawSources) {
              if (guide.sources.length >= 4) break;
              if (typeof source === "string" && source.startsWith("https://") && !guide.sources.includes(source)) {
                guide.sources.push(source);
              }
            }
          }
          writeCombatCache(briefKey, guide);
          setCombatAnswer({ key: briefKey, ...guide });
          setCombatStatus("idle");
        })
        .catch(() => {
          if (!controller.signal.aborted) setCombatStatus("error");
        });
    }, 450);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [brief, briefKey, combatAttempt]);

  function retryCombat() {
    clearCombatCache(briefKey);
    setCombatAnswer(null);
    setCombatAttempt((value) => value + 1);
  }

  function replaceParty(nextParty: NonNullable<typeof party>) {
    if (!file) return;
    commit({
      ...file,
      parties: file.parties.map((item) => (item.id === nextParty.id ? nextParty : item)),
    });
  }

  function updateSlot(index: number, id: number | null) {
    if (!party) return;
    const nextSlots = [...party.slots];
    if (id != null) {
      const duplicate = nextSlots.findIndex((slot) => slot === id);
      if (duplicate >= 0) nextSlots[duplicate] = null;
    }
    nextSlots[index] = id;
    replaceParty({ ...party, slots: nextSlots });
  }

  if (!ready) return null;
  if (!active) {
    return (
      <p className="text-sm text-muted-foreground">
        <Link href="/accounts" className="text-primary">계정</Link>을 먼저 추가하세요.
      </p>
    );
  }
  if (!file || !party || loadedFor !== active.id) return null;

  const liveCombat = combatAnswer?.key === briefKey ? combatAnswer : null;
  const filledCount = slots.filter((id) => id != null).length;
  const combatMessage =
    filledCount === 0
      ? "캐릭터를 넣으면 부족한 점과 버튼 순서가 여기에 나옵니다."
      : brief.length === 0 && loading
        ? "캐릭터 정보를 불러오는 중"
        : brief.length < 2
          ? "한 명 더 넣으면 조합과 버튼 순서를 정리합니다."
          : liveCombat
            ? ""
            : combatStatus === "error"
              ? "정리를 불러오지 못했습니다."
              : "캐릭터와 스탯을 보고 파티를 정리하는 중";
  const atLimit = file.parties.length >= PARTY_LIMIT;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={atLimit ? `파티는 ${PARTY_LIMIT}개까지` : "파티 추가"}
          disabled={atLimit}
          onClick={() => {
            const added = createParty(nextPartyName(file.parties));
            commit({ activeId: added.id, parties: [...file.parties, added] });
          }}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-border disabled:opacity-50"
        >
          <Plus className="h-5 w-5" />
        </button>
        <div className="scroll-row min-w-0 flex-1">
          {file.parties.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => commit({ ...file, activeId: item.id })}
              className={cn(
                "flex h-11 shrink-0 items-center rounded-full px-4 text-sm",
                item.id === party.id ? "bg-primary font-semibold text-primary-foreground" : "bg-secondary text-secondary-foreground"
              )}
            >
              {item.name}
            </button>
          ))}
        </div>
      </div>

      <section className="rounded-3xl border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <input
            aria-label="파티 이름"
            value={party.name}
            onChange={(event) => replaceParty({ ...party, name: event.target.value })}
            onBlur={() => {
              if (!party.name.trim()) replaceParty({ ...party, name: nextPartyName(file.parties.filter((item) => item.id !== party.id)) });
            }}
            className="h-12 min-w-0 flex-1 rounded-2xl border border-input bg-background px-4 text-base outline-none ring-primary focus:ring-2"
          />
          {file.parties.length > 1 && (
            <button
              type="button"
              className="h-12 shrink-0 rounded-2xl px-3 text-sm text-destructive"
              onClick={() => {
                if (!window.confirm(`${party.name}을 삭제할까요?`)) return;
                const parties = file.parties.filter((item) => item.id !== party.id);
                commit({ activeId: parties[0].id, parties });
              }}
            >
              삭제
            </button>
          )}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {chosen.map((character, index) => (
            <button
              key={index}
              type="button"
              onClick={() => {
                setPickQuery("");
                setPicking(index);
              }}
              className={cn(
                "flex min-h-[4.75rem] items-center gap-3 rounded-2xl bg-secondary px-3 py-2 text-left",
                character && misfits.some((item) => item.id === character.id) && "ring-1 ring-destructive/70"
              )}
            >
              {character ? (
                <>
                  <GameImage src={character.icon} alt="" className="h-14 w-14 shrink-0 rounded-xl" />
                  <span className="min-w-0">
                    <span className="block text-[11px] text-muted-foreground">{index + 1}번</span>
                    <span className="block truncate text-sm font-medium">{character.name}</span>
                    <span className={cn("text-[11px]", ELEMENT_CLASS[character.element])}>
                      {ELEMENT_LABEL[character.element]}
                    </span>
                    {misfits.some((item) => item.id === character.id) && (
                      <span className="block text-[11px] font-medium text-destructive">맞지 않음</span>
                    )}
                  </span>
                </>
              ) : (
                <>
                  <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl border border-dashed border-border text-lg text-muted-foreground">
                    +
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[11px] text-muted-foreground">{index + 1}번</span>
                    <span className="block text-sm text-muted-foreground">넣기</span>
                  </span>
                </>
              )}
            </button>
          ))}
        </div>
        {misfits.length > 0 && (
          <ul className="mt-3 space-y-2">
            {misfits.map((item) => (
              <li key={item.id} className="rounded-2xl bg-destructive/10 px-3 py-2 text-sm font-medium leading-6 text-destructive">
                {item.text}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4 flex items-center justify-between gap-3">
          <h3 className="font-display text-lg font-semibold">파티 정리</h3>
          {brief.length >= 2 && combatStatus !== "loading" && (liveCombat || combatStatus === "error") && (
            <button type="button" className="h-11 shrink-0 rounded-full px-3 text-sm text-primary" onClick={retryCombat}>
              다시 정리
            </button>
          )}
        </div>
        {combatMessage && <p className="mt-2 text-sm leading-6 text-muted-foreground">{combatMessage}</p>}
        {liveCombat && <GuideSections guide={liveCombat} />}
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
        <div className="fixed inset-0 z-40 flex items-end justify-center">
          <button type="button" className="absolute inset-0 bg-black/55" aria-label="닫기" onClick={() => setPicking(null)} />
          <div className="safe-x relative flex w-full max-w-lg flex-col rounded-t-3xl border border-border bg-card pb-[var(--safe-bottom)] shadow-2xl">
            <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-border" />
            <div className="flex items-center justify-between pt-3">
              <h2 className="font-display text-lg font-semibold">{picking + 1}번 자리</h2>
              <button
                type="button"
                className="h-11 rounded-full px-3 text-sm text-muted-foreground"
                onClick={() => setPicking(null)}
              >
                닫기
              </button>
            </div>
            <input
              value={pickQuery}
              onChange={(event) => setPickQuery(event.target.value)}
              placeholder="이름, 무기 검색"
              enterKeyHint="search"
              className="h-12 w-full rounded-2xl border border-input bg-background px-4 text-base outline-none ring-primary focus:ring-2"
            />
            <button
              type="button"
              className="mt-2 h-11 text-left text-sm text-destructive"
              onClick={() => {
                updateSlot(picking, null);
                setPicking(null);
              }}
            >
              이 자리 비우기
            </button>
            <div className="mt-1 grid max-h-[min(24rem,calc(70dvh-11rem))] grid-cols-2 gap-2 overflow-y-auto overscroll-contain pb-4">
              {visibleRoster.map((character) => (
                <PickerButton
                  key={character.id}
                  character={character}
                  unfit={pickMisfit.get(character.id) ?? null}
                  onPick={() => {
                    updateSlot(picking, character.id);
                    setPicking(null);
                  }}
                />
              ))}
              {loading && roster.length === 0 && (
                <p className="col-span-2 py-6 text-center text-sm text-muted-foreground">명단을 불러오는 중입니다.</p>
              )}
              {!loading && visibleRoster.length === 0 && (
                <p className="col-span-2 py-6 text-center text-sm text-muted-foreground">찾는 캐릭터가 없습니다.</p>
              )}
            </div>
          </div>
        </div>
      )}

      <TeamList title="최근 나선" teams={profile?.abyss ?? []} empty="쿠키가 있고 이번 시즌 기록이 있으면 12층·11층 파티가 나옵니다." />
      <TeamList title="환상극" teams={profile?.theater ?? []} empty="쿠키가 있고 이번 시즌 환상극 기록이 있으면 파티가 나옵니다." />
    </div>
  );
}

function PickerButton({
  character,
  unfit,
  onPick,
}: {
  character: CharacterBuild;
  unfit: string | null;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      className={cn(
        "flex min-h-14 items-center gap-2 rounded-2xl bg-secondary px-2 py-2 text-left",
        unfit && "ring-1 ring-destructive/70"
      )}
    >
      <GameImage src={character.icon} alt="" className="h-11 w-11 shrink-0 rounded-xl" />
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">{character.name}</span>
        <span className={cn("block truncate text-[11px]", ELEMENT_CLASS[character.element], "bg-transparent ring-0")}>
          {ELEMENT_LABEL[character.element]} · Lv.{character.level}
        </span>
        {unfit && <span className="block truncate text-[11px] font-medium text-destructive">맞지 않음 · {unfit}</span>}
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
          <div className="scroll-row mt-2 pb-1">
            {team.characters.map((character) => (
              <Link key={character.id} href={`/characters/${character.id}`} className="w-[4.5rem] shrink-0 text-center">
                <GameImage src={character.icon} alt={character.name} className="mx-auto h-16 w-16 rounded-2xl bg-secondary" />
                <p className="mt-1 truncate text-xs">{character.name}</p>
              </Link>
            ))}
          </div>
        </article>
      ))}
    </section>
  );
}
