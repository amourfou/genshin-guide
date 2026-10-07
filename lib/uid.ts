export function cleanUid(value: string): string {
  return value.replace(/\D/g, "").slice(0, 10);
}

export function isUid(value: string): boolean {
  return /^[1-9]\d{8}$/.test(value);
}

export function isChineseUid(uid: string): boolean {
  return /^[1-5]/.test(uid);
}

export function genshinServer(uid: string): string {
  switch (uid[0]) {
    case "6":
      return "os_usa";
    case "7":
      return "os_euro";
    case "8":
      return "os_asia";
    case "9":
      return "os_cht";
    case "5":
      return "cn_qd01";
    default:
      return "cn_gf01";
  }
}

export function serverLabel(uid: string): string {
  switch (genshinServer(uid)) {
    case "os_usa":
      return "아메리카";
    case "os_euro":
      return "유럽";
    case "os_asia":
      return "아시아";
    case "os_cht":
      return "번체";
    case "cn_qd01":
      return "중국 (채널)";
    default:
      return "중국";
  }
}
