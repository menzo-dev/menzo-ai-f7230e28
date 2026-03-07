import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Send, Image, Trash2, Plus, X, Download, Mic, Square, Video, ChevronDown, Paperclip, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ForumPost {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  audio_url: string | null;
  video_url?: string | null;
  forum_type?: string;
  created_at: string;
  profile?: { display_name: string | null; avatar_url: string | null };
}

const MAX_VIDEO_SIZE = 50 * 1024 * 1024;

const Forum = () => {
  const { user, profile, role } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [message, setMessage] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPlus, setShowPlus] = useState(false);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [activeUsers, setActiveUsers] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isAdmin = role === "admin";
  const userGender = (profile as any)?.gender || "male";
  const isForumBanned = (profile as any)?.is_forum_banned === true;
  const forumTitle = userGender === "female" ? "منتدى الطالبات" : "منتدى الطلاب";

  useEffect(() => {
    loadPosts();
    // Track active users with presence
    const channel = supabase
      .channel("forum_posts")
      .on("postgres_changes", { event: "*", schema: "public", table: "forum_posts" }, () => loadPosts())
      .subscribe();

    // Presence for active users count
    const presenceChannel = supabase
      .channel(`forum-presence-${userGender}`)
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState();
        setActiveUsers(Object.keys(state).length);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await presenceChannel.track({ user_id: user?.id, online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(presenceChannel);
    };
  }, [userGender]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [posts]);

  const handleScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 200);
  };

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadPosts = async () => {
    const query = supabase
      .from("forum_posts")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(200);
    const { data } = await (query as any).eq("forum_type", userGender);
    if (!data) return;
    const userIds = [...new Set((data as any[]).map(p => p.user_id))] as string[];
    if (userIds.length === 0) { setPosts([]); return; }
    const { data: profiles } = await supabase.from("profiles").select("id, display_name, avatar_url").in("id", userIds);
    const profileMap = new Map((profiles || []).map(p => [p.id, p]));
    setPosts(data.map(p => ({ ...p, profile: profileMap.get(p.user_id) || undefined })));
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const totalFiles = imageFiles.length + files.length;
    if (totalFiles > 20) {
      toast({ title: "خطأ", description: "الحد الأقصى 20 صورة", variant: "destructive" });
      return;
    }
    setVideoFile(null); setVideoPreview(null);
    const newFiles = [...imageFiles, ...files];
    setImageFiles(newFiles);
    
    const newPreviews = [...imagePreviews];
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => {
        newPreviews.push(ev.target?.result as string);
        setImagePreviews([...newPreviews]);
      };
      reader.readAsDataURL(file);
    });
    setShowPlus(false);
  };

  const removeImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_VIDEO_SIZE) {
      toast({ title: "خطأ", description: "حجم الفيديو يجب ألا يتجاوز 50 ميجابايت", variant: "destructive" });
      return;
    }
    setVideoFile(file);
    setImageFiles([]); setImagePreviews([]);
    setVideoPreview(URL.createObjectURL(file));
    setShowPlus(false);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 44100 },
      });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        stream.getTracks().forEach(t => t.stop());
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
        setRecordingTime(0);
      };
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000);
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch {
      toast({ title: "خطأ", description: "لا يمكن الوصول إلى الميكروفون", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const cancelRecording = () => {
    mediaRecorderRef.current?.stream?.getTracks().forEach(t => t.stop());
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    setAudioBlob(null);
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setRecordingTime(0);
  };

  const formatRecTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

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

  const sendPost = async () => {
    if ((!message.trim() && imageFiles.length === 0 && !audioBlob && !videoFile) || !user) return;
    if (isForumBanned) {
      toast({ title: "محظور", description: "أنت محظور من إرسال رسائل في المنتدى", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      let imageUrl: string | null = null;
      let audioUrl: string | null = null;
      let videoUrl: string | null = null;

      // Upload multiple images - first one goes to image_url
      if (imageFiles.length > 0) {
        const uploadedUrls: string[] = [];
        for (const file of imageFiles) {
          const ext = file.name.split(".").pop();
          const path = `forum/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
          const { error } = await supabase.storage.from("avatars").upload(path, file);
          if (!error) {
            const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
            uploadedUrls.push(publicUrl);
          }
        }
        if (uploadedUrls.length > 0) imageUrl = uploadedUrls.join("|||");
      }

      if (videoFile) {
        const ext = videoFile.name.split(".").pop();
        const path = `forum/${user.id}/${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from("avatars").upload(path, videoFile);
        if (!error) {
          const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
          videoUrl = publicUrl;
        }
      }

      if (audioBlob) {
        const path = `forum/${user.id}/${Date.now()}.webm`;
        const { error } = await supabase.storage.from("avatars").upload(path, audioBlob);
        if (!error) {
          const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
          audioUrl = publicUrl;
        }
      }

      const content = message.trim() || (imageUrl ? "📷 صورة" : videoUrl ? "🎥 فيديو" : audioUrl ? "🎤 رسالة صوتية" : "");
      const { error } = await supabase.from("forum_posts").insert({
        user_id: user.id,
        content,
        image_url: imageUrl,
        audio_url: audioUrl,
        video_url: videoUrl,
        forum_type: userGender,
      } as any);
      if (error) throw error;
      setMessage("");
      setImageFiles([]);
      setImagePreviews([]);
      setVideoFile(null);
      setVideoPreview(null);
      setAudioBlob(null);
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  const deletePost = async (postId: string) => {
    const { error } = await supabase.from("forum_posts").delete().eq("id", postId);
    if (error) toast({ title: "خطأ", description: "لا يمكن حذف هذه الرسالة", variant: "destructive" });
  };

  const canDelete = (post: ForumPost) => {
    if (isAdmin) return true;
    if (post.user_id !== user?.id) return false;
    const created = new Date(post.created_at).getTime();
    return Date.now() - created < 5 * 60 * 60 * 1000;
  };

  // If forum banned, show blocked page
  if (isForumBanned && !isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-hero px-4 text-center">
        <div className="text-6xl mb-4">🔇</div>
        <h1 className="text-2xl font-bold text-destructive mb-2">محظور من المنتدى</h1>
        <p className="text-muted-foreground mb-4">تم حظرك من إرسال رسائل في المنتدى</p>
        <div className="flex gap-3">
          <Button onClick={() => navigate("/contact")} className="bg-primary text-primary-foreground">
            تواصل مع الإدارة
          </Button>
          <Button variant="outline" onClick={() => navigate("/chat")} className="border-border/30">
            العودة
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-hero">
      {/* Header - Sticky */}
      <div className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 glass-strong border-b border-border/40">
        <button onClick={() => navigate("/chat")} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold text-foreground flex-1">
          <span className="text-gradient-cosmic">{forumTitle}</span>
        </h1>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Users className="h-3.5 w-3.5 text-primary" />
          <span className="text-primary font-bold">{activeUsers}</span> نشط
        </div>
      </div>

      {/* Image Viewer */}
      {viewingImage && (
        <div className="fixed inset-0 z-50 bg-background/90 backdrop-blur-xl flex items-center justify-center p-4" onClick={() => setViewingImage(null)}>
          <div className="relative max-w-4xl max-h-[90vh]">
            <button onClick={() => setViewingImage(null)} className="absolute -top-10 left-0 text-foreground hover:text-primary"><X className="h-6 w-6" /></button>
            <img src={viewingImage} alt="" className="max-h-[85vh] w-auto rounded-xl" />
            <a href={viewingImage} download className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-2 text-sm text-primary hover:underline">
              <Download className="h-4 w-4" /> تحميل الصورة
            </a>
          </div>
        </div>
      )}

      {/* Messages */}
      <div ref={chatContainerRef} onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3 scrollbar-hide relative">
        {posts.length === 0 && (
          <div className="text-center text-muted-foreground mt-20">
            <p className="text-lg">لا توجد منشورات بعد</p>
            <p className="text-sm mt-2">كن أول من يشارك! 💬</p>
          </div>
        )}
        {posts.map((post, idx) => {
          const isOwn = post.user_id === user?.id;
          const senderName = post.profile?.display_name || "مستخدم";
          // WhatsApp-style: don't show avatar if same sender as previous
          const showAvatar = idx === 0 || posts[idx - 1]?.user_id !== post.user_id;
          const imageUrls = post.image_url ? post.image_url.split("|||") : [];

          return (
            <div key={post.id} className={`group flex gap-2 ${isOwn ? "flex-row-reverse" : ""}`}>
              {showAvatar ? (
                <div className="shrink-0">
                  {post.profile?.avatar_url ? (
                    <img src={post.profile.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover border-2 border-primary/40" />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                      {senderName[0]}
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-8 shrink-0" />
              )}
              <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                isOwn ? "bg-gradient-to-br from-primary/80 to-primary text-primary-foreground" : "bg-secondary/60 text-foreground border border-border/30"
              }`}>
                {showAvatar && (
                  <button onClick={() => navigate(`/profile/${post.user_id}`)}
                    className="text-xs font-bold mb-1 opacity-70 hover:opacity-100 transition-opacity">
                    {isAdmin && post.user_id === user?.id ? "👑 أدمن" : senderName}
                  </button>
                )}
                {post.content && post.content !== "📷 صورة" && post.content !== "🎤 رسالة صوتية" && post.content !== "🎥 فيديو" && (
                  <p className="text-sm whitespace-pre-wrap">{renderLink(post.content)}</p>
                )}
                {/* Multiple images support */}
                {imageUrls.length > 0 && (
                  <div className={`mt-2 ${imageUrls.length > 1 ? "grid grid-cols-2 gap-1" : ""}`}>
                    {imageUrls.map((url, i) => (
                      <img key={i} src={url} alt="" className="rounded-xl max-h-60 w-auto cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => setViewingImage(url)} />
                    ))}
                  </div>
                )}
                {(post as any).video_url && (
                  <video controls className="mt-2 rounded-xl max-h-60 w-full" preload="metadata">
                    <source src={(post as any).video_url} />
                  </video>
                )}
                {post.audio_url && (
                  <div className="mt-2 flex items-center gap-2 bg-background/20 rounded-xl px-3 py-3">
                    <Mic className="h-4 w-4 text-primary shrink-0" />
                    <audio controls className="w-full max-w-[250px] h-10" preload="metadata">
                      <source src={post.audio_url} type="audio/webm" />
                    </audio>
                  </div>
                )}
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] opacity-50">{new Date(post.created_at).toLocaleString("ar")}</span>
                  {canDelete(post) && (
                    <button onClick={() => deletePost(post.id)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1">
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Scroll to bottom floating button */}
      {showScrollBtn && (
        <button onClick={scrollToBottom}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-10 h-10 w-10 rounded-full bg-primary text-primary-foreground shadow-glow flex items-center justify-center animate-bounce">
          <ChevronDown className="h-5 w-5" />
        </button>
      )}

      {/* Preview */}
      {(imagePreviews.length > 0 || audioBlob || videoPreview) && (
        <div className="px-4 py-2 border-t border-border/40 glass-strong">
          <div className="flex items-center gap-2 flex-wrap">
            {imagePreviews.map((preview, i) => (
              <div key={i} className="relative">
                <img src={preview} alt="" className="h-16 w-16 rounded-lg object-cover" />
                <button onClick={() => removeImage(i)}
                  className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-[10px]">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {videoPreview && <video src={videoPreview} className="h-16 w-auto rounded-lg" />}
            {audioBlob && <span className="text-sm text-primary">🎤 رسالة صوتية جاهزة</span>}
            <button onClick={() => { setImageFiles([]); setImagePreviews([]); setAudioBlob(null); setVideoFile(null); setVideoPreview(null); }}
              className="text-destructive hover:text-destructive/80">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Recording UI */}
      {isRecording && (
        <div className="sticky bottom-0 px-4 py-3 border-t border-border/40 glass-strong">
          <div className="flex items-center gap-3">
            <button onClick={cancelRecording} className="text-destructive hover:text-destructive/80">
              <Trash2 className="h-5 w-5" />
            </button>
            <div className="flex-1 flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-destructive animate-pulse" />
              <span className="text-sm font-mono text-foreground">{formatRecTime(recordingTime)}</span>
              <div className="flex-1 flex items-center gap-0.5">
                {Array.from({ length: 20 }).map((_, i) => (
                  <div key={i} className="w-1 bg-primary/60 rounded-full animate-pulse"
                    style={{ height: `${Math.random() * 20 + 6}px`, animationDelay: `${i * 0.05}s` }} />
                ))}
              </div>
            </div>
            <button onClick={stopRecording} className="h-10 w-10 rounded-full bg-primary flex items-center justify-center shadow-glow">
              <Send className="h-4 w-4 text-primary-foreground" />
            </button>
          </div>
        </div>
      )}

      {/* Input - Sticky bottom */}
      {!isRecording && (
        <div className="sticky bottom-0 border-t border-border/40 p-4 glass-strong">
          <div className="max-w-3xl mx-auto flex items-end gap-2">
            <div className="relative">
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary shrink-0" onClick={() => setShowPlus(!showPlus)}>
                <Plus className="h-5 w-5" />
              </Button>
              {showPlus && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowPlus(false)} />
                  <div className="absolute bottom-full right-0 mb-2 w-48 rounded-xl glass-strong border border-border/40 p-2 z-50">
                    <button onClick={() => { setShowPlus(false); fileInputRef.current?.click(); }}
                      className="flex items-center gap-2 w-full rounded-lg px-3 py-2.5 text-sm text-foreground hover:bg-secondary/60 transition-colors">
                      <Image className="h-4 w-4 text-accent" /> رفع صور (حتى 20)
                    </button>
                    <button onClick={() => { setShowPlus(false); videoInputRef.current?.click(); }}
                      className="flex items-center gap-2 w-full rounded-lg px-3 py-2.5 text-sm text-foreground hover:bg-secondary/60 transition-colors">
                      <Video className="h-4 w-4 text-primary" /> رفع فيديو (50MB)
                    </button>
                  </div>
                </>
              )}
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleImageSelect} />
            <input type="file" ref={videoInputRef} className="hidden" accept="video/*" onChange={handleVideoSelect} />
            <textarea value={message} onChange={e => setMessage(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendPost(); } }}
              placeholder="اكتب رسالتك..."
              className="flex-1 resize-none bg-secondary/50 rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border/30 focus:border-primary/50 max-h-24"
              rows={1} />
            {message.trim() || imageFiles.length > 0 || audioBlob || videoFile ? (
              <Button onClick={sendPost} disabled={loading} size="icon"
                className="bg-primary text-primary-foreground shadow-glow shrink-0 rounded-xl">
                <Send className="h-4 w-4" />
              </Button>
            ) : (
              <button onClick={startRecording}
                className="h-10 w-10 flex items-center justify-center rounded-xl text-muted-foreground hover:text-primary transition-colors">
                <Mic className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Forum;
