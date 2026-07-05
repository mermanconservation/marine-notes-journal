import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Lock, Upload, Check, Loader2, Pencil, Plus, BookOpen, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const ARTICLE_TYPES = [
  "Research Article",
  "Review Article",
  "Short Communication",
  "Technical Report / Risk Assessment",
  "Conservation News",
  "Field Notes",
  "Observational Reports",
  "Case Study",
  "Methodology Paper",
];

interface DbArticle {
  id: number;
  doi: string;
  title: string;
  authors: string;
  orcid_ids: string[] | null;
  type: string;
  publication_date: string;
  pdf_url: string | null;
  volume: string;
  issue: string;
  abstract: string;
  is_static?: boolean;
}

const EditorPanel = () => {
  const [passcode, setPasscode] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [mode, setMode] = useState<"new" | "edit">("new");
  const [existingArticles, setExistingArticles] = useState<DbArticle[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: "",
    authors: "",
    orcidIds: "",
    type: "",
    volume: "1",
    issue: "1",
    abstract: "",
    publicationDate: new Date().toISOString().split("T")[0],
  });
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [suggestedDoi, setSuggestedDoi] = useState("");

  // Journal issues (closed issues can receive a full-issue PDF)
  const [issues, setIssues] = useState<any[]>([]);
  const [issuePdfFile, setIssuePdfFile] = useState<File | null>(null);
  const [issueTargetId, setIssueTargetId] = useState<string | null>(null);
  const [issueBusyId, setIssueBusyId] = useState<string | null>(null);
  const [closingId, setClosingId] = useState<string | null>(null);
  const issuePdfRef = useRef<HTMLInputElement>(null);

  const callEdge = async (body: any) => {
    const { data } = await supabase.functions.invoke("publish-article", {
      body,
    });
    return data;
  };

  const loadArticles = async () => {
    const res = await callEdge({ passcode, action: "list-articles" });
    if (res?.articles) setExistingArticles(res.articles);
  };

  const loadIssues = async () => {
    const { data } = await supabase
      .from("journal_issues")
      .select("*")
      .order("year", { ascending: true })
      .order("volume", { ascending: true })
      .order("issue", { ascending: true });
    setIssues(data || []);
  };

  const readFileAsBase64 = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });

  const handleCloseIssue = async (iss: any) => {
    if (!iss.issue_pdf_url) {
      toast({ title: "Upload the final PDF first", description: "An issue can only be closed once the consolidated PDF is uploaded.", variant: "destructive" });
      return;
    }
    setClosingId(iss.id);
    try {
      const { error } = await supabase
        .from("journal_issues")
        .update({ status: "closed" })
        .eq("id", iss.id);
      if (error) throw error;
      toast({ title: "Issue closed", description: `Vol ${iss.volume}, Issue ${iss.issue}` });
      await loadIssues();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setClosingId(null);
  };

  const handleCloseVolume = async (volume: string) => {
    const inVol = issues.filter((i) => i.volume === volume);
    const missing = inVol.filter((i) => !i.issue_pdf_url);
    if (missing.length > 0) {
      toast({
        title: "Cannot close volume",
        description: `Upload the final PDF for issue(s) ${missing.map((m) => m.issue).join(", ")} first.`,
        variant: "destructive",
      });
      return;
    }
    setClosingId(`vol-${volume}`);
    try {
      const { error } = await supabase
        .from("journal_issues")
        .update({ status: "closed" })
        .eq("volume", volume);
      if (error) throw error;
      toast({ title: "Volume closed", description: `Volume ${volume}` });
      await loadIssues();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setClosingId(null);
  };


  const handleUploadIssuePdf = async (iss: any) => {
    if (!issuePdfFile || issueTargetId !== iss.id) {
      toast({ title: "Select a PDF", description: "Choose the final issue PDF first.", variant: "destructive" });
      return;
    }
    setIssueBusyId(iss.id);
    try {
      const base64 = await readFileAsBase64(issuePdfFile);
      const safeName = issuePdfFile.name.replace(/[^\w\-\.]/g, "-");
      const { data, error } = await supabase.functions.invoke("admin-extras", {
        body: {
          passcode, action: "upload-issue-pdf",
          payload: { volume: iss.volume, issue: iss.issue, year: iss.year, fileName: safeName, fileData: base64 },
        },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message || "Upload failed");
      toast({ title: "Final issue PDF uploaded", description: `Vol ${iss.volume}, Issue ${iss.issue}` });
      setIssuePdfFile(null);
      setIssueTargetId(null);
      if (issuePdfRef.current) issuePdfRef.current.value = "";
      await loadIssues();
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    }
    setIssueBusyId(null);
  };

  const handleDownloadIssuePdf = async (iss: any) => {
    if (!iss.issue_pdf_url) return;
    try {
      const { data, error } = await supabase.functions.invoke("admin-extras", {
        body: { passcode, action: "get-issue-pdf-signed-url", payload: { path: iss.issue_pdf_url } },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message || "Download failed");
      window.open(data.url, "_blank");
    } catch (err: any) {
      toast({ title: "Download failed", description: err.message, variant: "destructive" });
    }
  };

  const handleLogin = async () => {
    setLoading(true);
    try {
      const res = await callEdge({ passcode, action: "get-next-doi" });
      if (res?.error) {
        toast({ title: "Access denied", description: res.error, variant: "destructive" });
      } else {
        setAuthenticated(true);
        setSuggestedDoi(res.doi);
        toast({ title: "Welcome, Editor", description: `Next DOI: ${res.doi}` });
      }
    } catch {
      toast({ title: "Error", description: "Could not verify passcode", variant: "destructive" });
    }
    setLoading(false);
  };

  useEffect(() => {
    if (authenticated) { loadArticles(); loadIssues(); }
  }, [authenticated]);

  const selectArticleForEdit = (article: DbArticle) => {
    setMode("edit");
    setEditingId(article.id);
    setForm({
      title: article.title,
      authors: article.authors,
      orcidIds: (article.orcid_ids || []).join(", "),
      type: article.type,
      volume: article.volume,
      issue: article.issue,
      abstract: article.abstract,
      publicationDate: article.publication_date,
    });
    setSuggestedDoi(article.doi);
    setPdfFile(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const resetToNew = async () => {
    setMode("new");
    setEditingId(null);
    setForm({ title: "", authors: "", orcidIds: "", type: "", volume: "1", issue: "1", abstract: "", publicationDate: new Date().toISOString().split("T")[0] });
    setPdfFile(null);
    if (fileRef.current) fileRef.current.value = "";
    const res = await callEdge({ passcode, action: "get-next-doi" });
    if (res?.doi) setSuggestedDoi(res.doi);
  };

  const uploadPdf = async (): Promise<string> => {
    if (!pdfFile) return "";
    const reader = new FileReader();
    const base64 = await new Promise<string>((resolve) => {
      reader.onload = () => resolve((reader.result as string).split(",")[1]);
      reader.readAsDataURL(pdfFile);
    });
    const year = new Date().getFullYear();
    const safeName = form.title.replace(/[^a-zA-Z0-9-]/g, "-").substring(0, 80);
    const fileName = `${year}/${suggestedDoi}-${safeName}.pdf`;
    const uploadRes = await callEdge({ passcode, action: "upload-pdf", article: { fileName, fileData: base64 } });
    if (uploadRes?.error) throw new Error(uploadRes.error);
    return uploadRes.url;
  };

  const handlePublish = async () => {
    if (!form.title || !form.authors || !form.type || !form.abstract) {
      toast({ title: "Missing fields", description: "Fill in all required fields", variant: "destructive" });
      return;
    }

    setPublishing(true);
    try {
      let pdfUrl = "";
      if (pdfFile) pdfUrl = await uploadPdf();

      if (mode === "edit" && editingId !== null) {
        const updatePayload: any = {
          id: editingId,
          title: form.title,
          authors: form.authors,
          orcidIds: form.orcidIds ? form.orcidIds.split(",").map((s: string) => s.trim()) : [],
          type: form.type,
          volume: form.volume,
          issue: form.issue,
          abstract: form.abstract,
          publicationDate: form.publicationDate,
        };
        if (pdfUrl) updatePayload.pdfUrl = pdfUrl;

        const res = await callEdge({ passcode, action: "update", article: updatePayload });
        if (res?.error) {
          toast({ title: "Update failed", description: res.error, variant: "destructive" });
        } else {
          toast({ title: "Updated!", description: `Article ${suggestedDoi} has been updated.` });
          await loadArticles();
        }
      } else {
        const publishRes = await callEdge({
          passcode,
          action: "publish",
          article: {
            doi: suggestedDoi,
            title: form.title,
            authors: form.authors,
            orcidIds: form.orcidIds ? form.orcidIds.split(",").map((s: string) => s.trim()) : [],
            type: form.type,
            volume: form.volume,
            issue: form.issue,
            abstract: form.abstract,
            publicationDate: form.publicationDate,
            pdfUrl,
          },
        });
        if (publishRes?.error) {
          toast({ title: "Publish failed", description: publishRes.error, variant: "destructive" });
        } else {
          toast({ title: "Published!", description: `Article ${suggestedDoi} is now live.` });
          await resetToNew();
          await loadArticles();
        }
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setPublishing(false);
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Lock className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <CardTitle>Editor Access</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="password"
              placeholder="Enter editor passcode"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            />
            <Button className="w-full" onClick={handleLogin} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
              Access Panel
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="font-academic text-3xl font-semibold mb-2">Editor Panel</h1>
          <p className="text-muted-foreground">
            {mode === "edit" ? "Editing" : "Publishing new article"}. DOI: <code className="text-primary">{suggestedDoi}</code>
          </p>
        </div>

        {/* Existing articles list */}
        {existingArticles.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Pencil className="h-4 w-4" /> Published Articles (click to edit)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {existingArticles.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => selectArticleForEdit(a)}
                    className={`w-full text-left p-3 rounded-md border transition-colors hover:bg-accent ${editingId === a.id ? "border-primary bg-accent" : "border-border"}`}
                  >
                    <div className="font-medium text-sm flex items-center gap-2">
                      {a.doi}
                      {a.is_static && <span className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">static</span>}
                    </div>
                    <div className="text-sm text-muted-foreground truncate">{a.title}</div>
                  </button>
                ))}
              </div>
              {mode === "edit" && (
                <Button variant="outline" size="sm" className="mt-4" onClick={resetToNew}>
                  <Plus className="h-4 w-4 mr-1" /> New Article Instead
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Journal Issues — upload final PDF when closed */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="h-4 w-4" /> Journal Issues
            </CardTitle>
          </CardHeader>
          <CardContent>
            {issues.length === 0 ? (
              <p className="text-sm text-muted-foreground">No issues yet. Ask an admin to open one.</p>
            ) : (
              <div className="space-y-2">
                {issues.map((iss) => {
                  const closed = iss.status === "closed";
                  return (
                    <div key={iss.id} className="flex flex-wrap items-center gap-3 p-3 border rounded-lg">
                      <div className="flex-1 min-w-[180px]">
                        <p className="text-sm font-medium">Vol {iss.volume} · Issue {iss.issue} · {iss.year}</p>
                        <p className="text-xs text-muted-foreground">
                          Status: <span className={closed ? "text-primary font-medium" : ""}>{iss.status}</span>
                          {iss.issue_pdf_url ? " · PDF uploaded" : ""}
                        </p>
                      </div>
                      {!closed && (
                        <Button size="sm" variant="outline" onClick={() => handleCloseIssue(iss)} disabled={closingId === iss.id}>
                          {closingId === iss.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Lock className="h-3 w-3 mr-1" />}
                          Close issue
                        </Button>
                      )}
                      {closed && (
                        <>
                          <Input
                            type="file"
                            accept=".pdf,application/pdf"
                            className="h-8 text-xs w-56"
                            ref={issueTargetId === iss.id ? issuePdfRef : undefined}
                            onChange={(e) => { setIssuePdfFile(e.target.files?.[0] || null); setIssueTargetId(iss.id); }}
                          />
                          <Button
                            size="sm" variant="outline"
                            disabled={issueBusyId === iss.id || issueTargetId !== iss.id || !issuePdfFile}
                            onClick={() => handleUploadIssuePdf(iss)}
                          >
                            {issueBusyId === iss.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3 mr-1" />}
                            Upload final PDF
                          </Button>
                          {iss.issue_pdf_url && (
                            <Button size="sm" variant="outline" onClick={() => handleDownloadIssuePdf(iss)}>
                              <Download className="h-3 w-3 mr-1" /> Download
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>


        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Authors *</Label>
                <Input value={form.authors} onChange={(e) => setForm({ ...form, authors: e.target.value })} placeholder="Author1, Author2" />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Article Type *</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {ARTICLE_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Volume</Label>
                <Input value={form.volume} onChange={(e) => setForm({ ...form, volume: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Issue</Label>
                <Input value={form.issue} onChange={(e) => setForm({ ...form, issue: e.target.value })} />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Publication Date</Label>
                <Input type="date" value={form.publicationDate} onChange={(e) => setForm({ ...form, publicationDate: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>ORCID IDs (comma-separated)</Label>
                <Input value={form.orcidIds} onChange={(e) => setForm({ ...form, orcidIds: e.target.value })} placeholder="0000-0001-..." />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Abstract *</Label>
              <Textarea value={form.abstract} onChange={(e) => setForm({ ...form, abstract: e.target.value })} rows={6} />
            </div>

            <div className="space-y-2">
              <Label>Manuscript PDF {mode === "edit" ? "(leave empty to keep current)" : ""}</Label>
              <Input ref={fileRef} type="file" accept=".pdf" onChange={(e) => setPdfFile(e.target.files?.[0] || null)} />
            </div>

            <Button size="lg" className="w-full" onClick={handlePublish} disabled={publishing}>
              {publishing ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> {mode === "edit" ? "Updating..." : "Publishing..."}</>
              ) : (
                <><Check className="h-4 w-4 mr-2" /> {mode === "edit" ? "Update Article" : "Accept & Publish"}</>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EditorPanel;
