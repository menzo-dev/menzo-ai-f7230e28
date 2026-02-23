import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Camera, User, Save } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Profile = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
        </div>
      </div>
    </div>
  );
};

export default Profile;
