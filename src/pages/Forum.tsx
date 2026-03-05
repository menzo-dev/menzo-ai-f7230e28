import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Send, Image, Trash2, Plus, X, Download, Mic, Square, Video } from "lucide-react";
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

const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

const Forum = () => {
  const { user, profile, role } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [message, setMessage] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPlus, setShowPlus] = useState(false);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isAdmin = role === "admin";
  const userGender = (profile as any)?.gender || "male";
  const forumTitle = userGender === "female" ? "منتدى الطالبات" : "منتدى الطلاب";

  useEffect(() => {
    loadPosts();
    const channel = supabase
      .channel("forum_posts")
      .on("postgres_changes", { event: "*", schema: "public", table: "forum_posts" }, () => loadPosts())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userGender]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [posts]);

  const loadPosts = async () => {
    const query = supabase
      .from("forum_posts")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(200);
    const { data } = await (query as any).eq("forum_type", userGender);
    if (!data) return;
    const userIds = [...new Set(data.map(p => p.user_id))];
    if (userIds.length === 0) { setPosts([]); return; }
    const { data: profiles } = await supabase.from("profiles").select("id, display_name, avatar_url").in("id", userIds);
    const profileMap = new Map((profiles || []).map(p => [p.id, p]));
    setPosts(data.map(p => ({ ...p, profile: profileMap.get(p.user_id) || undefined })));
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setVideoFile(null); setVideoPreview(null);
    const reader = new FileReader();
    reader.onload = ev => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    setShowPlus(false);
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_VIDEO_SIZE) {
      toast({ title: "خطأ", description: "حجم الفيديو يجب ألا يتجاوز 50 ميجابايت", variant: "destructive" });
      return;
    }
    setVideoFile(file);
    setImageFile(null); setImagePreview(null);
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

  const sendPost = async () => {
    if ((!message.trim() && !imageFile && !audioBlob && !videoFile) || !user) return;
    setLoading(true);
    try {
      let imageUrl: string | null = null;
      let audioUrl: string | null = null;
      let videoUrl: string | null = null;

      if (imageFile) {
        const ext = imageFile.name.split(".").pop();
        const path = `forum/${user.id}/${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from("avatars").upload(path, imageFile);
        if (!error) {
          const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
          imageUrl = publicUrl;
        }
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
      setImageFile(null);
      setImagePreview(null);
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

  return (
    <div className="flex flex-col h-screen bg-gradient-hero">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 glass-strong border-b border-border/40">
        <button onClick={() => navigate("/chat")} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold text-foreground">
          <span className="text-gradient-cosmic">{forumTitle}</span>
        </h1>
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
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 scrollbar-hide">
        {posts.length === 0 && (
          <div className="text-center text-muted-foreground mt-20">
            <p className="text-lg">لا توجد منشورات بعد</p>
            <p className="text-sm mt-2">كن أول من يشارك! 💬</p>
          </div>
        )}
        {posts.map(post => {
          const isOwn = post.user_id === user?.id;
          const senderName = post.profile?.display_name || "مستخدم";
          return (
            <div key={post.id} className={`group flex gap-2 ${isOwn ? "flex-row-reverse" : ""}`}>
              <div className="shrink-0">
                {post.profile?.avatar_url ? (
                  <img src={post.profile.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover border-2 border-primary/40" />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                    {senderName[0]}
                  </div>
                )}
              </div>
              <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                isOwn ? "bg-gradient-to-br from-primary/80 to-primary text-primary-foreground" : "bg-secondary/60 text-foreground border border-border/30"
              }`}>
                <div className="text-xs font-bold mb-1 opacity-70">
                  {isAdmin && post.user_id === user?.id ? "👑 أدمن" : senderName}
                </div>
                {post.content && post.content !== "📷 صورة" && post.content !== "🎤 رسالة صوتية" && post.content !== "🎥 فيديو" && (
                  <p className="text-sm whitespace-pre-wrap">{post.content}</p>
                )}
                {post.image_url && (
                  <img src={post.image_url} alt="" className="mt-2 rounded-xl max-h-60 w-auto cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setViewingImage(post.image_url!)} />
                )}
                {(post as any).video_url && (
                  <video controls className="mt-2 rounded-xl max-h-60 w-full" preload="metadata">
                    <source src={(post as any).video_url} />
                  </video>
                )}
                {post.audio_url && (
                  <div className="mt-2 flex items-center gap-2 bg-background/20 rounded-xl px-3 py-2">
                    <Mic className="h-4 w-4 text-primary shrink-0" />
                    <audio controls className="w-full max-w-[220px] h-8" preload="metadata" style={{ filter: "invert(0)" }}>
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

      {/* Preview */}
      {(imagePreview || audioBlob || videoPreview) && (
        <div className="px-4 py-2 border-t border-border/40 glass-strong">
          <div className="flex items-center gap-2">
            {imagePreview && <img src={imagePreview} alt="" className="h-16 w-16 rounded-lg object-cover" />}
            {videoPreview && (
              <video src={videoPreview} className="h-16 w-auto rounded-lg" />
            )}
            {audioBlob && <span className="text-sm text-primary">🎤 رسالة صوتية جاهزة للإرسال</span>}
            <button onClick={() => { setImageFile(null); setImagePreview(null); setAudioBlob(null); setVideoFile(null); setVideoPreview(null); }} className="text-destructive hover:text-destructive/80">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Recording UI - WhatsApp style */}
      {isRecording && (
        <div className="px-4 py-3 border-t border-border/40 glass-strong">
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
                    style={{ height: `${Math.random() * 16 + 4}px`, animationDelay: `${i * 0.05}s` }} />
                ))}
              </div>
            </div>
            <button onClick={stopRecording} className="h-10 w-10 rounded-full bg-primary flex items-center justify-center shadow-glow">
              <Send className="h-4 w-4 text-primary-foreground" />
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      {!isRecording && (
        <div className="border-t border-border/40 p-4 glass-strong">
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
                      <Image className="h-4 w-4 text-accent" /> رفع صورة
                    </button>
                    <button onClick={() => { setShowPlus(false); videoInputRef.current?.click(); }}
                      className="flex items-center gap-2 w-full rounded-lg px-3 py-2.5 text-sm text-foreground hover:bg-secondary/60 transition-colors">
                      <Video className="h-4 w-4 text-primary" /> رفع فيديو (50MB)
                    </button>
                  </div>
                </>
              )}
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageSelect} />
            <input type="file" ref={videoInputRef} className="hidden" accept="video/*" onChange={handleVideoSelect} />
            <textarea value={message} onChange={e => setMessage(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendPost(); } }}
              placeholder="اكتب رسالتك..."
              className="flex-1 resize-none bg-secondary/50 rounded-xl px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border/30 focus:border-primary/50 max-h-24"
              rows={1} />
            {message.trim() || imageFile || audioBlob || videoFile ? (
              <Button onClick={sendPost} disabled={loading} size="icon"
                className="bg-gradient-to-r from-primary to-accent text-primary-foreground shrink-0 rounded-xl shadow-glow">
                <Send className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={startRecording} size="icon"
                className="bg-primary text-primary-foreground shrink-0 rounded-xl shadow-glow">
                <Mic className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Forum;
