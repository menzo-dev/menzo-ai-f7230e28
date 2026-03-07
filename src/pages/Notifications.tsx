import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Bell, CheckCheck, Trash2, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface Notification {
  id: string;
  title: string;
  message: string;
  image_url: string | null;
  is_read: boolean;
  created_at: string;
}

const Notifications = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
    const channel = supabase
      .channel("notifications")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => loadNotifications())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const loadNotifications = async () => {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (data) setNotifications(data as Notification[]);
    setLoading(false);
  };

  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.is_read);
    if (unread.length === 0) return;
    for (const n of unread) {
      await supabase.from("notifications").update({ is_read: true }).eq("id", n.id);
    }
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const deleteAllNotifications = async () => {
    if (!confirm("هل تريد حذف جميع الإشعارات؟")) return;
    // Delete user's notifications (where user_id matches or is null for broadcasts)
    if (user) {
      await supabase.from("notifications").delete().eq("user_id", user.id);
    }
    setNotifications([]);
    toast({ title: "تم", description: "تم حذف جميع الإشعارات" });
  };

  const handleNotificationClick = (n: Notification) => {
    if (!n.is_read) markAsRead(n.id);
    // Navigate based on content
    if (n.title.includes("صداقة")) navigate("/messages");
    else if (n.title.includes("حظر") || n.title.includes("منتدى")) navigate("/contact");
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="min-h-screen bg-gradient-hero px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <button onClick={() => navigate("/chat")} className="mb-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> العودة
        </button>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold"><span className="text-gradient-cosmic">الإشعارات</span></h1>
            {unreadCount > 0 && <p className="text-sm text-muted-foreground mt-1">{unreadCount} إشعار غير مقروء</p>}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                <CheckCheck className="h-4 w-4" /> تعليم الكل كمقروء
              </button>
            )}
            {notifications.length > 0 && (
              <Button variant="ghost" size="sm" onClick={deleteAllNotifications}
                className="text-destructive hover:text-destructive/80 text-xs">
                <Trash2 className="h-3.5 w-3.5 ml-1" /> حذف الكل
              </Button>
            )}
          </div>
        </div>

        {/* Contact Admin button */}
        <Button variant="outline" onClick={() => navigate("/contact")}
          className="w-full mb-4 border-primary/30 text-primary hover:bg-primary/5">
          <Mail className="ml-2 h-4 w-4" /> تواصل مع الإدارة
        </Button>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>لا توجد إشعارات</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map(n => (
              <div
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={`glass rounded-xl p-4 cursor-pointer transition-all hover:border-primary/30 ${!n.is_read ? "border-primary/40 bg-primary/5" : "opacity-70"}`}
              >
                <div className="flex items-start gap-3">
                  {n.image_url ? (
                    <img src={n.image_url} alt="" className="h-10 w-10 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                      <Bell className="h-5 w-5 text-primary" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-foreground">{n.title}</h3>
                      {!n.is_read && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{n.message}</p>
                    <span className="text-[10px] text-muted-foreground/60 mt-2 block">
                      {new Date(n.created_at).toLocaleString("ar")}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
