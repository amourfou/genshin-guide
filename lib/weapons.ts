/** Icon file name → Korean weapon name. Unknown icons stay generic. */
const WEAPON_NAMES: Record<string, string> = {
  UI_EquipIcon_Sword_Zephyrus: "페보니우스 검",
  UI_EquipIcon_Bow_Zephyrus: "페보니우스 활",
  UI_EquipIcon_Sword_Bakufu: "아메노마 카게우치",
  UI_EquipIcon_Pole_Noire: "흑술창",
  UI_EquipIcon_Pole_Mori: "어획",
  UI_EquipIcon_Pole_Homa: "호마의 지팡이",
  UI_EquipIcon_Catalyst_Proto: "황금 호박 프로토타입",
  UI_EquipIcon_Catalyst_Pulpfic: "드래곤 슬레이어의 영웅담",
};

export function weaponNameFromIcon(icon: string): string {
  const file = icon.split("/").pop()?.replace(/\.png$/i, "") ?? icon;
  return WEAPON_NAMES[file] ?? "";
}
