import { useEffect } from "react";
import { useRouter } from "next/router";

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    let active = true;

    async function run() {
      try {
        await fetch("/api/auth/logout", { method: "POST" });
      } finally {
        if (active) {
          await router.replace("/login");
        }
      }
    }

    void run();

    return () => {
      active = false;
    };
  }, [router]);

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <p>Signing out...</p>
    </main>
  );
}
