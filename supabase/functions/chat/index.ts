import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function getProviderConfig(model: string) {
  if (model.startsWith("google/") || model.startsWith("openai/")) {
    return { url: "https://ai.gateway.lovable.dev/v1/chat/completions", key: Deno.env.get("LOVABLE_API_KEY")!, model };
  }
  if (model.startsWith("deepseek/")) {
    return { url: "https://api.deepseek.com/chat/completions", key: Deno.env.get("DEEPSEEK_API_KEY")!, model: model.replace("deepseek/", "") };
  }
  if (model.startsWith("xai/")) {
    return { url: "https://api.x.ai/v1/chat/completions", key: Deno.env.get("XAI_API_KEY")!, model: model.replace("xai/", "") };
  }
  if (model.startsWith("anthropic/")) {
    return { url: "https://api.anthropic.com/v1/messages", key: Deno.env.get("ANTHROPIC_API_KEY")!, model: model.replace("anthropic/", ""), isAnthropic: true };
  }
  if (model.startsWith("openrouter/")) {
    return { url: "https://openrouter.ai/api/v1/chat/completions", key: Deno.env.get("OPENROUTER_API_KEY")!, model: model.replace("openrouter/", "") };
  }
  if (model.startsWith("qwen/") || model.startsWith("meta/") || model.startsWith("mistral/")) {
    return { url: "https://openrouter.ai/api/v1/chat/completions", key: Deno.env.get("OPENROUTER_API_KEY")!, model };
  }
  return { url: "https://ai.gateway.lovable.dev/v1/chat/completions", key: Deno.env.get("LOVABLE_API_KEY")!, model: model || "google/gemini-3-flash-preview" };
}

// Models that support native vision (multimodal input)
function supportsVision(model: string): boolean {
  return /google\/gemini|openai\/gpt-[45]|anthropic\/claude|openrouter\/(google\/gemini|openai\/gpt|anthropic)/i.test(model);
}

// Optiic OCR fallback for non-vision models
async function analyzeImageWithOptiic(imageUrl: string): Promise<string> {
  const OPTIIC_API_KEY = Deno.env.get("OPTIIC_API_KEY");
  if (!OPTIIC_API_KEY) return "";
  try {
    const resp = await fetch("https://api.optiic.dev/process", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey: OPTIIC_API_KEY, url: imageUrl, mode: "ocr" }),
    });
    if (!resp.ok) return "";
    const data = await resp.json();
    return data.text || "";
  } catch (e) {
    console.error("Optiic failed:", e);
    return "";
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, model, userName, userBio, imageUrl } = await req.json();
    const modelId = model || "google/gemini-3-flash-preview";
    const config = getProviderConfig(modelId);
    const hasVision = supportsVision(modelId);

    if (!config.key) {
      return new Response(JSON.stringify({ error: "مفتاح API غير مُعدّ لهذا النموذج" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For non-vision models, fall back to OCR text
    let imageContext = "";
    if (imageUrl && !hasVision) {
      const ocr = await analyzeImageWithOptiic(imageUrl);
      imageContext = ocr
        ? `\n\n[الطالب أرفق صورة. النص المستخرج منها بالـ OCR:\n${ocr}\n] حلّل المحتوى وأجب عن أي سؤال فيها خطوة بخطوة.`
        : "\n\n[الطالب أرفق صورة لكن لم نتمكن من قراءتها — اطلب منه وصفها أو كتابة السؤال نصياً.]";
    }

    const userContext = userName ? `\n\nاسم الطالب الحالي: ${userName}${userBio ? `\nوصف الطالب: ${userBio}` : ""}` : "";

    const systemPrompt = `أنت MENZO-AI، معلم ذكي متخصص في تدريس طلاب الصف الثالث الثانوي الأزهري (مذهب شافعي).
أنت مُعدّ ومطوّر بواسطة Mohamed Walid El-manzlawy (محمد وليد المنزلاوي).
الطالب يدرس عند أساتذة متميزين منهم أ/محمد حجازي (شرعي) وأ/وليد الشيخ (عربي).

📚 الكتب الرسمية: الإقناع، جوهرة التوحيد، ألفية ابن مالك، شرح ابن عقيل، شذا العرف، البلاغة الواضحة، الأدب والنصوص، التفسير الموضوعي، الحديث الشريف.

🎯 قواعد:
1. اكتب بالعربية الفصحى بأسلوب واضح ومبسط
2. المعادلات والقوانين دائماً داخل code blocks: \`\`\`V = I × R\`\`\` — لا تستخدم LaTeX أبداً ($ أو \\( \\))
3. روابط Markdown: [نص](URL)
4. نسّق بـ Markdown: ### عناوين، - نقاط، **bold**
5. اقترح 2-3 أسئلة متعلقة في النهاية
6. ذكّر الطالب: امتحانات الأزهر 6/6/2026
7. في الفقه التزم بالمذهب الشافعي
8. إذا أرفق الطالب صورة فحلل محتواها مباشرة وأجب${userContext}${imageContext}`;

    // Build messages — inject image natively for vision models
    const buildMessages = () => {
      const out = [{ role: "system", content: systemPrompt }];
      messages.forEach((m: any, idx: number) => {
        const isLastUser = idx === messages.length - 1 && m.role === "user";
        if (isLastUser && imageUrl && hasVision) {
          out.push({
            role: m.role,
            content: [
              { type: "text", text: m.content || "حلّل هذه الصورة وأجب عن السؤال." },
              { type: "image_url", image_url: { url: imageUrl } },
            ] as any,
          });
        } else {
          out.push({ role: m.role, content: m.content });
        }
      });
      return out;
    };

    // Anthropic
    if ((config as any).isAnthropic) {
      const anthroMessages = messages.map((m: any, idx: number) => {
        const isLastUser = idx === messages.length - 1 && m.role === "user";
        if (isLastUser && imageUrl && hasVision) {
          return {
            role: m.role,
            content: [
              { type: "text", text: m.content || "حلّل هذه الصورة" },
              { type: "image", source: { type: "url", url: imageUrl } },
            ],
          };
        }
        return { role: m.role, content: m.content };
      });
      const response = await fetch(config.url, {
        method: "POST",
        headers: { "x-api-key": config.key, "Content-Type": "application/json", "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: config.model, max_tokens: 4096, system: systemPrompt, messages: anthroMessages, stream: true }),
      });
      if (!response.ok) {
        console.error("Anthropic error:", response.status, await response.text());
        return fallbackToLovable(systemPrompt, buildMessages());
      }
      const { readable, writable } = new TransformStream();
      const writer = writable.getWriter();
      const encoder = new TextEncoder();
      (async () => {
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";
            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              const jsonStr = line.slice(6).trim();
              if (!jsonStr || jsonStr === "[DONE]") continue;
              try {
                const parsed = JSON.parse(jsonStr);
                if (parsed.type === "content_block_delta" && parsed.delta?.text) {
                  await writer.write(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: parsed.delta.text } }] })}\n\n`));
                }
              } catch {}
            }
          }
          await writer.write(encoder.encode("data: [DONE]\n\n"));
        } finally { writer.close(); }
      })();
      return new Response(readable, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
    }

    // Standard OpenAI-compatible
    const allMessages = buildMessages();
    let response = await fetch(config.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.key}`, "Content-Type": "application/json",
        ...(modelId.startsWith("openrouter/") || modelId.startsWith("qwen/") || modelId.startsWith("meta/") || modelId.startsWith("mistral/")
          ? { "HTTP-Referer": "https://menzo-ai.lovable.app", "X-Title": "MENZO-AI" } : {}),
      },
      body: JSON.stringify({ model: config.model, messages: allMessages, stream: true }),
    });

    // Universal fallback for any non-Lovable provider failure
    if (!response.ok) {
      const isLovable = config.url.includes("ai.gateway.lovable.dev");
      if (!isLovable) {
        console.warn(`Provider failed (${config.model} ${response.status}), falling back to Lovable AI`);
        return fallbackToLovable(systemPrompt, allMessages);
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      if (response.status === 429) return new Response(JSON.stringify({ error: "تم تجاوز الحد المسموح، حاول لاحقاً" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "يرجى إضافة رصيد للاستمرار" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: "خطأ في الاتصال بالذكاء الاصطناعي" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(response.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "خطأ غير معروف" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function fallbackToLovable(systemPrompt: string, allMessages: any[]) {
  const fallbackKey = Deno.env.get("LOVABLE_API_KEY");
  if (!fallbackKey) {
    return new Response(JSON.stringify({ error: "خطأ في الاتصال" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const fbResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${fallbackKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "google/gemini-3-flash-preview", messages: allMessages, stream: true }),
  });
  if (!fbResp.ok) {
    return new Response(JSON.stringify({ error: "تعذر الاتصال بالذكاء الاصطناعي" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  return new Response(fbResp.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
}
