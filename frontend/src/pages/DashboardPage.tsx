import { useMemo } from "react";
import type { LucideIcon } from "lucide-react";
import {
  BadgeCheck,
  Briefcase,
  Clock,
  Code2,
  Database,
  FlaskConical,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { MetricCard } from "../components/MetricCard";
import { VacancyCard } from "../components/VacancyCard";
import { mockVacancies } from "../data/mockDashboard";
import { mockCandidates } from "../data/mockCandidates";
import { fakeHr } from "../data/fakeHr";
import type { Vacancy } from "../types/dashboard";

const vacancyIcon: Record<string, LucideIcon> = {
  vac_go_mid: Code2,
  vac_data_sr: Database,
  vac_pm_jr: Target,
  vac_qa_mid: FlaskConical,
};

export function DashboardPage() {
  const totals = useMemo(() => aggregate(mockVacancies), []);

  return (
    <div className="flex flex-col gap-4 pb-4">
      {/* Page heading */}
      <section className="flex flex-col gap-1.5 pt-1">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-accent">
          <Sparkles className="h-3.5 w-3.5" /> Обзор AI-скрининга
        </div>
        <h1 className="text-[22px] font-bold leading-tight text-ink md:text-3xl">
          Привет, {fakeHr.name.split(" ")[0]} — вот ваш пайплайн
        </h1>
        <p className="text-sm text-ink-muted">
          AI помогает приоритизировать. Финальное решение остаётся за вами.
        </p>
      </section>

      {/* KPI strip */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard
          title="Открытые вакансии"
          value={mockVacancies.length}
          subtitle="активных направлений"
          Icon={Briefcase}
          tone="accent"
        />
        <MetricCard
          title="Кандидаты"
          value={totals.candidates}
          subtitle="всего в воронке"
          Icon={Users}
        />
        <MetricCard
          title="Рекомендованы"
          value={totals.recommended}
          subtitle="готовы к интервью"
          Icon={BadgeCheck}
          tone="accent"
        />
        <MetricCard
          title="Ожидают"
          value={totals.pending}
          subtitle="мягкий отказ"
          Icon={Clock}
          tone="warning"
        />
      </section>

      {/* Average score tile — full width on mobile, 1/2 on desktop */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <MetricCard
          title="Средний балл по всем вакансиям"
          value={`${Math.round(totals.avgScore)}`}
          subtitle="из 100 возможных"
          Icon={TrendingUp}
          tone="lavender"
        />
      </section>

      {/* Vacancies */}
      <section className="flex items-center justify-between pt-1">
        <h2 className="text-base font-semibold text-ink md:text-lg">Вакансии</h2>
        <span className="text-[11px] text-ink-muted">Нажмите, чтобы раскрыть</span>
      </section>

      <section className="grid grid-cols-1 items-start gap-3 md:grid-cols-2">
        {mockVacancies.map((v) => (
          <VacancyCard
            key={v.id}
            vacancy={v}
            candidates={mockCandidates.filter((c) => c.vacancyId === v.id)}
            Icon={vacancyIcon[v.id] ?? Briefcase}
          />
        ))}
      </section>
    </div>
  );
}

function aggregate(vacancies: Vacancy[]) {
  const base = vacancies.reduce(
    (acc, v) => {
      acc.candidates += v.candidatesCount;
      acc.recommended += v.recommendedCount;
      acc.pending += v.pendingRejectionCount;
      acc.scoreSum += v.averageScore;
      return acc;
    },
    { candidates: 0, recommended: 0, pending: 0, scoreSum: 0 },
  );
  return { ...base, avgScore: vacancies.length ? base.scoreSum / vacancies.length : 0 };
}
