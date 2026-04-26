import { useMemo, useState } from "react";
import { Filter, Search, UserCheck, Users } from "lucide-react";
import { CandidateCard } from "../components/CandidateCard";
import { EmptyState } from "../components/EmptyState";
import { mockCandidates } from "../data/mockCandidates";
import type { ScoreStatus, Verdict } from "../types/api";

type StatusFilter = "all" | "approved" | "pending" | "recommend" | "soft_reject";

const filters: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "Все" },
  { id: "recommend", label: "Рекомендованы" },
  { id: "approved", label: "Одобрены" },
  { id: "pending", label: "Ожидают" },
  { id: "soft_reject", label: "Мягкий отказ" },
];

export function CandidatesPage() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");

  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase();
    return mockCandidates.filter((c) => {
      if (q) {
        const hay = `${c.name} ${c.position} ${c.topSkills.join(" ")}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      switch (filter) {
        case "all":
          return true;
        case "approved":
          return c.status === ("approved" satisfies ScoreStatus);
        case "pending":
          return c.status === ("pending_rejection" satisfies ScoreStatus);
        case "recommend":
          return c.verdict === ("recommend_to_interview" satisfies Verdict);
        case "soft_reject":
          return c.verdict === ("soft_reject_timer" satisfies Verdict);
      }
    });
  }, [query, filter]);

  return (
    <div className="flex flex-col gap-4 pb-4">
      {/* Page header */}
      <div className="flex flex-col gap-1.5 pt-1">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-accent">
          <UserCheck className="h-3.5 w-3.5" />
          AI-скрининг
        </div>
        <h1 className="text-[22px] font-bold leading-tight text-ink md:text-3xl">
          Кандидаты
        </h1>
        <p className="text-sm text-ink-muted">
          AI-подготовленный шортлист. Откройте профиль и примите решение.
        </p>
      </div>

      {/* Summary pills */}
      <div className="flex flex-wrap gap-2">
        <span className="pill text-ink" style={{ background: "var(--color-bg-surface)" }}>
          <Users className="h-3.5 w-3.5" />
          {mockCandidates.length} кандидатов
        </span>
        <span className="pill bg-soft-lime text-success">
          {mockCandidates.filter((c) => c.verdict === "recommend_to_interview").length} рекомендованы
        </span>
        <span className="pill bg-soft-warning text-warning">
          {mockCandidates.filter((c) => c.status === "pending_rejection").length} ожидают
        </span>
      </div>

      {/* Search + filters */}
      <div className="card flex flex-col gap-2.5 p-3">
        <label className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по имени, роли или навыку"
            className="input pl-9"
          />
        </label>
        <div className="-mx-3 flex items-center gap-1.5 overflow-x-auto px-3 pb-0.5">
          <span
            className="flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] font-semibold text-ink-muted"
            style={{ background: "var(--color-bg-surface)" }}
          >
            <Filter className="h-3.5 w-3.5" />
            Фильтр
          </span>
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={[
                "shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold transition",
                filter === f.id
                  ? "bg-accent text-trust"
                  : "text-ink-muted hover:text-ink",
              ].join(" ")}
              style={filter === f.id ? {} : { background: "var(--color-bg-surface)", border: "1px solid var(--card-border)" }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {candidates.length === 0 ? (
        <EmptyState
          title="Кандидаты не найдены"
          description="Попробуйте сбросить поиск или выбрать другой фильтр."
        />
      ) : (
        <div className="flex flex-col gap-2.5 md:grid md:grid-cols-2 md:gap-3">
          {candidates.map((c) => (
            <CandidateCard key={c.id} candidate={c} />
          ))}
        </div>
      )}
    </div>
  );
}
