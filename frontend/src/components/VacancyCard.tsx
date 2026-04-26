import { useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Briefcase,
  CheckCircle,
  ChevronDown,
  Clock,
  Plus,
  Users,
} from "lucide-react";
import type { CandidateSummary, Vacancy } from "../types/dashboard";
import { CandidateCard } from "./CandidateCard";

interface VacancyCardProps {
  vacancy: Vacancy;
  candidates: CandidateSummary[];
  onDownloadCV?: (id: string) => void;
  /** Large semi-transparent background icon (default: Briefcase) */
  Icon?: LucideIcon;
}

const TOP_LIMIT = 3;

export function VacancyCard({
  vacancy,
  candidates,
  onDownloadCV,
  Icon: BgIcon = Briefcase,
}: VacancyCardProps) {
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const sorted = useMemo(
    () => [...candidates].sort((a, b) => b.scorePercent - a.scorePercent),
    [candidates],
  );
  const visible = showAll ? sorted : sorted.slice(0, TOP_LIMIT);
  const hiddenCount = sorted.length - visible.length;

  return (
    <div className="card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative w-full overflow-hidden text-left"
        aria-expanded={open}
      >
        {/* Large background icon */}
        <div
          className="pointer-events-none absolute select-none"
          style={{ right: -16, bottom: -16, opacity: 0.08 }}
          aria-hidden="true"
        >
          <BgIcon style={{ width: 110, height: 110 }} strokeWidth={1.2} />
        </div>

        <div className="relative z-10 flex items-start gap-3 p-4">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
            style={{ background: "rgba(170, 220, 0, 0.22)", color: "#D6FF1D" }}
          >
            <BgIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-ink md:text-base">
                  {vacancy.title}
                </div>
                <div className="truncate text-[11px] text-ink-muted">
                  {vacancy.department} · {vacancy.grade}
                </div>
              </div>
              <ChevronDown
                className={[
                  "h-5 w-5 shrink-0 text-ink-muted transition-transform",
                  open ? "rotate-180" : "",
                ].join(" ")}
              />
            </div>

            <div className="mt-3 grid grid-cols-2 items-stretch gap-1.5 sm:grid-cols-4">
              <StatChip label="Средний балл" value={vacancy.averageScore} tone="accent" />
              <StatChip
                label="Всего"
                value={vacancy.candidatesCount}
                icon={<Users className="h-3 w-3" />}
              />
              <StatChip
                label="Рекоменд."
                value={vacancy.recommendedCount}
                tone="success"
                icon={<CheckCircle className="h-3 w-3" />}
              />
              <StatChip
                label="Ожидают"
                value={vacancy.pendingRejectionCount}
                tone="warning"
                icon={<Clock className="h-3 w-3" />}
              />
            </div>
          </div>
        </div>
      </button>

      {open && (
        <div
          className="border-t p-4"
          style={{
            borderColor: "var(--card-border)",
            background: "var(--color-bg-surface)",
          }}
        >
          {vacancy.commonGaps.length > 0 && (
            <div
              className="mb-3 rounded-2xl p-3"
              style={{
                background: "rgba(224, 168, 0, 0.14)",
                border: "1px solid rgba(255, 207, 76, 0.24)",
              }}
            >
              <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-warning">
                <AlertTriangle className="h-3.5 w-3.5" />
                Частые пробелы по этой вакансии
              </div>
              <ul className="flex flex-col gap-1 text-xs text-ink">
                {vacancy.commonGaps.map((g) => (
                  <li key={g} className="flex gap-2">
                    <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-warning" />
                    {g}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
              Лучшие кандидаты ({visible.length} из {sorted.length})
            </span>
          </div>

          {sorted.length === 0 ? (
            <div className="py-6 text-center text-xs text-ink-muted">
              Пока нет кандидатов на эту вакансию.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {visible.map((c) => (
                <CandidateCard
                  key={c.id}
                  candidate={c}
                  onDownload={onDownloadCV}
                />
              ))}

              {hiddenCount > 0 && (
                <button
                  type="button"
                  className="btn-secondary mt-1 w-full"
                  onClick={() => setShowAll(true)}
                >
                  <Plus className="h-4 w-4" />
                  Показать других кандидатов ({hiddenCount})
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatChip({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: number | string;
  tone?: "accent" | "success" | "warning";
  icon?: React.ReactNode;
}) {
  const styles =
    tone === "accent"
      ? { background: "var(--chip-accent-bg)", color: "var(--chip-accent-fg)" }
      : tone === "success"
        ? { background: "var(--chip-success-bg)", color: "var(--chip-success-fg)" }
        : tone === "warning"
          ? { background: "var(--chip-warning-bg)", color: "var(--chip-warning-fg)" }
          : { background: "var(--chip-default-bg)", color: "var(--color-ink)" };
  return (
    <div className="flex h-full flex-col justify-between rounded-xl px-2 py-1.5" style={styles}>
      <div className="flex min-h-[1rem] items-start gap-1 text-[10px] font-semibold uppercase leading-tight tracking-wide opacity-90">
        {icon && <span className="mt-[1px] shrink-0">{icon}</span>}
        <span>{label}</span>
      </div>
      <div className="mt-1 text-sm font-bold leading-none">{value}</div>
    </div>
  );
}
