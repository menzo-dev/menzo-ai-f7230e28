import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import {
  Send, Plus, Bot, User, LogOut, Trash2, Image, Search,
  Menu, X, MessageSquare, Sparkles, ChevronDown, GraduationCap,
  Mic, MicOff, Paperclip, Edit3, Copy, Check, RotateCcw,
  Users as UsersIcon, Shield, Square, Settings, BookOpen, Bell, Mail
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Message {
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
}

interface Conversation {
  id: string;
  title: string;
  last_active: string;
}

const MODEL_CATEGORIES = [
  {
    label: "⚡ Lovable AI",
    models: [
      { id: "google/gemini-3-flash-preview", label: "Gemini 3 Flash ⚡", desc: "سريع ومتوازن", deepThink: false },
      { id: "google/gemini-3-pro-preview", label: "Gemini 3 Pro 🧠", desc: "أقوى نموذج Google", deepThink: false },
      { id: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro 💎", desc: "تفكير عميق", deepThink: true },
      { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash", desc: "متوازن", deepThink: false },
      { id: "google/gemini-2.5-flash-lite", label: "Gemini 2.5 Lite 💨", desc: "أسرع وأرخص", deepThink: false },
      { id: "openai/gpt-5", label: "GPT-5 🌟", desc: "الأقوى من OpenAI", deepThink: true },
      { id: "openai/gpt-5-mini", label: "GPT-5 Mini", desc: "سريع واقتصادي", deepThink: false },
      { id: "openai/gpt-5-nano", label: "GPT-5 Nano 🚀", desc: "خفيف وسريع", deepThink: false },
      { id: "openai/gpt-5.2", label: "GPT-5.2 🔥", desc: "أحدث إصدار", deepThink: true },
    ],
  },
  {
    label: "🆓 OpenRouter مجاني",
    models: [
      { id: "openrouter/qwen/qwen3-235b-a22b:free", label: "Qwen 3 235B 🏮", desc: "أقوى نموذج مجاني", deepThink: false },
      { id: "openrouter/qwen/qwen3-30b-a3b:free", label: "Qwen 3 30B", desc: "سريع ومجاني", deepThink: false },
      { id: "openrouter/deepseek/deepseek-r1:free", label: "DeepSeek R1 🐉", desc: "تفكير عميق مجاني", deepThink: true },
      { id: "openrouter/meta-llama/llama-4-maverick:free", label: "Llama 4 Maverick 🦙", desc: "من Meta مجاناً", deepThink: false },
      { id: "openrouter/google/gemma-3-27b-it:free", label: "Gemma 3 27B", desc: "من Google مجاناً", deepThink: false },
      { id: "openrouter/microsoft/phi-4-reasoning:free", label: "Phi-4 Reasoning 🧮", desc: "تفكير من Microsoft", deepThink: true },
    ],
  },
  {
    label: "🐉 DeepSeek",
    models: [
      { id: "deepseek/deepseek-chat", label: "DeepSeek Chat 🐉", desc: "محادثة قوية", deepThink: false },
      { id: "deepseek/deepseek-reasoner", label: "DeepSeek R1 🧠", desc: "تفكير عميق", deepThink: true },
    ],
  },
  {
    label: "🤖 Grok & Claude",
    models: [
      { id: "xai/grok-3", label: "Grok 3 ⚡", desc: "من xAI / إيلون ماسك", deepThink: false },
      { id: "xai/grok-3-mini", label: "Grok 3 Mini", desc: "خفيف وسريع", deepThink: false },
      { id: "anthropic/claude-sonnet-4-20250514", label: "Claude Sonnet 4 🎭", desc: "من Anthropic", deepThink: false },
      { id: "anthropic/claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku", desc: "سريع وذكي", deepThink: false },
    ],
  },
];

const ALL_MODELS = MODEL_CATEGORIES.flatMap(c => c.models);

const SUGGESTIONS_POOL = [
  "اشرح لي باب الطهارة في الفقه الشافعي",
  "ما إعراب: إن الله مع الصابرين؟",
  "اشرح قوانين نيوتن بالتفصيل",
  "ما الفرق بين الاستعارة والكناية في البلاغة؟",
  "اشرح درس المعادلات التربيعية",
  "ما أركان الإيمان مع الشرح؟",
  "اشرح قانون أوم وقانون كيرشوف",
  "ما شروط صحة الصلاة في المذهب الشافعي؟",
  "اشرح الحركة بعجلة منتظمة في الديناميكا",
  "ما الفرق بين المجاز المرسل والمجاز العقلي؟",
  "اشرح تركيب الخلية في الأحياء",
  "ما أنواع التفاعلات الكيميائية؟",
];

const Chat = () => {
  const { user, profile, role, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState(ALL_MODELS[0].id);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [uploadedImagePreview, setUploadedImagePreview] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConvId, setCurrentConvId] = useState<string | null>(null);
  const [showPlus, setShowPlus] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [editingMsgIdx, setEditingMsgIdx] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const [editingConvTitle, setEditingConvTitle] = useState("");
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEnd = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate random suggestions
  useEffect(() => {
    const shuffled = [...SUGGESTIONS_POOL].sort(() => Math.random() - 0.5);
    setSuggestions(shuffled.slice(0, 4));
  }, [messages.length === 0]);

  useEffect(() => { loadConversations(); }, []);
  useEffect(() => { messagesEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 200);
  };

  const scrollToBottom = () => messagesEnd.current?.scrollIntoView({ behavior: "smooth" });

  const loadConversations = async () => {
    const { data } = await supabase.from("conversations").select("id, title, last_active").order("last_active", { ascending: false }).limit(50);
    if (data) setConversations(data);
  };

  const newChat = () => { setMessages([]); setCurrentConvId(null); setInput(""); };

  const loadConversation = async (id: string) => {
    const { data } = await supabase.from("conversations").select("messages, model").eq("id", id).single();
    if (data?.messages) {
      setMessages(data.messages as unknown as Message[]);
      setCurrentConvId(id);
      if (data.model) setSelectedModel(data.model);
      setSidebarOpen(false);
    }
  };

  const deleteConversation = async (id: string) => {
    await supabase.from("conversations").delete().eq("id", id);
    if (currentConvId === id) newChat();
    loadConversations();
  };

  const renameConversation = async (id: string, newTitle: string) => {
    if (!newTitle.trim()) return;
    await supabase.from("conversations").update({ title: newTitle.trim() }).eq("id", id);
    setEditingConvId(null);
    loadConversations();
  };

  const saveConversation = async (msgs: Message[]) => {
    const title = msgs[0]?.content?.slice(0, 50) || "محادثة جديدة";
    if (currentConvId) {
      await supabase.from("conversations").update({ messages: msgs as any, title, last_active: new Date().toISOString(), model: selectedModel }).eq("id", currentConvId);
    } else {
      const { data } = await supabase.from("conversations").insert({ user_id: user!.id, messages: msgs as any, title, model: selectedModel, last_active: new Date().toISOString() }).select("id").single();
      if (data) setCurrentConvId(data.id);
    }
    loadConversations();
  };

  const stopGeneration = () => {
    abortControllerRef.current?.abort();
    setIsLoading(false);
  };

  const streamChat = async (msgs: Message[]) => {
    const controller = new AbortController();
    abortControllerRef.current = controller;
    
    const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
    const lastMsg = msgs[msgs.length - 1];
    const msgImageUrl = lastMsg?.imageUrl || undefined;
    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
      body: JSON.stringify({
        messages: msgs.map(m => ({ role: m.role, content: m.content })),
        model: selectedModel,
        userName: profile?.display_name,
        userBio: profile?.bio,
        imageUrl: msgImageUrl,
      }),
      signal: controller.signal,
    });

    if (!resp.ok) {
      const errData = await resp.json().catch(() => ({}));
      throw new Error(errData.error || "فشل الاتصال بالخادم");
    }
    if (!resp.body) throw new Error("No response body");

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    let assistantSoFar = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });
        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantSoFar += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
                return [...prev, { role: "assistant", content: assistantSoFar }];
              });
            }
          } catch { textBuffer = line + "\n" + textBuffer; break; }
        }
      }
    } catch (err: any) {
      if (err.name === "AbortError") { /* User stopped */ } else throw err;
    }

    return assistantSoFar;
  };

  const sendMessage = async (overrideInput?: string) => {
    const text = overrideInput || input.trim();
    if (!text || isLoading) return;
    const userMsg: Message = { role: "user", content: text, imageUrl: uploadedImageUrl || undefined };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setInput("");
    setUploadedImageUrl(null);
    setUploadedImagePreview(null);
    setIsLoading(true);

    try {
      const assistantText = await streamChat(newMsgs);
      if (assistantText) {
        const finalMsgs = [...newMsgs, { role: "assistant" as const, content: assistantText }];
        setMessages(finalMsgs);
        await saveConversation(finalMsgs);
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        toast({ title: "خطأ", description: err.message, variant: "destructive" });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const regenerateResponse = async () => {
    if (messages.length < 2) return;
    const withoutLast = messages.slice(0, -1);
    setMessages(withoutLast);
    const lastUserMsg = withoutLast[withoutLast.length - 1];
    if (lastUserMsg?.role !== "user") return;
    setIsLoading(true);
    try {
      const assistantText = await streamChat(withoutLast);
      if (assistantText) {
        const finalMsgs = [...withoutLast, { role: "assistant" as const, content: assistantText }];
        setMessages(finalMsgs);
        await saveConversation(finalMsgs);
      }
    } catch (err: any) {
      if (err.name !== "AbortError") toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally { setIsLoading(false); }
  };

  const editMessage = (idx: number) => {
    if (messages[idx].role !== "user") return;
    setEditingMsgIdx(idx);
    setEditText(messages[idx].content);
  };

  const submitEditMessage = async () => {
    if (editingMsgIdx === null || !editText.trim()) return;
    const truncated = messages.slice(0, editingMsgIdx);
    truncated.push({ role: "user", content: editText.trim() });
    setMessages(truncated);
    setEditingMsgIdx(null);
    setEditText("");
    setIsLoading(true);
    try {
      const assistantText = await streamChat(truncated);
      if (assistantText) {
        const final2 = [...truncated, { role: "assistant" as const, content: assistantText }];
        setMessages(final2);
        await saveConversation(final2);
      }
    } catch (err: any) {
      if (err.name !== "AbortError") toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally { setIsLoading(false); }
  };

  const copyText = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    
    if (file.type.startsWith("image/")) {
      // Upload image to storage for Optiic to read
      const ext = file.name.split(".").pop();
      const path = `chat/${user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("avatars").upload(path, file);
      if (error) {
        toast({ title: "خطأ", description: "فشل رفع الصورة", variant: "destructive" });
        return;
      }
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      setUploadedImageUrl(publicUrl);
      // Also show preview
      const reader = new FileReader();
      reader.onload = ev => setUploadedImagePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      // Text file
      const text = await file.text().catch(() => null);
      if (text) {
        setInput(prev => prev + `\n📎 محتوى الملف "${file.name}":\n\`\`\`\n${text.slice(0, 5000)}\n\`\`\``);
      } else {
        toast({ title: "غير مدعوم", description: "هذا النوع من الملفات غير مدعوم حالياً", variant: "destructive" });
      }
    }
    e.target.value = "";
  };

  const toggleRecording = () => {
    if (isRecording) { recognitionRef.current?.stop(); setIsRecording(false); return; }
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SpeechRecognition) { toast({ title: "غير مدعوم", description: "متصفحك لا يدعم التعرف على الصوت. استخدم Chrome.", variant: "destructive" }); return; }
    const recognition = new SpeechRecognition();
    recognition.lang = "ar-EG";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event: any) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) transcript += event.results[i][0].transcript;
      setInput(transcript);
    };
    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  };

  // YouTube embed detection
  const renderYouTubeEmbed = (url: string) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
    if (!match) return null;
    return (
      <iframe
        className="rounded-xl w-full aspect-video mt-2"
        src={`https://www.youtube.com/embed/${match[1]}`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    );
  };

  const avatarUrl = profile?.avatar_url;
  const displayName = profile?.display_name || "مستخدم";
  const isAdmin = role === "admin";
  const currentModelInfo = ALL_MODELS.find(m => m.id === selectedModel);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 right-0 z-40 w-72 bg-card/90 backdrop-blur-xl border-l border-border/40 transform transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "translate-x-full"} md:relative md:translate-x-0`}>
        <div className="flex flex-col h-full p-4">
          <div className="flex items-center justify-between mb-4">
            <Button onClick={newChat} className="flex-1 bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90 shadow-glow">
              <Plus className="ml-2 h-4 w-4" /> محادثة جديدة
            </Button>
            <Button variant="ghost" size="icon" className="md:hidden mr-2" onClick={() => setSidebarOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-hide space-y-1">
            {conversations.map((conv) => (
              <div key={conv.id}
                className={`group flex items-center justify-between rounded-xl px-3 py-2.5 cursor-pointer transition-all ${
                  currentConvId === conv.id ? "bg-primary/15 text-primary border border-primary/20" : "text-muted-foreground hover:bg-secondary/60"
                }`}
                onClick={() => loadConversation(conv.id)}>
                {editingConvId === conv.id ? (
                  <input value={editingConvTitle} onChange={e => setEditingConvTitle(e.target.value)}
                    onBlur={() => renameConversation(conv.id, editingConvTitle)}
                    onKeyDown={e => e.key === "Enter" && renameConversation(conv.id, editingConvTitle)}
                    className="flex-1 bg-transparent text-sm outline-none border-b border-primary/50 text-foreground"
                    autoFocus onClick={e => e.stopPropagation()} />
                ) : (
                  <div className="flex items-center gap-2 truncate flex-1">
                    <MessageSquare className="h-4 w-4 shrink-0" />
                    <span className="truncate text-sm">{conv.title}</span>
                  </div>
                )}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={(e) => { e.stopPropagation(); setEditingConvId(conv.id); setEditingConvTitle(conv.title); }}>
                    <Edit3 className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom nav */}
          <div className="border-t border-border/40 pt-4 space-y-1">
            {[
              { path: "/exams", icon: GraduationCap, label: "الاختبارات", color: "text-accent" },
              { path: "/forum", icon: UsersIcon, label: "منتدى الطلاب", color: "text-primary" },
              { path: "/messages", icon: MessageSquare, label: "المحادثات الخاصة", color: "text-accent" },
              { path: "/notifications", icon: Bell, label: "الإشعارات", color: "text-accent" },
              { path: "/stats", icon: BookOpen, label: "إحصائياتي", color: "text-primary" },
              { path: "/books", icon: BookOpen, label: "قسم الكتب", color: "text-accent" },
            ].map(item => (
              <button key={item.path} onClick={() => navigate(item.path)} className="flex items-center gap-3 w-full rounded-xl px-3 py-2.5 hover:bg-secondary/60 transition-colors text-foreground">
                <item.icon className={`h-5 w-5 ${item.color}`} />
                <span className="text-sm">{item.label}</span>
              </button>
            ))}
            {isAdmin && (
              <button onClick={() => navigate("/admin")} className="flex items-center gap-3 w-full rounded-xl px-3 py-2.5 hover:bg-secondary/60 transition-colors text-foreground">
                <Shield className="h-5 w-5 text-destructive" />
                <span className="text-sm">لوحة الإدارة</span>
              </button>
            )}
            <button onClick={() => navigate("/profile")} className="flex items-center gap-3 w-full rounded-xl px-3 py-2.5 hover:bg-secondary/60 transition-colors">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover border border-primary/30" />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary text-sm font-bold">{displayName[0]}</div>
              )}
              <span className="text-sm text-foreground truncate">{displayName}</span>
            </button>
            <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-destructive" onClick={signOut}>
              <LogOut className="ml-2 h-4 w-4" /> تسجيل الخروج
            </Button>
          </div>
        </div>
      </div>

      {/* Main Chat */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top bar - Sticky */}
        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border/40 glass-strong z-20">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-glow">
                <Bot className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-bold text-foreground text-glow-cyan">MENZO-AI</span>
            </div>
          </div>
          <div className="relative">
            <Button variant="outline" size="sm" onClick={() => setShowModelPicker(!showModelPicker)} className="border-border/60 text-foreground bg-secondary/50">
              {currentModelInfo?.label || "اختر نموذج"}
              <ChevronDown className="mr-2 h-4 w-4" />
            </Button>
            {showModelPicker && (
              <>
                <div className="fixed inset-0 z-[60]" onClick={() => setShowModelPicker(false)} />
                <div className="absolute left-0 top-full mt-2 w-80 max-h-[70vh] overflow-y-auto rounded-xl glass-strong border border-border/60 p-2 z-[70] scrollbar-hide">
                  {MODEL_CATEGORIES.map((cat) => (
                    <div key={cat.label}>
                      <div className="text-xs font-bold text-muted-foreground px-3 py-2 text-glow-purple">{cat.label}</div>
                      {cat.models.map((m) => (
                        <button key={m.id} onClick={() => { setSelectedModel(m.id); setShowModelPicker(false); }}
                          className={`w-full text-right rounded-lg px-3 py-2 text-sm transition-all ${
                            selectedModel === m.id ? "bg-primary/15 text-primary border border-primary/20" : "text-foreground hover:bg-secondary/60"
                          }`}>
                          <div className="font-medium flex items-center gap-1">
                            {m.label}
                            {m.deepThink && <span className="text-[10px] bg-accent/20 text-accent px-1.5 py-0.5 rounded-full">🧠 تفكير عميق</span>}
                          </div>
                          <div className="text-xs text-muted-foreground">{m.desc}</div>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Messages - Scrollable */}
        <div ref={chatContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-4 py-6 scrollbar-hide">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/20 to-accent/20 mb-6 shadow-glow animate-float">
                <Sparkles className="h-12 w-12 text-primary" />
              </div>
              <h2 className="text-3xl font-bold mb-2">
                <span className="text-gradient-cosmic">أهلاً {displayName}! 👋</span>
              </h2>
              <p className="text-muted-foreground max-w-md text-sm mb-8">
                كيف يمكنني مساعدتك اليوم؟ اسأل عن أي مادة أزهرية أو علمية
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
                {suggestions.map((s, i) => (
                  <button key={i} onClick={() => sendMessage(s)}
                    className="glass rounded-xl px-4 py-3 text-sm text-right text-foreground hover:border-primary/40 hover:bg-primary/5 transition-all">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((msg, i) => (
                <div key={i} className={`group flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className="shrink-0">
                    {msg.role === "user" ? (
                      avatarUrl ? (
                        <img src={avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover border border-accent/30" />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/20 text-accent"><User className="h-4 w-4" /></div>
                      )
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary/30 to-accent/30 text-primary">
                        <Bot className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.role === "user" ? "bg-gradient-to-br from-primary/80 to-primary text-primary-foreground" : "bg-secondary/60 text-foreground border border-border/30"
                  }`}>
                    {editingMsgIdx === i ? (
                      <div className="space-y-2">
                        <textarea value={editText} onChange={e => setEditText(e.target.value)}
                          className="w-full bg-background/50 rounded-lg p-2 text-sm text-foreground outline-none resize-none" rows={3} />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={submitEditMessage} className="bg-primary text-primary-foreground text-xs">إرسال</Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingMsgIdx(null)} className="text-xs">إلغاء</Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {msg.imageUrl && (
                          <img src={msg.imageUrl} alt="uploaded" className="rounded-xl max-h-60 w-auto mb-2" />
                        )}
                        <div className="prose prose-sm prose-invert max-w-none text-inherit
                          [&_pre]:bg-background/40 [&_pre]:rounded-xl [&_pre]:p-3 [&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:text-sm
                          [&_code]:bg-background/30 [&_code]:rounded [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-primary [&_code]:text-sm
                          [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-foreground
                          [&_a]:text-primary [&_a]:underline [&_a]:break-all
                          [&_img]:rounded-xl [&_img]:max-h-80 [&_img]:w-auto
                          [&_h3]:text-primary [&_h3]:mt-4 [&_h3]:mb-2
                          [&_blockquote]:border-primary/40 [&_blockquote]:bg-primary/5 [&_blockquote]:rounded-lg [&_blockquote]:px-4 [&_blockquote]:py-2">
                          <ReactMarkdown
                            components={{
                              a: ({ href, children }) => {
                                const ytEmbed = href ? renderYouTubeEmbed(href) : null;
                                return (
                                  <>
                                    <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80">
                                      🔗 {children}
                                    </a>
                                    {ytEmbed}
                                  </>
                                );
                              },
                              code: ({ className, children, ...props }) => {
                                const isInline = !className;
                                if (isInline) {
                                  return <code className="bg-background/30 rounded px-1.5 py-0.5 text-primary text-sm font-mono">{children}</code>;
                                }
                                return (
                                  <div className="relative group/code">
                                    <button
                                      onClick={() => navigator.clipboard.writeText(String(children))}
                                      className="absolute top-2 left-2 opacity-0 group-hover/code:opacity-100 transition-opacity bg-primary/20 hover:bg-primary/30 rounded px-2 py-1 text-[10px] text-primary"
                                    >
                                      نسخ
                                    </button>
                                    <code className={className} {...props}>{children}</code>
                                  </div>
                                );
                              },
                            }}
                          >{msg.content}</ReactMarkdown>
                        </div>
                      </>
                    )}
                    {/* Action buttons under message */}
                    {editingMsgIdx !== i && (
                      <div className={`flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                        {msg.role === "user" && (
                          <button onClick={() => editMessage(i)} className="p-1 rounded hover:bg-background/30" title="تعديل">
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button onClick={() => copyText(msg.content, i)} className="p-1 rounded hover:bg-background/30" title="نسخ">
                          {copiedIdx === i ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                        {msg.role === "assistant" && i === messages.length - 1 && (
                          <button onClick={regenerateResponse} className="p-1 rounded hover:bg-background/30" title="إعادة الإجابة">
                            <RotateCcw className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && messages[messages.length - 1]?.role === "user" && (
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/30 to-accent/30 text-primary">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="rounded-2xl bg-secondary/60 border border-border/30 px-4 py-3">
                    <div className="flex gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0s" }} />
                      <span className="h-2 w-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: "0.15s" }} />
                      <span className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0.3s" }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEnd} />
            </div>
          )}
        </div>

        {/* Scroll to bottom button */}
        {showScrollBtn && (
          <button onClick={scrollToBottom}
            className="absolute bottom-24 left-1/2 -translate-x-1/2 z-10 h-10 w-10 rounded-full bg-primary text-primary-foreground shadow-glow flex items-center justify-center">
            <ChevronDown className="h-5 w-5" />
          </button>
        )}

        {/* Image preview */}
        {uploadedImagePreview && (
          <div className="shrink-0 px-4 py-2 border-t border-border/40 glass-strong">
            <div className="flex items-center gap-2">
              <img src={uploadedImagePreview} alt="" className="h-16 w-16 rounded-lg object-cover" />
              <button onClick={() => { setUploadedImageUrl(null); setUploadedImagePreview(null); }} className="text-destructive">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Input - Fixed bottom */}
        <div className="shrink-0 border-t border-border/40 p-4 glass-strong">
          <div className="max-w-3xl mx-auto">
            {isLoading && (
              <div className="flex justify-center mb-2">
                <Button variant="outline" size="sm" onClick={stopGeneration} className="border-destructive/30 text-destructive text-xs">
                  <Square className="h-3 w-3 ml-1" /> إيقاف التوليد
                </Button>
              </div>
            )}
            <div className="flex items-end gap-2">
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
                        <Image className="h-4 w-4 text-accent" /> رفع صورة / ملف
                      </button>
                    </div>
                  </>
                )}
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*,.txt,.pdf,.md,.json,.csv,.py,.js,.ts" onChange={handleFileUpload} />
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="اكتب رسالتك..."
                className="flex-1 resize-none bg-secondary/50 rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border/30 focus:border-primary/50 max-h-32"
                rows={1}
              />
              {isRecording ? (
                <Button variant="ghost" size="icon" onClick={toggleRecording} className="text-destructive animate-pulse shrink-0">
                  <MicOff className="h-5 w-5" />
                </Button>
              ) : (
                <Button variant="ghost" size="icon" onClick={toggleRecording} className="text-muted-foreground hover:text-primary shrink-0">
                  <Mic className="h-5 w-5" />
                </Button>
              )}
              <Button onClick={() => sendMessage()} disabled={isLoading || (!input.trim() && !uploadedImageUrl)} size="icon"
                className="bg-primary text-primary-foreground shadow-glow shrink-0 rounded-xl">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;