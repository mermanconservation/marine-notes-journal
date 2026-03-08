import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { formatDateLong } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ArrowLeft, Download, FileText, Quote } from "lucide-react";
import type { Article } from "@/types/article";
import { PromotionAssistant } from "@/components/PromotionAssistant";
import { AuthorWithOrcid } from "@/components/AuthorWithOrcid";
import { useArticles } from "@/hooks/useArticles";
import volumeCover from "@/assets/volume-1-issue-1-cover.png";

const IssueDetail = () => {
  const { volume, issue } = useParams<{ volume: string; issue: string }>();
  const navigate = useNavigate();
  const { articles: allArticles } = useArticles();
  const [showCover, setShowCover] = useState(false);

  const articles = allArticles.filter(
    (a) => a.volume.toString() === volume && a.issue.toString() === issue
  );

  const hasCover = volume === "1" && issue === "1";

  if (articles.length === 0) {
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
            {articles.length} {articles.length === 1 ? 'article' : 'articles'} published
          </p>
        </div>

        {/* Layout: articles left, cover right */}
        <div className={`flex flex-col ${hasCover ? 'lg:flex-row' : ''} gap-8`}>
          {/* Articles list */}
          <div className="flex-1 space-y-6">
            {articles.map((article) => (
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
                  </div>
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{article.abstract}</p>
                  <p className="text-xs font-mono text-primary mt-2">Article ID: {article.doi}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Cover image on the right */}
          {hasCover && (
            <div className="lg:w-64 shrink-0">
              <div className="lg:sticky lg:top-24">
                <button onClick={() => setShowCover(true)} className="block w-full">
                  <Card className="overflow-hidden hover:shadow-md transition-shadow">
                    <CardContent className="p-0">
                      <img 
                        src={volumeCover} 
                        alt="Marine Notes Journal Volume 1 Issue 1 Cover"
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
          <img 
            src={volumeCover} 
            alt="Marine Notes Journal Volume 1 Issue 1 Cover"
            className="w-full h-auto rounded"
          />
        </DialogContent>
      </Dialog>
        {articles.map((article) => (
          <Card key={article.doi} className="shadow-soft">
            <CardHeader className="border-b">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-3xl font-academic mb-4">
                    {article.title}
                  </CardTitle>
                  <AuthorWithOrcid authors={article.authors} orcidIds={article.orcidIds} />
                  <div className="flex flex-wrap gap-4 text-sm">
                    <span className="text-muted-foreground">
                      Published: {formatDateLong(article.publicationDate)}
                    </span>
                    <span className="bg-accent text-accent-foreground px-2 py-1 rounded">
                      {article.type}
                    </span>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-6">
              <div className="mb-6 p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <span className="font-semibold">Article ID:</span>
                </div>
                <code className="text-lg font-mono text-primary">{article.doi}</code>
                {article.externalDoi && (
                  <div className="mt-2">
                    <span className="font-semibold text-sm">DOI: </span>
                    <a href={`https://doi.org/${article.externalDoi}`} target="_blank" rel="noopener noreferrer" className="text-primary underline font-mono text-sm">
                      {article.externalDoi}
                    </a>
                  </div>
                )}
                <p className="text-sm text-muted-foreground mt-2">
                  Permanent link: {article.resolverUrl}
                </p>
              </div>

              <div className="mb-6">
                <h3 className="text-xl font-semibold mb-3">Abstract</h3>
                <p className="text-foreground leading-relaxed">{article.abstract}</p>
              </div>

              <div className="mb-6 p-4 border rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 mb-3">
                  <Quote className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">How to Cite (APA Format)</h3>
                </div>
                <p className="font-mono text-sm leading-relaxed">
                  {article.authors} ({new Date(article.publicationDate).getFullYear()}). {article.title}. <em>Marine Notes Journal</em>, <em>{article.volume}</em>({article.issue}). {article.externalDoi ? `https://doi.org/${article.externalDoi}` : article.doi}
                </p>
              </div>

              <div className="mb-6">
                <PromotionAssistant article={article as Article} />
              </div>

              <div className="flex gap-4">
                {article.pdfUrl ? (
                  <>
                    <Button 
                      size="lg"
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = article.pdfUrl;
                        link.download = `${article.doi}.pdf`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download PDF
                    </Button>
                    <Button 
                      size="lg" 
                      variant="outline"
                      onClick={() => {
                        window.open(article.pdfUrl, '_blank', 'noopener,noreferrer');
                      }}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      View PDF
                    </Button>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground italic">PDF not yet available for this article.</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default IssueDetail;
