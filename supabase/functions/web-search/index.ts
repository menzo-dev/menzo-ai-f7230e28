import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { query, engine } = await req.json();
    if (!query) throw new Error("يرجى كتابة استعلام البحث");

    let searchResults = "";

    if (engine === "exa") {
      const EXA_API_KEY = Deno.env.get("EXA_API_KEY");
      if (!EXA_API_KEY) throw new Error("مفتاح Exa غير مُعدّ");

      const resp = await fetch("https://api.exa.ai/search", {
        method: "POST",
        headers: { "x-api-key": EXA_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          type: "auto",
          numResults: 8,
          contents: { text: { maxCharacters: 500 } },
        }),
      });
      const data = await resp.json();
      if (data.results) {
        searchResults = data.results.map((r: any, i: number) =>
          `### ${i + 1}. [${r.title}](${r.url})\n${r.text || ""}`
        ).join("\n\n");
      }
    } else if (engine === "tavily") {
      const TAVILY_API_KEY = Deno.env.get("TAVILY_API_KEY");
      if (!TAVILY_API_KEY) throw new Error("مفتاح Tavily غير مُعدّ");

      const resp = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: TAVILY_API_KEY,
          query,
          max_results: 8,
          include_answer: true,
        }),
      });
      const data = await resp.json();
      if (data.answer) searchResults += `**الملخص:** ${data.answer}\n\n---\n\n`;
      if (data.results) {
        searchResults += data.results.map((r: any, i: number) =>
          `### ${i + 1}. [${r.title}](${r.url})\n${r.content || ""}`
        ).join("\n\n");
      }
    } else {
      // Default: AI-powered search via Lovable AI
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: "أنت محرك بحث ذكي. قدم إجابة شاملة ومنظمة بالعربية مع مصادر. استخدم Markdown." },
            { role: "user", content: `ابحث عن: ${query}` },
          ],
        }),
      });

      if (!response.ok) throw new Error("فشل البحث");
      const data = await response.json();
      searchResults = data.choices?.[0]?.message?.content || "لم يتم العثور على نتائج";
    }

    return new Response(JSON.stringify({ result: searchResults || "لم يتم العثور على نتائج" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("web-search error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "خطأ غير معروف" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
