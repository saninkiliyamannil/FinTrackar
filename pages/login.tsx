import { FormEvent, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const value = email.trim().toLowerCase();
    if (!emailRegex.test(value)) {
      setError("Enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value, password }),
      });

      const payload = await res.json();
      if (!res.ok || payload.code !== "OK") {
        setError(payload?.error?.message || "Login failed.");
        return;
      }

      await router.replace("/transactions");
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto grid min-h-screen w-full max-w-5xl items-center gap-10 px-6 py-10 md:grid-cols-2">
        <section className="space-y-5">
          <p className="inline-block rounded-full border border-cyan-400/40 bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-cyan-200">
            FinTrackar
          </p>
          <h1 className="text-4xl font-extrabold leading-tight">Sign in to your finance workspace</h1>
          <p className="text-sm text-slate-300">
            Securely access your accounts, categories, transactions, and analytics.
          </p>
        </section>

        <form
          onSubmit={onSubmit}
          className="w-full rounded-2xl border border-slate-700 bg-slate-900/80 p-6 shadow-2xl shadow-black/40"
        >
          <h2 className="mb-5 text-2xl font-bold">Login</h2>
          <div className="space-y-4">
            <label className="block text-sm text-slate-300">
              Email
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none ring-cyan-400 placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2"
              />
            </label>
            <label className="block text-sm text-slate-300">
              Password
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none ring-cyan-400 placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2"
              />
            </label>
          </div>

          {error ? <p className="mt-3 text-sm text-rose-400">{error}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="mt-5 w-full rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>

          <p className="mt-4 text-sm text-slate-300">
            No account?{" "}
            <Link href="/signup" className="font-semibold text-cyan-300 hover:text-cyan-200">
              Create one
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
