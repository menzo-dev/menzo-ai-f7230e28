import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Bot, BookOpen, Brain, Search, Image, GraduationCap, MessageSquare, Sparkles, Shield, Zap, Mic, Globe, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  { icon: MessageSquare, title: "محادثة ذكية", desc: "تحدث مع المعلم الذكي واحصل على إجابات فورية بالعربية" },
  { icon: Brain, title: "نماذج عالمية", desc: "GPT-5 • Gemini 3 • DeepSeek • Grok • Claude • Qwen • Llama" },
  { icon: BookOpen, title: "مواد أزهرية شاملة", desc: "فقه • حديث • تفسير • توحيد • أصول • نحو • بلاغة • أدب" },
  { icon: Search, title: "بحث ذكي متعدد", desc: "Exa + Tavily + AI Search — مصادر موثقة ودقيقة" },
  { icon: Image, title: "توليد صور", desc: "Gemini Image + FLUX.1 + Leonardo AI — إنشاء صور احترافية" },
  { icon: GraduationCap, title: "اختبارات تفاعلية", desc: "أسئلة ذكية مع مستويات صعوبة وتصحيح فوري" },
  { icon: Mic, title: "إدخال صوتي", desc: "تحدث بصوتك والذكاء الاصطناعي يفهمك" },
  { icon: Users, title: "منتدى الطلاب", desc: "تواصل مع زملائك وشارك الملفات والصور" },
];

const Landing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-hero overflow-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 inset-x-0 z-50 glass-strong">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-glow">
              <Bot className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-glow-cyan">MENZO-AI</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate("/about")} className="text-muted-foreground hover:text-foreground">عن المطور</Button>
            {user ? (
              <Button onClick={() => navigate("/chat")} className="bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90 shadow-glow">
                <MessageSquare className="ml-2 h-4 w-4" /> ابدأ المحادثة
              </Button>
            ) : (
              <Button onClick={() => navigate("/auth")} className="bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90 shadow-glow">
                تسجيل الدخول
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-6">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 right-1/4 h-96 w-96 rounded-full bg-primary/8 blur-3xl animate-pulse-glow" />
          <div className="absolute bottom-1/4 left-1/4 h-64 w-64 rounded-full bg-accent/10 blur-3xl animate-pulse-glow" style={{ animationDelay: "1s" }} />
        </div>
        <div className="container mx-auto relative z-10 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm text-primary">
              <Sparkles className="h-4 w-4 animate-cosmic" />
              مدعوم بأحدث نماذج الذكاء الاصطناعي العالمية
            </div>
            <h1 className="mb-6 text-5xl font-black leading-tight md:text-7xl">
              <span className="text-foreground">معلمك الذكي</span><br />
              <span className="text-gradient-cosmic text-glow-cyan">للأزهر الشريف</span>
            </h1>
            <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground leading-relaxed">
              منصة تعليمية متكاملة لطلاب الصف الثالث الثانوي الأزهري. محادثة ذكية، اختبارات تفاعلية، وبحث متقدم — مدعوم بأكثر من 30 نموذج ذكاء اصطناعي.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {user ? (
                <Button size="lg" onClick={() => navigate("/chat")} className="bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90 shadow-glow text-lg px-8 py-6">
                  <MessageSquare className="ml-2 h-5 w-5" /> ابدأ المحادثة الآن
                </Button>
              ) : (
                <>
                  <Button size="lg" onClick={() => navigate("/auth")} className="bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90 shadow-glow text-lg px-8 py-6">
                    <Zap className="ml-2 h-5 w-5" /> ابدأ مجاناً
                  </Button>
                  <Button size="lg" variant="outline" onClick={() => navigate("/about")} className="border-border/40 text-foreground hover:bg-secondary text-lg px-8 py-6">تعرف علينا</Button>
                </>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6">
        <div className="container mx-auto">
          <motion.h2 className="mb-12 text-center text-3xl font-bold text-foreground" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
            كل ما تحتاجه <span className="text-gradient-accent text-glow-purple">في مكان واحد</span>
          </motion.h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {features.map((f, i) => (
              <motion.div key={f.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                className="group rounded-2xl glass p-6 hover:border-primary/40 transition-all duration-300 hover:shadow-glow">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-accent/15 text-primary group-hover:from-primary group-hover:to-accent group-hover:text-primary-foreground transition-all">
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-lg font-bold text-foreground">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/30 py-8 px-6">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <span className="text-sm text-muted-foreground">MENZO-AI © 2026 — Developed by Mohamed Walid El-manzlawy</span>
          </div>
          <button onClick={() => navigate("/about")} className="text-sm text-muted-foreground hover:text-primary transition-colors">عن المطور</button>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
