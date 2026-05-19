import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useIsAdmin } from "@/hooks/useIsAdmin";

export default function AdminRoute({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const { data: isAdmin, isLoading } = useIsAdmin(user?.id ?? null);

  if (loading || isLoading) return null;
  if (!user) return <Navigate to="/auth" replace state={{ from: location.pathname }} />;
  if (!isAdmin) return <Navigate to="/403" replace state={{ from: location.pathname }} />;
  return children;
}

