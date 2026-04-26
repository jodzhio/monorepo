import type { ScoreStatus, Verdict } from "../types/api";

// Returns Tailwind classes for the score badge in three buckets.
export function scoreColor(percent: number): { fg: string; bg: string; ring: string } {
  if (percent >= 75)
    return { fg: "text-success", bg: "bg-soft-lime", ring: "ring-success/30" };
  if (percent >= 55)
    return { fg: "text-warning", bg: "bg-soft-warning", ring: "ring-warning/30" };
  return { fg: "text-danger", bg: "bg-soft-danger", ring: "ring-danger/30" };
}

export function verdictLabel(v: Verdict): string {
  return v === "recommend_to_interview"
    ? "Рекомендуем на интервью"
    : "Мягкий отказ (с отсрочкой)";
}

export function statusLabel(s: ScoreStatus): string {
  return s === "approved" ? "Одобрен" : "Ожидает отказа";
}

export function statusBadgeClass(s: ScoreStatus): string {
  return s === "approved"
    ? "bg-soft-lime text-success"
    : "bg-soft-warning text-warning";
}

export function verdictBadgeClass(v: Verdict): string {
  return v === "recommend_to_interview"
    ? "bg-soft-lavender text-trust"
    : "bg-soft-warning text-warning";
}
