import { Navigate, Outlet } from "react-router-dom";
import { useAppPreferences } from "@/contexts/AppPreferencesContext";
import { DashboardLayout } from "@/components/DashboardLayout";

export function ProtectedLayout() {
  const { isAuthenticated } = useAppPreferences();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <DashboardLayout>
      <Outlet />
    </DashboardLayout>
  );
}

export function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAppPreferences();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
