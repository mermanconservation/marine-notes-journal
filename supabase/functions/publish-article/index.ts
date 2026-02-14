import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ARTICLE_TYPES = [
  "Research Article",
  "Review Article",
  "Short Communication",
  "Technical Report / Risk Assessment",
  "Conservation News",
  "Field Notes",
  "Observational Reports",
  "Case Study",
  "Methodology Paper",
];

function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, "").trim();
}

function validateArticle(article: any, requireDoi: boolean): { valid: boolean; error?: string } {
  if (!article || typeof article !== "object") return { valid: false, error: "Missing article data" };

  if (requireDoi) {
    if (typeof article.doi !== "string" || !/^MNJ-\d{4}-\d{3}$/.test(article.doi)) {
      return { valid: false, error: "Invalid DOI format" };
    }
  }

  if (typeof article.title !== "string" || article.title.length < 5 || article.title.length > 500) {
    return { valid: false, error: "Title must be between 5 and 500 characters" };
  }
  if (typeof article.authors !== "string" || article.authors.length < 2 || article.authors.length > 1000) {
    return { valid: false, error: "Authors must be between 2 and 1000 characters" };
  }
  if (typeof article.type !== "string" || !ARTICLE_TYPES.includes(article.type)) {
    return { valid: false, error: "Invalid article type" };
  }
  if (typeof article.abstract !== "string" || article.abstract.length < 10 || article.abstract.length > 10000) {
    return { valid: false, error: "Abstract must be between 10 and 10000 characters" };
  }
  if (typeof article.volume !== "string" || !/^\d+$/.test(article.volume)) {
    return { valid: false, error: "Volume must be a number" };
  }
  if (typeof article.issue !== "string" || !/^\d+$/.test(article.issue)) {
    return { valid: false, error: "Issue must be a number" };
  }
  if (article.publicationDate && (typeof article.publicationDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(article.publicationDate))) {
    return { valid: false, error: "Invalid publication date format" };
  }
  if (article.orcidIds) {
    if (!Array.isArray(article.orcidIds)) return { valid: false, error: "ORCID IDs must be an array" };
    for (const oid of article.orcidIds) {
      if (typeof oid !== "string" || (oid.length > 0 && !/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/.test(oid))) {
        return { valid: false, error: "Invalid ORCID ID format" };
      }
    }
  }
  return { valid: true };
}

function sanitizeArticle(article: any) {
  return {
    title: stripHtml(article.title),
    authors: stripHtml(article.authors),
    abstract: stripHtml(article.abstract),
    type: article.type,
    volume: article.volume,
    issue: article.issue,
    publicationDate: article.publicationDate,
    orcidIds: (article.orcidIds || []).filter((id: string) => id.length > 0),
    doi: article.doi,
    pdfUrl: article.pdfUrl,
  };
}

function mapDbError(error: any): { message: string; status: number } {
  console.error("Database error:", JSON.stringify(error));
  const code = error?.code;
  if (code === "23505") return { message: "An article with this DOI already exists", status: 409 };
  if (code === "23502") return { message: "A required field is missing", status: 400 };
  if (code === "23503") return { message: "Invalid reference", status: 400 };
  return { message: "Unable to process request", status: 500 };
}

function errorResponse(msg: string, status: number) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { passcode, article, action } = await req.json();

    const editorPasscode = Deno.env.get("EDITOR_PASSCODE");
    if (!editorPasscode || passcode !== editorPasscode) {
      return errorResponse("Invalid passcode", 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (action === "get-next-doi") {
      const { data: articles } = await supabase
        .from("articles")
        .select("doi")
        .order("id", { ascending: false })
        .limit(1);

      const year = new Date().getFullYear();
      let nextNum = 4;
      if (articles && articles.length > 0) {
        const match = articles[0].doi.match(/MNJ-\d+-(\d+)/);
        if (match) nextNum = parseInt(match[1]) + 1;
      }
      const doi = `MNJ-${year}-${nextNum.toString().padStart(3, "0")}`;
      return new Response(JSON.stringify({ doi, nextNum }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "upload-pdf") {
      const { fileName, fileData } = article || {};
      if (typeof fileName !== "string" || typeof fileData !== "string") {
        return errorResponse("Invalid file data", 400);
      }
      if (fileName.length > 200 || !/^[\w\-\/\.]+$/.test(fileName)) {
        return errorResponse("Invalid file name", 400);
      }
      const bytes = Uint8Array.from(atob(fileData), (c) => c.charCodeAt(0));
      if (bytes.length > 50 * 1024 * 1024) {
        return errorResponse("File too large (max 50MB)", 400);
      }

      const { error } = await supabase.storage
        .from("manuscripts")
        .upload(fileName, bytes, { contentType: "application/pdf", upsert: true });

      if (error) {
        console.error("Storage error:", JSON.stringify(error));
        return errorResponse("Failed to upload file", 500);
      }

      const { data: urlData } = supabase.storage.from("manuscripts").getPublicUrl(fileName);
      return new Response(JSON.stringify({ url: urlData.publicUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "list-articles") {
      const { data, error } = await supabase
        .from("articles")
        .select("*")
        .order("id", { ascending: true });

      if (error) {
        const mapped = mapDbError(error);
        return errorResponse(mapped.message, mapped.status);
      }

      const staticArticles = [
        {
          id: -1, doi: "MNJ-2026-001",
          title: "Unusual 2025 interactions of Iberian Orcinus orca with sailing vessels: behaviour patterns and conservation responses",
          authors: "Dr. Maria Fernanda Silva", orcid_ids: [], type: "Conservation News",
          publication_date: "2026-01-01",
          pdf_url: "/manuscripts/2026/vol1-iss1-Unusual-2025-interactions-of-Iberian-Orcinus-orca-with-sailing-vessels-behaviour-patterns-and-conservation-responses.pdf",
          volume: "1", issue: "1",
          abstract: "During 2025, the Iberian killer whale (Orcinus orca) population exhibited an ongoing pattern of interactions with sailing boats...",
          is_static: true,
        },
        {
          id: -2, doi: "MNJ-2026-002",
          title: "The Environmental Risks of a Floating LNG Terminal in the Pagasetic Gulf",
          authors: "Christos Taklis", orcid_ids: [], type: "Technical Report / Risk Assessment",
          publication_date: "2026-01-01",
          pdf_url: "/manuscripts/2026/vol1-iss1-The-Environmental-Risks-of-a-Floating-LNG-Terminal-in-the-Pagasetic-Gulf.pdf",
          volume: "1", issue: "1",
          abstract: "This report assesses the environmental risks associated with the proposed floating liquefied natural gas terminal in the Pagasetic Gulf...",
          is_static: true,
        },
        {
          id: -3, doi: "MNJ-2026-003",
          title: "Juvenile Humpback Whale Recorded in the Pagasetic Gulf, Greece",
          authors: "Christos Taklis", orcid_ids: ["0000-0001-9181-0292"], type: "Conservation News",
          publication_date: "2026-02-12",
          pdf_url: "/manuscripts/2026/vol1-iss1-Juvenile-Humpback-Whale-Recorded-in-the-Pagasetic-Gulf-Greece.pdf",
          volume: "1", issue: "1",
          abstract: "On 24 January 2026, multiple independent reports confirmed the presence of a juvenile humpback whale...",
          is_static: true,
        },
      ];

      const dbDois = new Set((data || []).map((a: any) => a.doi));
      const merged = [
        ...staticArticles.filter((s) => !dbDois.has(s.doi)),
        ...(data || []),
      ];

      return new Response(JSON.stringify({ articles: merged }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "publish") {
      const validation = validateArticle(article, true);
      if (!validation.valid) return errorResponse(validation.error!, 400);
      const clean = sanitizeArticle(article);

      const { data, error } = await supabase.from("articles").insert({
        doi: clean.doi,
        title: clean.title,
        authors: clean.authors,
        orcid_ids: clean.orcidIds,
        type: clean.type,
        publication_date: clean.publicationDate || new Date().toISOString().split("T")[0],
        pdf_url: clean.pdfUrl,
        resolver_url: `https://www.marinenotesjournal.com/doi/${clean.doi}`,
        volume: clean.volume,
        issue: clean.issue,
        abstract: clean.abstract,
      }).select().single();

      if (error) {
        const mapped = mapDbError(error);
        return errorResponse(mapped.message, mapped.status);
      }

      return new Response(JSON.stringify({ success: true, article: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update") {
      if (!article?.id || typeof article.id !== "number") {
        return errorResponse("Invalid article ID", 400);
      }
      const validation = validateArticle(article, false);
      if (!validation.valid) return errorResponse(validation.error!, 400);
      const clean = sanitizeArticle(article);

      const updatePayload: any = {
        title: clean.title,
        authors: clean.authors,
        orcid_ids: clean.orcidIds,
        type: clean.type,
        publication_date: clean.publicationDate,
        volume: clean.volume,
        issue: clean.issue,
        abstract: clean.abstract,
      };
      if (clean.pdfUrl) updatePayload.pdf_url = clean.pdfUrl;

      const { data, error } = await supabase.from("articles")
        .update(updatePayload)
        .eq("id", article.id)
        .select().single();

      if (error) {
        const mapped = mapDbError(error);
        return errorResponse(mapped.message, mapped.status);
      }

      return new Response(JSON.stringify({ success: true, article: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return errorResponse("Unknown action", 400);
  } catch (err) {
    console.error("Unhandled error:", err);
    return errorResponse("An unexpected error occurred", 500);
  }
});
