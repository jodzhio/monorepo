// HR Dashboard / Candidates types — backed by mock data.
// The OpenAPI contract does not yet define dashboard endpoints, so these shapes are
// frontend-only and may evolve when the backend ships them.

import type { Grade, ScoreResponse } from "./api";

export interface Vacancy {
  id: string;
  title: string;
  grade: Grade;
  department: string;
  candidatesCount: number;
  averageScore: number;
  recommendedCount: number;
  needReviewCount: number;
  pendingRejectionCount: number;
  commonGaps: string[];
}

export interface CandidateSummary {
  id: string;
  vacancyId: string;
  name: string;
  position: string;
  grade: Grade;
  scorePercent: number;
  verdict: ScoreResponse["verdict"];
  status: ScoreResponse["status"];
  topSkills: string[];
  mainRisk: string;
  appliedAt: string; // ISO date
}

export interface SkillCheck {
  name: string;
  evidence: "confirmed" | "partial" | "missing";
  note?: string;
}

export interface CandidateDetail extends ScoreResponse {
  name: string;
  position: string;
  grade: Grade;
  appliedAt: string;
  resumeUrl: string;
  topSkills: string[];
  mainRisk: string;
  strengths: string[];
  risks: string[];
  skillChecklist: SkillCheck[];
  interviewQuestions: string[];
  scoreBreakdown: { label: string; weight: number; signal: string }[];
}
