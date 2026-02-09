export interface ArticleMetrics {
  citations: number;
  downloads: number;
  views: number;
  altmetricScore: number;
  socialShares: number;
}

export interface Article {
  id: number;
  doi: string;
  title: string;
  authors: string;
  orcidIds?: string[];
  type: "Research" | "Notes" | "Review" | "Case Study" | "Conservation News" | "Technical Report / Risk Assessment";
  publicationDate: string;
  pdfUrl: string;
  resolverUrl: string;
  volume: string;
  issue: string;
  abstract: string;
  metrics?: ArticleMetrics;
}

export interface ArticlesData {
  articles: Article[];
  nextSequence: number;
}

export function generateDOI(year: number, sequence: number): string {
  const paddedSequence = sequence.toString().padStart(3, '0');
  return `MNJ-${year}-${paddedSequence}`;
}

export function generateResolverUrl(doi: string): string {
  return `https://www.marinenotesjournal.com/doi/${doi}`;
}
