import { ProtectedRoute } from "@/components/auth/protected-route"
import { DashboardPage } from "@/components/dashboard-page"

export default function Home() {
  return (
    <ProtectedRoute>
      <DashboardPage />
    </ProtectedRoute>
  )
}
