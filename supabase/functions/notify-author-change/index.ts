import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const esc = (s: unknown) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    const {
      title,
      manuscriptType,
      editorName,
      editorEmail,
      oldAuthorName,
      oldAuthorEmail,
      newAuthorName,
      newAuthorEmail,
      changedAt,
    } = await req.json();

    if (!title || (!oldAuthorEmail && !newAuthorEmail)) {
      return new Response(JSON.stringify({ error: "Missing title or recipient emails" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const when = changedAt ? new Date(changedAt) : new Date();
    const stamp = when.toLocaleString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

    const table = `
      <table style="border-collapse:collapse;width:100%;max-width:620px;margin:16px 0;">
        <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #ddd;">Manuscript</td><td style="padding:8px;border-bottom:1px solid #ddd;">${esc(title)}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #ddd;">Type</td><td style="padding:8px;border-bottom:1px solid #ddd;">${esc(manuscriptType)}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #ddd;">Previous corresponding author</td><td style="padding:8px;border-bottom:1px solid #ddd;">${esc(oldAuthorName)} &lt;${esc(oldAuthorEmail)}&gt;</td></tr>
        <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #ddd;">New corresponding author</td><td style="padding:8px;border-bottom:1px solid #ddd;">${esc(newAuthorName)} &lt;${esc(newAuthorEmail)}&gt;</td></tr>
        <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #ddd;">Changed by</td><td style="padding:8px;border-bottom:1px solid #ddd;">${esc(editorName || "Editor")} &lt;${esc(editorEmail)}&gt;</td></tr>
        <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #ddd;">Date and time</td><td style="padding:8px;border-bottom:1px solid #ddd;">${esc(stamp)}</td></tr>
      </table>`;

    const footer = `
      <p>If this change was not expected, reply to this email and the editorial office will review it.</p>
      <p>Kind regards,<br/>Marine Notes Journal Editorial Office</p>
      <hr/>
      <p style="color:#888;font-size:12px;">Marine Notes Journal · ISSN 2979-8841 (Online) · marinenotesjournal.com</p>`;

    const send = async (to: string, subject: string, intro: string) => {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
        body: JSON.stringify({
          from: "Marine Notes Journal <editor@marinenotesjournal.com>",
          to: [to],
          reply_to: "editor@marinenotesjournal.com",
          subject,
          html: `<div style="font-family:Georgia,serif;color:#1a2332;">${intro}${table}${footer}</div>`,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error(`Resend error [${res.status}]:`, JSON.stringify(data));
        return { to, ok: false, status: res.status, detail: data };
      }
      return { to, ok: true, id: data?.id };
    };

    const results: unknown[] = [];

    if (oldAuthorEmail) {
      results.push(
        await send(
          oldAuthorEmail,
          `Corresponding author changed — ${title}`,
          `<h2 style="color:#0b3d5c;">Corresponding author changed</h2>
           <p>Dear ${esc(oldAuthorName || "Author")},</p>
           <p>You are no longer listed as the corresponding author for the manuscript below in the Marine Notes Journal editorial system.</p>`,
        ),
      );
    }

    if (newAuthorEmail && newAuthorEmail !== oldAuthorEmail) {
      results.push(
        await send(
          newAuthorEmail,
          `You are now the corresponding author — ${title}`,
          `<h2 style="color:#0b3d5c;">You are now the corresponding author</h2>
           <p>Dear ${esc(newAuthorName || "Author")},</p>
           <p>An editor at Marine Notes Journal has recorded you as the corresponding author for the manuscript below. All future correspondence about this manuscript will be sent to you.</p>`,
        ),
      );
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
