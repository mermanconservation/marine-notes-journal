import { useState, useEffect, useRef } from "react";
import { formatDate, formatDateTime } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2, Shield, LogOut, CheckCircle, XCircle, Lock, Unlock, Users, FileText, UserPlus, Trash2, BarChart3, Upload, BookOpen, Download, Mail, Eye, Sparkles, Plus,
} from "lucide-react";


interface UnlockRequest {
  id: string;
  submission_id: string;
  requested_by: string;
  reason: string;
  status: string;
  decided_by: string | null;
  decision_comment: string | null;
  created_at: string;
  decided_at: string | null;
  submission_title?: string;
}

interface UserRole {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  email?: string;
}

interface SubmissionStats {
  total: number;
  pending: number;
  under_review: number;
  accepted: number;
  rejected: number;
}

const AdminPanel = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [unlockRequests, setUnlockRequests] = useState<UnlockRequest[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [decisionComments, setDecisionComments] = useState<Record<string, string>>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [newRoleEmail, setNewRoleEmail] = useState("");
  const [newRoleType, setNewRoleType] = useState<string>("editor");
  const [addingRole, setAddingRole] = useState(false);
  const [stats, setStats] = useState<SubmissionStats>({ total: 0, pending: 0, under_review: 0, accepted: 0, rejected: 0 });
  const [publishedArticles, setPublishedArticles] = useState<any[]>([]);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteConfirmTitle, setDeleteConfirmTitle] = useState("");
  const [deletingArticle, setDeletingArticle] = useState<string | null>(null);
  const [editorPasscode, setEditorPasscode] = useState<string | null>(null);
  const [acceptedSubmissions, setAcceptedSubmissions] = useState<any[]>([]);
  const [publishingSubmission, setPublishingSubmission] = useState<string | null>(null);
  const [publishPdfFile, setPublishPdfFile] = useState<File | null>(null);
  const publishFileRef = useRef<HTMLInputElement>(null);
  const [editingPages, setEditingPages] = useState<Record<string, string>>({});
  const [savingPages, setSavingPages] = useState<string | null>(null);
  const [publishPages, setPublishPages] = useState("");
  const [sendAuthorEmail, setSendAuthorEmail] = useState(true);
  const [extractingMeta, setExtractingMeta] = useState(false);
  // Preview modal state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [confirmingPublish, setConfirmingPublish] = useState(false);
  // Issue management
  const [issues, setIssues] = useState<any[]>([]);
  const [newVolume, setNewVolume] = useState("");
  const [newIssue, setNewIssue] = useState("");
  const [newIssueYear, setNewIssueYear] = useState(String(new Date().getFullYear() + 1));
  const [openingIssue, setOpeningIssue] = useState(false);
  const [bulkVolume, setBulkVolume] = useState("2");
  const [bulkIssueCount, setBulkIssueCount] = useState("4");
  const [bulkYear, setBulkYear] = useState(String(new Date().getFullYear() + 1));
  const [issuePdfFile, setIssuePdfFile] = useState<File | null>(null);
  const [uploadingIssuePdf, setUploadingIssuePdf] = useState<string | null>(null);
  const issuePdfRef = useRef<HTMLInputElement>(null);
  const [issueUploadTargetId, setIssueUploadTargetId] = useState<string | null>(null);


  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) checkAdmin();
  }, [user]);

  const checkAdmin = async () => {
    const { data } = await supabase.rpc("has_role", { _user_id: user!.id, _role: "admin" });
    if (data) {
      setIsAdmin(true);
      await loadData();
    } else {
      setIsAdmin(false);
      setLoading(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    const [{ data: requests }, { data: roles }, { data: submissions }, { data: acceptedSubs }] = await Promise.all([
      supabase.from("unlock_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("*").order("created_at", { ascending: false }),
      supabase.from("manuscript_submissions").select("id, title, status, user_id, corresponding_author_email"),
      supabase.from("manuscript_submissions").select("*").eq("status", "accepted").order("decision_date", { ascending: false }),
    ]);

    // Build email map: user_id -> email
    const emailMap = new Map<string, string>();
    (submissions || []).forEach((s: any) => {
      if (s.user_id && s.corresponding_author_email) {
        emailMap.set(s.user_id, s.corresponding_author_email);
      }
    });

    // Enrich unlock requests with submission titles
    const submissionMap = new Map((submissions || []).map((s: any) => [s.id, s.title]));
    const enrichedRequests = ((requests as UnlockRequest[]) || []).map(r => ({
      ...r,
      submission_title: submissionMap.get(r.submission_id) || "Unknown",
    }));
    setUnlockRequests(enrichedRequests);

    // Enrich roles with real auth emails via secure edge function; fall back to submission emails
    let enrichedRoles: UserRole[] = [];
    try {
      const { data: rr } = await supabase.functions.invoke("admin-list-roles");
      if (rr?.roles) {
        enrichedRoles = (rr.roles as any[]).map(r => ({
          ...r,
          email: r.email || emailMap.get(r.user_id) || undefined,
        }));
      }
    } catch (e) {
      console.warn("admin-list-roles failed, falling back:", e);
    }
    if (enrichedRoles.length === 0) {
      enrichedRoles = ((roles as UserRole[]) || []).map(r => ({
        ...r,
        email: emailMap.get(r.user_id) || undefined,
      }));
    }
    setUserRoles(enrichedRoles);

    // Compute stats
    const allSubs = submissions || [];
    setStats({
      total: allSubs.length,
      pending: allSubs.filter((s: any) => s.status === "pending").length,
      under_review: allSubs.filter((s: any) => s.status === "under_review").length,
      accepted: allSubs.filter((s: any) => s.status === "accepted").length,
      rejected: allSubs.filter((s: any) => s.status === "rejected").length,
    });

    // Load published articles
    try {
      const code = editorPasscode || prompt("Enter editor passcode to load articles:");
      if (code) {
        if (!editorPasscode) setEditorPasscode(code);
        const res = await supabase.functions.invoke("publish-article", {
          body: { passcode: code, action: "list-articles" },
        });
        if (res.data?.articles) {
          setPublishedArticles(res.data.articles.filter((a: any) => !a.is_static));
        }
      }
    } catch {}

    setAcceptedSubmissions(acceptedSubs || []);

    // Load journal issues
    const { data: issuesData } = await supabase
      .from("journal_issues")
      .select("*")
      .order("year", { ascending: true })
      .order("volume", { ascending: true })
      .order("issue", { ascending: true });
    setIssues(issuesData || []);

    setLoading(false);
  };


  const handleDeleteArticle = async (article: any) => {
    if (deleteConfirmTitle !== article.title) {
      toast({ title: "Title mismatch", description: "You must type the exact article title to confirm deletion.", variant: "destructive" });
      return;
    }
    if (!deleteReason.trim()) {
      toast({ title: "Reason required", description: "Please provide a reason for removing this article.", variant: "destructive" });
      return;
    }
    setDeletingArticle(article.doi);
    try {
      const code = editorPasscode || prompt("Enter editor passcode:");
      if (!code) { setDeletingArticle(null); return; }
      if (!editorPasscode) setEditorPasscode(code);
      const res = await supabase.functions.invoke("publish-article", {
        body: { passcode: code, action: "delete", article: { doi: article.doi } },
      });
      if (res.error || res.data?.error) {
        throw new Error(res.data?.error || "Failed to delete article");
      }
      toast({ title: "Article Removed", description: `"${article.title}" has been removed. Reason: ${deleteReason}` });
      setDeleteReason("");
      setDeleteConfirmTitle("");
      await loadData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setDeletingArticle(null);
  };

  const handleUnlockDecision = async (request: UnlockRequest, approved: boolean) => {
    setActionLoading(request.id);
    try {
      const comment = decisionComments[request.id] || null;
      await supabase.from("unlock_requests").update({
        status: approved ? "approved" : "denied",
        decided_by: user!.id,
        decision_comment: comment,
        decided_at: new Date().toISOString(),
      }).eq("id", request.id);

      if (approved) {
        await supabase.from("submission_reviews").insert({
          submission_id: request.submission_id,
          reviewer_id: user!.id,
          action: "unlock",
          comment: `Submission unlocked by admin. Editor's reason: ${request.reason}${comment ? `. Admin note: ${comment}` : ""}`,
        });
        await supabase.from("manuscript_submissions").update({
          status: "under_review",
          decision_date: null,
        }).eq("id", request.submission_id);
      }

      toast({
        title: approved ? "Unlock Approved" : "Unlock Denied",
        description: approved
          ? "The submission has been unlocked and set to under review."
          : "The unlock request has been denied.",
      });
      setDecisionComments(prev => ({ ...prev, [request.id]: "" }));
      await loadData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setActionLoading(null);
  };

  const handleAddRole = async () => {
    if (!newRoleEmail.trim()) return;
    setAddingRole(true);
    try {
      // Securely resolve user_id from verified auth.users via edge function
      const { data: resolveData, error: resolveError } = await supabase.functions.invoke(
        "resolve-user-by-email",
        { body: { email: newRoleEmail.trim() } }
      );

      if (resolveError || !resolveData?.user_id) {
        const msg = resolveData?.error || "No account found with that verified email.";
        toast({ title: "User not found", description: msg, variant: "destructive" });
        setAddingRole(false);
        return;
      }

      const targetUserId: string = resolveData.user_id;

      // Check if role already exists
      const { data: existing } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", targetUserId)
        .eq("role", newRoleType as any);

      if (existing && existing.length > 0) {
        toast({ title: "Role exists", description: "This user already has this role.", variant: "destructive" });
        setAddingRole(false);
        return;
      }

      await supabase.from("user_roles").insert({
        user_id: targetUserId,
        role: newRoleType as any,
      });

      toast({ title: "Role Added", description: `${newRoleType} role assigned successfully.` });
      setNewRoleEmail("");
      await loadData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setAddingRole(false);
  };

  const handleRemoveRole = async (roleId: string) => {
    setActionLoading(roleId);
    try {
      await supabase.from("user_roles").delete().eq("id", roleId);
      toast({ title: "Role Removed", description: "The role has been removed." });
      await loadData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setActionLoading(null);
  };

  const handleSavePages = async (article: any) => {
    const newPages = editingPages[article.doi];
    if (newPages === undefined) return;
    setSavingPages(article.doi);
    try {
      const code = editorPasscode || prompt("Enter editor passcode:");
      if (!code) { setSavingPages(null); return; }
      if (!editorPasscode) setEditorPasscode(code);
      const res = await supabase.functions.invoke("publish-article", {
        body: {
          passcode: code, action: "update",
          article: { ...article, pages: newPages || null },
        },
      });
      if (res.error || res.data?.error) throw new Error(res.data?.error || "Failed to update pages");
      toast({ title: "Pages Updated", description: `Pages set to "${newPages}" for ${article.doi}` });
      setEditingPages(prev => { const n = { ...prev }; delete n[article.doi]; return n; });
      await loadData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setSavingPages(null);
  };

  const readFileAsBase64 = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });

  const safeInvoke = async (fn: string, body: any) => {
    const res = await supabase.functions.invoke(fn, { body });
    // supabase-js returns { data, error }; when the function throws or returns non-2xx,
    // `data` can be null and `error` holds a FunctionsHttpError whose context has the response body.
    if (res.error) {
      let msg = res.error.message || `${fn} failed`;
      try {
        const ctx: any = (res.error as any).context;
        if (ctx?.body) {
          const parsed = typeof ctx.body === "string" ? JSON.parse(ctx.body) : ctx.body;
          if (parsed?.error) msg = parsed.error;
        }
      } catch {}
      throw new Error(msg);
    }
    if (!res.data) throw new Error(`${fn} returned no data`);
    if (res.data.error) throw new Error(res.data.error);
    return res.data;
  };

  const handlePreparePreview = async (submission: any) => {
    if (!publishPdfFile) {
      toast({ title: "PDF Required", description: "Please select the final manuscript PDF to publish.", variant: "destructive" });
      return;
    }
    setPublishingSubmission(submission.id);
    try {
      const code = editorPasscode || prompt("Enter editor passcode:");
      if (!code) { setPublishingSubmission(null); return; }
      if (!editorPasscode) setEditorPasscode(code);

      const doiData = await safeInvoke("publish-article", { passcode: code, action: "get-next-doi" });
      const doi = doiData.doi;
      if (!doi) throw new Error("Could not generate DOI");

      const base64 = await readFileAsBase64(publishPdfFile);
      const year = new Date().getFullYear();
      const safeName = submission.title.replace(/[^a-zA-Z0-9-]/g, "-").replace(/-+/g, "-").substring(0, 80);
      const fileName = `${year}/${doi}-${safeName}.pdf`;

      const uploadData = await safeInvoke("publish-article", {
        passcode: code, action: "upload-pdf", article: { fileName, fileData: base64 },
      });
      const pdfUrl = uploadData.url;
      if (!pdfUrl) throw new Error("PDF upload returned no URL");

      const meta = submission.pipeline_results?.prepared_metadata || {};
      const orcids = submission.corresponding_author_orcid ? [submission.corresponding_author_orcid] : [];
      const typeMap: Record<string, string> = {
        research_article: "Research Article", review_article: "Review Article",
        short_communication: "Short Communication", technical_report: "Technical Report / Risk Assessment",
        conservation_news: "Conservation News", field_notes: "Field Notes",
        observational_reports: "Observational Reports", case_study: "Case Study",
        methodology: "Methodology Paper",
      };
      const articleType = typeMap[submission.manuscript_type] || submission.manuscript_type || "Research Article";

      setPreviewData({
        submission,
        code,
        doi,
        title: submission.title,
        authors: submission.all_authors || submission.corresponding_author_name,
        orcids,
        articleType,
        volume: meta.volume || "1",
        issue: meta.issue || "1",
        abstract: submission.abstract,
        pages: publishPages || "",
        pdfUrl,
        publicationDate: new Date().toISOString().split("T")[0],
        recipient: submission.corresponding_author_email,
      });
      setPreviewOpen(true);
    } catch (err: any) {
      toast({ title: "Preview Failed", description: err.message, variant: "destructive" });
    }
    setPublishingSubmission(null);
  };

  const handleConfirmPublish = async () => {
    if (!previewData) return;
    setConfirmingPublish(true);
    try {
      await safeInvoke("publish-article", {
        passcode: previewData.code, action: "publish",
        article: {
          doi: previewData.doi,
          title: previewData.title,
          authors: previewData.authors,
          orcidIds: previewData.orcids,
          type: previewData.articleType,
          volume: previewData.volume,
          issue: previewData.issue,
          abstract: previewData.abstract,
          publicationDate: previewData.publicationDate,
          pdfUrl: previewData.pdfUrl,
          pages: previewData.pages || null,
        },
      });

      // Send confirmation email if enabled
      if (sendAuthorEmail && previewData.recipient) {
        try {
          await safeInvoke("admin-extras", {
            passcode: previewData.code, action: "send-publication-email",
            payload: {
              recipient: previewData.recipient,
              title: previewData.title,
              authors: previewData.authors,
              doi: previewData.doi,
              volume: previewData.volume,
              issue: previewData.issue,
              pages: previewData.pages,
              articleUrl: `https://www.marinenotesjournal.com/doi/${previewData.doi}`,
              pdfUrl: previewData.pdfUrl,
            },
          });
          toast({ title: "Published & Author Notified", description: `${previewData.doi} live. Email sent to ${previewData.recipient}` });
        } catch (emailErr: any) {
          toast({ title: "Published (email failed)", description: `Article live but email failed: ${emailErr.message}`, variant: "destructive" });
        }
      } else {
        toast({ title: "Published!", description: `${previewData.doi} is now live.` });
      }

      setPreviewOpen(false);
      setPreviewData(null);
      setPublishPdfFile(null);
      setPublishPages("");
      if (publishFileRef.current) publishFileRef.current.value = "";
      await loadData();
    } catch (err: any) {
      toast({ title: "Publish Failed", description: err.message, variant: "destructive" });
    }
    setConfirmingPublish(false);
  };

  const handleExtractMetadata = async (submission: any) => {
    if (!publishPdfFile) {
      toast({ title: "PDF Required", description: "Select the PDF first, then extract.", variant: "destructive" });
      return;
    }
    setExtractingMeta(true);
    try {
      const code = editorPasscode || prompt("Enter editor passcode:");
      if (!code) { setExtractingMeta(false); return; }
      if (!editorPasscode) setEditorPasscode(code);
      const base64 = await readFileAsBase64(publishPdfFile);
      const data = await safeInvoke("admin-extras", {
        passcode: code, action: "extract-pdf-metadata",
        payload: { pdfBase64: base64, mimeType: publishPdfFile.type || "application/pdf" },
      });
      const m = data.metadata || {};
      // Patch the submission in-memory so the preview picks it up
      setAcceptedSubmissions(prev => prev.map(s => s.id === submission.id ? {
        ...s,
        title: m.title || s.title,
        all_authors: m.authors || s.all_authors,
        abstract: m.abstract || s.abstract,
      } : s));
      toast({ title: "Metadata Extracted", description: "Submission updated with values from the PDF. Review before publishing." });
    } catch (err: any) {
      toast({ title: "Extraction failed", description: err.message, variant: "destructive" });
    }
    setExtractingMeta(false);
  };

  // -------- Journal issues management --------
  const handleOpenIssue = async () => {
    if (!newVolume || !newIssue) {
      toast({ title: "Missing fields", description: "Volume and Issue are required.", variant: "destructive" });
      return;
    }
    setOpeningIssue(true);
    try {
      const code = editorPasscode || prompt("Enter editor passcode:");
      if (!code) { setOpeningIssue(false); return; }
      if (!editorPasscode) setEditorPasscode(code);
      await safeInvoke("admin-extras", {
        passcode: code, action: "open-issue",
        payload: { volume: newVolume, issue: newIssue, year: Number(newIssueYear) },
      });
      toast({ title: "Issue opened", description: `Vol ${newVolume}, Issue ${newIssue} (${newIssueYear})` });
      setNewVolume(""); setNewIssue("");
      await loadData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setOpeningIssue(false);
  };

  const handleBulkOpenIssues = async () => {
    const count = parseInt(bulkIssueCount, 10);
    if (!bulkVolume || !count || count < 1 || count > 12) {
      toast({ title: "Invalid input", description: "Give a volume and 1–12 issues.", variant: "destructive" });
      return;
    }
    setOpeningIssue(true);
    try {
      const code = editorPasscode || prompt("Enter editor passcode:");
      if (!code) { setOpeningIssue(false); return; }
      if (!editorPasscode) setEditorPasscode(code);
      const items = Array.from({ length: count }, (_, i) => ({
        volume: bulkVolume, issue: String(i + 1), year: Number(bulkYear),
      }));
      const data = await safeInvoke("admin-extras", { passcode: code, action: "bulk-open-issues", payload: { items } });
      toast({ title: "Issues opened", description: `${data.count} issues created for Volume ${bulkVolume} (${bulkYear})` });
      await loadData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setOpeningIssue(false);
  };

  const handleOpenNextIssue = async () => {
    // Highest volume; within it, highest issue → next issue
    if (issues.length === 0) {
      setNewVolume("1"); setNewIssue("1"); setNewIssueYear(String(new Date().getFullYear()));
      await handleOpenIssue();
      return;
    }
    const maxVol = Math.max(...issues.map((i: any) => parseInt(i.volume) || 0));
    const inVol = issues.filter((i: any) => parseInt(i.volume) === maxVol);
    const maxIssue = Math.max(...inVol.map((i: any) => parseInt(i.issue) || 0));
    const year = inVol[0]?.year || new Date().getFullYear();
    setOpeningIssue(true);
    try {
      const code = editorPasscode || prompt("Enter editor passcode:");
      if (!code) { setOpeningIssue(false); return; }
      if (!editorPasscode) setEditorPasscode(code);
      await safeInvoke("admin-extras", {
        passcode: code, action: "open-issue",
        payload: { volume: String(maxVol), issue: String(maxIssue + 1), year },
      });
      toast({ title: "Next issue opened", description: `Vol ${maxVol}, Issue ${maxIssue + 1} (${year})` });
      await loadData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setOpeningIssue(false);
  };

  const handleOpenNextVolume = async () => {
    const maxVol = issues.length === 0 ? 0 : Math.max(...issues.map((i: any) => parseInt(i.volume) || 0));
    const nextVol = maxVol + 1;
    const year = new Date().getFullYear() + (issues.length === 0 ? 0 : 1);
    setOpeningIssue(true);
    try {
      const code = editorPasscode || prompt("Enter editor passcode:");
      if (!code) { setOpeningIssue(false); return; }
      if (!editorPasscode) setEditorPasscode(code);
      await safeInvoke("admin-extras", {
        passcode: code, action: "open-issue",
        payload: { volume: String(nextVol), issue: "1", year },
      });
      toast({ title: "Next volume opened", description: `Vol ${nextVol}, Issue 1 (${year})` });
      await loadData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setOpeningIssue(false);
  };


  const handleUploadIssuePdf = async (issueRow: any) => {
    if (!issuePdfFile || issueUploadTargetId !== issueRow.id) {
      toast({ title: "Select a PDF", description: "Choose a PDF file for this issue first.", variant: "destructive" });
      return;
    }
    setUploadingIssuePdf(issueRow.id);
    try {
      const code = editorPasscode || prompt("Enter editor passcode:");
      if (!code) { setUploadingIssuePdf(null); return; }
      if (!editorPasscode) setEditorPasscode(code);
      const base64 = await readFileAsBase64(issuePdfFile);
      const safeName = issuePdfFile.name.replace(/[^\w\-\.]/g, "-");
      await safeInvoke("admin-extras", {
        passcode: code, action: "upload-issue-pdf",
        payload: { volume: issueRow.volume, issue: issueRow.issue, year: issueRow.year, fileName: safeName, fileData: base64 },
      });
      toast({ title: "Issue PDF uploaded", description: `Vol ${issueRow.volume}, Issue ${issueRow.issue}` });
      setIssuePdfFile(null);
      setIssueUploadTargetId(null);
      if (issuePdfRef.current) issuePdfRef.current.value = "";
      await loadData();
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    }
    setUploadingIssuePdf(null);
  };

  const handleDownloadIssuePdf = async (issueRow: any) => {
    if (!issueRow.issue_pdf_url) return;
    try {
      const code = editorPasscode || prompt("Enter editor passcode:");
      if (!code) return;
      if (!editorPasscode) setEditorPasscode(code);
      const data = await safeInvoke("admin-extras", {
        passcode: code, action: "get-issue-pdf-signed-url", payload: { path: issueRow.issue_pdf_url },
      });
      window.open(data.url, "_blank");
    } catch (err: any) {
      toast({ title: "Download failed", description: err.message, variant: "destructive" });
    }
  };



  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="py-12">
            <XCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-4">Admin privileges required.</p>
            <Button variant="outline" onClick={() => navigate("/")}>Go Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const pendingRequests = unlockRequests.filter(r => r.status === "pending");
  const resolvedRequests = unlockRequests.filter(r => r.status !== "pending");

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Shield className="h-7 w-7 text-primary" />
            <div>
              <h1 className="font-academic text-3xl font-semibold">Admin Panel</h1>
              <p className="text-muted-foreground text-sm mt-1">Manage unlock requests, roles, and system overview</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" /> Sign Out
          </Button>
        </div>

        {/* Submission Stats */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5" />
              Submission Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded-lg">
                <p className="text-2xl font-bold text-yellow-700">{stats.pending}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-700">{stats.under_review}</p>
                <p className="text-xs text-muted-foreground">Under Review</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-700">{stats.accepted}</p>
                <p className="text-xs text-muted-foreground">Accepted</p>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <p className="text-2xl font-bold text-red-700">{stats.rejected}</p>
                <p className="text-xs text-muted-foreground">Rejected</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending Unlock Requests */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lock className="h-5 w-5" />
              Pending Unlock Requests
              {pendingRequests.length > 0 && (
                <Badge variant="destructive" className="ml-2">{pendingRequests.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingRequests.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">No pending unlock requests</p>
            ) : (
              <div className="space-y-4">
                {pendingRequests.map(req => (
                  <div key={req.id} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium">{req.submission_title}</p>
                        <p className="text-xs text-muted-foreground">Requested: {formatDateTime(req.created_at)}</p>
                      </div>
                      <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
                    </div>
                    <div className="bg-muted/50 p-3 rounded text-sm">
                      <Label className="text-xs text-muted-foreground">Editor's Reason</Label>
                      <p className="mt-1">{req.reason}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Admin Comment (optional)</Label>
                      <Textarea
                        value={decisionComments[req.id] || ""}
                        onChange={e => setDecisionComments(prev => ({ ...prev, [req.id]: e.target.value }))}
                        placeholder="Add a comment about your decision..."
                        rows={2}
                        className="mt-1"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                        disabled={actionLoading === req.id}
                        onClick={() => handleUnlockDecision(req, true)}
                      >
                        {actionLoading === req.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Unlock className="h-3 w-3 mr-1" />}
                        Approve & Unlock
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={actionLoading === req.id}
                        onClick={() => handleUnlockDecision(req, false)}
                      >
                        <XCircle className="h-3 w-3 mr-1" /> Deny
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Resolved Unlock Requests */}
        {resolvedRequests.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5" />
                Resolved Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {resolvedRequests.map(req => (
                  <div key={req.id} className="p-3 border rounded-lg flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium">{req.submission_title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Reason: {req.reason}</p>
                      {req.decision_comment && (
                        <p className="text-xs text-muted-foreground mt-0.5">Admin: {req.decision_comment}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {req.decided_at && formatDateTime(req.decided_at)}
                      </p>
                    </div>
                    <Badge className={req.status === "approved" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                      {req.status === "approved" ? "Approved" : "Denied"}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Add Role */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <UserPlus className="h-5 w-5" />
              Add User Role
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                placeholder="User email (must have a submission)"
                value={newRoleEmail}
                onChange={e => setNewRoleEmail(e.target.value)}
                className="flex-1"
              />
              <Select value={newRoleType} onValueChange={setNewRoleType}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleAddRole} disabled={addingRole || !newRoleEmail.trim()}>
                {addingRole ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <UserPlus className="h-4 w-4 mr-1" />}
                Add Role
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Publish Accepted Submissions */}
        {acceptedSubmissions.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BookOpen className="h-5 w-5" />
                Accepted Submissions — Ready to Publish
                <Badge className="ml-2 bg-green-100 text-green-800">{acceptedSubmissions.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {acceptedSubmissions.map((sub: any) => (
                <div key={sub.id} className="p-4 border rounded-lg space-y-3">
                  <div>
                    <p className="text-sm font-medium">{sub.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {sub.all_authors || sub.corresponding_author_name} · {sub.manuscript_type} · Accepted: {formatDate(sub.decision_date || sub.updated_at)}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Upload Final Manuscript PDF *</Label>
                    <Input
                      ref={publishFileRef}
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={(e) => setPublishPdfFile(e.target.files?.[0] || null)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Pages (e.g. "43-58")</Label>
                    <Input
                      placeholder="e.g. 43-58"
                      value={publishPages}
                      onChange={(e) => setPublishPages(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <Label className="text-xs cursor-pointer" htmlFor={`email-${sub.id}`}>
                        Email author on publish ({sub.corresponding_author_email || "no email"})
                      </Label>
                    </div>
                    <Switch id={`email-${sub.id}`} checked={sendAuthorEmail} onCheckedChange={setSendAuthorEmail} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm" variant="outline"
                      disabled={extractingMeta || !publishPdfFile}
                      onClick={() => handleExtractMetadata(sub)}
                    >
                      {extractingMeta ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
                      Extract title/authors/abstract from PDF
                    </Button>
                    <Button
                      size="sm" className="bg-green-600 hover:bg-green-700 text-white"
                      disabled={publishingSubmission === sub.id || !publishPdfFile}
                      onClick={() => handlePreparePreview(sub)}
                    >
                      {publishingSubmission === sub.id ? (
                        <><Loader2 className="h-3 w-3 animate-spin mr-1" /> Preparing…</>
                      ) : (
                        <><Eye className="h-3 w-3 mr-1" /> Preview & Publish</>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Journal Issues Management */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BookOpen className="h-5 w-5" />
              Volumes & Issues
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-wrap gap-2 p-3 border rounded-lg bg-muted/30">
              <Button size="sm" variant="secondary" onClick={handleOpenNextIssue} disabled={openingIssue}>
                {openingIssue ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Plus className="h-3 w-3 mr-1" />}
                Open next issue
              </Button>
              <Button size="sm" variant="secondary" onClick={handleOpenNextVolume} disabled={openingIssue}>
                {openingIssue ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Plus className="h-3 w-3 mr-1" />}
                Open next volume
              </Button>
              <p className="text-xs text-muted-foreground self-center ml-2">Auto-detects highest existing volume/issue.</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="p-3 border rounded-lg space-y-2">
                <Label className="text-sm font-medium">Open a single issue</Label>
                <div className="flex gap-2">
                  <Input placeholder="Vol" value={newVolume} onChange={e => setNewVolume(e.target.value)} className="w-16" />
                  <Input placeholder="Issue" value={newIssue} onChange={e => setNewIssue(e.target.value)} className="w-20" />
                  <Input placeholder="Year" value={newIssueYear} onChange={e => setNewIssueYear(e.target.value)} className="w-24" />
                  <Button size="sm" onClick={handleOpenIssue} disabled={openingIssue}>
                    {openingIssue ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3 mr-1" />}Open
                  </Button>
                </div>
              </div>
              <div className="p-3 border rounded-lg space-y-2">
                <Label className="text-sm font-medium">Open a full volume (all issues)</Label>
                <div className="flex gap-2">
                  <Input placeholder="Vol" value={bulkVolume} onChange={e => setBulkVolume(e.target.value)} className="w-16" />
                  <Input placeholder="# issues" value={bulkIssueCount} onChange={e => setBulkIssueCount(e.target.value)} className="w-24" />
                  <Input placeholder="Year" value={bulkYear} onChange={e => setBulkYear(e.target.value)} className="w-24" />
                  <Button size="sm" onClick={handleBulkOpenIssues} disabled={openingIssue}>
                    {openingIssue ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3 mr-1" />}Open all
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {issues.length === 0 ? (
                <p className="text-sm text-muted-foreground">No issues yet.</p>
              ) : issues.map((iss: any) => (
                <div key={iss.id} className="flex flex-wrap items-center gap-3 p-3 border rounded-lg">
                  <div className="flex-1 min-w-[180px]">
                    <p className="text-sm font-medium">Vol {iss.volume} · Issue {iss.issue} · {iss.year}</p>
                    <p className="text-xs text-muted-foreground">Status: {iss.status}{iss.issue_pdf_url ? " · PDF uploaded" : ""}</p>
                  </div>
                  <Input
                    type="file"
                    accept=".pdf,application/pdf"
                    className="h-8 text-xs w-56"
                    ref={issueUploadTargetId === iss.id ? issuePdfRef : undefined}
                    onChange={(e) => { setIssuePdfFile(e.target.files?.[0] || null); setIssueUploadTargetId(iss.id); }}
                  />
                  <Button size="sm" variant="outline"
                    disabled={uploadingIssuePdf === iss.id || issueUploadTargetId !== iss.id || !issuePdfFile}
                    onClick={() => handleUploadIssuePdf(iss)}>
                    {uploadingIssuePdf === iss.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3 mr-1" />}
                    Upload
                  </Button>
                  {iss.issue_pdf_url && (
                    <Button size="sm" variant="outline" onClick={() => handleDownloadIssuePdf(iss)}>
                      <Download className="h-3 w-3 mr-1" /> Download
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Preview Modal */}
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Preview before publish</DialogTitle>
              <DialogDescription>Verify the metadata and PDF, then confirm to make the article live.</DialogDescription>
            </DialogHeader>
            {previewData && (
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">DOI</Label><p className="font-mono text-xs">{previewData.doi}</p></div>
                  <div><Label className="text-xs">Type</Label><p>{previewData.articleType}</p></div>
                  <div><Label className="text-xs">Volume</Label>
                    <Input value={previewData.volume} onChange={e => setPreviewData({ ...previewData, volume: e.target.value })} className="h-8" />
                  </div>
                  <div><Label className="text-xs">Issue</Label>
                    <Input value={previewData.issue} onChange={e => setPreviewData({ ...previewData, issue: e.target.value })} className="h-8" />
                  </div>
                  <div><Label className="text-xs">Pages</Label>
                    <Input value={previewData.pages} onChange={e => setPreviewData({ ...previewData, pages: e.target.value })} className="h-8" placeholder="e.g. 43-58" />
                  </div>
                  <div><Label className="text-xs">Publication date</Label>
                    <Input type="date" value={previewData.publicationDate} onChange={e => setPreviewData({ ...previewData, publicationDate: e.target.value })} className="h-8" />
                  </div>
                </div>
                <div><Label className="text-xs">Title</Label>
                  <Textarea rows={2} value={previewData.title} onChange={e => setPreviewData({ ...previewData, title: e.target.value })} />
                </div>
                <div><Label className="text-xs">Authors</Label>
                  <Input value={previewData.authors} onChange={e => setPreviewData({ ...previewData, authors: e.target.value })} />
                </div>
                <div><Label className="text-xs">Abstract</Label>
                  <Textarea rows={5} value={previewData.abstract} onChange={e => setPreviewData({ ...previewData, abstract: e.target.value })} />
                </div>
                <div className="p-2 bg-muted/50 rounded flex items-center justify-between">
                  <span className="text-xs">PDF uploaded ✓</span>
                  <a href={previewData.pdfUrl} target="_blank" rel="noreferrer" className="text-xs text-primary underline">Open PDF</a>
                </div>
                <div className="p-2 bg-muted/50 rounded flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <span className="text-xs">Send confirmation email to {previewData.recipient || "(no email on file)"}</span>
                  </div>
                  <Switch checked={sendAuthorEmail} onCheckedChange={setSendAuthorEmail} disabled={!previewData.recipient} />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setPreviewOpen(false)} disabled={confirmingPublish}>Cancel</Button>
              <Button onClick={handleConfirmPublish} disabled={confirmingPublish} className="bg-green-600 hover:bg-green-700 text-white">
                {confirmingPublish ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                Confirm & Publish
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>


        {/* Published Articles Management */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5" />
              Published Articles
              {publishedArticles.length > 0 && (
                <Badge variant="secondary" className="ml-2">{publishedArticles.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {publishedArticles.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">No dynamically published articles</p>
            ) : (
              <div className="space-y-3">
                {publishedArticles.map((article: any) => (
                  <div key={article.doi} className="p-4 border rounded-lg space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{article.title}</p>
                        <p className="text-xs text-muted-foreground">{article.doi} · {article.authors} · Pages: {article.pages || "—"}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center gap-1">
                          <Input
                            className="w-24 h-7 text-xs"
                            placeholder="e.g. 1-15"
                            value={editingPages[article.doi] ?? (article.pages || "")}
                            onChange={e => setEditingPages(prev => ({ ...prev, [article.doi]: e.target.value }))}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs px-2"
                            disabled={savingPages === article.doi || editingPages[article.doi] === undefined}
                            onClick={() => handleSavePages(article)}
                          >
                            {savingPages === article.doi ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
                          </Button>
                        </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive shrink-0"
                            disabled={deletingArticle === article.doi}
                          >
                            {deletingArticle === article.doi ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="max-w-lg">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-destructive">Remove Published Article</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently remove <strong>"{article.title}"</strong> from the journal. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <div className="space-y-3 py-2">
                            <div>
                              <Label className="text-sm font-medium">Reason for removal *</Label>
                              <Textarea
                                value={deleteReason}
                                onChange={e => setDeleteReason(e.target.value)}
                                placeholder="e.g. Duplicate entry, retraction, author request..."
                                rows={2}
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label className="text-sm font-medium">Type the exact article title to confirm *</Label>
                              <Input
                                value={deleteConfirmTitle}
                                onChange={e => setDeleteConfirmTitle(e.target.value)}
                                placeholder="Type article title here..."
                                className="mt-1"
                              />
                            </div>
                          </div>
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => { setDeleteReason(""); setDeleteConfirmTitle(""); }}>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => handleDeleteArticle(article)}
                              disabled={!deleteReason.trim() || deleteConfirmTitle !== article.title}
                            >
                              Remove Article
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* User Roles */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5" />
              User Roles
            </CardTitle>
          </CardHeader>
          <CardContent>
            {userRoles.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">No roles assigned</p>
            ) : (
              <div className="space-y-2">
                {userRoles.map(role => (
                  <div key={role.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      {role.email ? (
                        <p className="text-sm">{role.email}</p>
                      ) : (
                        <p className="text-sm font-mono">{role.user_id.slice(0, 8)}...</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {role.email && <span className="font-mono">{role.user_id.slice(0, 8)}... · </span>}
                        Since {formatDate(role.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={role.role === "admin" ? "default" : "secondary"}>
                        {role.role}
                      </Badge>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            disabled={actionLoading === role.id}
                          >
                            {actionLoading === role.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove Role</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to remove the <strong>{role.role}</strong> role from{" "}
                              <strong>{role.email || role.user_id.slice(0, 8) + "..."}</strong>? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => handleRemoveRole(role.id)}
                            >
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminPanel;
