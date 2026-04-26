import { AlertTriangle } from "lucide-react";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = "Что-то пошло не так",
  message,
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-soft-danger text-danger">
        <AlertTriangle className="h-5 w-5" />
      </div>
      <div>
        <div className="text-sm font-semibold text-ink">{title}</div>
        {message && <div className="mt-1 text-xs text-ink-muted">{message}</div>}
      </div>
      {onRetry && (
        <button type="button" className="btn-secondary" onClick={onRetry}>
          Попробовать снова
        </button>
      )}
    </div>
  );
}
