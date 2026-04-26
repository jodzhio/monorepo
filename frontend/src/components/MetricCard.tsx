import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: ReactNode;
  subtitle?: string;
  /** Small inline icon shown beside the label */
  icon?: ReactNode;
  /** Large semi-transparent background icon (Lucide component) */
  Icon?: LucideIcon;
  tone?: "default" | "accent" | "lavender" | "warning";
}

const toneText: Record<NonNullable<MetricCardProps["tone"]>, string> = {
  default: "text-ink",
  accent: "text-accent",
  lavender: "text-lavender",
  warning: "text-warning",
};

export function MetricCard({ title, value, subtitle, icon, Icon, tone = "default" }: MetricCardProps) {
  return (
    <div className="card relative overflow-hidden p-4">
      {/* Large background icon */}
      {Icon && (
        <div
          className="pointer-events-none absolute select-none"
          style={{ right: -16, bottom: -16, opacity: 0.10 }}
          aria-hidden="true"
        >
          <Icon style={{ width: 100, height: 100 }} strokeWidth={1.2} />
        </div>
      )}

      <div className="relative z-10 flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-ink-muted">
          <span className="text-[11px] font-semibold uppercase tracking-wide">{title}</span>
          {icon && <span className={toneText[tone]}>{icon}</span>}
        </div>
        <div className={`text-2xl font-bold md:text-3xl ${toneText[tone]}`}>{value}</div>
        {subtitle && <div className="text-xs text-ink-muted">{subtitle}</div>}
      </div>
    </div>
  );
}
