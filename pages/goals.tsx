import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/client";
import { AppNav } from "@/components/layout/app-nav";

type Envelope<T> = {
  data: T | null;
  error: { code: string; message: string } | null;
  code: "OK" | "ERROR";
};

type GoalItem = {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string | null;
  note: string | null;
  status: "ACTIVE" | "COMPLETED" | "ARCHIVED";
  progressRatio: number;
};

type GoalsResponse = {
  items: GoalItem[];
  summary: {
    totalTarget: number;
    totalCurrent: number;
    completed: number;
    total: number;
  };
};

function currency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

export default function GoalsPage() {
  const { status, login, user } = useAuth();
  const [goals, setGoals] = useState<GoalsResponse | null>(null);
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState("0");
  const [targetDate, setTargetDate] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (status !== "authenticated") return;
    setError(null);
    try {
      const res = await fetch("/api/goals");
      const payload = (await res.json()) as Envelope<GoalsResponse>;
      if (!res.ok || payload.code !== "OK" || !payload.data) throw new Error(payload.error?.message || "Failed goals");
      setGoals(payload.data);
    } catch (err) {
      setError((err as Error).message || "Failed to load goals");
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createGoal() {
    setError(null);
    const target = Number(targetAmount);
    const current = Number(currentAmount);
    if (!name.trim()) return setError("Goal name is required");
    if (!Number.isFinite(target) || target <= 0) return setError("Target amount must be greater than 0");
    if (!Number.isFinite(current) || current < 0) return setError("Current amount must be 0 or more");
    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), targetAmount: target, currentAmount: current, targetDate: targetDate || undefined, note: note || undefined }),
      });
      const payload = (await res.json()) as Envelope<GoalItem>;
      if (!res.ok || payload.code !== "OK") throw new Error(payload.error?.message || "Create failed");
      setName("");
      setTargetAmount("");
      setCurrentAmount("0");
      setTargetDate("");
      setNote("");
      void load();
    } catch (err) {
      setError((err as Error).message || "Create goal failed");
    }
  }

  async function addProgress(goal: GoalItem, delta: number) {
    setError(null);
    try {
      const res = await fetch(`/api/goals/${goal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentAmount: Number((goal.currentAmount + delta).toFixed(2)) }),
      });
      const payload = (await res.json()) as Envelope<GoalItem>;
      if (!res.ok || payload.code !== "OK") throw new Error(payload.error?.message || "Update failed");
      void load();
    } catch (err) {
      setError((err as Error).message || "Update goal failed");
    }
  }

  async function deleteGoal(id: string) {
    setError(null);
    try {
      const res = await fetch(`/api/goals/${id}`, { method: "DELETE" });
      const payload = (await res.json()) as Envelope<{ ok: boolean }>;
      if (!res.ok || payload.code !== "OK") throw new Error(payload.error?.message || "Delete failed");
      void load();
    } catch (err) {
      setError((err as Error).message || "Delete goal failed");
    }
  }

  const primaryButtonClass =
    "inline-flex items-center justify-center rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60";

  if (status === "loading") {
    return <p className="mx-auto max-w-6xl px-4 py-8 text-sm text-slate-600">Loading session...</p>;
  }
  if (status !== "authenticated" || !user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">Sign in required</h1>
          <p className="mt-2 text-sm text-slate-600">You must be signed in to view goals.</p>
          <button onClick={login} className={`${primaryButtonClass} mt-5`}>
            Sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-6">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-2 text-2xl font-semibold text-slate-900">Goals</h1>
        <AppNav />

        <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-2 sm:grid-cols-2">
            <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Goal name" value={name} onChange={(e) => setName(e.target.value)} />
            <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Target amount" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} />
            <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Current amount" value={currentAmount} onChange={(e) => setCurrentAmount(e.target.value)} />
            <input type="date" className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
            <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
            <button className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white" onClick={createGoal}>
              Add Goal
            </button>
          </div>
          {error && <p className="mt-2 text-sm text-rose-700">{error}</p>}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-2 text-sm text-slate-600">
            Total Target: {currency(goals?.summary.totalTarget ?? 0)} | Current: {currency(goals?.summary.totalCurrent ?? 0)} | Completed: {goals?.summary.completed ?? 0}/{goals?.summary.total ?? 0}
          </div>
          <div className="space-y-2">
            {(goals?.items || []).length === 0 && <p className="text-sm text-slate-600">No goals yet.</p>}
            {(goals?.items || []).map((goal) => (
              <div key={goal.id} className="rounded-md border border-slate-200 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-900">{goal.name}</p>
                  <button className="rounded-md border border-rose-300 px-2 py-1 text-xs text-rose-700" onClick={() => void deleteGoal(goal.id)}>
                    Delete
                  </button>
                </div>
                <p className="mt-1 text-xs text-slate-600">
                  {currency(goal.currentAmount)} / {currency(goal.targetAmount)} {goal.targetDate ? `| ${new Date(goal.targetDate).toLocaleDateString()}` : ""}
                </p>
                <div className="mt-2 h-2 rounded bg-slate-100">
                  <div className="h-2 rounded bg-sky-500" style={{ width: `${Math.min(100, Math.max(4, goal.progressRatio * 100))}%` }} />
                </div>
                <div className="mt-2 flex gap-2">
                  <button className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700" onClick={() => void addProgress(goal, 50)}>
                    +50
                  </button>
                  <button className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700" onClick={() => void addProgress(goal, 100)}>
                    +100
                  </button>
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600">{goal.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
