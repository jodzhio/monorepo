import { Bot } from "lucide-react";
import { initials } from "../utils/format";

interface ChatBubbleProps {
  author: "ai" | "candidate";
  text: string;
  candidateName?: string;
  loading?: boolean;
}

export function ChatBubble({ author, text, candidateName, loading }: ChatBubbleProps) {
  const isAi = author === "ai";
  return (
    <div className={`flex gap-2.5 ${isAi ? "" : "flex-row-reverse"}`}>
      {/* Avatar */}
      <div
        className={[
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
          isAi ? "bg-accent text-trust" : "",
        ].join(" ")}
        style={!isAi ? { background: "linear-gradient(135deg,#C6ADFF,#AADC00)", color: "#2B264A" } : undefined}
      >
        {isAi ? <Bot className="h-4 w-4" /> : initials(candidateName ?? "Вы")}
      </div>

      {/* Bubble */}
      <div
        className={[
          "max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm",
          isAi
            ? "rounded-tl-sm bg-white text-trust border border-border/60"
            : "rounded-tr-sm bg-accent text-trust",
        ].join(" ")}
      >
        {loading ? (
          <span className="flex items-center gap-1.5 text-trust-muted">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-trust-muted [animation-delay:-0.2s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-trust-muted [animation-delay:-0.1s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-trust-muted" />
          </span>
        ) : (
          text
        )}
      </div>
    </div>
  );
}
