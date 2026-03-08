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
    // Download the manuscript PDF to extract the references section
    let pdfBase64: string | null = null;
    if (sub.file_paths && sub.file_paths.length > 0) {
      try {
        const filePath = sub.file_paths[0];
        const { data: fileData, error: dlError } = await supabase.storage
          .from("manuscripts")
          .download(filePath);
        if (!dlError && fileData) {
          const arrayBuffer = await fileData.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);
          let binary = "";
          for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          pdfBase64 = btoa(binary);
          console.log("PDF downloaded for reference extraction, size:", bytes.length);
        } else {
          console.error("PDF download error:", dlError);
        }
      } catch (e) {
        console.error("PDF download failed:", e);
      }
    }

    // Extract references from the PDF using AI (multimodal — send PDF directly)
    let extractedRefs: { doi?: string; url?: string; title?: string; authors?: string }[] = [];
    try {
      const extractMessages: any[] = [
        {
          role: "system",
          content: `You are a reference extraction tool. Extract ALL references from the References / Bibliography section at the end of the manuscript (after Conclusion or Acknowledgements). For each reference, extract the authors, title, DOI (if present), and any URLs. Return them as structured data. If no references section is found, return an empty array.`,
        },
      ];

      if (pdfBase64) {
        // Send the actual PDF to Gemini for extraction
        extractMessages.push({
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract all references from the References/Bibliography section at the end of this manuscript PDF. For each reference, extract the author names, title of the work, DOI if listed, and any URLs.",
            },
            {
              type: "image_url",
              image_url: {
                url: `data:application/pdf;base64,${pdfBase64}`,
              },
            },
          ],
        });
      } else {
        // Fallback: use metadata only
        extractMessages.push({
          role: "user",
          content: `No PDF available. Based on the manuscript metadata below, identify any references, citations, DOIs, or URLs mentioned:\n\n${manuscriptContext}`,
        });
      }

      const extractResponse = await fetch(AI_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: extractMessages,
          tools: [
            {
              type: "function",
              function: {
                name: "extract_references",
                description: "Extract all references found in the manuscript's references section.",
                parameters: {
                  type: "object",
                  properties: {
                    references: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          doi: { type: "string", description: "DOI if mentioned (e.g., 10.1234/example)" },
                          url: { type: "string", description: "URL if mentioned (not DOI URLs)" },
                          title: { type: "string", description: "Title of the referenced work" },
                          authors: { type: "string", description: "Authors of the referenced work" },
                        },
                      },
                      description: "List of extracted references from the References/Bibliography section.",
                    },
                    total_references_found: {
                      type: "number",
                      description: "Total number of references found in the section",
                    },
                  },
                  required: ["references", "total_references_found"],
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
          console.log(`Extracted ${extractedRefs.length} references (total found: ${args.total_references_found})`);
        }
      } else {
        console.error("Reference extraction API error:", extractResponse.status);
      }
    } catch (e) {
      console.error("Reference extraction failed:", e);
    }

    // Verify DOIs and URLs from extracted references
    const verificationResults: string[] = [];
    let verifiedCount = 0;
    let failedCount = 0;

    for (const ref of extractedRefs.slice(0, 20)) {
      // Verify DOI
      if (ref.doi) {
        const cleanDoi = ref.doi.replace(/^https?:\/\/doi\.org\//, "").trim();
        if (/^10\.\d{4,}\//.test(cleanDoi)) {
          try {
            const metaRes = await fetch(`https://api.crossref.org/works/${cleanDoi}`, {
              headers: { Accept: "application/json" },
              signal: AbortSignal.timeout(10000),
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
                // Check for reasonable title overlap (at least 30 chars or significant portion)
                const titleMatch = actualTitle.includes(claimedTitle.substring(0, Math.min(40, claimedTitle.length))) ||
                  claimedTitle.includes(actualTitle.substring(0, Math.min(40, actualTitle.length)));
                if (titleMatch) {
                  verificationResults.push(`✅ DOI ${cleanDoi} verified — title: "${work.title[0]}" by ${actualAuthors}`);
                  verifiedCount++;
                } else {
                  verificationResults.push(`⚠️ DOI ${cleanDoi} exists but TITLE MISMATCH — manuscript claims: "${ref.title}" | actual DOI title: "${work.title[0]}" by ${actualAuthors}`);
                  failedCount++;
                }
              } else {
                verificationResults.push(`✅ DOI ${cleanDoi} verified — "${work.title?.[0] || "unknown title"}" by ${actualAuthors || "unknown authors"}`);
                verifiedCount++;
              }

              // Also check author name overlap if available
              if (ref.authors && actualAuthors) {
                const claimedFirstAuthor = ref.authors.split(",")[0].trim().toLowerCase();
                const actualFirstAuthor = actualAuthors.split(",")[0].trim().toLowerCase();
                if (!actualFirstAuthor.includes(claimedFirstAuthor.split(" ").pop() || "") &&
                    !claimedFirstAuthor.includes(actualFirstAuthor.split(" ").pop() || "")) {
                  verificationResults.push(`  ⚠️ Author mismatch for DOI ${cleanDoi} — manuscript: "${ref.authors}" vs actual: "${actualAuthors}"`);
                }
              }
            } else if (metaRes.status === 404) {
              verificationResults.push(`❌ DOI ${cleanDoi} NOT FOUND — does not exist in Crossref database (claimed title: "${ref.title || "unknown"}")`);
              failedCount++;
            } else {
              verificationResults.push(`⚠️ DOI ${cleanDoi} could not be verified (HTTP ${metaRes.status})`);
            }
          } catch (e) {
            verificationResults.push(`⚠️ DOI ${cleanDoi} verification timed out`);
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

    const refSummary = extractedRefs.length > 0
      ? `Found ${extractedRefs.length} references in the manuscript.`
      : "No references section found or no PDF uploaded.";

    const verificationSummary = verificationResults.length > 0
      ? `\n\n${refSummary}\n\nReference Verification Results (${verifiedCount} verified, ${failedCount} failed of ${extractedRefs.length} total):\n${verificationResults.join("\n")}`
      : `\n\n${refSummary}\nNo DOIs or URLs found to verify in the references.`;

    const step5 = await runAICheck(
      LOVABLE_API_KEY,
      `You are a reference quality reviewer for Marine Notes Journal — a peer-reviewed open-access journal on marine biology, ecology, conservation, and ocean sciences.

You have been provided with automated verification results from the manuscript's References/Bibliography section (extracted from the uploaded PDF). Assess the quality and integrity of the references.

Check for:
- Were references found in the manuscript? If not, flag this as an issue.
- Do the DOIs resolve and match the claimed titles and authors?
- Are there title or author mismatches between what the manuscript cites and what the DOI actually points to?
- Are any DOIs non-existent (fabricated)?
- Are any URLs broken or unreachable?
- Is the number of references appropriate for the manuscript type?
- Do the references appear relevant to the manuscript's topic (marine science)?

Score guidelines:
- 80-100: Most/all DOIs verified, titles and authors match, URLs work
- 60-79: Some references verified but issues found (broken links, minor mismatches, some unverifiable)
- Below 60: Multiple broken DOIs, title/author mismatches, fabricated references, or no references found for a manuscript type that requires them

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

    // Record the detailed review for editors
    const editorComment = `[AI AUTO-REVIEW PIPELINE]\n\n**Result: ${resultLabel}** (Average Score: ${avgScore}/100)\n\n${steps
      .map(
        (s) =>
          `### ${s.step.replace("_", " ").toUpperCase()}\n${s.passed ? "✅ Passed" : "❌ Failed"} — Score: ${s.score}/100\n${s.summary}${s.issues.length > 0 ? "\n\n**Issues:**\n" + s.issues.map((i) => `- ${i}`).join("\n") : ""}`,
      )
      .join("\n\n---\n\n")}${avgScore >= 75 ? "\n\n---\n\n**📋 Article prepared for editor approval. Click 'Publish' in the editor dashboard to make it live.**" : avgScore >= 60 ? "\n\n---\n\n**⚠️ Score between 60-74. Requires editor review to accept or reject.**" : ""}`;

    const reviewAction = avgScore >= 75 ? "accept" : avgScore >= 60 ? "note" : "reject";

    // Build author-friendly note from the AI Chief Editor
    let authorNote = "";
    if (avgScore >= 75) {
      authorNote = `As the AI Chief Editor for **Marine Notes Journal**, I have completed the automated review of your submission.\n\n**Result: ACCEPTED ✅**\n\nYour manuscript has passed all automated quality checks with an overall score of **${avgScore}/100**. It will now proceed to the editorial board for final review and publication.\n\n**Summary of Checks:**\n${steps.map((s) => `- **${s.step.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}**: ${s.passed ? "✅ Passed" : "⚠️ Needs attention"} (${s.score}/100) — ${s.summary}`).join("\n")}\n\nAn editor will review and confirm the publication shortly. Thank you for your submission.`;
    } else if (avgScore >= 60) {
      authorNote = `As the AI Chief Editor for **Marine Notes Journal**, I have completed the automated review of your submission.\n\n**Result: EDITOR REVIEW REQUIRED ⚠️**\n\nYour manuscript scored **${avgScore}/100** and has been flagged for human editor review.\n\n**Summary of Checks:**\n${steps.map((s) => `- **${s.step.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}**: ${s.passed ? "✅ Passed" : "❌ Failed"} (${s.score}/100) — ${s.summary}`).join("\n")}\n\nAn editor will review your manuscript and provide further guidance.`;
    } else {
      const topReasons = rejectionReasons.slice(0, 5);
      authorNote = `As the AI Chief Editor for **Marine Notes Journal**, I have completed the automated review of your submission.\n\n**Result: REJECTED ❌**\n\nUnfortunately, your manuscript did not meet the minimum quality threshold, scoring **${avgScore}/100**.\n\n**Summary of Checks:**\n${steps.map((s) => `- **${s.step.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}**: ${s.passed ? "✅ Passed" : "❌ Failed"} (${s.score}/100) — ${s.summary}`).join("\n")}\n\n**Key Reasons for Rejection:**\n${topReasons.map((r) => `- ${r}`).join("\n")}\n\nYou are welcome to address the issues above and resubmit a revised manuscript.`;
    }

    // Insert author-facing note using the submission's user_id as reviewer
    // (service role bypasses RLS, and this keeps the FK constraint satisfied)
    const reviewerId = sub.user_id || sub.corresponding_author_email;
    await supabase.from("submission_reviews").insert({
      submission_id,
      reviewer_id: sub.user_id,
      action: reviewAction,
      comment: authorNote,
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
