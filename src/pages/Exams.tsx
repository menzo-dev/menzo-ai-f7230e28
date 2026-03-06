import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, BookOpen, Clock, CheckCircle2, XCircle, Trophy, ChevronRight, Loader2, RotateCcw, Zap, Brain, Gauge, ChevronDown
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Question {
  id: string;
  q_text: string;
  choices: string[];
  answer: string;
  difficulty: number;
}

const SCIENTIFIC_SUBJECTS = [
  { id: "fiqh", label: "الفقه الإسلامي", icon: "📖" },
  { id: "hadith", label: "الحديث الشريف", icon: "📜" },
  { id: "tafsir", label: "التفسير", icon: "📕" },
  { id: "tawhid", label: "التوحيد والعقيدة", icon: "🕌" },
  { id: "usul_fiqh", label: "أصول الفقه", icon: "⚖️" },
  { id: "arabic_lit", label: "الأدب العربي", icon: "✍️" },
  { id: "nahw", label: "النحو والصرف", icon: "📝" },
  { id: "balagha", label: "البلاغة", icon: "🎯" },
  { id: "statics", label: "الاستاتيكا", icon: "⚙️" },
  { id: "dynamics", label: "الديناميكا", icon: "🚀" },
  { id: "algebra", label: "الجبر", icon: "🔢" },
  { id: "solid_geometry", label: "الهندسة الفراغية", icon: "📐" },
  { id: "calculus", label: "التفاضل والتكامل", icon: "∫" },
  { id: "physics", label: "الفيزياء", icon: "⚡" },
  { id: "chemistry", label: "الكيمياء", icon: "🧪" },
  { id: "biology", label: "الأحياء", icon: "🔬" },
];

const LITERARY_SUBJECTS = [
  { id: "fiqh", label: "الفقه الإسلامي", icon: "📖" },
  { id: "hadith", label: "الحديث الشريف", icon: "📜" },
  { id: "tafsir", label: "التفسير", icon: "📕" },
  { id: "tawhid", label: "التوحيد والعقيدة", icon: "🕌" },
  { id: "usul_fiqh", label: "أصول الفقه", icon: "⚖️" },
  { id: "arabic_lit", label: "الأدب العربي", icon: "✍️" },
  { id: "nahw", label: "النحو والصرف", icon: "📝" },
  { id: "balagha", label: "البلاغة", icon: "🎯" },
  { id: "history", label: "التاريخ", icon: "🏛️" },
  { id: "geography", label: "الجغرافيا", icon: "🌍" },
  { id: "philosophy", label: "الفلسفة والمنطق", icon: "💭" },
  { id: "psychology", label: "علم النفس", icon: "🧠" },
];

const DIFFICULTIES = [
  { id: 1, label: "سهل", icon: Zap, color: "text-primary" },
  { id: 2, label: "متوسط", icon: Brain, color: "text-accent" },
  { id: 3, label: "صعب", icon: Gauge, color: "text-destructive" },
];

const AI_MODELS = [
  { id: "google/gemini-3-flash-preview", label: "Gemini 3 Flash ⚡" },
  { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { id: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro 💎" },
  { id: "openai/gpt-5-mini", label: "GPT-5 Mini" },
  { id: "openai/gpt-5", label: "GPT-5 🌟" },
];

type ExamStage = "select" | "config" | "exam" | "results";

const Exams = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [stage, setStage] = useState<ExamStage>("select");
  const userDivision = (profile as any)?.division === "literary" ? "literary" : "scientific";
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [questionCount, setQuestionCount] = useState(10);
  const [customCount, setCustomCount] = useState("");
  const [timeLimit, setTimeLimit] = useState(15);
  const [difficulty, setDifficulty] = useState(0);
  const [selectedModel, setSelectedModel] = useState(AI_MODELS[0].id);
  const [examDescription, setExamDescription] = useState("");

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [examLoading, setExamLoading] = useState(false);
  const [examFinished, setExamFinished] = useState(false);

  const subjects = userDivision === "scientific" ? SCIENTIFIC_SUBJECTS : LITERARY_SUBJECTS;

  const finishExam = useCallback(async () => {
    if (examFinished) return;
    setExamFinished(true);
    setStage("results");
    if (user && questions.length > 0) {
      const s = questions.reduce((acc, q, i) => acc + (answers[i] === q.answer ? 1 : 0), 0);
      const pct = Math.round((s / questions.length) * 100);
      const allSubjects = [...SCIENTIFIC_SUBJECTS, ...LITERARY_SUBJECTS];
      const subjectLabel = allSubjects.find(sub => sub.id === selectedSubject)?.label || selectedSubject || "";
      try {
        await supabase.from("exam_results").insert({
          user_id: user.id, subject: subjectLabel, score: s, total: questions.length,
          percentage: pct, difficulty, questions: questions as any, answers: answers as any,
          title: `اختبار ${subjectLabel}`, model_used: selectedModel,
        });
      } catch {}
    }
  }, [examFinished, user, questions, answers, selectedSubject, difficulty, selectedModel]);

  useEffect(() => {
    if (stage !== "exam" || examFinished) return;
    if (timeLeft <= 0) { finishExam(); return; }
    const t = setTimeout(() => setTimeLeft((p) => p - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, stage, examFinished, finishExam]);

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const getEffectiveCount = () => {
    if (customCount) { const n = parseInt(customCount); if (n > 0 && n <= 100) return n; }
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
      const allSubjects = [...SCIENTIFIC_SUBJECTS, ...LITERARY_SUBJECTS];
      const subjectLabel = allSubjects.find(s => s.id === selectedSubject)?.label || selectedSubject;
      const diffLabel = difficulty > 0 ? DIFFICULTIES.find(d => d.id === difficulty)?.label : "متنوعة";
      
      const descriptionPart = examDescription.trim() ? `\nملاحظة: ${examDescription.trim()}` : "";
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({
          messages: [{
            role: "user",
            content: `أنشئ ${count} أسئلة اختيار من متعدد في مادة "${subjectLabel}" للصف الثالث الثانوي الأزهري. مستوى الصعوبة: ${diffLabel}.${descriptionPart}

أعد النتيجة كـ JSON array فقط بدون أي نص إضافي أو markdown أو code blocks أو أي حروف تحكم. كل سؤال يحتوي على:
- "q_text": نص السؤال (نص عادي بدون أي رموز تحكم)
- "choices": مصفوفة من 4 اختيارات مختلفة
- "answer": الإجابة الصحيحة (نفس نص الاختيار بالضبط)
- "difficulty": ${difficulty || "رقم من 1-3"}

مثال: [{"q_text":"ما حكم صلاة الجمعة؟","choices":["فرض عين","فرض كفاية","سنة مؤكدة","مستحب"],"answer":"فرض عين","difficulty":1}]

أعد JSON array فقط، بدون أي نص قبله أو بعده. لا تضع أي control characters أو line breaks داخل النصوص.`
          }],
          model: selectedModel,
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
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try { const p = JSON.parse(jsonStr); const c = p.choices?.[0]?.delta?.content; if (c) fullText += c; } catch {}
        }
      }

      // Robust JSON extraction and parsing
      let cleanText = fullText
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/g, "")
        .replace(/^[^[]*(\[)/s, "$1")
        .trim();
      // Remove control characters except newlines/tabs
      cleanText = cleanText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
      const jsonMatch = cleanText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error("لم يتم إنشاء أسئلة صالحة. حاول مرة أخرى.");
      let parsedQuestions: Question[];
      const rawJson = jsonMatch[0];
      try {
        parsedQuestions = JSON.parse(rawJson);
      } catch {
        // Aggressive cleanup for common AI JSON issues
        let fixed = rawJson
          .replace(/,\s*([}\]])/g, "$1")   // trailing commas
          .replace(/[\x00-\x1F\x7F]/g, " ") // all control chars to space
          .replace(/\n/g, " ")
          .replace(/\r/g, "")
          .replace(/\t/g, " ")
          .replace(/"\s*:\s*"([^"]*?)(?<!\\)"\s*([^",}\]])/g, '":"$1" $2') // fix unescaped quotes in values
          .replace(/,\s*,/g, ",");          // double commas
        try {
          parsedQuestions = JSON.parse(fixed);
        } catch {
          // Last resort: extract individual objects
          const objMatches = [...fixed.matchAll(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g)];
          const extracted = objMatches.map(m => {
            try { return JSON.parse(m[0]); } catch { return null; }
          }).filter(Boolean);
          if (extracted.length === 0) throw new Error("لم يتم إنشاء أسئلة صالحة. حاول مرة أخرى مع نموذج مختلف.");
          parsedQuestions = extracted as Question[];
        }
      }
      const validQuestions = parsedQuestions.filter(q => q.q_text && Array.isArray(q.choices) && q.choices.length >= 2 && q.answer);
      if (validQuestions.length === 0) throw new Error("الأسئلة غير صالحة. حاول مرة أخرى.");

      setQuestions(validQuestions.map((q, i) => ({ ...q, id: `ai-${i}`, choices: q.choices.slice(0, 4), difficulty: q.difficulty || 1 })));
      setTimeLeft(timeLimit * 60);
      setCurrentQ(0);
      setAnswers({});
      setExamFinished(false);
      setStage("exam");
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally { setExamLoading(false); }
  };

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
            <p className="text-muted-foreground mb-6">
              {userDivision === "scientific" ? "🔬 القسم العلمي" : "📚 القسم الأدبي"} — اختر المادة واختبر نفسك
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {subjects.map((s) => (
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
              إعدادات الاختبار — {[...SCIENTIFIC_SUBJECTS, ...LITERARY_SUBJECTS].find(s => s.id === selectedSubject)?.label}
            </h2>
            <div className="space-y-5">
              {/* Description */}
              <div>
                <label className="text-sm text-muted-foreground block mb-2">وصف الاختبار (اختياري)</label>
                <textarea
                  placeholder="مثال: أريد أسئلة عن باب الطهارة والصلاة فقط..."
                  value={examDescription}
                  onChange={e => setExamDescription(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl bg-secondary/50 border border-border/30 px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 resize-none"
                />
              </div>

              {/* Question count */}
              <div>
                <label className="text-sm text-muted-foreground block mb-2">عدد الأسئلة</label>
                <div className="flex gap-2 mb-2">
                  {[5, 10, 20, 50].map(n => (
                    <button key={n} onClick={() => { setQuestionCount(n); setCustomCount(""); }}
                      className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition-colors ${questionCount === n && !customCount ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-secondary/80"}`}>{n}</button>
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
                    className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition-colors ${difficulty === 0 ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}>الكل</button>
                  {DIFFICULTIES.map(d => (
                    <button key={d.id} onClick={() => setDifficulty(d.id)}
                      className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition-colors flex items-center justify-center gap-1 ${difficulty === d.id ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}>
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
                      className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition-colors ${timeLimit === t ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-secondary/80"}`}>{t}</button>
                  ))}
                </div>
              </div>

              {/* AI Model */}
              <div>
                <label className="text-sm text-muted-foreground block mb-2">نموذج الذكاء الاصطناعي</label>
                <div className="flex flex-wrap gap-2">
                  {AI_MODELS.map(m => (
                    <button key={m.id} onClick={() => setSelectedModel(m.id)}
                      className={`rounded-xl px-3 py-2 text-xs font-bold transition-all border ${selectedModel === m.id ? "bg-primary/15 text-primary border-primary/40" : "bg-secondary text-foreground border-border/30 hover:border-primary/30"}`}>
                      {m.label}
                    </button>
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
                <span className={`text-xs px-2 py-0.5 rounded-full ${questions[currentQ].difficulty === 1 ? "bg-primary/15 text-primary" : questions[currentQ].difficulty === 2 ? "bg-accent/15 text-accent" : "bg-destructive/15 text-destructive"}`}>
                  {DIFFICULTIES.find(d => d.id === questions[currentQ].difficulty)?.label || "—"}
                </span>
              </div>
              <h3 className="text-lg font-bold text-foreground mb-6 leading-relaxed">{questions[currentQ].q_text}</h3>
              <div className="space-y-3">
                {questions[currentQ].choices.map((choice, ci) => (
                  <button key={ci} onClick={() => setAnswers(prev => ({ ...prev, [currentQ]: choice }))}
                    className={`w-full text-right rounded-xl px-5 py-4 text-sm transition-all border ${answers[currentQ] === choice ? "border-primary bg-primary/10 text-primary font-bold shadow-glow" : "border-border/30 bg-secondary/40 text-foreground hover:border-primary/40"}`}>
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
                  className={`h-8 w-8 rounded-full text-xs font-bold transition-colors ${i === currentQ ? "bg-primary text-primary-foreground shadow-glow" : answers[i] ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"}`}>{i + 1}</button>
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
            <p className="text-xs text-muted-foreground mt-1">النموذج: {AI_MODELS.find(m => m.id === selectedModel)?.label}</p>

            <div className="text-right space-y-4 mt-8">
              {questions.map((q, i) => {
                const isCorrect = answers[i] === q.answer;
                return (
                  <div key={i} className={`rounded-xl p-4 border ${isCorrect ? "border-primary/30 bg-primary/5" : "border-destructive/30 bg-destructive/5"}`}>
                    <div className="flex items-start gap-2 mb-2">
                      {isCorrect ? <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" /> : <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />}
                      <p className="text-sm text-foreground font-medium">{q.q_text}</p>
                    </div>
                    {!isCorrect && (
                      <div className="mr-7 space-y-1">
                        {answers[i] && <p className="text-xs text-destructive">إجابتك: {answers[i]}</p>}
                        <p className="text-xs text-primary">الإجابة الصحيحة: {q.answer}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3 mt-8">
              <Button onClick={() => { setStage("config"); setExamFinished(false); }} className="flex-1 bg-primary text-primary-foreground">
                <RotateCcw className="ml-2 h-4 w-4" /> اختبار جديد
              </Button>
              <Button variant="outline" onClick={() => setStage("select")} className="flex-1 border-border/30">
                اختر مادة أخرى
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Exams;
