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
  if (model.startsWith("huggingface/")) {
    return { url: "https://api-inference.huggingface.co/models/" + model.replace("huggingface/", ""), key: Deno.env.get("HUGGINGFACE_API_KEY")!, model: model.replace("huggingface/", ""), isHuggingFace: true };
  }
  return { url: "https://ai.gateway.lovable.dev/v1/chat/completions", key: Deno.env.get("LOVABLE_API_KEY")!, model: model || "google/gemini-3-flash-preview" };
}

// Optiic image analysis - improved
async function analyzeImageWithOptiic(imageUrl: string): Promise<string> {
  const OPTIIC_API_KEY = Deno.env.get("OPTIIC_API_KEY");
  if (!OPTIIC_API_KEY) {
    console.error("OPTIIC_API_KEY not set");
    return "";
  }
  
  try {
    // Try OCR first
    const resp = await fetch("https://api.optiic.dev/process", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey: OPTIIC_API_KEY, url: imageUrl, mode: "ocr" }),
    });
    if (!resp.ok) {
      console.error("Optiic error:", resp.status, await resp.text());
      return "";
    }
    const data = await resp.json();
    const ocrText = data.text || "";
    
    // Also try to get image description
    let description = "";
    try {
      const descResp = await fetch("https://api.optiic.dev/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: OPTIIC_API_KEY, url: imageUrl, mode: "describe" }),
      });
      if (descResp.ok) {
        const descData = await descResp.json();
        description = descData.description || descData.text || "";
      }
    } catch { /* ignore description errors */ }
    
    let result = "";
    if (ocrText.trim()) result += `نص مستخرج من الصورة (OCR):\n${ocrText}`;
    if (description.trim()) result += `${result ? "\n\n" : ""}وصف الصورة:\n${description}`;
    return result;
  } catch (e) {
    console.error("Optiic failed:", e);
    return "";
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, model, userName, userBio, imageUrl } = await req.json();
    const config = getProviderConfig(model || "google/gemini-3-flash-preview");

    if (!config.key) {
      return new Response(JSON.stringify({ error: "مفتاح API غير مُعدّ لهذا النموذج" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If there's an image URL, analyze it with Optiic and add context
    let imageContext = "";
    if (imageUrl) {
      console.log("Analyzing image:", imageUrl.substring(0, 100));
      const analysisResult = await analyzeImageWithOptiic(imageUrl);
      if (analysisResult) {
        imageContext = `\n\n[الطالب أرفق صورة وهذا تحليلها:\n${analysisResult}\n]\nقم بتحليل هذا المحتوى والرد عليه بما يناسب سياق المحادثة. إذا كانت الصورة تحتوي على سؤال أو مسألة، قم بحلها خطوة بخطوة.`;
      } else {
        imageContext = "\n\n[الطالب أرفق صورة لكن لم نتمكن من قراءة محتواها. اطلب منه وصف محتوى الصورة أو كتابة السؤال نصياً.]";
      }
    }

    const userContext = userName ? `\n\nاسم الطالب الحالي: ${userName}${userBio ? `\nوصف الطالب: ${userBio}` : ""}` : "";

    const systemPrompt = `أنت MENZO-AI، معلم ذكي متخصص في تدريس طلاب الصف الثالث الثانوي الأزهري (مذهب شافعي).
أنت مُعدّ ومطوّر بواسطة Mohamed Walid El-manzlawy (محمد وليد المنزلاوي) — هو المطور وليس أستاذ.
الطالب يدرس عند أساتذة متميزين منهم أ/محمد حجازي (شرعي) وأ/وليد الشيخ (عربي).

مهمتك: شرح، تلخيص، وضع أسئلة، إعداد امتحانات محاكاة بالاعتماد الحصري على الكتب الرسمية المعتمدة من الأزهر للصف الثالث الثانوي.

📚 الكتب الأساسية الرسمية:
🔹 القرآن وعلومه: القرآن الكريم، التفسير الموضوعي، الحديث الشريف
🔹 الفقه والعقيدة: الإقناع وشرحه، جوهرة التوحيد وشرحها (المذهب الشافعي)
🔹 اللغة العربية: ألفية ابن مالك، شرح ابن عقيل، شذا العرف، البلاغة الواضحة، الأدب والنصوص
📘 كتب الدعم: المرشد في مناهج الأزهر، سلاح الأزهري

تخصصاتك: الفقه (شافعي أولاً)، الحديث، التفسير، أصول الفقه، التوحيد، النحو، الصرف، البلاغة، الأدب، النصوص، المطالعة، الفيزياء، الكيمياء، الأحياء، الرياضيات (استاتيكا، ديناميكا، جبر، هندسة فراغية، تفاضل وتكامل).

🎯 قواعد كتابة المحتوى:
1. اكتب بالعربية الفصحى مع تبسيط واضح
2. **المعادلات والقوانين**: اكتبها دائماً داخل code blocks حتى تظهر بشكل واضح ويسهل نسخها:
   - استخدم \`\`\` لكتابة القوانين مثل: \`\`\`V = I × R\`\`\`
   - لا تستخدم أبداً رموز LaTeX مثل $ أو \\( \\)
3. **الروابط**: اكتبها بتنسيق Markdown الواضح: [نص الرابط](URL)
4. إذا ذكرت رابط يوتيوب، اكتبه كرابط قابل للنقر
5. نسّق الإجابة بـ Markdown مع عناوين واضحة (### ) ونقاط (- ) وتمييز (**bold**)
6. في نهاية كل إجابة اقترح 2-3 أسئلة متعلقة
7. رحّب بالطالب باسمه إن كان معروفاً
8. ذكّره بأهمية المذاكرة — امتحانات الأزهر يوم 6/6/2026
9. في الفقه التزم بالمذهب الشافعي
10. استشهد بالآيات والأحاديث
11. إذا طُلب منك البحث عن شيء: ابحث وقدم إجابة شاملة مع المصادر
12. إذا طُلب منك إنشاء صورة: وضّح أنك ستنشئ الصورة${userContext}${imageContext}`;

    // Anthropic
    if ((config as any).isAnthropic) {
      const response = await fetch(config.url, {
        method: "POST",
        headers: { "x-api-key": config.key, "Content-Type": "application/json", "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: config.model, max_tokens: 4096, system: systemPrompt, messages: messages.map((m: any) => ({ role: m.role, content: m.content })), stream: true }),
      });
      if (!response.ok) {
        console.error("Anthropic error:", response.status, await response.text());
        // Fallback
        const fallbackKey = Deno.env.get("LOVABLE_API_KEY");
        if (fallbackKey) {
          const fbResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${fallbackKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({ model: "google/gemini-3-flash-preview", messages: [{ role: "system", content: systemPrompt }, ...messages], stream: true }),
          });
          if (fbResp.ok) return new Response(fbResp.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
        }
        return new Response(JSON.stringify({ error: "خطأ في الاتصال بـ Claude" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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

    // HuggingFace
    if ((config as any).isHuggingFace) {
      const response = await fetch(config.url, {
        method: "POST",
        headers: { Authorization: `Bearer ${config.key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ inputs: systemPrompt + "\n\n" + messages.map((m: any) => `${m.role}: ${m.content}`).join("\n"), parameters: { max_new_tokens: 2048, temperature: 0.7 } }),
      });
      if (!response.ok) {
        console.error("HuggingFace error:", response.status);
        const fallbackKey = Deno.env.get("LOVABLE_API_KEY");
        if (fallbackKey) {
          const fbResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${fallbackKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({ model: "google/gemini-3-flash-preview", messages: [{ role: "system", content: systemPrompt }, ...messages], stream: true }),
          });
          if (fbResp.ok) return new Response(fbResp.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
        }
        return new Response(JSON.stringify({ error: "خطأ في الاتصال بـ HuggingFace" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const data = await response.json();
      const text = Array.isArray(data) ? data[0]?.generated_text || "" : data?.generated_text || "";
      return new Response(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\ndata: [DONE]\n\n`, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // Standard OpenAI-compatible
    const allMessages = [{ role: "system", content: systemPrompt }, ...messages];
    let response = await fetch(config.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.key}`, "Content-Type": "application/json",
        ...(model?.startsWith("openrouter/") || model?.startsWith("qwen/") || model?.startsWith("meta/") || model?.startsWith("mistral/") ? { "HTTP-Referer": "https://menzo-ai.lovable.app", "X-Title": "MENZO-AI" } : {}),
      },
      body: JSON.stringify({ model: config.model, messages: allMessages, stream: true }),
    });

    // Universal fallback for any non-Lovable provider failure
    if (!response.ok) {
      const isLovableGateway = config.url.includes("ai.gateway.lovable.dev");
      if (!isLovableGateway) {
        console.warn(`Provider failed for model ${config.model}: ${response.status}, falling back to Lovable AI`);
        const fallbackKey = Deno.env.get("LOVABLE_API_KEY");
        if (fallbackKey) {
          response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${fallbackKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({ model: "google/gemini-3-flash-preview", messages: allMessages, stream: true }),
          });
        }
      }
    }

    if (!response.ok) {
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