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

    const { submission_id, action } = await req.json();
    if (!submission_id) throw new Error("submission_id is required");

    // Fetch submission
    const { data: sub, error: fetchErr } = await supabase
      .from("manuscript_submissions")
      .select("*")
      .eq("id", submission_id)
      .single();

    if (fetchErr || !sub) throw new Error("Submission not found");

    // If action is "extract", extract the text from the PDF and return it
    if (action === "extract") {
      let pdfBase64: string | null = null;

      if (sub.file_paths && sub.file_paths.length > 0) {
        // Try manuscript-submissions bucket first
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
        // Return metadata-only content if no PDF
        const metadataContent = buildMetadataContent(sub);
        return new Response(JSON.stringify({ content: metadataContent, source: "metadata" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Use AI to extract full text from the PDF
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
              content: `You are a manuscript text extractor. Extract the FULL text content from the provided PDF manuscript. Preserve the structure: title, authors, abstract, all sections (Introduction, Methods, Results, Discussion, etc.), references, and any other content. Maintain paragraph breaks and section headings. Output plain text with clear section markers. Do NOT summarize — extract ALL text verbatim.`,
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Extract the complete text content from this manuscript PDF. Preserve all sections, paragraphs, references, and formatting structure. Output as plain text.",
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
        const errText = await extractResponse.text();
        console.error("AI extraction failed:", extractResponse.status, errText);
        throw new Error("Failed to extract text from PDF");
      }

      const extractData = await extractResponse.json();
      const extractedText = extractData.choices?.[0]?.message?.content || "";

      return new Response(JSON.stringify({ content: extractedText, source: "pdf" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // action === "format" — apply formatting rules to the provided text
    if (action === "format") {
      const { content, manuscript_type } = await req.json().catch(() => ({ content: "", manuscript_type: "" }));
      // Re-parse since we already consumed the body
    }

    // Default action: full extract + format pipeline
    const { content: rawContent, manuscript_type } = await Promise.resolve({ content: "", manuscript_type: sub.manuscript_type });

    return new Response(JSON.stringify({ error: "Invalid action. Use 'extract' or provide content to format." }), {
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
