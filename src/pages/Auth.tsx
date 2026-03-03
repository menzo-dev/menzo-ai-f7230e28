import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, Mail, Lock, User, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

type Mode = "login" | "signup" | "forgot";

const Auth = () => {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, role } = useAuth();

  useEffect(() => {
    if (user && role) {
      navigate(role === "admin" ? "/admin" : "/chat", { replace: true });
    }
  }, [user, role, navigate]);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      toast({ title: "خطأ", description: "يرجى ملء جميع الحقول", variant: "destructive" });
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      let msg = error.message;
      if (msg.includes("Invalid login")) msg = "البريد الإلكتروني أو كلمة المرور غير صحيحة";
      if (msg.includes("Email not confirmed")) msg = "يرجى تأكيد بريدك الإلكتروني أولاً";
      toast({ title: "فشل تسجيل الدخول", description: msg, variant: "destructive" });
    }
  };

  const handleSignup = async () => {
    if (!email.trim() || !password.trim() || !displayName.trim()) {
      toast({ title: "خطأ", description: "يرجى ملء جميع الحقول", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "خطأ", description: "كلمة المرور يجب أن تكون 6 أحرف على الأقل", variant: "destructive" });
      return;
    }
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { display_name: displayName.trim() } },
    });
    if (error) {
      let msg = error.message;
      if (msg.includes("already registered")) msg = "هذا البريد الإلكتروني مسجل بالفعل";
      toast({ title: "فشل إنشاء الحساب", description: msg, variant: "destructive" });
      return;
    }
    if (data.user) {
      toast({ title: "تم إنشاء الحساب بنجاح! 🎉", description: "جاري تسجيل دخولك..." });
    }
  };

  const handleForgot = async () => {
    if (!email.trim()) {
      toast({ title: "خطأ", description: "يرجى إدخال البريد الإلكتروني", variant: "destructive" });
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "تم الإرسال ✉️", description: "تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني" });
    setMode("login");
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") await handleLogin();
      else if (mode === "signup") await handleSignup();
      else await handleForgot();
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
                  type={showPassword ? "text" : "password"}
                  placeholder="كلمة المرور"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10 pl-10 bg-secondary border-border text-foreground placeholder:text-muted-foreground"
                  required
                  minLength={6}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-3 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
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
            {mode === "forgot" && (
              <button onClick={() => setMode("login")} className="text-sm text-primary hover:underline">
                العودة لتسجيل الدخول
              </button>
            )}
            {mode !== "forgot" && (
              <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setPassword(""); }} className="text-sm text-primary hover:underline">
                {mode === "login" ? "ليس لديك حساب؟ أنشئ حساباً" : "لديك حساب بالفعل؟ سجل دخول"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
