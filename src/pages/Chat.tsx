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
  Users as UsersIcon, Shield, Square, Settings
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
      { id: "google/gemini-3-flash-preview", label: "Gemini 3 Flash ⚡", desc: "سريع ومتوازن" },
      { id: "google/gemini-3-pro-preview", label: "Gemini 3 Pro 🧠", desc: "أقوى نموذج Google" },
      { id: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro 💎", desc: "تفكير عميق" },
      { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash", desc: "متوازن" },
      { id: "google/gemini-2.5-flash-lite", label: "Gemini 2.5 Lite 💨", desc: "أسرع وأرخص" },
      { id: "openai/gpt-5", label: "GPT-5 🌟", desc: "الأقوى من OpenAI" },
      { id: "openai/gpt-5-mini", label: "GPT-5 Mini", desc: "سريع واقتصادي" },
      { id: "openai/gpt-5-nano", label: "GPT-5 Nano 🚀", desc: "خفيف وسريع" },
      { id: "openai/gpt-5.2", label: "GPT-5.2 🔥", desc: "أحدث إصدار" },
    ],
  },
  {
    label: "🆓 OpenRouter مجاني",
    models: [
      { id: "openrouter/qwen/qwen3-235b-a22b:free", label: "Qwen 3 235B 🏮", desc: "أقوى نموذج مجاني" },
      { id: "openrouter/qwen/qwen3-30b-a3b:free", label: "Qwen 3 30B", desc: "سريع ومجاني" },
      { id: "openrouter/qwen/qwen3-14b:free", label: "Qwen 3 14B", desc: "خفيف ومجاني" },
      { id: "openrouter/meta-llama/llama-4-maverick:free", label: "Llama 4 Maverick 🦙", desc: "من Meta مجاناً" },
      { id: "openrouter/meta-llama/llama-4-scout:free", label: "Llama 4 Scout", desc: "سريع من Meta" },
      { id: "openrouter/deepseek/deepseek-r1:free", label: "DeepSeek R1 🐉", desc: "تفكير عميق مجاني" },
      { id: "openrouter/deepseek/deepseek-chat-v3-0324:free", label: "DeepSeek V3 Chat", desc: "محادثة مجانية" },
      { id: "openrouter/google/gemma-3-27b-it:free", label: "Gemma 3 27B", desc: "من Google مجاناً" },
      { id: "openrouter/google/gemma-3-12b-it:free", label: "Gemma 3 12B", desc: "خفيف من Google" },
      { id: "openrouter/mistralai/mistral-small-3.1-24b-instruct:free", label: "Mistral Small 3.1", desc: "فرنسي سريع" },
      { id: "openrouter/microsoft/phi-4-reasoning:free", label: "Phi-4 Reasoning 🧮", desc: "تفكير من Microsoft" },
      { id: "openrouter/microsoft/mai-ds-r1:free", label: "MAI-DS R1", desc: "رياضيات من Microsoft" },
      { id: "openrouter/nvidia/llama-3.1-nemotron-ultra-253b-v1:free", label: "Nemotron Ultra 253B", desc: "عملاق من NVIDIA" },
      { id: "openrouter/moonshotai/kimi-vl-a3b-thinking:free", label: "Kimi VL 🌙", desc: "رؤية مجانية" },
    ],
  },
  {
    label: "🐉 DeepSeek",
    models: [
      { id: "deepseek/deepseek-chat", label: "DeepSeek Chat 🐉", desc: "محادثة قوية" },
      { id: "deepseek/deepseek-reasoner", label: "DeepSeek R1 🧠", desc: "تفكير عميق" },
    ],
  },
  {
    label: "🤖 Grok & Claude",
    models: [
      { id: "xai/grok-3", label: "Grok 3 ⚡", desc: "من xAI / إيلون ماسك" },
      { id: "xai/grok-3-mini", label: "Grok 3 Mini", desc: "خفيف وسريع" },
      { id: "anthropic/claude-sonnet-4-20250514", label: "Claude Sonnet 4 🎭", desc: "من Anthropic" },
      { id: "anthropic/claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku", desc: "سريع وذكي" },
    ],
  },
  {
    label: "🤗 HuggingFace",
    models: [
      { id: "huggingface/mistralai/Mistral-7B-Instruct-v0.3", label: "Mistral 7B 🇫🇷", desc: "مجاني من HuggingFace" },
      { id: "huggingface/microsoft/Phi-3-mini-4k-instruct", label: "Phi-3 Mini 🔬", desc: "خفيف من Microsoft" },
      { id: "huggingface/google/gemma-2-9b-it", label: "Gemma 2 9B", desc: "من Google" },
    ],
  },
];

const ALL_MODELS = MODEL_CATEGORIES.flatMap(c => c.models);

const IMAGE_MODELS = [
  { id: "gemini", label: "Gemini Image ✨", desc: "توليد بالذكاء الاصطناعي" },
  { id: "together", label: "FLUX.1 Schnell 🎨", desc: "Together AI — سريع" },
  { id: "leonardo", label: "Leonardo AI 🖼️", desc: "جودة عالية احترافية" },
];

const SEARCH_ENGINES = [
  { id: "ai", label: "بحث ذكي 🤖", desc: "AI Search" },
  { id: "exa", label: "Exa 🔍", desc: "بحث عصبي متقدم" },
  { id: "tavily", label: "Tavily 🌐", desc: "بحث ويب شامل" },
];

const SUGGESTIONS = [
  "اشرح لي باب الطهارة في الفقه الشافعي",
  "ما إعراب: إن الله مع الصابرين؟",
  "اشرح قوانين نيوتن بالتفصيل",
  "ما الفرق بين الاستعارة والكناية في البلاغة؟",
  "اشرح درس المعادلات التربيعية",
  "ما أركان الإيمان مع الشرح؟",
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
  const [uploadedFile, setUploadedFile] = useState<{name: string; type: string; preview?: string} | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConvId, setCurrentConvId] = useState<string | null>(null);
  const [showPlus, setShowPlus] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showImageGen, setShowImageGen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [imagePrompt, setImagePrompt] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedImageModel, setSelectedImageModel] = useState("gemini");
  const [selectedSearchEngine, setSelectedSearchEngine] = useState("ai");
  const [editingMsgIdx, setEditingMsgIdx] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const [editingConvTitle, setEditingConvTitle] = useState("");
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEnd = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadConversations(); }, []);
  useEffect(() => { messagesEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

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
    // Check if the last user message has an image
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
      if (err.name === "AbortError") {
        // User stopped generation — keep what we have
      } else throw err;
    }

    return assistantSoFar;
  };

  const sendMessage = async (overrideInput?: string) => {
    const text = overrideInput || input.trim();
    if (!text || isLoading) return;
    const userMsg: Message = { role: "user", content: text };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setInput("");
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
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); uploadedFile ? sendWithFile() : sendMessage(); }
  };

  const generateImage = async (prompt: string, model: string) => {
    if (!prompt) return;
    setIsLoading(true);
    setShowImageGen(false);
    const userMsg: Message = { role: "user", content: `🎨 إنشاء صورة: ${prompt}` };
    setMessages((prev) => [...prev, userMsg]);
    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ prompt, model }),
      });
      const data = await resp.json();
      if (data.error) throw new Error(data.error);
      const assistantMsg: Message = { role: "assistant", content: `تم إنشاء الصورة بنجاح! ✨`, imageUrl: data.imageUrl };
      const finalMsgs = [...messages, userMsg, assistantMsg];
      setMessages(finalMsgs);
      await saveConversation(finalMsgs);
    } catch (err: any) {
      toast({ title: "خطأ في توليد الصورة", description: err.message, variant: "destructive" });
    } finally { setIsLoading(false); setImagePrompt(""); }
  };

  const webSearch = async (query: string, engine: string) => {
    if (!query) return;
    setShowSearch(false);
    const userMsg: Message = { role: "user", content: `🔍 بحث: ${query}` };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/web-search`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ query, engine }),
      });
      const data = await resp.json();
      if (data.error) throw new Error(data.error);
      const assistantMsg: Message = { role: "assistant", content: data.result };
      const finalMsgs = [...messages, userMsg, assistantMsg];
      setMessages(finalMsgs);
      await saveConversation(finalMsgs);
    } catch (err: any) {
      toast({ title: "خطأ في البحث", description: err.message, variant: "destructive" });
    } finally { setIsLoading(false); setSearchQuery(""); }
  };

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SpeechRecognition) {
      toast({ title: "غير مدعوم", description: "متصفحك لا يدعم التعرف على الصوت. استخدم Chrome.", variant: "destructive" });
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "ar-EG";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event: any) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setInput(transcript);
    };
    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setUploadedFile({ name: file.name, type: "image", preview: ev.target?.result as string });
      };
      reader.readAsDataURL(file);
    } else {
      const text = await file.text().catch(() => null);
      if (text) {
        setUploadedFile({ name: file.name, type: "text", preview: text.slice(0, 8000) });
      } else {
        toast({ title: "غير مدعوم", description: "هذا النوع من الملفات غير مدعوم حالياً", variant: "destructive" });
      }
    }
    e.target.value = "";
  };

  const sendWithFile = async () => {
    if (!uploadedFile && !input.trim()) return;
    if (isLoading) return;

    let userContent = input.trim();
    let userImageUrl: string | undefined;

    if (uploadedFile) {
      if (uploadedFile.type === "image") {
        userImageUrl = uploadedFile.preview;
        userContent = userContent || `📎 صورة: ${uploadedFile.name}`;
      } else {
        const fileContent = `📎 محتوى الملف "${uploadedFile.name}":\n\`\`\`\n${uploadedFile.preview?.slice(0, 5000)}\n\`\`\``;
        userContent = userContent ? `${userContent}\n\n${fileContent}` : fileContent;
      }
      setUploadedFile(null);
    }

    if (!userContent) return;
    const userMsg: Message = { role: "user", content: userContent, imageUrl: userImageUrl };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setInput("");
    setIsLoading(true);

    try {
      const assistantText = await streamChat(newMsgs);
      if (assistantText) {
        const finalMsgs = [...newMsgs, { role: "assistant" as const, content: assistantText }];
        setMessages(finalMsgs);
        await saveConversation(finalMsgs);
      }
    } catch (err: any) {
      if (err.name !== "AbortError") toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally { setIsLoading(false); }
  };

  const avatarUrl = profile?.avatar_url;
  const displayName = profile?.display_name || "مستخدم";
  const isAdmin = role === "admin";

  return (
    <div className="flex h-screen bg-background">
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
            <button onClick={() => navigate("/exams")} className="flex items-center gap-3 w-full rounded-xl px-3 py-2.5 hover:bg-secondary/60 transition-colors text-foreground">
              <GraduationCap className="h-5 w-5 text-accent" />
              <span className="text-sm">الاختبارات</span>
            </button>
            <button onClick={() => navigate("/forum")} className="flex items-center gap-3 w-full rounded-xl px-3 py-2.5 hover:bg-secondary/60 transition-colors text-foreground">
              <UsersIcon className="h-5 w-5 text-primary" />
              <span className="text-sm">منتدى الطلاب</span>
            </button>
            <button onClick={() => navigate("/messages")} className="flex items-center gap-3 w-full rounded-xl px-3 py-2.5 hover:bg-secondary/60 transition-colors text-foreground">
              <MessageSquare className="h-5 w-5 text-accent" />
              <span className="text-sm">المحادثات الخاصة</span>
            </button>
            <button onClick={() => navigate("/notifications")} className="flex items-center gap-3 w-full rounded-xl px-3 py-2.5 hover:bg-secondary/60 transition-colors text-foreground">
              <Sparkles className="h-5 w-5 text-accent" />
              <span className="text-sm">الإشعارات</span>
            </button>
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
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary text-sm font-bold">
                  {displayName[0]}
                </div>
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
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 glass-strong">
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
          {/* Model picker */}
          <div className="relative">
            <Button variant="outline" size="sm" onClick={() => setShowModelPicker(!showModelPicker)} className="border-border/60 text-foreground bg-secondary/50">
              {ALL_MODELS.find((m) => m.id === selectedModel)?.label || "اختر نموذج"}
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
                          <div className="font-medium">{m.label}</div>
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

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 scrollbar-hide">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl relative z-0">
                {SUGGESTIONS.slice(0, 4).map((s, i) => (
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
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/20 text-accent">
                          <User className="h-4 w-4" />
                        </div>
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
                        <div className="prose prose-sm prose-invert max-w-none text-inherit [&_img]:rounded-xl [&_img]:max-h-80 [&_img]:w-auto">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      </>
                    )}
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

        {/* Image Generation Dialog */}
        {showImageGen && (
          <div className="border-t border-border/40 p-4 glass-strong">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2"><Image className="h-4 w-4 text-accent" /> إنشاء صورة</h3>
                <button onClick={() => setShowImageGen(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
              </div>
              <div className="flex gap-2 mb-3 flex-wrap">
                {IMAGE_MODELS.map(m => (
                  <button key={m.id} onClick={() => setSelectedImageModel(m.id)}
                    className={`rounded-lg px-3 py-1.5 text-xs transition-all ${selectedImageModel === m.id ? "bg-primary/15 text-primary border border-primary/30" : "bg-secondary/50 text-muted-foreground hover:text-foreground"}`}>
                    {m.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={imagePrompt} onChange={e => setImagePrompt(e.target.value)} placeholder="صف الصورة بالتفصيل..."
                  className="flex-1 bg-secondary/50 rounded-xl px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border/30 focus:border-primary/50"
                  onKeyDown={e => e.key === "Enter" && generateImage(imagePrompt, selectedImageModel)} />
                <Button size="sm" onClick={() => generateImage(imagePrompt, selectedImageModel)} disabled={!imagePrompt.trim() || isLoading}
                  className="bg-primary text-primary-foreground">إنشاء</Button>
              </div>
            </div>
          </div>
        )}

        {/* Search Dialog */}
        {showSearch && (
          <div className="border-t border-border/40 p-4 glass-strong">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2"><Search className="h-4 w-4 text-primary" /> بحث في الإنترنت</h3>
                <button onClick={() => setShowSearch(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
              </div>
              <div className="flex gap-2 mb-3 flex-wrap">
                {SEARCH_ENGINES.map(e => (
                  <button key={e.id} onClick={() => setSelectedSearchEngine(e.id)}
                    className={`rounded-lg px-3 py-1.5 text-xs transition-all ${selectedSearchEngine === e.id ? "bg-primary/15 text-primary border border-primary/30" : "bg-secondary/50 text-muted-foreground hover:text-foreground"}`}>
                    {e.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="ابحث عن أي شيء..."
                  className="flex-1 bg-secondary/50 rounded-xl px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border/30 focus:border-primary/50"
                  onKeyDown={e => e.key === "Enter" && webSearch(searchQuery, selectedSearchEngine)} />
                <Button size="sm" onClick={() => webSearch(searchQuery, selectedSearchEngine)} disabled={!searchQuery.trim() || isLoading}
                  className="bg-primary text-primary-foreground">بحث</Button>
              </div>
            </div>
          </div>
        )}

        {/* Input */}
        <div className="border-t border-border/40 p-4">
          <div className="max-w-3xl mx-auto">
            {uploadedFile && (
              <div className="mb-2 flex items-center gap-2 rounded-xl bg-secondary/60 border border-border/30 px-3 py-2">
                {uploadedFile.type === "image" && uploadedFile.preview && (
                  <img src={uploadedFile.preview} alt="" className="h-12 w-12 rounded-lg object-cover" />
                )}
                {uploadedFile.type === "text" && (
                  <Paperclip className="h-5 w-5 text-primary shrink-0" />
                )}
                <span className="text-sm text-foreground truncate flex-1">{uploadedFile.name}</span>
                <button onClick={() => setUploadedFile(null)} className="text-muted-foreground hover:text-destructive">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            <div className="flex items-end gap-2 rounded-2xl glass-strong p-2 border border-border/30">
              <div className="relative">
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary shrink-0" onClick={() => setShowPlus(!showPlus)}>
                  <Plus className="h-5 w-5" />
                </Button>
                {showPlus && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowPlus(false)} />
                    <div className="absolute bottom-full right-0 mb-2 w-52 rounded-xl glass-strong border border-border/40 p-2 z-50">
                      <button onClick={() => { setShowPlus(false); setShowImageGen(true); }}
                        className="flex items-center gap-2 w-full rounded-lg px-3 py-2.5 text-sm text-foreground hover:bg-secondary/60 transition-colors">
                        <Image className="h-4 w-4 text-accent" /> توليد صورة
                      </button>
                      <button onClick={() => { setShowPlus(false); setShowSearch(true); }}
                        className="flex items-center gap-2 w-full rounded-lg px-3 py-2.5 text-sm text-foreground hover:bg-secondary/60 transition-colors">
                        <Search className="h-4 w-4 text-primary" /> بحث في الإنترنت
                      </button>
                      <button onClick={() => { setShowPlus(false); fileInputRef.current?.click(); }}
                        className="flex items-center gap-2 w-full rounded-lg px-3 py-2.5 text-sm text-foreground hover:bg-secondary/60 transition-colors">
                        <Paperclip className="h-4 w-4 text-muted-foreground" /> رفع ملف أو صورة
                      </button>
                    </div>
                  </>
                )}
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*,.txt,.pdf,.md,.csv,.json,.doc,.docx" onChange={handleFileUpload} />
              <textarea ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
                placeholder="اسأل عن أي شيء..." rows={1}
                className="flex-1 resize-none bg-transparent text-foreground placeholder:text-muted-foreground outline-none py-2 px-2 max-h-32"
                style={{ minHeight: "40px" }} />
              <Button variant="ghost" size="icon" onClick={toggleRecording}
                className={`shrink-0 ${isRecording ? "text-destructive animate-pulse" : "text-muted-foreground hover:text-primary"}`}>
                {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </Button>
              {isLoading ? (
                <Button onClick={stopGeneration} size="icon"
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90 shrink-0 rounded-xl">
                  <Square className="h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={() => uploadedFile ? sendWithFile() : sendMessage()} disabled={!input.trim() && !uploadedFile} size="icon"
                  className="bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90 shrink-0 rounded-xl shadow-glow">
                  <Send className="h-4 w-4" />
                </Button>
              )}
            </div>
            <p className="text-center text-[10px] text-muted-foreground mt-2">
              MENZO-AI — معلمك الذكي للأزهر الشريف | {ALL_MODELS.find(m => m.id === selectedModel)?.label}
            </p>
          </div>
        </div>
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 bg-background/60 backdrop-blur-sm z-30 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  );
};

export default Chat;
