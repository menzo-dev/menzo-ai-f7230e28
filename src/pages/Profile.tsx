import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Camera, User, Save, Lock, Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Profile = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Password change
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPass, setShowNewPass] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || "");
      setAvatarUrl(profile.avatar_url);
    }
  }, [profile]);

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName })
      .eq("id", user.id);
    
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "تم الحفظ", description: "تم تحديث الملف الشخصي" });
    }
    setLoading(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    
    const fileExt = file.name.split(".").pop();
    const filePath = `${user.id}/avatar.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true });
    
    if (uploadError) {
      toast({ title: "خطأ في رفع الصورة", description: uploadError.message, variant: "destructive" });
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(filePath);
    
    await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", user.id);
    setAvatarUrl(publicUrl);
    toast({ title: "تم", description: "تم تحديث الصورة الشخصية" });
  };

  const handlePasswordChange = async () => {
    if (!user) return;
    if (newPassword.length < 6) {
      toast({ title: "خطأ", description: "كلمة المرور يجب أن تكون 6 أحرف على الأقل", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "خطأ", description: "كلمات المرور غير متطابقة", variant: "destructive" });
      return;
    }

    setPasswordLoading(true);
    try {
      // Re-authenticate with current password first
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: currentPassword,
      });
      if (signInError) {
        toast({ title: "خطأ", description: "كلمة المرور الحالية غير صحيحة", variant: "destructive" });
        setPasswordLoading(false);
        return;
      }

      // Update password
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      toast({ title: "تم", description: "تم تغيير كلمة المرور بنجاح" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordSection(false);
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero px-4 py-8">
      <div className="max-w-lg mx-auto">
        <button
          onClick={() => navigate("/chat")}
          className="mb-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          العودة للمحادثة
        </button>

        <div className="glass rounded-2xl p-8">
          <h1 className="text-2xl font-bold text-foreground mb-8 text-center">الملف الشخصي</h1>

          <div className="flex flex-col items-center mb-8">
            <div className="relative">
              {avatarUrl ? (
                <img src={avatarUrl} alt="avatar" className="h-24 w-24 rounded-full object-cover border-2 border-primary" />
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
              <Input value={user?.email || ""} disabled className="bg-secondary border-border text-foreground opacity-70" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">الاسم</label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="bg-secondary border-border text-foreground"
              />
            </div>
            <Button onClick={handleSave} disabled={loading} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow">
              <Save className="ml-2 h-4 w-4" />
              {loading ? "جاري الحفظ..." : "حفظ التغييرات"}
            </Button>
          </div>

          {/* Password Change Section */}
          <div className="mt-8 border-t border-border pt-6">
            <button
              onClick={() => setShowPasswordSection(!showPasswordSection)}
              className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors w-full"
            >
              <Lock className="h-4 w-4" />
              تغيير كلمة المرور
            </button>

            {showPasswordSection && (
              <div className="mt-4 space-y-3">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">كلمة المرور الحالية</label>
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="bg-secondary border-border text-foreground"
                    placeholder="أدخل كلمة المرور الحالية"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">كلمة المرور الجديدة</label>
                  <div className="relative">
                    <Input
                      type={showNewPass ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="bg-secondary border-border text-foreground pl-10"
                      placeholder="6 أحرف على الأقل"
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute left-3 top-3 text-muted-foreground hover:text-foreground"
                    >
                      {showNewPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">تأكيد كلمة المرور الجديدة</label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-secondary border-border text-foreground"
                    placeholder="أعد كتابة كلمة المرور الجديدة"
                  />
                </div>
                <Button
                  onClick={handlePasswordChange}
                  disabled={passwordLoading || !currentPassword || !newPassword || !confirmPassword}
                  className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                >
                  <Lock className="ml-2 h-4 w-4" />
                  {passwordLoading ? "جاري التحديث..." : "تحديث كلمة المرور"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
