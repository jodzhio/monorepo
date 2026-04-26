import { useState } from "react";
import { CheckCircle, Eye, UserCheck, XCircle } from "lucide-react";

type Decision = "invite" | "review" | "reject" | "talent_pool";

interface HRDecisionActionsProps {
  onDecide?: (decision: Decision) => void;
}

const buttons: { id: Decision; label: string; Icon: typeof CheckCircle; tone: string }[] = [
  {
    id: "invite",
    label: "Пригласить",
    Icon: CheckCircle,
    tone: "bg-accent text-trust hover:bg-accent-dark",
  },
  {
    id: "review",
    label: "Доп. проверка",
    Icon: Eye,
    tone: "bg-soft-lavender text-trust hover:opacity-90",
  },
  {
    id: "talent_pool",
    label: "Кадровый резерв",
    Icon: UserCheck,
    tone: "bg-white/10 text-ink border border-white/20 hover:bg-white/20",
  },
  {
    id: "reject",
    label: "Отклонить",
    Icon: XCircle,
    tone: "bg-soft-danger text-danger hover:opacity-90",
  },
];

export function HRDecisionActions({ onDecide }: HRDecisionActionsProps) {
  const [chosen, setChosen] = useState<Decision | null>(null);

  function handleClick(id: Decision) {
    setChosen(id);
    onDecide?.(id);
  }

  return (
    <div className="card p-4 md:p-5">
      <div className="mb-1 text-sm font-semibold text-ink">Решение HR</div>
      <p className="mb-3 text-[11px] text-ink-muted">
        Финальное решение остаётся за HR. AI только помогает.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {buttons.map(({ id, label, Icon, tone }) => (
          <button
            key={id}
            type="button"
            onClick={() => handleClick(id)}
            className={[
              "inline-flex items-center justify-center gap-1.5 rounded-2xl px-3 py-2.5 text-sm font-semibold transition active:scale-[.98]",
              tone,
              chosen === id ? "ring-2 ring-offset-2 ring-offset-transparent ring-accent/50" : "",
            ].join(" ")}
            style={{ minHeight: 44 }}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>
      {chosen && (
        <div
          className="mt-3 rounded-xl p-2.5 text-[11px] text-ink"
          style={{ background: "rgba(170,220,0,0.18)" }}
        >
          Решение сохранено локально:{" "}
          <b>{buttons.find((b) => b.id === chosen)?.label}</b>. Сохранение решений HR появится в
          следующей итерации.
        </div>
      )}
    </div>
  );
}
