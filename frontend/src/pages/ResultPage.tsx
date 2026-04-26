import { CheckCircle, Clock, RefreshCcw, ShieldCheck, Sparkles, XCircle } from "lucide-react";
import type { ScoreResponse } from "../types/api";
import { scoreColor, statusBadgeClass, statusLabel, verdictLabel } from "../utils/scoring";

interface ResultPageProps {
  score: ScoreResponse;
  onRestart: () => void;
}

export function ResultPage({ score, onRestart }: ResultPageProps) {
  const isSoftReject = score.verdict === "soft_reject_timer";
  const c = scoreColor(score.score_percent);

  return (
    <div className="flex flex-col gap-4 pt-2">
      {/* ── Score hero ── */}
      <div className="card relative overflow-hidden p-5 md:p-7">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <span className={`pill ${statusBadgeClass(score.status)}`}>
              {score.status === "approved" ? (
                <CheckCircle className="h-3.5 w-3.5" />
              ) : (
                <Clock className="h-3.5 w-3.5" />
              )}
              {statusLabel(score.status)}
            </span>
            <span className="pill bg-soft-lavender text-trust">
              <Sparkles className="h-3.5 w-3.5" />
              AI-скрининг
            </span>
          </div>

          <div className="flex flex-col items-start gap-1">
            <div className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
              Ваш результат
            </div>
            <div className="flex items-end gap-2">
              <span className={`text-5xl font-extrabold leading-none md:text-6xl ${c.fg}`}>
                {score.score_percent}
              </span>
              <span className="pb-1 text-base font-semibold text-ink-muted">/ 100</span>
            </div>
            <div className="text-sm font-semibold text-ink">{verdictLabel(score.verdict)}</div>
          </div>

          <p className="text-sm text-ink-muted">{score.recommendation}</p>
        </div>
      </div>

      {/* ── Soft rejection notice ── */}
      {isSoftReject && score.rejection_timer_days != null && (
        <div className="card p-4"
          style={{ borderLeft: "4px solid #E0A800" }}
        >
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-soft-warning text-warning">
              <Clock className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-ink">Вежливая пауза</div>
              <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                {score.rejection_message_template ??
                  "Спасибо, что уделили время. По итогам этого этапа мы сейчас не движемся дальше."}{" "}
                В течение <b>{score.rejection_timer_days} дней</b> вы получите письмо — это даёт
                нашей команде время пересмотреть решение перед финальным ответом.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Traits ── */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="card p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
            <CheckCircle className="h-4 w-4 text-success" />
            Сильные стороны
          </div>
          <ul className="flex flex-col gap-2">
            {score.traits.positive.map((t) => (
              <li
                key={t}
                className="flex items-start gap-2 rounded-xl bg-soft-lime/70 p-2.5 text-xs text-trust"
              >
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
                {t}
              </li>
            ))}
          </ul>
        </div>

        <div className="card p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
            <XCircle className="h-4 w-4 text-warning" />
            Что стоит обсудить
          </div>
          <ul className="flex flex-col gap-2">
            {score.traits.negative.length === 0 ? (
              <li className="text-xs text-ink-muted">Серьёзных пробелов не обнаружено.</li>
            ) : (
              score.traits.negative.map((t) => (
                <li
                  key={t}
                  className="flex items-start gap-2 rounded-xl bg-soft-warning/60 p-2.5 text-xs text-trust"
                >
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-warning" />
                  {t}
                </li>
              ))
            )}
          </ul>
        </div>
      </div>

      {/* ── Ethics note ── */}
      <div className="card flex items-start gap-3 p-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-soft-lavender text-trust">
          <ShieldCheck className="h-4 w-4" />
        </div>
        <div className="text-xs leading-relaxed text-ink-muted">
          Финальное решение принимает рекрутер. AI помогает, но не заменяет HR. Оценка не
          учитывает возраст, пол и фото.
        </div>
      </div>

      <button type="button" className="btn-secondary w-full" onClick={onRestart}>
        <RefreshCcw className="h-4 w-4" />
        Откликнуться на другую вакансию
      </button>
    </div>
  );
}
