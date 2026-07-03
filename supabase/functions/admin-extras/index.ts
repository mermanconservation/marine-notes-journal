import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { timingSafeEqual } from "https://deno.land/std@0.224.0/crypto/timing_safe_equal.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function constantTimeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action, passcode, payload } = await req.json();

    const editorPasscode = Deno.env.get("EDITOR_PASSCODE");
    if (!editorPasscode || typeof passcode !== "string" || !constantTimeEqual(passcode, editorPasscode)) {
      return json({ error: "Invalid passcode" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ---------- Send publication email ----------
    if (action === "send-publication-email") {
      const { recipient, title, doi, authors, volume, issue, pages, articleUrl, pdfUrl } = payload || {};
      if (!recipient || !title || !doi) return json({ error: "Missing fields" }, 400);

      const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
      if (!RESEND_API_KEY) return json({ error: "RESEND_API_KEY not configured" }, 500);

      const citation = `${authors} (${new Date().getFullYear()}). ${title}. Marine Notes Journal, ${volume}(${issue})${pages ? `, ${pages}` : ""}. ${doi}`;

      const html = `
        <div style="font-family: Georgia, serif; max-width: 620px; margin: 0 auto; color:#1a2332;">
          <h2 style="color:#0b3d5c; border-bottom: 2px solid #0b3d5c; padding-bottom: 8px;">Your manuscript has been published</h2>
          <p>Dear author,</p>
          <p>We are pleased to inform you that your manuscript is now published in <strong>Marine Notes Journal</strong>.</p>
          <table style="width:100%; border-collapse: collapse; margin: 16px 0; background:#f5f8fa;">
            <tr><td style="padding:8px 12px;"><strong>Title:</strong></td><td style="padding:8px 12px;">${title}</td></tr>
            <tr><td style="padding:8px 12px;"><strong>Authors:</strong></td><td style="padding:8px 12px;">${authors || ""}</td></tr>
            <tr><td style="padding:8px 12px;"><strong>DOI:</strong></td><td style="padding:8px 12px;"><code>${doi}</code></td></tr>
            <tr><td style="padding:8px 12px;"><strong>Volume / Issue:</strong></td><td style="padding:8px 12px;">${volume} (${issue})${pages ? `, pp. ${pages}` : ""}</td></tr>
          </table>
          <p><strong>Suggested citation (APA):</strong><br><em>${citation}</em></p>
          <p>
            ${articleUrl ? `<a href="${articleUrl}" style="background:#0b3d5c;color:#fff;padding:10px 18px;text-decoration:none;border-radius:4px;display:inline-block;margin-right:8px;">View Article</a>` : ""}
            ${pdfUrl ? `<a href="${pdfUrl}" style="background:#fff;color:#0b3d5c;padding:10px 18px;text-decoration:none;border-radius:4px;display:inline-block;border:1px solid #0b3d5c;">Download PDF</a>` : ""}
          </p>
          <p style="margin-top:24px;">Thank you for contributing to Marine Notes Journal.</p>
          <p style="color:#667; font-size: 13px; border-top: 1px solid #ddd; padding-top: 12px;">Marine Notes Journal · marinenotesjournal.com</p>
        </div>`;

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
        body: JSON.stringify({
          from: "Marine Notes Journal <onboarding@resend.dev>",
          to: [recipient],
          subject: `Your manuscript is published — ${doi}`,
          html,
        }),
      });
      const data = await res.json();
      if (!res.ok) return json({ error: data?.message || "Failed to send email", detail: data }, 500);
      return json({ success: true, id: data?.id });
    }

    // ---------- Extract PDF metadata via Lovable AI ----------
    if (action === "extract-pdf-metadata") {
      const { pdfUrl, pdfBase64, mimeType } = payload || {};
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY not configured" }, 500);

      let fileData = pdfBase64;
      if (!fileData && pdfUrl) {
        const pdfRes = await fetch(pdfUrl);
        if (!pdfRes.ok) return json({ error: "Could not fetch PDF" }, 400);
        const buf = new Uint8Array(await pdfRes.arrayBuffer());
        let binary = "";
        for (let i = 0; i < buf.length; i++) binary += String.fromCharCode(buf[i]);
        fileData = btoa(binary);
      }
      if (!fileData) return json({ error: "Provide pdfUrl or pdfBase64" }, 400);

      const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE_API_KEY}` },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content:
                "You extract scholarly metadata from research manuscript PDFs. Reply with valid JSON only, no prose.",
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text:
                    'Extract the manuscript metadata. Reply as JSON: {"title": string, "authors": string (comma-separated), "abstract": string, "keywords": string[]}. If abstract is long, keep first ~2500 chars.',
                },
                {
                  type: "file",
                  file: { filename: "manuscript.pdf", file_data: `data:${mimeType || "application/pdf"};base64,${fileData}` },
                },
              ],
            },
          ],
          response_format: { type: "json_object" },
        }),
      });
      if (!aiRes.ok) {
        const t = await aiRes.text();
        return json({ error: "AI extraction failed", detail: t.substring(0, 400) }, 500);
      }
      const aiData = await aiRes.json();
      const raw = aiData?.choices?.[0]?.message?.content || "{}";
      let parsed: any = {};
      try { parsed = JSON.parse(raw); } catch { parsed = { raw }; }
      return json({ metadata: parsed });
    }

    // ---------- Upload full-issue PDF ----------
    if (action === "upload-issue-pdf") {
      const { volume, issue, year, fileName, fileData } = payload || {};
      if (!volume || !issue || !fileName || !fileData) return json({ error: "Missing fields" }, 400);
      const bytes = Uint8Array.from(atob(fileData), (c) => c.charCodeAt(0));
      if (bytes.length > 100 * 1024 * 1024) return json({ error: "File too large (max 100MB)" }, 400);
      if (bytes.length < 5 || bytes[0] !== 0x25 || bytes[1] !== 0x50 || bytes[2] !== 0x44 || bytes[3] !== 0x46)
        return json({ error: "File is not a PDF" }, 400);

      const safeName = fileName.replace(/[^\w\-\.]/g, "-");
      const path = `vol${volume}-iss${issue}/${safeName}`;
      const { error: upErr } = await supabase.storage.from("issue-pdfs")
        .upload(path, bytes, { contentType: "application/pdf", upsert: true });
      if (upErr) return json({ error: upErr.message }, 500);

      // upsert journal_issues row
      await supabase.from("journal_issues").upsert(
        { volume: String(volume), issue: String(issue), year: Number(year) || new Date().getFullYear(), issue_pdf_url: path, status: "closed" },
        { onConflict: "volume,issue" }
      );
      return json({ success: true, path });
    }

    // ---------- Get signed download URL for issue PDF ----------
    if (action === "get-issue-pdf-signed-url") {
      const { path } = payload || {};
      if (!path) return json({ error: "Missing path" }, 400);
      const { data, error } = await supabase.storage.from("issue-pdfs").createSignedUrl(path, 60 * 15);
      if (error) return json({ error: error.message }, 500);
      return json({ url: data.signedUrl });
    }

    // ---------- Open a new volume/issue (or many at once) ----------
    if (action === "open-issue") {
      const { volume, issue, year, notes } = payload || {};
      if (!volume || !issue) return json({ error: "Missing volume/issue" }, 400);
      const { data, error } = await supabase.from("journal_issues").upsert(
        { volume: String(volume), issue: String(issue), year: Number(year) || new Date().getFullYear(), status: "open", notes: notes || null },
        { onConflict: "volume,issue" }
      ).select().single();
      if (error) return json({ error: error.message }, 500);
      return json({ success: true, issue: data });
    }

    if (action === "bulk-open-issues") {
      const { items } = payload || {};
      if (!Array.isArray(items) || items.length === 0) return json({ error: "items[] required" }, 400);
      const rows = items.map((it: any) => ({
        volume: String(it.volume),
        issue: String(it.issue),
        year: Number(it.year) || new Date().getFullYear(),
        status: "open",
        notes: it.notes || null,
      }));
      const { data, error } = await supabase.from("journal_issues").upsert(rows, { onConflict: "volume,issue" }).select();
      if (error) return json({ error: error.message }, 500);
      return json({ success: true, count: data?.length || 0, issues: data });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    console.error(err);
    return json({ error: (err as Error).message || "Unexpected error" }, 500);
  }
});
