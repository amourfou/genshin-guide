import {
  catalogElement,
  characterName,
  iconFromSide,
  lookupCatalog,
  prettySideName,
  rarityFromQuality,
} from "@/lib/catalog";
import { evaluateBuild } from "@/lib/guide";
import { compareByLevel } from "@/lib/roster";
import {
  classifyStatName,
  elementFromGame,
  formatStat,
  isPercentStat,
  parseNumber,
  round1,
  weaponLabel,
} from "@/lib/stats";
import type {
  ArtifactInfo,
  ArtifactSlot,
  CharacterBuild,
  CombatStats,
  ElementKey,
  GuideTemplate,
  PartyMember,
  PartySnapshot,
  PlayerSummary,
  ProfilePayload,
  StatKey,
  StatLine,
  TalentInfo,
  WeaponInfo,
} from "@/lib/types";
import { setNameFromIcon } from "@/lib/sets";
import { serverLabel } from "@/lib/uid";
import { weaponNameFromIcon } from "@/lib/weapons";

const FIGHT_PROP: Record<string, StatKey> = {
  "2000": "hp",
  "2001": "atk",
  "2002": "def",
  "28": "em",
  "20": "cr",
  "22": "cd",
  "23": "er",
  "26": "heal",
  "30": "physical",
  "40": "pyro",
  "41": "electro",
  "42": "hydro",
  "43": "dendro",
  "44": "anemo",
  "45": "geo",
  "46": "cryo",
};

const RATIO_PROPS = new Set(["20", "22", "23", "26", "30", "40", "41", "42", "43", "44", "45", "46"]);

const ENKA_SLOT: Record<string, ArtifactSlot> = {
  EQUIP_BRACER: "flower",
  EQUIP_NECKLACE: "plume",
  EQUIP_SHOES: "sands",
  EQUIP_RING: "goblet",
  EQUIP_DRESS: "circlet",
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function num(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function str(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function line(key: StatKey, value: number): StatLine {
  return { key, value: round1(value), display: formatStat(key, value) };
}

function lineFromNamed(name: string, raw: string | number): StatLine | null {
  let key = classifyStatName(name);
  if (!key) return null;
  const value = parseNumber(raw);
  const text = str(raw);
  if ((key === "hp" || key === "atk" || key === "def") && (text.includes("%") || name.includes("%"))) {
    key = key === "hp" ? "hp_" : key === "atk" ? "atk_" : "def_";
  }
  return { key, value: round1(value), display: text.includes("%") || isPercentStat(key) ? formatStat(key, value) : formatStat(key, value) };
}

function slotFromHoyo(pos: number, posName: string): ArtifactSlot {
  if (pos === 1) return "flower";
  if (pos === 2) return "plume";
  if (pos === 3) return "sands";
  if (pos === 4) return "goblet";
  if (pos === 5) return "circlet";
  const name = posName.toLowerCase();
  if (name.includes("꽃") || name.includes("flower")) return "flower";
  if (name.includes("깃") || name.includes("plume") || name.includes("feather")) return "plume";
  if (name.includes("모래") || name.includes("sand") || name.includes("시계")) return "sands";
  if (name.includes("잔") || name.includes("성배") || name.includes("goblet") || name.includes("cup")) return "goblet";
  return "circlet";
}

function emptyStats(): CombatStats {
  return { hp: 0, atk: 0, def: 0, em: 0, er: 100, cr: 5, cd: 50, heal: 0, dmg: {} };
}

function applyStat(stats: CombatStats, key: StatKey, value: number) {
  if (key === "hp") stats.hp = value;
  else if (key === "atk") stats.atk = value;
  else if (key === "def") stats.def = value;
  else if (key === "em") stats.em = value;
  else if (key === "er") stats.er = value;
  else if (key === "cr") stats.cr = value;
  else if (key === "cd") stats.cd = value;
  else if (key === "heal") stats.heal = value;
  else if (key === "physical") stats.dmg.physical = value;
  else if (
    key === "pyro" ||
    key === "hydro" ||
    key === "electro" ||
    key === "cryo" ||
    key === "anemo" ||
    key === "geo" ||
    key === "dendro"
  ) {
    stats.dmg[key] = value;
  }
}

function iconUrl(raw: string): string {
  if (!raw) return "";
  if (raw.startsWith("http")) return raw;
  if (raw.startsWith("//")) return `https:${raw}`;
  return `https://enka.network/ui/${raw}.png`;
}

function propInfoName(propertyMap: Record<string, unknown>, propertyType: unknown): string {
  const info = asRecord(propertyMap[str(propertyType)]);
  return str(info?.name || info?.filter_name);
}

function hoyoStatLine(
  propertyMap: Record<string, unknown>,
  prop: Record<string, unknown> | null
): StatLine | null {
  if (!prop) return null;
  const name = propInfoName(propertyMap, prop.property_type);
  const raw = str(prop.final || prop.value || prop.base || "0");
  return lineFromNamed(name, raw);
}

function readHoyoCharacter(raw: unknown, propertyMap: Record<string, unknown>): Omit<CharacterBuild, "guide"> | null {
  const row = asRecord(raw);
  if (!row) return null;
  const base = asRecord(row.base) ?? row;
  const id = num(base.id ?? row.id ?? base.avatar_id);
  if (!id) return null;
  const catalog = lookupCatalog(id);
  const element = elementFromGame(str(base.element || row.element)) !== "none"
    ? elementFromGame(str(base.element || row.element))
    : catalogElement(catalog);

  const weaponRaw = asRecord(row.weapon);
  let weapon: WeaponInfo | null = null;
  if (weaponRaw) {
    const main = hoyoStatLine(propertyMap, asRecord(weaponRaw.main_property));
    const sub = hoyoStatLine(propertyMap, asRecord(weaponRaw.sub_property));
    const refinement = num(weaponRaw.affix_level);
    weapon = {
      id: num(weaponRaw.id),
      name: str(weaponRaw.name) || "무기",
      rarity: num(weaponRaw.rarity) || 4,
      level: num(weaponRaw.level),
      refinement: refinement >= 1 ? refinement : refinement + 1,
      icon: iconUrl(str(weaponRaw.icon)),
      main: main?.display ?? "",
      sub: sub?.display ?? "",
    };
  }

  const artifacts: ArtifactInfo[] = [];
  for (const relic of asArray(row.relics ?? row.reliquaries)) {
    const relicRow = asRecord(relic);
    if (!relicRow) continue;
    const set = asRecord(relicRow.set);
    const main = hoyoStatLine(propertyMap, asRecord(relicRow.main_property));
    if (!main) continue;
    const subs = asArray(relicRow.sub_property_list)
      .map((sub) => hoyoStatLine(propertyMap, asRecord(sub)))
      .filter((sub): sub is StatLine => Boolean(sub));
    artifacts.push({
      slot: slotFromHoyo(num(relicRow.pos), str(relicRow.pos_name)),
      name: str(relicRow.name),
      setName: str(set?.name),
      rarity: num(relicRow.rarity),
      level: num(relicRow.level),
      icon: iconUrl(str(relicRow.icon)),
      main,
      subs,
    });
  }

  const talents = readHoyoTalents(asArray(row.skills), catalog?.talents);
  const stats = readHoyoStats(row, propertyMap);

  return {
    id,
    name: str(base.name || row.name) || characterName(id, prettySideName(catalog?.side)),
    element,
    weaponType: weaponLabel(catalog?.weapon || ""),
    rarity: num(base.rarity || row.rarity) || rarityFromQuality(catalog?.quality),
    level: num(base.level || row.level),
    friendship: num(base.fetter || base.friendship || row.fetter),
    constellation: num(base.actived_constellation_num ?? row.actived_constellation_num),
    icon: iconUrl(str(base.icon || row.icon || base.image)) || iconFromSide(catalog?.side),
    talents,
    stats,
    weapon,
    artifacts,
    showcase: false,
  };
}

function readHoyoTalents(
  skills: unknown[],
  talentIds?: { normal: number | null; skill: number | null; burst: number | null } | null
): TalentInfo | null {
  const rows: Array<{ id: number; name: string; type: number; level: number }> = [];
  for (const item of skills) {
    const row = asRecord(item);
    if (!row) continue;
    rows.push({
      id: num(row.skill_id ?? row.id),
      name: str(row.name).toLowerCase(),
      type: num(row.skill_type),
      level: num(row.level),
    });
  }
  if (rows.length === 0) return null;

  // HoYoLAB marks the normal attack, the skill, and the burst all as skill_type 1.
  // Passives are skill_type 2. An alternate sprint can sit between the skill and the burst.
  const byId = new Map(rows.filter((row) => row.id > 0).map((row) => [row.id, row.level]));
  if (talentIds?.normal && talentIds.skill && talentIds.burst) {
    const normal = byId.get(talentIds.normal);
    const skill = byId.get(talentIds.skill);
    const burst = byId.get(talentIds.burst);
    if (normal != null && skill != null && burst != null) return { normal, skill, burst };
  }

  const combat = rows.filter((row) => row.type === 1);
  if (combat.length >= 3) {
    return {
      normal: combat[0].level,
      skill: combat[1].level,
      burst: combat[combat.length - 1].level,
    };
  }

  let normal = 0;
  let skill = 0;
  let burst = 0;
  let found = false;
  for (const row of rows) {
    if (row.name.includes("일반") || row.name.includes("normal attack")) {
      normal = row.level;
      found = true;
    } else if (row.name.includes("원소전투") || row.name.includes("elemental skill")) {
      skill = row.level;
      found = true;
    } else if (row.name.includes("원소폭발") || row.name.includes("elemental burst")) {
      burst = row.level;
      found = true;
    }
  }
  if (!found) return null;
  return { normal, skill, burst };
}

function readHoyoStats(row: Record<string, unknown>, propertyMap: Record<string, unknown>): CombatStats | null {
  const buckets = [
    ...asArray(row.selected_properties),
    ...asArray(row.base_properties),
    ...asArray(row.extra_properties),
    ...asArray(row.element_properties),
  ];
  if (buckets.length === 0) return null;
  const stats = emptyStats();
  let any = false;
  for (const item of buckets) {
    const prop = asRecord(item);
    const parsed = hoyoStatLine(propertyMap, prop);
    if (!parsed) continue;
    if (parsed.key === "hp_" || parsed.key === "atk_" || parsed.key === "def_") continue;
    applyStat(stats, parsed.key, parsed.value);
    any = true;
  }
  return any ? stats : null;
}

function readEnkaCharacter(raw: unknown): Omit<CharacterBuild, "guide"> | null {
  const row = asRecord(raw);
  if (!row) return null;
  const id = num(row.avatarId);
  if (!id) return null;
  const depot = num(row.skillDepotId);
  const catalog = lookupCatalog(id, depot || undefined);
  const propMap = asRecord(row.propMap) ?? {};
  const level = num(asRecord(propMap["4001"])?.val);
  const ascension = num(asRecord(propMap["1002"])?.val);
  const talentsMap = asRecord(row.skillLevelMap) ?? {};

  let talents: TalentInfo | null = null;
  if (catalog?.talents) {
    const read = (skillId: number | null): number | null => {
      if (!skillId || talentsMap[String(skillId)] == null) return null;
      const level = num(talentsMap[String(skillId)]);
      return level > 0 ? level : null;
    };
    const normal = read(catalog.talents.normal);
    const skill = read(catalog.talents.skill);
    const burst = read(catalog.talents.burst);
    if (normal != null || skill != null || burst != null) {
      talents = { normal: normal ?? 0, skill: skill ?? 0, burst: burst ?? 0 };
    }
  }

  const fight = asRecord(row.fightPropMap) ?? {};
  const stats = emptyStats();
  let hasFight = false;
  for (const [prop, key] of Object.entries(FIGHT_PROP)) {
    if (fight[prop] == null) continue;
    const rawValue = num(fight[prop]);
    const value = RATIO_PROPS.has(prop) ? rawValue * 100 : rawValue;
    applyStat(stats, key, round1(value));
    hasFight = true;
  }

  let weapon: WeaponInfo | null = null;
  const artifacts: ArtifactInfo[] = [];
  for (const equip of asArray(row.equipList)) {
    const item = asRecord(equip);
    if (!item) continue;
    const flat = asRecord(item.flat);
    if (!flat) continue;
    if (str(flat.itemType) === "ITEM_WEAPON") {
      const weaponInfo = asRecord(item.weapon);
      const affix = asRecord(weaponInfo?.affixMap) ?? {};
      const affixValue = num(Object.values(affix)[0]);
      const statsList = asArray(flat.weaponStats).map((stat) => asRecord(stat));
      const mainStat = statsList[0];
      const subStat = statsList[1];
      weapon = {
        id: num(item.itemId),
        name: readableText(flat.nameTextMapHash) || weaponNameFromIcon(str(flat.icon)) || "장착 무기",
        rarity: num(flat.rankLevel),
        level: num(weaponInfo?.level),
        refinement: affixValue + 1,
        icon: iconUrl(str(flat.icon)),
        main: formatWeaponStat(mainStat),
        sub: formatWeaponStat(subStat),
      };
    } else if (str(flat.itemType) === "ITEM_RELIQUARY") {
      const reliquary = asRecord(item.reliquary);
      const mainRaw = asRecord(flat.reliquaryMainstat);
      const mainKey = classifyStatName(str(mainRaw?.mainPropId));
      if (!mainKey || !reliquary) continue;
      const subs = asArray(flat.reliquarySubstats)
        .map((sub) => {
          const subRow = asRecord(sub);
          const key = classifyStatName(str(subRow?.appendPropId));
          if (!key || !subRow) return null;
          return line(key, num(subRow.statValue ?? subRow.propValue));
        })
        .filter((sub): sub is StatLine => Boolean(sub));
      artifacts.push({
        slot: ENKA_SLOT[str(flat.equipType)] ?? "flower",
        name: "성유물",
        setName: readableText(flat.setNameTextMapHash) || setNameFromIcon(str(flat.icon)) || "세트",
        rarity: num(flat.rankLevel),
        level: Math.max(0, num(reliquary.level) - 1),
        icon: iconUrl(str(flat.icon)),
        main: line(mainKey, num(mainRaw?.statValue ?? mainRaw?.propValue)),
        subs,
      });
    }
  }

  const element = catalogElement(catalog);
  return {
    id,
    name: characterName(id, prettySideName(catalog?.side)),
    element: element === "none" ? catalogElement(lookupCatalog(id)) : element,
    weaponType: weaponLabel(catalog?.weapon || ""),
    rarity: rarityFromQuality(catalog?.quality),
    level,
    friendship: num(asRecord(row.fetterInfo)?.expLevel),
    constellation: asArray(row.talentIdList).length || Math.max(0, ascension > 0 ? 0 : 0),
    icon: iconFromSide(catalog?.side),
    talents,
    stats: hasFight ? stats : null,
    weapon,
    artifacts,
    showcase: true,
  };
}

function readableText(value: unknown): string {
  const text = str(value).trim();
  if (!text || /^\d+$/.test(text)) return "";
  return text;
}

function formatWeaponStat(stat: Record<string, unknown> | null | undefined): string {
  if (!stat) return "";
  const key = classifyStatName(str(stat.appendPropId || stat.mainPropId));
  if (!key) return "";
  return formatStat(key, num(stat.statValue ?? stat.propValue));
}

function mergeWeapon(hoyo: WeaponInfo | null, enka: WeaponInfo | null): WeaponInfo | null {
  if (!enka) return hoyo;
  if (!hoyo) return enka;
  if (enka.name === "장착 무기") {
    return {
      ...hoyo,
      level: enka.level || hoyo.level,
      refinement: enka.refinement || hoyo.refinement,
      main: hoyo.main || enka.main,
      sub: hoyo.sub || enka.sub,
      icon: hoyo.icon || enka.icon,
    };
  }
  return { ...enka, name: hoyo.name || enka.name, icon: hoyo.icon || enka.icon };
}

function preferName(hoyo: string, enka: string): string {
  if (hoyo && !hoyo.startsWith("캐릭터 ")) return hoyo;
  return enka || hoyo;
}

function mergeTalents(hoyo: TalentInfo | null, enka: TalentInfo | null): TalentInfo | null {
  if (!hoyo) return enka;
  if (!enka) return hoyo;
  const pick = (left: number, right: number) => (right > 0 ? right : left);
  return {
    normal: pick(hoyo.normal, enka.normal),
    skill: pick(hoyo.skill, enka.skill),
    burst: pick(hoyo.burst, enka.burst),
  };
}

function mergeCharacter(
  hoyo: Omit<CharacterBuild, "guide"> | undefined,
  enka: Omit<CharacterBuild, "guide"> | undefined
): Omit<CharacterBuild, "guide"> | null {
  if (!hoyo && !enka) return null;
  if (!hoyo && enka) return enka;
  if (hoyo && !enka) return hoyo;
  const left = hoyo as Omit<CharacterBuild, "guide">;
  const right = enka as Omit<CharacterBuild, "guide">;
  return {
    ...left,
    name: preferName(left.name, right.name),
    element: left.element !== "none" ? left.element : right.element,
    weaponType: left.weaponType || right.weaponType,
    level: left.level || right.level,
    friendship: left.friendship || right.friendship,
    constellation: Math.max(left.constellation, right.constellation),
    icon: left.icon || right.icon,
    talents: mergeTalents(left.talents, right.talents),
    stats: right.stats ?? left.stats,
    weapon: mergeWeapon(left.weapon, right.weapon),
    artifacts: left.artifacts.length >= right.artifacts.length ? left.artifacts : right.artifacts,
    showcase: true,
  };
}

function memberFromUnknown(raw: unknown, names: Map<number, CharacterBuild>): PartyMember | null {
  const row = asRecord(raw);
  if (!row) return null;
  const id = num(row.id ?? row.avatar_id ?? row.avatarId);
  if (!id) return null;
  const known = names.get(id);
  return {
    id,
    name: str(row.name) || known?.name || characterName(id),
    icon: iconUrl(str(row.icon || row.image || row.side_icon)) || known?.icon || "",
    level: num(row.level) || known?.level || 0,
    element: known?.element ?? elementFromGame(str(row.element)),
  };
}

export function parseAbyss(raw: unknown, roster: Map<number, CharacterBuild>): PartySnapshot[] {
  const data = asRecord(raw);
  if (!data) return [];
  const snapshots: PartySnapshot[] = [];
  for (const floorRaw of asArray(data.floors)) {
    const floor = asRecord(floorRaw);
    if (!floor) continue;
    const floorIndex = num(floor.index);
    for (const levelRaw of asArray(floor.levels)) {
      const level = asRecord(levelRaw);
      if (!level) continue;
      const chamber = num(level.index);
      asArray(level.battles).forEach((battleRaw, battleIndex) => {
        const battle = asRecord(battleRaw);
        const characters = asArray(battle?.avatars)
          .map((avatar) => memberFromUnknown(avatar, roster))
          .filter((avatar): avatar is PartyMember => Boolean(avatar));
        if (characters.length === 0) return;
        const half = battleIndex === 0 ? "상반" : "하반";
        snapshots.push({
          source: `나선 ${floorIndex}층 ${chamber}번 ${half}`,
          characters,
        });
      });
    }
  }
  return snapshots.filter((team) => team.source.startsWith("나선 12") || team.source.startsWith("나선 11")).slice(-8);
}

function isAvatarList(value: unknown[]): boolean {
  if (value.length < 1 || value.length > 8) return false;
  return value.every((item) => {
    const row = asRecord(item);
    if (!row) return false;
    return num(row.id ?? row.avatar_id ?? row.avatarId) > 0;
  });
}

export function parseTheater(raw: unknown, roster: Map<number, CharacterBuild>): PartySnapshot[] {
  const found: PartyMember[][] = [];
  const walk = (node: unknown, depth: number) => {
    if (!node || depth > 7) return;
    if (Array.isArray(node)) {
      if (isAvatarList(node)) {
        const members = node
          .map((item) => memberFromUnknown(item, roster))
          .filter((item): item is PartyMember => Boolean(item));
        if (members.length >= 2) found.push(members);
      }
      node.forEach((child) => walk(child, depth + 1));
      return;
    }
    const row = asRecord(node);
    if (!row) return;
    for (const value of Object.values(row)) walk(value, depth + 1);
  };
  walk(raw, 0);
  const seen = new Set<string>();
  const snapshots: PartySnapshot[] = [];
  found.forEach((characters, index) => {
    const key = characters.map((character) => character.id).join("-");
    if (seen.has(key)) return;
    seen.add(key);
    snapshots.push({ source: `환상극 파티 ${snapshots.length + 1}`, characters });
    void index;
  });
  return snapshots.slice(0, 12);
}

function readPlayer(index: unknown, enka: unknown, uid: string, characterCount: number): PlayerSummary {
  const indexRow = asRecord(index);
  const role = asRecord(indexRow?.role);
  const stats = asRecord(indexRow?.stats);
  const enkaRow = asRecord(enka);
  const player = asRecord(enkaRow?.playerInfo);
  const floor = num(player?.towerFloorIndex);
  const chamber = num(player?.towerLevelIndex);
  const abyssFromEnka = floor ? `${floor}-${chamber}` : "";
  return {
    nickname: str(role?.nickname || player?.nickname) || "여행자",
    adventureRank: role?.level != null ? num(role.level) : null,
    worldLevel: player?.worldLevel != null ? num(player.worldLevel) : null,
    signature: str(player?.signature),
    achievements: stats?.achievement_number != null
      ? num(stats.achievement_number)
      : player?.finishAchievementNum != null
        ? num(player.finishAchievementNum)
        : null,
    abyss: abyssFromEnka,
    characterCount: stats?.avatar_number != null ? num(stats.avatar_number) : characterCount,
    server: serverLabel(uid),
  };
}

export function buildProfile(options: {
  uid: string;
  index: unknown;
  hoyoCharacters: unknown;
  enka: unknown;
  abyss: unknown;
  theater: unknown;
  guides: Record<number, GuideTemplate>;
  warnings: string[];
  usedHoyolab: boolean;
  usedEnka: boolean;
}): ProfilePayload {
  const detail = asRecord(options.hoyoCharacters);
  const propertyMap = asRecord(detail?.property_map) ?? {};
  const hoyoList = asArray(detail?.list)
    .map((item) => readHoyoCharacter(item, propertyMap))
    .filter((item): item is Omit<CharacterBuild, "guide"> => Boolean(item));
  const enkaRow = asRecord(options.enka);
  const enkaList = asArray(enkaRow?.avatarInfoList)
    .map((item) => readEnkaCharacter(item))
    .filter((item): item is Omit<CharacterBuild, "guide"> => Boolean(item));

  const byId = new Map<number, Omit<CharacterBuild, "guide">>();
  for (const character of hoyoList) byId.set(character.id, character);
  for (const character of enkaList) {
    byId.set(character.id, mergeCharacter(byId.get(character.id), character) as Omit<CharacterBuild, "guide">);
  }

  const characters: CharacterBuild[] = [...byId.values()]
    .map((character) => ({
      ...character,
      guide: evaluateBuild(character, options.guides[character.id] ?? null),
    }))
    .sort(compareByLevel);

  const roster = new Map(characters.map((character) => [character.id, character]));
  return {
    uid: options.uid,
    player: readPlayer(options.index, options.enka, options.uid, characters.length),
    characters,
    abyss: parseAbyss(options.abyss, roster),
    theater: parseTheater(options.theater, roster),
    warnings: options.warnings,
    fetchedAt: new Date().toISOString(),
    usedHoyolab: options.usedHoyolab,
    usedEnka: options.usedEnka,
  };
}

export function elementOf(member: PartyMember): ElementKey {
  return member.element ?? "none";
}
