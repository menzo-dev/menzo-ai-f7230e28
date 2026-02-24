import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { prompt } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Use the image generation model
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-pro-image-preview",
        messages: [{ role: "user", content: `Generate an image: ${prompt}` }],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("Image generation error:", response.status, t);
      return new Response(JSON.stringify({ error: "فشل في توليد الصورة: " + t }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    console.log("Image response keys:", JSON.stringify(Object.keys(data)));
    
    // Try multiple paths to find the image
    let imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    // Check inline_data format
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

    // Check for base64 inline data
    if (!imageUrl) {
      const inlineData = data.choices?.[0]?.message?.inline_data;
      if (inlineData) {
        imageUrl = `data:${inlineData.mime_type};base64,${inlineData.data}`;
      }
    }

    if (!imageUrl) {
      console.error("Full image response:", JSON.stringify(data).substring(0, 2000));
      return new Response(JSON.stringify({ 
        error: "لم يتم إنشاء صورة — حاول وصف الصورة بشكل مختلف",
        debug: JSON.stringify(data.choices?.[0]?.message || {}).substring(0, 500)
      }), {
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
