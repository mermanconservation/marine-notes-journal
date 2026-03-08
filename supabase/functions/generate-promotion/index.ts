import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { type, platform, topic, tone, articleTitle, articleDoi } = await req.json();

    if (type === "text") {
      const websiteUrl = "https://www.marinenotesjournal.com";
      
      let systemPrompt = `You are a social media marketing expert for Marine Notes Journal, a peer-reviewed open-access marine science journal. 
The journal website is ${websiteUrl}. Always include this URL in promotional content.
The journal is the first Full AI-Edited and Peer-Reviewed Marine Science Journal.
Generate engaging, professional promotional content that drives traffic to the website.
Do NOT use markdown formatting. Use plain text with emojis where appropriate.`;

      let userPrompt = "";

      if (platform === "twitter") {
        userPrompt = `Write a compelling Twitter/X post (max 280 characters) about Marine Notes Journal. 
Topic focus: ${topic || "general journal promotion"}.
Tone: ${tone || "professional and engaging"}.
${articleTitle ? `Mention this specific article: "${articleTitle}" (DOI: ${articleDoi})` : ""}
Include relevant hashtags and the website URL ${websiteUrl}.`;
      } else if (platform === "linkedin") {
        userPrompt = `Write a professional LinkedIn post (300-600 words) promoting Marine Notes Journal.
Topic focus: ${topic || "general journal promotion"}.
Tone: ${tone || "professional and thought-leading"}.
${articleTitle ? `Highlight this specific article: "${articleTitle}" (DOI: ${articleDoi})` : ""}
Include a call-to-action directing readers to ${websiteUrl}.`;
      } else if (platform === "facebook") {
        userPrompt = `Write an engaging Facebook post (150-300 words) about Marine Notes Journal.
Topic focus: ${topic || "general journal promotion"}.
Tone: ${tone || "friendly and informative"}.
${articleTitle ? `Feature this specific article: "${articleTitle}" (DOI: ${articleDoi})` : ""}
Include the website link ${websiteUrl}.`;
      } else if (platform === "instagram") {
        userPrompt = `Write an Instagram caption (150-300 words) for Marine Notes Journal.
Topic focus: ${topic || "general journal promotion"}.
Tone: ${tone || "inspiring and visual"}.
${articleTitle ? `Highlight this specific article: "${articleTitle}" (DOI: ${articleDoi})` : ""}
Include 10-15 relevant hashtags at the end and mention ${websiteUrl} in bio reference.`;
      } else if (platform === "email") {
        userPrompt = `Write a short email newsletter snippet (200-400 words) promoting Marine Notes Journal.
Topic focus: ${topic || "general journal promotion"}.
Tone: ${tone || "professional and welcoming"}.
${articleTitle ? `Feature this specific article: "${articleTitle}" (DOI: ${articleDoi})` : ""}
Include a clear CTA button text and link to ${websiteUrl}.`;
      } else {
        userPrompt = `Write a general promotional text for Marine Notes Journal.
Topic focus: ${topic || "general journal promotion"}.
Tone: ${tone || "professional"}.
${articleTitle ? `About this article: "${articleTitle}" (DOI: ${articleDoi})` : ""}
Include the website URL ${websiteUrl}.`;
      }

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }), {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const errText = await response.text();
        console.error("AI gateway error:", response.status, errText);
        throw new Error("AI text generation failed");
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content || "";

      return new Response(JSON.stringify({ text }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    return new Response(JSON.stringify({ error: "Invalid type. Use 'text' or 'image'." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-promotion error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
