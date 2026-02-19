import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";

const tabs = ["Account", "Appearance", "Notifications", "Preferences", "Billing"] as const;
type Tab = (typeof tabs)[number];

type Envelope<T> = {
  data: T | null;
  error: { code: string; message: string } | null;
  code: "OK" | "ERROR";
};

type SessionResponse = {
  user: {
    id: string;
    email: string;
  };
};

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("Account");
  const [email, setEmail] = useState("loading...");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/auth/session");
        const payload = (await res.json()) as Envelope<SessionResponse>;
        if (payload.code === "OK" && payload.data?.user?.email) {
          setEmail(payload.data.user.email);
        } else {
          setEmail("unknown@example.com");
        }
      } catch {
        setEmail("unknown@example.com");
      }
    }
    void load();
  }, []);

  return (
    <AppShell>
      <h1 className="text-4xl font-bold text-slate-100">Settings</h1>
      <p className="mb-5 text-lg text-slate-400">Manage your account settings and preferences</p>

      <div className="mb-4 flex flex-wrap gap-2 rounded-xl bg-slate-800/80 p-2">
        {tabs.map((item) => (
          <button key={item} onClick={() => setTab(item)} className={`btn ${tab === item ? "btn-primary" : "btn-subtle"}`}>
            {item}
          </button>
        ))}
      </div>

      <Card className="p-4">
        {tab === "Account" && (
          <>
            <h2 className="text-3xl font-bold text-slate-100">Profile Information</h2>
            <p className="mb-4 text-lg text-slate-400">Connected to your current account session</p>
            <div className="grid gap-3 lg:grid-cols-2">
              <input className="field" defaultValue={email.split("@")[0]} />
              <input className="field" value={email} readOnly />
              <input className="field" defaultValue="+1 (555) 123-4567" />
              <select className="field">
                <option>America/New York (EST)</option>
              </select>
            </div>
            <div className="mt-4 flex justify-end">
              <button className="btn btn-primary">Save Changes</button>
            </div>
          </>
        )}
        {tab === "Notifications" && (
          <>
            <h2 className="text-3xl font-bold text-slate-100">Notification Settings</h2>
            <p className="mb-4 text-base text-slate-400">Manage how you receive notifications</p>
            <div className="space-y-3">
              {["Receive email notifications", "Weekly summary reports", "Budget limit alerts", "Bill payment reminders"].map(
                (item) => (
                  <div key={item} className="flex items-center justify-between rounded-lg border border-slate-700 p-3">
                    <span className="text-base">{item}</span>
                    <button className="h-8 w-14 rounded-full bg-sky-500/80" />
                  </div>
                )
              )}
            </div>
          </>
        )}
        {tab === "Appearance" && (
          <>
            <h2 className="text-3xl font-bold text-slate-100">Theme Settings</h2>
            <p className="mb-4 text-base text-slate-400">Customize the appearance of the application</p>
            <div className="space-y-4">
              {["Dark Mode", "Compact Mode", "High Contrast"].map((item) => (
                <div key={item} className="flex items-center justify-between rounded-lg border border-slate-700 p-3">
                  <span className="text-base">{item}</span>
                  <button className="h-8 w-14 rounded-full bg-slate-700" />
                </div>
              ))}
            </div>
          </>
        )}
        {(tab === "Preferences" || tab === "Billing") && (
          <>
            <h2 className="text-3xl font-bold text-slate-100">{tab}</h2>
            <p className="text-base text-slate-400">Section coming next in the same visual style.</p>
          </>
        )}
      </Card>
    </AppShell>
  );
}
