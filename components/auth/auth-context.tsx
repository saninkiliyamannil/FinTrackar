"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { onAuthStateChanged, type User } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"

interface UserData {
  uid: string
  name: string
  email: string
  createdAt: string
}

interface AuthContextType {
  currentUser: User | null
  userData: UserData | null
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  userData: null,
  loading: true,
})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user)

      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid))
          if (userDoc.exists()) {
            setUserData({
              uid: user.uid,
              ...(userDoc.data() as Omit<UserData, "uid">),
            })
          }
        } catch (error) {
          console.error("Error fetching user data:", error)
        }
      } else {
        setUserData(null)
      }

      setLoading(false)
    })

    return unsubscribe
  }, [])

  return <AuthContext.Provider value={{ currentUser, userData, loading }}>{children}</AuthContext.Provider>
}
