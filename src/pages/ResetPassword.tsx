import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [ready, setReady] = useState(false);
  const [expired, setExpired] = useState(false);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const resolvedRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const navigate = useNavigate();

  const markReady = () => {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    setReady(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };

  const markExpired = (reason?: string) => {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    setExpired(true);
    setErrorDetail(reason || null);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };

  useEffect(() => {
    const init = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");

      // Case 1: PKCE code exchange
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          markExpired(error.message);
        } else {
          markReady();
        }
        return;
      }

      // Case 2: Hash-based recovery (legacy)
      if (window.location.hash.includes("type=recovery")) {
        // Give Supabase a moment to process the hash
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          markReady();
          return;
        }
        // Wait for PASSWORD_RECOVERY event below
        return;
      }

      // Case 3: Already have an active session (e.g. opened link while logged in)
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        markReady();
        return;
      }

      // No code, no hash, no session — link is likely invalid or expired
      // Still wait a short time for auth state change event
    };

    init();

    // Listen for PASSWORD_RECOVERY event (hash-based flow)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        markReady();
      }
    });

    // Shorter timeout: 10s instead of 60s since we check all cases upfront
    timeoutRef.current = setTimeout(() => {
      if (!resolvedRef.current) {
        markExpired("Không tìm thấy phiên xác thực. Link có thể đã hết hạn hoặc đã được sử dụng.");
      }
    }, 10000);

    return () => {
      subscription.unsubscribe();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Mật khẩu phải có ít nhất 8 ký tự");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Mật khẩu xác nhận không khớp");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast.error("Lỗi đặt lại mật khẩu", { description: error.message });
      setLoading(false);
      return;
    }

    // Update profile: must_change_password = false
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("profiles")
        .update({ must_change_password: false })
        .eq("id", user.id);
    }

    setSuccess(true);
    await supabase.auth.signOut();
    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="pt-6 text-center space-y-4">
            <CheckCircle className="h-12 w-12 text-primary mx-auto" />
            <h2 className="text-lg font-semibold">Đổi mật khẩu thành công!</h2>
            <p className="text-sm text-muted-foreground">Bạn có thể đăng nhập với mật khẩu mới.</p>
            <Button className="w-full" onClick={() => navigate("/login")}>
              Đăng nhập ngay
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!ready) {
    if (expired) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Card className="w-full max-w-sm">
            <CardContent className="pt-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                <span className="text-destructive text-xl">✕</span>
              </div>
              <h2 className="text-lg font-semibold">Liên kết không hợp lệ</h2>
              <p className="text-sm text-muted-foreground">
                {errorDetail || "Liên kết đã hết hạn hoặc không hợp lệ. Vui lòng thử lại."}
              </p>
              <Button className="w-full" onClick={() => navigate("/login")}>
                Quay về đăng nhập
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="pt-6 text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">Đang xác thực liên kết...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg mx-auto">
            SH
          </div>
          <CardTitle className="text-xl">Đặt mật khẩu mới</CardTitle>
          <p className="text-sm text-muted-foreground">Nhập mật khẩu mới cho tài khoản của bạn (tối thiểu 8 ký tự)</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleReset} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu mới</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Xác nhận mật khẩu</Label>
              <Input
                id="confirm"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Đặt mật khẩu mới
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
