import Link from "next/link";
import { useRouter } from "next/router";
import { PropsWithChildren, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/auth/client";

type IconName =
  | "dashboard"
  | "transactions"
  | "budgets"
  | "goals"
  | "reports"
  | "calendar"
  | "shared"
  | "search"
  | "bell"
  | "sun"
  | "moon"
  | "user"
  | "menu"
  | "close"
  | "logout"
  | "login";

function AppIcon({ name, className = "h-4 w-4" }: { name: IconName; className?: string }) {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (name) {
    case "dashboard":
      return (
        <svg {...common}>
          <path d="M3 12l9-8 9 8" />
          <path d="M9 21V9h6v12" />
        </svg>
      );
    case "transactions":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M3 10h18" />
        </svg>
      );
    case "budgets":
      return (
        <svg {...common}>
          <path d="M12 2v20" />
          <path d="M17 5H9a3 3 0 0 0 0 6h6a3 3 0 0 1 0 6H7" />
        </svg>
      );
    case "goals":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    case "reports":
      return (
        <svg {...common}>
          <path d="M4 19V5" />
          <path d="M10 19V9" />
          <path d="M16 19V13" />
          <path d="M22 19V3" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      );
    case "shared":
      return (
        <svg {...common}>
          <circle cx="8" cy="9" r="3" />
          <circle cx="17" cy="8" r="2.5" />
          <path d="M2 20a6 6 0 0 1 12 0" />
          <path d="M14 20a5 5 0 0 1 8 0" />
        </svg>
      );
    case "search":
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" />
        </svg>
      );
    case "bell":
      return (
        <svg {...common}>
          <path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 7h18s-3 0-3-7" />
          <path d="M10 21a2 2 0 0 0 4 0" />
        </svg>
      );
    case "sun":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      );
    case "moon":
      return (
        <svg {...common}>
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      );
    case "user":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21a8 8 0 0 1 16 0" />
        </svg>
      );
    case "menu":
      return (
        <svg {...common}>
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      );
    case "close":
      return (
        <svg {...common}>
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      );
    case "logout":
      return (
        <svg {...common}>
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <path d="M16 17l5-5-5-5" />
          <path d="M21 12H9" />
        </svg>
      );
    case "login":
      return (
        <svg {...common}>
          <path d="M10 17l5-5-5-5" />
          <path d="M15 12H3" />
          <path d="M13 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" />
        </svg>
      );
  }
}

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" as const },
  { href: "/transactions", label: "Transactions", icon: "transactions" as const },
  { href: "/budgets", label: "Budgets", icon: "budgets" as const },
  { href: "/goals", label: "Goals", icon: "goals" as const },
  { href: "/reports", label: "Reports", icon: "reports" as const },
  { href: "/calendar", label: "Calendar", icon: "calendar" as const },
  { href: "/shared-expenses", label: "Shared Expenses", icon: "shared" as const },
];

type AppShellProps = PropsWithChildren<{
  actions?: ReactNode;
}>;

type Envelope<T> = {
  data: T | null;
  error: { code: string; message: string } | null;
  code: "OK" | "ERROR";
};

type BudgetItem = {
  id: string;
  amount: number;
  spent: number;
  usageRatio: number;
  category: { name: string };
};

type GoalsResponse = {
  items: {
    id: string;
    name: string;
    targetAmount: number;
    currentAmount: number;
    targetDate: string | null;
    progressRatio: number;
  }[];
};

type BudgetsResponse = {
  items: BudgetItem[];
};

type Notice = {
  id: string;
  title: string;
  message: string;
  when: string;
  tone: "warn" | "alert" | "success" | "info";
};

type ReminderItem = {
  id: string;
  message: string;
  remindedAt: string;
  anchor: { id: string; label: string; locationKey: string };
};

export function AppShell({ actions, children }: AppShellProps) {
  const router = useRouter();
  const { status, user, login, logout } = useAuth();
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [budgetCount, setBudgetCount] = useState(0);
  const [goalCount, setGoalCount] = useState(0);
  const [isDark, setIsDark] = useState(false);
  const [search, setSearch] = useState("");
  const bellRef = useRef<HTMLDivElement | null>(null);
  const profileRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      if (!bellRef.current) return;
      if (!bellRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }

    document.addEventListener("mousedown", onDocClick);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem("fintrack-theme");
    const dark = saved === "dark";
    setIsDark(dark);
    document.documentElement.classList.toggle("light-mode", !dark);
  }, []);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [router.pathname]);

  useEffect(() => {
    if (status !== "authenticated") return;

    // Build a compact notification feed from budgets, goals, and location reminders.
    async function loadNotifications() {
      const now = new Date();
      const month = now.getUTCMonth() + 1;
      const year = now.getUTCFullYear();

      try {
        const [budgetRes, goalsRes, reminderRes] = await Promise.all([
          fetch(`/api/budgets?month=${month}&year=${year}`).then((r) => r.json() as Promise<Envelope<BudgetsResponse>>),
          fetch("/api/goals").then((r) => r.json() as Promise<Envelope<GoalsResponse>>),
          fetch("/api/location-reminders/recent").then((r) => r.json() as Promise<Envelope<ReminderItem[]>>),
        ]);

        const budgetItems = budgetRes.code === "OK" && budgetRes.data ? budgetRes.data.items : [];
        const goalItems = goalsRes.code === "OK" && goalsRes.data ? goalsRes.data.items : [];

        setBudgetCount(budgetItems.length);
        setGoalCount(goalItems.length);

        const budgetNotices: Notice[] = budgetItems
          .filter((b) => b.usageRatio >= 0.8)
          .map((b) => {
            const pct = Math.round(b.usageRatio * 100);
            return {
              id: `budget-${b.id}`,
              title: pct >= 100 ? "Budget Over Limit" : "Budget Alert",
              message: `${b.category.name} is at ${pct}% of its limit.`,
              when: "This month",
              tone: pct >= 100 ? "alert" : "warn",
            };
          });

        const goalNotices: Notice[] = goalItems.slice(0, 4).map((g) => {
          if (g.progressRatio >= 1) {
            return {
              id: `goal-done-${g.id}`,
              title: "Goal Achieved",
              message: `You reached your ${g.name} goal.`,
              when: "Recently",
              tone: "success",
            };
          }

          if (g.targetDate) {
            const target = new Date(g.targetDate);
            const days = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            if (days >= 0 && days <= 10) {
              return {
                id: `goal-due-${g.id}`,
                title: "Goal Deadline Near",
                message: `${g.name} is due in ${days} day${days === 1 ? "" : "s"}.`,
                when: "Upcoming",
                tone: "info",
              };
            }
          }

          const progress = Math.round(g.progressRatio * 100);
          return {
            id: `goal-progress-${g.id}`,
            title: "Goal Progress",
            message: `${g.name} is ${progress}% complete.`,
            when: "Latest",
            tone: "info",
          };
        });

        const reminderNotices: Notice[] =
          reminderRes.code === "OK" && reminderRes.data
            ? reminderRes.data.slice(0, 3).map((r) => ({
                id: `location-reminder-${r.id}`,
                title: `Cash Reminder (${r.anchor.label})`,
                message: r.message,
                when: new Date(r.remindedAt).toLocaleString(),
                tone: "info" as const,
              }))
            : [];

        setNotices([...reminderNotices, ...budgetNotices, ...goalNotices].slice(0, 8));
      } catch {
        setNotices([]);
        setBudgetCount(0);
        setGoalCount(0);
      }
    }

    void loadNotifications();
  }, [status]);

  function toggleTheme() {
    setIsDark((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        window.localStorage.setItem("fintrack-theme", next ? "dark" : "light");
      }
      document.documentElement.classList.toggle("light-mode", !next);
      return next;
    });
  }

  function submitSearch() {
    const term = search.trim();
    void router.push(term ? `/transactions?search=${encodeURIComponent(term)}` : "/transactions");
  }

  const badgeCount = useMemo(() => notices.length, [notices.length]);

  if (status === "loading") {
    return <div className="p-8 text-base text-slate-300">Loading session...</div>;
  }

  if (status !== "authenticated" || !user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="panel p-6">
          <h1 className="text-2xl font-semibold text-slate-100">Sign in required</h1>
          <p className="mt-2 text-base text-slate-400">You must be signed in to access this page.</p>
          <button onClick={login} className="btn btn-primary mt-4">
            <AppIcon name="login" />
            <span>Sign in</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ft-layout">
      {mobileNavOpen && <button className="ft-backdrop" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />}
      <aside className={`ft-sidebar ${mobileNavOpen ? "is-open" : ""}`}>
        <div className="ft-brand">
          <span className="ft-brand-badge">FT</span>
          <span>FinTrack</span>
          <button className="btn btn-subtle ft-mobile-close" aria-label="Close menu" onClick={() => setMobileNavOpen(false)}>
            <AppIcon name="close" />
          </button>
        </div>
        <nav className="ft-menu">
          {navItems.map((item) => {
            const active = router.pathname === item.href;
            return (
              <Link key={item.href} href={item.href} className={active ? "active" : ""} aria-label={item.label}>
                <strong>
                  <AppIcon name={item.icon} />
                </strong>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="ft-main">
        <header className="ft-topbar">
          <button className="btn btn-subtle ft-mobile-menu" onClick={() => setMobileNavOpen((v) => !v)} aria-label="Open menu">
            <AppIcon name={mobileNavOpen ? "close" : "menu"} />
          </button>
          <div className="ft-search">
            <div className="flex gap-2">
              <input
                className="field"
                placeholder="Search transactions..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitSearch();
                }}
              />
              <button className="btn btn-subtle px-3" onClick={submitSearch} aria-label="Search transactions">
                <AppIcon name="search" />
                <span className="ft-btn-label">Search</span>
              </button>
            </div>
          </div>
          <div className="ft-top-actions">
            {actions}
            <span className="ft-pill">Secure</span>
            <div ref={bellRef} className="relative">
              <button className="btn btn-subtle px-3 py-1 text-base" onClick={() => setNotifOpen((v) => !v)} aria-label="Notifications">
                <AppIcon name="bell" />
                <span className="ft-btn-label">Alerts</span>
                {badgeCount > 0 && (
                  <span className="absolute -right-2 -top-2 rounded-full bg-sky-500 px-1 text-xs text-slate-950">{badgeCount}</span>
                )}
              </button>
              {notifOpen && (
                <div className="panel absolute right-0 top-10 z-[90] w-[360px] max-w-[92vw] p-0 shadow-2xl">
                  <div className="border-b border-slate-700 px-4 py-3">
                    <p className="text-base font-semibold text-slate-100">Notifications</p>
                    <p className="text-xs text-slate-400">
                      Quick peek: {budgetCount} budgets, {goalCount} goals
                    </p>
                  </div>
                  <div className="max-h-80 overflow-auto px-2 py-2">
                    {notices.length === 0 && <p className="px-2 py-4 text-sm text-slate-400">No recent alerts.</p>}
                    {notices.map((n) => (
                      <div key={n.id} className="rounded-md px-2 py-2">
                        <div className="mb-1 flex items-center gap-2">
                          <span
                            className={`inline-block h-2 w-2 rounded-full ${
                              n.tone === "alert"
                                ? "bg-rose-500"
                                : n.tone === "warn"
                                  ? "bg-amber-400"
                                  : n.tone === "success"
                                    ? "bg-emerald-400"
                                    : "bg-sky-400"
                            }`}
                          />
                          <p className="text-sm font-semibold text-slate-100">{n.title}</p>
                        </div>
                        <p className="text-sm text-slate-300">{n.message}</p>
                        <p className="text-xs text-slate-500">{n.when}</p>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-slate-700 px-4 py-3 text-center text-sm font-semibold text-slate-200">
                    View all notifications
                  </div>
                </div>
              )}
            </div>
            <button className="btn btn-subtle px-3 py-1 text-base" onClick={toggleTheme} aria-label="Toggle theme">
              <AppIcon name={isDark ? "sun" : "moon"} />
              <span className="ft-btn-label">{isDark ? "Light" : "Dark"}</span>
            </button>
            <div ref={profileRef} className="relative">
              <button className="btn btn-subtle px-3 py-1 text-base" onClick={() => setProfileOpen((v) => !v)} aria-label="Profile menu">
                <AppIcon name="user" />
                <span className="ft-btn-label">Profile</span>
              </button>
              {profileOpen && (
                <div className="panel absolute right-0 top-10 z-[95] w-52 p-2 shadow-2xl">
                  <button className="btn btn-subtle mb-2 w-full justify-start" onClick={() => void router.push("/profile")}>
                    <AppIcon name="user" />
                    <span>Profile</span>
                  </button>
                  <button className="btn btn-danger w-full justify-start" onClick={() => void logout()}>
                    <AppIcon name="logout" />
                    <span>Log out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="ft-content">{children}</main>
      </div>
    </div>
  );
}
