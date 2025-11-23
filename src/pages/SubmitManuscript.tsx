import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Upload, FileText, AlertCircle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const SubmitManuscript = () => {
  const { toast } = useToast();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    correspondingAuthor: "",
    email: "",
    institution: "",
    orcid: "",
    authors: "",
    abstract: "",
    keywords: "",
    manuscriptType: "",
    coverLetter: ""
  });

  const [copyrightData, setCopyrightData] = useState({
    authorSignature: "",
    date: new Date().toISOString().split('T')[0],
    originalWork: false,
    noConflict: false,
    transferRights: false,
    creativeCommons: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate copyright agreement
    const allCopyrightChecked = copyrightData.originalWork && 
                               copyrightData.noConflict && 
                               copyrightData.transferRights && 
                               copyrightData.creativeCommons;
    
    if (!allCopyrightChecked || !copyrightData.authorSignature) {
      toast({
        title: "Copyright Agreement Required",
        description: "Please complete the copyright agreement section below.",
        variant: "destructive",
      });
      return;
    }

    if (selectedFiles.length === 0) {
      toast({
        title: "No Files Selected",
        description: "Please upload at least one manuscript file.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload files to storage
      const filePaths: string[] = [];
      const timestamp = Date.now();

      for (const file of selectedFiles) {
        const filePath = `${timestamp}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('manuscripts')
          .upload(filePath, file);

        if (uploadError) throw uploadError;
        filePaths.push(filePath);
      }

      // Insert submission into database
      const { error: insertError } = await supabase
        .from('manuscript_submissions')
        .insert({
          title: formData.title,
          manuscript_type: formData.manuscriptType,
          abstract: formData.abstract,
          keywords: formData.keywords,
          corresponding_author_name: formData.correspondingAuthor,
          corresponding_author_email: formData.email,
          corresponding_author_affiliation: formData.institution,
          corresponding_author_orcid: formData.orcid || null,
          all_authors: formData.authors,
          cover_letter: formData.coverLetter || null,
          copyright_agreed: true,
          file_paths: filePaths,
        });

      if (insertError) throw insertError;

      toast({
        title: "Submission Successful!",
        description: "Your manuscript has been submitted successfully. Our editorial team will review it shortly.",
      });

      // Reset form
      setFormData({
        title: "",
        correspondingAuthor: "",
        email: "",
        institution: "",
        orcid: "",
        authors: "",
        abstract: "",
        keywords: "",
        manuscriptType: "",
        coverLetter: ""
      });
      setCopyrightData({
        authorSignature: "",
        date: new Date().toISOString().split('T')[0],
        originalWork: false,
        noConflict: false,
        transferRights: false,
        creativeCommons: false
      });
      setSelectedFiles([]);

    } catch (error: any) {
      console.error('Submission error:', error);
      toast({
        title: "Submission Failed",
        description: error.message || "There was an error submitting your manuscript. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...filesArray]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
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
                        name="title"
                        value={formData.title}
                        onChange={(e) => handleInputChange("title", e.target.value)}
                        placeholder="Enter the full title of your manuscript"
                        className="mt-2"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="manuscriptType">Manuscript Type *</Label>
                      <input type="hidden" name="manuscriptType" value={formData.manuscriptType} />
                      <Select onValueChange={(value) => handleInputChange("manuscriptType", value)} required>
                        <SelectTrigger className="mt-2">
                          <SelectValue placeholder="Select manuscript type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="research-article">Research Article</SelectItem>
                          <SelectItem value="review">Review Article</SelectItem>
                          <SelectItem value="short-communication">Short Communication</SelectItem>
                          <SelectItem value="technical-report">Technical Report / Risk Assessment</SelectItem>
                          <SelectItem value="field-notes">Field Notes</SelectItem>
                          <SelectItem value="observational-reports">Observational Reports</SelectItem>
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
                        name="abstract"
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
                        name="keywords"
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
                          name="correspondingAuthor"
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
                          name="email"
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
                        name="institution"
                        value={formData.institution}
                        onChange={(e) => handleInputChange("institution", e.target.value)}
                        placeholder="University/Research Institute"
                        className="mt-2"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="orcid">ORCID iD (Optional)</Label>
                      <Input
                        id="orcid"
                        name="orcid"
                        value={formData.orcid}
                        onChange={(e) => handleInputChange("orcid", e.target.value)}
                        placeholder="0000-0000-0000-0000"
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="authors">All Authors *</Label>
                      <Textarea
                        id="authors"
                        name="authors"
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
                        Click to select your manuscript files
                      </p>
                      <input
                        type="file"
                        id="fileUpload"
                        name="attachment"
                        onChange={handleFileChange}
                        multiple
                        accept=".pdf,.doc,.docx"
                        className="hidden"
                      />
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={() => document.getElementById('fileUpload')?.click()}
                      >
                        Choose Files
                      </Button>
                      <p className="text-xs text-muted-foreground mt-2">
                        Accepted formats: PDF, DOC, DOCX (Max 10MB per file)
                      </p>
                    </div>
                    
                    {selectedFiles.length > 0 && (
                      <div className="space-y-2">
                        <Label>Selected Files:</Label>
                        {selectedFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-md">
                            <span className="text-sm truncate flex-1">{file.name}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFile(index)}
                            >
                              Remove
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
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
                      name="coverLetter"
                      value={formData.coverLetter}
                      onChange={(e) => handleInputChange("coverLetter", e.target.value)}
                      placeholder="Provide a brief cover letter explaining the significance of your research"
                      className="mt-2 min-h-[120px]"
                    />
                  </CardContent>
                </Card>

                {/* Copyright Agreement */}
                <Card className="border-accent/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Copyright Transfer Agreement *
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="bg-muted/30 p-4 rounded-lg space-y-2 text-sm">
                      <p className="font-medium">By submitting this manuscript, I/we confirm:</p>
                    </div>

                    <div className="space-y-4 text-sm">
                      <div className="flex items-start space-x-3 p-3 bg-background rounded border">
                        <Checkbox
                          id="originalWork"
                          checked={copyrightData.originalWork}
                          onCheckedChange={(checked) => 
                            setCopyrightData(prev => ({ ...prev, originalWork: checked as boolean }))
                          }
                        />
                        <Label htmlFor="originalWork" className="cursor-pointer leading-relaxed">
                          This manuscript is original work and has not been published elsewhere, nor is it currently under consideration for publication elsewhere.
                        </Label>
                      </div>

                      <div className="flex items-start space-x-3 p-3 bg-background rounded border">
                        <Checkbox
                          id="noConflict"
                          checked={copyrightData.noConflict}
                          onCheckedChange={(checked) => 
                            setCopyrightData(prev => ({ ...prev, noConflict: checked as boolean }))
                          }
                        />
                        <Label htmlFor="noConflict" className="cursor-pointer leading-relaxed">
                          All authors have reviewed and approved the manuscript and there are no conflicts of interest to declare.
                        </Label>
                      </div>

                      <div className="flex items-start space-x-3 p-3 bg-background rounded border">
                        <Checkbox
                          id="transferRights"
                          checked={copyrightData.transferRights}
                          onCheckedChange={(checked) => 
                            setCopyrightData(prev => ({ ...prev, transferRights: checked as boolean }))
                          }
                        />
                        <Label htmlFor="transferRights" className="cursor-pointer leading-relaxed">
                          I/we transfer copyright of this manuscript to Marine Notes Journal upon acceptance for publication.
                        </Label>
                      </div>

                      <div className="flex items-start space-x-3 p-3 bg-background rounded border">
                        <Checkbox
                          id="creativeCommons"
                          checked={copyrightData.creativeCommons}
                          onCheckedChange={(checked) => 
                            setCopyrightData(prev => ({ ...prev, creativeCommons: checked as boolean }))
                          }
                        />
                        <Label htmlFor="creativeCommons" className="cursor-pointer leading-relaxed">
                          I/we agree to publish this work under a Creative Commons Attribution 4.0 International License (CC BY 4.0).
                        </Label>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="authorSignature">Full Name (Electronic Signature) *</Label>
                        <Input
                          id="authorSignature"
                          value={copyrightData.authorSignature}
                          onChange={(e) => setCopyrightData(prev => ({ ...prev, authorSignature: e.target.value }))}
                          placeholder="Type your full name"
                          className="mt-2"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="date">Date</Label>
                        <Input
                          id="date"
                          type="date"
                          value={copyrightData.date}
                          onChange={(e) => setCopyrightData(prev => ({ ...prev, date: e.target.value }))}
                          className="mt-2"
                          readOnly
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Button type="submit" size="lg" className="w-full bg-gradient-ocean" disabled={isSubmitting}>
                  {isSubmitting ? "Submitting..." : "Submit Manuscript"}
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Submission will open your email client. Please attach your manuscript files and send.
                </p>
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
