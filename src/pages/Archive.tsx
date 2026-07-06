import { useState, useMemo, useEffect } from "react";
import { formatMonthYear } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Download, Loader2 } from "lucide-react";
import { useArticles } from "@/hooks/useArticles";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";


const Archive = () => {
  const navigate = useNavigate();
  const { articles } = useArticles();
  const { toast } = useToast();
  const [journalIssues, setJournalIssues] = useState<any[]>([]);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("journal_issues")
      .select("id,volume,issue,year,status,issue_pdf_url,notes")
      .order("year", { ascending: false })
      .order("volume", { ascending: false })
      .order("issue", { ascending: false })
      .then(({ data }) => setJournalIssues(data || []));
  }, []);

  const handleDownloadFullIssue = async (iss: any) => {
    setDownloadingId(iss.id);
    try {
      const { data, error } = await supabase.functions.invoke("public-issue-pdf", {
        body: { volume: iss.volume, issue: iss.issue },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message || "Download failed");
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (err: any) {
      toast({ title: "Download failed", description: err.message, variant: "destructive" });
    }
    setDownloadingId(null);
  };

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedType, setSelectedType] = useState("");

  // Load articles from articles.json and organize by volume/issue
  const volumes = useMemo(() => {
    const volumeMap = new Map();

    const ensureVolume = (volumeStr: string, year: number) => {
      const volKey = `${volumeStr}`;
      if (!volumeMap.has(volKey)) {
        volumeMap.set(volKey, {
          year,
          volume: parseInt(volumeStr),
          issues: new Map(),
        });
      }
      return volumeMap.get(volKey);
    };

    articles.forEach(article => {
      const pubYear = new Date(article.publicationDate).getFullYear();
      const vol = ensureVolume(article.volume, pubYear);
      const issueKey = article.issue;

      if (!vol.issues.has(issueKey)) {
        vol.issues.set(issueKey, {
          issue: parseInt(article.issue),
          title: "Issue " + article.issue,
          date: formatMonthYear(article.publicationDate),
          articles: [],
        });
      }

      vol.issues.get(issueKey).articles.push({
        title: article.title,
        authors: article.authors,
        type: article.type,
        doi: article.doi,
        abstract: article.abstract,
        pdfUrl: article.pdfUrl,
      });
    });

    // Include issues from journal_issues even when they have no articles yet
    journalIssues.forEach((ji) => {
      const vol = ensureVolume(String(ji.volume), Number(ji.year));
      const issueKey = String(ji.issue);
      if (!vol.issues.has(issueKey)) {
        vol.issues.set(issueKey, {
          issue: parseInt(String(ji.issue)),
          title: "Issue " + ji.issue,
          date: String(ji.year),
          articles: [],
        });
      }
    });

    return Array.from(volumeMap.values())
      .map(vol => ({
        ...vol,
        issues: Array.from(vol.issues.values()).sort((a: any, b: any) => a.issue - b.issue),
      }))
      .sort((a: any, b: any) => a.volume - b.volume);
  }, [articles, journalIssues]);

  const years = Array.from(new Set(volumes.map((v: any) => String(v.year)))).sort();
  const articleTypes = ["All Types", "Research Article", "Review Article", "Short Communication", "Case Study", "Technical Report / Risk Assessment", "Field Notes", "Observational Reports", "Conservation News"];

  const filteredVolumes = volumes.filter(volume => {
    return selectedYear === "" || volume.year.toString() === selectedYear;
  });

  // Immediate search results
  const searchResults = useMemo(() => {
    const hasSearch = searchTerm.trim().length > 0;
    const hasType = selectedType.length > 0;
    if (!hasSearch && !hasType) return [];

    const term = searchTerm.toLowerCase();
    return articles.filter(article => {
      const matchesSearch = !hasSearch || 
        article.title.toLowerCase().includes(term) ||
        article.authors.toLowerCase().includes(term) ||
        article.abstract?.toLowerCase().includes(term);
      const matchesType = !hasType || article.type === selectedType;
      return matchesSearch && matchesType;
    });
  }, [articles, searchTerm, selectedType]);

  const statistics = useMemo(() => {
    const totalArticles = articles.length;
    const uniqueVolumes = new Set(articles.map(a => a.volume)).size;
    const uniqueIssues = new Set(articles.map(a => `${a.volume}-${a.issue}`)).size;
    
    return {
      totalArticles,
      uniqueVolumes,
      uniqueIssues
    };
  }, [articles]);

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="font-academic text-4xl lg:text-5xl font-semibold mb-4">
              Archive
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Browse our complete collection of published research articles, reviews, 
              and special issues in marine science and conservation.
            </p>
          </div>

          {/* Search and Filter */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search articles by title, author, or keywords..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex gap-2">
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="All Years" />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map(year => (
                        <SelectItem key={year} value={year}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={selectedType} onValueChange={(v) => setSelectedType(v === "all" ? "" : v)}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {articleTypes.filter(type => type !== "All Types").map(type => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Immediate Search Results */}
          {searchResults.length > 0 && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="text-lg">
                  {searchResults.length} {searchResults.length === 1 ? "result" : "results"} found
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {searchResults.map((article, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium px-2 py-1 bg-primary/10 text-primary rounded">
                            {article.type}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Vol. {article.volume}, Issue {article.issue}
                          </span>
                        </div>
                        <h4 className="font-medium text-sm mb-1">{article.title}</h4>
                        <p className="text-xs text-muted-foreground">{article.authors}</p>
                      </div>
                      {article.pdfUrl && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(article.pdfUrl!, '_blank', 'noopener,noreferrer')}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Archive Content */}
          <div className="space-y-8">
            {filteredVolumes.map((volume) => (
              <div key={volume.year} className="space-y-6">
                <div className="text-center">
                  <h2 className="font-academic text-2xl font-semibold">
                    Volume {volume.volume} ({volume.year})
                  </h2>
                </div>

                {volume.issues.map((issue) => {
                  const meta = journalIssues.find(
                    (j) => String(j.volume) === String(volume.volume) && String(j.issue) === String(issue.issue)
                  );
                  const closed = meta?.status === "closed";
                  const hasPdf = !!meta?.issue_pdf_url;
                  return (
                  <Card 
                    key={issue.issue} 
                    className="shadow-soft cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => navigate(`/archive/${volume.volume}/${issue.issue}`)}
                  >
                    <CardHeader className="bg-muted/20">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-xl flex items-center gap-2">
                            Issue {issue.issue}: {issue.title}
                            <span className={`text-xs font-medium px-2 py-0.5 rounded ${closed ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                              {closed ? "Closed" : "Open"}
                            </span>
                          </CardTitle>
                          <p className="text-muted-foreground mt-1">{issue.date}</p>
                          <p className="text-sm text-muted-foreground mt-2">
                            {issue.articles.length} {issue.articles.length === 1 ? 'article' : 'articles'}
                          </p>
                        </div>
                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                          {closed && hasPdf ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownloadFullIssue(meta)}
                              disabled={downloadingId === meta.id}
                            >
                              {downloadingId === meta.id
                                ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                : <Download className="h-4 w-4 mr-2" />}
                              Full Issue PDF
                            </Button>
                          ) : (
                            <Button variant="outline" size="sm" disabled title={closed ? "Final PDF not uploaded" : "Issue still open"}>
                              <Download className="h-4 w-4 mr-2" />
                              Full Issue PDF
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="p-6">
                      <div className="space-y-3">
                        {issue.articles.map((article, idx) => (
                          <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-medium px-2 py-1 bg-primary/10 text-primary rounded">
                                  {article.type}
                                </span>
                              </div>
                              <h4 className="font-medium text-sm mb-1">{article.title}</h4>
                              <p className="text-xs text-muted-foreground">{article.authors}</p>
                            </div>
                            {article.pdfUrl && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  console.log('Opening PDF:', article.pdfUrl);
                                  window.open(article.pdfUrl, '_blank', 'noopener,noreferrer');
                                }}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                  );
                })}

              </div>
            ))}
          </div>

          {/* Statistics */}
          <Card className="mt-12 bg-gradient-ocean text-primary-foreground">
            <CardContent className="p-8 text-center">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                <div>
                  <div className="text-3xl font-bold mb-1">{statistics.totalArticles}</div>
                  <div className="text-sm text-primary-foreground/80">Published Articles</div>
                </div>
                <div>
                  <div className="text-3xl font-bold mb-1">{statistics.uniqueVolumes}</div>
                  <div className="text-sm text-primary-foreground/80">Volumes</div>
                </div>
                <div>
                  <div className="text-3xl font-bold mb-1">{statistics.uniqueIssues}</div>
                  <div className="text-sm text-primary-foreground/80">Issues</div>
                </div>
                <div>
                  <div className="text-3xl font-bold mb-1">2026</div>
                  <div className="text-sm text-primary-foreground/80">Founded</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Open Access Notice */}
          <Card className="mt-8 border-accent">
            <CardContent className="p-6">
              <div className="text-center">
                <h3 className="font-semibold text-lg mb-2">Open Access Policy</h3>
                <p className="text-muted-foreground">
                  All articles published in Marine Notes Journal are freely available under 
                  Creative Commons Attribution 4.0 License. No subscription or payment required.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Archive;
