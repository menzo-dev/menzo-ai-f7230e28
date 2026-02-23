import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, MessageSquare, BookOpen, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Admin = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [stats, setStats] = useState({ users: 0, conversations: 0, lessons: 0 });

  useEffect(() => {
    checkAdmin();
  }, [user]);

  const checkAdmin = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    
    if (data) {
      setIsAdmin(true);
      loadAdminData();
    } else {
      setIsAdmin(false);
      toast({ title: "غير مصرح", description: "ليس لديك صلاحيات الإدارة", variant: "destructive" });
    }
    setLoading(false);
  };

  const loadAdminData = async () => {
    const [profilesRes, convsRes, lessonsRes] = await Promise.all([
      supabase.from("profiles").select("*"),
      supabase.from("conversations").select("id, user_id, title, last_active, messages"),
      supabase.from("lessons").select("id"),
    ]);

    setUsers(profilesRes.data || []);
    setConversations(convsRes.data || []);
    setStats({
      users: profilesRes.data?.length || 0,
      conversations: convsRes.data?.length || 0,
      lessons: lessonsRes.data?.length || 0,
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-hero px-4">
        <Shield className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold text-foreground mb-2">غير مصرح</h1>
        <p className="text-muted-foreground mb-4">ليس لديك صلاحيات الوصول لهذه الصفحة</p>
        <Button onClick={() => navigate("/chat")} className="bg-primary text-primary-foreground">
          العودة للمحادثة
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <button onClick={() => navigate("/chat")} className="mb-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          العودة للمحادثة
        </button>

        <h1 className="text-3xl font-bold text-foreground mb-8">لوحة الإدارة</h1>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[
            { icon: Users, label: "المستخدمين", value: stats.users, color: "text-primary" },
            { icon: MessageSquare, label: "المحادثات", value: stats.conversations, color: "text-accent" },
            { icon: BookOpen, label: "الدروس", value: stats.lessons, color: "text-primary" },
          ].map((s) => (
            <div key={s.label} className="glass rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <s.icon className={`h-6 w-6 ${s.color}`} />
                <span className="text-muted-foreground">{s.label}</span>
              </div>
              <span className="text-3xl font-bold text-foreground">{s.value}</span>
            </div>
          ))}
        </div>

        {/* Users table */}
        <div className="glass rounded-2xl p-6 mb-8">
          <h2 className="text-xl font-bold text-foreground mb-4">المستخدمين</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-right py-3 px-4">الاسم</th>
                  <th className="text-right py-3 px-4">تاريخ التسجيل</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-border/50 hover:bg-secondary/50 transition-colors">
                    <td className="py-3 px-4 text-foreground">{u.display_name || "—"}</td>
                    <td className="py-3 px-4 text-muted-foreground">{new Date(u.created_at).toLocaleDateString("ar")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent conversations */}
        <div className="glass rounded-2xl p-6">
          <h2 className="text-xl font-bold text-foreground mb-4">المحادثات الأخيرة</h2>
          <div className="space-y-2">
            {conversations.slice(0, 20).map((conv) => (
              <div key={conv.id} className="flex items-center justify-between rounded-lg px-4 py-3 hover:bg-secondary/50 transition-colors">
                <div>
                  <span className="text-foreground text-sm">{conv.title}</span>
                  <span className="text-xs text-muted-foreground block">
                    {new Date(conv.last_active).toLocaleDateString("ar")}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {Array.isArray(conv.messages) ? conv.messages.length : 0} رسالة
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;
