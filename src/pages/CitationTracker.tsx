import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, TrendingUp, Eye, Share2, BookOpen, Search } from "lucide-react";
import articlesData from "@/data/articles.json";
import { Article } from "@/types/article";

const CitationTracker = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<string>("citations");
  const articles = articlesData.articles as Article[];

  // Calculate total metrics
  const totalMetrics = useMemo(() => {
    return articles.reduce(
      (acc, article) => ({
        citations: acc.citations + (article.metrics?.citations || 0),
        downloads: acc.downloads + (article.metrics?.downloads || 0),
        views: acc.views + (article.metrics?.views || 0),
        altmetricScore: acc.altmetricScore + (article.metrics?.altmetricScore || 0),
        socialShares: acc.socialShares + (article.metrics?.socialShares || 0),
      }),
      { citations: 0, downloads: 0, views: 0, altmetricScore: 0, socialShares: 0 }
    );
  }, [articles]);

  // Filter and sort articles
  const filteredArticles = useMemo(() => {
    let filtered = articles.filter(
      (article) =>
        article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        article.authors.toLowerCase().includes(searchTerm.toLowerCase()) ||
        article.doi.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return filtered.sort((a, b) => {
      const aValue = a.metrics?.[sortBy as keyof typeof a.metrics] || 0;
      const bValue = b.metrics?.[sortBy as keyof typeof b.metrics] || 0;
      return bValue - aValue;
    });
  }, [articles, searchTerm, sortBy]);

  const exportReport = () => {
    const csvContent = [
      ["DOI", "Title", "Citations", "Downloads", "Views", "Altmetric Score", "Social Shares"],
      ...filteredArticles.map((article) => [
        article.doi,
        article.title,
        article.metrics?.citations || 0,
        article.metrics?.downloads || 0,
        article.metrics?.views || 0,
        article.metrics?.altmetricScore || 0,
        article.metrics?.socialShares || 0,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `citation-report-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  return (
    <div className="container mx-auto px-4 py-20">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-4xl font-academic mb-2">Citation & Impact Tracker</h1>
          <p className="text-muted-foreground">
            Monitor article performance, citations, and engagement metrics
          </p>
        </header>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                Citations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalMetrics.citations}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Download className="h-4 w-4 text-primary" />
                Downloads
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalMetrics.downloads}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Eye className="h-4 w-4 text-primary" />
                Views
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalMetrics.views}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Altmetric
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalMetrics.altmetricScore}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Share2 className="h-4 w-4 text-primary" />
                Social Shares
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalMetrics.socialShares}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Actions */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Article Metrics</CardTitle>
            <CardDescription>Track individual article performance and impact</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by title, author, or DOI..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Sort by..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="citations">Citations</SelectItem>
                  <SelectItem value="downloads">Downloads</SelectItem>
                  <SelectItem value="views">Views</SelectItem>
                  <SelectItem value="altmetricScore">Altmetric Score</SelectItem>
                  <SelectItem value="socialShares">Social Shares</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={exportReport} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </Button>
            </div>

            {/* Articles Table */}
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>DOI</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead className="text-center">Citations</TableHead>
                    <TableHead className="text-center">Downloads</TableHead>
                    <TableHead className="text-center">Views</TableHead>
                    <TableHead className="text-center">Altmetric</TableHead>
                    <TableHead className="text-center">Social</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredArticles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No articles found matching your search
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredArticles.map((article) => (
                      <TableRow key={article.id}>
                        <TableCell className="font-mono text-sm">
                          <Badge variant="outline">{article.doi}</Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{article.title}</div>
                            <div className="text-sm text-muted-foreground">{article.authors}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-medium">
                          {article.metrics?.citations || 0}
                        </TableCell>
                        <TableCell className="text-center font-medium">
                          {article.metrics?.downloads || 0}
                        </TableCell>
                        <TableCell className="text-center font-medium">
                          {article.metrics?.views || 0}
                        </TableCell>
                        <TableCell className="text-center font-medium">
                          {article.metrics?.altmetricScore || 0}
                        </TableCell>
                        <TableCell className="text-center font-medium">
                          {article.metrics?.socialShares || 0}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CitationTracker;
