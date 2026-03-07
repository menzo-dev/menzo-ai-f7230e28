import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, Mail, Lock, User, ArrowLeft, Eye, EyeOff, Camera, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

type Mode = "login" | "signup" | "forgot";

const PHONE_REGEX = /^(\+?20|0)?1[0125]\d{8}$/;

const Auth = () => {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneParent, setPhoneParent] = useState("");
  const [division, setDivision] = useState<"scientific" | "literary">("scientific");
  const [gender, setGender] = useState<"male" | "female">("male");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, role } = useAuth();

  useEffect(() => {
    if (user && role) {
      navigate(role === "admin" ? "/admin" : "/chat", { replace: true });
    }
  }, [user, role, navigate]);

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const validatePhone = (value: string): boolean => {
    if (!value.trim()) return false;
    const cleaned = value.replace(/[\s-]/g, "");
    if (!PHONE_REGEX.test(cleaned)) {
      setPhoneError("أدخل رقم هاتف مصري صحيح (مثال: 01012345678)");
      return false;
    }
    setPhoneError("");
    return true;
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      toast({ title: "خطأ", description: "يرجى ملء جميع الحقول", variant: "destructive" });
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      let msg = error.message;
      if (msg.includes("Invalid login")) msg = "البريد الإلكتروني أو كلمة المرور غير صحيحة";
      if (msg.includes("Email not confirmed")) msg = "يرجى تأكيد بريدك الإلكتروني أولاً. تحقق من صندوق الوارد أو مجلد السبام.";
      toast({ title: "فشل تسجيل الدخول", description: msg, variant: "destructive" });
    }
  };

  const handleSignup = async () => {
    if (!email.trim() || !password.trim() || !displayName.trim() || !phone.trim()) {
      toast({ title: "خطأ", description: "يرجى ملء جميع الحقول المطلوبة", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "خطأ", description: "كلمة المرور يجب أن تكون 6 أحرف على الأقل", variant: "destructive" });
      return;
    }
    if (!validatePhone(phone)) return;
    if (phoneParent.trim() && !PHONE_REGEX.test(phoneParent.replace(/[\s-]/g, ""))) {
      toast({ title: "خطأ", description: "رقم ولي الأمر غير صحيح", variant: "destructive" });
      return;
    }

    // Check if phone is already used
    const { data: existingPhone } = await supabase
      .from("profiles")
      .select("id")
      .eq("phone", phone.replace(/[\s-]/g, ""))
      .limit(1);
    if (existingPhone && existingPhone.length > 0) {
      toast({ title: "خطأ", description: "رقم الهاتف مسجل بالفعل", variant: "destructive" });
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { display_name: displayName.trim() },
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) {
      let msg = error.message;
      if (msg.includes("already registered")) msg = "هذا البريد الإلكتروني مسجل بالفعل";
      toast({ title: "فشل إنشاء الحساب", description: msg, variant: "destructive" });
      return;
    }
    if (data.user) {
      await supabase.from("profiles").update({
        phone: phone.replace(/[\s-]/g, ""),
        phone_parent: phoneParent ? phoneParent.replace(/[\s-]/g, "") : null,
        division,
        gender,
      }).eq("id", data.user.id);

      if (avatarFile) {
        const ext = avatarFile.name.split(".").pop();
        const path = `${data.user.id}/avatar.${ext}`;
        const { error: uploadErr } = await supabase.storage.from("avatars").upload(path, avatarFile, { upsert: true });
        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
          await supabase.from("profiles").update({ avatar_url: urlData.publicUrl }).eq("id", data.user.id);
        }
      }

      toast({
        title: "تم إنشاء الحساب بنجاح! 🎉",
        description: "تم إرسال رسالة تأكيد إلى بريدك الإلكتروني. يرجى فتحها والضغط على رابط التأكيد لتفعيل حسابك. تحقق من مجلد السبام أيضاً.",
      });
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
    <div className="flex min-h-screen items-center justify-center bg-gradient-hero px-4 py-8">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/3 right-1/3 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <button onClick={() => navigate("/")}
          className="mb-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> العودة للرئيسية
        </button>

        <div className="glass rounded-2xl p-8 max-h-[85vh] overflow-y-auto scrollbar-hide">
          <div className="mb-6 text-center">
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
              <>
                <div className="flex justify-center mb-2">
                  <div className="relative cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="" className="h-20 w-20 rounded-full object-cover border-2 border-primary shadow-glow" />
                    ) : (
                      <div className="h-20 w-20 rounded-full bg-secondary border-2 border-dashed border-border flex items-center justify-center">
                        <Camera className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="absolute -bottom-1 -left-1 h-7 w-7 rounded-full bg-primary flex items-center justify-center">
                      <Camera className="h-3.5 w-3.5 text-primary-foreground" />
                    </div>
                    <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarSelect} />
                  </div>
                </div>
                <p className="text-center text-xs text-muted-foreground -mt-2">صورة الحساب (اختياري)</p>

                <div className="relative">
                  <User className="absolute right-3 top-3 h-5 w-5 text-muted-foreground" />
                  <Input placeholder="الاسم الكامل *" value={displayName} onChange={e => setDisplayName(e.target.value)}
                    className="pr-10 bg-secondary border-border text-foreground placeholder:text-muted-foreground" required />
                </div>

                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">النوع *</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setGender("male")}
                      className={`rounded-xl py-2.5 text-sm font-bold transition-all border ${gender === "male" ? "bg-primary/15 text-primary border-primary/40" : "bg-secondary text-foreground border-border/30"}`}>
                      👨 طالب
                    </button>
                    <button type="button" onClick={() => setGender("female")}
                      className={`rounded-xl py-2.5 text-sm font-bold transition-all border ${gender === "female" ? "bg-accent/15 text-accent border-accent/40" : "bg-secondary text-foreground border-border/30"}`}>
                      👩 طالبة
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">الشعبة *</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setDivision("scientific")}
                      className={`rounded-xl py-2.5 text-sm font-bold transition-all border ${division === "scientific" ? "bg-primary/15 text-primary border-primary/40" : "bg-secondary text-foreground border-border/30"}`}>
                      🔬 علمي
                    </button>
                    <button type="button" onClick={() => setDivision("literary")}
                      className={`rounded-xl py-2.5 text-sm font-bold transition-all border ${division === "literary" ? "bg-accent/15 text-accent border-accent/40" : "bg-secondary text-foreground border-border/30"}`}>
                      📚 أدبي
                    </button>
                  </div>
                </div>

                <div>
                  <div className="relative">
                    <Phone className="absolute right-3 top-3 h-5 w-5 text-muted-foreground" />
                    <Input placeholder="رقم الهاتف * (مثال: 01012345678)" value={phone}
                      onChange={e => { setPhone(e.target.value); if (phoneError) validatePhone(e.target.value); }}
                      className={`pr-10 bg-secondary border-border text-foreground placeholder:text-muted-foreground ${phoneError ? "border-destructive" : ""}`}
                      required />
                  </div>
                  {phoneError && <p className="text-xs text-destructive mt-1">{phoneError}</p>}
                </div>

                <div className="relative">
                  <Phone className="absolute right-3 top-3 h-5 w-5 text-muted-foreground" />
                  <Input placeholder="رقم ولي الأمر (اختياري)" value={phoneParent}
                    onChange={e => setPhoneParent(e.target.value)}
                    className="pr-10 bg-secondary border-border text-foreground placeholder:text-muted-foreground" />
                </div>
              </>
            )}

            <div className="relative">
              <Mail className="absolute right-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input type="email" placeholder="البريد الإلكتروني" value={email} onChange={e => setEmail(e.target.value)}
                className="pr-10 bg-secondary border-border text-foreground placeholder:text-muted-foreground" required />
            </div>

            {mode !== "forgot" && (
              <div className="relative">
                <Lock className="absolute right-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input type={showPassword ? "text" : "password"} placeholder="كلمة المرور" value={password} onChange={e => setPassword(e.target.value)}
                  className="pr-10 pl-10 bg-secondary border-border text-foreground placeholder:text-muted-foreground" required minLength={6} />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-3 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            )}

            <Button type="submit" disabled={loading}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow py-6 text-base font-semibold">
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
              <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setPassword(""); setPhoneError(""); }}
                className="text-sm text-primary hover:underline">
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
