import { FormEvent, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/auth/client";

type Envelope<T> = {
  data: T | null;
  error: { code: string; message: string } | null;
  code: "OK" | "ERROR";
};

type ProfileResponse = {
  user: {
    id: string;
    email: string;
    displayName: string | null;
    image: string | null;
    createdAt: string;
  };
};

export default function ProfilePage() {
  const { logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [image, setImage] = useState("");
  const [createdAt, setCreatedAt] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/profile");
        const payload = (await res.json()) as Envelope<ProfileResponse>;
        if (!res.ok || payload.code !== "OK" || !payload.data) {
          throw new Error(payload.error?.message || "Failed to load profile");
        }

        const user = payload.data.user;
        setEmail(user.email);
        setDisplayName(user.displayName || "");
        setImage(user.image || "");
        setCreatedAt(user.createdAt);
      } catch (err) {
        setError((err as Error).message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    }

    void loadProfile();
  }, []);

  async function onSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayName.trim() || null,
          image: image.trim() || null,
        }),
      });

      const payload = (await res.json()) as Envelope<ProfileResponse>;
      if (!res.ok || payload.code !== "OK" || !payload.data) {
        throw new Error(payload.error?.message || "Failed to save profile");
      }

      const user = payload.data.user;
      setDisplayName(user.displayName || "");
      setImage(user.image || "");
      setSuccess("Profile updated.");
    } catch (err) {
      setError((err as Error).message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  async function onAvatarUpload(file: File | null) {
    if (!file) return;
    setUploading(true);
    setError(null);
    setSuccess(null);
    try {
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("Failed to read image"));
        reader.readAsDataURL(file);
      });

      const res = await fetch("/api/profile/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl }),
      });
      const payload = (await res.json()) as Envelope<{ image: string }>;
      if (!res.ok || payload.code !== "OK" || !payload.data) {
        throw new Error(payload.error?.message || "Upload failed");
      }

      setImage(payload.data.image);
      setSuccess("Profile picture updated.");
    } catch (err) {
      setError((err as Error).message || "Failed to upload profile picture");
    } finally {
      setUploading(false);
    }
  }

  const joinedLabel = useMemo(() => {
    if (!createdAt) return "";
    return new Date(createdAt).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }, [createdAt]);

  return (
    <AppShell>
      <h1 className="text-4xl font-bold text-slate-100">Profile</h1>
      <p className="mb-5 text-lg text-slate-400">Manage your personal account details</p>

      <Card className="p-5" as="div">
        {loading ? (
          <p className="text-sm text-slate-400">Loading profile...</p>
        ) : (
          <form onSubmit={onSave} className="grid gap-4 lg:grid-cols-[220px_1fr]">
            <div className="rounded-xl border border-slate-700 bg-slate-950/40 p-4">
              <div className="mx-auto mb-3 grid h-24 w-24 place-items-center rounded-full border border-slate-600 bg-slate-900 text-3xl font-semibold text-slate-200">
                {image ? <img src={image} alt="Avatar" className="h-24 w-24 rounded-full object-cover" /> : (displayName || email || "U").slice(0, 1).toUpperCase()}
              </div>
              <p className="text-center text-base font-semibold text-slate-100">{displayName || "Unnamed User"}</p>
              <p className="text-center text-xs text-slate-400">{email}</p>
              {joinedLabel && <p className="mt-2 text-center text-xs text-slate-500">Joined {joinedLabel}</p>}
            </div>

            <div className="space-y-4">
              <label className="block text-sm">
                <span className="text-slate-300">Display Name</span>
                <input className="field mt-1" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={120} />
              </label>
              <label className="block text-sm">
                <span className="text-slate-300">Email (read-only)</span>
                <input className="field mt-1" value={email} readOnly />
              </label>
              <label className="block text-sm">
                <span className="text-slate-300">Avatar URL (optional)</span>
                <input
                  className="field mt-1"
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  placeholder="https://example.com/avatar.png"
                />
              </label>
              <label className="block text-sm">
                <span className="text-slate-300">Upload Profile Picture</span>
                <input
                  className="field mt-1"
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={(e) => void onAvatarUpload(e.target.files?.[0] || null)}
                />
                <span className="mt-1 block text-xs text-slate-500">{uploading ? "Uploading..." : "Choose image from your device"}</span>
              </label>

              {error && <p className="rounded-lg border border-rose-800/60 bg-rose-950/30 px-3 py-2 text-sm text-rose-300">{error}</p>}
              {success && <p className="rounded-lg border border-emerald-800/60 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-300">{success}</p>}

              <div className="flex justify-end gap-2">
                <button type="button" className="btn btn-danger" onClick={() => void logout()}>
                  Log out
                </button>
                <button type="submit" disabled={saving} className="btn btn-primary">
                  {saving ? "Saving..." : "Save Profile"}
                </button>
              </div>
            </div>
          </form>
        )}
      </Card>
    </AppShell>
  );
}
