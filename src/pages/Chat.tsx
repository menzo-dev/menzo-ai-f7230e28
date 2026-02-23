import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import {
  Send, Plus, Bot, User, LogOut, History, Trash2, Image, Search,
  Settings, Menu, X, MessageSquare, Sparkles, ChevronDown
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Conversation {
  id: string;
  title: string;
  last_active: string;
}

const MODELS = [
  { id: "google/gemini-3-flash-preview", label: "Gemini Flash ⚡", desc: "سريع ومتوازن" },
  { id: "google/gemini-2.5-pro", label: "Gemini Pro 🧠", desc: "أقوى نموذج" },
  { id: "openai/gpt-5", label: "GPT-5 🌟", desc: "متعدد المهام" },
  { id: "openai/gpt-5-mini", label: "GPT-5 Mini", desc: "سريع واقتصادي" },
  { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash", desc: "متوازن" },
];

const Chat = () => {
  const { user, profile, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState(MODELS[0].id);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConvId, setCurrentConvId] = useState<string | null>(null);
  const [showPlus, setShowPlus] = useState(false);
  const messagesEnd = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadConversations = async () => {
    const { data } = await supabase
      .from("conversations")
      .select("id, title, last_active")
      .order("last_active", { ascending: false })
      .limit(50);
    if (data) setConversations(data);
  };

  const newChat = () => {
    setMessages([]);
    setCurrentConvId(null);
    setInput("");
  };

  const loadConversation = async (id: string) => {
    const { data } = await supabase
      .from("conversations")
      .select("messages")
      .eq("id", id)
      .single();
    if (data?.messages) {
      setMessages(data.messages as unknown as Message[]);
      setCurrentConvId(id);
      setSidebarOpen(false);
    }
  };

  const deleteConversation = async (id: string) => {
    await supabase.from("conversations").delete().eq("id", id);
    if (currentConvId === id) newChat();
    loadConversations();
  };

  const saveConversation = async (msgs: Message[]) => {
    const title = msgs[0]?.content?.slice(0, 50) || "محادثة جديدة";
    if (currentConvId) {
      await supabase
        .from("conversations")
        .update({ messages: msgs as any, title, last_active: new Date().toISOString() })
        .eq("id", currentConvId);
    } else {
      const { data } = await supabase
        .from("conversations")
        .insert({ user_id: user!.id, messages: msgs as any, title, last_active: new Date().toISOString() })
        .select("id")
        .single();
      if (data) setCurrentConvId(data.id);
    }
    loadConversations();
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg: Message = { role: "user", content: input.trim() };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setInput("");
    setIsLoading(true);

    try {
      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: newMsgs, model: selectedModel }),
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
      let streamDone = false;

      while (!streamDone) {
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
          if (jsonStr === "[DONE]") { streamDone = true; break; }
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantSoFar += content;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
                }
                return [...prev, { role: "assistant", content: assistantSoFar }];
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      const finalMsgs = [...newMsgs, { role: "assistant" as const, content: assistantSoFar }];
      setMessages(finalMsgs);
      await saveConversation(finalMsgs);
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const generateImage = async () => {
    const prompt = window.prompt("صف الصورة التي تريد إنشاءها:");
    if (!prompt) return;
    setIsLoading(true);
    const userMsg: Message = { role: "user", content: `🎨 إنشاء صورة: ${prompt}` };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-image`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ prompt }),
      });
      const data = await resp.json();
      if (data.error) throw new Error(data.error);
      const assistantMsg: Message = { role: "assistant", content: `تم إنشاء الصورة:\n\n![صورة](${data.imageUrl})` };
      const finalMsgs = [...messages, userMsg, assistantMsg];
      setMessages(finalMsgs);
      await saveConversation(finalMsgs);
    } catch (err: any) {
      toast({ title: "خطأ في توليد الصورة", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const webSearch = async () => {
    const query = window.prompt("ابحث عن:");
    if (!query) return;
    const userMsg: Message = { role: "user", content: `🔍 بحث: ${query}` };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/web-search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ query }),
      });
      const data = await resp.json();
      if (data.error) throw new Error(data.error);
      const assistantMsg: Message = { role: "assistant", content: data.result };
      const finalMsgs = [...messages, userMsg, assistantMsg];
      setMessages(finalMsgs);
      await saveConversation(finalMsgs);
    } catch (err: any) {
      toast({ title: "خطأ في البحث", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 right-0 z-40 w-72 bg-card border-l border-border transform transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "translate-x-full"} md:relative md:translate-x-0`}>
        <div className="flex flex-col h-full p-4">
          <div className="flex items-center justify-between mb-4">
            <Button onClick={newChat} className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="ml-2 h-4 w-4" />
              محادثة جديدة
            </Button>
            <Button variant="ghost" size="icon" className="md:hidden mr-2" onClick={() => setSidebarOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-hide space-y-1">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className={`group flex items-center justify-between rounded-lg px-3 py-2 cursor-pointer transition-colors ${
                  currentConvId === conv.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary"
                }`}
                onClick={() => loadConversation(conv.id)}
              >
                <div className="flex items-center gap-2 truncate flex-1">
                  <MessageSquare className="h-4 w-4 shrink-0" />
                  <span className="truncate text-sm">{conv.title}</span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </button>
              </div>
            ))}
          </div>

          {/* User section */}
          <div className="border-t border-border pt-4 space-y-2">
            <button
              onClick={() => navigate("/profile")}
              className="flex items-center gap-3 w-full rounded-lg px-3 py-2 hover:bg-secondary transition-colors"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary text-sm font-bold">
                {profile?.display_name?.[0] || "م"}
              </div>
              <span className="text-sm text-foreground truncate">{profile?.display_name || "مستخدم"}</span>
            </button>
            <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-destructive" onClick={signOut}>
              <LogOut className="ml-2 h-4 w-4" />
              تسجيل الخروج
            </Button>
          </div>
        </div>
      </div>

      {/* Main Chat */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border glass">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              <span className="font-bold text-foreground">MENZO-AI</span>
            </div>
          </div>
          {/* Model picker */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowModelPicker(!showModelPicker)}
              className="border-border text-foreground"
            >
              {MODELS.find((m) => m.id === selectedModel)?.label}
              <ChevronDown className="mr-2 h-4 w-4" />
            </Button>
            {showModelPicker && (
              <div className="absolute left-0 top-full mt-2 w-64 rounded-xl glass border border-border p-2 z-50">
                {MODELS.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => { setSelectedModel(m.id); setShowModelPicker(false); }}
                    className={`w-full text-right rounded-lg px-3 py-2 text-sm transition-colors ${
                      selectedModel === m.id ? "bg-primary/10 text-primary" : "text-foreground hover:bg-secondary"
                    }`}
                  >
                    <div className="font-medium">{m.label}</div>
                    <div className="text-xs text-muted-foreground">{m.desc}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 scrollbar-hide">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/10 mb-6">
                <Sparkles className="h-10 w-10 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                أهلاً {profile?.display_name || ""}! 👋
              </h2>
              <p className="text-muted-foreground max-w-md">
                أنا MENZO-AI، معلمك الذكي. اسألني عن أي مادة من مواد الصف الثالث الثانوي الأزهري.
              </p>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    msg.role === "user" ? "bg-accent text-accent-foreground" : "bg-primary/20 text-primary"
                  }`}>
                    {msg.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </div>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
                  }`}>
                    <div className="prose prose-sm prose-invert max-w-none text-inherit">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && messages[messages.length - 1]?.role === "user" && (
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="rounded-2xl bg-secondary px-4 py-3">
                    <div className="flex gap-1">
                      <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0s" }} />
                      <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0.2s" }} />
                      <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0.4s" }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEnd} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-border p-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-end gap-2 rounded-2xl glass p-2">
              {/* Plus menu */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-primary shrink-0"
                  onClick={() => setShowPlus(!showPlus)}
                >
                  <Plus className="h-5 w-5" />
                </Button>
                {showPlus && (
                  <div className="absolute bottom-full right-0 mb-2 w-48 rounded-xl glass border border-border p-2 z-50">
                    <button
                      onClick={() => { setShowPlus(false); generateImage(); }}
                      className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm text-foreground hover:bg-secondary transition-colors"
                    >
                      <Image className="h-4 w-4 text-accent" />
                      توليد صورة
                    </button>
                    <button
                      onClick={() => { setShowPlus(false); webSearch(); }}
                      className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm text-foreground hover:bg-secondary transition-colors"
                    >
                      <Search className="h-4 w-4 text-primary" />
                      بحث في الإنترنت
                    </button>
                  </div>
                )}
              </div>

              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="اكتب رسالتك هنا..."
                rows={1}
                className="flex-1 resize-none bg-transparent text-foreground placeholder:text-muted-foreground outline-none py-2 px-2 max-h-32"
                style={{ minHeight: "40px" }}
              />

              <Button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                size="icon"
                className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0 rounded-xl"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-background/50 backdrop-blur-sm z-30 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  );
};

export default Chat;
