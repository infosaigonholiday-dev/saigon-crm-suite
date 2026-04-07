import { createContext, useContext, useEffect, useState, ReactNode, useRef, useCallback } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  userRole: string | null;
  mustChangePassword: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  setMustChangePassword: (value: boolean) => void;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  userRole: null,
  mustChangePassword: false,
  loading: true,
  signOut: async () => {},
  setMustChangePassword: () => {},
});

export const useAuth = () => useContext(AuthContext);

const RECOVERY_PATHS = ["/reset-password", "/first-login-change-password"];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const initializedRef = useRef(false);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("role, must_change_password")
      .eq("id", userId)
      .single();
    return {
      role: data?.role ?? null,
      mustChangePassword: data?.must_change_password ?? false,
    };
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (event === "INITIAL_SESSION") {
          if (newSession?.user) {
            const profile = await fetchProfile(newSession.user.id);
            setSession(newSession);
            setUserRole(profile.role);
            setMustChangePassword(profile.mustChangePassword);
          } else {
            setSession(null);
            setUserRole(null);
            setMustChangePassword(false);
          }
          setLoading(false);
          initializedRef.current = true;
          return;
        }

        if (!initializedRef.current) return;

        if (event === "SIGNED_IN" && newSession?.user) {
          // Skip loading state if we're on recovery pages to avoid flicker
          const isRecoveryPage = RECOVERY_PATHS.includes(window.location.pathname);
          if (!isRecoveryPage) setLoading(true);
          
          const profile = await fetchProfile(newSession.user.id);
          setSession(newSession);
          setUserRole(profile.role);
          setMustChangePassword(profile.mustChangePassword);
          if (!isRecoveryPage) setLoading(false);
          return;
        }

        if (event === "TOKEN_REFRESHED") {
          if (newSession) {
            setSession(newSession);
          } else {
            toast.error("Phiên đăng nhập hết hạn, vui lòng đăng nhập lại");
            window.location.href = "/login";
          }
          return;
        }

        if (event === "SIGNED_OUT") {
          setSession(null);
          setUserRole(null);
          setMustChangePassword(false);
          setLoading(false);
          if (!RECOVERY_PATHS.includes(window.location.pathname)) {
            toast.error("Phiên đăng nhập đã kết thúc, vui lòng đăng nhập lại");
            window.location.href = "/login";
          }
          return;
        }

        setSession(newSession);
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{
      session,
      user: session?.user ?? null,
      userRole,
      mustChangePassword,
      loading,
      signOut,
      setMustChangePassword,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
