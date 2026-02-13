import { prisma } from "@/lib/prisma";

function randomInviteCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export async function generateUniqueInviteCode() {
  for (let i = 0; i < 8; i += 1) {
    const inviteCode = randomInviteCode();
    const exists = await prisma.sharedGroup.findUnique({
      where: { inviteCode },
      select: { id: true },
    });
    if (!exists) return inviteCode;
  }
  return `GRP${Date.now().toString(36).toUpperCase().slice(-6)}`;
}

export async function ensurePersonalGroup(userId: string) {
  const existing = await prisma.sharedGroup.findFirst({
    where: {
      createdById: userId,
      isPersonal: true,
    },
    select: { id: true },
  });
  if (existing) return existing.id;

  const inviteCode = await generateUniqueInviteCode();
  const created = await prisma.sharedGroup.create({
    data: {
      name: "Personal Shared Group",
      description: "Auto-generated group for existing shared expenses",
      inviteCode,
      isPersonal: true,
      createdById: userId,
      members: {
        create: {
          userId,
          displayName: "You",
          role: "OWNER",
        },
      },
    },
    select: { id: true },
  });
  return created.id;
}

export async function isGroupMember(groupId: string, userId: string) {
  const membership = await prisma.sharedGroupMember.findFirst({
    where: { groupId, userId },
    select: { id: true, role: true },
  });
  return membership;
}

export async function backfillUngroupedSharedExpenses(userId: string) {
  const count = await prisma.sharedExpense.count({
    where: { userId, groupId: null },
  });
  if (count === 0) return { count: 0, groupId: null as string | null };

  const groupId = await ensurePersonalGroup(userId);
  const result = await prisma.sharedExpense.updateMany({
    where: { userId, groupId: null },
    data: { groupId },
  });
  return { count: result.count, groupId };
}
