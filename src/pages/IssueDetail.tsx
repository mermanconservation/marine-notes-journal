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
    </div>
  );
};

export default IssueDetail;
