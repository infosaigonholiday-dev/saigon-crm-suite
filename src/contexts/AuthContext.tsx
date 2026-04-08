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
  isReady: boolean;
  signOut: () => Promise<void>;
  setMustChangePassword: (value: boolean) => void;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  userRole: null,
  mustChangePassword: false,
  loading: true,
  isReady: false,
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
  const [isReady, setIsReady] = useState(false);
  const syncIdRef = useRef(0);

  const syncAuthState = useCallback(async (newSession: Session | null, source: string) => {
    const id = ++syncIdRef.current;

    if (!newSession?.user) {
      if (id !== syncIdRef.current) return;
      setSession(null);
      setUserRole(null);
      setMustChangePassword(false);
      setLoading(false);
      setIsReady(true);

      if (source === "SIGNED_OUT" && !RECOVERY_PATHS.includes(window.location.pathname)) {
        toast.error("Phiên đăng nhập đã kết thúc, vui lòng đăng nhập lại");
        window.location.href = "/login";
      }
      return;
    }

    // Set session immediately so queries can use the token
    if (id !== syncIdRef.current) return;
    setSession(newSession);

    try {
      const { data } = await supabase
        .from("profiles")
        .select("role, must_change_password")
        .eq("id", newSession.user.id)
        .single();

      if (id !== syncIdRef.current) return;
      setUserRole(data?.role ?? null);
      setMustChangePassword(data?.must_change_password ?? false);
    } catch {
      if (id !== syncIdRef.current) return;
      setUserRole(null);
      setMustChangePassword(false);
    } finally {
      if (id === syncIdRef.current) {
        setLoading(false);
        setIsReady(true);
      }
    }
  }, []);

  useEffect(() => {
    // 1. Register listener FIRST (non-blocking)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        // Skip INITIAL_SESSION — we handle it via getSession() below
        if (event === "INITIAL_SESSION") return;

        if (event === "TOKEN_REFRESHED") {
          if (newSession) {
            setSession(newSession);
          } else {
            toast.error("Phiên đăng nhập hết hạn, vui lòng đăng nhập lại");
            window.location.href = "/login";
          }
          return;
        }

        // For SIGNED_IN, SIGNED_OUT, etc. — fire and forget
        void syncAuthState(newSession, event);
      }
    );

    // 2. Bootstrap session from storage
    supabase.auth.getSession().then(({ data: { session: restored }, error }) => {
      if (error) {
        console.error("Failed to restore session:", error);
        setLoading(false);
        setIsReady(true);
        return;
      }
      void syncAuthState(restored, "BOOTSTRAP");
    });

    return () => subscription.unsubscribe();
  }, [syncAuthState]);

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
      isReady,
      signOut,
      setMustChangePassword,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
