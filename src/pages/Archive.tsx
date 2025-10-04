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

  const volumes = [
    {
      year: 2026,
      volume: 1,
      issues: [
        {
          issue: 1,
          title: "TEST ",
          date: "June 2026",
          articles: [
            {
              title: "Coral Reef Restoration in the Caribbean: A Decade of Progress and Future Directions",
              authors: "Smith, J.M., Rodriguez, A.C., Thompson, K.L.",
              type: "Research Article",
              pages: "245-267",
              doi: "10.1234/mnj.2024.15.3.001",
              abstract: "This comprehensive study analyzes ten years of coral restoration efforts across Caribbean marine protected areas, revealing significant recovery patterns and identifying key factors for successful restoration programs."
            }
          ]
        }
      ]
    }
  ];

  const years = ["2026"];
  const articleTypes = ["All Types", "Research Article", "Review Article", "Short Communication", "Case Study"];

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
                      <p className="text-muted-foreground text-center">
                        Click to view all articles in this issue
                      </p>
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
