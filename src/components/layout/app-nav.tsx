import Link from "next/link";
import { useRouter } from "next/router";

const links = [
  { href: "/transactions", label: "Transactions", icon: "card" },
  { href: "/budgets", label: "Budgets", icon: "wallet" },
  { href: "/goals", label: "Goals", icon: "target" },
  { href: "/shared-expenses", label: "Shared Expenses", icon: "users" },
];

function NavIcon({ icon }: { icon: (typeof links)[number]["icon"] }) {
  // Keep this icon set local so AppNav stays portable across pages.
  const common = {
    className: "h-4 w-4",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (icon) {
    case "card":
      return <svg {...common}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18" /></svg>;
    case "wallet":
      return <svg {...common}><path d="M3 7h18v10H3z" /><path d="M16 12h5" /></svg>;
    case "target":
      return <svg {...common}><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /></svg>;
    case "users":
      return <svg {...common}><circle cx="8" cy="9" r="3" /><circle cx="17" cy="8" r="2.5" /><path d="M2 20a6 6 0 0 1 12 0" /><path d="M14 20a5 5 0 0 1 8 0" /></svg>;
  }
}

export function AppNav() {
  const router = useRouter();

  return (
    <nav className="mb-5 flex flex-wrap items-center gap-2">
      {links.map((link) => {
        const active = router.pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`btn ${
              active ? "btn-primary" : "btn-subtle"
            }`}
          >
            <NavIcon icon={link.icon} />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
