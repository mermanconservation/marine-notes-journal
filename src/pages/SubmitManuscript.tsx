import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Upload, FileText, AlertCircle, CheckCircle, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const SubmitManuscript = () => {
  const { toast } = useToast();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailData, setEmailData] = useState({ subject: "", body: "" });
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
      // No file storage - files will be manually attached by user to email

      // Prepare email content with full submission details
      const filesList = selectedFiles.map(f => f.name).join('\n   - ');
      const emailSubject = `New Manuscript Submission: ${formData.title}`;
      const emailBody = `Dear Editor,

I am submitting a manuscript for consideration for publication in Marine Notes Journal.

MANUSCRIPT INFORMATION:
Title: ${formData.title}
Manuscript Type: ${formData.manuscriptType}

Abstract:
${formData.abstract}

Keywords: ${formData.keywords}

AUTHOR INFORMATION:
Corresponding Author: ${formData.correspondingAuthor}
Email: ${formData.email}
Institution: ${formData.institution}
ORCID: ${formData.orcid || 'Not provided'}

All Authors:
${formData.authors}
${formData.coverLetter ? `

COVER LETTER:
${formData.coverLetter}` : ''}

COPYRIGHT AGREEMENT:
✓ I confirm this is original work
✓ No conflicts of interest
✓ Rights transferred to Marine Notes Journal
✓ Creative Commons License accepted
Signature: ${copyrightData.authorSignature}
Date: ${copyrightData.date}

IMPORTANT - PLEASE ATTACH THE FOLLOWING FILES:
   - ${filesList}

Best regards,
${formData.correspondingAuthor}`;

      // Store email data and show provider selection dialog
      setEmailData({ subject: emailSubject, body: emailBody });
      setShowEmailDialog(true);

      toast({
        title: "Submission Recorded!",
        description: "Please select your email provider and attach the manuscript files before sending.",
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...filesArray]);
      
      // Auto-fill from first PDF file (but not title)
      const firstPdf = filesArray.find(file => file.type === 'application/pdf');
      if (firstPdf) {
        toast({
          title: "Parsing PDF",
          description: "Extracting information from your manuscript...",
        });
        
        try {
          // Use a simple text extraction approach
          const text = await firstPdf.text();
          
          // Try to extract abstract
          const abstractMatch = text.match(/abstract[:\s]+(.*?)(?=\n\n|\nintroduction|keywords)/is);
          if (abstractMatch && !formData.abstract) {
            handleInputChange("abstract", abstractMatch[1].trim().substring(0, 500));
          }
          
          // Try to extract keywords
          const keywordsMatch = text.match(/keywords?[:\s]+(.*?)(?=\n\n|\nintroduction)/is);
          if (keywordsMatch && !formData.keywords) {
            handleInputChange("keywords", keywordsMatch[1].trim().substring(0, 200));
          }
          
          toast({
            title: "Information Extracted",
            description: "Please review and adjust the auto-filled fields.",
          });
        } catch (error) {
          console.error('PDF parsing error:', error);
        }
      }
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const openEmailProvider = (provider: 'gmail' | 'yahoo' | 'outlook') => {
    const to = 'editor@marinenotesjournal.com';
    const subject = encodeURIComponent(emailData.subject);
    const body = encodeURIComponent(emailData.body);
    
    let url = '';
    switch (provider) {
      case 'gmail':
        url = `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${subject}&body=${body}`;
        break;
      case 'yahoo':
        url = `http://compose.mail.yahoo.com/?to=${to}&subject=${subject}&body=${body}`;
        break;
      case 'outlook':
        url = `https://outlook.live.com/mail/0/deeplink/compose?to=${to}&subject=${subject}&body=${body}`;
        break;
    }
    
    window.open(url, '_blank');
    setShowEmailDialog(false);
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
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Copyright Transfer Agreement *
                      </CardTitle>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setCopyrightData(prev => ({
                          ...prev,
                          originalWork: true,
                          noConflict: true,
                          transferRights: true,
                          creativeCommons: true
                        }))}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Check All
                      </Button>
                    </div>
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
              <Card className="border-primary/50 bg-primary/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    New: Automated Submission System
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Try our new manuscript portal for a streamlined submission experience with:
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Track your submission status in real-time</li>
                    <li>• Direct file uploads — no email needed</li>
                    <li>• Receive editor feedback instantly</li>
                    <li>• Full submission history and timeline</li>
                  </ul>
                  <a href="/auth">
                    <Button className="w-full mt-2" size="sm">
                      Go to Manuscript Portal →
                    </Button>
                  </a>
                </CardContent>
              </Card>

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

      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Choose Your Email Provider
            </DialogTitle>
            <DialogDescription>
              Your email will open with all submission details pre-filled. 
              <strong className="block mt-2 text-foreground">Remember to attach your manuscript files before sending!</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-4">
            <Button 
              onClick={() => openEmailProvider('gmail')}
              className="w-full justify-start"
              variant="outline"
            >
              <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                <path fill="currentColor" d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L12 9.545l8.073-6.052C21.69 2.28 24 3.434 24 5.457z"/>
              </svg>
              Gmail
            </Button>
            <Button 
              onClick={() => openEmailProvider('yahoo')}
              className="w-full justify-start"
              variant="outline"
            >
              <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                <path fill="currentColor" d="M12.008 3.308L6.342 13.25h3.866l2.8-4.85 2.8 4.85h3.866l-5.666-9.942zM9.6 18.5h4.8v2.192H9.6z"/>
              </svg>
              Yahoo Mail
            </Button>
            <Button 
              onClick={() => openEmailProvider('outlook')}
              className="w-full justify-start"
              variant="outline"
            >
              <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                <path fill="currentColor" d="M7.88 12.04q0 .45-.11.87-.1.41-.33.74-.22.33-.58.52-.37.2-.87.2t-.85-.2q-.35-.21-.57-.55-.22-.33-.33-.75-.1-.42-.1-.86t.1-.87q.1-.43.34-.76.22-.34.59-.54.36-.2.87-.2t.86.2q.35.21.57.55.22.34.31.77.1.43.1.88zM24 12v9.38q0 .46-.33.8-.33.32-.8.32H7.13q-.46 0-.8-.33-.32-.33-.32-.8V18H1q-.41 0-.7-.3-.3-.29-.3-.7V7q0-.41.3-.7Q.58 6 1 6h6.5V2.55q0-.44.3-.75.3-.3.75-.3h12.9q.44 0 .75.3.3.3.3.75V10.85l1.24.72h.01q.1.07.18.18.07.12.07.25zm-6-8.25v3h3v-3zm0 4.5v3h3v-3zm0 4.5v1.83l3.05-1.83zm-5.25-9v3h3.75v-3zm0 4.5v3h3.75v-3zm0 4.5v2.03l2.41 1.5 1.34-.8v-2.73zM9 3.75V6h2l.13.01.12.04v-2.3zM5.98 15.98q.9 0 1.6-.3.7-.32 1.19-.86.48-.55.73-1.28.25-.74.25-1.61 0-.83-.25-1.55-.24-.71-.71-1.24t-1.15-.83q-.68-.3-1.55-.3-.92 0-1.64.3-.71.3-1.2.85-.5.54-.75 1.3-.25.74-.25 1.63 0 .85.26 1.56.26.72.74 1.23.48.52 1.17.81.69.3 1.56.3zM7.5 21h12.39L12 16.08V17q0 .41-.3.7-.29.3-.7.3H7.5zm15-.13v-7.24l-5.9 3.54Z"/>
              </svg>
              Outlook / Hotmail
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SubmitManuscript;
