import { FormEvent, useState } from "react";
import Link from "next/link";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const strongPasswordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,72}$/;

export default function SignupPage() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const [showOtp, setShowOtp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

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
      setPendingEmail(value);
      setShowOtp(true);
      setMessage("Account created. OTP sent to your email.");
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function onVerifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    if (!/^\d{6}$/.test(otp.trim())) {
      setError("Enter the 6-digit OTP.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pendingEmail, otp: otp.trim() }),
      });
      const payload = await res.json();
      if (!res.ok || payload.code !== "OK") {
        setError(payload?.error?.message || "OTP verification failed.");
        return;
      }
      window.location.href = "/dashboard";
      return;
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function resendOtp() {
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pendingEmail }),
      });
      const payload = await res.json();
      if (!res.ok || payload.code !== "OK") {
        setError(payload?.error?.message || "Failed to resend OTP.");
        return;
      }
      setMessage("OTP resent. Check your email.");
    } catch {
      setError("Network error. Try again.");
    }
  }

  return (
    <main className="min-h-screen px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-md">
        <section className="panel p-8">
          <p className="text-base font-semibold text-cyan-300">FinTrack</p>
          <h1 className="mt-2 text-4xl font-bold">{showOtp ? "Verify email" : "Create account"}</h1>
          <p className="mt-2 text-sm text-slate-400">
            {showOtp ? `Enter the OTP sent to ${pendingEmail}.` : "Sign up to continue."}
          </p>

          {!showOtp ? (
            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <input
                type="text"
                placeholder="Name (optional)"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                autoComplete="name"
                className={`field ${error ? "field-error" : ""}`}
              />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                className={`field ${error ? "field-error" : ""}`}
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
                className={`field ${error ? "field-error" : ""}`}
              />
              <input
                type="password"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
                className={`field ${error ? "field-error" : ""}`}
              />
              <button type="submit" disabled={loading} className="btn btn-primary w-full py-2.5">
                {loading ? "Creating account..." : "Create account"}
              </button>
            </form>
          ) : (
            <form onSubmit={onVerifyOtp} className="mt-6 space-y-4">
              <input
                type="text"
                placeholder="6-digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                required
                className={`field ${error ? "field-error" : ""}`}
              />
              <button type="submit" disabled={loading} className="btn btn-primary w-full py-2.5">
                {loading ? "Verifying..." : "Verify and continue"}
              </button>
              <button type="button" onClick={resendOtp} className="btn btn-subtle w-full py-2.5">
                Resend OTP
              </button>
            </form>
          )}

          {error ? <p className="mt-3 rounded-lg border border-rose-800/60 bg-rose-950/30 px-3 py-2 text-sm text-rose-300">{error}</p> : null}
          {message ? <p className="mt-3 rounded-lg border border-emerald-800/60 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-300">{message}</p> : null}

          <p className="mt-5 text-sm text-slate-400">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-cyan-300 hover:text-cyan-200">
              Sign in
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
