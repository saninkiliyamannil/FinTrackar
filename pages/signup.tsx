import { FormEvent, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const strongPasswordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,72}$/;

export default function SignupPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
    if (!strongPasswordRegex.test(password)) {
      setError("Password must be 8-72 chars and include at least one letter and one number.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: value,
          displayName: displayName.trim() || undefined,
          password,
        }),
      });

      const payload = await res.json();
      if (!res.ok || payload.code !== "OK") {
        setError(payload?.error?.message || "Signup failed.");
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
          <p className="inline-block rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-200">
            FinTrackar
          </p>
          <h1 className="text-4xl font-extrabold leading-tight">Create your account</h1>
          <p className="text-sm text-slate-300">
            Start tracking spending, income, and budgets with a secure local account.
          </p>
        </section>

        <form
          onSubmit={onSubmit}
          className="w-full rounded-2xl border border-slate-700 bg-slate-900/80 p-6 shadow-2xl shadow-black/40"
        >
          <h2 className="mb-5 text-2xl font-bold">Sign up</h2>
          <div className="space-y-4">
            <label className="block text-sm text-slate-300">
              Name (optional)
              <input
                type="text"
                placeholder="Jane Doe"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                autoComplete="name"
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none ring-emerald-400 placeholder:text-slate-500 focus:border-emerald-400 focus:ring-2"
              />
            </label>
            <label className="block text-sm text-slate-300">
              Email
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none ring-emerald-400 placeholder:text-slate-500 focus:border-emerald-400 focus:ring-2"
              />
            </label>
            <label className="block text-sm text-slate-300">
              Password
              <input
                type="password"
                placeholder="8+ chars with letters and numbers"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none ring-emerald-400 placeholder:text-slate-500 focus:border-emerald-400 focus:ring-2"
              />
            </label>
            <label className="block text-sm text-slate-300">
              Confirm password
              <input
                type="password"
                placeholder="Repeat your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none ring-emerald-400 placeholder:text-slate-500 focus:border-emerald-400 focus:ring-2"
              />
            </label>
          </div>

          {error ? <p className="mt-3 text-sm text-rose-400">{error}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="mt-5 w-full rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>

          <p className="mt-4 text-sm text-slate-300">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-emerald-300 hover:text-emerald-200">
              Login
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
