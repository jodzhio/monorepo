// Types mirror the backend OpenAPI contract.
// Source of truth: POST /candidates, GET /dialog/:id/next, POST /dialog/:id/answer, GET /candidates/:id/score.

export type Grade = "Intern" | "Junior" | "Middle" | "Senior" | "Lead";

export type DialogStatus = "in_progress" | "analyzing" | "completed";

export type Verdict = "recommend_to_interview" | "soft_reject_timer";

export type ScoreStatus = "approved" | "pending_rejection";

export interface CandidateCreateRequest {
  // candidate_id is generated client-side because POST /candidates does not return it.
  // TODO: backend should ideally return candidate_id in DialogStartResponse so the frontend
  // does not have to invent one. See: GET /candidates/{candidate_id}/score requires it.
  candidate_id: string;
  position: string;
  grade: Grade;
  about: string;
  education: string;
  resume_url: string;
}

export interface QuestionItem {
  question_id: number;
  text: string;
}

export interface DialogStartResponse {
  session_id: string;
  status: DialogStatus;
  questions: QuestionItem[];
  max_questions: number;
}

export interface AnswerRequest {
  question_id: number;
  answer: string;
}

export interface DialogQuestionResponse {
  session_id: string;
  question_id: number | null;
  text: string;
  is_last: boolean;
  status: DialogStatus;
}

export interface ScoreTraits {
  positive: string[];
  negative: string[];
}

export interface ScoreResponse {
  candidate_id: string;
  score: number;
  score_percent: number;
  verdict: Verdict;
  recommendation: string;
  traits: ScoreTraits;
  rejection_timer_days: number | null;
  rejection_message_template: string | null;
  status: ScoreStatus;
}

export interface ScorePendingResponse {
  status: "analyzing";
  message: string;
}

export type ScoreResult =
  | { kind: "ready"; data: ScoreResponse }
  | { kind: "pending"; data: ScorePendingResponse };
