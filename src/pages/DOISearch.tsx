import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Search } from "lucide-react";
import articlesData from "@/data/articles.json";

const DOISearch = () => {
  const [searchDOI, setSearchDOI] = useState("");
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchDOI.trim()) {
      const cleanDOI = searchDOI.trim().replace(/^https?:\/\/.*\/doi\//, '');
      navigate(`/doi/${cleanDOI}`);
    }
  };

  return (
    <div className="container mx-auto px-4 py-20">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-3xl font-academic">DOI Lookup</CardTitle>
          <CardDescription>
            Search for articles using their Digital Object Identifier (DOI)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="space-y-4">
            <div>
              <Input
                type="text"
                placeholder="Enter DOI (e.g., MNJ-2026-001)"
                value={searchDOI}
                onChange={(e) => setSearchDOI(e.target.value)}
                className="text-lg"
              />
              <p className="text-sm text-muted-foreground mt-2">
                You can enter just the DOI or paste the full resolver URL
              </p>
            </div>
            <Button type="submit" size="lg" className="w-full">
              <Search className="mr-2 h-4 w-4" />
              Search
            </Button>
          </form>

          <div className="mt-8 pt-8 border-t">
            <h3 className="font-semibold mb-4">Example DOIs:</h3>
            <div className="space-y-2">
              {articlesData.articles.slice(0, 3).map((article) => (
                <button
                  key={article.doi}
                  onClick={() => navigate(`/doi/${article.doi}`)}
                  className="block w-full text-left p-3 rounded-lg hover:bg-muted transition-colors"
                >
                  <code className="text-primary font-mono">{article.doi}</code>
                  <p className="text-sm text-muted-foreground mt-1">{article.title}</p>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DOISearch;
