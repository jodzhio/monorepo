import { useNavigate, useParams } from "react-router-dom";
import { CandidateDetail } from "../components/CandidateDetail";
import { EmptyState } from "../components/EmptyState";
import { getCandidateDetail } from "../data/mockCandidates";

export function CandidateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const detail = id ? getCandidateDetail(id) : undefined;

  if (!detail) {
    return (
      <EmptyState
        title="Кандидат не найден"
        description="Этого профиля пока нет в данных."
        action={
          <button
            type="button"
            className="btn-secondary"
            onClick={() => navigate("/candidates")}
          >
            К кандидатам
          </button>
        }
      />
    );
  }

  return <CandidateDetail candidate={detail} onClose={() => navigate(-1)} />;
}
