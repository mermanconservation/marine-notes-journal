import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase config missing");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json();
    const { submission_id, action } = body;
    if (!submission_id) throw new Error("submission_id is required");

    // Fetch submission
    const { data: sub, error: fetchErr } = await supabase
      .from("manuscript_submissions")
      .select("*")
      .eq("id", submission_id)
      .single();

    if (fetchErr || !sub) throw new Error("Submission not found");

    // ── ACTION: EXTRACT ──
    if (action === "extract") {
      let pdfBase64: string | null = null;

      if (sub.file_paths && sub.file_paths.length > 0) {
        const filePath = sub.file_paths[0];
        const baseName = filePath.split("/").pop() || "";

        const candidates = [
          filePath.replace(/^\/+/, "").replace(/^manuscripts\//, ""),
          baseName,
          sub.user_id ? `submissions/${sub.user_id}/${baseName}` : "",
        ].filter(Boolean);

        for (const candidate of candidates) {
          const { data: fileData, error: dlError } = await supabase.storage
            .from("manuscript-submissions")
            .download(candidate);
          if (!dlError && fileData) {
            const arrayBuffer = await fileData.arrayBuffer();
            const bytes = new Uint8Array(arrayBuffer);
            let binary = "";
            for (let i = 0; i < bytes.length; i++) {
              binary += String.fromCharCode(bytes[i]);
            }
            pdfBase64 = btoa(binary);
            console.log("PDF downloaded for formatting, size:", bytes.length);
            break;
          }
        }
      }

      if (!pdfBase64) {
        const metadataContent = buildMetadataContent(sub);
        return new Response(JSON.stringify({ content: metadataContent, source: "metadata" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const extractResponse = await fetch(AI_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `You are a manuscript text extractor. Extract the FULL text content from the provided PDF manuscript. Preserve the structure: title, authors, abstract, all sections, references, and any other content. Maintain paragraph breaks and section headings. Output plain text with clear section markers using uppercase headers (e.g., ABSTRACT, INTRODUCTION, METHODS, etc.). Do NOT summarize — extract ALL text verbatim.`,
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Extract the complete text content from this manuscript PDF. Preserve all sections, paragraphs, references, and formatting structure.",
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:application/pdf;base64,${pdfBase64}`,
                  },
                },
              ],
            },
          ],
        }),
      });

      if (!extractResponse.ok) {
        console.error("AI extraction failed:", extractResponse.status);
        throw new Error("Failed to extract text from PDF");
      }

      const extractData = await extractResponse.json();
      const extractedText = extractData.choices?.[0]?.message?.content || "";

      return new Response(JSON.stringify({ content: extractedText, source: "pdf" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── ACTION: APPLY-FORMAT ──
    if (action === "apply-format") {
      const { content, manuscript_type, title, authors } = body;
      if (!content) throw new Error("No content provided to format");

      const formatResponse = await fetch(AI_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `You are a manuscript formatting editor for Marine Notes Journal. Your job is to take raw manuscript text and apply the journal's formatting guidelines. Return the formatted text AND a checklist of formatting compliance.

FORMATTING RULES TO APPLY:
1. **Structure**: Ensure proper section headings in UPPERCASE (ABSTRACT, INTRODUCTION, MATERIALS AND METHODS, RESULTS, DISCUSSION, CONCLUSIONS, REFERENCES, etc.)
2. **Species names**: Italicize all species names at first mention by wrapping them in *asterisks* (e.g., *Megaptera novaeangliae*)
3. **SI units**: Ensure SI units are used throughout (km, m, °C, kg, etc.)
4. **Sections by manuscript type**:
   - Research Articles: IMRAD structure required
   - Conservation News: Free-form narrative, abstract up to 150 words, source required
   - Field Notes: Date, GPS coordinates, environmental conditions, species ID required
   - Observational Reports: Methodology, observation period, geographic context required
   - Technical Reports: Executive Summary, Background, Objectives, Technical Assessment, Findings, Recommendations, Conclusions
5. **Abstract**: Check word count (250 max for most types, 150 for Conservation News)
6. **Keywords**: Ensure 3-5 keywords are present
7. **References**: Flag any references not following journal format (Author, Initials. (Year). Title. Journal, Vol(Issue), Pages.)

IMPORTANT: Return the FULL formatted text. Do not truncate or summarize. Preserve all original content while improving formatting.`,
            },
            {
              role: "user",
              content: `Format this ${manuscript_type || "manuscript"} by "${authors || "Unknown"}" titled "${title || "Untitled"}" according to Marine Notes Journal guidelines:\n\n${content}`,
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "return_formatted_manuscript",
                description: "Return the formatted manuscript text and compliance checks.",
                parameters: {
                  type: "object",
                  properties: {
                    formatted_content: {
                      type: "string",
                      description: "The full formatted manuscript text with all formatting rules applied. Species names wrapped in *asterisks* for italics.",
                    },
                    checks: {
                      type: "object",
                      properties: {
                        doubleSpaced: { type: "boolean", description: "Whether document is marked for double-spacing" },
                        font: { type: "boolean", description: "Whether 12pt Times New Roman is specified" },
                        margins: { type: "boolean", description: "Whether 1-inch margins are specified" },
                        lineNumbers: { type: "boolean", description: "Whether line numbers are included" },
                        siUnits: { type: "boolean", description: "Whether SI units are used throughout" },
                        speciesItalics: { type: "boolean", description: "Whether species names are italicised" },
                        imageDpi: { type: "boolean", description: "Whether image resolution requirements are noted" },
                        figuresTables: { type: "boolean", description: "Whether figures/tables are properly referenced" },
                      },
                      description: "Formatting compliance checklist",
                    },
                    word_count: {
                      type: "number",
                      description: "Total word count of the formatted manuscript",
                    },
                    issues_found: {
                      type: "array",
                      items: { type: "string" },
                      description: "List of formatting issues found and corrected or flagged",
                    },
                  },
                  required: ["formatted_content", "checks", "word_count", "issues_found"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "return_formatted_manuscript" } },
        }),
      });

      if (!formatResponse.ok) {
        console.error("AI formatting failed:", formatResponse.status);
        throw new Error("Failed to format manuscript");
      }

      const formatData = await formatResponse.json();
      const toolCall = formatData.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall) throw new Error("No formatting result returned");

      const args = JSON.parse(toolCall.function.arguments);

      return new Response(JSON.stringify({
        formatted_content: args.formatted_content,
        checks: args.checks,
        word_count: args.word_count,
        issues_found: args.issues_found,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action. Use 'extract' or 'apply-format'." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Format manuscript error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function buildMetadataContent(sub: any): string {
  return `TITLE
${sub.title}

AUTHORS
${sub.all_authors}

AFFILIATION
${sub.corresponding_author_affiliation}

ABSTRACT
${sub.abstract}

KEYWORDS
${sub.keywords}

${sub.cover_letter ? `COVER LETTER\n${sub.cover_letter}\n` : ""}

[Note: Full manuscript text could not be extracted from PDF. Only metadata is shown above. Please paste the full manuscript text manually to use the formatting editor.]`;
}
