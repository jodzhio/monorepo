import { useRef, useState } from "react";
import { Briefcase, FileText, GraduationCap, Sparkles, Upload, User } from "lucide-react";
import type { CandidateCreateRequest, Grade } from "../types/api";

// Grade labels stay in English — "Intern / Junior / Middle / Senior / Lead" are
// universally understood industry terms and should not be transliterated.
const GRADES: Grade[] = ["Intern", "Junior", "Middle", "Senior", "Lead"];

interface ApplicationFormProps {
  initialPosition?: string;
  submitting: boolean;
  onSubmit: (form: Omit<CandidateCreateRequest, "candidate_id">) => void;
}

export function ApplicationForm({ initialPosition, submitting, onSubmit }: ApplicationFormProps) {
  const [position, setPosition] = useState(initialPosition ?? "");
  const [grade, setGrade] = useState<Grade>("Middle");
  const [about, setAbout] = useState("");
  const [education, setEducation] = useState("");
  const [resumeUrl, setResumeUrl] = useState("");
  const [resumeFileName, setResumeFileName] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  function validate() {
    const e: Record<string, string> = {};
    if (!position.trim()) e.position = "Укажите должность";
    if (!about.trim()) e.about = "Расскажите немного о себе";
    if (!education.trim()) e.education = "Укажите образование";
    if (!resumeUrl.trim()) e.resumeUrl = "Добавьте ссылку на резюме";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({
      position: position.trim(),
      grade,
      about: about.trim(),
      education: education.trim(),
      resume_url: resumeUrl.trim(),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* ── О вакансии ── */}
      <div className="card p-4 md:p-6">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-soft-lavender text-trust">
            <User className="h-4 w-4" />
          </div>
          <div className="text-sm font-semibold text-ink">О вакансии</div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="label" htmlFor="position">
              <span className="inline-flex items-center gap-1.5">
                <Briefcase className="h-3.5 w-3.5" /> Должность
              </span>
            </label>
            <input
              id="position"
              className="input"
              placeholder="например, Go-разработчик"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
            />
            {errors.position && (
              <div className="mt-1 text-[11px] text-danger">{errors.position}</div>
            )}
          </div>

          <div>
            <span className="label">Грейд</span>
            <div className="flex flex-wrap gap-1.5">
              {GRADES.map((g) => {
                const active = g === grade;
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGrade(g)}
                    className={[
                      "rounded-full px-3.5 py-2 text-xs font-semibold transition",
                      active
                        ? "bg-accent text-trust shadow-sm"
                        : "border border-border bg-white text-trust-muted hover:text-trust hover:border-accent/50",
                    ].join(" ")}
                    style={{ minHeight: 36 }}
                  >
                    {g}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── О вас ── */}
      <div className="card p-4 md:p-6">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-soft-lime text-success">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="text-sm font-semibold text-ink">О вас</div>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="label" htmlFor="about">
              Кратко о себе
            </label>
            <textarea
              id="about"
              className="input min-h-[110px] resize-y py-3"
              placeholder="3 года работаю с Go, фокус на высоконагруженных сервисах..."
              value={about}
              onChange={(e) => setAbout(e.target.value)}
            />
            {errors.about && (
              <div className="mt-1 text-[11px] text-danger">{errors.about}</div>
            )}
          </div>

          <div>
            <label className="label" htmlFor="education">
              <span className="inline-flex items-center gap-1.5">
                <GraduationCap className="h-3.5 w-3.5" /> Образование
              </span>
            </label>
            <input
              id="education"
              className="input"
              placeholder="МГТУ им. Баумана, Прикладная информатика, 2022"
              value={education}
              onChange={(e) => setEducation(e.target.value)}
            />
            {errors.education && (
              <div className="mt-1 text-[11px] text-danger">{errors.education}</div>
            )}
          </div>
        </div>
      </div>

      {/* ── Резюме ── */}
      <div className="card p-4 md:p-6">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-soft-warning text-warning">
            <FileText className="h-4 w-4" />
          </div>
          <div className="text-sm font-semibold text-ink">Резюме</div>
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <label className="label" htmlFor="resumeUrl">
              Ссылка на резюме
            </label>
            <input
              id="resumeUrl"
              type="url"
              className="input"
              placeholder="https://example.com/resume.pdf"
              value={resumeUrl}
              onChange={(e) => setResumeUrl(e.target.value)}
            />
            {errors.resumeUrl && (
              <div className="mt-1 text-[11px] text-danger">{errors.resumeUrl}</div>
            )}
          </div>

          {/* Visual file picker — payload still sends resume_url */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                setResumeFileName(f.name);
                if (!resumeUrl)
                  setResumeUrl(`https://upload.placeholder/${encodeURIComponent(f.name)}`);
              }
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full items-center justify-between rounded-2xl border-2 border-dashed border-border bg-white/50 px-4 py-3 text-left transition hover:border-accent/50 hover:bg-soft-lime/30"
          >
            <span className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-trust shadow-sm">
                <Upload className="h-4 w-4" />
              </span>
              <span className="leading-tight">
                <span className="block text-sm font-semibold text-ink">
                  {resumeFileName ?? "Загрузить PDF или DOCX"}
                </span>
                <span className="block text-[11px] text-ink-muted">
                  Визуальный плейсхолдер — бэкенд использует ссылку выше
                </span>
              </span>
            </span>
            <span className="text-[11px] font-semibold text-accent">Выбрать</span>
          </button>
        </div>
      </div>

      <button type="submit" className="btn-primary w-full text-base" disabled={submitting}>
        {submitting ? "Отправляем анкету..." : "Отправить и начать AI-скрининг"}
      </button>
      <p className="-mt-1 text-center text-[11px] text-ink-muted">
        Данные используются только для скрининга. Возраст, пол и фото не учитываются.
      </p>
    </form>
  );
}
