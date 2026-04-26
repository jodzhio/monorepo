export function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

export function relativeDays(iso: string): string {
  const diff = Math.round((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
  if (diff <= 0) return "сегодня";
  if (diff === 1) return "вчера";
  if (diff < 7) return `${diff} дн. назад`;
  if (diff < 30) return `${Math.round(diff / 7)} нед. назад`;
  return `${Math.round(diff / 30)} мес. назад`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function newCandidateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `cand_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}
