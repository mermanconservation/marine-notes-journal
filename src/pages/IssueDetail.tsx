import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { formatDateLong } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import { AuthorWithOrcid } from "@/components/AuthorWithOrcid";
import { useArticles } from "@/hooks/useArticles";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import volumeCover from "@/assets/volume-1-issue-1-cover.png";

const IssueDetail = () => {
  const { volume, issue } = useParams<{ volume: string; issue: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { articles: allArticles } = useArticles();
  const [showCover, setShowCover] = useState(false);
  const [issueRow, setIssueRow] = useState<any | null>(null);
  const [loadingIssue, setLoadingIssue] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoadingIssue(true);
      const { data } = await supabase
        .from("journal_issues")
        .select("*")
        .eq("volume", String(volume))
        .eq("issue", String(issue))
        .maybeSingle();
      if (active) {
        setIssueRow(data || null);
        setLoadingIssue(false);
      }
    })();
    return () => { active = false; };
  }, [volume, issue]);

  const articles = allArticles.filter(
    (a) => a.volume.toString() === volume && a.issue.toString() === issue
  );

  const coverSrc =
    issueRow?.cover_url || (volume === "1" && issue === "1" ? volumeCover : null);

  const handleDownloadIssue = async () => {
    setDownloading(true);
    try {
      const { data, error } = await supabase.functions.invoke("public-issue-pdf", {
        body: { volume, issue },
      });
      if (error || !data?.url) throw new Error("Full issue PDF is not available yet.");
      window.open(data.url, "_blank");
    } catch (err: any) {
      toast({ title: "Download unavailable", description: err.message, variant: "destructive" });
    }
    setDownloading(false);
  };

  if (loadingIssue) {
    return (
      <div className="container mx-auto px-4 py-20 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (articles.length === 0 && !issueRow) {
    return (
      <div className="container mx-auto px-4 py-20">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl text-destructive">Issue Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-6">
              Volume {volume}, Issue {issue} was not found in our archive.
            </p>
            <Button onClick={() => navigate("/archive")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Archive
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <Button
        variant="ghost"
        onClick={() => navigate("/archive")}
        className="mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Archive
      </Button>

      <div className="max-w-6xl mx-auto mb-8">
        <div className="text-center mb-8">
          <h1 className="font-academic text-4xl font-semibold mb-2">
            Volume {volume}, Issue {issue}
          </h1>
          <p className="text-lg text-muted-foreground">
            {articles.length} {articles.length === 1 ? "article" : "articles"} published
            {issueRow ? ` · ${issueRow.status === "open" ? "Open issue" : "Closed issue"} · ${issueRow.year}` : ""}
          </p>
          {issueRow?.status === "closed" && issueRow?.issue_pdf_url && (
            <Button className="mt-4" onClick={handleDownloadIssue} disabled={downloading}>
              {downloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Download full issue PDF
            </Button>
          )}
        </div>

        {/* Layout: articles left, cover right */}
        <div className={`flex flex-col ${coverSrc ? "lg:flex-row" : ""} gap-8`}>
          {/* Articles list */}
          <div className="flex-1 space-y-6">
            {articles.length === 0 ? (
              <Card className="shadow-soft">
                <CardContent className="p-8 text-center text-muted-foreground">
                  This issue is currently open and has no published articles yet. Accepted
                  manuscripts will appear here as they are published.
                </CardContent>
              </Card>
            ) : articles.map((article) => (
              <Card key={article.doi} className="shadow-soft cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/doi/${article.doi}`)}
              >
                <CardContent className="p-5">
                  <h3 className="font-semibold text-lg mb-1 text-foreground hover:text-primary transition-colors">
                    {article.title}
                  </h3>
                  <AuthorWithOrcid authors={article.authors} orcidIds={article.orcidIds} />
                  <div className="flex flex-wrap gap-3 mt-2 text-sm">
                    <span className="text-muted-foreground">
                      {formatDateLong(article.publicationDate)}
                    </span>
                    <span className="bg-accent text-accent-foreground px-2 py-0.5 rounded text-xs">
                      {article.type}
                    </span>
                    {article.pages && (
                      <span className="text-muted-foreground">pp. {article.pages}</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{article.abstract}</p>
                  <p className="text-xs font-mono text-primary mt-2">Article ID: {article.doi}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Cover image on the right */}
          {coverSrc && (
            <div className="lg:w-64 shrink-0">
              <div className="lg:sticky lg:top-24">
                <button onClick={() => setShowCover(true)} className="block w-full">
                  <Card className="overflow-hidden hover:shadow-md transition-shadow">
                    <CardContent className="p-0">
                      <img
                        src={coverSrc}
                        alt={`Marine Notes Journal Volume ${volume} Issue ${issue} cover`}
                        loading="lazy"
                        className="w-full h-auto"
                      />
                    </CardContent>
                  </Card>
                </button>
                <p className="text-xs text-muted-foreground text-center mt-2">Click to view full cover</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Full cover dialog */}
      <Dialog open={showCover} onOpenChange={setShowCover}>
        <DialogContent className="max-w-3xl p-2">
          {coverSrc && (
            <img
              src={coverSrc}
              alt={`Marine Notes Journal Volume ${volume} Issue ${issue} cover`}
              className="w-full h-auto rounded"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default IssueDetail;
