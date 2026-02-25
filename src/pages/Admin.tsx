import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft, Users, MessageSquare, BookOpen, Shield, Eye, Ban,
  Trash2, Lock, ChevronRight, Search, UserCircle, X, BarChart3, History
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UserProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  azhar_class: string | null;
  created_at: string | null;
  email?: string;
}

interface ConvDetail {
  id: string;
  title: string | null;
  last_active: string | null;
  messages: any;
  model: string | null;
}

const Admin = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [stats, setStats] = useState({ users: 0, conversations: 0, lessons: 0, questions: 0 });
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userConversations, setUserConversations] = useState<ConvDetail[]>([]);
  const [viewingConv, setViewingConv] = useState<ConvDetail | null>(null);
  const [tab, setTab] = useState<"overview" | "users" | "conversations">("overview");

  useEffect(() => { checkAdmin(); }, [user]);

  const checkAdmin = async () => {
    if (!user) return;
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (data) { setIsAdmin(true); loadAdminData(); } else {
      setIsAdmin(false);
      toast({ title: "غير مصرح", description: "ليس لديك صلاحيات الإدارة", variant: "destructive" });
    }
    setLoading(false);
  };

  const loadAdminData = async () => {
    const [profilesRes, convsRes, lessonsRes, questionsRes] = await Promise.all([
      supabase.from("profiles").select("*"),
      supabase.from("conversations").select("id, user_id, title, last_active, messages, model"),
      supabase.from("lessons").select("id"),
      supabase.from("questions").select("id"),
    ]);
    setUsers(profilesRes.data || []);
    setConversations(convsRes.data || []);
    setStats({
      users: profilesRes.data?.length || 0,
      conversations: convsRes.data?.length || 0,
      lessons: lessonsRes.data?.length || 0,
      questions: questionsRes.data?.length || 0,
    });
  };

  const viewUserProfile = async (u: UserProfile) => {
    setSelectedUser(u);
    // Load user conversations
    const { data } = await supabase.from("conversations").select("id, title, last_active, messages, model")
      .eq("user_id", u.id).order("last_active", { ascending: false });
    setUserConversations(data || []);
  };

  const deleteUserAccount = async (userId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الحساب؟ لا يمكن التراجع.")) return;
    // Delete conversations and profile
    await supabase.from("conversations").delete().eq("user_id", userId);
    await supabase.from("user_roles").delete().eq("user_id", userId);
    await supabase.from("profiles").delete().eq("id", userId);
    toast({ title: "تم", description: "تم حذف بيانات الحساب" });
    setSelectedUser(null);
    loadAdminData();
  };

  const filteredUsers = users.filter(u =>
    (u.display_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.id.includes(searchTerm)
  );

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );

  if (!isAdmin) return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-hero px-4">
      <Shield className="h-16 w-16 text-destructive mb-4" />
      <h1 className="text-2xl font-bold text-foreground mb-2">غير مصرح</h1>
      <p className="text-muted-foreground mb-4">ليس لديك صلاحيات الوصول</p>
      <Button onClick={() => navigate("/chat")} className="bg-primary text-primary-foreground">العودة</Button>
    </div>
  );

  // Viewing a single conversation
  if (viewingConv) {
    const msgs = Array.isArray(viewingConv.messages) ? viewingConv.messages : [];
    return (
      <div className="min-h-screen bg-gradient-hero px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <button onClick={() => setViewingConv(null)} className="mb-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> العودة
          </button>
          <h2 className="text-xl font-bold text-foreground mb-4">{viewingConv.title || "بدون عنوان"}</h2>
          <p className="text-xs text-muted-foreground mb-6">النموذج: {viewingConv.model || "—"} | آخر نشاط: {viewingConv.last_active ? new Date(viewingConv.last_active).toLocaleString("ar") : "—"}</p>
          <div className="space-y-4">
            {msgs.map((msg: any, i: number) => (
              <div key={i} className={`rounded-xl p-4 ${msg.role === "user" ? "bg-primary/10 border border-primary/20" : "bg-secondary/50 border border-border/30"}`}>
                <div className="text-xs font-bold text-muted-foreground mb-1">{msg.role === "user" ? "👤 المستخدم" : "🤖 AI"}</div>
                <div className="text-sm text-foreground whitespace-pre-wrap">{msg.content?.slice(0, 500)}{msg.content?.length > 500 ? "..." : ""}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Viewing a user profile
  if (selectedUser) {
    const userMsgCount = userConversations.reduce((sum, c) => sum + (Array.isArray(c.messages) ? c.messages.length : 0), 0);
    return (
      <div className="min-h-screen bg-gradient-hero px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <button onClick={() => setSelectedUser(null)} className="mb-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> العودة لقائمة المستخدمين
          </button>
          
          <div className="glass rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-4 mb-4">
              {selectedUser.avatar_url ? (
                <img src={selectedUser.avatar_url} alt="" className="h-16 w-16 rounded-full object-cover border-2 border-primary" />
              ) : (
                <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center"><UserCircle className="h-8 w-8 text-primary" /></div>
              )}
              <div>
                <h2 className="text-xl font-bold text-foreground">{selectedUser.display_name || "بدون اسم"}</h2>
                <p className="text-sm text-muted-foreground">ID: {selectedUser.id.slice(0, 8)}...</p>
                <p className="text-xs text-muted-foreground">انضم: {selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleDateString("ar") : "—"}</p>
                <p className="text-xs text-muted-foreground">الصف: {selectedUser.azhar_class || "3rd-secondary"}</p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-secondary/50 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-primary">{userConversations.length}</div>
                <div className="text-xs text-muted-foreground">محادثة</div>
              </div>
              <div className="bg-secondary/50 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-accent">{userMsgCount}</div>
                <div className="text-xs text-muted-foreground">رسالة</div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              <Button variant="destructive" size="sm" onClick={() => deleteUserAccount(selectedUser.id)}>
                <Trash2 className="ml-1 h-4 w-4" /> حذف الحساب
              </Button>
            </div>
          </div>

          {/* User's conversations */}
          <div className="glass rounded-2xl p-6">
            <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <History className="h-5 w-5 text-primary" /> سجل المحادثات
            </h3>
            <div className="space-y-2">
              {userConversations.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">لا توجد محادثات</p>
              ) : userConversations.map(conv => (
                <button key={conv.id} onClick={() => setViewingConv(conv)}
                  className="w-full flex items-center justify-between rounded-xl px-4 py-3 hover:bg-secondary/50 transition-colors text-right">
                  <div>
                    <span className="text-sm text-foreground block">{conv.title || "بدون عنوان"}</span>
                    <span className="text-xs text-muted-foreground">{conv.last_active ? new Date(conv.last_active).toLocaleDateString("ar") : "—"} | {Array.isArray(conv.messages) ? conv.messages.length : 0} رسالة</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <button onClick={() => navigate("/chat")} className="mb-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> العودة للمحادثة
        </button>

        <h1 className="text-3xl font-bold mb-2">
          <span className="text-gradient-cosmic">لوحة الإدارة</span>
        </h1>
        <p className="text-muted-foreground mb-8 text-sm">مرحباً بك في لوحة تحكم MENZO-AI</p>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { id: "overview" as const, label: "نظرة عامة", icon: BarChart3 },
            { id: "users" as const, label: "المستخدمين", icon: Users },
            { id: "conversations" as const, label: "المحادثات", icon: MessageSquare },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                tab === t.id ? "bg-primary/15 text-primary border border-primary/30" : "text-muted-foreground hover:bg-secondary/50"
              }`}>
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
        </div>

        {/* Overview */}
        {tab === "overview" && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Users, label: "المستخدمين", value: stats.users, color: "text-primary", glow: "text-glow-cyan" },
              { icon: MessageSquare, label: "المحادثات", value: stats.conversations, color: "text-accent", glow: "text-glow-purple" },
              { icon: BookOpen, label: "الدروس", value: stats.lessons, color: "text-primary", glow: "text-glow-cyan" },
              { icon: BookOpen, label: "الأسئلة", value: stats.questions, color: "text-accent", glow: "text-glow-purple" },
            ].map((s) => (
              <div key={s.label} className="glass rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-2">
                  <s.icon className={`h-6 w-6 ${s.color}`} />
                  <span className="text-muted-foreground text-sm">{s.label}</span>
                </div>
                <span className={`text-3xl font-bold text-foreground ${s.glow}`}>{s.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Users tab */}
        {tab === "users" && (
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                  placeholder="بحث بالاسم..." className="pr-9 bg-secondary/50 border-border/30" />
              </div>
            </div>
            <div className="space-y-1">
              {filteredUsers.map(u => (
                <button key={u.id} onClick={() => viewUserProfile(u)}
                  className="w-full flex items-center gap-3 rounded-xl px-4 py-3 hover:bg-secondary/50 transition-colors text-right">
                  {u.avatar_url ? (
                    <img src={u.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover border border-primary/30" />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-bold">
                      {u.display_name?.[0] || "؟"}
                    </div>
                  )}
                  <div className="flex-1 text-right">
                    <div className="text-sm font-medium text-foreground">{u.display_name || "بدون اسم"}</div>
                    <div className="text-xs text-muted-foreground">{u.created_at ? new Date(u.created_at).toLocaleDateString("ar") : "—"}</div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Conversations tab */}
        {tab === "conversations" && (
          <div className="glass rounded-2xl p-6">
            <h2 className="text-lg font-bold text-foreground mb-4">أحدث المحادثات</h2>
            <div className="space-y-2">
              {conversations.slice(0, 30).map(conv => (
                <button key={conv.id} onClick={() => setViewingConv(conv)}
                  className="w-full flex items-center justify-between rounded-xl px-4 py-3 hover:bg-secondary/50 transition-colors text-right">
                  <div>
                    <span className="text-sm text-foreground block">{conv.title || "بدون عنوان"}</span>
                    <span className="text-xs text-muted-foreground">
                      {conv.last_active ? new Date(conv.last_active).toLocaleDateString("ar") : "—"} | {Array.isArray(conv.messages) ? conv.messages.length : 0} رسالة
                    </span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;
