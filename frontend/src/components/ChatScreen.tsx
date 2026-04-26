import { useEffect, useRef, useState } from "react";
import { Send, ShieldCheck, Sparkles } from "lucide-react";
import { ChatBubble } from "./ChatBubble";
import type { DialogQuestionResponse, DialogStartResponse } from "../types/api";
import { postAnswer } from "../api/client";

interface ChatScreenProps {
  start: DialogStartResponse;
  candidateName?: string;
  onFinished: () => void;
}

interface Turn {
  id: string;
  author: "ai" | "candidate";
  text: string;
  questionId?: number;
}

export function ChatScreen({ start, candidateName, onFinished }: ChatScreenProps) {
  const initialQuestion = start.questions[0];
  const [turns, setTurns] = useState<Turn[]>(
    initialQuestion
      ? [{ id: "q1", author: "ai", text: initialQuestion.text, questionId: initialQuestion.question_id }]
      : [],
  );
  const [draft, setDraft] = useState("");
  const [pendingQuestionId, setPendingQuestionId] = useState<number | null>(
    initialQuestion?.question_id ?? null,
  );
  const [questionsAsked, setQuestionsAsked] = useState(initialQuestion ? 1 : 0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const max = Math.max(start.max_questions, questionsAsked);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, busy]);

  async function handleSend() {
    const value = draft.trim();
    if (!value || pendingQuestionId == null || busy) return;
    setBusy(true);
    setError(null);

    setTurns((t) => [
      ...t,
      { id: `a-${pendingQuestionId}-${Date.now()}`, author: "candidate", text: value },
    ]);
    setDraft("");

    try {
      const res: DialogQuestionResponse = await postAnswer(start.session_id, {
        question_id: pendingQuestionId,
        answer: value,
      });

      if (res.is_last || res.status === "analyzing" || res.question_id == null) {
        setPendingQuestionId(null);
        setTimeout(onFinished, 500);
        return;
      }

      setQuestionsAsked((n) => n + 1);
      setPendingQuestionId(res.question_id);
      setTurns((t) => [
        ...t,
        { id: `q-${res.question_id}`, author: "ai", text: res.text, questionId: res.question_id ?? undefined },
      ]);
    } catch {
      setError("Не удалось отправить ответ. Попробуйте ещё раз.");
    } finally {
      setBusy(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex h-[calc(100dvh-160px)] flex-col gap-3 md:h-[calc(100vh-200px)]">
      {/* Chat header */}
      <div className="card flex items-center justify-between gap-3 p-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-trust">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-ink">AI HR-ассистент</div>
            <div className="text-[11px] text-ink-muted">Дружеский чат, а не экзамен</div>
          </div>
        </div>
        <div className="rounded-full bg-soft-lavender px-2.5 py-1 text-[11px] font-semibold text-trust">
          Вопрос {Math.min(questionsAsked, max)} из {max}
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="card flex-1 overflow-y-auto p-3"
        style={{ scrollbarGutter: "stable" }}
      >
        <div className="flex flex-col gap-3">
          {turns.map((t) => (
            <ChatBubble key={t.id} author={t.author} text={t.text} candidateName={candidateName} />
          ))}
          {busy && <ChatBubble author="ai" text="" loading />}
          {error && (
            <div className="rounded-xl bg-soft-danger px-3 py-2 text-xs text-danger">{error}</div>
          )}
        </div>
      </div>

      {/* Input area */}
      <div className="card p-2">
        <div className="flex items-end gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={pendingQuestionId == null || busy}
            placeholder={
              pendingQuestionId == null
                ? "Завершаем — готовим оценку..."
                : "Напишите ответ. Enter — отправить, Shift+Enter — новая строка."
            }
            rows={1}
            className="input min-h-[44px] flex-1 resize-none rounded-xl py-3"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!draft.trim() || pendingQuestionId == null || busy}
            className="btn-primary !rounded-xl !px-4"
            aria-label="Отправить ответ"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-1.5 flex items-center gap-1.5 px-1 text-[10px] text-ink-muted">
          <ShieldCheck className="h-3 w-3 text-success" />
          Учитываем навыки и опыт. Возраст, пол и фото игнорируются.
        </div>
      </div>
    </div>
  );
}
