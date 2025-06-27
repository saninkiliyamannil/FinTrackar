import { db } from "@/lib/firebase"
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  addDoc,
  updateDoc,
  arrayUnion,
  serverTimestamp,
} from "firebase/firestore"
import { nanoid } from "nanoid"

// Create a new shared finance group
export async function createSharedGroup(userId: string, groupName: string) {
  try {
    const groupRef = await addDoc(collection(db, "sharedGroups"), {
      name: groupName,
      createdBy: userId,
      createdAt: serverTimestamp(),
      members: [userId],
    })

    // Add this group to the user's groups
    await updateDoc(doc(db, "users", userId), {
      sharedGroups: arrayUnion(groupRef.id),
    })

    return { success: true, groupId: groupRef.id }
  } catch (error) {
    console.error("Error creating shared group:", error)
    return { success: false, error }
  }
}

// Generate an invitation link for a shared group
export async function generateInvitation(userId: string, groupId: string, expiresInHours = 24) {
  try {
    // Check if user is a member of the group
    const groupDoc = await getDoc(doc(db, "sharedGroups", groupId))
    if (!groupDoc.exists() || !groupDoc.data().members.includes(userId)) {
      return { success: false, error: "User is not a member of this group" }
    }

    const inviteCode = nanoid(10)
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + expiresInHours)

    await setDoc(doc(db, "invitations", inviteCode), {
      groupId,
      createdBy: userId,
      createdAt: serverTimestamp(),
      expiresAt: expiresAt.toISOString(),
      used: false,
    })

    return {
      success: true,
      inviteCode,
      inviteLink: `${window.location.origin}/invite/${inviteCode}`,
    }
  } catch (error) {
    console.error("Error generating invitation:", error)
    return { success: false, error }
  }
}

// Accept an invitation to join a shared group
export async function acceptInvitation(userId: string, inviteCode: string) {
  try {
    const inviteRef = doc(db, "invitations", inviteCode)
    const inviteDoc = await getDoc(inviteRef)

    if (!inviteDoc.exists()) {
      return { success: false, error: "Invitation not found" }
    }

    const inviteData = inviteDoc.data()

    // Check if invitation is expired
    if (new Date(inviteData.expiresAt) < new Date() || inviteData.used) {
      return { success: false, error: "Invitation expired or already used" }
    }

    const groupId = inviteData.groupId
    const groupRef = doc(db, "sharedGroups", groupId)

    // Add user to group members
    await updateDoc(groupRef, {
      members: arrayUnion(userId),
    })

    // Add group to user's groups
    await updateDoc(doc(db, "users", userId), {
      sharedGroups: arrayUnion(groupId),
    })

    // Mark invitation as used
    await updateDoc(inviteRef, {
      used: true,
    })

    return { success: true, groupId }
  } catch (error) {
    console.error("Error accepting invitation:", error)
    return { success: false, error }
  }
}

// Add a shared expense to a group
export async function addSharedExpense(
  groupId: string,
  paidBy: string,
  amount: number,
  description: string,
  date: string,
  splits: Array<{ userId: string; amount: number; status: "paid" | "unpaid" }>,
) {
  try {
    const expenseRef = await addDoc(collection(db, "sharedExpenses"), {
      groupId,
      paidBy,
      amount,
      description,
      date,
      createdAt: serverTimestamp(),
      status: "pending",
      splits,
    })

    return { success: true, expenseId: expenseRef.id }
  } catch (error) {
    console.error("Error adding shared expense:", error)
    return { success: false, error }
  }
}

// Get all shared groups for a user
export async function getUserSharedGroups(userId: string) {
  try {
    const q = query(collection(db, "sharedGroups"), where("members", "array-contains", userId))
    const querySnapshot = await getDocs(q)

    const groups = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    return { success: true, groups }
  } catch (error) {
    console.error("Error getting user shared groups:", error)
    return { success: false, error }
  }
}

// Get all expenses for a shared group
export async function getSharedGroupExpenses(groupId: string) {
  try {
    const q = query(collection(db, "sharedExpenses"), where("groupId", "==", groupId))
    const querySnapshot = await getDocs(q)

    const expenses = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    return { success: true, expenses }
  } catch (error) {
    console.error("Error getting shared group expenses:", error)
    return { success: false, error }
  }
}
