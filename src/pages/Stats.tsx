import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Trophy, BookOpen, Clock, TrendingUp, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ExamResult {
  id: string;
  subject: string;
  score: number;
  total: number;
  percentage: number;
  difficulty: number;
  created_at: string;
  title: string | null;
}

const Stats = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [results, setResults] = useState<ExamResult[]>([]);
  const [loading, setLoading] = useState(true);

  const examDate = new Date("2026-06-06T00:00:00");
  const now = new Date();
  const daysLeft = Math.max(0, Math.ceil((examDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  useEffect(() => {
    if (user) loadResults();
  }, [user]);

  const loadResults = async () => {
    const { data } = await supabase
      .from("exam_results")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(100);
    if (data) setResults(data as ExamResult[]);
    setLoading(false);
  };

  const totalExams = results.length;
  const avgScore = totalExams > 0 ? Math.round(results.reduce((s, r) => s + r.percentage, 0) / totalExams) : 0;
  const bestScore = totalExams > 0 ? Math.max(...results.map(r => r.percentage)) : 0;
  const totalQuestions = results.reduce((s, r) => s + r.total, 0);

  const subjectStats = results.reduce((acc, r) => {
    if (!acc[r.subject]) acc[r.subject] = { total: 0, correct: 0, count: 0 };
    acc[r.subject].total += r.total;
    acc[r.subject].correct += r.score;
    acc[r.subject].count++;
    return acc;
  }, {} as Record<string, { total: number; correct: number; count: number }>);

  const getGrade = (pct: number) => {
    if (pct >= 90) return { label: "ممتاز", color: "text-primary", emoji: "🏆" };
    if (pct >= 75) return { label: "جيد جداً", color: "text-accent", emoji: "⭐" };
    if (pct >= 60) return { label: "جيد", color: "text-foreground", emoji: "👍" };
    if (pct >= 50) return { label: "مقبول", color: "text-muted-foreground", emoji: "📖" };
    return { label: "يحتاج تحسين", color: "text-destructive", emoji: "💪" };
  };

  const overallGrade = getGrade(avgScore);

  return (
    <div className="min-h-screen bg-gradient-hero px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <button onClick={() => navigate("/chat")} className="mb-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> العودة
        </button>

        <h1 className="text-3xl font-bold mb-2"><span className="text-gradient-cosmic">📊 إحصائياتي</span></h1>
        <p className="text-muted-foreground mb-6 text-sm">تابع مستواك وتقدمك الدراسي</p>

        {/* Exam Countdown */}
        <div className="glass rounded-2xl p-6 mb-6 text-center">
          <Calendar className="h-8 w-8 text-primary mx-auto mb-2" />
          <h3 className="text-sm text-muted-foreground">باقي على امتحانات الأزهر</h3>
          <div className="text-5xl font-bold text-primary mt-2">{daysLeft}</div>
          <p className="text-xs text-muted-foreground mt-1">يوم — 6/6/2026</p>
          {daysLeft <= 30 && <p className="text-xs text-destructive mt-2 font-bold">⚠️ اقترب موعد الامتحانات! ذاكر بجد</p>}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: "إجمالي الاختبارات", value: totalExams, icon: BookOpen, color: "text-primary" },
            { label: "متوسط الدرجات", value: `${avgScore}%`, icon: TrendingUp, color: "text-accent" },
            { label: "أعلى درجة", value: `${bestScore}%`, icon: Trophy, color: "text-primary" },
            { label: "إجمالي الأسئلة", value: totalQuestions, icon: Clock, color: "text-accent" },
          ].map(s => (
            <div key={s.label} className="glass rounded-2xl p-4 text-center">
              <s.icon className={`h-6 w-6 mx-auto mb-2 ${s.color}`} />
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Overall Grade */}
        {totalExams > 0 && (
          <div className="glass rounded-2xl p-6 mb-6 text-center">
            <div className="text-4xl mb-2">{overallGrade.emoji}</div>
            <h3 className={`text-xl font-bold ${overallGrade.color}`}>{overallGrade.label}</h3>
            <p className="text-sm text-muted-foreground">المستوى العام — {(profile as any)?.division === "literary" ? "أدبي" : "علمي"}</p>
          </div>
        )}

        {/* Subject Breakdown */}
        {Object.keys(subjectStats).length > 0 && (
          <div className="glass rounded-2xl p-6 mb-6">
            <h3 className="text-lg font-bold text-foreground mb-4">أداؤك حسب المادة</h3>
            <div className="space-y-3">
              {Object.entries(subjectStats).map(([subject, stats]) => {
                const pct = Math.round((stats.correct / stats.total) * 100);
                const grade = getGrade(pct);
                return (
                  <div key={subject} className="flex items-center gap-3">
                    <span className="text-sm font-medium text-foreground w-32 truncate">{subject}</span>
                    <div className="flex-1 h-3 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className={`text-sm font-bold w-12 text-left ${grade.color}`}>{pct}%</span>
                    <span className="text-xs text-muted-foreground w-16">{stats.count} اختبار</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent Results */}
        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-bold text-foreground mb-4">آخر النتائج</h3>
          {loading ? (
            <div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
          ) : results.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">لا توجد نتائج بعد. اذهب للاختبارات وابدأ!</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-hide">
              {results.map(r => {
                const grade = getGrade(r.percentage);
                return (
                  <div key={r.id} className="flex items-center gap-3 rounded-xl px-4 py-3 bg-secondary/30 border border-border/20">
                    <span className="text-lg">{grade.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground">{r.title || r.subject}</div>
                      <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("ar")} — {r.score}/{r.total}</div>
                    </div>
                    <span className={`text-sm font-bold ${grade.color}`}>{r.percentage}%</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Stats;