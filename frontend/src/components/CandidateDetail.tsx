import {
  AlertTriangle,
  ArrowLeft,
  Clock,
  Download,
  Star,
  X,
} from "lucide-react";
import { ScoreBadge } from "./ScoreBadge";
import { StatusBadge, VerdictBadge } from "./StatusBadge";
import { SkillChecklist } from "./SkillChecklist";
import { InterviewQuestions } from "./InterviewQuestions";
import { HRDecisionActions } from "./HRDecisionActions";
import type { CandidateDetail as CandidateDetailType } from "../types/dashboard";
import { relativeDays } from "../utils/format";

interface CandidateDetailProps {
  candidate: CandidateDetailType;
  onClose: () => void;
}

export function CandidateDetail({ candidate, onClose }: CandidateDetailProps) {
  return (
    <div className="flex flex-col gap-4 pb-4">
      <div className="flex items-center justify-between">
        <button type="button" onClick={onClose} className="btn-ghost -ml-2">
          <ArrowLeft className="h-4 w-4" />
          Назад
        </button>
        <button
          type="button"
          onClick={onClose}
          className="btn-ghost md:hidden"
          aria-label="Закрыть"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="card p-4 md:p-6">
        <div className="flex items-start gap-3">
          <div
            className="h-14 w-14 shrink-0 rounded-2xl"
            style={{ background: "linear-gradient(135deg, #C6ADFF, #AADC00)" }}
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-lg font-bold text-ink md:text-xl">
                  {candidate.name}
                </div>
                <div className="text-xs text-ink-muted">
                  {candidate.position} · {candidate.grade} · отклик{" "}
                  {relativeDays(candidate.appliedAt)}
                </div>
              </div>
              <ScoreBadge percent={candidate.score_percent} size="lg" />
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <VerdictBadge verdict={candidate.verdict} />
              <StatusBadge status={candidate.status} />
            </div>
          </div>
        </div>

        {candidate.status === "pending_rejection" && candidate.rejection_timer_days != null && (
          <div
            className="mt-4 flex items-start gap-3 rounded-2xl p-3"
            style={{
              background: "rgba(224,168,0,0.18)",
              border: "1px solid rgba(255,207,76,0.30)",
            }}
          >
            <Clock className="h-4 w-4 shrink-0 text-warning" />
            <div className="text-[11px] leading-relaxed text-ink">
              Мягкий отказ через <b>{candidate.rejection_timer_days} дн.</b> HR может изменить
              решение до окончания срока.
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href={candidate.resumeUrl}
            target="_blank"
            rel="noreferrer"
            className="btn-secondary flex-1 md:flex-none"
          >
            <Download className="h-4 w-4" />
            Скачать резюме
          </a>
        </div>

        <p className="mt-4 rounded-2xl p-3 text-[11px] leading-relaxed text-ink"
          style={{ background: "rgba(170,220,0,0.14)" }}
        >
          {candidate.recommendation}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <div className="card p-4 md:p-5">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
              <Star className="h-4 w-4" style={{ color: "#D6FF1D" }} />
              Сильные стороны
            </div>
            <ul className="flex flex-col gap-1.5">
              {candidate.strengths.map((s) => (
                <li
                  key={s}
                  className="flex items-start gap-2 rounded-xl p-2.5 text-xs text-ink"
                  style={{ background: "rgba(170,220,0,0.14)" }}
                >
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  {s}
                </li>
              ))}
            </ul>
          </div>

          <div className="card p-4 md:p-5">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Риски и вопросы для уточнения
            </div>
            <ul className="flex flex-col gap-1.5">
              {candidate.risks.map((r) => (
                <li
                  key={r}
                  className="flex items-start gap-2 rounded-xl p-2.5 text-xs text-ink"
                  style={{ background: "rgba(224,168,0,0.18)" }}
                >
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-warning" />
                  {r}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <SkillChecklist skills={candidate.skillChecklist} />
          <InterviewQuestions questions={candidate.interviewQuestions} />
          <HRDecisionActions />
        </div>
      </div>
    </div>
  );
}
