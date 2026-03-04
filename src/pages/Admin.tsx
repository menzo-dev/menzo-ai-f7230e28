import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft, Users, MessageSquare, BookOpen, Shield, Ban, Trash2, Lock, ChevronRight, Search, UserCircle, X, BarChart3, History, Bell, Mail, Send, Settings, Eye, EyeOff, CheckCircle2, XCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UserProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  azhar_class: string | null;
  division: string | null;
  gender: string | null;
  phone: string | null;
  phone_parent: string | null;
  bio: string | null;
  is_banned: boolean;
  created_at: string | null;
}

interface ConvDetail {
  id: string;
  title: string | null;
  last_active: string | null;
  messages: any;
  model: string | null;
}

type Tab = "overview" | "users" | "conversations" | "notifications" | "contacts" | "forum";

const Admin = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [stats, setStats] = useState({ users: 0, conversations: 0, lessons: 0, questions: 0, forumPosts: 0 });
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userConversations, setUserConversations] = useState<ConvDetail[]>([]);
  const [viewingConv, setViewingConv] = useState<ConvDetail | null>(null);
  const [tab, setTab] = useState<Tab>("overview");

  // Notifications
  const [notifTitle, setNotifTitle] = useState("");
  const [notifMessage, setNotifMessage] = useState("");
  const [notifUserId, setNotifUserId] = useState<string>("all");

  // Contact messages
  const [contacts, setContacts] = useState<any[]>([]);
  const [contactReply, setContactReply] = useState<Record<string, string>>({});

  // Forum posts
  const [forumPosts, setForumPosts] = useState<any[]>([]);

  // User password change
  const [newPasswordForUser, setNewPasswordForUser] = useState("");

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
    const [profilesRes, convsRes, lessonsRes, questionsRes, forumRes, contactsRes] = await Promise.all([
      supabase.from("profiles").select("*"),
      supabase.from("conversations").select("id, user_id, title, last_active, messages, model").order("last_active", { ascending: false }),
      supabase.from("lessons").select("id"),
      supabase.from("questions").select("id"),
      supabase.from("forum_posts").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("contact_messages").select("*").order("created_at", { ascending: false }),
    ]);
    setUsers((profilesRes.data || []) as UserProfile[]);
    setConversations(convsRes.data || []);
    setForumPosts(forumRes.data || []);
    setContacts(contactsRes.data || []);
    setStats({
      users: profilesRes.data?.length || 0,
      conversations: convsRes.data?.length || 0,
      lessons: lessonsRes.data?.length || 0,
      questions: questionsRes.data?.length || 0,
      forumPosts: forumRes.data?.length || 0,
    });
  };

  const viewUserProfile = async (u: UserProfile) => {
    setSelectedUser(u);
    const { data } = await supabase.from("conversations").select("id, title, last_active, messages, model")
      .eq("user_id", u.id).order("last_active", { ascending: false });
    setUserConversations(data || []);
  };

  const banUser = async (userId: string, ban: boolean) => {
    await supabase.from("profiles").update({ is_banned: ban } as any).eq("id", userId);
    toast({ title: "تم", description: ban ? "تم حظر المستخدم" : "تم فك حظر المستخدم" });
    setSelectedUser(prev => prev ? { ...prev, is_banned: ban } : null);
    loadAdminData();
  };

  const deleteUserAccount = async (userId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الحساب؟ لا يمكن التراجع.")) return;
    await Promise.all([
      supabase.from("conversations").delete().eq("user_id", userId),
      supabase.from("forum_posts").delete().eq("user_id", userId),
      supabase.from("exam_results").delete().eq("user_id", userId),
      supabase.from("user_roles").delete().eq("user_id", userId),
      supabase.from("profiles").delete().eq("id", userId),
    ]);
    toast({ title: "تم", description: "تم حذف بيانات الحساب" });
    setSelectedUser(null);
    loadAdminData();
  };

  const sendNotification = async () => {
    if (!notifTitle.trim() || !notifMessage.trim()) return;
    await supabase.from("notifications").insert({
      title: notifTitle.trim(),
      message: notifMessage.trim(),
      user_id: notifUserId === "all" ? null : notifUserId,
    });
    toast({ title: "تم", description: "تم إرسال الإشعار" });
    setNotifTitle("");
    setNotifMessage("");
  };

  const sendContactReply = async (contactId: string) => {
    const reply = contactReply[contactId];
    if (!reply?.trim()) return;
    await supabase.from("contact_messages").update({ admin_reply: reply.trim(), is_read: true }).eq("id", contactId);
    toast({ title: "تم", description: "تم إرسال الرد" });
    setContactReply(prev => ({ ...prev, [contactId]: "" }));
    loadAdminData();
  };

  const deleteForumPost = async (postId: string) => {
    await supabase.from("forum_posts").delete().eq("id", postId);
    toast({ title: "تم", description: "تم حذف المنشور" });
    loadAdminData();
  };

  const filteredUsers = users.filter(u =>
    (u.display_name || "").toLowerCase().includes(searchTerm.toLowerCase()) || u.id.includes(searchTerm)
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

  // Viewing a conversation
  if (viewingConv) {
    const msgs = Array.isArray(viewingConv.messages) ? viewingConv.messages : [];
    return (
      <div className="min-h-screen bg-gradient-hero px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <button onClick={() => setViewingConv(null)} className="mb-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> العودة
          </button>
          <h2 className="text-xl font-bold text-foreground mb-4">{viewingConv.title || "بدون عنوان"}</h2>
          <p className="text-xs text-muted-foreground mb-6">النموذج: {viewingConv.model || "—"}</p>
          <div className="space-y-4">
            {msgs.map((msg: any, i: number) => (
              <div key={i} className={`rounded-xl p-4 ${msg.role === "user" ? "bg-primary/10 border border-primary/20" : "bg-secondary/50 border border-border/30"}`}>
                <div className="text-xs font-bold text-muted-foreground mb-1">{msg.role === "user" ? "👤 المستخدم" : "🤖 AI"}</div>
                <div className="text-sm text-foreground whitespace-pre-wrap">{msg.content?.slice(0, 1000)}{msg.content?.length > 1000 ? "..." : ""}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Viewing user profile
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
                {selectedUser.is_banned && <span className="text-xs text-destructive font-bold">🚫 محظور</span>}
              </div>
            </div>

            {/* User details */}
            <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
              <div className="bg-secondary/50 rounded-xl p-3"><span className="text-muted-foreground text-xs block">الشعبة</span><span className="text-foreground">{selectedUser.division === "literary" ? "أدبي" : "علمي"}</span></div>
              <div className="bg-secondary/50 rounded-xl p-3"><span className="text-muted-foreground text-xs block">النوع</span><span className="text-foreground">{selectedUser.gender === "female" ? "طالبة" : "طالب"}</span></div>
              <div className="bg-secondary/50 rounded-xl p-3"><span className="text-muted-foreground text-xs block">الهاتف</span><span className="text-foreground">{selectedUser.phone || "—"}</span></div>
              <div className="bg-secondary/50 rounded-xl p-3"><span className="text-muted-foreground text-xs block">ولي الأمر</span><span className="text-foreground">{selectedUser.phone_parent || "—"}</span></div>
              <div className="bg-secondary/50 rounded-xl p-3 col-span-2"><span className="text-muted-foreground text-xs block">المحادثات</span><span className="text-primary font-bold text-lg">{userConversations.length}</span> محادثة — <span className="text-accent font-bold">{userMsgCount}</span> رسالة</div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              <Button variant={selectedUser.is_banned ? "outline" : "destructive"} size="sm" onClick={() => banUser(selectedUser.id, !selectedUser.is_banned)}>
                <Ban className="ml-1 h-4 w-4" /> {selectedUser.is_banned ? "فك الحظر" : "حظر المستخدم"}
              </Button>
              <Button variant="destructive" size="sm" onClick={() => deleteUserAccount(selectedUser.id)}>
                <Trash2 className="ml-1 h-4 w-4" /> حذف الحساب
              </Button>
            </div>

            {/* Send notification to user */}
            <div className="mt-4 border-t border-border/30 pt-4">
              <h4 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2"><Bell className="h-4 w-4 text-accent" /> إرسال إشعار لهذا المستخدم</h4>
              <input value={notifTitle} onChange={e => setNotifTitle(e.target.value)} placeholder="عنوان الإشعار"
                className="w-full bg-secondary/50 rounded-xl px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border/30 focus:border-primary/50 mb-2" />
              <textarea value={notifMessage} onChange={e => setNotifMessage(e.target.value)} placeholder="نص الإشعار"
                className="w-full bg-secondary/50 rounded-xl px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border/30 focus:border-primary/50 resize-none mb-2" rows={2} />
              <Button size="sm" onClick={() => { setNotifUserId(selectedUser.id); sendNotification(); }} disabled={!notifTitle.trim() || !notifMessage.trim()}
                className="bg-accent text-accent-foreground"><Send className="ml-1 h-4 w-4" /> إرسال</Button>
            </div>
          </div>

          {/* User conversations */}
          <div className="glass rounded-2xl p-6">
            <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2"><History className="h-5 w-5 text-primary" /> سجل المحادثات</h3>
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

  const TABS: { id: Tab; label: string; icon: any }[] = [
    { id: "overview", label: "نظرة عامة", icon: BarChart3 },
    { id: "users", label: "المستخدمين", icon: Users },
    { id: "conversations", label: "المحادثات", icon: MessageSquare },
    { id: "notifications", label: "الإشعارات", icon: Bell },
    { id: "contacts", label: "رسائل التواصل", icon: Mail },
    { id: "forum", label: "المنتدى", icon: Users },
  ];

  return (
    <div className="min-h-screen bg-gradient-hero px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <button onClick={() => navigate("/chat")} className="mb-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> العودة للمحادثة
        </button>
        <h1 className="text-3xl font-bold mb-2"><span className="text-gradient-cosmic">لوحة الإدارة</span></h1>
        <p className="text-muted-foreground mb-8 text-sm">مرحباً بك في لوحة تحكم MENZO-AI</p>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide pb-2">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all whitespace-nowrap ${
                tab === t.id ? "bg-primary/15 text-primary border border-primary/30" : "text-muted-foreground hover:bg-secondary/50"
              }`}>
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
        </div>

        {/* Overview */}
        {tab === "overview" && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: "المستخدمين", value: stats.users, color: "text-primary" },
              { label: "المحادثات", value: stats.conversations, color: "text-accent" },
              { label: "الدروس", value: stats.lessons, color: "text-primary" },
              { label: "الأسئلة", value: stats.questions, color: "text-accent" },
              { label: "منشورات المنتدى", value: stats.forumPosts, color: "text-primary" },
            ].map((s) => (
              <div key={s.label} className="glass rounded-2xl p-6 text-center">
                <span className={`text-3xl font-bold ${s.color}`}>{s.value}</span>
                <span className="text-muted-foreground text-sm block mt-1">{s.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Users */}
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
                    <div className="text-sm font-medium text-foreground flex items-center gap-2">
                      {u.display_name || "بدون اسم"}
                      {u.is_banned && <span className="text-[10px] text-destructive bg-destructive/10 px-1.5 py-0.5 rounded">محظور</span>}
                    </div>
                    <div className="text-xs text-muted-foreground">{u.division === "literary" ? "أدبي" : "علمي"} | {u.gender === "female" ? "طالبة" : "طالب"} | {u.phone || "—"}</div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Conversations */}
        {tab === "conversations" && (
          <div className="glass rounded-2xl p-6">
            <h2 className="text-lg font-bold text-foreground mb-4">أحدث المحادثات</h2>
            <div className="space-y-2">
              {conversations.slice(0, 50).map(conv => {
                const convUser = users.find(u => u.id === conv.user_id);
                return (
                  <button key={conv.id} onClick={() => setViewingConv(conv)}
                    className="w-full flex items-center justify-between rounded-xl px-4 py-3 hover:bg-secondary/50 transition-colors text-right">
                    <div>
                      <span className="text-sm text-foreground block">{conv.title || "بدون عنوان"}</span>
                      <span className="text-xs text-muted-foreground">
                        {convUser?.display_name || "مستخدم"} | {conv.last_active ? new Date(conv.last_active).toLocaleDateString("ar") : "—"} | {Array.isArray(conv.messages) ? conv.messages.length : 0} رسالة
                      </span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Notifications */}
        {tab === "notifications" && (
          <div className="glass rounded-2xl p-6">
            <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2"><Bell className="h-5 w-5 text-accent" /> إرسال إشعار</h2>
            <div className="space-y-3 max-w-lg">
              <select value={notifUserId} onChange={e => setNotifUserId(e.target.value)}
                className="w-full bg-secondary/50 rounded-xl px-4 py-2.5 text-sm text-foreground outline-none border border-border/30 focus:border-primary/50">
                <option value="all">جميع المستخدمين</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.display_name || u.id.slice(0, 8)}</option>)}
              </select>
              <input value={notifTitle} onChange={e => setNotifTitle(e.target.value)} placeholder="عنوان الإشعار"
                className="w-full bg-secondary/50 rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border/30 focus:border-primary/50" />
              <textarea value={notifMessage} onChange={e => setNotifMessage(e.target.value)} placeholder="نص الإشعار..."
                className="w-full bg-secondary/50 rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border/30 focus:border-primary/50 resize-none" rows={3} />
              <Button onClick={sendNotification} disabled={!notifTitle.trim() || !notifMessage.trim()}
                className="bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-glow">
                <Send className="ml-2 h-4 w-4" /> إرسال الإشعار
              </Button>
            </div>
          </div>
        )}

        {/* Contacts */}
        {tab === "contacts" && (
          <div className="glass rounded-2xl p-6">
            <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2"><Mail className="h-5 w-5 text-primary" /> رسائل التواصل</h2>
            {contacts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">لا توجد رسائل</p>
            ) : (
              <div className="space-y-4">
                {contacts.map(c => (
                  <div key={c.id} className={`rounded-xl p-4 border ${c.is_read ? "border-border/30 bg-secondary/30" : "border-primary/30 bg-primary/5"}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-foreground">{c.name}</span>
                      <span className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString("ar")}</span>
                    </div>
                    <p className="text-xs text-primary mb-1">{c.email}</p>
                    <p className="text-sm text-foreground mb-2">{c.message}</p>
                    {c.admin_reply && (
                      <div className="bg-accent/10 rounded-lg p-2 mb-2">
                        <span className="text-xs text-accent font-bold">ردك: </span>
                        <span className="text-xs text-foreground">{c.admin_reply}</span>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <input value={contactReply[c.id] || ""} onChange={e => setContactReply(prev => ({ ...prev, [c.id]: e.target.value }))}
                        placeholder="اكتب ردك..." className="flex-1 bg-secondary/50 rounded-lg px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground outline-none border border-border/30" />
                      <Button size="sm" onClick={() => sendContactReply(c.id)} disabled={!contactReply[c.id]?.trim()}
                        className="bg-primary text-primary-foreground text-xs"><Send className="h-3 w-3" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Forum Management */}
        {tab === "forum" && (
          <div className="glass rounded-2xl p-6">
            <h2 className="text-lg font-bold text-foreground mb-4">إدارة منتدى الطلاب</h2>
            <div className="space-y-2">
              {forumPosts.map(post => {
                const postUser = users.find(u => u.id === post.user_id);
                return (
                  <div key={post.id} className="flex items-start gap-3 rounded-xl px-4 py-3 bg-secondary/30 border border-border/20">
                    <div className="flex-1">
                      <span className="text-xs font-bold text-primary">{postUser?.display_name || "مستخدم"}</span>
                      <p className="text-sm text-foreground mt-1">{post.content?.slice(0, 200)}</p>
                      {post.image_url && <span className="text-xs text-accent">📷 يحتوي صورة</span>}
                      <span className="text-[10px] text-muted-foreground block mt-1">{new Date(post.created_at).toLocaleString("ar")}</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => deleteForumPost(post.id)} className="text-destructive hover:text-destructive/80 shrink-0">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;
