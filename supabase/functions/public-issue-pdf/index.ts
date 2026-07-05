import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { volume, issue } = await req.json();
    if (!volume || !issue) {
      return new Response(JSON.stringify({ error: "Missing volume/issue" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: iss, error } = await supabase
      .from("journal_issues")
      .select("issue_pdf_url,status")
      .eq("volume", String(volume))
      .eq("issue", String(issue))
      .maybeSingle();
    if (error || !iss?.issue_pdf_url || iss.status !== "closed") {
      return new Response(JSON.stringify({ error: "Not available" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { data, error: sErr } = await supabase.storage.from("issue-pdfs").createSignedUrl(iss.issue_pdf_url, 60 * 15);
    if (sErr) throw sErr;
    return new Response(JSON.stringify({ url: data.signedUrl }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
