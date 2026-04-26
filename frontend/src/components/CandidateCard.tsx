import { useNavigate } from "react-router-dom";
import { AlertTriangle, ChevronRight, Download } from "lucide-react";
import { ScoreBadge } from "./ScoreBadge";
import { StatusBadge, VerdictBadge } from "./StatusBadge";
import type { CandidateSummary } from "../types/dashboard";

interface CandidateCardProps {
  candidate: CandidateSummary;
  onDownload?: (id: string) => void;
}

export function CandidateCard({ candidate, onDownload }: CandidateCardProps) {
  const navigate = useNavigate();
  const open = () => navigate(`/candidates/${candidate.id}`);

  return (
    <div className="card flex flex-col gap-3 p-4 transition hover:brightness-105">
      <button
        type="button"
        onClick={open}
        className="flex flex-1 items-center gap-3 text-left"
      >
        <div
          className="h-11 w-11 shrink-0 rounded-2xl"
          style={{ background: "linear-gradient(135deg, #C6ADFF, #AADC00)" }}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate text-sm font-semibold text-ink">{candidate.name}</div>
          <div className="truncate text-[11px] text-ink-muted">
            {candidate.position} · {candidate.grade}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {candidate.topSkills.slice(0, 3).map((s) => (
              <span
                key={s}
                className="rounded-md px-1.5 py-0.5 text-[10px] font-medium text-ink-muted"
                style={{ background: "var(--color-bg-surface)" }}
              >
                {s}
              </span>
            ))}
          </div>
        </div>
        <ScoreBadge percent={candidate.scorePercent} size="md" />
      </button>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-1.5">
          <VerdictBadge verdict={candidate.verdict} />
          <StatusBadge status={candidate.status} />
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-ink-muted">
          <AlertTriangle className="h-3 w-3 text-warning" />
          <span className="line-clamp-1">{candidate.mainRisk}</span>
        </div>

        <div className="flex gap-1.5">
          <button type="button" className="btn-ghost" onClick={open}>
            Открыть
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
          {onDownload && (
            <button
              type="button"
              className="btn-ghost"
              onClick={() => onDownload(candidate.id)}
              aria-label="Скачать резюме"
            >
              <Download className="h-3.5 w-3.5" />
              Резюме
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
