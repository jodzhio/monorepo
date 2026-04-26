import { MessageCircle } from "lucide-react";

interface InterviewQuestionsProps {
  questions: string[];
}

export function InterviewQuestions({ questions }: InterviewQuestionsProps) {
  return (
    <div className="card p-4 md:p-5">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-soft-lavender text-trust">
          <MessageCircle className="h-4 w-4" />
        </div>
        <div>
          <div className="text-sm font-semibold text-ink">Вопросы для интервью от AI</div>
          <div className="text-[11px] text-ink-muted">
            Стартовая точка для живого интервью
          </div>
        </div>
      </div>
      <ol className="flex flex-col gap-2.5">
        {questions.map((q, i) => (
          <li
            key={q}
            className="flex items-start gap-3 rounded-2xl p-3 text-sm text-ink"
            style={{ background: "rgba(255,255,255,0.06)" }}
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-[11px] font-bold text-trust shadow-sm">
              {i + 1}
            </span>
            <span className="leading-relaxed">{q}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
