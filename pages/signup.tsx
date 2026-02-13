import { FormEvent, useState } from "react";
import { useRouter } from "next/router";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignupPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
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

    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: value,
          displayName: displayName.trim() || undefined,
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
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <form onSubmit={onSubmit} style={{ width: "100%", maxWidth: 360, display: "grid", gap: 12 }}>
        <h1 style={{ margin: 0 }}>Create account</h1>
        <input
          type="text"
          placeholder="Name (optional)"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          autoComplete="name"
          style={{ padding: 10 }}
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
          style={{ padding: 10 }}
        />
        <button type="submit" disabled={loading} style={{ padding: 10 }}>
          {loading ? "Creating account..." : "Sign up"}
        </button>
        <a href="/login" style={{ fontSize: 14 }}>
          Already have an account? Login
        </a>
        {error ? <p style={{ color: "#b91c1c", margin: 0 }}>{error}</p> : null}
      </form>
    </main>
  );
}
