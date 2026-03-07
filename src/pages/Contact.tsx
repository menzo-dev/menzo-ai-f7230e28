import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Mail, Send, Image, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Contact = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [name, setName] = useState(profile?.display_name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [message, setMessage] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;
    setSending(true);
    try {
      let fullMessage = message.trim();

      // Upload image if selected
      if (imageFile && user) {
        const ext = imageFile.name.split(".").pop();
        const path = `contact/${user.id}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from("avatars").upload(path, imageFile);
        if (!uploadErr) {
          const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
          fullMessage += `\n\n📷 صورة مرفقة: ${publicUrl}`;
        }
      }

      const { error } = await supabase.from("contact_messages").insert({
        user_id: user?.id || null,
        name: name.trim(),
        email: email.trim(),
        message: fullMessage,
      });
      if (error) throw error;
      toast({ title: "تم الإرسال ✅", description: "شكراً لتواصلك! سنرد عليك قريباً" });
      setMessage("");
      setImageFile(null);
      setImagePreview(null);
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally { setSending(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-hero px-4 py-8">
      <div className="max-w-lg mx-auto">
        <button onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> العودة
        </button>

        <div className="glass rounded-2xl p-8">
          <div className="text-center mb-6">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-glow">
              <Mail className="h-8 w-8 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              <span className="text-gradient-cosmic">تواصل مع الإدارة</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-2">أرسل رسالتك وسنرد عليك في أقرب وقت</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">الاسم</label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="اسمك"
                className="bg-secondary/50 border-border/30 text-foreground" required />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">البريد الإلكتروني</label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="بريدك الإلكتروني"
                className="bg-secondary/50 border-border/30 text-foreground" required />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">الرسالة</label>
              <textarea value={message} onChange={e => setMessage(e.target.value)}
                placeholder="اكتب رسالتك هنا..."
                className="w-full bg-secondary/50 rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border/30 focus:border-primary/50 resize-none"
                rows={5} required />
            </div>

            {/* Optional Image */}
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">صورة مرفقة (اختياري)</label>
              {imagePreview ? (
                <div className="flex items-center gap-2">
                  <img src={imagePreview} alt="" className="h-20 w-20 rounded-lg object-cover" />
                  <button type="button" onClick={() => { setImageFile(null); setImagePreview(null); }}
                    className="text-destructive hover:text-destructive/80">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center gap-2 cursor-pointer bg-secondary/50 rounded-xl px-4 py-3 border border-dashed border-border/40 hover:border-primary/40 transition-colors">
                  <Image className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">اضغط لرفع صورة</span>
                  <input type="file" accept="image/*" className="hidden" onChange={e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setImageFile(file);
                    const reader = new FileReader();
                    reader.onload = ev => setImagePreview(ev.target?.result as string);
                    reader.readAsDataURL(file);
                  }} />
                </label>
              )}
            </div>

            <Button type="submit" disabled={sending}
              className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-glow py-6 text-base font-bold">
              <Send className="ml-2 h-5 w-5" />
              {sending ? "جاري الإرسال..." : "إرسال الرسالة"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Contact;
