import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { prompt, model } = await req.json();
    if (!prompt) throw new Error("الرجاء كتابة وصف للصورة");

    let imageUrl: string | null = null;

    if (model === "together" || model === "together-flux") {
      // Together AI - FLUX.1
      const TOGETHER_API_KEY = Deno.env.get("TOGETHER_API_KEY");
      if (!TOGETHER_API_KEY) throw new Error("مفتاح Together AI غير مُعدّ");

      const response = await fetch("https://api.together.xyz/v1/images/generations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${TOGETHER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "black-forest-labs/FLUX.1-schnell",
          prompt,
          width: 1024,
          height: 1024,
          steps: 4,
          n: 1,
        }),
      });

      if (!response.ok) {
        const t = await response.text();
        console.error("Together AI error:", response.status, t);
        throw new Error("فشل في توليد الصورة عبر Together AI");
      }

      const data = await response.json();
      imageUrl = data.data?.[0]?.url || null;
      if (!imageUrl && data.data?.[0]?.b64_json) {
        imageUrl = `data:image/png;base64,${data.data[0].b64_json}`;
      }
    } else if (model === "leonardo") {
      // Leonardo AI
      const LEONARDO_API_KEY = Deno.env.get("LEONARDO_API_KEY");
      if (!LEONARDO_API_KEY) throw new Error("مفتاح Leonardo AI غير مُعدّ");

      // Create generation
      const createResp = await fetch("https://cloud.leonardo.ai/api/rest/v1/generations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LEONARDO_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          modelId: "6b645e3a-d64f-4341-a6d8-7a3690fbf042", // Leonardo Lightning XL
          width: 1024,
          height: 1024,
          num_images: 1,
        }),
      });

      if (!createResp.ok) {
        const t = await createResp.text();
        console.error("Leonardo create error:", createResp.status, t);
        throw new Error("فشل في بدء توليد الصورة");
      }

      const createData = await createResp.json();
      const generationId = createData.sdGenerationJob?.generationId;
      if (!generationId) throw new Error("لم يتم الحصول على معرف التوليد");

      // Poll for result (max 30 seconds)
      for (let i = 0; i < 15; i++) {
        await new Promise(r => setTimeout(r, 2000));
        const pollResp = await fetch(`https://cloud.leonardo.ai/api/rest/v1/generations/${generationId}`, {
          headers: { Authorization: `Bearer ${LEONARDO_API_KEY}` },
        });
        const pollData = await pollResp.json();
        const images = pollData.generations_by_pk?.generated_images;
        if (images && images.length > 0) {
          imageUrl = images[0].url;
          break;
        }
      }
    } else {
      // Default: Lovable AI Gateway (Gemini image model)
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image",
          messages: [{ role: "user", content: `Generate a high quality image: ${prompt}` }],
          modalities: ["image", "text"],
        }),
      });

      if (!response.ok) {
        const t = await response.text();
        console.error("Image generation error:", response.status, t);
        throw new Error("فشل في توليد الصورة");
      }

      const data = await response.json();
      // Try multiple paths to find the image
      imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

      if (!imageUrl) {
        const parts = data.choices?.[0]?.message?.content;
        if (typeof parts === "object" && Array.isArray(parts)) {
          for (const part of parts) {
            if (part.type === "image_url") {
              imageUrl = part.image_url?.url;
              break;
            }
          }
        }
      }

      if (!imageUrl) {
        const inlineData = data.choices?.[0]?.message?.inline_data;
        if (inlineData) {
          imageUrl = `data:${inlineData.mime_type};base64,${inlineData.data}`;
        }
      }
    }

    if (!imageUrl) {
      return new Response(JSON.stringify({ error: "لم يتم إنشاء صورة — حاول وصف الصورة بشكل مختلف" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ imageUrl }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-image error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "خطأ غير معروف" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
