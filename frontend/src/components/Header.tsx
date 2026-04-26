import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Moon, Sun, UserRoundCheck, Users } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { fakeHr } from "../data/fakeHr";
import { initials } from "../utils/format";

interface HeaderProps {
  hideProfile?: boolean;
  hideNav?: boolean;
}

const navItems = [
  { path: "/", label: "Дэшборд", Icon: LayoutDashboard },
  { path: "/candidates", label: "Кандидаты", Icon: Users },
] as const;

export function Header({ hideProfile, hideNav }: HeaderProps) {
  const { pathname } = useLocation();
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === "light";

  const headerBg = isLight
    ? "rgba(255,255,255,0.62)"
    : "rgba(18,17,55,0.70)";
  const headerBorder = isLight
    ? "rgba(43,38,74,0.10)"
    : "rgba(255,255,255,0.09)";

  function isActive(path: string) {
    if (path === "/") return pathname === "/";
    return pathname.startsWith(path);
  }

  return (
    <header className="sticky top-0 z-30 w-full">
      <div
        className="border-b"
        style={{
          background: headerBg,
          borderColor: headerBorder,
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
        }}
      >
        {/* ── Main row ── */}
        <div className="mx-auto flex w-full max-w-app items-center gap-3 px-4 py-3 md:px-8">
          {/* Brand */}
          <Link
            to="/"
            className="shrink-0 text-[15px] font-extrabold tracking-tight text-ink md:text-base"
            aria-label="HR.67 Platform — главная"
          >
            HR.67 Platform
          </Link>

          {/* Desktop nav */}
          {!hideNav && (
            <nav className="hidden items-center gap-1 md:flex" aria-label="Основная навигация">
              {navItems.map(({ path, label, Icon }) => {
                const active = isActive(path);
                return (
                  <Link
                    key={path}
                    to={path}
                    className={[
                      "inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition",
                      active
                        ? "bg-accent text-trust"
                        : isLight
                          ? "text-trust-muted hover:bg-black/5 hover:text-trust"
                          : "text-ink-muted hover:bg-white/10 hover:text-ink",
                    ].join(" ")}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon className="h-4 w-4" strokeWidth={active ? 2.4 : 2} />
                    {label}
                  </Link>
                );
              })}
            </nav>
          )}

          <div className="flex-1" />

          {/* Theme toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isLight ? "Включить тёмную тему" : "Включить светлую тему"}
            className={[
              "flex h-9 w-9 items-center justify-center rounded-xl transition",
              isLight
                ? "text-trust-muted hover:bg-black/6 hover:text-trust"
                : "text-ink-muted hover:bg-white/10 hover:text-ink",
            ].join(" ")}
          >
            {isLight ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>

          {/* HR profile */}
          {!hideProfile && (
            <div
              className="flex items-center gap-2 rounded-full px-2 py-1.5 sm:px-3"
              style={{
                background: isLight ? "rgba(43,38,74,0.07)" : "rgba(255,255,255,0.08)",
                border: isLight
                  ? "1px solid rgba(43,38,74,0.12)"
                  : "1px solid rgba(255,255,255,0.15)",
              }}
            >
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-trust"
                style={{ background: "linear-gradient(135deg, #C6ADFF 0%, #AADC00 100%)" }}
                aria-hidden="true"
              >
                {initials(fakeHr.name)}
              </div>
              <div className="hidden leading-tight sm:block">
                <div className="text-[12px] font-semibold text-ink">{fakeHr.name}</div>
                <div className="flex items-center gap-1 text-[10px] text-ink-muted">
                  <UserRoundCheck className="h-3 w-3" />
                  {fakeHr.role}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Mobile nav row ── */}
        {!hideNav && (
          <nav
            className="flex items-center gap-1.5 overflow-x-auto px-4 pb-2.5 md:hidden"
            aria-label="Мобильная навигация"
          >
            {navItems.map(({ path, label, Icon }) => {
              const active = isActive(path);
              return (
                <Link
                  key={path}
                  to={path}
                  className={[
                    "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold transition",
                    active
                      ? "bg-accent text-trust"
                      : isLight
                        ? "text-trust-muted hover:text-trust"
                        : "text-ink-muted hover:bg-white/10 hover:text-ink",
                  ].join(" ")}
                  style={{
                    minHeight: 36,
                    background: active
                      ? undefined
                      : isLight
                        ? "rgba(43,38,74,0.06)"
                        : "rgba(255,255,255,0.06)",
                    border: active
                      ? undefined
                      : isLight
                        ? "1px solid rgba(43,38,74,0.10)"
                        : "1px solid rgba(255,255,255,0.10)",
                  }}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon className="h-4 w-4" strokeWidth={active ? 2.4 : 2} />
                  {label}
                </Link>
              );
            })}
          </nav>
        )}
      </div>
    </header>
  );
}
