
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Link } from "react-router-dom";
import { FileText, ArrowRight, CheckCircle, PoundSterling } from "lucide-react";

const AuthorGuidelines = () => {
  const guidelinesSections = [
    {
      title: "Manuscript Types",
      items: [
        "Research Articles: Original research (max 8,000 words)",
        "Review Articles: Comprehensive reviews (max 10,000 words)",
        "Short Communications: Brief reports (max 3,000 words)",
        "Technical Reports / Risk Assessments: Comprehensive assessments of environmental risks and technical analyses of marine infrastructure projects and conservation challenges (max 5,000 words)",
        "Conservation News: Updates, reports, and announcements on current conservation issues from the last 6 months (max 2,000 words)",
        "Field Notes: Brief descriptions of marine observations, species sightings, behavioral observations, or environmental conditions from field work (max 1,500 words)",
        "Observational Reports: Detailed accounts of specific marine phenomena, unusual events, or field observations requiring documentation (max 3,000 words)",
        "Case Studies: Specific case analyses (max 5,000 words)",
        "Methodology Papers: New methods or techniques (max 6,000 words)"
      ]
    },
    {
      title: "Field Notes & Observational Reports",
      items: [
        "Field Notes: Document brief observations including date, location (GPS coordinates), environmental conditions, species identification, and behavior",
        "Observational Reports: Include detailed methodology, observation period, geographic context, environmental parameters, and comparative analysis with existing literature",
        "Required elements: Date and location (GPS coordinates), environmental conditions, species identification (scientific names), and description of observation",
        "Optional but encouraged: Observer qualifications, observation duration, equipment used, witness accounts, and corroborating evidence",
        "Visual documentation strongly encouraged: High-quality photographs, video footage, or field sketches with scale references",
        "Geographic data: Provide coordinates and habitat description; depth and regional context optional but valuable",
        "Species identification: Use scientific nomenclature and include identifying features; reference to field guides or taxonomic keys helpful but optional"
      ]
    },
    {
      title: "Manuscript Structure",
      items: [
        "Title page with author information and affiliations",
        "Abstract (250 words) with keywords (5 terms)",
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
                    Marine Notes Journal welcomes original research articles, reviews, conservation news, and communications 
                    in all areas of marine science, with particular emphasis on conservation biology, 
                    ecology, oceanography, and sustainable resource management.
                  </p>
                  <div className="bg-muted/30 p-4 rounded-lg space-y-3">
                    <div>
                      <h4 className="font-semibold mb-2">Peer Review Process</h4>
                      <p className="text-sm text-muted-foreground">
                        All submissions undergo rigorous double-blind peer review by international 
                        experts in relevant fields. The editorial decision timeline is typically 
                        4-12 weeks from submission.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">AI Tools in Research</h4>
                      <p className="text-sm text-muted-foreground">
                        Authors may use AI tools (e.g., ChatGPT, Grammarly, language editing software) 
                        to improve readability and language quality. However, AI-generated content must 
                        be thoroughly reviewed and verified by authors. All AI tool usage must be disclosed 
                        in the manuscript's acknowledgments section. Authors remain fully responsible for 
                        the accuracy, originality, and integrity of their work.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Publication Fee */}
              <Card className="border-accent/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PoundSterling className="h-5 w-5 text-accent" />
                    Publication Fee
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-accent/10 p-4 rounded-lg">
                    <p className="text-lg font-semibold mb-2">£20 GBP Publication Fee</p>
                    <p className="text-sm text-muted-foreground mb-3">
                      A publication fee of £20 (Twenty British Pounds) is required upon acceptance 
                      of your manuscript for publication.
                    </p>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Fee covers editorial processing and open-access publication</li>
                      <li>• Payment details will be provided after manuscript acceptance</li>
                      <li>• Fee waivers may be available for authors from developing countries</li>
                    </ul>
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
              <Card className="bg-accent/10 border-accent">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Manuscript Template
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Download our pre-formatted manuscript template with all formatting requirements already applied.
                  </p>
                  <Button asChild variant="outline" className="w-full mb-3">
                    <a href="/manuscript-template.html" download="Marine_Notes_Journal_Template.html">
                      <FileText className="mr-2 h-4 w-4" />
                      Download Template (HTML)
                    </a>
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Open in Microsoft Word and save as .docx. All formatting (12pt Times New Roman, double-spacing, 1-inch margins) is pre-applied.
                  </p>
                </CardContent>
              </Card>

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
                  <CardTitle>Contact Editorial Office</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Questions about submission guidelines?
                  </p>
                  <div className="space-y-2 text-sm">
                    <p><strong>Email:</strong> editor@marinenotesjournal.com</p>
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
