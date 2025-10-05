import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, MapPin, ExternalLink } from "lucide-react";

const EditorialBoard = () => {
  const editorInChief = {
    name: "AI Editor",
    title: "Editor-in-Chief",
    affiliation: "Marine Notes Journal",
    location: "Global",
    expertise: ["AI-Powered Editorial Management", "Peer Review Coordination", "Scientific Quality Assurance"],
    email: "editor@marinenotesjournal.com",
    bio: "Our AI Editor-in-Chief leverages advanced artificial intelligence to ensure efficient manuscript processing, coordinated peer review, and consistent editorial standards. Working alongside our human editorial team, the AI Editor manages workflow optimization while maintaining rigorous scientific integrity across all publications."
  };

  const editors = [
    {
      name: "Christos Taklis",
      affiliation: "Merman Conservation Expeditions Ltd",
      location: "Edinburgh, UK",
      expertise: ["Marine Ecology", "Conservation Biology", "Shark Conservation"],
      email: "info@mermanconservation.co.uk"
    }
  ];

   const editors = [
    {
      name: "Charlotte Hayes",
      affiliation: "None",
      location: "Bath, UK",
      expertise: ["Marine Ecology"],
      email: "-"
    }
  ];

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="font-academic text-4xl lg:text-5xl font-semibold mb-4">
              Editorial Board
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Our distinguished editorial team comprises leading experts in marine science 
              from around the world, ensuring rigorous peer review and scientific excellence.
            </p>
          </div>

          {/* Editor-in-Chief */}
          <div className="mb-12">
            <h2 className="font-academic text-2xl font-semibold mb-6 text-center">Editor-in-Chief</h2>
            <Card className="max-w-4xl mx-auto shadow-ocean">
              <CardContent className="p-8">
                <div className="grid gap-6 lg:grid-cols-3">
                  <div className="lg:col-span-2">
                    <div className="mb-4">
                      <h3 className="text-2xl font-semibold text-foreground">{editorInChief.name}</h3>
                      <p className="text-lg text-primary font-medium">{editorInChief.title}</p>
                      <p className="text-muted-foreground">{editorInChief.affiliation}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                        <MapPin className="h-4 w-4" />
                        {editorInChief.location}
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <h4 className="font-medium mb-2">Research Expertise</h4>
                      <div className="flex flex-wrap gap-2">
                        {editorInChief.expertise.map((area, index) => (
                          <Badge key={index} variant="secondary">{area}</Badge>
                        ))}
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground">{editorInChief.bio}</p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-primary" />
                      <a href={`mailto:${editorInChief.email}`} className="text-primary hover:underline">
                        {editorInChief.email}
                      </a>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Editors */}
          <div className="mb-12">
            <h2 className="font-academic text-2xl font-semibold mb-6 text-center">Editors</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {editors.map((editor, index) => (
                <Card key={index} className="hover:shadow-soft transition-shadow">
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      <div>
                        <h3 className="font-semibold text-foreground text-lg mb-1">{editor.name}</h3>
                        <p className="text-sm font-medium text-muted-foreground">{editor.affiliation}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                          <MapPin className="h-4 w-4" />
                          {editor.location}
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium mb-2">Expertise</h4>
                        <div className="flex flex-wrap gap-2">
                          {editor.expertise.map((area, areaIndex) => (
                            <Badge key={areaIndex} variant="outline" className="text-xs">
                              {area}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-sm pt-2 border-t">
                        <Mail className="h-4 w-4 text-primary" />
                        <a href={`mailto:${editor.email}`} className="text-primary hover:underline text-xs">
                          Contact
                        </a>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Call to Action */}
          <div className="mt-16 text-center">
            <Card className="bg-gradient-ocean text-primary-foreground max-w-2xl mx-auto">
              <CardContent className="p-8">
                <h3 className="font-academic text-2xl font-semibold mb-4">
                  Interested in Joining Our Editorial Board?
                </h3>
                <p className="mb-6 text-primary-foreground/90">
                  We welcome applications from distinguished researchers in marine sciences 
                  who are committed to advancing scientific publishing excellence.
                </p>
                <div className="flex items-center justify-center gap-2 text-sm">
                  <Mail className="h-4 w-4" />
                  <span>Contact us at: editor@marinenotesjournal.com</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditorialBoard;
