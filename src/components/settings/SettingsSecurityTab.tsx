import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, KeyRound, ShieldCheck } from "lucide-react";

function validatePassword(pwd: string): string | null {
  if (pwd.length < 8) return "Mật khẩu phải có ít nhất 8 ký tự";
  if (!/[A-Z]/.test(pwd)) return "Mật khẩu phải có ít nhất 1 chữ hoa";
  if (!/[0-9]/.test(pwd)) return "Mật khẩu phải có ít nhất 1 số";
  return null;
}

export function SettingsSecurityTab() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setPassword("");
    setConfirmPassword("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validatePassword(password);
    if (err) {
      toast.error(err);
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Mật khẩu xác nhận không khớp");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast.error("Đổi mật khẩu thất bại", { description: error.message });
      setLoading(false);
      return;
    }

    // Best-effort: cập nhật must_change_password = false
    try {
      if (user?.id) {
        await supabase
          .from("profiles")
          .update({ must_change_password: false })
          .eq("id", user.id);
      }
    } catch {
      // không chặn flow
    }

    toast.success("Đổi mật khẩu thành công", {
      description: "Mật khẩu mới đã được áp dụng cho lần đăng nhập tiếp theo.",
    });
    setLoading(false);
    setOpen(false);
    reset();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Bảo mật tài khoản
          </CardTitle>
          <CardDescription>
            Quản lý mật khẩu đăng nhập của bạn. Khuyến nghị đổi mật khẩu định kỳ 3-6 tháng.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Mật khẩu đăng nhập</p>
              <p className="text-xs text-muted-foreground">
                Tối thiểu 8 ký tự, có ít nhất 1 chữ hoa và 1 số.
              </p>
            </div>
            <Button onClick={() => setOpen(true)} className="gap-2">
              <KeyRound className="h-4 w-4" />
              Đổi mật khẩu
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={open}
        onOpenChange={(o) => {
          if (loading) return;
          setOpen(o);
          if (!o) reset();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Đổi mật khẩu</DialogTitle>
            <DialogDescription>
              Mật khẩu mới tối thiểu 8 ký tự, có 1 chữ hoa và 1 số.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Mật khẩu mới</Label>
              <Input
                id="new-password"
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
              <Label htmlFor="confirm-password">Xác nhận mật khẩu</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
                autoComplete="new-password"
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setOpen(false);
                  reset();
                }}
                disabled={loading}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Đổi mật khẩu
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
