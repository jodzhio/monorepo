import { scoreColor } from "../utils/scoring";

interface ScoreBadgeProps {
  percent: number;
  size?: "sm" | "md" | "lg";
}

export function ScoreBadge({ percent, size = "md" }: ScoreBadgeProps) {
  const c = scoreColor(percent);
  const sizes = {
    sm: "h-9 w-9 text-xs",
    md: "h-11 w-11 text-sm",
    lg: "h-14 w-14 text-base",
  };
  return (
    <div
      className={[
        "flex shrink-0 items-center justify-center rounded-full font-bold ring-2",
        sizes[size],
        c.bg,
        c.fg,
        c.ring,
      ].join(" ")}
      aria-label={`Балл ${percent} из 100`}
    >
      <span className="leading-none">{percent}</span>
    </div>
  );
}
