import { useEffect, useState } from "react";
import { Bot, Brain, CheckCircle, FileText, Loader2 } from "lucide-react";

interface LoadingScreenProps {
  variant: "submitting" | "analyzing";
  steps?: string[];
}

const defaultSteps: Record<LoadingScreenProps["variant"], string[]> = {
  submitting: [
    "Сохраняем анкету",
    "Готовим вопросы под вашу роль",
    "Подключаем AI-ассистента",
  ],
  analyzing: [
    "Анализируем ваши ответы",
    "Сверяем с профилем роли",
    "Формируем оценку",
  ],
};

export function LoadingScreen({ variant, steps }: LoadingScreenProps) {
  const list = steps ?? defaultSteps[variant];
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setActive((s) => Math.min(s + 1, list.length - 1));
    }, 1100);
    return () => clearInterval(id);
  }, [list.length]);

  const Icon = variant === "submitting" ? Bot : Brain;

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-2 text-center">
      {/* Animated icon */}
      <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-hero">
        <span className="absolute inset-0 animate-ping rounded-full bg-accent/20" />
        <Icon className="relative h-9 w-9 text-accent" />
      </div>

      <div>
        <h1 className="text-xl font-bold text-ink md:text-2xl">
          {variant === "submitting"
            ? "Готовим сессию скрининга"
            : "Анализируем ваши ответы"}
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          {variant === "submitting"
            ? "Обычно занимает несколько секунд. Возраст, пол и фото не используются."
            : "AI готовит детальную оценку для рекрутера."}
        </p>
      </div>

      <ol className="card flex w-full max-w-md flex-col overflow-hidden p-0">
        {list.map((step, i) => {
          const isDone = i < active;
          const isActive = i === active;
          return (
            <li
              key={step}
              className={[
                "flex items-center gap-3 px-4 py-3 text-sm",
                isActive ? "bg-accent/10" : "",
                i < list.length - 1 ? "border-b border-[var(--card-border)]" : "",
              ].join(" ")}
            >
              <span
                className={[
                  "flex h-7 w-7 items-center justify-center rounded-full text-white",
                  isDone ? "bg-success" : isActive ? "bg-accent" : "",
                ].join(" ")}
                style={!isDone && !isActive ? { background: "var(--color-bg-surface)" } : undefined}
              >
                {isDone ? (
                  <CheckCircle className="h-4 w-4 text-white" />
                ) : isActive ? (
                  <Loader2 className="h-4 w-4 animate-spin text-trust" />
                ) : (
                  <FileText className="h-4 w-4 text-ink-muted" />
                )}
              </span>
              <span
                className={isDone ? "text-ink-muted line-through" : "font-medium text-ink"}
              >
                {step}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
