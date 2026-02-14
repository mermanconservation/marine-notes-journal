import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, abstract, keywords, manuscriptType, authors, coverLetter } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are the AI Chief Editor for Marine Notes Journal, a peer-reviewed open-access journal dedicated to marine conservation and ocean sciences.

Your job is to review a manuscript submission and provide a structured assessment. Evaluate the following:

1. **Title Quality**: Is it clear, specific, and appropriate for a scientific journal?
2. **Abstract Quality**: Is it well-structured, informative, and within acceptable length?
3. **Keywords Relevance**: Are the keywords appropriate for the topic?
4. **Manuscript Type Fit**: Does the described content match the selected manuscript type?
5. **Author Information**: Are author details complete?
6. **Overall Readiness**: Is this submission ready for peer review?

Provide your response in this exact format:
- Start with a brief overall assessment (2-3 sentences)
- Then list specific findings as bullet points with ✅ (pass), ⚠️ (warning), or ❌ (issue) prefixes
- End with a recommendation: "RECOMMENDATION: Ready for peer review" or "RECOMMENDATION: Revisions needed before peer review"

Be constructive, professional, and thorough but concise.`;

    const userMessage = `Please review this manuscript submission:

**Title:** ${title}
**Manuscript Type:** ${manuscriptType}
**Authors:** ${authors}
**Keywords:** ${keywords}

**Abstract:**
${abstract}

${coverLetter ? `**Cover Letter:**\n${coverLetter}` : "No cover letter provided."}`;

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
          { role: "user", content: userMessage },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI service credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(JSON.stringify({ error: "AI review service unavailable" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const review = data.choices?.[0]?.message?.content || "Unable to generate review.";

    return new Response(JSON.stringify({ review }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("AI review error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
