import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen, Download, Eye, X, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Book {
  id: string;
  title: string;
  description: string | null;
  subject: string | null;
  file_url: string;
  thumbnail_url: string | null;
  created_at: string;
}

const Books = () => {
  const navigate = useNavigate();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingPdf, setViewingPdf] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadBooks();
  }, []);

  const loadBooks = async () => {
    const { data } = await supabase.from("books").select("*").order("created_at", { ascending: false });
    if (data) setBooks(data as Book[]);
    setLoading(false);
  };

  const filtered = books.filter(b =>
    b.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (b.subject || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (viewingPdf) {
    return (
      <div className="h-screen flex flex-col bg-background">
        <div className="shrink-0 flex items-center gap-3 px-4 py-3 glass-strong border-b border-border/40">
          <button onClick={() => setViewingPdf(null)} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
          <span className="text-sm font-bold text-foreground flex-1">عرض الكتاب</span>
          <a href={viewingPdf} download className="text-primary text-sm hover:underline flex items-center gap-1">
            <Download className="h-4 w-4" /> تحميل
          </a>
        </div>
        <iframe src={viewingPdf} className="flex-1 w-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <button onClick={() => navigate("/chat")} className="mb-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> العودة
        </button>

        <h1 className="text-3xl font-bold mb-2"><span className="text-gradient-cosmic">📚 قسم الكتب</span></h1>
        <p className="text-muted-foreground mb-6 text-sm">تصفح وحمّل الكتب والمذكرات الدراسية</p>

        <div className="relative mb-6">
          <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            placeholder="ابحث عن كتاب..."
            className="w-full pr-9 bg-secondary/50 rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border/30 focus:border-primary/50" />
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>لا توجد كتب متاحة حالياً</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(book => (
              <div key={book.id} className="glass rounded-2xl overflow-hidden hover:border-primary/40 transition-all group">
                <div className="h-40 bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                  {book.thumbnail_url ? (
                    <img src={book.thumbnail_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <BookOpen className="h-16 w-16 text-primary/30" />
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-foreground text-sm mb-1">{book.title}</h3>
                  {book.subject && <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">{book.subject}</span>}
                  {book.description && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{book.description}</p>}
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" onClick={() => setViewingPdf(book.file_url)} className="flex-1 bg-primary text-primary-foreground text-xs">
                      <Eye className="h-3.5 w-3.5 ml-1" /> عرض
                    </Button>
                    <a href={book.file_url} download>
                      <Button size="sm" variant="outline" className="border-border/30 text-xs">
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    </a>
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

export default Books;