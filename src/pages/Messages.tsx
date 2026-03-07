import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Send, Search, UserPlus, X, Image, Mic, MicOff,
  Paperclip, ChevronDown, MoreVertical, Phone, Video, Square,
  Trash2, Ban, Flag, Check, CheckCheck
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Friend {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  gender: string | null;
  division: string | null;
  unreadCount?: number;
}

interface PrivateMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  image_url: string | null;
  audio_url: string | null;
  video_url: string | null;
  file_url: string | null;
  file_name: string | null;
  is_read: boolean;
  created_at: string;
}

const Messages = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [messages, setMessages] = useState<PrivateMessage[]>([]);
  const [input, setInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Friend[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockedByName, setBlockedByName] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const userGender = (profile as any)?.gender || "male";

  useEffect(() => {
    if (user) loadFriends();
  }, [user]);

  useEffect(() => {
    if (selectedFriend && user) {
      loadMessages(selectedFriend.id);
      markAsRead(selectedFriend.id);
      checkBlocked(selectedFriend.id);

      const channel = supabase
        .channel(`pm-${user.id}-${selectedFriend.id}`)
        .on("postgres_changes", {
          event: "INSERT",
          schema: "public",
          table: "private_messages",
        }, (payload: any) => {
          const msg = payload.new;
          if (
            (msg.sender_id === selectedFriend.id && msg.receiver_id === user.id) ||
            (msg.sender_id === user.id && msg.receiver_id === selectedFriend.id)
          ) {
            setMessages(prev => [...prev, msg]);
            if (msg.sender_id === selectedFriend.id) {
              supabase.from("private_messages").update({ is_read: true }).eq("id", msg.id);
            }
          }
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [selectedFriend, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 200);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadFriends = async () => {
    if (!user) return;
    // Get accepted friend requests
    const { data: requests } = await supabase
      .from("friend_requests")
      .select("sender_id, receiver_id")
      .eq("status", "accepted")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

    if (!requests || requests.length === 0) { setFriends([]); return; }

    const friendIds = requests.map(r =>
      r.sender_id === user.id ? r.receiver_id : r.sender_id
    );

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url, phone, gender, division")
      .in("id", friendIds);

    if (!profiles) { setFriends([]); return; }

    // Get unread counts
    const { data: unreadData } = await supabase
      .from("private_messages")
      .select("sender_id")
      .eq("receiver_id", user.id)
      .eq("is_read", false);

    const unreadMap = new Map<string, number>();
    (unreadData || []).forEach(m => {
      unreadMap.set(m.sender_id, (unreadMap.get(m.sender_id) || 0) + 1);
    });

    setFriends(profiles.map(p => ({
      ...p,
      unreadCount: unreadMap.get(p.id) || 0,
    })));
  };

  const loadMessages = async (friendId: string) => {
    if (!user) return;
    const { data } = await supabase
      .from("private_messages")
      .select("*")
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${user.id})`)
      .order("created_at", { ascending: true })
      .limit(200);
    setMessages((data || []) as PrivateMessage[]);
  };

  const markAsRead = async (friendId: string) => {
    if (!user) return;
    await supabase
      .from("private_messages")
      .update({ is_read: true })
      .eq("sender_id", friendId)
      .eq("receiver_id", user.id)
      .eq("is_read", false);
  };

  const checkBlocked = async (friendId: string) => {
    if (!user) return;
    const { data } = await supabase
      .from("user_blocks")
      .select("blocker_id")
      .or(`and(blocker_id.eq.${friendId},blocked_id.eq.${user.id}),and(blocker_id.eq.${user.id},blocked_id.eq.${friendId})`)
      .limit(1);
    if (data && data.length > 0) {
      setIsBlocked(true);
      if (data[0].blocker_id === friendId) {
        setBlockedByName(selectedFriend?.display_name || "المستخدم");
      }
    } else {
      setIsBlocked(false);
      setBlockedByName("");
    }
  };

  const sendMessage = async () => {
    if ((!input.trim() && !imageFile) || !user || !selectedFriend || isBlocked) return;
    setLoading(true);
    try {
      let imageUrl: string | null = null;
      if (imageFile) {
        const ext = imageFile.name.split(".").pop();
        const path = `pm/${user.id}/${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from("avatars").upload(path, imageFile);
        if (!error) {
          const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
          imageUrl = publicUrl;
        }
      }

      await supabase.from("private_messages").insert({
        sender_id: user.id,
        receiver_id: selectedFriend.id,
        content: input.trim() || (imageUrl ? "📷 صورة" : ""),
        image_url: imageUrl,
      });
      setInput("");
      setImageFile(null);
      setImagePreview(null);
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  const searchUsers = async (term: string) => {
    setSearchTerm(term);
    if (term.length < 2) { setSearchResults([]); return; }
    const { data } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url, phone, gender, division")
      .eq("gender", userGender)
      .or(`display_name.ilike.%${term}%,phone.ilike.%${term}%`)
      .neq("id", user!.id)
      .limit(20);
    setSearchResults((data || []) as Friend[]);
  };

  const sendFriendRequest = async (receiverId: string) => {
    if (!user) return;
    const { error } = await supabase.from("friend_requests").insert({
      sender_id: user.id,
      receiver_id: receiverId,
    });
    if (error) {
      if (error.message.includes("duplicate")) {
        toast({ title: "تم بالفعل", description: "تم إرسال طلب صداقة مسبقاً" });
      } else {
        toast({ title: "خطأ", description: error.message, variant: "destructive" });
      }
    } else {
      toast({ title: "تم", description: "تم إرسال طلب الصداقة بنجاح" });
      // Send notification
      await supabase.from("notifications").insert({
        user_id: receiverId,
        title: "طلب صداقة جديد",
        message: `${profile?.display_name || "مستخدم"} أرسل لك طلب صداقة`,
      });
    }
  };

  const blockUser = async (blockedId: string) => {
    if (!user) return;
    await supabase.from("user_blocks").insert({ blocker_id: user.id, blocked_id: blockedId });
    // Notify blocked user
    await supabase.from("notifications").insert({
      user_id: blockedId,
      title: "تم حظرك",
      message: `قام ${profile?.display_name || "مستخدم"} بحظرك من المراسلة`,
    });
    toast({ title: "تم", description: "تم حظر المستخدم" });
    setIsBlocked(true);
  };

  const reportUser = async (reportedId: string) => {
    if (!user) return;
    const reason = prompt("أدخل سبب الإبلاغ:");
    if (!reason) return;
    await supabase.from("user_reports").insert({
      reporter_id: user.id,
      reported_id: reportedId,
      reason,
    });
    toast({ title: "تم", description: "تم إرسال البلاغ للإدارة" });
  };

  const renderLink = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, i) => {
      if (urlRegex.test(part)) {
        return (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer"
            className="text-primary underline hover:text-primary/80 break-all">
            🔗 {part.length > 50 ? part.slice(0, 50) + "..." : part}
          </a>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  // Friend list view
  if (!selectedFriend) {
    return (
      <div className="flex flex-col h-screen bg-gradient-hero">
        {/* Header */}
        <div className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 glass-strong border-b border-border/40">
          <button onClick={() => navigate("/chat")} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold text-foreground flex-1">
            <span className="text-gradient-cosmic">المحادثات الخاصة</span>
          </h1>
          <Button variant="ghost" size="icon" onClick={() => setShowSearch(!showSearch)}>
            {showSearch ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
          </Button>
        </div>

        {/* Search */}
        {showSearch && (
          <div className="px-4 py-3 border-b border-border/40 glass-strong">
            <Input
              value={searchTerm}
              onChange={e => searchUsers(e.target.value)}
              placeholder="ابحث بالاسم أو رقم الهاتف..."
              className="bg-secondary/50 border-border/30"
            />
            {searchResults.length > 0 && (
              <div className="mt-2 space-y-1 max-h-60 overflow-y-auto">
                {searchResults.map(u => (
                  <div key={u.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-secondary/50">
                    {u.avatar_url ? (
                      <img src={u.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover border border-primary/30" />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-bold">
                        {(u.display_name || "؟")[0]}
                      </div>
                    )}
                    <div className="flex-1">
                      <span className="text-sm font-medium text-foreground">{u.display_name || "بدون اسم"}</span>
                      <span className="text-xs text-muted-foreground block">
                        {u.division === "literary" ? "أدبي" : "علمي"}
                      </span>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => sendFriendRequest(u.id)}
                      className="border-primary/30 text-primary text-xs">
                      <UserPlus className="h-3.5 w-3.5 ml-1" /> إضافة
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Friends List */}
        <div className="flex-1 overflow-y-auto">
          {friends.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <p className="text-lg mb-2">لا توجد محادثات بعد</p>
              <p className="text-sm mb-4">ابحث عن زملائك وأرسل لهم طلب صداقة!</p>
              <Button onClick={() => setShowSearch(true)} className="bg-primary text-primary-foreground">
                <Search className="ml-2 h-4 w-4" /> بحث عن مستخدمين
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border/20">
              {friends.map(f => (
                <button key={f.id} onClick={() => setSelectedFriend(f)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-secondary/30 transition-colors">
                  {f.avatar_url ? (
                    <img src={f.avatar_url} alt="" className="h-12 w-12 rounded-full object-cover border-2 border-primary/30" />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                      {(f.display_name || "؟")[0]}
                    </div>
                  )}
                  <div className="flex-1 text-right">
                    <span className="text-sm font-medium text-foreground block">{f.display_name || "بدون اسم"}</span>
                    <span className="text-xs text-muted-foreground">اضغط للمحادثة</span>
                  </div>
                  {(f.unreadCount || 0) > 0 && (
                    <span className="h-5 min-w-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                      {f.unreadCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Chat view
  return (
    <div className="flex flex-col h-screen bg-gradient-hero">
      {/* Chat Header - Sticky */}
      <div className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 glass-strong border-b border-border/40">
        <button onClick={() => { setSelectedFriend(null); loadFriends(); }} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        {selectedFriend.avatar_url ? (
          <img src={selectedFriend.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover border border-primary/30" />
        ) : (
          <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-bold">
            {(selectedFriend.display_name || "؟")[0]}
          </div>
        )}
        <div className="flex-1">
          <span className="text-sm font-bold text-foreground">{selectedFriend.display_name || "بدون اسم"}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => reportUser(selectedFriend.id)}>
            <Flag className="h-4 w-4 text-muted-foreground" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => blockUser(selectedFriend.id)}>
            <Ban className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>

      {/* Blocked Message */}
      {isBlocked ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
          <Ban className="h-16 w-16 text-destructive mb-4" />
          <h2 className="text-lg font-bold text-destructive mb-2">محظور</h2>
          <p className="text-muted-foreground text-sm mb-4">
            لقد قام <span className="font-bold text-foreground">{blockedByName || selectedFriend.display_name}</span> بحظرك
          </p>
          <Button onClick={() => navigate("/contact")} className="bg-primary text-primary-foreground">
            تواصل مع الإدارة
          </Button>
        </div>
      ) : (
        <>
          {/* Messages */}
          <div ref={chatContainerRef} onScroll={handleScroll}
            className="flex-1 overflow-y-auto px-4 py-4 space-y-2 scrollbar-hide relative">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground mt-20">
                <p>ابدأ المحادثة! 💬</p>
              </div>
            )}
            {messages.map((msg, i) => {
              const isOwn = msg.sender_id === user?.id;
              const showAvatar = i === 0 || messages[i - 1]?.sender_id !== msg.sender_id;
              return (
                <div key={msg.id} className={`flex gap-2 ${isOwn ? "flex-row-reverse" : ""}`}>
                  {showAvatar ? (
                    <div className="shrink-0">
                      {isOwn ? (
                        profile?.avatar_url ? (
                          <img src={profile.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover" />
                        ) : (
                          <div className="h-7 w-7 rounded-full bg-accent/20 flex items-center justify-center text-accent text-[10px] font-bold">
                            {(profile?.display_name || "أ")[0]}
                          </div>
                        )
                      ) : (
                        selectedFriend.avatar_url ? (
                          <img src={selectedFriend.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover" />
                        ) : (
                          <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[10px] font-bold">
                            {(selectedFriend.display_name || "؟")[0]}
                          </div>
                        )
                      )}
                    </div>
                  ) : (
                    <div className="w-7 shrink-0" />
                  )}
                  <div className={`max-w-[75%] rounded-2xl px-3 py-2 ${
                    isOwn
                      ? "bg-gradient-to-br from-primary/80 to-primary text-primary-foreground"
                      : "bg-secondary/60 text-foreground border border-border/30"
                  }`}>
                    {msg.image_url && (
                      <img src={msg.image_url} alt="" className="rounded-xl max-h-48 w-auto mb-1" />
                    )}
                    {msg.content && msg.content !== "📷 صورة" && (
                      <p className="text-sm whitespace-pre-wrap">{renderLink(msg.content)}</p>
                    )}
                    <div className="flex items-center justify-end gap-1 mt-0.5">
                      <span className="text-[9px] opacity-50">
                        {new Date(msg.created_at).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {isOwn && (
                        msg.is_read ? <CheckCheck className="h-3 w-3 text-primary" /> : <Check className="h-3 w-3 opacity-50" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Scroll to bottom */}
          {showScrollBtn && (
            <button onClick={scrollToBottom}
              className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 h-10 w-10 rounded-full bg-primary text-primary-foreground shadow-glow flex items-center justify-center">
              <ChevronDown className="h-5 w-5" />
            </button>
          )}

          {/* Image Preview */}
          {imagePreview && (
            <div className="px-4 py-2 border-t border-border/40 glass-strong">
              <div className="flex items-center gap-2">
                <img src={imagePreview} alt="" className="h-16 w-16 rounded-lg object-cover" />
                <button onClick={() => { setImageFile(null); setImagePreview(null); }} className="text-destructive">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Input - Sticky bottom */}
          <div className="sticky bottom-0 border-t border-border/40 p-3 glass-strong">
            <div className="flex items-end gap-2">
              <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-primary"
                onClick={() => fileInputRef.current?.click()}>
                <Paperclip className="h-5 w-5" />
              </Button>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setImageFile(file);
                  const reader = new FileReader();
                  reader.onload = ev => setImagePreview(ev.target?.result as string);
                  reader.readAsDataURL(file);
                }} />
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="اكتب رسالتك..."
                className="flex-1 resize-none bg-secondary/50 rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border/30 focus:border-primary/50 max-h-24"
                rows={1}
              />
              <Button onClick={sendMessage} disabled={loading || (!input.trim() && !imageFile)} size="icon"
                className="bg-primary text-primary-foreground shadow-glow shrink-0 rounded-xl">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Messages;
