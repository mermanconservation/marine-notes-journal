import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Plus, FileText, Clock, CheckCircle, XCircle, RotateCcw, LogOut, Upload, Check, Bot } from "lucide-react";

const STATUS_MAP: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "Pending Review", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  under_review: { label: "Under Review", color: "bg-blue-100 text-blue-800", icon: FileText },
  revisions_requested: { label: "Revisions Requested", color: "bg-orange-100 text-orange-800", icon: RotateCcw },
  accepted: { label: "Accepted", color: "bg-green-100 text-green-800", icon: CheckCircle },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-800", icon: XCircle },
};

const MANUSCRIPT_TYPES = [
  { value: "research-article", label: "Research Article" },
  { value: "review", label: "Review Article" },
  { value: "short-communication", label: "Short Communication" },
  { value: "technical-report", label: "Technical Report / Risk Assessment" },
  { value: "field-notes", label: "Field Notes" },
  { value: "observational-reports", label: "Observational Reports" },
  { value: "conservation-news", label: "Conservation News" },
  { value: "case-study", label: "Case Study" },
  { value: "methodology", label: "Methodology Paper" },
];

interface Submission {
  id: string;
  title: string;
  manuscript_type: string;
  status: string;
  created_at: string;
  updated_at: string;
  abstract: string;
  keywords: string;
  corresponding_author_name: string;
  corresponding_author_email: string;
  corresponding_author_affiliation: string;
  corresponding_author_orcid: string | null;
  all_authors: string;
  cover_letter: string | null;
}

interface Review {
  id: string;
  action: string;
  comment: string | null;
  created_at: string;
}

const AuthorDashboard = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [reviews, setReviews] = useState<Record<string, Review[]>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("my-submissions");
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const [form, setForm] = useState({
    title: "",
    manuscriptType: "",
    abstract: "",
    keywords: "",
    authorName: "",
    authorEmail: "",
    affiliation: "",
    orcid: "",
    allAuthors: "",
    coverLetter: "",
    copyrightOriginal: false,
    copyrightApproved: false,
    copyrightTransfer: false,
    copyrightCC: false,
    copyrightSignature: "",
  });

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      loadSubmissions();
      // Pre-fill author info from user metadata
      const meta = user.user_metadata;
      setForm(f => ({
        ...f,
        authorName: meta?.full_name || "",
        authorEmail: user.email || "",
      }));
    }
  }, [user]);

  const loadSubmissions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("manuscript_submissions")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Load error:", error);
    } else {
      setSubmissions(data || []);
      // Load reviews for each submission
      if (data && data.length > 0) {
        const { data: reviewData } = await supabase
          .from("submission_reviews")
          .select("*")
          .in("submission_id", data.map(s => s.id))
          .order("created_at", { ascending: false });

        if (reviewData) {
          const grouped: Record<string, Review[]> = {};
          reviewData.forEach((r: any) => {
            if (!grouped[r.submission_id]) grouped[r.submission_id] = [];
            grouped[r.submission_id].push(r);
          });
          setReviews(grouped);
        }
      }
    }
    setLoading(false);
  };

  const handleSubmitManuscript = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!form.title || !form.manuscriptType || !form.abstract || !form.keywords || !form.authorName || !form.authorEmail || !form.affiliation || !form.allAuthors) {
      toast({ title: "Missing fields", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    if (!form.copyrightOriginal || !form.copyrightApproved || !form.copyrightTransfer || !form.copyrightCC) {
      toast({ title: "Copyright Agreement Required", description: "Please agree to all copyright transfer terms", variant: "destructive" });
      return;
    }

    if (!form.copyrightSignature.trim()) {
      toast({ title: "Signature Required", description: "Please provide your electronic signature", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      // Upload files to storage if any
      const filePaths: string[] = [];
      for (const file of selectedFiles) {
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        const path = `submissions/${user.id}/${Date.now()}-${safeName}`;
        const { error: uploadError } = await supabase.storage
          .from("manuscripts")
          .upload(path, file, { upsert: true });
        if (uploadError) throw uploadError;
        filePaths.push(path);
      }

      const { error } = await supabase.from("manuscript_submissions").insert({
        user_id: user.id,
        title: form.title,
        manuscript_type: form.manuscriptType,
        abstract: form.abstract,
        keywords: form.keywords,
        corresponding_author_name: form.authorName,
        corresponding_author_email: form.authorEmail,
        corresponding_author_affiliation: form.affiliation,
        corresponding_author_orcid: form.orcid || null,
        all_authors: form.allAuthors,
        cover_letter: form.coverLetter || null,
        copyright_agreed: true,
        file_paths: filePaths,
        status: "pending",
      });

      if (error) throw error;

      toast({ title: "Submitted!", description: "Your manuscript has been submitted for review." });
      setForm({ title: "", manuscriptType: "", abstract: "", keywords: "", authorName: form.authorName, authorEmail: form.authorEmail, affiliation: form.affiliation, orcid: form.orcid, allAuthors: "", coverLetter: "", copyrightOriginal: false, copyrightApproved: false, copyrightTransfer: false, copyrightCC: false, copyrightSignature: "" });
      setSelectedFiles([]);
      setActiveTab("my-submissions");
      await loadSubmissions();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setSubmitting(false);
  };

  const statusInfo = (status: string) => STATUS_MAP[status] || STATUS_MAP.pending;

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-academic text-3xl font-semibold">Manuscript Portal</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Welcome, {user?.user_metadata?.full_name || user?.email}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" /> Sign Out
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="my-submissions">My Submissions</TabsTrigger>
            <TabsTrigger value="new-submission">
              <Plus className="h-4 w-4 mr-1" /> New Submission
            </TabsTrigger>
          </TabsList>

          <TabsContent value="my-submissions">
            {submissions.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No submissions yet</h3>
                  <p className="text-muted-foreground mb-4">Start by submitting your first manuscript</p>
                  <Button onClick={() => setActiveTab("new-submission")}>
                    <Plus className="h-4 w-4 mr-2" /> Submit Manuscript
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {submissions.map((sub) => {
                  const si = statusInfo(sub.status);
                  const StatusIcon = si.icon;
                  const subReviews = reviews[sub.id] || [];

                  return (
                    <Card key={sub.id} className={selectedSubmission?.id === sub.id ? "border-primary" : ""}>
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <button
                              className="text-left w-full"
                              onClick={() => setSelectedSubmission(selectedSubmission?.id === sub.id ? null : sub)}
                            >
                              <h3 className="font-medium text-base mb-1 hover:text-primary transition-colors">{sub.title}</h3>
                            </button>
                            <p className="text-sm text-muted-foreground">
                              {sub.manuscript_type} · Submitted {new Date(sub.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge className={`${si.color} shrink-0`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {si.label}
                          </Badge>
                        </div>

                        {selectedSubmission?.id === sub.id && (
                          <div className="mt-4 pt-4 border-t border-border space-y-4">
                            <div>
                              <Label className="text-xs text-muted-foreground">Abstract</Label>
                              <p className="text-sm mt-1">{sub.abstract}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label className="text-xs text-muted-foreground">Keywords</Label>
                                <p className="text-sm mt-1">{sub.keywords}</p>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">Authors</Label>
                                <p className="text-sm mt-1">{sub.all_authors}</p>
                              </div>
                            </div>

                            {/* Submission Timeline */}
                            <div>
                              <Label className="text-xs text-muted-foreground mb-2 block">Submission Timeline</Label>
                              <div className="relative pl-4 border-l-2 border-border space-y-3">
                                {/* Received entry */}
                                <div className="relative">
                                  <div className="absolute -left-[calc(0.5rem+1px)] top-1 h-3 w-3 rounded-full bg-primary border-2 border-background" />
                                  <div className="ml-2">
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className="text-xs">Received</Badge>
                                      <span className="text-xs text-muted-foreground">{new Date(sub.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-0.5">Manuscript submitted for review</p>
                                  </div>
                                </div>
                                {/* Review entries in chronological order */}
                                {[...subReviews].reverse().map((r) => {
                                  const isAiReview = r.action === "note" && r.comment?.startsWith("**");
                                  return (
                                    <div key={r.id} className="relative">
                                      <div className={`absolute -left-[calc(0.5rem+1px)] top-1 h-3 w-3 rounded-full border-2 border-background ${
                                        r.action === 'accept' ? 'bg-green-500' :
                                        r.action === 'reject' ? 'bg-red-500' :
                                        r.action === 'request_revision' ? 'bg-orange-500' :
                                        r.action === 'unlock' ? 'bg-purple-500' :
                                        'bg-blue-500'
                                      }`} />
                                      <div className="ml-2">
                                        <div className="flex items-center gap-2">
                                          <Badge variant="outline" className="text-xs">{r.action === 'unlock' ? 'Unlocked' : r.action.replace(/_/g, " ")}</Badge>
                                          <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
                                        </div>
                                        {r.comment && (
                                          isAiReview ? (
                                            <div className="mt-1.5 p-2.5 rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-sm whitespace-pre-wrap">
                                              <div className="flex items-center gap-1.5 mb-1.5 text-xs font-medium text-blue-700 dark:text-blue-400">
                                                <Bot className="h-3.5 w-3.5" /> AI Chief Editor Review
                                              </div>
                                              <div className="text-blue-900 dark:text-blue-200">{r.comment}</div>
                                            </div>
                                          ) : (
                                            <p className="text-sm mt-0.5">{r.comment}</p>
                                          )
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="new-submission">
            <form onSubmit={handleSubmitManuscript} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Manuscript Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Title *</Label>
                    <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Full manuscript title" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Manuscript Type *</Label>
                    <Select value={form.manuscriptType} onValueChange={v => setForm({ ...form, manuscriptType: v })} required>
                      <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>
                        {MANUSCRIPT_TYPES.map(t => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Abstract *</Label>
                    <Textarea value={form.abstract} onChange={e => setForm({ ...form, abstract: e.target.value })} rows={6} placeholder="Enter abstract (up to 250 words)" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Keywords *</Label>
                    <Input value={form.keywords} onChange={e => setForm({ ...form, keywords: e.target.value })} placeholder="keyword1, keyword2, keyword3" required />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Author Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Corresponding Author *</Label>
                      <Input value={form.authorName} onChange={e => setForm({ ...form, authorName: e.target.value })} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Email *</Label>
                      <Input type="email" value={form.authorEmail} onChange={e => setForm({ ...form, authorEmail: e.target.value })} required />
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Affiliation *</Label>
                      <Input value={form.affiliation} onChange={e => setForm({ ...form, affiliation: e.target.value })} required />
                    </div>
                    <div className="space-y-2">
                      <Label>ORCID (optional)</Label>
                      <Input value={form.orcid} onChange={e => setForm({ ...form, orcid: e.target.value })} placeholder="0000-0000-0000-0000" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>All Authors *</Label>
                    <Textarea value={form.allAuthors} onChange={e => setForm({ ...form, allAuthors: e.target.value })} placeholder="List all authors with affiliations" rows={3} required />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Files & Cover Letter</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Manuscript Files</Label>
                    <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                      <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                      <input
                        type="file"
                        id="manuscriptFiles"
                        onChange={e => { if (e.target.files) setSelectedFiles(Array.from(e.target.files)); }}
                        multiple
                        accept=".pdf,.doc,.docx"
                        className="hidden"
                      />
                      <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById("manuscriptFiles")?.click()}>
                        Choose Files
                      </Button>
                      {selectedFiles.length > 0 && (
                        <div className="mt-3 space-y-1">
                          {selectedFiles.map((f, i) => (
                            <p key={i} className="text-sm text-muted-foreground">{f.name}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Cover Letter (optional)</Label>
                    <Textarea value={form.coverLetter} onChange={e => setForm({ ...form, coverLetter: e.target.value })} rows={4} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Copyright Transfer Agreement *</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setForm({ ...form, copyrightOriginal: true, copyrightApproved: true, copyrightTransfer: true, copyrightCC: true })}
                  >
                    <Check className="h-4 w-4 mr-2" /> Check All
                  </Button>

                  <p className="text-sm text-muted-foreground">By submitting this manuscript, I/we confirm:</p>

                  <div className="space-y-3">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.copyrightOriginal}
                        onChange={e => setForm({ ...form, copyrightOriginal: e.target.checked })}
                        className="mt-1 h-4 w-4 rounded border-border"
                      />
                      <span className="text-sm">This manuscript is original work and has not been published elsewhere, nor is it currently under consideration for publication elsewhere.</span>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.copyrightApproved}
                        onChange={e => setForm({ ...form, copyrightApproved: e.target.checked })}
                        className="mt-1 h-4 w-4 rounded border-border"
                      />
                      <span className="text-sm">All authors have reviewed and approved the manuscript and there are no conflicts of interest to declare.</span>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.copyrightTransfer}
                        onChange={e => setForm({ ...form, copyrightTransfer: e.target.checked })}
                        className="mt-1 h-4 w-4 rounded border-border"
                      />
                      <span className="text-sm">I/we transfer copyright of this manuscript to Marine Notes Journal upon acceptance for publication.</span>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.copyrightCC}
                        onChange={e => setForm({ ...form, copyrightCC: e.target.checked })}
                        className="mt-1 h-4 w-4 rounded border-border"
                      />
                      <span className="text-sm">I/we agree to publish this work under a Creative Commons Attribution 4.0 International License (CC BY 4.0).</span>
                    </label>
                  </div>

                  <Separator />

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Full Name (Electronic Signature) *</Label>
                      <Input
                        value={form.copyrightSignature}
                        onChange={e => setForm({ ...form, copyrightSignature: e.target.value })}
                        placeholder="Type your full name"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Date</Label>
                      <Input value={new Date().toLocaleDateString()} disabled />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Button type="submit" size="lg" className="w-full" disabled={submitting}>
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Submitting...</> : <>Submit Manuscript</>}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AuthorDashboard;
