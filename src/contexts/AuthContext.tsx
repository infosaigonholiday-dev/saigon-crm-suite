import { createContext, useContext, useEffect, useState, ReactNode, useRef } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  userRole: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  userRole: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const initializedRef = useRef(false);

  async function fetchRole(userId: string): Promise<string | null> {
    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();
    return data?.role ?? null;
  }

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        // For INITIAL_SESSION, handle the full flow including role fetch
        if (event === "INITIAL_SESSION") {
          if (newSession?.user) {
            const role = await fetchRole(newSession.user.id);
            setSession(newSession);
            setUserRole(role);
          } else {
            setSession(null);
            setUserRole(null);
          }
          setLoading(false);
          initializedRef.current = true;
          return;
        }

        // For subsequent events, only process after initialization
        if (!initializedRef.current) return;

        if (event === "SIGNED_IN" && newSession?.user) {
          setLoading(true);
          const role = await fetchRole(newSession.user.id);
          setSession(newSession);
          setUserRole(role);
          setLoading(false);
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
          setLoading(false);
          if (window.location.pathname !== "/reset-password") {
            toast.error("Phiên đăng nhập đã kết thúc, vui lòng đăng nhập lại");
            window.location.href = "/login";
          }
          return;
        }

        // For other events, just update session
        setSession(newSession);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, userRole, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
