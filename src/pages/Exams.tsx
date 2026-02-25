import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, BookOpen, Clock, CheckCircle2, XCircle, Trophy, ChevronRight, Loader2, RotateCcw, Zap, Brain, Gauge
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Question {
  id: string;
  q_text: string;
  choices: string[];
  answer: string;
  difficulty: number;
}

const SUBJECTS = [
  { id: "fiqh", label: "الفقه الإسلامي", icon: "📖" },
  { id: "hadith", label: "الحديث الشريف", icon: "📜" },
  { id: "tafsir", label: "التفسير", icon: "📕" },
  { id: "tawhid", label: "التوحيد والعقيدة", icon: "🕌" },
  { id: "usul_fiqh", label: "أصول الفقه", icon: "⚖️" },
  { id: "arabic_lit", label: "الأدب العربي", icon: "✍️" },
  { id: "nahw", label: "النحو والصرف", icon: "📝" },
  { id: "balagha", label: "البلاغة", icon: "🎯" },
  { id: "math", label: "الرياضيات", icon: "🔢" },
  { id: "physics", label: "الفيزياء", icon: "⚡" },
  { id: "chemistry", label: "الكيمياء", icon: "🧪" },
  { id: "biology", label: "الأحياء", icon: "🔬" },
];

const DIFFICULTIES = [
  { id: 1, label: "سهل", icon: Zap, color: "text-primary" },
  { id: 2, label: "متوسط", icon: Brain, color: "text-accent" },
  { id: 3, label: "صعب", icon: Gauge, color: "text-destructive" },
];

type ExamStage = "select" | "config" | "exam" | "results";

const Exams = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [stage, setStage] = useState<ExamStage>("select");
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [questionCount, setQuestionCount] = useState(10);
  const [customCount, setCustomCount] = useState("");
  const [timeLimit, setTimeLimit] = useState(15);
  const [difficulty, setDifficulty] = useState(0); // 0 = all

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [examLoading, setExamLoading] = useState(false);
  const [examFinished, setExamFinished] = useState(false);

  useEffect(() => {
    if (stage !== "exam" || examFinished) return;
    if (timeLeft <= 0) { finishExam(); return; }
    const t = setTimeout(() => setTimeLeft((p) => p - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, stage, examFinished]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const getEffectiveCount = () => {
    if (customCount) {
      const n = parseInt(customCount);
      if (n > 0 && n <= 100) return n;
    }
    return questionCount;
  };

  const startExam = async () => {
    if (!selectedSubject) return;
    const count = getEffectiveCount();
    if (count < 1 || count > 100) {
      toast({ title: "خطأ", description: "عدد الأسئلة يجب أن يكون بين 1 و 100", variant: "destructive" });
      return;
    }
    setExamLoading(true);

    try {
      // Try to load from DB first
      let query = supabase.from("questions").select("id, q_text, choices, answer, difficulty");
      if (difficulty > 0) query = query.eq("difficulty", difficulty);
      const { data: dbQuestions } = await query.limit(count);

      if (dbQuestions && dbQuestions.length >= count) {
        const shuffled = dbQuestions.sort(() => Math.random() - 0.5).slice(0, count);
        setQuestions(shuffled.map(q => ({ ...q, choices: Array.isArray(q.choices) ? q.choices as string[] : [] })));
      } else {
        // Generate via AI
        const subjectLabel = SUBJECTS.find(s => s.id === selectedSubject)?.label || selectedSubject;
        const diffLabel = difficulty > 0 ? DIFFICULTIES.find(d => d.id === difficulty)?.label : "متنوعة";
        
        const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: [{
              role: "user",
              content: `أنشئ ${count} أسئلة اختيار من متعدد في مادة "${subjectLabel}" للصف الثالث الثانوي الأزهري. مستوى الصعوبة: ${diffLabel}.
أعد النتيجة كـ JSON array فقط بدون أي نص إضافي أو markdown. كل سؤال يحتوي على:
- "q_text": نص السؤال (واضح ومحدد)
- "choices": مصفوفة من 4 اختيارات مختلفة
- "answer": الإجابة الصحيحة (نفس نص الاختيار بالضبط)
- "difficulty": ${difficulty || "رقم من 1-3"}

مثال: [{"q_text":"ما حكم صلاة الجمعة؟","choices":["فرض عين","فرض كفاية","سنة مؤكدة","مستحب"],"answer":"فرض عين","difficulty":1}]`
            }],
            model: "google/gemini-3-flash-preview",
          }),
        });

        if (!resp.ok) throw new Error("فشل في توليد الأسئلة");

        const reader = resp.body!.getReader();
        const decoder = new TextDecoder();
        let fullText = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") continue;
            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) fullText += content;
            } catch {}
          }
        }

        const jsonMatch = fullText.match(/\[[\s\S]*\]/);
        if (!jsonMatch) throw new Error("لم يتم إنشاء أسئلة صالحة. حاول مرة أخرى.");
        
        let parsedQuestions: Question[];
        try {
          parsedQuestions = JSON.parse(jsonMatch[0]);
        } catch {
          throw new Error("خطأ في تحليل الأسئلة. حاول مرة أخرى.");
        }

        if (!Array.isArray(parsedQuestions) || parsedQuestions.length === 0) {
          throw new Error("لم يتم إنشاء أسئلة. حاول مرة أخرى.");
        }

        // Validate questions
        const validQuestions = parsedQuestions.filter(q => 
          q.q_text && Array.isArray(q.choices) && q.choices.length >= 2 && q.answer
        );
        
        if (validQuestions.length === 0) throw new Error("الأسئلة غير صالحة. حاول مرة أخرى.");

        setQuestions(validQuestions.map((q, i) => ({
          ...q,
          id: `ai-${i}`,
          choices: q.choices.slice(0, 4),
          difficulty: q.difficulty || 1,
        })));
      }

      setTimeLeft(timeLimit * 60);
      setCurrentQ(0);
      setAnswers({});
      setExamFinished(false);
      setStage("exam");
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setExamLoading(false);
    }
  };

  const finishExam = useCallback(() => {
    setExamFinished(true);
    setStage("results");
  }, []);

  const score = questions.reduce((acc, q, i) => acc + (answers[i] === q.answer ? 1 : 0), 0);
  const percentage = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-hero px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <button onClick={() => stage === "select" ? navigate("/chat") : setStage("select")}
          className="mb-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          {stage === "select" ? "العودة للمحادثة" : "العودة"}
        </button>

        {/* Subject Selection */}
        {stage === "select" && (
          <div>
            <h1 className="text-3xl font-bold mb-2"><span className="text-gradient-cosmic">الاختبارات</span></h1>
            <p className="text-muted-foreground mb-8">اختر المادة واختبر نفسك</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {SUBJECTS.map((s) => (
                <button key={s.id} onClick={() => { setSelectedSubject(s.id); setStage("config"); }}
                  className="glass rounded-2xl p-5 text-center hover:border-primary/40 transition-all group">
                  <div className="text-3xl mb-2">{s.icon}</div>
                  <div className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{s.label}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Config */}
        {stage === "config" && (
          <div className="glass rounded-2xl p-8 max-w-md mx-auto">
            <h2 className="text-xl font-bold text-foreground mb-6 text-center">
              إعدادات الاختبار — {SUBJECTS.find(s => s.id === selectedSubject)?.label}
            </h2>
            <div className="space-y-5">
              {/* Question count */}
              <div>
                <label className="text-sm text-muted-foreground block mb-2">عدد الأسئلة</label>
                <div className="flex gap-2 mb-2">
                  {[5, 10, 20, 50].map(n => (
                    <button key={n} onClick={() => { setQuestionCount(n); setCustomCount(""); }}
                      className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition-colors ${
                        questionCount === n && !customCount ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-secondary/80"
                      }`}>{n}</button>
                  ))}
                </div>
                <input type="number" placeholder="عدد مخصص (حتى 100)" min={1} max={100}
                  value={customCount} onChange={e => setCustomCount(e.target.value)}
                  className="w-full rounded-xl bg-secondary/50 border border-border/30 px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50" />
              </div>

              {/* Difficulty */}
              <div>
                <label className="text-sm text-muted-foreground block mb-2">مستوى الصعوبة</label>
                <div className="flex gap-2">
                  <button onClick={() => setDifficulty(0)}
                    className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition-colors ${
                      difficulty === 0 ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
                    }`}>الكل</button>
                  {DIFFICULTIES.map(d => (
                    <button key={d.id} onClick={() => setDifficulty(d.id)}
                      className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition-colors flex items-center justify-center gap-1 ${
                        difficulty === d.id ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
                      }`}>
                      <d.icon className="h-3.5 w-3.5" /> {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time */}
              <div>
                <label className="text-sm text-muted-foreground block mb-2">الوقت (دقائق)</label>
                <div className="flex gap-2">
                  {[5, 10, 15, 30, 60].map(t => (
                    <button key={t} onClick={() => setTimeLimit(t)}
                      className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition-colors ${
                        timeLimit === t ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-secondary/80"
                      }`}>{t}</button>
                  ))}
                </div>
              </div>

              <Button onClick={startExam} disabled={examLoading}
                className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90 shadow-glow py-6 text-base font-bold">
                {examLoading ? <><Loader2 className="ml-2 h-5 w-5 animate-spin" />جاري تجهيز الأسئلة...</> : <><BookOpen className="ml-2 h-5 w-5" />ابدأ الاختبار</>}
              </Button>
            </div>
          </div>
        )}

        {/* Exam */}
        {stage === "exam" && questions.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2 text-foreground">
                <Clock className="h-5 w-5 text-primary" />
                <span className={`font-mono text-lg font-bold ${timeLeft < 60 ? "text-destructive animate-pulse" : ""}`}>{formatTime(timeLeft)}</span>
              </div>
              <div className="text-sm text-muted-foreground">السؤال {currentQ + 1} / {questions.length}</div>
              <Button variant="outline" size="sm" onClick={finishExam} className="border-destructive text-destructive hover:bg-destructive/10">إنهاء</Button>
            </div>

            <div className="w-full h-2 rounded-full bg-secondary mb-6">
              <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all" style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }} />
            </div>

            <div className="glass rounded-2xl p-8">
              <div className="flex items-center gap-2 mb-4">
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  questions[currentQ].difficulty === 1 ? "bg-primary/15 text-primary" :
                  questions[currentQ].difficulty === 2 ? "bg-accent/15 text-accent" : "bg-destructive/15 text-destructive"
                }`}>
                  {DIFFICULTIES.find(d => d.id === questions[currentQ].difficulty)?.label || "—"}
                </span>
              </div>
              <h3 className="text-lg font-bold text-foreground mb-6 leading-relaxed">{questions[currentQ].q_text}</h3>
              <div className="space-y-3">
                {questions[currentQ].choices.map((choice, ci) => (
                  <button key={ci} onClick={() => setAnswers(prev => ({ ...prev, [currentQ]: choice }))}
                    className={`w-full text-right rounded-xl px-5 py-4 text-sm transition-all border ${
                      answers[currentQ] === choice ? "border-primary bg-primary/10 text-primary font-bold shadow-glow" : "border-border/30 bg-secondary/40 text-foreground hover:border-primary/40"
                    }`}>
                    <span className="ml-3 inline-block w-6 h-6 rounded-full text-xs leading-6 text-center border border-current">
                      {String.fromCharCode(1571 + ci)}
                    </span>
                    {choice}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between mt-8">
                <Button variant="outline" disabled={currentQ === 0} onClick={() => setCurrentQ(p => p - 1)} className="border-border/30">السابق</Button>
                {currentQ < questions.length - 1 ? (
                  <Button onClick={() => setCurrentQ(p => p + 1)} className="bg-primary text-primary-foreground">
                    التالي <ChevronRight className="mr-1 h-4 w-4" />
                  </Button>
                ) : (
                  <Button onClick={finishExam} className="bg-gradient-to-r from-primary to-accent text-primary-foreground">
                    <CheckCircle2 className="ml-2 h-4 w-4" /> إنهاء وعرض النتيجة
                  </Button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mt-6 justify-center">
              {questions.map((_, i) => (
                <button key={i} onClick={() => setCurrentQ(i)}
                  className={`h-8 w-8 rounded-full text-xs font-bold transition-colors ${
                    i === currentQ ? "bg-primary text-primary-foreground shadow-glow" :
                    answers[i] ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"
                  }`}>{i + 1}</button>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {stage === "results" && (
          <div className="glass rounded-2xl p-8 text-center">
            <Trophy className={`h-16 w-16 mx-auto mb-4 ${percentage >= 70 ? "text-accent text-glow-gold" : "text-muted-foreground"}`} />
            <h2 className="text-3xl font-bold text-foreground mb-2">
              {percentage >= 90 ? "ممتاز! 🎉" : percentage >= 70 ? "جيد جداً! 👏" : percentage >= 50 ? "جيد 👍" : "حاول مرة أخرى 💪"}
            </h2>
            <div className="text-5xl font-black my-4"><span className="text-gradient-cosmic">{percentage}%</span></div>
            <p className="text-muted-foreground">أجبت على {score} من {questions.length} إجابة صحيحة</p>

            <div className="text-right space-y-4 mt-8">
              {questions.map((q, i) => {
                const isCorrect = answers[i] === q.answer;
                return (
                  <div key={i} className={`rounded-xl p-4 border ${isCorrect ? "border-primary/30 bg-primary/5" : "border-destructive/30 bg-destructive/5"}`}>
                    <div className="flex items-start gap-2 mb-2">
                      {isCorrect ? <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" /> : <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />}
                      <span className="text-sm font-medium text-foreground">{q.q_text}</span>
                    </div>
                    {!isCorrect && (
                      <div className="mr-7 text-xs space-y-1">
                        <div className="text-destructive">إجابتك: {answers[i] || "لم تُجب"}</div>
                        <div className="text-primary">الإجابة الصحيحة: {q.answer}</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3 mt-8 justify-center">
              <Button onClick={() => setStage("select")} variant="outline" className="border-border/30">
                <RotateCcw className="ml-2 h-4 w-4" /> اختبار جديد
              </Button>
              <Button onClick={() => navigate("/chat")} className="bg-primary text-primary-foreground">العودة للمحادثة</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Exams;
