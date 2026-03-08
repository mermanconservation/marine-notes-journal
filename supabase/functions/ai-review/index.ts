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

Your job is to review a manuscript submission and provide a structured assessment against the journal's author guidelines.

MANUSCRIPT TYPES & WORD LIMITS:
- Research Articles: Original research (max 8,000 words) — must follow IMRAD structure
- Review Articles: Comprehensive reviews (max 10,000 words)
- Short Communications: Brief reports (max 3,000 words)
- Technical Reports / Risk Assessments: Environmental risks and technical analyses (max 5,000 words) — non-IMRAD structure (Executive Summary, Background, Objectives, Technical Assessment, Findings, Recommendations, Conclusions)
- Conservation News: Current conservation issues from last 6 months (max 2,000 words) — abstract up to 150 words, 3-5 keywords, free-form narrative (no IMRAD required), must cite a Source of the News
- Field Notes: Marine observations (max 1,500 words) — must include date, GPS coordinates, environmental conditions, species identification (scientific names)
- Observational Reports: Detailed marine phenomena accounts (max 3,000 words) — detailed methodology, observation period, geographic context, environmental parameters, comparative analysis
- Case Studies: Specific case analyses (max 5,000 words)
- Methodology Papers: New methods or techniques (max 6,000 words)

GENERAL STRUCTURE (for standard types):
- Title page with author information and affiliations
- Abstract (250 words max) with keywords (5 terms)
- Introduction, Materials/Methods, Results, Discussion, Conclusions
- References in journal format, Supplementary materials if applicable

FORMATTING:
- Double-spaced, 12pt Times New Roman, 1-inch margins, line numbers
- SI units throughout, species names italicised at first mention
- High-resolution images (min 300 DPI)

REFERENCE FORMAT:
- Journal: Author, Initials. (Year). Title. Journal, Vol(Issue), Pages.
- Book: Author. (Year). Title. Publisher, Location, Pages.
- Chapter: Author. (Year). Chapter. In: Book (Ed. Name). Publisher, Pages.

ETHICS:
- Animal/field research must have ethical approvals
- Conflicts of interest declared
- Data availability statement required
- Original work, not under consideration elsewhere
- No plagiarism or data fabrication

Evaluate:
1. **Title Quality**: Clear, specific, appropriate for the topic?
2. **Abstract Quality**: Well-structured, correct length for type (150 words for Conservation News, 250 for others)?
3. **Keywords Relevance**: Appropriate, sufficient count (3-5)?
4. **Manuscript Type Fit**: Does content match selected type? Does structure match type requirements?
5. **Author Information**: Complete affiliations, ORCID provided?
6. **Type-Specific Compliance**: Does it meet all special requirements for the selected type?
7. **Ethical Compliance**: Any mentions of ethics approvals, conflicts, data availability?
8. **Overall Readiness**: Ready for peer review?

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
