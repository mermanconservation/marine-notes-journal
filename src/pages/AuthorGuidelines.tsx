import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Link } from "react-router-dom";
import { FileText, Download, ArrowRight, CheckCircle } from "lucide-react";

const AuthorGuidelines = () => {
  const guidelinesSections = [
    {
      title: "Manuscript Types",
      items: [
        "Research Articles: Original research (max 8,000 words)",
        "Review Articles: Comprehensive reviews (max 10,000 words)",
        "Short Communications: Brief reports (max 3,000 words)",
        "Case Studies: Specific case analyses (max 5,000 words)",
        "Methodology Papers: New methods or techniques (max 6,000 words)"
      ]
    },
    {
      title: "Manuscript Structure",
      items: [
        "Title page with author information and affiliations",
        "Abstract (250-300 words) with keywords (4-6 terms)",
        "Introduction with clear research objectives",
        "Materials and Methods with sufficient detail for replication",
        "Results presented clearly with appropriate figures/tables",
        "Discussion interpreting findings and implications",
        "Conclusions summarizing key findings",
        "References in journal format",
        "Supplementary materials (if applicable)"
      ]
    },
    {
      title: "Formatting Requirements",
      items: [
        "Double-spaced text throughout manuscript",
        "12-point Times New Roman or similar serif font",
        "1-inch margins on all sides",
        "Line numbers for review process",
        "Figures and tables embedded or submitted separately",
        "High-resolution images (minimum 300 DPI)",
        "SI units used throughout",
        "Species names in italics at first mention"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="font-academic text-4xl lg:text-5xl font-semibold mb-4">
              Author Guidelines
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Comprehensive guidelines for manuscript preparation and submission 
              to Marine Notes Journal
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-8">
              {/* Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Submission Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-4">
                    Marine Notes Journal welcomes original research articles, reviews, and communications 
                    in all areas of marine science, with particular emphasis on conservation biology, 
                    ecology, oceanography, and sustainable resource management.
                  </p>
                  <div className="bg-muted/30 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">Peer Review Process</h4>
                    <p className="text-sm text-muted-foreground">
                      All submissions undergo rigorous double-blind peer review by international 
                      experts in relevant fields. The editorial decision timeline is typically 
                      8-12 weeks from submission.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Guidelines Sections */}
              {guidelinesSections.map((section, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle>{section.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {section.items.map((item, itemIndex) => (
                        <li key={itemIndex} className="flex items-start gap-3">
                          <CheckCircle className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}

              {/* Reference Format */}
              <Card>
                <CardHeader>
                  <CardTitle>Reference Format</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Journal Articles</h4>
                    <div className="bg-muted/30 p-3 rounded text-sm font-mono">
                      Smith, J.M., Anderson, K.L. (2024). Coral bleaching responses to temperature 
                      stress in the Caribbean. Marine Notes Journal, 15(2), 45-62.
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Books</h4>
                    <div className="bg-muted/30 p-3 rounded text-sm font-mono">
                      Thompson, R.C. (2023). Marine Conservation Biology: Principles and Practice. 
                      Academic Press, London, 345 pp.
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Book Chapters</h4>
                    <div className="bg-muted/30 p-3 rounded text-sm font-mono">
                      Martinez, P.L., Chen, W. (2024). Deep-sea mining impacts. In: Ocean Resources 
                      and Sustainability (Ed. K. Johnson). Springer, pp. 123-145.
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Ethical Guidelines */}
              <Card>
                <CardHeader>
                  <CardTitle>Ethical Guidelines</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Research Ethics</h4>
                    <ul className="text-sm space-y-2 text-muted-foreground">
                      <li>• All animal research must comply with institutional and international guidelines</li>
                      <li>• Field research permits and ethical approvals must be obtained</li>
                      <li>• Conflicts of interest must be declared</li>
                      <li>• Data sharing and availability statements required</li>
                    </ul>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="font-semibold mb-2">Publication Ethics</h4>
                    <ul className="text-sm space-y-2 text-muted-foreground">
                      <li>• Manuscripts must be original and not under consideration elsewhere</li>
                      <li>• Proper attribution of all sources and collaborators</li>
                      <li>• No plagiarism, data fabrication, or duplicate publication</li>
                      <li>• Author contributions must be clearly stated</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <Card className="bg-gradient-ocean text-primary-foreground">
                <CardHeader>
                  <CardTitle className="text-primary-foreground">Ready to Submit?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm mb-4 text-primary-foreground/90">
                    Start your manuscript submission process now
                  </p>
                  <Button asChild variant="secondary" className="w-full bg-primary-foreground text-primary hover:bg-primary-foreground/90">
                    <Link to="/submit">
                      Submit Manuscript
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Download Templates</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="outline" className="w-full justify-start">
                    <Download className="mr-2 h-4 w-4" />
                    Manuscript Template
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Download className="mr-2 h-4 w-4" />
                    Cover Letter Template
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Download className="mr-2 h-4 w-4" />
                    Copyright Form
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Contact Editorial Office</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Questions about submission guidelines?
                  </p>
                  <div className="space-y-2 text-sm">
                    <p><strong>Email:</strong> editor@marinenotesjournal.org</p>
                    <p><strong>Response Time:</strong> 2-3 business days</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthorGuidelines;