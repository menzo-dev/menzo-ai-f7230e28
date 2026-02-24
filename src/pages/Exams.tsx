import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, BookOpen, Clock, CheckCircle2, XCircle, Trophy, ChevronRight, Loader2, RotateCcw
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
  { id: "arabic_lit", label: "الأدب العربي", icon: "✍️" },
  { id: "nahw", label: "النحو والصرف", icon: "📝" },
  { id: "balagha", label: "البلاغة", icon: "🎯" },
  { id: "math", label: "الرياضيات", icon: "🔢" },
  { id: "science", label: "العلوم", icon: "🔬" },
];

type ExamStage = "select" | "config" | "exam" | "results";

const Exams = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [stage, setStage] = useState<ExamStage>("select");
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [questionCount, setQuestionCount] = useState(10);
  const [timeLimit, setTimeLimit] = useState(15); // minutes

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [examLoading, setExamLoading] = useState(false);
  const [examFinished, setExamFinished] = useState(false);

  // Timer
  useEffect(() => {
    if (stage !== "exam" || examFinished) return;
    if (timeLeft <= 0) {
      finishExam();
      return;
    }
    const t = setTimeout(() => setTimeLeft((p) => p - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, stage, examFinished]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const startExam = async () => {
    if (!selectedSubject) return;
    setExamLoading(true);

    try {
      // Try to load questions from database first
      const { data: dbQuestions } = await supabase
        .from("questions")
        .select("id, q_text, choices, answer, difficulty")
        .limit(questionCount);

      if (dbQuestions && dbQuestions.length >= questionCount) {
        const shuffled = dbQuestions.sort(() => Math.random() - 0.5).slice(0, questionCount);
        setQuestions(shuffled.map(q => ({
          ...q,
          choices: Array.isArray(q.choices) ? q.choices as string[] : [],
        })));
      } else {
        // Generate questions via AI
        const subjectLabel = SUBJECTS.find(s => s.id === selectedSubject)?.label || selectedSubject;
        const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: [{
              role: "user",
              content: `أنشئ ${questionCount} أسئلة اختيار من متعدد في مادة "${subjectLabel}" للصف الثالث الثانوي الأزهري.
أعد النتيجة كـ JSON array فقط بدون أي نص إضافي. كل سؤال يحتوي على:
- "q_text": نص السؤال
- "choices": مصفوفة من 4 اختيارات
- "answer": الإجابة الصحيحة (نفس نص الاختيار)
- "difficulty": رقم من 1-3

مثال: [{"q_text":"ما حكم...","choices":["واجب","مستحب","مكروه","حرام"],"answer":"واجب","difficulty":1}]`
            }],
            model: "google/gemini-3-flash-preview",
          }),
        });

        if (!resp.ok) throw new Error("فشل في توليد الأسئلة");

        // Read stream
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

        // Parse JSON from response
        const jsonMatch = fullText.match(/\[[\s\S]*\]/);
        if (!jsonMatch) throw new Error("لم يتم إنشاء أسئلة صالحة");
        const parsedQuestions = JSON.parse(jsonMatch[0]) as Question[];
        setQuestions(parsedQuestions.map((q, i) => ({ ...q, id: `ai-${i}` })));
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

  const score = questions.reduce((acc, q, i) => {
    return acc + (answers[i] === q.answer ? 1 : 0);
  }, 0);

  const percentage = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-hero px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => stage === "select" ? navigate("/chat") : setStage("select")}
          className="mb-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {stage === "select" ? "العودة للمحادثة" : "العودة لاختيار المادة"}
        </button>

        {/* Subject Selection */}
        {stage === "select" && (
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">الاختبارات</h1>
            <p className="text-muted-foreground mb-8">اختر المادة التي تريد اختبار نفسك فيها</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {SUBJECTS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => { setSelectedSubject(s.id); setStage("config"); }}
                  className="glass rounded-2xl p-6 text-center hover:border-primary/40 transition-all group"
                >
                  <div className="text-4xl mb-3">{s.icon}</div>
                  <div className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{s.label}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Config */}
        {stage === "config" && (
          <div className="glass rounded-2xl p-8 max-w-md mx-auto">
            <h2 className="text-2xl font-bold text-foreground mb-6 text-center">
              إعدادات الاختبار — {SUBJECTS.find(s => s.id === selectedSubject)?.label}
            </h2>
            <div className="space-y-6">
              <div>
                <label className="text-sm text-muted-foreground block mb-2">عدد الأسئلة</label>
                <div className="flex gap-2">
                  {[5, 10, 15, 20].map(n => (
                    <button
                      key={n}
                      onClick={() => setQuestionCount(n)}
                      className={`flex-1 rounded-xl py-3 text-sm font-bold transition-colors ${
                        questionCount === n
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-foreground hover:bg-secondary/80"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm text-muted-foreground block mb-2">الوقت (دقائق)</label>
                <div className="flex gap-2">
                  {[5, 10, 15, 30].map(t => (
                    <button
                      key={t}
                      onClick={() => setTimeLimit(t)}
                      className={`flex-1 rounded-xl py-3 text-sm font-bold transition-colors ${
                        timeLimit === t
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-foreground hover:bg-secondary/80"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <Button
                onClick={startExam}
                disabled={examLoading}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow py-6 text-base font-bold"
              >
                {examLoading ? (
                  <><Loader2 className="ml-2 h-5 w-5 animate-spin" />جاري تجهيز الأسئلة...</>
                ) : (
                  <><BookOpen className="ml-2 h-5 w-5" />ابدأ الاختبار</>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Exam */}
        {stage === "exam" && questions.length > 0 && (
          <div>
            {/* Timer & Progress */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2 text-foreground">
                <Clock className="h-5 w-5 text-primary" />
                <span className={`font-mono text-lg font-bold ${timeLeft < 60 ? "text-destructive" : ""}`}>
                  {formatTime(timeLeft)}
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                السؤال {currentQ + 1} / {questions.length}
              </div>
              <Button variant="outline" size="sm" onClick={finishExam} className="border-destructive text-destructive hover:bg-destructive/10">
                إنهاء الاختبار
              </Button>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 rounded-full bg-secondary mb-6">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }}
              />
            </div>

            {/* Question */}
            <div className="glass rounded-2xl p-8">
              <h3 className="text-lg font-bold text-foreground mb-6 leading-relaxed">
                {questions[currentQ].q_text}
              </h3>
              <div className="space-y-3">
                {questions[currentQ].choices.map((choice, ci) => (
                  <button
                    key={ci}
                    onClick={() => setAnswers(prev => ({ ...prev, [currentQ]: choice }))}
                    className={`w-full text-right rounded-xl px-5 py-4 text-sm transition-all border ${
                      answers[currentQ] === choice
                        ? "border-primary bg-primary/10 text-primary font-bold"
                        : "border-border bg-secondary/50 text-foreground hover:border-primary/40"
                    }`}
                  >
                    <span className="ml-3 inline-block w-6 h-6 rounded-full text-xs leading-6 text-center border border-current">
                      {String.fromCharCode(1571 + ci)}
                    </span>
                    {choice}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between mt-8">
                <Button
                  variant="outline"
                  disabled={currentQ === 0}
                  onClick={() => setCurrentQ(p => p - 1)}
                  className="border-border"
                >
                  السابق
                </Button>
                {currentQ < questions.length - 1 ? (
                  <Button
                    onClick={() => setCurrentQ(p => p + 1)}
                    className="bg-primary text-primary-foreground"
                  >
                    التالي <ChevronRight className="mr-1 h-4 w-4" />
                  </Button>
                ) : (
                  <Button onClick={finishExam} className="bg-accent text-accent-foreground">
                    <CheckCircle2 className="ml-2 h-4 w-4" />
                    إنهاء وعرض النتيجة
                  </Button>
                )}
              </div>
            </div>

            {/* Question dots */}
            <div className="flex flex-wrap gap-2 mt-6 justify-center">
              {questions.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentQ(i)}
                  className={`h-8 w-8 rounded-full text-xs font-bold transition-colors ${
                    i === currentQ
                      ? "bg-primary text-primary-foreground"
                      : answers[i]
                        ? "bg-primary/20 text-primary"
                        : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {stage === "results" && (
          <div className="glass rounded-2xl p-8 text-center">
            <div className="mb-6">
              <Trophy className={`h-16 w-16 mx-auto mb-4 ${percentage >= 70 ? "text-accent" : "text-muted-foreground"}`} />
              <h2 className="text-3xl font-bold text-foreground mb-2">
                {percentage >= 90 ? "ممتاز! 🎉" : percentage >= 70 ? "جيد جداً! 👏" : percentage >= 50 ? "جيد 👍" : "حاول مرة أخرى 💪"}
              </h2>
              <div className="text-5xl font-black text-primary my-4">{percentage}%</div>
              <p className="text-muted-foreground">أجبت على {score} من {questions.length} إجابة صحيحة</p>
            </div>

            {/* Review answers */}
            <div className="text-right space-y-4 mt-8">
              {questions.map((q, i) => {
                const isCorrect = answers[i] === q.answer;
                return (
                  <div key={i} className={`rounded-xl p-4 border ${isCorrect ? "border-accent/30 bg-accent/5" : "border-destructive/30 bg-destructive/5"}`}>
                    <div className="flex items-start gap-2 mb-2">
                      {isCorrect ? <CheckCircle2 className="h-5 w-5 text-accent shrink-0 mt-0.5" /> : <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />}
                      <span className="text-sm font-medium text-foreground">{q.q_text}</span>
                    </div>
                    {!isCorrect && (
                      <div className="mr-7 text-xs space-y-1">
                        <div className="text-destructive">إجابتك: {answers[i] || "لم تُجب"}</div>
                        <div className="text-accent">الإجابة الصحيحة: {q.answer}</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3 mt-8 justify-center">
              <Button onClick={() => setStage("select")} variant="outline" className="border-border">
                <RotateCcw className="ml-2 h-4 w-4" />
                اختبار جديد
              </Button>
              <Button onClick={() => navigate("/chat")} className="bg-primary text-primary-foreground">
                العودة للمحادثة
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Exams;
