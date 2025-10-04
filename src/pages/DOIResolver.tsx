import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Download, ArrowLeft, BookOpen, Eye, Share2, TrendingUp, Quote } from "lucide-react";
import articlesData from "@/data/articles.json";
import type { Article } from "@/types/article";

const DOIResolver = () => {
  const { doi } = useParams<{ doi: string }>();
  const navigate = useNavigate();
  const [article, setArticle] = useState<Article | null>(null);

  useEffect(() => {
    if (doi) {
      const found = articlesData.articles.find(
        (a) => a.doi.toLowerCase() === doi.toLowerCase()
      );
      setArticle((found as Article) || null);
    }
  }, [doi]);

  if (!article) {
    return (
      <div className="container mx-auto px-4 py-20">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl text-destructive">DOI Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-6">
              The DOI <span className="font-mono font-semibold">{doi}</span> was not found in our database.
            </p>
            <Button onClick={() => navigate("/archive")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Browse Archive
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

      <Card className="max-w-4xl mx-auto">
        <CardHeader className="border-b">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-3xl font-academic mb-4">
                {article.title}
              </CardTitle>
              <p className="text-lg text-muted-foreground mb-2">{article.authors}</p>
              <div className="flex flex-wrap gap-4 text-sm">
                <span className="text-muted-foreground">
                  Volume {article.volume}, Issue {article.issue}
                </span>
                <span className="text-muted-foreground">
                  Published: {new Date(article.publicationDate).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
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
              <span className="font-semibold">DOI:</span>
            </div>
            <code className="text-lg font-mono text-primary">{article.doi}</code>
            <p className="text-sm text-muted-foreground mt-2">
              Permanent link: {article.resolverUrl}
            </p>
          </div>

          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-3">Abstract</h3>
            <p className="text-foreground leading-relaxed">{article.abstract}</p>
          </div>

          {article.metrics && (
            <div className="mb-6">
              <h3 className="text-xl font-semibold mb-4">Citation & Impact Metrics</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-muted p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <BookOpen className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Citations</span>
                  </div>
                  <div className="text-2xl font-bold">{article.metrics.citations}</div>
                </div>
                <div className="bg-muted p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Download className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Downloads</span>
                  </div>
                  <div className="text-2xl font-bold">{article.metrics.downloads}</div>
                </div>
                <div className="bg-muted p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Eye className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Views</span>
                  </div>
                  <div className="text-2xl font-bold">{article.metrics.views}</div>
                </div>
                <div className="bg-muted p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Altmetric</span>
                  </div>
                  <div className="text-2xl font-bold">{article.metrics.altmetricScore}</div>
                </div>
                <div className="bg-muted p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Share2 className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Social Shares</span>
                  </div>
                  <div className="text-2xl font-bold">{article.metrics.socialShares}</div>
                </div>
              </div>
            </div>
          )}

          <div className="mb-6 p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 mb-3">
              <Quote className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">How to Cite (APA Format)</h3>
            </div>
            <p className="font-mono text-sm leading-relaxed">
              {article.authors} ({new Date(article.publicationDate).getFullYear()}). {article.title}. <em>Marine Notes Journal</em>, <em>{article.volume}</em>({article.issue}). {article.doi}
            </p>
          </div>

          <div className="flex gap-4">
            <Button asChild size="lg">
              <a href={article.pdfUrl} download>
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </a>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href={article.pdfUrl} target="_blank" rel="noopener noreferrer">
                <FileText className="mr-2 h-4 w-4" />
                View PDF
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DOIResolver;
