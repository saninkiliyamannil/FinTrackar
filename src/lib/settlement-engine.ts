type SettlementInputMember = {
  id: string;
  displayName: string;
};

type SettlementInputParticipant = {
  participantName: string;
  shareAmount: number;
  paidAmount: number;
};

type SettlementInputExpense = {
  participants: SettlementInputParticipant[];
};

export type SettlementSuggestion = {
  fromMemberId: string;
  toMemberId: string;
  fromDisplayName: string;
  toDisplayName: string;
  amount: number;
};

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

export function buildSettlementSuggestions(
  members: SettlementInputMember[],
  expenses: SettlementInputExpense[]
): SettlementSuggestion[] {
  const netByName = new Map<string, number>();

  for (const expense of expenses) {
    for (const participant of expense.participants) {
      const current = netByName.get(participant.participantName) ?? 0;
      netByName.set(
        participant.participantName,
        round2(current + participant.paidAmount - participant.shareAmount)
      );
    }
  }

  const creditors: Array<{ name: string; amount: number }> = [];
  const debtors: Array<{ name: string; amount: number }> = [];

  for (const [name, net] of netByName.entries()) {
    if (net > 0.01) creditors.push({ name, amount: net });
    if (net < -0.01) debtors.push({ name, amount: Math.abs(net) });
  }

  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const memberByName = new Map(members.map((member) => [member.displayName, member]));
  const suggestions: SettlementSuggestion[] = [];

  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const amount = round2(Math.min(debtor.amount, creditor.amount));
    if (amount <= 0) break;

    const fromMember = memberByName.get(debtor.name);
    const toMember = memberByName.get(creditor.name);
    if (fromMember && toMember && fromMember.id !== toMember.id) {
      suggestions.push({
        fromMemberId: fromMember.id,
        toMemberId: toMember.id,
        fromDisplayName: fromMember.displayName,
        toDisplayName: toMember.displayName,
        amount,
      });
    }

    debtor.amount = round2(debtor.amount - amount);
    creditor.amount = round2(creditor.amount - amount);
    if (debtor.amount <= 0.01) debtorIndex += 1;
    if (creditor.amount <= 0.01) creditorIndex += 1;
  }

  return suggestions;
}
