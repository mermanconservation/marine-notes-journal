import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Award, Globe, Users, BookOpen, Target, ArrowRight } from "lucide-react";
import articlesData from "@/data/articles.json";

const About = () => {
  // Calculate dynamic stats from articles data
  const publishedArticles = articlesData.articles.length;
  
  // Get unique authors
  const uniqueAuthors = new Set<string>();
  articlesData.articles.forEach(article => {
    const authors = article.authors.split(',').map(a => a.trim());
    authors.forEach(author => uniqueAuthors.add(author));
  });
  const contributingAuthors = uniqueAuthors.size;
  
  // Calculate years of publishing excellence (from earliest publication to now)
  const publicationYears = articlesData.articles.map(article => 
    new Date(article.publicationDate).getFullYear()
  );
  const earliestYear = Math.min(...publicationYears);
  const currentYear = new Date().getFullYear();
  const yearsOfExcellence = currentYear - earliestYear;

  const stats = [
    { number: publishedArticles.toString(), label: "Published Articles", icon: <BookOpen className="h-6 w-6" /> },
    { number: "150+", label: "Countries Represented", icon: <Globe className="h-6 w-6" /> },
    { number: contributingAuthors.toString(), label: "Contributing Authors", icon: <Users className="h-6 w-6" /> },
    { number: `${yearsOfExcellence} ${yearsOfExcellence === 1 ? 'Year' : 'Years'}`, label: "Publishing Excellence", icon: <Award className="h-6 w-6" /> }
  ];

  const focusAreas = [
    "Marine Biodiversity & Ecology",
    "Ocean Conservation Biology", 
    "Climate Change Impacts",
    "Marine Protected Areas",
    "Sustainable Fisheries",
    "Coastal Ecosystem Management",
    "Marine Pollution & Restoration",
    "Deep-Sea Research",
    "Marine Biotechnology",
    "Ocean Policy & Governance"
  ];

  const milestones = [
    {
      year: "2026",
      title: "Journal Founded",
      description: "Marine Notes Journal established to advance open-access marine science publishing."
    },
    {
      year: "-", 
      title: "First Impact Factor",
      description: "Achieved initial impact factor recognition within two years of operation."
    },
    {
      year: "-",
      title: "100th Article Published",
      description: "Reached milestone of 100 published peer-reviewed articles."
    },
    {
      year: "-",
      title: "International Editorial Board",
      description: "Expanded to include editorial board members from six continents."
    },
    {
      year: "2026",
      title: "Digital Transformation",
      description: "Launched enhanced digital platform with improved manuscript submission system."
    },
    {
      year: "-",
      title: "Sustainability Focus",
      description: "Launched special issue series on marine sustainability and climate resilience."
    }
  ];

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <h1 className="font-academic text-4xl lg:text-5xl font-semibold mb-6">
              About Marine Notes Journal
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
Starting in 2026, Marine Notes Journal will be at the forefront of open-access marine science publication, fostering global collaboration in ocean research and conservation.            </p>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {stats.map((stat, index) => (
              <Card key={index} className="text-center hover:shadow-soft transition-shadow">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-gradient-ocean rounded-full flex items-center justify-center text-primary-foreground mx-auto mb-4">
                    {stat.icon}
                  </div>
                  <div className="text-3xl font-bold text-primary mb-2">{stat.number}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-12 lg:grid-cols-2">
            {/* Mission & Vision */}
            <div className="space-y-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Our Mission
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    To advance the understanding of marine ecosystems through the publication 
                    of high-quality, peer-reviewed research that addresses critical challenges 
                    in ocean science and conservation. We are committed to making marine 
                    science accessible globally through our open-access platform.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    Our Vision
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    To be the leading platform for marine science communication, fostering 
                    international collaboration and knowledge sharing that drives evidence-based 
                    conservation and sustainable management of our oceans for future generations.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-ocean text-primary-foreground">
                <CardHeader>
                  <CardTitle className="text-primary-foreground">Open Access Commitment</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-primary-foreground/90 leading-relaxed">
                    All articles are published under Creative Commons licensing, ensuring 
                    free access to research findings worldwide. We believe that scientific 
                    knowledge should be available to all researchers, educators, and 
                    conservationists, regardless of institutional funding or geographic location.
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Focus Areas & Values */}
            <div className="space-y-8">
              <Card>
                <CardHeader>
                  <CardTitle>Research Focus Areas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-2">
                    {focusAreas.map((area, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                        <span className="text-sm">{area}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Core Values</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium text-primary mb-1">Scientific Excellence</h4>
                    <p className="text-sm text-muted-foreground">
                      Rigorous peer review and high publication standards
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-primary mb-1">Global Accessibility</h4>
                    <p className="text-sm text-muted-foreground">
                      Open access to research for worldwide scientific community
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-primary mb-1">Interdisciplinary Approach</h4>
                    <p className="text-sm text-muted-foreground">
                      Bridging marine science, conservation, and policy
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-primary mb-1">Ethical Publishing</h4>
                    <p className="text-sm text-muted-foreground">
                      Transparent and responsible research dissemination
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Timeline */}
          <div className="mt-16">
            <h2 className="font-academic text-3xl font-semibold text-center mb-12">
              Our Journey
            </h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {milestones.map((milestone, index) => (
                <Card key={index} className="hover:shadow-soft transition-shadow">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="font-bold">
                        {milestone.year}
                      </Badge>
                      <CardTitle className="text-lg">{milestone.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {milestone.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Editorial Standards */}
          <Card className="mt-16">
            <CardHeader>
              <CardTitle className="text-center text-2xl">Editorial Standards & Process</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-8 md:grid-cols-3">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-ocean rounded-full flex items-center justify-center text-primary-foreground mx-auto mb-4">
                  <Users className="h-8 w-8" />
                </div>
                <h3 className="font-semibold mb-2">Expert Review</h3>
                <p className="text-sm text-muted-foreground">
                  Double-blind peer review by leading international marine scientists
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-ocean rounded-full flex items-center justify-center text-primary-foreground mx-auto mb-4">
                  <Award className="h-8 w-8" />
                </div>
                <h3 className="font-semibold mb-2">Quality Assurance</h3>
                <p className="text-sm text-muted-foreground">
                  Rigorous editorial oversight ensuring scientific accuracy and clarity
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-ocean rounded-full flex items-center justify-center text-primary-foreground mx-auto mb-4">
                  <Globe className="h-8 w-8" />
                </div>
                <h3 className="font-semibold mb-2">Global Impact</h3>
                <p className="text-sm text-muted-foreground">
                  Immediate worldwide accessibility upon publication
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Call to Action */}
          <div className="mt-16 text-center">
            <Card className="bg-muted/30 max-w-2xl mx-auto">
              <CardContent className="p-8">
                <h3 className="font-academic text-2xl font-semibold mb-4">
                  Join Our Community
                </h3>
                <p className="text-muted-foreground mb-6">
                  Be part of the global marine science community working to understand 
                  and protect our oceans.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button asChild size="lg">
                    <Link to="/submit">
                      Submit Research
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <Link to="/editorial-board">View Editorial Board</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
