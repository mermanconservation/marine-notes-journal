import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { FileText, Users, Globe, BookOpen, ArrowRight } from "lucide-react";
import heroImage from "@/assets/hero-ocean.jpg";

const Homepage = () => {
  const features = [
    {
      icon: <Globe className="h-6 w-6" />,
      title: "Open Access",
      description: "All articles are freely available to the global research community"
    },
    {
      icon: <Users className="h-6 w-6" />,
      title: "Peer Review",
      description: "Rigorous peer review process by leading marine scientists"
    },
    {
      icon: <BookOpen className="h-6 w-6" />,
      title: "Interdisciplinary",
      description: "Covers all aspects of marine biology, ecology, and conservation"
    },
    {
      icon: <FileText className="h-6 w-6" />,
      title: "Fast Publication",
      description: "Efficient editorial process with rapid online publication"
    }
  ];

  const recentHighlights = [
    {
      title: "Coral Reef Restoration in the Caribbean: A Decade of Progress",
      authors: "Smith, J.M., Rodriguez, A.C., Thompson, K.L.",
      issue: "Volume 1, Issue 1 (2026)"
    }
  ];

  return (
    <div>
      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 bg-gradient-waves overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src={heroImage} 
            alt="Ocean research and marine life" 
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-ocean/80"></div>
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="font-academic text-4xl lg:text-6xl font-semibold mb-6 text-[#0B3D5D]">
              Marine Notes Journal
            </h1>
            <p className="text-xl lg:text-2xl mb-4 text-[#0B3D5D]/90">
              Advancing Ocean Science Through Open Access Research
            </p>
            <p className="text-lg font-semibold mb-8 text-[#0B3D5D] bg-white/80 inline-block px-6 py-2 rounded-full">
              The First AI-Edited and Peer-Reviewed Marine Science Journal
            </p>
            <p className="text-lg mb-12 max-w-2xl mx-auto text-[#0B3D5D]/80">
              An international peer-reviewed journal dedicated to marine conservation, 
              ocean sciences, and sustainable marine resource management.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" variant="hero-primary">
                <Link to="/submit">
                  Submit Manuscript
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="hero-outline">
                <Link to="/archive">Browse Articles</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="font-academic text-3xl lg:text-4xl font-semibold mb-4">
              Why Publish With Us
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Join the leading platform for marine science research and conservation studies
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="text-center border-border hover:shadow-soft transition-shadow">
                <CardHeader>
                  <div className="mx-auto w-12 h-12 bg-gradient-ocean rounded-full flex items-center justify-center text-primary-foreground mb-4">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Recent Articles */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="font-academic text-3xl lg:text-4xl font-semibold mb-4">
                Recent Highlights
              </h2>
              <p className="text-lg text-muted-foreground">
                Latest research from our published articles
              </p>
            </div>
            <Button asChild variant="outline">
              <Link to="/archive">
                View All Articles
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
          
          <div className="grid gap-6">
            {recentHighlights.map((article, index) => (
              <Card key={index} className="hover:shadow-soft transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-2 text-foreground hover:text-primary transition-colors">
                        {article.title}
                      </h3>
                      <p className="text-muted-foreground mb-2">{article.authors}</p>
                      <p className="text-sm text-accent font-medium">{article.issue}</p>
                    </div>
                    <Button variant="ghost" size="sm">
                      Read More
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 bg-gradient-ocean">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-academic text-3xl lg:text-4xl font-semibold mb-6 text-primary-foreground">
              Ready to Share Your Research?
            </h2>
            <p className="text-lg mb-8 text-primary-foreground/90">
              Submit your marine science research to reach a global audience of researchers, 
              conservationists, and policy makers.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" variant="hero-primary">
                <Link to="/submit">Submit Your Manuscript</Link>
              </Button>
              <Button asChild size="lg" variant="hero-outline">
                <Link to="/guidelines">View Guidelines</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Homepage;
