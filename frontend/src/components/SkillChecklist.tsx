import { CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import type { SkillCheck } from "../types/dashboard";

interface SkillChecklistProps {
  skills: SkillCheck[];
}

const map: Record<
  SkillCheck["evidence"],
  { Icon: typeof CheckCircle; bg: string; fg: string; label: string }
> = {
  confirmed: {
    Icon: CheckCircle,
    bg: "bg-soft-lime",
    fg: "text-success",
    label: "Подтверждено",
  },
  partial: {
    Icon: AlertTriangle,
    bg: "bg-soft-warning",
    fg: "text-warning",
    label: "Частично",
  },
  missing: {
    Icon: XCircle,
    bg: "bg-soft-danger",
    fg: "text-danger",
    label: "Отсутствует",
  },
};

export function SkillChecklist({ skills }: SkillChecklistProps) {
  return (
    <div className="card p-4 md:p-5">
      <div className="mb-3 text-sm font-semibold text-ink">Чек-лист навыков</div>
      <ul className="flex flex-col divide-y divide-white/10">
        {skills.map((s) => {
          const m = map[s.evidence];
          const Icon = m.Icon;
          return (
            <li key={s.name} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${m.bg} ${m.fg}`}
              >
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-ink">{s.name}</span>
                  <span className={`text-[11px] font-semibold ${m.fg}`}>{m.label}</span>
                </div>
                {s.note && <div className="mt-0.5 text-[11px] text-ink-muted">{s.note}</div>}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
