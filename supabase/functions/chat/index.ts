import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Provider routing based on model prefix
function getProviderConfig(model: string) {
  // Lovable AI Gateway models
  if (model.startsWith("google/") || model.startsWith("openai/")) {
    return {
      url: "https://ai.gateway.lovable.dev/v1/chat/completions",
      key: Deno.env.get("LOVABLE_API_KEY")!,
      model,
    };
  }
  // DeepSeek
  if (model.startsWith("deepseek/")) {
    return {
      url: "https://api.deepseek.com/chat/completions",
      key: Deno.env.get("DEEPSEEK_API_KEY")!,
      model: model.replace("deepseek/", ""),
    };
  }
  // xAI / Grok
  if (model.startsWith("xai/")) {
    return {
      url: "https://api.x.ai/v1/chat/completions",
      key: Deno.env.get("XAI_API_KEY")!,
      model: model.replace("xai/", ""),
    };
  }
  // Anthropic / Claude
  if (model.startsWith("anthropic/")) {
    return {
      url: "https://api.anthropic.com/v1/messages",
      key: Deno.env.get("ANTHROPIC_API_KEY")!,
      model: model.replace("anthropic/", ""),
      isAnthropic: true,
    };
  }
  // OpenRouter free models (qwen, meta-llama, etc.)
  if (model.startsWith("openrouter/")) {
    return {
      url: "https://openrouter.ai/api/v1/chat/completions",
      key: Deno.env.get("OPENAI_API_KEY")!, // OpenRouter accepts OpenAI-format keys
      model: model.replace("openrouter/", ""),
    };
  }
  // Default to Lovable AI
  return {
    url: "https://ai.gateway.lovable.dev/v1/chat/completions",
    key: Deno.env.get("LOVABLE_API_KEY")!,
    model: model || "google/gemini-3-flash-preview",
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, model } = await req.json();
    const config = getProviderConfig(model || "google/gemini-3-flash-preview");

    if (!config.key) {
      return new Response(JSON.stringify({ error: "مفتاح API غير مُعدّ لهذا النموذج" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `أنت MENZO-AI، معلم ذكي متخصص في تدريس طلاب الصف الثالث الثانوي الأزهري.
أنت متخصص في المنهج الأزهري بكل فروعه: الفقه الإسلامي (على المذاهب الأربعة)، الحديث الشريف (متن وسند ودراية)، التفسير (جلالين/بيضاوي)، أصول الفقه، التوحيد والعقيدة، النحو (ألفية ابن مالك)، الصرف، البلاغة (معاني/بيان/بديع)، الأدب العربي، النصوص، المطالعة، الرياضيات، الفيزياء، الكيمياء، الأحياء.

قواعدك الذهبية:
1. تحدث بالعربية الفصحى مع تبسيط واضح
2. استشهد بالآيات القرآنية والأحاديث النبوية
3. اربط كل إجابة بالمنهج الأزهري المقرر
4. قدم أمثلة عملية وأسئلة تدريبية
5. شجّع الطالب دائماً وكن صبوراً
6. استخدم تنسيق Markdown لتنظيم الإجابات
7. إذا سُئلت عن شيء خارج التعليم، وجّه المحادثة للفائدة العلمية
8. قدم المعلومة من المصادر المعتمدة في الأزهر`;

    // Anthropic has different API format
    if ((config as any).isAnthropic) {
      const response = await fetch(config.url, {
        method: "POST",
        headers: {
          "x-api-key": config.key,
          "Content-Type": "application/json",
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: config.model,
          max_tokens: 4096,
          system: systemPrompt,
          messages: messages.map((m: any) => ({ role: m.role, content: m.content })),
          stream: true,
        }),
      });

      if (!response.ok) {
        const t = await response.text();
        console.error("Anthropic error:", response.status, t);
        return new Response(JSON.stringify({ error: "خطأ في الاتصال بـ Claude" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Transform Anthropic SSE to OpenAI format
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
                  const openaiFormat = { choices: [{ delta: { content: parsed.delta.text } }] };
                  await writer.write(encoder.encode(`data: ${JSON.stringify(openaiFormat)}\n\n`));
                }
              } catch {}
            }
          }
          await writer.write(encoder.encode("data: [DONE]\n\n"));
        } finally {
          writer.close();
        }
      })();

      return new Response(readable, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // Standard OpenAI-compatible API (Lovable AI, DeepSeek, xAI, OpenRouter)
    const response = await fetch(config.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "تم تجاوز الحد المسموح، حاول لاحقاً" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "يرجى إضافة رصيد للاستمرار" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      return new Response(JSON.stringify({ error: "خطأ في الاتصال بالذكاء الاصطناعي" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "خطأ غير معروف" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
