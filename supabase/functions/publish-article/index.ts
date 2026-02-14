import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { passcode, article, action } = await req.json();

    const editorPasscode = Deno.env.get("EDITOR_PASSCODE");
    if (!editorPasscode || passcode !== editorPasscode) {
      return new Response(
        JSON.stringify({ error: "Invalid passcode" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (action === "get-next-doi") {
      // Get the highest DOI number from the database
      const { data: articles } = await supabase
        .from("articles")
        .select("doi")
        .order("id", { ascending: false })
        .limit(1);

      const year = new Date().getFullYear();
      // Start from 4 since articles.json has 3 static articles
      let nextNum = 4;
      if (articles && articles.length > 0) {
        const match = articles[0].doi.match(/MNJ-\d+-(\d+)/);
        if (match) {
          nextNum = parseInt(match[1]) + 1;
        }
      }
      const doi = `MNJ-${year}-${nextNum.toString().padStart(3, "0")}`;

      return new Response(
        JSON.stringify({ doi, nextNum }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "upload-pdf") {
      // Handle base64 PDF upload
      const { fileName, fileData } = article;
      const bytes = Uint8Array.from(atob(fileData), (c) => c.charCodeAt(0));

      const { data, error } = await supabase.storage
        .from("manuscripts")
        .upload(fileName, bytes, {
          contentType: "application/pdf",
          upsert: true,
        });

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: urlData } = supabase.storage
        .from("manuscripts")
        .getPublicUrl(fileName);

      return new Response(
        JSON.stringify({ url: urlData.publicUrl }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "list-articles") {
      const { data, error } = await supabase
        .from("articles")
        .select("*")
        .order("id", { ascending: true });

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Static articles from the JSON file (always included)
      const staticArticles = [
        {
          id: -1,
          doi: "MNJ-2026-001",
          title: "Unusual 2025 interactions of Iberian Orcinus orca with sailing vessels: behaviour patterns and conservation responses",
          authors: "Dr. Maria Fernanda Silva",
          orcid_ids: [],
          type: "Conservation News",
          publication_date: "2026-01-01",
          pdf_url: "/manuscripts/2026/vol1-iss1-Unusual-2025-interactions-of-Iberian-Orcinus-orca-with-sailing-vessels-behaviour-patterns-and-conservation-responses.pdf",
          volume: "1",
          issue: "1",
          abstract: "During 2025, the Iberian killer whale (Orcinus orca) population exhibited an ongoing pattern of interactions with sailing boats...",
          is_static: true,
        },
        {
          id: -2,
          doi: "MNJ-2026-002",
          title: "The Environmental Risks of a Floating LNG Terminal in the Pagasetic Gulf",
          authors: "Christos Taklis",
          orcid_ids: [],
          type: "Technical Report / Risk Assessment",
          publication_date: "2026-01-01",
          pdf_url: "/manuscripts/2026/vol1-iss1-The-Environmental-Risks-of-a-Floating-LNG-Terminal-in-the-Pagasetic-Gulf.pdf",
          volume: "1",
          issue: "1",
          abstract: "This report assesses the environmental risks associated with the proposed floating liquefied natural gas terminal in the Pagasetic Gulf...",
          is_static: true,
        },
        {
          id: -3,
          doi: "MNJ-2026-003",
          title: "Juvenile Humpback Whale Recorded in the Pagasetic Gulf, Greece",
          authors: "Christos Taklis",
          orcid_ids: ["0000-0001-9181-0292"],
          type: "Conservation News",
          publication_date: "2026-02-12",
          pdf_url: "/manuscripts/2026/vol1-iss1-Juvenile-Humpback-Whale-Recorded-in-the-Pagasetic-Gulf-Greece.pdf",
          volume: "1",
          issue: "1",
          abstract: "On 24 January 2026, multiple independent reports confirmed the presence of a juvenile humpback whale...",
          is_static: true,
        },
      ];

      // Merge: static first, then DB (skip DB dupes by DOI)
      const dbDois = new Set((data || []).map((a: any) => a.doi));
      const merged = [
        ...staticArticles.filter((s) => !dbDois.has(s.doi)),
        ...(data || []),
      ];

      return new Response(
        JSON.stringify({ articles: merged }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "publish") {
      const { data, error } = await supabase.from("articles").insert({
        doi: article.doi,
        title: article.title,
        authors: article.authors,
        orcid_ids: article.orcidIds || [],
        type: article.type,
        publication_date: article.publicationDate || new Date().toISOString().split("T")[0],
        pdf_url: article.pdfUrl,
        resolver_url: `https://www.marinenotesjournal.com/doi/${article.doi}`,
        volume: article.volume,
        issue: article.issue,
        abstract: article.abstract,
      }).select().single();

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, article: data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "update") {
      const { data, error } = await supabase.from("articles").update({
        title: article.title,
        authors: article.authors,
        orcid_ids: article.orcidIds || [],
        type: article.type,
        publication_date: article.publicationDate,
        pdf_url: article.pdfUrl,
        volume: article.volume,
        issue: article.issue,
        abstract: article.abstract,
      }).eq("id", article.id).select().single();

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, article: data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
