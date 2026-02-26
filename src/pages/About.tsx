import { motion } from "framer-motion";
import { Bot, Code, Heart, ArrowLeft, Mail, BookOpen, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

const About = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !contactEmail.trim() || !contactMessage.trim()) return;
    setSending(true);
    try {
      const { error } = await supabase.from("contact_messages").insert({
        user_id: user?.id || null,
        name: contactName.trim(),
        email: contactEmail.trim(),
        message: contactMessage.trim(),
      });
      if (error) throw error;
      toast({ title: "تم الإرسال", description: "شكراً لتواصلك! سنرد عليك قريباً" });
      setContactName(""); setContactEmail(""); setContactMessage("");
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally { setSending(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-hero px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <button onClick={() => navigate("/")}
          className="mb-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> العودة للرئيسية
        </button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Header */}
          <div className="glass rounded-2xl p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-glow">
              <Bot className="h-10 w-10 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">MENZO-AI</h1>
            <p className="text-muted-foreground">المعلم الذكي للأزهر الشريف</p>
          </div>

          {/* Developer */}
          <div className="glass rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Code className="h-5 w-5 text-primary" /> عن المطور
            </h2>
            <div className="text-center my-4">
              <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-accent/20 text-primary text-2xl font-bold mb-3 shadow-glow">
                MW
              </div>
              <h3 className="text-lg font-bold text-foreground">Mohamed Walid El-manzlawy</h3>
              <p className="text-sm text-muted-foreground">مطور ومؤسس MENZO-AI</p>
              <p className="text-xs text-primary mt-1">moha147wa@gmail.com</p>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              تم تطوير هذا المشروع بشغف وحب لخدمة طلاب العلم في الأزهر الشريف.
              طالب عند أ/محمد حجازي (شرعي) وأ/وليد الشيخ (عربي).
              الذكاء الاصطناعي مزود بمعلومات عن المنهج الأزهري وأساتذته المتميزين.
            </p>
          </div>

          {/* Teachers */}
          <div className="glass rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-accent" /> الأساتذة
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-secondary/40 rounded-xl p-4 text-center border border-border/30">
                <div className="text-2xl mb-2">📖</div>
                <div className="font-bold text-foreground text-sm">أ/محمد حجازي</div>
                <div className="text-xs text-muted-foreground">شرعي</div>
              </div>
              <div className="bg-secondary/40 rounded-xl p-4 text-center border border-border/30">
                <div className="text-2xl mb-2">✍️</div>
                <div className="font-bold text-foreground text-sm">أ/وليد الشيخ</div>
                <div className="text-xs text-muted-foreground">عربي</div>
              </div>
            </div>
          </div>

          {/* Subjects */}
          <div className="glass rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" /> المواد المدعومة
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {["الفقه الإسلامي", "الحديث الشريف", "التفسير", "التوحيد", "أصول الفقه", "النحو والصرف", "البلاغة", "الأدب العربي", "الفيزياء", "الكيمياء", "الأحياء", "الرياضيات"].map(s => (
                <div key={s} className="rounded-lg bg-primary/10 px-3 py-2 text-sm text-center text-primary">{s}</div>
              ))}
            </div>
          </div>

          {/* Contact Form */}
          <div className="glass rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Mail className="h-5 w-5 text-accent" /> تواصل معنا
            </h2>
            <form onSubmit={handleContact} className="space-y-3">
              <input value={contactName} onChange={e => setContactName(e.target.value)}
                placeholder="اسمك" required
                className="w-full bg-secondary/50 rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border/30 focus:border-primary/50" />
              <input value={contactEmail} onChange={e => setContactEmail(e.target.value)}
                type="email" placeholder="بريدك الإلكتروني" required
                className="w-full bg-secondary/50 rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border/30 focus:border-primary/50" />
              <textarea value={contactMessage} onChange={e => setContactMessage(e.target.value)}
                placeholder="اكتب رسالتك هنا..." required rows={4}
                className="w-full bg-secondary/50 rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border/30 focus:border-primary/50 resize-none" />
              <Button type="submit" disabled={sending} className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-glow">
                {sending ? "جاري الإرسال..." : "إرسال الرسالة"}
              </Button>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default About;
