import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const { title, authorName, authorEmail, manuscriptType, abstract, keywords } = await req.json();

    const htmlBody = `
      <h2>New Manuscript Submission</h2>
      <p>A new manuscript has been submitted through the Marine Notes Journal portal.</p>
      <table style="border-collapse:collapse;width:100%;max-width:600px;">
        <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #ddd;">Title</td><td style="padding:8px;border-bottom:1px solid #ddd;">${title}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #ddd;">Type</td><td style="padding:8px;border-bottom:1px solid #ddd;">${manuscriptType}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #ddd;">Author</td><td style="padding:8px;border-bottom:1px solid #ddd;">${authorName} (${authorEmail})</td></tr>
        <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #ddd;">Keywords</td><td style="padding:8px;border-bottom:1px solid #ddd;">${keywords}</td></tr>
      </table>
      <h3>Abstract</h3>
      <p>${abstract}</p>
      <hr/>
      <p style="color:#888;font-size:12px;">This is an automated notification from Marine Notes Journal.</p>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Marine Notes Journal <onboarding@resend.dev>",
        to: ["editor@marinenotesjournal.com"],
        subject: `New Submission: ${title}`,
        html: htmlBody,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(`Resend API error [${res.status}]: ${JSON.stringify(data)}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error sending editor notification:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
