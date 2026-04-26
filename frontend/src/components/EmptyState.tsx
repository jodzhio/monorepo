import type { ReactNode } from "react";
import { Search } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-soft-lavender text-trust">
        {icon ?? <Search className="h-5 w-5" />}
      </div>
      <div>
        <div className="text-sm font-semibold text-ink">{title}</div>
        {description && <div className="mt-1 text-xs text-ink-muted">{description}</div>}
      </div>
      {action}
    </div>
  );
}
