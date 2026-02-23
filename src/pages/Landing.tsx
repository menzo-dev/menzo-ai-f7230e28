import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Bot, BookOpen, Brain, Search, Image, GraduationCap, MessageSquare, Sparkles, Shield, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  { icon: MessageSquare, title: "محادثة ذكية", desc: "تحدث مع المعلم الذكي بالعربية واحصل على إجابات فورية" },
  { icon: Brain, title: "نماذج ذكاء متعددة", desc: "GPT-5 • Gemini Pro • DeepSeek • Grok وأكثر" },
  { icon: BookOpen, title: "مواد أزهرية", desc: "فقه • حديث • تفسير • أدب عربي • رياضيات • علوم" },
  { icon: Search, title: "محرك بحث ذكي", desc: "بحث في الإنترنت وقاعدة المعرفة مع مصادر موثقة" },
  { icon: Image, title: "توليد صور", desc: "إنشاء رسوم بيانية وصور توضيحية للمذاكرة" },
  { icon: GraduationCap, title: "اختبارات تفاعلية", desc: "اختبر نفسك بأسئلة متنوعة مع تصحيح فوري" },
];

const Landing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-hero overflow-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 inset-x-0 z-50 glass">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-glow">
              <Bot className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">MENZO-AI</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate("/about")} className="text-muted-foreground hover:text-foreground">
              عن المطور
            </Button>
            {user ? (
              <Button onClick={() => navigate("/chat")} className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow">
                <MessageSquare className="ml-2 h-4 w-4" />
                ابدأ المحادثة
              </Button>
            ) : (
              <Button onClick={() => navigate("/auth")} className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow">
                تسجيل الدخول
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-6">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 right-1/4 h-96 w-96 rounded-full bg-primary/5 blur-3xl animate-pulse-glow" />
          <div className="absolute bottom-1/4 left-1/4 h-64 w-64 rounded-full bg-accent/5 blur-3xl animate-pulse-glow" style={{ animationDelay: "1s" }} />
        </div>
        <div className="container mx-auto relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm text-primary">
              <Sparkles className="h-4 w-4" />
              مدعوم بأحدث نماذج الذكاء الاصطناعي
            </div>
            <h1 className="mb-6 text-5xl font-black leading-tight md:text-7xl">
              <span className="text-foreground">معلمك الذكي</span>
              <br />
              <span className="text-gradient-primary">للأزهر الشريف</span>
            </h1>
            <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground leading-relaxed">
              منصة تعليمية متكاملة لطلاب الصف الثالث الثانوي الأزهري. راجع دروسك، اختبر نفسك، واسأل المعلم الذكي عن أي شيء — بالعربية الفصحى.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {user ? (
                <Button size="lg" onClick={() => navigate("/chat")} className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow text-lg px-8 py-6">
                  <MessageSquare className="ml-2 h-5 w-5" />
                  ابدأ المحادثة الآن
                </Button>
              ) : (
                <>
                  <Button size="lg" onClick={() => navigate("/auth")} className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow text-lg px-8 py-6">
                    <Zap className="ml-2 h-5 w-5" />
                    ابدأ مجاناً
                  </Button>
                  <Button size="lg" variant="outline" onClick={() => navigate("/about")} className="border-border text-foreground hover:bg-secondary text-lg px-8 py-6">
                    تعرف علينا
                  </Button>
                </>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6">
        <div className="container mx-auto">
          <motion.h2
            className="mb-12 text-center text-3xl font-bold text-foreground"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            كل ما تحتاجه <span className="text-gradient-accent">في مكان واحد</span>
          </motion.h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group rounded-2xl glass p-6 hover:border-primary/40 transition-all duration-300"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
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
      <footer className="border-t border-border py-8 px-6">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <span className="text-sm text-muted-foreground">MENZO-AI © 2026 — جميع الحقوق محفوظة</span>
          </div>
          <div className="flex gap-4">
            <button onClick={() => navigate("/about")} className="text-sm text-muted-foreground hover:text-primary transition-colors">عن المطور</button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
