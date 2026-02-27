import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, Mail, Lock, User, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const Auth = () => {
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, role } = useAuth();

  useEffect(() => {
    if (user && role) {
      if (role === "admin") {
        navigate("/admin", { replace: true });
      } else {
        navigate("/chat", { replace: true });
      }
    } else if (user && !role) {
      // role not loaded yet, wait
    }
  }, [user, role, navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast({
          title: "تم الإرسال",
          description: "تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني",
        });
        setMode("login");
      } else if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast({ title: "مرحباً بك!", description: "تم تسجيل الدخول بنجاح" });
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast({
          title: "تم إنشاء الحساب!",
          description: "تم إرسال رسالة تأكيد إلى بريدك الإلكتروني. يرجى التحقق منها.",
        });
      }
    } catch (err: any) {
      toast({
        title: "خطأ",
        description: err.message || "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-hero px-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/3 right-1/3 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <button
          onClick={() => navigate("/")}
          className="mb-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          العودة للرئيسية
        </button>

        <div className="glass rounded-2xl p-8">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-glow">
              <Bot className="h-8 w-8 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              {mode === "login" ? "تسجيل الدخول" : mode === "signup" ? "إنشاء حساب جديد" : "نسيت كلمة المرور"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {mode === "login" ? "مرحباً بعودتك!" : mode === "signup" ? "انضم إلى MENZO-AI الآن" : "أدخل بريدك لإعادة تعيين كلمة المرور"}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {mode === "signup" && (
              <div className="relative">
                <User className="absolute right-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="الاسم الكامل"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="pr-10 bg-secondary border-border text-foreground placeholder:text-muted-foreground"
                  required
                />
              </div>
            )}
            <div className="relative">
              <Mail className="absolute right-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input
                type="email"
                placeholder="البريد الإلكتروني"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pr-10 bg-secondary border-border text-foreground placeholder:text-muted-foreground"
                required
              />
            </div>
            {mode !== "forgot" && (
              <div className="relative">
                <Lock className="absolute right-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="كلمة المرور"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10 bg-secondary border-border text-foreground placeholder:text-muted-foreground"
                  required
                  minLength={6}
                />
              </div>
            )}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow py-6 text-base font-semibold"
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              ) : mode === "login" ? "دخول" : mode === "signup" ? "إنشاء حساب" : "إرسال رابط إعادة التعيين"}
            </Button>
          </form>

          <div className="mt-6 text-center space-y-2">
            {mode === "login" && (
              <button onClick={() => setMode("forgot")} className="text-sm text-muted-foreground hover:text-primary block w-full">
                نسيت كلمة المرور؟
              </button>
            )}
            <button
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
              className="text-sm text-primary hover:underline"
            >
              {mode === "login" ? "ليس لديك حساب؟ أنشئ حساباً" : "لديك حساب بالفعل؟ سجل دخول"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
