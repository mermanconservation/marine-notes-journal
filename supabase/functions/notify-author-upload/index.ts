import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    const { authorEmail, authorName, editorName, editorEmail, title, manuscriptType } = await req.json();

    if (!authorEmail || !title) {
      return new Response(JSON.stringify({ error: "Missing authorEmail or title" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const esc = (s: string) =>
      String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

    const html = `
      <h2>A manuscript has been submitted on your behalf</h2>
      <p>Dear ${esc(authorName || "Author")},</p>
      <p>An editor at Marine Notes Journal has uploaded a manuscript to the editorial system on your behalf. The details are recorded below for your records.</p>
      <table style="border-collapse:collapse;width:100%;max-width:600px;margin:16px 0;">
        <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #ddd;">Title</td><td style="padding:8px;border-bottom:1px solid #ddd;">${esc(title)}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #ddd;">Type</td><td style="padding:8px;border-bottom:1px solid #ddd;">${esc(manuscriptType || "")}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #ddd;">Uploaded by editor</td><td style="padding:8px;border-bottom:1px solid #ddd;">${esc(editorName || "Editor")} &lt;${esc(editorEmail || "")}&gt;</td></tr>
        <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #ddd;">Date</td><td style="padding:8px;border-bottom:1px solid #ddd;">${new Date().toUTCString()}</td></tr>
      </table>
      <p>If your account email matches the one used at submission, the manuscript will appear automatically in your author dashboard. If you did not expect this submission, please reply to this email so we can investigate.</p>
      <p>Kind regards,<br/>Marine Notes Journal Editorial Office</p>
      <hr/>
      <p style="color:#888;font-size:12px;">This is an automated confirmation from Marine Notes Journal.</p>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({
        from: "Marine Notes Journal <editor@marinenotesjournal.com>",
        to: [authorEmail],
        reply_to: "editor@marinenotesjournal.com",
        subject: `Manuscript uploaded on your behalf: ${title}`,
        html,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(`Resend API error [${res.status}]: ${JSON.stringify(data)}`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("notify-author-upload error:", msg);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
