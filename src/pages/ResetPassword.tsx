import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

type Phase = "verifying" | "expired" | "ready" | "success";

function parseHash(hash: string): Record<string, string> {
  const out: Record<string, string> = {};
  const clean = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!clean) return out;
  for (const part of clean.split("&")) {
    const [k, v] = part.split("=");
    if (k) out[decodeURIComponent(k)] = decodeURIComponent(v ?? "");
  }
  return out;
}

function cleanUrl() {
  try {
    const url = new URL(window.location.href);
    url.search = "";
    url.hash = "";
    window.history.replaceState({}, document.title, url.pathname);
  } catch {
    // ignore
  }
}

const MIN_VERIFY_MS = 5000; // chống flash spinner + đợi PASSWORD_RECOVERY event fire trên iOS

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<Phase>("verifying");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const resolvedRef = useRef(false);
  const startedAtRef = useRef<number>(Date.now());

  const navigate = useNavigate();

  const withMinDelay = (fn: () => void) => {
    const elapsed = Date.now() - startedAtRef.current;
    const remain = Math.max(0, MIN_VERIFY_MS - elapsed);
    if (remain === 0) fn();
    else setTimeout(fn, remain);
  };

  const markReady = () => {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    withMinDelay(() => {
      setPhase("ready");
      cleanUrl();
    });
  };

  const markExpired = (msg?: string) => {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    withMinDelay(() => {
      setErrorMsg(msg ?? "Liên kết không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu gửi lại từ màn hình đăng nhập.");
      setPhase("expired");
      cleanUrl();
    });
  };

  const redirectLogin = () => {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    navigate("/login", { replace: true });
  };

  useEffect(() => {
    let graceTimer: ReturnType<typeof setTimeout> | null = null;

    // 1. Subscribe onAuthStateChange TRƯỚC khi parse URL — phòng race condition
    //    (Supabase verify endpoint có thể fire PASSWORD_RECOVERY trước khi promise xử lý xong)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("[reset-password] onAuthStateChange event:", event, "hasSession:", !!session);
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        markReady();
      }
    });

    (async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        const tokenHash = url.searchParams.get("token_hash");
        // type param không dùng — luôn verify với type 'recovery' cho route /reset-password
        const errorDesc =
          url.searchParams.get("error_description") ||
          url.searchParams.get("error");
        const hash = parseHash(window.location.hash);
        const hashError = hash.error_description || hash.error;

        // Lỗi do Supabase trả về trên URL (query hoặc hash)
        const anyError = errorDesc || hashError;
        if (anyError) {
          const lower = anyError.toLowerCase();
          const friendly =
            lower.includes("expired") || lower.includes("invalid") || lower.includes("otp")
              ? "Liên kết đã hết hạn hoặc đã được sử dụng. Vui lòng yêu cầu gửi lại."
              : "Liên kết không hợp lệ. Vui lòng yêu cầu gửi lại.";
          markExpired(friendly);
          return;
        }

        // Recovery flow: chỉ dùng verifyOtp cho mọi token trong URL (token_hash | token | code).
        // Token tự là proof-of-possession (chỉ ai có inbox đọc được) → cross-device an toàn.
        const tokenFromUrl = tokenHash || url.searchParams.get("token") || code;
        if (tokenFromUrl) {
          console.log("[reset-password] verifyOtp called");
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenFromUrl,
            type: "recovery",
          });
          if (error) {
            console.warn("[reset-password] verifyOtp failed", error);
            const lower = (error.message || "").toLowerCase();
            const friendly = lower.includes("expired") || lower.includes("invalid") || lower.includes("otp") || lower.includes("flow state")
              ? "Liên kết đã hết hạn hoặc đã được sử dụng. Vui lòng yêu cầu gửi lại."
              : "Liên kết không hợp lệ. Vui lòng yêu cầu gửi lại.";
            markExpired(friendly);
          } else {
            console.log("[reset-password] verifyOtp success");
            markReady();
          }
          return;
        }

        // Trường hợp 2: hash callback #access_token=...&refresh_token=...&type=recovery
        if (hash.access_token && hash.refresh_token) {
          const { error } = await supabase.auth.setSession({
            access_token: hash.access_token,
            refresh_token: hash.refresh_token,
          });
          if (error) {
            markExpired();
          } else {
            console.log("[reset-password] setSession (hash) success");
            markReady();
          }
          return;
        }

        // Trường hợp 3: Đã có sẵn session (user reload sau khi đã exchange thành công)
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          console.log("[reset-password] existing session found");
          markReady();
          return;
        }

        // Trường hợp 4: KHÔNG có code/hash/session/error
        // → Có thể Supabase verify endpoint sẽ fire PASSWORD_RECOVERY event sau 1 nhịp
        //   (một số version Supabase set session qua storage rồi redirect không kèm ?code=)
        // → Đợi MIN_VERIFY_MS rồi mới quyết định: nếu URL trần (không param) → /login,
        //   nếu URL có dấu hiệu callback bị thiếu code → expired.
        const hadCallbackParams = !!(url.search || url.hash);
        console.log("[reset-password] no code/hash/session, waiting", MIN_VERIFY_MS, "ms for PASSWORD_RECOVERY event. hadCallbackParams:", hadCallbackParams);

        graceTimer = setTimeout(() => {
          if (resolvedRef.current) return;
          if (hadCallbackParams) {
            markExpired("Liên kết không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu gửi lại từ màn hình đăng nhập.");
          } else {
            redirectLogin();
          }
        }, MIN_VERIFY_MS);
      } catch (e) {
        console.error("[reset-password] init error", e);
        markExpired();
      }
    })();

    return () => {
      subscription.unsubscribe();
      if (graceTimer) clearTimeout(graceTimer);
    };
  }, []);

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) return "Mật khẩu phải có ít nhất 8 ký tự";
    if (!/[A-Z]/.test(pwd)) return "Mật khẩu phải có ít nhất 1 chữ hoa";
    if (!/[0-9]/.test(pwd)) return "Mật khẩu phải có ít nhất 1 số";
    return null;
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validatePassword(password);
    if (validationError) {
      toast.error(validationError);
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
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("profiles")
          .update({ must_change_password: false })
          .eq("id", user.id);
      }
    } catch (e) {
      console.warn("[reset-password] update profile failed", e);
    }

    await supabase.auth.signOut();
    setPhase("success");
    setLoading(false);
  };

  if (phase === "success") {
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

  if (phase === "verifying") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="pt-6 text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">Đang xác thực liên kết đặt lại mật khẩu...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (phase === "expired") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <span className="text-destructive text-xl">✕</span>
            </div>
            <h2 className="text-lg font-semibold">Liên kết không hợp lệ</h2>
            <p className="text-sm text-muted-foreground">{errorMsg}</p>
            <div className="space-y-2">
              <Button className="w-full" onClick={() => navigate("/login?forgot=1")}>
                Yêu cầu gửi lại liên kết
              </Button>
              <Button variant="outline" className="w-full" onClick={() => navigate("/login")}>
                Quay về đăng nhập
              </Button>
            </div>
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
          <p className="text-sm text-muted-foreground">
            Mật khẩu mới tối thiểu 8 ký tự, có 1 chữ hoa và 1 số
          </p>
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
                disabled={loading}
                autoComplete="new-password"
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
                disabled={loading}
                autoComplete="new-password"
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
