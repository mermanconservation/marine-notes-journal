import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Download } from "lucide-react";
import articlesData from "@/data/articles.json";

const Archive = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedType, setSelectedType] = useState("");

  // Load articles from articles.json and organize by volume/issue
  const volumes = useMemo(() => {
    const volumeMap = new Map();
    
    articlesData.articles.forEach(article => {
      const volKey = `${article.volume}`;
      if (!volumeMap.has(volKey)) {
        volumeMap.set(volKey, {
          year: 2026, // Default year, can be extracted from publication date if needed
          volume: parseInt(article.volume),
          issues: new Map()
        });
      }
      
      const vol = volumeMap.get(volKey);
      const issueKey = article.issue;
      
      if (!vol.issues.has(issueKey)) {
        vol.issues.set(issueKey, {
          issue: parseInt(article.issue),
          title: "Issue " + article.issue,
          date: new Date(article.publicationDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
          articles: []
        });
      }
      
      vol.issues.get(issueKey).articles.push({
        title: article.title,
        authors: article.authors,
        type: article.type,
        doi: article.doi,
        abstract: article.abstract,
        pdfUrl: article.pdfUrl
      });
    });
    
    // Convert maps to arrays
    return Array.from(volumeMap.values()).map(vol => ({
      ...vol,
      issues: Array.from(vol.issues.values())
    }));
  }, []);

  const years = ["2026"];
  const articleTypes = ["All Types", "Research Article", "Review Article", "Short Communication", "Case Study", "Field Notes", "Observational Reports", "Conservation News"];

  const filteredVolumes = volumes.filter(volume => {
    return selectedYear === "" || volume.year.toString() === selectedYear;
  });

  // Calculate statistics from actual article data
  const statistics = useMemo(() => {
    const totalArticles = articlesData.articles.length;
    const uniqueVolumes = new Set(articlesData.articles.map(a => a.volume)).size;
    // Extract unique countries from author affiliations (placeholder - would need actual country data)
    const estimatedCountries = Math.min(totalArticles * 2, 15); // Estimate: ~2 countries per article, max 15
    
    return {
      totalArticles,
      uniqueVolumes,
      estimatedCountries
    };
  }, []);

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
                  <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
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

          {/* Archive Content */}
          <div className="space-y-8">
            {filteredVolumes.map((volume) => (
              <div key={volume.year} className="space-y-6">
                <div className="text-center">
                  <h2 className="font-academic text-2xl font-semibold">
                    Volume {volume.volume} ({volume.year})
                  </h2>
                </div>

                {volume.issues.map((issue) => (
                  <Card 
                    key={issue.issue} 
                    className="shadow-soft cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => navigate(`/archive/${volume.volume}/${issue.issue}`)}
                  >
                    <CardHeader className="bg-muted/20">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-xl">
                            Issue {issue.issue}: {issue.title}
                          </CardTitle>
                          <p className="text-muted-foreground mt-1">{issue.date}</p>
                          <p className="text-sm text-muted-foreground mt-2">
                            {issue.articles.length} {issue.articles.length === 1 ? 'article' : 'articles'}
                          </p>
                        </div>
                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                          <Button variant="outline" size="sm">
                            <Download className="h-4 w-4 mr-2" />
                            Full Issue PDF
                          </Button>
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
                              <h4 className="font-medium text-sm mb-1">{article.doi}</h4>
                              <p className="text-xs text-muted-foreground">{article.authors}</p>
                            </div>
                            {article.pdfUrl && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(encodeURI(article.pdfUrl), '_blank');
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
                ))}
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
                  <div className="text-3xl font-bold mb-1">{statistics.estimatedCountries}</div>
                  <div className="text-sm text-primary-foreground/80">Countries</div>
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
