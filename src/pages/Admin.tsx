import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft, Users, MessageSquare, BookOpen, Shield, Ban, Trash2, Lock, ChevronRight, Search, UserCircle, X, BarChart3, History, Bell, Mail, Send, Settings, Eye, EyeOff, CheckCircle2, XCircle, Download, Upload, Key, Edit3, AlertTriangle, Phone, Camera
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
  is_forum_banned?: boolean;
  created_at: string | null;
}

interface ConvDetail {
  id: string;
  title: string | null;
  last_active: string | null;
  messages: any;
  model: string | null;
}

type Tab = "overview" | "users" | "conversations" | "notifications" | "contacts" | "forum_male" | "forum_female" | "settings" | "reports";

const Admin = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [stats, setStats] = useState({ users: 0, conversations: 0, lessons: 0, questions: 0, forumPosts: 0, reports: 0 });
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
  const [forumPostsMale, setForumPostsMale] = useState<any[]>([]);
  const [forumPostsFemale, setForumPostsFemale] = useState<any[]>([]);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editPostContent, setEditPostContent] = useState("");

  // Reports
  const [reports, setReports] = useState<any[]>([]);

  // User edit fields
  const [editUserName, setEditUserName] = useState("");
  const [editUserPhone, setEditUserPhone] = useState("");
  const [editUserPhoneParent, setEditUserPhoneParent] = useState("");
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
    const [profilesRes, convsRes, lessonsRes, questionsRes, forumMaleRes, forumFemaleRes, contactsRes, reportsRes] = await Promise.all([
      supabase.from("profiles").select("*"),
      supabase.from("conversations").select("id, user_id, title, last_active, messages, model").order("last_active", { ascending: false }),
      supabase.from("lessons").select("id"),
      supabase.from("questions").select("id"),
      supabase.from("forum_posts").select("*").eq("forum_type", "male").order("created_at", { ascending: false }).limit(100),
      supabase.from("forum_posts").select("*").eq("forum_type", "female").order("created_at", { ascending: false }).limit(100),
      supabase.from("contact_messages").select("*").order("created_at", { ascending: false }),
      supabase.from("user_reports").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    setUsers((profilesRes.data || []) as UserProfile[]);
    setConversations(convsRes.data || []);
    setForumPostsMale(forumMaleRes.data || []);
    setForumPostsFemale(forumFemaleRes.data || []);
    setContacts(contactsRes.data || []);
    setReports(reportsRes.data || []);
    setStats({
      users: profilesRes.data?.length || 0,
      conversations: convsRes.data?.length || 0,
      lessons: lessonsRes.data?.length || 0,
      questions: questionsRes.data?.length || 0,
      forumPosts: (forumMaleRes.data?.length || 0) + (forumFemaleRes.data?.length || 0),
      reports: reportsRes.data?.length || 0,
    });
  };

  const viewUserProfile = async (u: UserProfile) => {
    setSelectedUser(u);
    setEditUserName(u.display_name || "");
    setEditUserPhone(u.phone || "");
    setEditUserPhoneParent(u.phone_parent || "");
    setNewPasswordForUser("");
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

  const banUserFromForum = async (userId: string, ban: boolean) => {
    await supabase.from("profiles").update({ is_forum_banned: ban } as any).eq("id", userId);
    toast({ title: "تم", description: ban ? "تم حظر المستخدم من المنتدى" : "تم فك حظر المستخدم من المنتدى" });
    setSelectedUser(prev => prev ? { ...prev, is_forum_banned: ban } : null);
    loadAdminData();
  };

  const updateUserProfile = async (userId: string) => {
    await supabase.from("profiles").update({
      display_name: editUserName || null,
      phone: editUserPhone || null,
      phone_parent: editUserPhoneParent || null,
    } as any).eq("id", userId);
    toast({ title: "تم", description: "تم تحديث بيانات المستخدم" });
    loadAdminData();
  };

  const deleteUserAccount = async (userId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الحساب؟ لا يمكن التراجع.")) return;
    await Promise.all([
      supabase.from("conversations").delete().eq("user_id", userId),
      supabase.from("forum_posts").delete().eq("user_id", userId),
      supabase.from("exam_results").delete().eq("user_id", userId),
      supabase.from("private_messages").delete().eq("sender_id", userId),
      supabase.from("private_messages").delete().eq("receiver_id", userId),
      supabase.from("friend_requests").delete().eq("sender_id", userId),
      supabase.from("friend_requests").delete().eq("receiver_id", userId),
      supabase.from("user_blocks").delete().eq("blocker_id", userId),
      supabase.from("user_blocks").delete().eq("blocked_id", userId),
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

  const editForumPost = async (postId: string) => {
    if (!editPostContent.trim()) return;
    await supabase.from("forum_posts").update({ content: editPostContent.trim() } as any).eq("id", postId);
    toast({ title: "تم", description: "تم تعديل المنشور" });
    setEditingPostId(null);
    setEditPostContent("");
    loadAdminData();
  };

  const filteredUsers = users.filter(u =>
    (u.display_name || "").toLowerCase().includes(searchTerm.toLowerCase()) || u.id.includes(searchTerm) || (u.phone || "").includes(searchTerm)
  );

  // Exam countdown
  const examDate = new Date("2026-06-06T00:00:00");
  const daysLeft = Math.ceil((examDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

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
                <div className="text-sm text-foreground whitespace-pre-wrap">{msg.content?.slice(0, 2000)}{msg.content?.length > 2000 ? "..." : ""}</div>
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
            <div className="flex items-center gap-4 mb-6">
              {selectedUser.avatar_url ? (
                <img src={selectedUser.avatar_url} alt="" className="h-20 w-20 rounded-full object-cover border-2 border-primary shadow-glow" />
              ) : (
                <div className="h-20 w-20 rounded-full bg-primary/20 flex items-center justify-center"><UserCircle className="h-10 w-10 text-primary" /></div>
              )}
              <div>
                <h2 className="text-xl font-bold text-foreground">{selectedUser.display_name || "بدون اسم"}</h2>
                <p className="text-xs text-muted-foreground">ID: {selectedUser.id.slice(0, 12)}...</p>
                <p className="text-xs text-muted-foreground">انضم: {selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleDateString("ar") : "—"}</p>
                <div className="flex gap-2 mt-1">
                  {selectedUser.is_banned && <span className="text-[10px] text-destructive bg-destructive/10 px-2 py-0.5 rounded-full font-bold">🚫 محظور</span>}
                  {selectedUser.is_forum_banned && <span className="text-[10px] text-accent bg-accent/10 px-2 py-0.5 rounded-full font-bold">🔇 محظور من المنتدى</span>}
                </div>
              </div>
            </div>

            {/* Editable user details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">الاسم</label>
                <Input value={editUserName} onChange={e => setEditUserName(e.target.value)}
                  className="bg-secondary/50 border-border/30 text-foreground text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">رقم الهاتف</label>
                <Input value={editUserPhone} onChange={e => setEditUserPhone(e.target.value)}
                  className="bg-secondary/50 border-border/30 text-foreground text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">رقم ولي الأمر</label>
                <Input value={editUserPhoneParent} onChange={e => setEditUserPhoneParent(e.target.value)}
                  className="bg-secondary/50 border-border/30 text-foreground text-sm" />
              </div>
              <div className="bg-secondary/50 rounded-xl p-3">
                <span className="text-muted-foreground text-xs block">معلومات</span>
                <span className="text-foreground text-sm">
                  {selectedUser.division === "literary" ? "📚 أدبي" : "🔬 علمي"} | {selectedUser.gender === "female" ? "👩 طالبة" : "👨 طالب"}
                </span>
              </div>
              <div className="bg-secondary/50 rounded-xl p-3 col-span-full">
                <span className="text-muted-foreground text-xs block">إحصائيات</span>
                <span className="text-primary font-bold text-lg">{userConversations.length}</span> محادثة — <span className="text-accent font-bold">{userMsgCount}</span> رسالة
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              <Button size="sm" onClick={() => updateUserProfile(selectedUser.id)} className="bg-primary text-primary-foreground">
                <Edit3 className="ml-1 h-3.5 w-3.5" /> حفظ التعديلات
              </Button>
              <Button variant={selectedUser.is_banned ? "outline" : "destructive"} size="sm" onClick={() => banUser(selectedUser.id, !selectedUser.is_banned)}>
                <Ban className="ml-1 h-4 w-4" /> {selectedUser.is_banned ? "فك الحظر" : "حظر المستخدم"}
              </Button>
              <Button variant={selectedUser.is_forum_banned ? "outline" : "secondary"} size="sm" onClick={() => banUserFromForum(selectedUser.id, !selectedUser.is_forum_banned)}>
                <Ban className="ml-1 h-4 w-4" /> {selectedUser.is_forum_banned ? "فك حظر المنتدى" : "حظر من المنتدى"}
              </Button>
              <Button variant="destructive" size="sm" onClick={() => deleteUserAccount(selectedUser.id)}>
                <Trash2 className="ml-1 h-4 w-4" /> حذف الحساب
              </Button>
            </div>

            {/* Send notification to user */}
            <div className="border-t border-border/30 pt-4">
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
    { id: "forum_male", label: "منتدى الطلاب", icon: Users },
    { id: "forum_female", label: "منتدى الطالبات", icon: Users },
    { id: "reports", label: "البلاغات", icon: AlertTriangle },
    { id: "settings", label: "الإعدادات", icon: Settings },
  ];

  const renderForumSection = (posts: any[], forumType: string) => (
    <div className="glass rounded-2xl p-6">
      <h2 className="text-lg font-bold text-foreground mb-4">
        {forumType === "male" ? "👨 منتدى الطلاب" : "👩 منتدى الطالبات"} ({posts.length} منشور)
      </h2>
      <div className="space-y-3 max-h-[60vh] overflow-y-auto scrollbar-hide">
        {posts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">لا توجد منشورات</p>
        ) : posts.map(post => {
          const postUser = users.find(u => u.id === post.user_id);
          return (
            <div key={post.id} className="rounded-xl p-4 bg-secondary/30 border border-border/20">
              <div className="flex items-start gap-3">
                {postUser?.avatar_url ? (
                  <img src={postUser.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover border border-primary/30 shrink-0" />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                    {postUser?.display_name?.[0] || "؟"}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-primary">{postUser?.display_name || "مستخدم"}</span>
                    <span className="text-[10px] text-muted-foreground">{new Date(post.created_at).toLocaleString("ar")}</span>
                  </div>
                  {editingPostId === post.id ? (
                    <div className="space-y-2">
                      <textarea value={editPostContent} onChange={e => setEditPostContent(e.target.value)}
                        className="w-full bg-secondary/50 rounded-lg px-3 py-2 text-sm text-foreground outline-none border border-border/30 resize-none" rows={2} />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => editForumPost(post.id)} className="bg-primary text-primary-foreground text-xs">حفظ</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingPostId(null)} className="text-xs">إلغاء</Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-foreground">{post.content?.slice(0, 300)}</p>
                  )}
                  {post.image_url && <span className="text-xs text-accent">📷 صورة</span>}
                  {post.audio_url && <span className="text-xs text-primary mr-2">🎤 صوت</span>}
                  {post.video_url && <span className="text-xs text-accent mr-2">🎥 فيديو</span>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => { setEditingPostId(post.id); setEditPostContent(post.content || ""); }}
                    className="text-muted-foreground hover:text-primary h-8 w-8">
                    <Edit3 className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteForumPost(post.id)}
                    className="text-destructive hover:text-destructive/80 h-8 w-8">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-hero px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <button onClick={() => navigate("/chat")} className="mb-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> العودة للمحادثة
        </button>
        
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold"><span className="text-gradient-cosmic">لوحة الإدارة</span></h1>
            <p className="text-muted-foreground text-sm mt-1">مرحباً بك في لوحة تحكم MENZO-AI</p>
          </div>
          <div className="glass rounded-xl px-4 py-2 text-center">
            <span className="text-xs text-muted-foreground block">باقي على الامتحانات</span>
            <span className="text-xl font-bold text-primary">{daysLeft > 0 ? daysLeft : 0}</span>
            <span className="text-xs text-muted-foreground"> يوم</span>
          </div>
        </div>

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
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { label: "المستخدمين", value: stats.users, color: "text-primary", icon: Users },
                { label: "المحادثات", value: stats.conversations, color: "text-accent", icon: MessageSquare },
                { label: "الدروس", value: stats.lessons, color: "text-primary", icon: BookOpen },
                { label: "الأسئلة", value: stats.questions, color: "text-accent", icon: CheckCircle2 },
                { label: "المنتدى", value: stats.forumPosts, color: "text-primary", icon: Users },
                { label: "البلاغات", value: stats.reports, color: "text-destructive", icon: AlertTriangle },
              ].map((s) => (
                <div key={s.label} className="glass rounded-2xl p-5 text-center">
                  <s.icon className={`h-6 w-6 mx-auto mb-2 ${s.color}`} />
                  <span className={`text-2xl font-bold ${s.color}`}>{s.value}</span>
                  <span className="text-muted-foreground text-xs block mt-1">{s.label}</span>
                </div>
              ))}
            </div>
            
            {/* Quick actions */}
            <div className="glass rounded-2xl p-6">
              <h3 className="text-sm font-bold text-foreground mb-4">إجراءات سريعة</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Button variant="outline" size="sm" onClick={() => setTab("users")} className="border-border/30">
                  <Users className="ml-2 h-4 w-4" /> إدارة المستخدمين
                </Button>
                <Button variant="outline" size="sm" onClick={() => setTab("notifications")} className="border-border/30">
                  <Bell className="ml-2 h-4 w-4" /> إرسال إشعار
                </Button>
                <Button variant="outline" size="sm" onClick={() => setTab("forum_male")} className="border-border/30">
                  <Users className="ml-2 h-4 w-4" /> منتدى الطلاب
                </Button>
                <Button variant="outline" size="sm" onClick={() => setTab("reports")} className="border-border/30">
                  <AlertTriangle className="ml-2 h-4 w-4" /> البلاغات
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Users */}
        {tab === "users" && (
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                  placeholder="بحث بالاسم أو الرقم..." className="pr-9 bg-secondary/50 border-border/30" />
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">{filteredUsers.length} مستخدم</span>
            </div>
            <div className="space-y-1 max-h-[60vh] overflow-y-auto scrollbar-hide">
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
                  <div className="flex-1 text-right min-w-0">
                    <div className="text-sm font-medium text-foreground flex items-center gap-2">
                      <span className="truncate">{u.display_name || "بدون اسم"}</span>
                      {u.is_banned && <span className="text-[10px] text-destructive bg-destructive/10 px-1.5 py-0.5 rounded shrink-0">محظور</span>}
                      {u.is_forum_banned && <span className="text-[10px] text-accent bg-accent/10 px-1.5 py-0.5 rounded shrink-0">🔇</span>}
                    </div>
                    <div className="text-xs text-muted-foreground">{u.division === "literary" ? "أدبي" : "علمي"} | {u.gender === "female" ? "طالبة" : "طالب"} | {u.phone || "—"}</div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Conversations */}
        {tab === "conversations" && (
          <div className="glass rounded-2xl p-6">
            <h2 className="text-lg font-bold text-foreground mb-4">أحدث المحادثات ({conversations.length})</h2>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto scrollbar-hide">
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
            <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2"><Mail className="h-5 w-5 text-primary" /> رسائل التواصل ({contacts.length})</h2>
            {contacts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">لا توجد رسائل</p>
            ) : (
              <div className="space-y-4 max-h-[60vh] overflow-y-auto scrollbar-hide">
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

        {/* Forum Male */}
        {tab === "forum_male" && renderForumSection(forumPostsMale, "male")}

        {/* Forum Female */}
        {tab === "forum_female" && renderForumSection(forumPostsFemale, "female")}

        {/* Reports */}
        {tab === "reports" && (
          <div className="glass rounded-2xl p-6">
            <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-destructive" /> البلاغات ({reports.length})</h2>
            {reports.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">لا توجد بلاغات</p>
            ) : (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto scrollbar-hide">
                {reports.map((r: any) => {
                  const reporter = users.find(u => u.id === r.reporter_id);
                  const reported = users.find(u => u.id === r.reported_id);
                  return (
                    <div key={r.id} className="rounded-xl p-4 bg-destructive/5 border border-destructive/20">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-foreground">
                          <span className="font-bold text-primary">{reporter?.display_name || "مستخدم"}</span> أبلغ عن <span className="font-bold text-destructive">{reported?.display_name || "مستخدم"}</span>
                        </span>
                        <span className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleString("ar")}</span>
                      </div>
                      {r.reason && <p className="text-sm text-muted-foreground">{r.reason}</p>}
                      {reported && (
                        <Button size="sm" variant="outline" className="mt-2 text-xs" onClick={() => viewUserProfile(reported)}>
                          عرض الملف الشخصي
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Settings */}
        {tab === "settings" && (
          <div className="space-y-6">
            <div className="glass rounded-2xl p-6">
              <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2"><Settings className="h-5 w-5 text-primary" /> إعدادات الموقع</h2>
              <p className="text-sm text-muted-foreground">
                يمكنك إدارة إعدادات الموقع ومفاتيح API من خلال Lovable Cloud مباشرة.
              </p>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-secondary/30 rounded-xl p-4 border border-border/20">
                  <h4 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2"><Key className="h-4 w-4 text-accent" /> مفاتيح API المُعدّة</h4>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>✅ Lovable AI Gateway</li>
                    <li>✅ OpenRouter</li>
                    <li>✅ DeepSeek</li>
                    <li>✅ xAI (Grok)</li>
                    <li>✅ Anthropic (Claude)</li>
                    <li>✅ HuggingFace</li>
                    <li>✅ Optiic (تحليل الصور)</li>
                    <li>✅ Tavily (بحث)</li>
                    <li>✅ Exa (بحث)</li>
                    <li>✅ Leonardo AI</li>
                  </ul>
                </div>
                <div className="bg-secondary/30 rounded-xl p-4 border border-border/20">
                  <h4 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2"><Shield className="h-4 w-4 text-primary" /> حالة النظام</h4>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>📊 قاعدة البيانات: متصلة</li>
                    <li>🔐 المصادقة: مفعّلة (تأكيد الإيميل مطلوب)</li>
                    <li>📦 التخزين: avatars bucket عام</li>
                    <li>⚡ Edge Functions: chat, generate-image, web-search</li>
                    <li>📅 الامتحانات: {daysLeft > 0 ? `باقي ${daysLeft} يوم` : "انتهت"}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;
