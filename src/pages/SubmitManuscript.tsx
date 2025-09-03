import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const SubmitManuscript = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    title: "",
    correspondingAuthor: "",
    email: "",
    institution: "",
    authors: "",
    abstract: "",
    keywords: "",
    manuscriptType: "",
    coverLetter: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Construct mailto link with all form data
    const subject = encodeURIComponent(`Manuscript Submission: ${formData.title}`);
    const body = encodeURIComponent(`
Manuscript Submission Details:

Title: ${formData.title}
Type: ${formData.manuscriptType}
Corresponding Author: ${formData.correspondingAuthor}
Email: ${formData.email}
Institution: ${formData.institution}

All Authors:
${formData.authors}

Abstract:
${formData.abstract}

Keywords: ${formData.keywords}

Cover Letter:
${formData.coverLetter}

---
Please find attached manuscript files as mentioned in the submission guidelines.
    `);
    
    const mailtoLink = `mailto:editor@marinenotesjournal.com?subject=${subject}&body=${body}`;
    window.open(mailtoLink, '_blank');
    
    toast({
      title: "Submission Prepared",
      description: "Your email client will open with the submission details. Please attach your manuscript files before sending.",
    });
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="font-academic text-4xl lg:text-5xl font-semibold mb-4">
              Submit Your Manuscript
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Share your marine science research with the global community. 
              Please complete all required fields and upload your manuscript files.
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Manuscript Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Manuscript Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <Label htmlFor="title">Manuscript Title *</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => handleInputChange("title", e.target.value)}
                        placeholder="Enter the full title of your manuscript"
                        className="mt-2"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="manuscriptType">Manuscript Type *</Label>
                      <Select onValueChange={(value) => handleInputChange("manuscriptType", value)}>
                        <SelectTrigger className="mt-2">
                          <SelectValue placeholder="Select manuscript type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="research-article">Research Article</SelectItem>
                          <SelectItem value="review">Review Article</SelectItem>
                          <SelectItem value="short-communication">Short Communication</SelectItem>
                          <SelectItem value="conservation-news">Conservation News</SelectItem>
                          <SelectItem value="case-study">Case Study</SelectItem>
                          <SelectItem value="methodology">Methodology Paper</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="abstract">Abstract *</Label>
                      <Textarea
                        id="abstract"
                        value={formData.abstract}
                        onChange={(e) => handleInputChange("abstract", e.target.value)}
                        placeholder="Enter your manuscript abstract (up to 250 words)"
                        className="mt-2 min-h-[120px]"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="keywords">Keywords *</Label>
                      <Input
                        id="keywords"
                        value={formData.keywords}
                        onChange={(e) => handleInputChange("keywords", e.target.value)}
                        placeholder="Enter 5 keywords separated by commas"
                        className="mt-2"
                        required
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Author Information */}
                <Card>
                  <CardHeader>
                    <CardTitle>Author Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <Label htmlFor="correspondingAuthor">Corresponding Author *</Label>
                        <Input
                          id="correspondingAuthor"
                          value={formData.correspondingAuthor}
                          onChange={(e) => handleInputChange("correspondingAuthor", e.target.value)}
                          placeholder="Full name"
                          className="mt-2"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email Address *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => handleInputChange("email", e.target.value)}
                          placeholder="email@institution.edu"
                          className="mt-2"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="institution">Institution/Affiliation *</Label>
                      <Input
                        id="institution"
                        value={formData.institution}
                        onChange={(e) => handleInputChange("institution", e.target.value)}
                        placeholder="University/Research Institute"
                        className="mt-2"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="authors">All Authors *</Label>
                      <Textarea
                        id="authors"
                        value={formData.authors}
                        onChange={(e) => handleInputChange("authors", e.target.value)}
                        placeholder="List all authors with their affiliations (one per line)"
                        className="mt-2 min-h-[100px]"
                        required
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* File Upload */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Upload className="h-5 w-5" />
                      File Upload
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                      <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-lg font-medium mb-2">Upload Manuscript Files</p>
                      <p className="text-sm text-muted-foreground mb-4">
                        Drag and drop files here or click to browse
                      </p>
                      <Button type="button" variant="outline">
                        Choose Files
                      </Button>
                      <p className="text-xs text-muted-foreground mt-2">
                        Accepted formats: PDF, DOC, DOCX (Max 10MB per file)
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Cover Letter */}
                <Card>
                  <CardHeader>
                    <CardTitle>Cover Letter</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Label htmlFor="coverLetter">Cover Letter (Optional)</Label>
                    <Textarea
                      id="coverLetter"
                      value={formData.coverLetter}
                      onChange={(e) => handleInputChange("coverLetter", e.target.value)}
                      placeholder="Provide a brief cover letter explaining the significance of your research"
                      className="mt-2 min-h-[120px]"
                    />
                  </CardContent>
                </Card>

                <Button type="submit" size="lg" className="w-full bg-gradient-ocean">
                  Submit Manuscript
                </Button>
              </form>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <Card className="bg-muted/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <AlertCircle className="h-5 w-5" />
                    Submission Guidelines
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Before You Submit</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Review our author guidelines</li>
                      <li>• Ensure proper formatting</li>
                      <li>• Include all required sections</li>
                      <li>• Check references format</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Required Files</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Main manuscript (PDF/DOC)</li>
                      <li>• Figures and tables</li>
                      <li>• Supplementary materials</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Need Help?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Contact our editorial team for assistance with your submission.
                  </p>
                  <Button variant="outline" className="w-full">
                    Contact Editorial Office
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubmitManuscript;
