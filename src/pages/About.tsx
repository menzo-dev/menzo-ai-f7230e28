import { motion } from "framer-motion";
import { Bot, Code, Heart, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const About = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-hero px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate("/")}
          className="mb-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          العودة للرئيسية
        </button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-8"
        >
          <div className="text-center mb-8">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-glow">
              <Bot className="h-10 w-10 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">MENZO-AI</h1>
            <p className="text-muted-foreground">المعلم الذكي للأزهر الشريف</p>
          </div>

          <div className="space-y-6 text-foreground leading-relaxed">
            <div className="glass rounded-xl p-6">
              <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
                <Heart className="h-5 w-5 text-accent" />
                عن المشروع
              </h2>
              <p className="text-muted-foreground">
                MENZO-AI هو مشروع تعليمي مبتكر يهدف لمساعدة طلاب الصف الثالث الثانوي الأزهري في مراجعة دروسهم والاستعداد للامتحانات باستخدام أحدث تقنيات الذكاء الاصطناعي.
                يدعم المنصة نماذج ذكاء اصطناعي متعددة تشمل GPT-5 وGemini Pro والمزيد.
              </p>
            </div>

            <div className="glass rounded-xl p-6">
              <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
                <Code className="h-5 w-5 text-primary" />
                عن المطور
              </h2>
              <p className="text-muted-foreground">
                تم تطوير هذا المشروع بشغف وحب لخدمة طلاب العلم في الأزهر الشريف.
                نسعى دائماً لتحسين المنصة وإضافة مميزات جديدة لتوفير أفضل تجربة تعليمية ممكنة.
              </p>
            </div>

            <div className="glass rounded-xl p-6">
              <h2 className="text-xl font-bold mb-3">المواد المدعومة</h2>
              <div className="grid grid-cols-2 gap-3">
                {["الفقه الإسلامي", "الحديث الشريف", "التفسير", "الأدب العربي", "النحو والصرف", "البلاغة", "الرياضيات", "العلوم"].map((subject) => (
                  <div key={subject} className="rounded-lg bg-primary/10 px-3 py-2 text-sm text-center text-primary">
                    {subject}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default About;
