import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, MapPin, ExternalLink } from "lucide-react";

const EditorialBoard = () => {
  const editorInChief = {
    name: "Dr. Sarah Martinez",
    title: "Editor-in-Chief",
    affiliation: "Marine Research Institute, University of California",
    location: "San Diego, CA, USA",
    expertise: ["Marine Ecology", "Conservation Biology", "Coral Reef Systems"],
    email: "s.martinez@marineresearch.edu",
    bio: "Dr. Martinez has over 20 years of experience in marine ecology research with a focus on coral reef conservation. She has authored over 150 peer-reviewed publications and serves on multiple international conservation panels."
  };

  const associateEditors = [
    {
      name: "Dr. James Thompson",
      title: "Associate Editor",
      affiliation: "Woods Hole Oceanographic Institution",
      location: "Massachusetts, USA",
      expertise: ["Deep-Sea Biology", "Marine Biodiversity", "Oceanography"],
      email: "jthompson@whoi.edu"
    },
    {
      name: "Dr. Elena Rodriguez",
      title: "Associate Editor", 
      affiliation: "Institute of Marine Sciences, Barcelona",
      location: "Barcelona, Spain",
      expertise: ["Marine Pollution", "Toxicology", "Environmental Chemistry"],
      email: "erodriguez@icm.csic.es"
    },
    {
      name: "Dr. Kenji Nakamura",
      title: "Associate Editor",
      affiliation: "Japan Agency for Marine-Earth Science",
      location: "Yokohama, Japan",
      expertise: ["Marine Geology", "Climate Change", "Ocean Acidification"],
      email: "k.nakamura@jamstec.go.jp"
    }
  ];

  const editorialBoard = [
    {
      name: "Dr. Michael Chen",
      affiliation: "National University of Singapore",
      location: "Singapore",
      expertise: ["Marine Biotechnology", "Aquaculture"]
    },
    {
      name: "Dr. Anna Petersen",
      affiliation: "Norwegian Institute for Water Research",
      location: "Oslo, Norway", 
      expertise: ["Arctic Marine Ecology", "Climate Change"]
    },
    {
      name: "Dr. Carlos Mendez",
      affiliation: "Universidad Nacional de Colombia",
      location: "Bogotá, Colombia",
      expertise: ["Tropical Marine Systems", "Fisheries Science"]
    },
    {
      name: "Dr. Rachel Foster",
      affiliation: "University of Cape Town",
      location: "Cape Town, South Africa",
      expertise: ["Marine Microbiology", "Biogeochemistry"]
    },
    {
      name: "Dr. Ahmed Al-Rashid",
      affiliation: "King Abdullah University",
      location: "Thuwal, Saudi Arabia",
      expertise: ["Red Sea Ecology", "Coral Biology"]
    },
    {
      name: "Dr. Sophie Laurent",
      affiliation: "Sorbonne University",
      location: "Paris, France",
      expertise: ["Marine Mammal Biology", "Behavioral Ecology"]
    },
    {
      name: "Dr. David Williams",
      affiliation: "Australian Institute of Marine Science",
      location: "Townsville, Australia",
      expertise: ["Great Barrier Reef", "Marine Protected Areas"]
    },
    {
      name: "Dr. Priya Sharma",
      affiliation: "Indian Institute of Science",
      location: "Bangalore, India",
      expertise: ["Coastal Ecosystems", "Mangrove Ecology"]
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

          {/* Associate Editors */}
          <div className="mb-12">
            <h2 className="font-academic text-2xl font-semibold mb-6 text-center">Associate Editors</h2>
            <div className="grid gap-6 lg:grid-cols-2">
              {associateEditors.map((editor, index) => (
                <Card key={index} className="hover:shadow-soft transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg">{editor.name}</CardTitle>
                    <p className="text-primary font-medium">{editor.title}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">{editor.affiliation}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          {editor.location}
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium mb-2">Research Areas</h4>
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
                        <a href={`mailto:${editor.email}`} className="text-primary hover:underline">
                          Contact
                        </a>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Editorial Board Members */}
          <div>
            <h2 className="font-academic text-2xl font-semibold mb-6 text-center">Editorial Board Members</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {editorialBoard.map((member, index) => (
                <Card key={index} className="hover:shadow-soft transition-shadow">
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-foreground mb-1">{member.name}</h3>
                    <p className="text-sm text-muted-foreground mb-2">{member.affiliation}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                      <MapPin className="h-3 w-3" />
                      {member.location}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {member.expertise.map((area, areaIndex) => (
                        <Badge key={areaIndex} variant="outline" className="text-xs">
                          {area}
                        </Badge>
                      ))}
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
                  <span>Contact us at: editor@marinenotesjournal.org</span>
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