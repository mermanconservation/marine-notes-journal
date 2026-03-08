import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

interface StepResult {
  step: string;
  passed: boolean;
  score: number;
  summary: string;
  issues: string[];
}

interface PipelineResults {
  steps: StepResult[];
  overall_passed: boolean;
  rejection_reasons: string[];
  suggested_doi?: string;
  suggested_volume?: string;
  suggested_issue?: string;
  prepared_metadata?: Record<string, unknown>;
}

async function runAICheck(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  toolName: string,
): Promise<StepResult> {
  const response = await fetch(AI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: toolName,
            description: "Return the structured review result for this check.",
            parameters: {
              type: "object",
              properties: {
                passed: { type: "boolean", description: "Whether this check passed" },
                score: { type: "number", description: "Score from 0-100" },
                summary: { type: "string", description: "Brief summary of findings (2-3 sentences)" },
                issues: {
                  type: "array",
                  items: { type: "string" },
                  description: "List of specific issues found. Empty if passed.",
                },
              },
              required: ["passed", "score", "summary", "issues"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: toolName } },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`AI check ${toolName} failed:`, response.status, text);
    if (response.status === 429) throw new Error("RATE_LIMIT");
    if (response.status === 402) throw new Error("PAYMENT_REQUIRED");
    throw new Error(`AI check failed: ${response.status}`);
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) throw new Error(`No tool call returned for ${toolName}`);

  const args = JSON.parse(toolCall.function.arguments);
  return {
    step: toolName,
    passed: args.passed,
    score: args.score,
    summary: args.summary,
    issues: args.issues || [],
  };
}

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

    const { submission_id } = await req.json();
    if (!submission_id) throw new Error("submission_id is required");

    // Fetch submission
    const { data: sub, error: fetchErr } = await supabase
      .from("manuscript_submissions")
      .select("*")
      .eq("id", submission_id)
      .single();

    if (fetchErr || !sub) throw new Error("Submission not found");

    // Mark as running
    await supabase
      .from("manuscript_submissions")
      .update({ pipeline_status: "running" })
      .eq("id", submission_id);

    const manuscriptContext = `
Title: ${sub.title}
Type: ${sub.manuscript_type}
Authors: ${sub.all_authors}
Keywords: ${sub.keywords}
Affiliation: ${sub.corresponding_author_affiliation}
Abstract: ${sub.abstract}
${sub.cover_letter ? `Cover Letter: ${sub.cover_letter}` : ""}`;

    const steps: StepResult[] = [];

    // ── STEP 1: Scope & Relevance ──
    const step1 = await runAICheck(
      LOVABLE_API_KEY,
      `You are a scope reviewer for Marine Notes Journal — a peer-reviewed open-access journal on marine biology, ecology, conservation, and ocean sciences.

Accepted manuscript types: Research Articles, Technical Reports / Risk Assessments, Field Notes, Observational Reports, Conservation News.

Evaluate whether the submitted manuscript is within scope. Consider:
- Is the topic related to marine/ocean sciences, biology, ecology, or conservation?
- Does the title accurately reflect the content?
- Are the keywords relevant and appropriate?
- Does the abstract describe work relevant to the journal's scope?
- Does the manuscript type match the described content?

Be strict: reject manuscripts clearly outside marine/ocean science scope. Pass manuscripts that have a reasonable connection to marine topics.`,
      manuscriptContext,
      "scope_check",
    );
    steps.push(step1);

    // Continue all steps even if scope fails — editors may override

    // ── STEP 2: Grammar & Language Quality ──
    const step2 = await runAICheck(
      LOVABLE_API_KEY,
      `You are a language quality reviewer for an academic journal. Evaluate the manuscript's writing quality based on the title, abstract, and keywords provided.

Check for:
- Grammar and spelling errors
- Academic writing tone and clarity
- Sentence structure and readability
- Proper scientific terminology usage
- Abstract coherence and flow

Score strictly: below 60 should fail. Minor issues (a few typos) can still pass with warnings.`,
      manuscriptContext,
      "grammar_check",
    );
    steps.push(step2);

    // ── STEP 3: Structure & Formatting ──
    const step3 = await runAICheck(
      LOVABLE_API_KEY,
      `You are a formatting reviewer for Marine Notes Journal. Based on the manuscript metadata, evaluate structural compliance.

Rules by type:
- Research Articles: Must follow IMRAD structure hints in abstract. Word limit ~8000.
- Technical Reports / Risk Assessments: Should have Executive Summary, Technical Assessment sections. Word limit 8000.
- Field Notes / Observational Reports: May include observer qualifications, duration, regional context.
- Conservation News: Requires abstract, keywords, source. Flexible narrative formatting.

Check:
- Is the abstract of appropriate length (150-300 words)?
- Are keywords provided (at least 3)?
- Does the abstract structure match the manuscript type?
- Is author information complete?
- Is an affiliation provided?`,
      manuscriptContext,
      "structure_check",
    );
    steps.push(step3);

    // ── STEP 4: Originality Assessment ──
    const step4 = await runAICheck(
      LOVABLE_API_KEY,
      `You are an originality reviewer for an academic journal. Based on the title, abstract, and keywords, assess the likely originality of this work.

Consider:
- Does the title suggest novel research or a generic/derivative topic?
- Does the abstract describe original findings, observations, or analyses?
- Are the keywords specific enough to indicate focused research?
- Does the cover letter (if provided) explain the contribution?
- Are there signs of AI-generated boilerplate text?

Note: You cannot check against a plagiarism database. Provide your best assessment of originality based on the text quality and specificity. Be lenient — this is an indicative check, not a definitive one.`,
      manuscriptContext,
      "originality_check",
    );
    steps.push(step4);

    // ── STEP 5: Reference Quality & Verification Check ──
    // First, use AI to extract any references mentioned in the manuscript
    let extractedRefs: { doi?: string; url?: string; title?: string; authors?: string }[] = [];
    try {
      const extractResponse = await fetch(AI_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            {
              role: "system",
              content: `You are a reference extraction tool. Extract all references, citations, DOIs, and URLs mentioned in the manuscript text. Return them as structured data. If no references are found, return an empty array.`,
            },
            {
              role: "user",
              content: manuscriptContext + (sub.cover_letter ? `\n\nCover Letter: ${sub.cover_letter}` : ""),
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "extract_references",
                description: "Extract all references found in the manuscript.",
                parameters: {
                  type: "object",
                  properties: {
                    references: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          doi: { type: "string", description: "DOI if mentioned (e.g., 10.1234/example)" },
                          url: { type: "string", description: "URL if mentioned" },
                          title: { type: "string", description: "Title of the referenced work" },
                          authors: { type: "string", description: "Authors of the referenced work" },
                        },
                      },
                      description: "List of extracted references. Empty if none found.",
                    },
                  },
                  required: ["references"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "extract_references" } },
        }),
      });

      if (extractResponse.ok) {
        const extractData = await extractResponse.json();
        const extractCall = extractData.choices?.[0]?.message?.tool_calls?.[0];
        if (extractCall) {
          const args = JSON.parse(extractCall.function.arguments);
          extractedRefs = args.references || [];
        }
      }
    } catch (e) {
      console.error("Reference extraction failed:", e);
    }

    // Verify DOIs and URLs
    const verificationResults: string[] = [];
    let verifiedCount = 0;
    let failedCount = 0;

    for (const ref of extractedRefs.slice(0, 15)) {
      // Verify DOI
      if (ref.doi) {
        const cleanDoi = ref.doi.replace(/^https?:\/\/doi\.org\//, "").trim();
        if (/^10\.\d{4,}\//.test(cleanDoi)) {
          try {
            const doiRes = await fetch(`https://doi.org/${cleanDoi}`, {
              method: "HEAD",
              redirect: "follow",
              headers: { Accept: "application/json" },
            });
            if (doiRes.ok || doiRes.status === 302 || doiRes.status === 301) {
              // Try to get metadata to verify title/author match
              try {
                const metaRes = await fetch(`https://api.crossref.org/works/${cleanDoi}`, {
                  headers: { Accept: "application/json" },
                });
                if (metaRes.ok) {
                  const metaData = await metaRes.json();
                  const work = metaData.message;
                  const actualTitle = (work?.title?.[0] || "").toLowerCase();
                  const actualAuthors = (work?.author || [])
                    .map((a: any) => `${a.given || ""} ${a.family || ""}`.trim())
                    .join(", ");

                  if (ref.title && actualTitle) {
                    const claimedTitle = ref.title.toLowerCase();
                    const titleMatch = actualTitle.includes(claimedTitle.substring(0, 30)) ||
                      claimedTitle.includes(actualTitle.substring(0, 30));
                    if (titleMatch) {
                      verificationResults.push(`✅ DOI ${cleanDoi} verified — title matches: "${work.title[0]}"`);
                      verifiedCount++;
                    } else {
                      verificationResults.push(`⚠️ DOI ${cleanDoi} exists but title mismatch — claimed: "${ref.title}" vs actual: "${work.title[0]}"`);
                      failedCount++;
                    }
                  } else {
                    verificationResults.push(`✅ DOI ${cleanDoi} verified — "${work.title?.[0] || "unknown title"}" by ${actualAuthors || "unknown authors"}`);
                    verifiedCount++;
                  }
                } else {
                  verificationResults.push(`✅ DOI ${cleanDoi} resolves (metadata unavailable)`);
                  verifiedCount++;
                }
              } catch {
                verificationResults.push(`✅ DOI ${cleanDoi} resolves (metadata check skipped)`);
                verifiedCount++;
              }
            } else {
              verificationResults.push(`❌ DOI ${cleanDoi} does not resolve (HTTP ${doiRes.status})`);
              failedCount++;
            }
          } catch (e) {
            verificationResults.push(`❌ DOI ${cleanDoi} verification failed (network error)`);
            failedCount++;
          }
        }
      }

      // Verify URL (non-DOI)
      if (ref.url && !ref.url.includes("doi.org")) {
        try {
          const urlRes = await fetch(ref.url, {
            method: "HEAD",
            redirect: "follow",
            signal: AbortSignal.timeout(8000),
          });
          if (urlRes.ok || urlRes.status === 301 || urlRes.status === 302) {
            verificationResults.push(`✅ URL reachable: ${ref.url}`);
            verifiedCount++;
          } else {
            verificationResults.push(`❌ URL unreachable (HTTP ${urlRes.status}): ${ref.url}`);
            failedCount++;
          }
        } catch {
          verificationResults.push(`❌ URL unreachable: ${ref.url}`);
          failedCount++;
        }
      }
    }

    const verificationSummary = verificationResults.length > 0
      ? `\n\nReference Verification Results (${verifiedCount} verified, ${failedCount} failed):\n${verificationResults.join("\n")}`
      : "\n\nNo DOIs or URLs found to verify.";

    const step5 = await runAICheck(
      LOVABLE_API_KEY,
      `You are a reference quality reviewer for Marine Notes Journal — a peer-reviewed open-access journal on marine biology, ecology, conservation, and ocean sciences.

Based on the manuscript metadata AND the automated reference verification results below, assess the quality and integrity of the references.

Check for:
- Does the abstract mention or cite specific studies, data sources, or prior work?
- Are there indicators of proper literature review?
- Does the topic require extensive references (e.g., research articles) or fewer (e.g., field notes)?
- Are the keywords specific enough to suggest familiarity with existing literature?
- For Conservation News: is a source of the news mentioned?
- Are there signs of fabricated or placeholder references?
- IMPORTANT: Review the automated verification results — flag any DOIs that don't resolve or have title/author mismatches
- Flag any URLs that are unreachable or broken

Score guidelines:
- 80-100: References verified, DOIs resolve correctly, titles match
- 60-79: Some references verified but issues found (broken links, mismatches)
- Below 60: Multiple broken DOIs/URLs, title mismatches, or fabricated references detected

Be lenient for Field Notes and Observational Reports which may have fewer references. Be stricter for Research Articles and Review Articles.`,
      manuscriptContext + verificationSummary,
      "reference_check",
    );
    steps.push(step5);

    // ── Determine overall result ──
    // Threshold: ≥75 avg = auto-accept, 60-74 = editor_review, <60 = auto-reject
    const avgScore = Math.round(steps.reduce((a, s) => a + s.score, 0) / steps.length);
    const failedSteps = steps.filter((s) => !s.passed);
    const rejectionReasons = failedSteps.flatMap((s) => s.issues);

    // Always generate metadata so editors can override and publish
    const currentYear = new Date().getFullYear();
    const volume = (currentYear - 2025).toString();

    const { count } = await supabase
      .from("articles")
      .select("*", { count: "exact", head: true })
      .eq("volume", volume);

    const articleNumber = (count || 0) + 1;
    const issue = "1";
    const doi = `10.69882/mnj.${currentYear}.v${volume}i${issue}.${articleNumber}`;

    const preparedMetadata = {
      doi,
      volume,
      issue,
      title: sub.title,
      authors: sub.all_authors,
      abstract: sub.abstract,
      type: sub.manuscript_type,
      resolver_url: `https://marine-notes-journal.lovable.app/doi/${doi}`,
      publication_date: new Date().toISOString().split("T")[0],
      orcid_ids: sub.corresponding_author_orcid ? [sub.corresponding_author_orcid] : [],
      pipeline_scores: {
        scope: steps[0].score,
        grammar: steps[1].score,
        structure: steps[2].score,
        originality: steps[3].score,
        references: steps[4].score,
        average: avgScore,
      },
    };

    // Determine outcome based on average score thresholds
    let pipelineStatus: string;
    let newStatus: string;
    let resultLabel: string;

    if (avgScore >= 75) {
      pipelineStatus = "passed";
      newStatus = "accepted";
      resultLabel = "ACCEPTED ✅";
    } else if (avgScore >= 60) {
      pipelineStatus = "editor_review";
      newStatus = "under_review";
      resultLabel = "EDITOR REVIEW REQUIRED ⚠️";
    } else {
      pipelineStatus = "failed";
      newStatus = "rejected";
      resultLabel = "REJECTED ❌";
    }

    const results: PipelineResults = {
      steps,
      overall_passed: avgScore >= 75,
      rejection_reasons: rejectionReasons,
      prepared_metadata: preparedMetadata,
    };

    await supabase
      .from("manuscript_submissions")
      .update({
        pipeline_status: pipelineStatus,
        pipeline_results: results,
        status: newStatus,
        decision_date: avgScore < 60 ? new Date().toISOString() : null,
      })
      .eq("id", submission_id);

    // Record the review
    const reviewComment = `[AI AUTO-REVIEW PIPELINE]\n\n**Result: ${resultLabel}** (Average Score: ${avgScore}/100)\n\n${steps
      .map(
        (s) =>
          `### ${s.step.replace("_", " ").toUpperCase()}\n${s.passed ? "✅ Passed" : "❌ Failed"} — Score: ${s.score}/100\n${s.summary}${s.issues.length > 0 ? "\n\n**Issues:**\n" + s.issues.map((i) => `- ${i}`).join("\n") : ""}`,
      )
      .join("\n\n---\n\n")}${avgScore >= 75 ? "\n\n---\n\n**📋 Article prepared for editor approval. Click 'Publish' in the editor dashboard to make it live.**" : avgScore >= 60 ? "\n\n---\n\n**⚠️ Score between 60-74. Requires editor review to accept or reject.**" : ""}`;

    const reviewAction = avgScore >= 75 ? "accept" : avgScore >= 60 ? "note" : "reject";

    await supabase.from("submission_reviews").insert({
      submission_id,
      reviewer_id: "00000000-0000-0000-0000-000000000000",
      action: reviewAction,
      comment: reviewComment,
    });

    return new Response(JSON.stringify({ success: true, passed: avgScore >= 75, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Pipeline error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";

    if (msg === "RATE_LIMIT") {
      return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (msg === "PAYMENT_REQUIRED") {
      return new Response(JSON.stringify({ error: "AI service credits exhausted." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
