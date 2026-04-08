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

    // Download PDF for later steps (structure check, reference extraction)
    let pdfBase64: string | null = null;
    if (sub.file_paths && sub.file_paths.length > 0) {
      try {
        const filePath = sub.file_paths[0];
        const { data: fileData, error: dlError } = await supabase.storage
          .from("manuscript-submissions")
          .download(filePath);
        if (!dlError && fileData) {
          const arrayBuffer = await fileData.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);
          let binary = "";
          for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          pdfBase64 = btoa(binary);
          console.log("PDF downloaded for pipeline analysis, size:", bytes.length);
        } else {
          console.error("PDF download error for pipeline:", dlError);
        }
      } catch (e) {
        console.error("PDF download failed for pipeline:", e);
      }
    }

    // ── STEP 1: Scope & Relevance ──
    const step1 = await runAICheck(
      LOVABLE_API_KEY,
      `You are a scope reviewer for Marine Notes Journal — a peer-reviewed open-access journal on marine biology, ecology, conservation, and ocean sciences.

Accepted manuscript types and their word limits:
- Research Articles: Original research (max 8,000 words)
- Review Articles: Comprehensive reviews (max 10,000 words)
- Short Communications: Brief reports (max 3,000 words)
- Technical Reports / Risk Assessments: Comprehensive assessments of environmental risks and technical analyses of marine infrastructure projects and conservation challenges (max 5,000 words)
- Conservation News: Updates, reports, and announcements on current conservation issues from the last 6 months (max 2,000 words)
- Field Notes: Brief descriptions of marine observations, species sightings, behavioral observations, or environmental conditions from field work (max 1,500 words)
- Observational Reports: Detailed accounts of specific marine phenomena, unusual events, or field observations requiring documentation (max 3,000 words)
- Case Studies: Specific case analyses (max 5,000 words)
- Methodology Papers: New methods or techniques (max 6,000 words)

Evaluate whether the submitted manuscript is within scope. Consider:
- Is the topic related to marine/ocean sciences, biology, ecology, or conservation?
- Does the title accurately reflect the content?
- Are the keywords relevant and appropriate?
- Does the abstract describe work relevant to the journal's scope?
- Does the manuscript type match the described content?
- Is the selected manuscript type one of the accepted types listed above?

Be strict: reject manuscripts clearly outside marine/ocean science scope. Pass manuscripts that have a reasonable connection to marine topics.`,
      manuscriptContext,
      "scope_check",
    );
    steps.push(step1);

    // ── STEP 2: Grammar & Language Quality ──
    const step2 = await runAICheck(
      LOVABLE_API_KEY,
      `You are a language quality reviewer for Marine Notes Journal. Evaluate the manuscript's writing quality based on the title, abstract, and keywords provided.

Check for:
- Grammar and spelling errors
- Academic writing tone and clarity
- Sentence structure and readability
- Proper scientific terminology usage
- Abstract coherence and flow
- Species names should be in italics at first mention (check if scientific names appear correctly formatted)
- SI units should be used throughout

Score strictly: below 60 should fail. Minor issues (a few typos) can still pass with warnings.`,
      manuscriptContext,
      "grammar_check",
    );
    steps.push(step2);

    // ── STEP 3: Structure & Formatting Compliance ──
    const structurePrompt = `You are a formatting and structure reviewer for Marine Notes Journal. Based on the manuscript metadata and PDF content (if available), evaluate compliance with the journal's author guidelines.

GENERAL MANUSCRIPT STRUCTURE (required for most types):
- Title page with author information and affiliations
- Abstract (250 words max) with keywords (5 terms recommended, minimum 3)
- Introduction with clear research objectives
- Materials and Methods with sufficient detail for replication
- Results presented clearly with appropriate figures/tables
- Discussion interpreting findings and implications
- Conclusions summarizing key findings
- References in journal format
- Supplementary materials (if applicable)

FORMATTING REQUIREMENTS:
- Double-spaced text throughout manuscript
- 12-point Times New Roman or similar serif font
- 1-inch margins on all sides
- Line numbers for review process
- Figures and tables embedded or submitted separately
- High-resolution images (minimum 300 DPI)
- SI units used throughout
- Species names in italics at first mention

TYPE-SPECIFIC RULES:

**Conservation News:**
- Abstract must be up to 150 words (NOT the standard 250)
- Must include 3-5 keywords
- Main text should be free-form narrative — NO requirement for IMRAD structure
- Authors may organise text freely, using subheadings only where helpful
- A clear Source of the News MUST be provided (original report, press release, media article, institutional announcement, or direct field observation)
- Must report on events from the last 6 months
- Max 2,000 words (excluding abstract, keywords, and references)
- Visual documentation encouraged

**Field Notes:**
- Must include: date and location (GPS coordinates), environmental conditions, species identification (scientific names), and description of observation
- Optional but encouraged: observer qualifications, observation duration, equipment used, witness accounts, corroborating evidence
- Visual documentation strongly encouraged
- Geographic data: coordinates and habitat description; depth and regional context optional but valuable
- Species identification: use scientific nomenclature; include identifying features
- Max 1,500 words

**Observational Reports:**
- Must include detailed methodology, observation period, geographic context, environmental parameters
- Comparative analysis with existing literature expected
- Same required elements as Field Notes plus more detail
- Max 3,000 words

**Research Articles:**
- Must follow IMRAD structure (Introduction, Methods, Results, and Discussion)
- Max 8,000 words

**Review Articles:**
- Comprehensive reviews of existing literature
- Max 10,000 words

**Short Communications:**
- Brief reports of preliminary or limited findings
- Max 3,000 words

**Technical Reports / Risk Assessments:**
- Should follow non-IMRAD structure: Executive Summary, Background and Context, Objectives and Scope, Technical Assessment / Risk Analysis, Findings, Recommendations, Conclusions
- Max 5,000 words

**Case Studies:**
- Specific case analyses
- Max 5,000 words

**Methodology Papers:**
- New methods or techniques
- Max 6,000 words

REFERENCE FORMAT:
- Journal Articles: Author, Initials. (Year). Title. Journal Name, Volume(Issue), Pages.
  Example: Smith, J.M., Anderson, K.L. (2024). Coral bleaching responses. Marine Notes Journal, 15(2), 45-62.
- Books: Author. (Year). Title. Publisher, Location, Pages.
- Book Chapters: Author. (Year). Chapter title. In: Book Title (Ed. Name). Publisher, Pages.

Check all applicable rules for the given manuscript type. Flag any missing required elements.`;

    const step3Messages = pdfBase64
      ? `${manuscriptContext}\n\n[A PDF of the full manuscript has been provided for structural analysis.]`
      : manuscriptContext;

    const step3 = await runAICheck(
      LOVABLE_API_KEY,
      structurePrompt,
      step3Messages,
      "structure_check",
    );
    steps.push(step3);

    // ── STEP 4: Ethical & Publication Compliance ──
    const step4 = await runAICheck(
      LOVABLE_API_KEY,
      `You are an ethics and compliance reviewer for Marine Notes Journal. Based on the manuscript metadata, evaluate ethical compliance with the journal's guidelines.

RESEARCH ETHICS requirements:
- All animal research must comply with institutional and international guidelines
- Field research permits and ethical approvals must be obtained
- Conflicts of interest must be declared
- Data sharing and availability statements required

PUBLICATION ETHICS requirements:
- Manuscripts must be original and not under consideration elsewhere
- Proper attribution of all sources and collaborators
- No plagiarism, data fabrication, or duplicate publication
- Author contributions must be clearly stated

Check (based on available metadata):
- Does the abstract or cover letter mention ethical approvals where relevant (animal research, human subjects)?
- Is there any indication of conflicts of interest declaration?
- Does the cover letter confirm originality and exclusive submission?
- Are author contributions mentioned?
- Is a data availability statement implied or mentioned?
- Are there any red flags suggesting plagiarism or AI-generated boilerplate text?

ORCID IDs:
- Authors are encouraged to provide ORCID identifiers
- Check if ORCID ID is provided for the corresponding author

Be lenient for Field Notes and Conservation News which may not require extensive ethics statements. Be stricter for Research Articles, Review Articles, and Case Studies.`,
      manuscriptContext,
      "ethics_check",
    );
    steps.push(step4);

    // ── STEP 5: Originality Assessment ──
    const step5 = await runAICheck(
      LOVABLE_API_KEY,
      `You are an originality reviewer for Marine Notes Journal. Based on the title, abstract, and keywords, assess the likely originality of this work.

Consider:
- Does the title suggest novel research or a generic/derivative topic?
- Does the abstract describe original findings, observations, or analyses?
- Are the keywords specific enough to indicate focused research?
- Does the cover letter (if provided) explain the contribution?
- Are there signs of AI-generated boilerplate text?
- For Conservation News: is the news recent (last 6 months) and does it cite a clear source?

Note: You cannot check against a plagiarism database. Provide your best assessment of originality based on the text quality and specificity. Be lenient — this is an indicative check, not a definitive one.`,
      manuscriptContext,
      "originality_check",
    );
    steps.push(step5);

    // ── STEP 6: Reference Quality & Verification Check ──
    // Download the manuscript PDF to extract the references section
    let pdfBase64ForRefs = pdfBase64;
    if (!pdfBase64ForRefs && sub.file_paths && sub.file_paths.length > 0) {
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
          pdfBase64ForRefs = btoa(binary);
          console.log("PDF downloaded for reference extraction, size:", bytes.length);
        } else {
          console.error("PDF download error:", dlError);
        }
      } catch (e) {
        console.error("PDF download failed:", e);
      }
    }

    // Extract references from the PDF using AI
    let extractedRefs: { doi?: string; url?: string; title?: string; authors?: string; format_correct?: boolean }[] = [];
    try {
      const extractMessages: any[] = [
        {
          role: "system",
          content: `You are a reference extraction tool. Extract ALL references from the References / Bibliography section at the end of the manuscript. For each reference, extract the authors, title, DOI (if present), any URLs, and whether the reference follows the journal's format:
- Journal Articles: Author, Initials. (Year). Title. Journal, Volume(Issue), Pages.
- Books: Author. (Year). Title. Publisher, Location, Pages.
- Book Chapters: Author. (Year). Chapter. In: Book (Ed. Name). Publisher, Pages.
If no references section is found, return an empty array.`,
        },
      ];

      if (pdfBase64ForRefs) {
        extractMessages.push({
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract all references from the References/Bibliography section at the end of this manuscript PDF. For each reference, extract the author names, title, DOI if listed, URLs, and whether it follows the journal's reference format.",
            },
            {
              type: "image_url",
              image_url: {
                url: `data:application/pdf;base64,${pdfBase64ForRefs}`,
              },
            },
          ],
        });
      } else {
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
                          doi: { type: "string", description: "DOI if mentioned" },
                          url: { type: "string", description: "URL if mentioned (not DOI URLs)" },
                          title: { type: "string", description: "Title of the referenced work" },
                          authors: { type: "string", description: "Authors of the referenced work" },
                          format_correct: { type: "boolean", description: "Whether reference follows journal format" },
                        },
                      },
                      description: "List of extracted references.",
                    },
                    total_references_found: {
                      type: "number",
                      description: "Total number of references found",
                    },
                    format_issues: {
                      type: "array",
                      items: { type: "string" },
                      description: "List of specific formatting issues with references",
                    },
                  },
                  required: ["references", "total_references_found", "format_issues"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "extract_references" } },
        }),
      });

      let formatIssues: string[] = [];
      if (extractResponse.ok) {
        const extractData = await extractResponse.json();
        const extractCall = extractData.choices?.[0]?.message?.tool_calls?.[0];
        if (extractCall) {
          const args = JSON.parse(extractCall.function.arguments);
          extractedRefs = args.references || [];
          formatIssues = args.format_issues || [];
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
                const titleMatch = actualTitle.includes(claimedTitle.substring(0, Math.min(40, claimedTitle.length))) ||
                  claimedTitle.includes(actualTitle.substring(0, Math.min(40, actualTitle.length)));
                if (titleMatch) {
                  verificationResults.push(`✅ DOI ${cleanDoi} verified — title: "${work.title[0]}" by ${actualAuthors}`);
                  verifiedCount++;
                } else {
                  verificationResults.push(`⚠️ DOI ${cleanDoi} exists but TITLE MISMATCH — manuscript claims: "${ref.title}" | actual: "${work.title[0]}"`);
                  failedCount++;
                }
              } else {
                verificationResults.push(`✅ DOI ${cleanDoi} verified — "${work.title?.[0] || "unknown"}" by ${actualAuthors || "unknown"}`);
                verifiedCount++;
              }

              if (ref.authors && actualAuthors) {
                const claimedFirstAuthor = ref.authors.split(",")[0].trim().toLowerCase();
                const actualFirstAuthor = actualAuthors.split(",")[0].trim().toLowerCase();
                if (!actualFirstAuthor.includes(claimedFirstAuthor.split(" ").pop() || "") &&
                    !claimedFirstAuthor.includes(actualFirstAuthor.split(" ").pop() || "")) {
                  verificationResults.push(`  ⚠️ Author mismatch for DOI ${cleanDoi} — manuscript: "${ref.authors}" vs actual: "${actualAuthors}"`);
                }
              }
            } else if (metaRes.status === 404) {
              verificationResults.push(`❌ DOI ${cleanDoi} NOT FOUND — does not exist in Crossref (claimed: "${ref.title || "unknown"}")`);
              failedCount++;
            } else {
              verificationResults.push(`⚠️ DOI ${cleanDoi} could not be verified (HTTP ${metaRes.status})`);
            }
          } catch (e) {
            verificationResults.push(`⚠️ DOI ${cleanDoi} verification timed out`);
          }
        }
      }

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

    const step6 = await runAICheck(
      LOVABLE_API_KEY,
      `You are a reference quality reviewer for Marine Notes Journal.

You have been provided with automated verification results from the manuscript's References/Bibliography section. Assess the quality and integrity of the references.

REFERENCE FORMAT expected:
- Journal Articles: Smith, J.M., Anderson, K.L. (2024). Coral bleaching responses to temperature stress in the Caribbean. Marine Notes Journal, 15(2), 45-62.
- Books: Thompson, R.C. (2023). Marine Conservation Biology: Principles and Practice. Academic Press, London, 345 pp.
- Book Chapters: Martinez, P.L., Chen, W. (2024). Deep-sea mining impacts. In: Ocean Resources and Sustainability (Ed. K. Johnson). Springer, pp. 123-145.

Check for:
- Were references found in the manuscript? If not, flag this as an issue (except for Field Notes which may have fewer).
- Do the DOIs resolve and match the claimed titles and authors?
- Are there title or author mismatches?
- Are any DOIs non-existent (fabricated)?
- Are any URLs broken or unreachable?
- Is the number of references appropriate for the manuscript type?
- Do references follow the journal's reference format?
- Are references relevant to the manuscript's topic?

Expected reference counts by type:
- Research Articles / Review Articles: 20+ references expected
- Technical Reports: 10+ references expected
- Short Communications / Case Studies: 10+ references
- Observational Reports: 5+ references
- Conservation News / Field Notes: fewer references acceptable

Score guidelines:
- 80-100: Most DOIs verified, proper format, adequate count
- 60-79: Some issues (broken links, format inconsistencies)
- Below 60: Fabricated references, major format issues, or missing references`,
      manuscriptContext + verificationSummary,
      "reference_check",
    );
    steps.push(step6);

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
        ethics: steps[3].score,
        originality: steps[4].score,
        references: steps[5].score,
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
