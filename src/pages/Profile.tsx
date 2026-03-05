import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Camera, User, Save, Lock, Eye, EyeOff, Trash2, AlertTriangle, Phone, BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Profile = () => {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [phoneParent, setPhoneParent] = useState("");
  const [division, setDivision] = useState<"scientific" | "literary">("scientific");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(false);

  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPass, setShowNewPass] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || "");
      setAvatarUrl(profile.avatar_url);
      setPhone((profile as any).phone || "");
      setPhoneParent((profile as any).phone_parent || "");
      setDivision((profile as any).division === "literary" ? "literary" : "scientific");
      setBio((profile as any).bio || "");
    }
  }, [profile]);

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    const { error } = await supabase.from("profiles").update({
      display_name: displayName,
      phone: phone || null,
      phone_parent: phoneParent || null,
      division,
      bio: bio || null,
    }).eq("id", user.id);
    if (error) toast({ title: "خطأ", description: error.message, variant: "destructive" });
    else {
      toast({ title: "تم الحفظ", description: "تم تحديث الملف الشخصي" });
      refreshProfile();
    }
    setLoading(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const fileExt = file.name.split(".").pop();
    const filePath = `${user.id}/avatar.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file, { upsert: true });
    if (uploadError) { toast({ title: "خطأ", description: uploadError.message, variant: "destructive" }); return; }
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(filePath);
    await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", user.id);
    setAvatarUrl(publicUrl);
    toast({ title: "تم", description: "تم تحديث الصورة الشخصية" });
  };

  const handlePasswordChange = async () => {
    if (!user) return;
    if (newPassword.length < 6) { toast({ title: "خطأ", description: "كلمة المرور يجب أن تكون 6 أحرف على الأقل", variant: "destructive" }); return; }
    if (newPassword !== confirmPassword) { toast({ title: "خطأ", description: "كلمات المرور غير متطابقة", variant: "destructive" }); return; }
    setPasswordLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: user.email!, password: currentPassword });
      if (signInError) { toast({ title: "خطأ", description: "كلمة المرور الحالية غير صحيحة", variant: "destructive" }); setPasswordLoading(false); return; }
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ title: "تم", description: "تم تغيير كلمة المرور بنجاح" });
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); setShowPasswordSection(false);
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally { setPasswordLoading(false); }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setDeleteLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: user.email!, password: deletePassword });
      if (signInError) { toast({ title: "خطأ", description: "كلمة المرور غير صحيحة", variant: "destructive" }); setDeleteLoading(false); return; }
      await supabase.from("conversations").delete().eq("user_id", user.id);
      await supabase.from("user_roles").delete().eq("user_id", user.id);
      await supabase.from("profiles").delete().eq("id", user.id);
      await signOut();
      navigate("/");
      toast({ title: "تم حذف الحساب", description: "تم حذف جميع بياناتك" });
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally { setDeleteLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-hero px-4 py-8">
      <div className="max-w-lg mx-auto">
        <button onClick={() => navigate("/chat")} className="mb-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> العودة للمحادثة
        </button>

        <div className="glass rounded-2xl p-8">
          <h1 className="text-2xl font-bold text-foreground mb-8 text-center">
            <span className="text-gradient-cosmic">الملف الشخصي</span>
          </h1>

          <div className="flex flex-col items-center mb-8">
            <div className="relative">
              {avatarUrl ? (
                <img src={avatarUrl} alt="avatar" className="h-24 w-24 rounded-full object-cover border-2 border-primary shadow-glow" />
              ) : (
                <div className="h-24 w-24 rounded-full bg-primary/20 flex items-center justify-center border-2 border-primary">
                  <User className="h-10 w-10 text-primary" />
                </div>
              )}
              <label className="absolute bottom-0 left-0 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-glow">
                <Camera className="h-4 w-4" />
                <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
              </label>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">البريد الإلكتروني</label>
              <Input value={user?.email || ""} disabled className="bg-secondary border-border/30 text-foreground opacity-70" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">الاسم</label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="bg-secondary border-border/30 text-foreground" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">النبذة الشخصية</label>
              <textarea value={bio} onChange={e => setBio(e.target.value)} rows={2} placeholder="اكتب نبذة عنك..."
                className="w-full rounded-xl bg-secondary border border-border/30 px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 resize-none" />
            </div>

            {/* Phone */}
            <div className="relative">
              <Phone className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
              <label className="text-sm text-muted-foreground mb-1 block">رقم الهاتف</label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="رقم الهاتف"
                className="pr-10 bg-secondary border-border/30 text-foreground" />
            </div>

            {/* Parent Phone */}
            <div className="relative">
              <Phone className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
              <label className="text-sm text-muted-foreground mb-1 block">رقم ولي الأمر</label>
              <Input value={phoneParent} onChange={e => setPhoneParent(e.target.value)} placeholder="رقم ولي الأمر (اختياري)"
                className="pr-10 bg-secondary border-border/30 text-foreground" />
            </div>

            {/* Division */}
            <div>
              <label className="text-sm text-muted-foreground mb-2 block flex items-center gap-1.5">
                <BookOpen className="h-4 w-4" /> الشعبة
              </label>
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

            <Button onClick={handleSave} disabled={loading} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow">
              <Save className="ml-2 h-4 w-4" />
              {loading ? "جاري الحفظ..." : "حفظ التغييرات"}
            </Button>
          </div>

          {/* Password Change */}
          <div className="mt-8 border-t border-border/30 pt-6">
            <button onClick={() => setShowPasswordSection(!showPasswordSection)}
              className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors w-full">
              <Lock className="h-4 w-4" /> تغيير كلمة المرور
            </button>
            {showPasswordSection && (
              <div className="mt-4 space-y-3">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">كلمة المرور الحالية</label>
                  <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
                    className="bg-secondary border-border/30 text-foreground" placeholder="أدخل كلمة المرور الحالية" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">كلمة المرور الجديدة</label>
                  <div className="relative">
                    <Input type={showNewPass ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                      className="bg-secondary border-border/30 text-foreground pl-10" placeholder="6 أحرف على الأقل" minLength={6} />
                    <button type="button" onClick={() => setShowNewPass(!showNewPass)} className="absolute left-3 top-3 text-muted-foreground hover:text-foreground">
                      {showNewPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">تأكيد كلمة المرور الجديدة</label>
                  <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-secondary border-border/30 text-foreground" placeholder="أعد كتابة كلمة المرور الجديدة" />
                </div>
                <Button onClick={handlePasswordChange} disabled={passwordLoading || !currentPassword || !newPassword || !confirmPassword}
                  className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                  <Lock className="ml-2 h-4 w-4" /> {passwordLoading ? "جاري التحديث..." : "تحديث كلمة المرور"}
                </Button>
              </div>
            )}
          </div>

          {/* Delete Account */}
          <div className="mt-8 border-t border-border/30 pt-6">
            <button onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
              className="flex items-center gap-2 text-sm font-medium text-destructive hover:text-destructive/80 transition-colors w-full">
              <Trash2 className="h-4 w-4" /> حذف الحساب نهائياً
            </button>
            {showDeleteConfirm && (
              <div className="mt-4 rounded-xl bg-destructive/10 border border-destructive/30 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  <span className="text-sm font-bold text-destructive">تحذير! هذا الإجراء لا يمكن التراجع عنه</span>
                </div>
                <p className="text-xs text-muted-foreground mb-3">سيتم حذف جميع بياناتك ومحادثاتك نهائياً.</p>
                <Input type="password" value={deletePassword} onChange={e => setDeletePassword(e.target.value)}
                  placeholder="أدخل كلمة المرور للتأكيد" className="bg-secondary border-border/30 text-foreground mb-3" />
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowDeleteConfirm(false)} className="border-border/30">إلغاء</Button>
                  <Button variant="destructive" size="sm" onClick={handleDeleteAccount}
                    disabled={deleteLoading || !deletePassword}>
                    {deleteLoading ? "جاري الحذف..." : "حذف الحساب"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
