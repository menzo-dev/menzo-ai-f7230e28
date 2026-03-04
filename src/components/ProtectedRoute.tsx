import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { user, loading, profile } = useAuth();
  const [isBanned, setIsBanned] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!user) { setChecking(false); return; }
    supabase.from("profiles").select("is_banned").eq("id", user.id).single().then(({ data }) => {
      setIsBanned(data?.is_banned === true);
      setChecking(false);
    });
  }, [user]);

  if (loading || checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  if (isBanned) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-hero px-4 text-center">
        <div className="text-6xl mb-4">🚫</div>
        <h1 className="text-2xl font-bold text-destructive mb-2">تم حظر حسابك</h1>
        <p className="text-muted-foreground mb-4">تواصل مع الإدارة لمزيد من المعلومات</p>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
