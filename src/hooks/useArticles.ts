import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import articlesData from "@/data/articles.json";

export interface UnifiedArticle {
  id: number;
  doi: string;
  title: string;
  authors: string;
  orcidIds?: string[];
  type: string;
  publicationDate: string;
  pdfUrl: string;
  resolverUrl: string;
  volume: string;
  issue: string;
  abstract: string;
}

function mapStaticArticles(): UnifiedArticle[] {
  return articlesData.articles.map((a) => ({
    id: a.id,
    doi: a.doi,
    title: a.title,
    authors: a.authors,
    orcidIds: a.orcidIds,
    type: a.type,
    publicationDate: a.publicationDate,
    pdfUrl: a.pdfUrl,
    resolverUrl: a.resolverUrl,
    volume: a.volume,
    issue: a.issue,
    abstract: a.abstract,
  }));
}

async function fetchDbArticles(): Promise<UnifiedArticle[]> {
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .order("id", { ascending: true });

  if (error || !data) return [];

  return data.map((a: any) => ({
    id: 1000 + a.id,
    doi: a.doi,
    title: a.title,
    authors: a.authors,
    orcidIds: a.orcid_ids || [],
    type: a.type,
    publicationDate: a.publication_date,
    pdfUrl: a.pdf_url || "",
    resolverUrl: a.resolver_url,
    volume: a.volume,
    issue: a.issue,
    abstract: a.abstract,
  }));
}

export function useArticles() {
  const { data: dbArticles = [], isLoading } = useQuery({
    queryKey: ["db-articles"],
    queryFn: fetchDbArticles,
    staleTime: 30_000,
  });

  const staticArticles = mapStaticArticles();

  // Merge: static articles first, then DB articles (avoid DOI duplicates)
  const staticDois = new Set(staticArticles.map((a) => a.doi));
  const merged = [
    ...staticArticles,
    ...dbArticles.filter((a) => !staticDois.has(a.doi)),
  ];

  return { articles: merged, isLoading };
}
