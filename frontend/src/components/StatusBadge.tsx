import { CheckCircle, Clock, AlertTriangle } from "lucide-react";
import type { ScoreStatus, Verdict } from "../types/api";
import { statusBadgeClass, statusLabel, verdictBadgeClass, verdictLabel } from "../utils/scoring";

export function StatusBadge({ status }: { status: ScoreStatus }) {
  const Icon = status === "approved" ? CheckCircle : Clock;
  return (
    <span className={`pill ${statusBadgeClass(status)}`}>
      <Icon className="h-3.5 w-3.5" />
      {statusLabel(status)}
    </span>
  );
}

export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const Icon = verdict === "recommend_to_interview" ? CheckCircle : AlertTriangle;
  return (
    <span className={`pill ${verdictBadgeClass(verdict)}`}>
      <Icon className="h-3.5 w-3.5" />
      {verdictLabel(verdict)}
    </span>
  );
}
