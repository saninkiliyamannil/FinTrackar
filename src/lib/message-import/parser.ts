export type ParsedMessage = {
  amount: number | null;
  type: "INCOME" | "EXPENSE" | null;
  date: string | null;
  note: string | null;
  confidence: number;
  normalizedText: string;
};

const amountPatterns = [
  /(?:inr|rs\.?|₹)\s*([0-9][0-9,]*\.?[0-9]{0,2})/i,
  /(?:debited|credited|paid|received)\s*(?:for|of)?\s*(?:inr|rs\.?|₹)?\s*([0-9][0-9,]*\.?[0-9]{0,2})/i,
];

const debitHints = ["debited", "spent", "paid", "purchase", "dr "];
const creditHints = ["credited", "received", "deposit", "refund", "cr "];

const datePatterns = [
  /(\d{4}-\d{2}-\d{2})/,
  /(\d{2}[-\/]\d{2}[-\/]\d{4})/,
  /(\d{2}\s+[A-Za-z]{3,9}\s+\d{4})/,
];

function parseAmount(text: string): number | null {
  for (const pattern of amountPatterns) {
    const match = text.match(pattern);
    if (!match?.[1]) continue;
    const value = Number(match[1].replace(/,/g, ""));
    if (Number.isFinite(value) && value > 0) {
      return Number(value.toFixed(2));
    }
  }
  return null;
}

function parseType(text: string): "INCOME" | "EXPENSE" | null {
  const lower = text.toLowerCase();
  if (debitHints.some((hint) => lower.includes(hint))) return "EXPENSE";
  if (creditHints.some((hint) => lower.includes(hint))) return "INCOME";
  return null;
}

function parseDate(text: string): string | null {
  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (!match?.[1]) continue;
    const candidate = match[1].replace(/\//g, "-");
    const parsed = new Date(candidate);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }
  return null;
}

function parseNote(text: string): string | null {
  const match = text.match(/(?:to|at|from)\s+([A-Za-z0-9 .,&-]{3,60})/i);
  return match?.[1]?.trim() || null;
}

export function parseBankMessage(rawText: string): ParsedMessage {
  const normalizedText = String(rawText || "").replace(/\s+/g, " ").trim();
  if (!normalizedText) {
    return {
      amount: null,
      type: null,
      date: null,
      note: null,
      confidence: 0,
      normalizedText,
    };
  }

  const amount = parseAmount(normalizedText);
  const type = parseType(normalizedText);
  const date = parseDate(normalizedText);
  const note = parseNote(normalizedText);

  let confidence = 0;
  if (amount) confidence += 0.45;
  if (type) confidence += 0.25;
  if (date) confidence += 0.2;
  if (note) confidence += 0.1;

  return {
    amount,
    type,
    date,
    note,
    confidence: Number(Math.min(1, confidence).toFixed(2)),
    normalizedText,
  };
}

