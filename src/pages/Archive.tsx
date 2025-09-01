import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Download, ExternalLink, Filter } from "lucide-react";

const Archive = () => {
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
            },
      ]
    }
  ];

  const years = ["2026"];
  const articleTypes = ["All Types", "Research Article", "Review Article", "Short Communication", "Case Study"];

  const filteredVolumes = volumes.filter(volume => {
    return selectedYear === "" || volume.year.toString() === selectedYear;
  });

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
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Years</SelectItem>
                      {years.map(year => (
                        <SelectItem key={year} value={year}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Article Type" />
                    </SelectTrigger>
                    <SelectContent>
                      {articleTypes.map(type => (
                        <SelectItem key={type} value={type === "All Types" ? "" : type}>
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
                  <Card key={issue.issue} className="shadow-soft">
                    <CardHeader className="bg-muted/20">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-xl">
                            Issue {issue.issue}: {issue.title}
                          </CardTitle>
                          <p className="text-muted-foreground mt-1">{issue.date}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <Download className="h-4 w-4 mr-2" />
                            Full Issue PDF
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="divide-y divide-border">
                        {issue.articles.map((article, articleIndex) => (
                          <div key={articleIndex} className="p-6 hover:bg-muted/10 transition-colors">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-start gap-3 mb-3">
                                  <div className="flex-1">
                                    <h3 className="font-semibold text-lg leading-tight mb-2">
                                      {article.title}
                                    </h3>
                                    <p className="text-muted-foreground mb-2">{article.authors}</p>
                                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                      <Badge variant="outline">{article.type}</Badge>
                                      <span>Pages {article.pages}</span>
                                      <span>DOI: {article.doi}</span>
                                    </div>
                                  </div>
                                </div>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                  {article.abstract}
                                </p>
                              </div>
                              <div className="flex flex-col gap-2 ml-4">
                                <Button variant="outline" size="sm">
                                  <Download className="h-4 w-4 mr-2" />
                                  PDF
                                </Button>
                                <Button variant="ghost" size="sm">
                                  <ExternalLink className="h-4 w-4 mr-2" />
                                  Abstract
                                </Button>
                              </div>
                            </div>
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
                  <div className="text-3xl font-bold mb-1">150+</div>
                  <div className="text-sm text-primary-foreground/80">Published Articles</div>
                </div>
                <div>
                  <div className="text-3xl font-bold mb-1">15</div>
                  <div className="text-sm text-primary-foreground/80">Volumes</div>
                </div>
                <div>
                  <div className="text-3xl font-bold mb-1">45</div>
                  <div className="text-sm text-primary-foreground/80">Countries</div>
                </div>
                <div>
                  <div className="text-3xl font-bold mb-1">2010</div>
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
