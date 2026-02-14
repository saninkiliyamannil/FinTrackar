import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/client";
import { AppNav } from "@/components/layout/app-nav";

type Envelope<T> = {
  data: T | null;
  error: { code: string; message: string } | null;
  code: "OK" | "ERROR";
};

type SharedGroupMember = {
  id: string;
  userId: string;
  displayName: string;
  role: "OWNER" | "MEMBER";
};

type SharedGroup = {
  id: string;
  name: string;
  description: string | null;
  inviteCode: string;
  isPersonal: boolean;
  members: SharedGroupMember[];
  _count?: { expenses: number; settlements: number };
};

type SharedExpenseParticipant = {
  id: string;
  participantName: string;
  shareAmount: number;
  paidAmount: number;
  isSettled: boolean;
};

type SharedExpenseItem = {
  id: string;
  title: string;
  note: string | null;
  totalAmount: number;
  date: string;
  splitMethod: "EQUAL" | "CUSTOM";
  groupId: string | null;
  group?: { id: string; name: string; inviteCode: string } | null;
  participants: SharedExpenseParticipant[];
};

type SharedExpensesResponse = {
  items: SharedExpenseItem[];
  summary: { totalAmount: number; totalParticipants: number; settledParticipants: number };
};

type SharedSettlementSuggestion = {
  fromMemberId: string;
  toMemberId: string;
  fromDisplayName: string;
  toDisplayName: string;
  amount: number;
};

type SharedSettlementRecord = {
  id: string;
  amount: number;
  status: "PROPOSED" | "SETTLED" | "CANCELED";
  note: string | null;
  fromMember: { id: string; displayName: string };
  toMember: { id: string; displayName: string };
  createdAt?: string;
};

type SharedSettlementsResponse = {
  suggestions: SharedSettlementSuggestion[];
  settlements: SharedSettlementRecord[];
};

function currency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

function parseParticipantNames(raw: string) {
  return raw
    .split(/[\n,]/g)
    .map((value) => value.trim())
    .filter(Boolean);
}

export default function SharedExpensesPage() {
  const { status, login, user } = useAuth();

  const [sharedGroups, setSharedGroups] = useState<SharedGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [sharedExpenses, setSharedExpenses] = useState<SharedExpensesResponse | null>(null);
  const [settlements, setSettlements] = useState<SharedSettlementsResponse | null>(null);

  const [newGroupName, setNewGroupName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [title, setTitle] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [participantsText, setParticipantsText] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [splitMethod, setSplitMethod] = useState<"EQUAL" | "CUSTOM">("EQUAL");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (status !== "authenticated") return;
    setError(null);
    try {
      const groupsRes = await fetch("/api/shared-groups");
      const groupsPayload = (await groupsRes.json()) as Envelope<SharedGroup[]>;
      if (!groupsRes.ok || groupsPayload.code !== "OK" || !groupsPayload.data) {
        throw new Error(groupsPayload.error?.message || "Failed groups");
      }

      const groups = groupsPayload.data;
      const groupId = selectedGroupId || groups[0]?.id || "";
      setSharedGroups(groups);
      if (!selectedGroupId && groupId) setSelectedGroupId(groupId);

      if (!groupId) {
        setSharedExpenses({ items: [], summary: { totalAmount: 0, totalParticipants: 0, settledParticipants: 0 } });
        setSettlements({ suggestions: [], settlements: [] });
        return;
      }

      const [expenseRes, settlementRes] = await Promise.all([
        fetch(`/api/shared-expenses?groupId=${groupId}`).then((res) => res.json() as Promise<Envelope<SharedExpensesResponse>>),
        fetch(`/api/shared-groups/${groupId}/settlements`).then((res) => res.json() as Promise<Envelope<SharedSettlementsResponse>>),
      ]);
      if (expenseRes.code !== "OK" || !expenseRes.data) throw new Error(expenseRes.error?.message || "Failed shared expenses");
      if (settlementRes.code !== "OK" || !settlementRes.data) throw new Error(settlementRes.error?.message || "Failed settlements");

      setSharedExpenses(expenseRes.data);
      setSettlements(settlementRes.data);
    } catch (err) {
      setError((err as Error).message || "Failed to load shared expenses");
    }
  }, [selectedGroupId, status]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createGroup() {
    if (!newGroupName.trim()) return setError("Group name is required");
    setError(null);
    try {
      const res = await fetch("/api/shared-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newGroupName.trim() }),
      });
      const payload = (await res.json()) as Envelope<SharedGroup>;
      if (!res.ok || payload.code !== "OK" || !payload.data) throw new Error(payload.error?.message || "Create failed");
      setNewGroupName("");
      setSelectedGroupId(payload.data.id);
      void load();
    } catch (err) {
      setError((err as Error).message || "Create group failed");
    }
  }

  async function joinGroup() {
    if (!joinCode.trim()) return setError("Invite code is required");
    setError(null);
    try {
      const res = await fetch("/api/shared-groups/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: joinCode.trim() }),
      });
      const payload = (await res.json()) as Envelope<{ groupId: string }>;
      if (!res.ok || payload.code !== "OK") throw new Error(payload.error?.message || "Join failed");
      setJoinCode("");
      void load();
    } catch (err) {
      setError((err as Error).message || "Join group failed");
    }
  }

  async function createSharedExpense() {
    setError(null);
    const amount = Number(totalAmount);
    const names = parseParticipantNames(participantsText);
    if (!selectedGroupId) return setError("Select a group");
    if (!title.trim()) return setError("Title is required");
    if (!Number.isFinite(amount) || amount <= 0) return setError("Amount must be greater than 0");
    if (names.length === 0) return setError("At least one participant is required");
    try {
      const res = await fetch("/api/shared-expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId: selectedGroupId,
          title: title.trim(),
          totalAmount: amount,
          date,
          note: note || undefined,
          splitMethod,
          participants: names.map((participantName) => ({ participantName })),
        }),
      });
      const payload = (await res.json()) as Envelope<SharedExpenseItem>;
      if (!res.ok || payload.code !== "OK") throw new Error(payload.error?.message || "Create failed");
      setTitle("");
      setTotalAmount("");
      setParticipantsText("");
      setNote("");
      setDate(new Date().toISOString().slice(0, 10));
      void load();
    } catch (err) {
      setError((err as Error).message || "Create shared expense failed");
    }
  }

  async function toggleParticipantSettled(expense: SharedExpenseItem, participantId: string) {
    setError(null);
    try {
      const participants = expense.participants.map((participant) =>
        participant.id === participantId
          ? {
              participantName: participant.participantName,
              shareAmount: participant.shareAmount,
              paidAmount: participant.paidAmount,
              isSettled: !participant.isSettled,
            }
          : {
              participantName: participant.participantName,
              shareAmount: participant.shareAmount,
              paidAmount: participant.paidAmount,
              isSettled: participant.isSettled,
            }
      );
      const res = await fetch(`/api/shared-expenses/${expense.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: expense.title,
          totalAmount: expense.totalAmount,
          groupId: expense.groupId,
          splitMethod: expense.splitMethod,
          date: expense.date,
          note: expense.note,
          participants,
        }),
      });
      const payload = (await res.json()) as Envelope<SharedExpenseItem>;
      if (!res.ok || payload.code !== "OK") throw new Error(payload.error?.message || "Update failed");
      void load();
    } catch (err) {
      setError((err as Error).message || "Update participant failed");
    }
  }

  async function createSettlement(suggestion: SharedSettlementSuggestion) {
    if (!selectedGroupId) return;
    setError(null);
    try {
      const res = await fetch(`/api/shared-groups/${selectedGroupId}/settlements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromMemberId: suggestion.fromMemberId,
          toMemberId: suggestion.toMemberId,
          amount: suggestion.amount,
          status: "PROPOSED",
        }),
      });
      const payload = (await res.json()) as Envelope<SharedSettlementRecord>;
      if (!res.ok || payload.code !== "OK") throw new Error(payload.error?.message || "Create settlement failed");
      void load();
    } catch (err) {
      setError((err as Error).message || "Create settlement failed");
    }
  }

  async function settleAll() {
    if (!selectedGroupId) return;
    setError(null);
    try {
      const res = await fetch(`/api/shared-groups/${selectedGroupId}/settlements/settle-all`, { method: "POST" });
      const payload = (await res.json()) as Envelope<{ created: number }>;
      if (!res.ok || payload.code !== "OK") throw new Error(payload.error?.message || "Settle-all failed");
      void load();
    } catch (err) {
      setError((err as Error).message || "Settle-all failed");
    }
  }

  async function updateSettlementStatus(settlementId: string, statusValue: "SETTLED" | "CANCELED" | "PROPOSED") {
    setError(null);
    try {
      const res = await fetch(`/api/shared-settlements/${settlementId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: statusValue }),
      });
      const payload = (await res.json()) as Envelope<SharedSettlementRecord>;
      if (!res.ok || payload.code !== "OK") throw new Error(payload.error?.message || "Update settlement failed");
      void load();
    } catch (err) {
      setError((err as Error).message || "Update settlement failed");
    }
  }

  async function updateMemberRole(memberId: string, role: "OWNER" | "MEMBER") {
    if (!selectedGroupId) return;
    setError(null);
    try {
      const res = await fetch(`/api/shared-groups/${selectedGroupId}/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const payload = (await res.json()) as Envelope<SharedGroupMember>;
      if (!res.ok || payload.code !== "OK") throw new Error(payload.error?.message || "Update member failed");
      void load();
    } catch (err) {
      setError((err as Error).message || "Update member failed");
    }
  }

  async function removeMember(memberId: string) {
    if (!selectedGroupId) return;
    setError(null);
    try {
      const res = await fetch(`/api/shared-groups/${selectedGroupId}/members/${memberId}`, { method: "DELETE" });
      const payload = (await res.json()) as Envelope<{ ok: boolean }>;
      if (!res.ok || payload.code !== "OK") throw new Error(payload.error?.message || "Remove member failed");
      void load();
    } catch (err) {
      setError((err as Error).message || "Remove member failed");
    }
  }

  const selectedGroup = sharedGroups.find((group) => group.id === selectedGroupId) || null;

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
          <p className="mt-2 text-sm text-slate-600">You must be signed in to view shared expenses.</p>
          <button onClick={login} className={`${primaryButtonClass} mt-5`}>
            Sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-6">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-2 text-2xl font-semibold text-slate-900">Shared Expenses</h1>
        <AppNav />

        <section className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-2 md:grid-cols-4">
            <select
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={selectedGroupId}
              onChange={(event) => setSelectedGroupId(event.target.value)}
            >
              <option value="">Select group</option>
              {sharedGroups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name} ({group.members.length})
                </option>
              ))}
            </select>
            <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="New group name" value={newGroupName} onChange={(event) => setNewGroupName(event.target.value)} />
            <button className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white" onClick={createGroup}>
              Create Group
            </button>
            <button className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700" onClick={settleAll}>
              Settle All
            </button>
          </div>
          <div className="mt-2 grid gap-2 md:grid-cols-3">
            <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Invite code" value={joinCode} onChange={(event) => setJoinCode(event.target.value)} />
            <button className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700" onClick={joinGroup}>
              Join Group
            </button>
            <p className="text-xs text-slate-500">
              Invite code: {selectedGroup?.inviteCode || "-"}
            </p>
          </div>
        </section>

        <section className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-base font-semibold text-slate-900">Members</h2>
          <div className="space-y-2">
            {(selectedGroup?.members || []).length === 0 && <p className="text-sm text-slate-600">No members in selected group.</p>}
            {(selectedGroup?.members || []).map((member) => (
              <div key={member.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 p-2">
                <p className="text-sm text-slate-800">{member.displayName}</p>
                <div className="flex gap-2">
                  <select className="rounded-md border border-slate-300 px-2 py-1 text-xs" value={member.role} onChange={(event) => void updateMemberRole(member.id, event.target.value as "OWNER" | "MEMBER")}>
                    <option value="OWNER">OWNER</option>
                    <option value="MEMBER">MEMBER</option>
                  </select>
                  <button className="rounded-md border border-rose-300 px-2 py-1 text-xs text-rose-700" onClick={() => void removeMember(member.id)}>
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-base font-semibold text-slate-900">Create Shared Expense</h2>
          <div className="grid gap-2 lg:grid-cols-3">
            <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Title" value={title} onChange={(event) => setTitle(event.target.value)} />
            <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Total amount" value={totalAmount} onChange={(event) => setTotalAmount(event.target.value)} />
            <input type="date" className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={date} onChange={(event) => setDate(event.target.value)} />
            <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={splitMethod} onChange={(event) => setSplitMethod(event.target.value as "EQUAL" | "CUSTOM")}>
              <option value="EQUAL">Equal split</option>
              <option value="CUSTOM">Custom split</option>
            </select>
            <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Participants (comma separated)" value={participantsText} onChange={(event) => setParticipantsText(event.target.value)} />
            <button className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white" onClick={createSharedExpense}>
              Add Expense
            </button>
          </div>
          <textarea className="mt-2 min-h-20 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Note (optional)" value={note} onChange={(event) => setNote(event.target.value)} />
        </section>

        <section className="mb-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-2 text-base font-semibold text-slate-900">Settlement Suggestions</h2>
            {(settlements?.suggestions || []).length === 0 && <p className="text-sm text-slate-600">No suggestions.</p>}
            <div className="space-y-2">
              {(settlements?.suggestions || []).map((suggestion, idx) => (
                <div key={`${suggestion.fromMemberId}-${suggestion.toMemberId}-${idx}`} className="flex items-center justify-between gap-2 rounded-md border border-slate-200 p-2">
                  <p className="text-xs text-slate-700">
                    {suggestion.fromDisplayName} pays {suggestion.toDisplayName} {currency(suggestion.amount)}
                  </p>
                  <button className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700" onClick={() => void createSettlement(suggestion)}>
                    Create
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-2 text-base font-semibold text-slate-900">Settlement History</h2>
            {(settlements?.settlements || []).length === 0 && <p className="text-sm text-slate-600">No settlement records.</p>}
            <div className="space-y-2">
              {(settlements?.settlements || []).map((record) => (
                <div key={record.id} className="rounded-md border border-slate-200 p-2">
                  <p className="text-xs text-slate-700">
                    {record.fromMember.displayName} {"->"} {record.toMember.displayName} {currency(record.amount)}
                  </p>
                  <div className="mt-1 flex gap-2">
                    <span className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600">{record.status}</span>
                    {record.status !== "SETTLED" && (
                      <button className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700" onClick={() => void updateSettlementStatus(record.id, "SETTLED")}>
                        Mark Settled
                      </button>
                    )}
                    {record.status !== "CANCELED" && (
                      <button className="rounded-md border border-rose-300 px-2 py-1 text-xs text-rose-700" onClick={() => void updateSettlementStatus(record.id, "CANCELED")}>
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-base font-semibold text-slate-900">Expenses</h2>
          <p className="mb-2 text-sm text-slate-600">
            Total: {currency(sharedExpenses?.summary.totalAmount ?? 0)} | Settled participants:{" "}
            {sharedExpenses?.summary.settledParticipants ?? 0}/{sharedExpenses?.summary.totalParticipants ?? 0}
          </p>
          <div className="space-y-2">
            {(sharedExpenses?.items || []).length === 0 && <p className="text-sm text-slate-600">No shared expenses yet.</p>}
            {(sharedExpenses?.items || []).map((expense) => (
              <div key={expense.id} className="rounded-md border border-slate-200 p-3">
                <p className="text-sm font-medium text-slate-900">
                  {expense.title} - {currency(expense.totalAmount)}
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  {new Date(expense.date).toLocaleDateString()} | {expense.group?.name || "Ungrouped"}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {expense.participants.map((participant) => (
                    <button
                      key={participant.id}
                      onClick={() => void toggleParticipantSettled(expense, participant.id)}
                      className={`rounded-md border px-2 py-1 text-xs ${
                        participant.isSettled
                          ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                          : "border-slate-300 bg-white text-slate-700"
                      }`}
                    >
                      {participant.participantName}: {currency(participant.shareAmount)} {participant.isSettled ? "(Settled)" : "(Open)"}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
        {error && <p className="mt-3 text-sm text-rose-700">{error}</p>}
      </div>
    </main>
  );
}
