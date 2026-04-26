import { useEffect, useRef, useState } from "react";
import { ApplicationForm } from "../components/ApplicationForm";
import { ChatScreen } from "../components/ChatScreen";
import { LoadingScreen } from "../components/LoadingScreen";
import { ErrorState } from "../components/ErrorState";
import { ResultPage } from "./ResultPage";
import { createCandidate, getScore } from "../api/client";
import type {
  CandidateCreateRequest,
  DialogStartResponse,
  ScoreResponse,
} from "../types/api";
import { newCandidateId } from "../utils/format";

type Phase = "form" | "submitting" | "chat" | "analyzing" | "result" | "error";

interface ApplyPageProps {
  initialPosition?: string;
}

export function ApplyPage({ initialPosition }: ApplyPageProps) {
  const [phase, setPhase] = useState<Phase>("form");
  const [candidateId, setCandidateId] = useState<string | null>(null);
  const [start, setStart] = useState<DialogStartResponse | null>(null);
  const [candidateName, setCandidateName] = useState<string | undefined>();
  const [score, setScore] = useState<ScoreResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (pollTimer.current) window.clearTimeout(pollTimer.current);
    },
    [],
  );

  async function handleSubmit(form: Omit<CandidateCreateRequest, "candidate_id">) {
    setPhase("submitting");
    setError(null);
    const id = newCandidateId();
    setCandidateId(id);
    // Use the first word of position as a friendly placeholder name in chat avatar.
    setCandidateName(form.about.split(/\s+/)[0] ?? "Вы");

    try {
      const res = await createCandidate({ candidate_id: id, ...form });
      setStart(res);
      setPhase("chat");
    } catch {
      setError("Не удалось начать скрининг. Пожалуйста, попробуйте ещё раз.");
      setPhase("error");
    }
  }

  function handleChatFinished() {
    setPhase("analyzing");
    void pollScore(0);
  }

  async function pollScore(attempt: number) {
    if (!candidateId) return;
    const result = await getScore(candidateId);
    if (result.kind === "ready") {
      setScore(result.data);
      setPhase("result");
      return;
    }
    if (attempt >= 18) {
      setError("AI-оценка занимает дольше обычного. Попробуйте обновить страницу через минуту.");
      setPhase("error");
      return;
    }
    pollTimer.current = window.setTimeout(() => void pollScore(attempt + 1), 2500);
  }

  function reset() {
    setPhase("form");
    setStart(null);
    setScore(null);
    setCandidateId(null);
    setError(null);
  }

  if (phase === "form") {
    return (
      <div className="flex flex-col gap-4 pb-4">
        <PageIntro />
        <ApplicationForm
          initialPosition={initialPosition}
          submitting={false}
          onSubmit={handleSubmit}
        />
      </div>
    );
  }

  if (phase === "submitting") {
    return <LoadingScreen variant="submitting" />;
  }

  if (phase === "chat" && start) {
    return <ChatScreen start={start} candidateName={candidateName} onFinished={handleChatFinished} />;
  }

  if (phase === "analyzing") {
    return <LoadingScreen variant="analyzing" />;
  }

  if (phase === "result" && score) {
    return <ResultPage score={score} onRestart={reset} />;
  }

  return (
    <ErrorState
      title="Скрининг прерван"
      message={error ?? "Неожиданная ошибка. Пожалуйста, попробуйте ещё раз."}
      onRetry={reset}
    />
  );
}

function PageIntro() {
  return (
    <div className="flex flex-col gap-1.5 pt-1">
      <h1 className="text-[22px] font-bold leading-tight text-ink md:text-3xl">
        Откликнуться на вакансию
      </h1>
      <p className="text-sm text-ink-muted">
        Заполните короткую анкету. После отправки вас ждёт дружеский чат с AI-ассистентом —
        обычно 3–5 вопросов.
      </p>
    </div>
  );
}
