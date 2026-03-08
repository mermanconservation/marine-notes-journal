import { useState, useEffect } from "react";
import { formatDate, formatDateTime } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2, FileText, Clock, CheckCircle, XCircle, RotateCcw,
  LogOut, MessageSquare, UserCheck, Filter, ExternalLink, Bot, Lock, Bell, BellDot,
  Zap, Send, ChevronDown, Download, Copy, Play, Upload,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase as supabaseClient } from "@/integrations/supabase/client";
import { AiReviewNote, isAiReviewComment } from "@/components/AiReviewNote";

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending", color: "bg-yellow-100 text-yellow-800" },
  { value: "under_review", label: "Under Review", color: "bg-blue-100 text-blue-800" },
  { value: "revisions_requested", label: "Revisions Requested", color: "bg-orange-100 text-orange-800" },
  { value: "accepted", label: "Accepted", color: "bg-green-100 text-green-800" },
  { value: "rejected", label: "Rejected", color: "bg-red-100 text-red-800" },
];

const ACTION_LABELS: Record<string, string> = {
  note: "Note",
  request_revision: "Revision Requested",
  accept: "Accepted",
  reject: "Rejected",
  assign_reviewer: "Reviewer Assigned",
  unlock: "Unlocked",
};

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
  file_paths: string[] | null;
  user_id: string | null;
  assigned_reviewer_id: string | null;
  decision_date: string | null;
  pipeline_status: string;
  pipeline_results: any;
}

interface Review {
  id: string;
  submission_id: string;
  reviewer_id: string;
  action: string;
  comment: string | null;
  created_at: string;
}

const EditorSubmissions = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [reviews, setReviews] = useState<Record<string, Review[]>>({});
  const [loading, setLoading] = useState(true);
  const [isEditor, setIsEditor] = useState(false);
  const [selectedSub, setSelectedSub] = useState<Submission | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [actionComment, setActionComment] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [aiReviewLoading, setAiReviewLoading] = useState(false);
  const [aiReviewResult, setAiReviewResult] = useState<string | null>(null);
  const [showUnlockDialog, setShowUnlockDialog] = useState(false);
  const [unlockReason, setUnlockReason] = useState("");
  const [unlockLoading, setUnlockLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [publishLoading, setPublishLoading] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishData, setPublishData] = useState<any>(null);
  const [finalPdfFile, setFinalPdfFile] = useState<File | null>(null);
  const [finalPdfUploading, setFinalPdfUploading] = useState(false);
  const [finalPdfUrl, setFinalPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) checkEditorRole();
  }, [user]);

  const checkEditorRole = async () => {
    const { data } = await supabase.rpc("has_role", { _user_id: user!.id, _role: "editor" });
    const { data: adminData } = await supabase.rpc("has_role", { _user_id: user!.id, _role: "admin" });
    setIsAdmin(!!adminData);
    if (data || adminData) {
      setIsEditor(true);
      await loadSubmissions();
      await loadNotifications();
    } else {
      setIsEditor(false);
      setLoading(false);
    }
  };

  const loadSubmissions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("manuscript_submissions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error:", error);
      setLoading(false);
      return;
    }

    setSubmissions(data || []);

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
    setLoading(false);
  };

  const loadNotifications = async () => {
    const { data } = await supabase
      .from("editor_notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    setNotifications(data || []);
  };

  const markAsRead = async (id: string) => {
    await supabase.from("editor_notifications").update({ is_read: true }).eq("id", id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;
    await supabase.from("editor_notifications").update({ is_read: true }).in("id", unreadIds);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const performAction = async (action: string, newStatus?: string, overrideComment?: string) => {
    if (!selectedSub || !user) return;
    setActionLoading(true);
    try {
      const commentToSave = overrideComment !== undefined ? overrideComment : (actionComment || null);
      // Insert review record
      const { error: reviewError } = await supabase.from("submission_reviews").insert({
        submission_id: selectedSub.id,
        reviewer_id: user.id,
        action,
        comment: commentToSave,
      });
      if (reviewError) throw reviewError;

      // Update submission status if needed
      if (newStatus) {
        const updatePayload: any = { status: newStatus };
        if (newStatus === "accepted" || newStatus === "rejected") {
          updatePayload.decision_date = new Date().toISOString();
        }
        const { error: updateError } = await supabase
          .from("manuscript_submissions")
          .update(updatePayload)
          .eq("id", selectedSub.id);
        if (updateError) throw updateError;
      }

      toast({ title: "Done", description: `Action "${ACTION_LABELS[action]}" recorded.` });
      setActionComment("");
      await loadSubmissions();
      // Refresh selected sub
      const updated = (await supabase.from("manuscript_submissions").select("*").eq("id", selectedSub.id).single()).data;
      if (updated) setSelectedSub(updated as Submission);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setActionLoading(false);
  };

  const publishArticle = async (finalPdfUrl?: string) => {
    if (!publishData) return;
    setPublishLoading(true);
    try {
      const passcode = prompt("Enter editor passcode to publish:");
      if (!passcode) { setPublishLoading(false); return; }
      
      const pdfUrl = finalPdfUrl || publishData.pdfUrl;
      
      const response = await fetch(
        `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/publish-article`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            passcode,
            action: "publish",
            article: {
              doi: publishData.doi,
              title: publishData.title,
              authors: publishData.authors,
              abstract: publishData.abstract,
              type: publishData.type,
              volume: publishData.volume,
              issue: publishData.issue,
              publicationDate: publishData.publicationDate,
              orcidIds: publishData.orcid_ids || [],
              pdfUrl,
            },
          }),
        }
      );
      const result = await response.json();
      if (!response.ok || result.error) throw new Error(result.error || "Publish failed");
      
      toast({ title: "Published!", description: `Article published with DOI: ${publishData.doi}` });
      await loadSubmissions();
      const updated = (await supabase.from("manuscript_submissions").select("*").eq("id", selectedSub!.id).single()).data;
      if (updated) setSelectedSub(updated as Submission);
    } catch (err: any) {
      toast({ title: "Publish failed", description: err.message, variant: "destructive" });
    }
    setPublishLoading(false);
  };

  const downloadFile = async (path: string) => {
    try {
      const { data, error } = await supabase.storage.from("manuscripts").download(path);
      if (error) throw error;
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = path.split("/").pop() || "manuscript.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      toast({ title: "Download failed", description: err.message, variant: "destructive" });
    }
  };

  const getFileUrl = (path: string) => {
    const { data } = supabase.storage.from("manuscripts").getPublicUrl(path);
    return data.publicUrl;
  };

  const filtered = filterStatus === "all" ? submissions : submissions.filter(s => s.status === filterStatus);
  const statusColor = (status: string) => STATUS_OPTIONS.find(s => s.value === status)?.color || "bg-muted text-muted-foreground";

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isEditor) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="py-12">
            <XCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-4">You don't have editor privileges.</p>
            <Button variant="outline" onClick={() => navigate("/submissions")}>Go to Author Portal</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-academic text-3xl font-semibold">Editor Dashboard</h1>
            <p className="text-muted-foreground text-sm mt-1">{submissions.length} total submissions</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative"
              >
                {notifications.filter(n => !n.is_read).length > 0 ? (
                  <BellDot className="h-4 w-4 text-destructive" />
                ) : (
                  <Bell className="h-4 w-4" />
                )}
                {notifications.filter(n => !n.is_read).length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full h-4 w-4 flex items-center justify-center">
                    {notifications.filter(n => !n.is_read).length}
                  </span>
                )}
              </Button>
              {showNotifications && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                  <div className="flex items-center justify-between p-3 border-b border-border">
                    <span className="font-medium text-sm">Notifications</span>
                    {notifications.filter(n => !n.is_read).length > 0 && (
                      <Button variant="ghost" size="sm" className="text-xs h-6" onClick={markAllAsRead}>
                        Mark all read
                      </Button>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <p className="p-4 text-sm text-muted-foreground text-center">No notifications</p>
                  ) : (
                    notifications.map(n => (
                      <button
                        key={n.id}
                        onClick={() => {
                          if (!n.is_read) markAsRead(n.id);
                          const sub = submissions.find(s => s.id === n.submission_id);
                          if (sub) { setSelectedSub(sub); setActionComment(""); setAiReviewResult(null); }
                          setShowNotifications(false);
                        }}
                        className={`w-full text-left p-3 border-b border-border last:border-b-0 hover:bg-accent/50 transition-colors ${!n.is_read ? 'bg-accent/20' : ''}`}
                      >
                        <p className="text-sm font-medium line-clamp-2">{n.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDateTime(n.created_at)}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" /> Sign Out
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-6">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <div className="flex gap-2 flex-wrap">
            <Button variant={filterStatus === "all" ? "default" : "outline"} size="sm" onClick={() => setFilterStatus("all")}>
              All ({submissions.length})
            </Button>
            {STATUS_OPTIONS.map(s => {
              const count = submissions.filter(sub => sub.status === s.value).length;
              return (
                <Button key={s.value} variant={filterStatus === s.value ? "default" : "outline"} size="sm" onClick={() => setFilterStatus(s.value)}>
                  {s.label} ({count})
                </Button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          {/* Submissions list */}
          <div className="lg:col-span-2 space-y-3">
            {filtered.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">No submissions found</CardContent></Card>
            ) : (
              filtered.map(sub => (
                <button
                  key={sub.id}
                  onClick={() => { setSelectedSub(sub); setActionComment(""); setAiReviewResult(null); }}
                  className={`w-full text-left p-4 rounded-lg border transition-colors hover:bg-accent/50 ${selectedSub?.id === sub.id ? "border-primary bg-accent/30" : "border-border bg-card"}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="font-medium text-sm line-clamp-2">{sub.title}</span>
                    <Badge className={`${statusColor(sub.status)} shrink-0 text-xs`}>
                      {STATUS_OPTIONS.find(s => s.value === sub.status)?.label || sub.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{sub.corresponding_author_name} · {formatDate(sub.created_at)}</span>
                    {sub.pipeline_status === 'running' && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
                    {sub.pipeline_status === 'passed' && <Zap className="h-3 w-3 text-green-600" />}
                    {sub.pipeline_status === 'failed' && <Zap className="h-3 w-3 text-destructive" />}
                    {sub.pipeline_status === 'editor_review' && <Zap className="h-3 w-3 text-yellow-600" />}
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Detail panel */}
          <div className="lg:col-span-3">
            {selectedSub ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{selectedSub.title}</CardTitle>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Badge className={statusColor(selectedSub.status)}>
                      {STATUS_OPTIONS.find(s => s.value === selectedSub.status)?.label}
                    </Badge>
                    <span>·</span>
                    <span>{selectedSub.manuscript_type}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Metadata */}
                  <div className="grid gap-3 sm:grid-cols-2 text-sm">
                    <div>
                      <Label className="text-xs text-muted-foreground">Corresponding Author</Label>
                      <p>{selectedSub.corresponding_author_name}</p>
                      <p className="text-muted-foreground">{selectedSub.corresponding_author_email}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Affiliation</Label>
                      <p>{selectedSub.corresponding_author_affiliation}</p>
                      {selectedSub.corresponding_author_orcid && (
                        <p className="text-muted-foreground">ORCID: {selectedSub.corresponding_author_orcid}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">All Authors</Label>
                    <p className="text-sm mt-1">{selectedSub.all_authors}</p>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">Abstract</Label>
                    <p className="text-sm mt-1">{selectedSub.abstract}</p>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">Keywords</Label>
                    <p className="text-sm mt-1">{selectedSub.keywords}</p>
                  </div>

                  {selectedSub.cover_letter && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Cover Letter</Label>
                      <p className="text-sm mt-1 whitespace-pre-wrap">{selectedSub.cover_letter}</p>
                    </div>
                  )}

                  {/* Files */}
                  {selectedSub.file_paths && selectedSub.file_paths.length > 0 && (
                    <div>
                      <Label className="text-xs text-muted-foreground mb-2 block">Attached Files</Label>
                      <div className="space-y-1">
                        {selectedSub.file_paths.map((fp, i) => (
                          <a key={i} href={getFileUrl(fp)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                            <ExternalLink className="h-3 w-3" /> {fp.split("/").pop()}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Download Manuscript Files */}
                  {selectedSub.file_paths && selectedSub.file_paths.length > 0 && (
                    <div className="flex gap-2">
                      {selectedSub.file_paths.map((fp, i) => (
                        <Button key={i} size="sm" variant="outline" onClick={() => downloadFile(fp)}>
                          <Download className="h-3 w-3 mr-1" /> Download {fp.split("/").pop()}
                        </Button>
                      ))}
                    </div>
                  )}

                  {/* Run Pipeline for pending submissions */}
                  {selectedSub.pipeline_status === 'pending' && (
                    <div className="p-3 rounded-md border border-primary/30 bg-primary/5">
                      <p className="text-sm font-medium mb-2">🔬 AI Review Pipeline has not been run yet</p>
                      <Button
                        size="sm"
                        onClick={async () => {
                          setActionLoading(true);
                          try {
                            await supabase.functions.invoke("auto-review-pipeline", {
                              body: { submission_id: selectedSub.id },
                            });
                            toast({ title: "Pipeline started", description: "The AI review pipeline is now processing this manuscript." });
                            setTimeout(async () => {
                              await loadSubmissions();
                              const updated = (await supabase.from("manuscript_submissions").select("*").eq("id", selectedSub.id).single()).data;
                              if (updated) setSelectedSub(updated as Submission);
                            }, 3000);
                          } catch (err: any) {
                            toast({ title: "Error", description: err.message, variant: "destructive" });
                          }
                          setActionLoading(false);
                        }}
                        disabled={actionLoading}
                      >
                        {actionLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Play className="h-3 w-3 mr-1" />}
                        Run AI Review Pipeline
                      </Button>
                    </div>
                  )}

                  <Separator />

                  {/* Submission Timeline */}
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">Submission Timeline</Label>
                    <div className="relative pl-4 border-l-2 border-border space-y-3 max-h-60 overflow-y-auto">
                      {/* Received entry */}
                      <div className="relative">
                        <div className="absolute -left-[calc(0.5rem+1px)] top-1 h-3 w-3 rounded-full bg-primary border-2 border-background" />
                        <div className="ml-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">Received</Badge>
                            <span className="text-xs text-muted-foreground">{formatDate(selectedSub.created_at)}</span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-0.5">Manuscript submitted</p>
                        </div>
                      </div>
                      {/* Review entries in chronological order */}
                      {[...(reviews[selectedSub.id] || [])].reverse().map(r => {
                        const isAiReview = isAiReviewComment(r.comment);
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
                                <Badge variant="outline" className="text-xs">{ACTION_LABELS[r.action] || r.action}</Badge>
                                <span className="text-xs text-muted-foreground">{formatDateTime(r.created_at)}</span>
                              </div>
                              {r.comment && (
                                isAiReview ? (
                                  <AiReviewNote comment={r.comment} />
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

                  {/* Pipeline Results */}
                  {selectedSub.pipeline_status && selectedSub.pipeline_status !== 'pending' && (
                    <>
                      <Separator />
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Zap className="h-4 w-4 text-primary" />
                            <span className="font-medium text-sm">AI Review Pipeline</span>
                            <Badge className={
                              selectedSub.pipeline_status === 'passed' ? 'bg-green-100 text-green-800' :
                              selectedSub.pipeline_status === 'failed' ? 'bg-red-100 text-red-800' :
                              selectedSub.pipeline_status === 'running' ? 'bg-blue-100 text-blue-800' :
                              selectedSub.pipeline_status === 'editor_review' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-muted text-muted-foreground'
                            }>
                              {selectedSub.pipeline_status === 'running' && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                              {selectedSub.pipeline_status.toUpperCase()}
                            </Badge>
                          </div>
                          {selectedSub.pipeline_results?.prepared_metadata?.pipeline_scores && (
                            <span className="text-sm font-semibold">
                              Avg: {selectedSub.pipeline_results.prepared_metadata.pipeline_scores.average}/100
                            </span>
                          )}
                        </div>

                        {/* Score overview bar */}
                        {selectedSub.pipeline_results?.steps && (
                          <div className="grid grid-cols-4 gap-1 mb-4">
                            {selectedSub.pipeline_results.steps.map((step: any, i: number) => (
                              <div key={i} className="text-center">
                                <div className="text-[10px] text-muted-foreground capitalize truncate">{step.step.replace(/_/g, ' ')}</div>
                                <div className="w-full h-2 bg-muted rounded-full mt-1 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all ${
                                      step.score >= 80 ? 'bg-green-500' :
                                      step.score >= 60 ? 'bg-yellow-500' :
                                      'bg-red-500'
                                    }`}
                                    style={{ width: `${step.score}%` }}
                                  />
                                </div>
                                <div className={`text-xs font-semibold mt-0.5 ${step.passed ? 'text-green-700' : 'text-destructive'}`}>
                                  {step.score}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Detailed step results */}
                        {selectedSub.pipeline_results?.steps && (
                          <div className="space-y-2 max-h-80 overflow-y-auto">
                            {selectedSub.pipeline_results.steps.map((step: any, i: number) => (
                              <details key={i} className="group rounded-md border border-border overflow-hidden" open={!step.passed}>
                                <summary className={`flex items-center gap-2 p-2.5 cursor-pointer hover:bg-accent/50 transition-colors text-sm ${!step.passed ? 'bg-destructive/5' : 'bg-muted/30'}`}>
                                  <span>{step.passed ? '✅' : '❌'}</span>
                                  <span className="font-medium capitalize flex-1">{step.step.replace(/_/g, ' ')}</span>
                                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                                    step.score >= 80 ? 'bg-green-100 text-green-800' :
                                    step.score >= 60 ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-red-100 text-red-800'
                                  }`}>{step.score}/100</span>
                                  <ChevronDown className="h-3 w-3 text-muted-foreground group-open:rotate-180 transition-transform" />
                                </summary>
                                <div className="p-3 border-t border-border bg-background">
                                  <p className="text-sm text-muted-foreground">{step.summary}</p>
                                  {step.issues.length > 0 && (
                                    <div className="mt-2 p-2 bg-destructive/5 rounded-md border border-destructive/10">
                                      <p className="text-xs font-medium text-destructive mb-1">Issues Found:</p>
                                      <ul className="text-xs text-destructive space-y-0.5">
                                        {step.issues.map((issue: string, j: number) => (
                                          <li key={j} className="flex gap-1.5">
                                            <span className="shrink-0">•</span>
                                            <span>{issue}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              </details>
                            ))}
                          </div>
                        )}

                        {/* Publish & Re-run actions */}
                        <div className="mt-4 space-y-3">
                          {/* Re-run pipeline button (always available) */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              setActionLoading(true);
                              try {
                                await supabase.from("manuscript_submissions")
                                  .update({ status: "pending", pipeline_status: "pending", pipeline_results: null, decision_date: null })
                                  .eq("id", selectedSub.id);
                                supabase.functions.invoke("auto-review-pipeline", {
                                  body: { submission_id: selectedSub.id },
                                }).catch(console.error);
                                toast({ title: "Re-running pipeline", description: "The manuscript will be re-evaluated." });
                                await loadSubmissions();
                                const updated = (await supabase.from("manuscript_submissions").select("*").eq("id", selectedSub.id).single()).data;
                                if (updated) setSelectedSub(updated as Submission);
                              } catch (err: any) {
                                toast({ title: "Error", description: err.message, variant: "destructive" });
                              }
                              setActionLoading(false);
                            }}
                            disabled={actionLoading}
                          >
                            {actionLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RotateCcw className="h-3 w-3 mr-1" />}
                            Re-run Pipeline
                          </Button>

                          {/* Publish section */}
                          {selectedSub.pipeline_results?.prepared_metadata && (
                            <div className={`p-3 rounded-md border ${
                              selectedSub.pipeline_status === 'failed' ? 'border-destructive/30 bg-destructive/5' :
                              selectedSub.pipeline_status === 'editor_review' ? 'border-yellow-300 bg-yellow-50' :
                              'border-primary/30 bg-primary/5'
                            }`}>
                              <p className="text-sm font-medium mb-2">
                                {selectedSub.pipeline_status === 'passed' ? '📋 Article ready for publication' :
                                 selectedSub.pipeline_status === 'editor_review' ? '⚠️ Score 60-74 — Editor review required' :
                                 '⚠️ Publish despite pipeline issues'}
                              </p>
                              {selectedSub.pipeline_status === 'failed' && (
                                <p className="text-xs text-destructive mb-2">Publishing will override the AI recommendation.</p>
                              )}
                              {selectedSub.pipeline_status === 'editor_review' && (
                                <p className="text-xs text-yellow-700 mb-2">This manuscript scored between 60-74. Please review and decide whether to publish.</p>
                              )}
                              <Button
                                onClick={() => {
                                  const meta = selectedSub.pipeline_results.prepared_metadata;
                                  const pdfUrl = selectedSub.file_paths?.[0]
                                    ? supabase.storage.from("manuscripts").getPublicUrl(selectedSub.file_paths[0]).data.publicUrl
                                    : null;
                                  
                                  // Count existing articles in this volume/issue for page continuation
                                  const volArticles = submissions.filter(s => 
                                    s.pipeline_results?.prepared_metadata?.volume === meta.volume &&
                                    s.pipeline_results?.prepared_metadata?.issue === meta.issue &&
                                    s.status === 'accepted'
                                  );

                                  setPublishData({
                                    ...meta,
                                    pdfUrl,
                                    submittedDate: selectedSub.created_at,
                                    acceptedDate: selectedSub.decision_date || new Date().toISOString(),
                                    approvedDate: new Date().toISOString(),
                                    publicationDate: meta.publication_date || new Date().toISOString().split("T")[0],
                                    articleNumber: volArticles.length + 1,
                                  });
                                  setShowPublishModal(true);
                                }}
                                className="w-full"
                                variant={selectedSub.pipeline_status === 'failed' ? 'destructive' : 'default'}
                              >
                                <Send className="h-4 w-4 mr-2" /> Prepare & Publish Article
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  <Separator />

                  {/* Actions */}
                  {(() => {
                    const isFinalized = selectedSub.status === "accepted" || selectedSub.status === "rejected";
                    const subReviews = reviews[selectedSub.id] || [];
                    const hasDecisionByOther = subReviews.some(
                      r => (r.action === "accept" || r.action === "reject") && r.reviewer_id !== user?.id
                    );

                    if (isFinalized) {
                      return (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 p-3 rounded-md bg-muted">
                            <Lock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              This submission has been {selectedSub.status}. No further actions available.
                            </span>
                          </div>
                        {!showUnlockDialog ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs text-muted-foreground/50 hover:text-muted-foreground"
                              onClick={() => setShowUnlockDialog(true)}
                            >
                              {isAdmin ? "Unlock submission" : "Request unlock"}
                            </Button>
                          ) : (
                            <div className="space-y-2 p-3 border border-destructive/30 rounded-md bg-destructive/5">
                              <Label className="text-xs font-medium">
                                {isAdmin ? "Reason for unlocking (required)" : "Reason for unlock request (required)"}
                              </Label>
                              <Textarea
                                value={unlockReason}
                                onChange={e => setUnlockReason(e.target.value)}
                                placeholder={isAdmin ? "Explain why this submission needs to be reopened..." : "Explain why this submission should be unlocked. An admin will review your request..."}
                                rows={2}
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  disabled={!unlockReason.trim() || unlockLoading}
                                  onClick={async () => {
                                    setUnlockLoading(true);
                                    try {
                                      if (isAdmin) {
                                        // Admin can directly unlock
                                        await supabase.from("submission_reviews").insert({
                                          submission_id: selectedSub.id,
                                          reviewer_id: user!.id,
                                          action: "unlock",
                                          comment: `Submission unlocked by admin. Reason: ${unlockReason.trim()}`,
                                        });
                                        await supabase.from("manuscript_submissions")
                                          .update({ status: "under_review", decision_date: null })
                                          .eq("id", selectedSub.id);
                                        toast({ title: "Unlocked", description: "Submission reopened for review." });
                                      } else {
                                        // Editor submits unlock request for admin approval
                                        await supabase.from("unlock_requests").insert({
                                          submission_id: selectedSub.id,
                                          requested_by: user!.id,
                                          reason: unlockReason.trim(),
                                        });
                                        toast({ title: "Request Sent", description: "Your unlock request has been sent to an admin for approval." });
                                      }
                                      setShowUnlockDialog(false);
                                      setUnlockReason("");
                                      await loadSubmissions();
                                      const { data: updated } = await supabase.from("manuscript_submissions").select("*").eq("id", selectedSub.id).single();
                                      if (updated) setSelectedSub(updated as Submission);
                                    } catch (err: any) {
                                      toast({ title: "Error", description: err.message, variant: "destructive" });
                                    }
                                    setUnlockLoading(false);
                                  }}
                                >
                                  {unlockLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                                  {isAdmin ? "Confirm Unlock" : "Submit Request"}
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => { setShowUnlockDialog(false); setUnlockReason(""); }}>
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    }

                    if (hasDecisionByOther) {
                      return (
                        <div className="flex items-center gap-2 p-3 rounded-md bg-muted">
                          <Lock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            Another editor has already made a decision on this submission.
                          </span>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-3">
                        <Label className="text-xs text-muted-foreground">Editor Actions</Label>

                        {/* AI Review Result */}
                        {aiReviewResult && (
                          <div className="max-h-60 overflow-y-auto">
                            <AiReviewNote comment={aiReviewResult} />
                            <div className="mt-2">
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={actionLoading}
                                onClick={async () => {
                                  await performAction("note", undefined, aiReviewResult || undefined);
                                  toast({ title: "Saved", description: "AI review saved as a note for the author." });
                                }}
                              >
                                <MessageSquare className="h-3 w-3 mr-1" /> Save as Note
                              </Button>
                            </div>
                          </div>
                        )}

                        <Textarea
                          value={actionComment}
                          onChange={e => setActionComment(e.target.value)}
                          placeholder="Add comment or note..."
                          rows={3}
                        />
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" disabled={actionLoading} onClick={() => performAction("note")}>
                            <MessageSquare className="h-3 w-3 mr-1" /> Add Note
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={aiReviewLoading || actionLoading}
                            onClick={async () => {
                              setAiReviewLoading(true);
                              setAiReviewResult(null);
                              try {
                                const { data, error } = await supabaseClient.functions.invoke("ai-review", {
                                  body: {
                                    title: selectedSub.title,
                                    abstract: selectedSub.abstract,
                                    keywords: selectedSub.keywords,
                                    manuscriptType: selectedSub.manuscript_type,
                                    authors: selectedSub.all_authors,
                                    coverLetter: selectedSub.cover_letter,
                                  },
                                });
                                if (error) throw error;
                                setAiReviewResult(data.review);
                              } catch (err: any) {
                                toast({ title: "AI Review Failed", description: err.message, variant: "destructive" });
                              }
                              setAiReviewLoading(false);
                            }}
                            className="text-primary border-primary/30 hover:bg-primary/10"
                          >
                            {aiReviewLoading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Bot className="h-3 w-3 mr-1" />}
                            AI Chief Editor
                          </Button>
                          <Button size="sm" variant="outline" disabled={actionLoading} onClick={() => performAction("request_revision", "revisions_requested")} className="text-orange-600 border-orange-300 hover:bg-orange-50">
                            <RotateCcw className="h-3 w-3 mr-1" /> Request Revision
                          </Button>
                          <Button size="sm" disabled={actionLoading} onClick={() => performAction("accept", "accepted")} className="bg-green-600 hover:bg-green-700 text-white">
                            <CheckCircle className="h-3 w-3 mr-1" /> Accept
                          </Button>
                          <Button size="sm" variant="destructive" disabled={actionLoading || !actionComment.trim()} onClick={() => performAction("reject", "rejected")} title={!actionComment.trim() ? "Please write a reason for rejection" : ""}>
                            <XCircle className="h-3 w-3 mr-1" /> Reject
                          </Button>
                          {!actionComment.trim() && (
                            <p className="w-full text-xs text-destructive mt-1">A reason is required to reject a manuscript.</p>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-16 text-center text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select a submission to review</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Publish Modal */}
        <Dialog open={showPublishModal} onOpenChange={setShowPublishModal}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>📋 Publish Article — Generate Banner & Data</DialogTitle>
            </DialogHeader>
            {publishData && (
              <div className="space-y-5">
                {/* Article Info */}
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm">Article Information</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm bg-muted p-3 rounded-md">
                    <div><span className="text-muted-foreground">Title:</span> {publishData.title}</div>
                    <div><span className="text-muted-foreground">Authors:</span> {publishData.authors}</div>
                    <div><span className="text-muted-foreground">DOI:</span> {publishData.doi}</div>
                    <div><span className="text-muted-foreground">Type:</span> {publishData.type}</div>
                    <div><span className="text-muted-foreground">Volume:</span> {publishData.volume}</div>
                    <div><span className="text-muted-foreground">Issue:</span> {publishData.issue}</div>
                  </div>
                </div>

                {/* Dates */}
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm">Key Dates</h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-md border border-border bg-card text-center">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Submitted</p>
                      <p className="text-sm font-medium mt-1">{formatDate(publishData.submittedDate)}</p>
                    </div>
                    <div className="p-3 rounded-md border border-border bg-card text-center">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Accepted</p>
                      <p className="text-sm font-medium mt-1">{formatDate(publishData.acceptedDate)}</p>
                    </div>
                    <div className="p-3 rounded-md border border-border bg-card text-center">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Published</p>
                      <p className="text-sm font-medium mt-1">{publishData.publicationDate}</p>
                    </div>
                  </div>
                </div>

                {/* Banner Code for PDF Publishing App */}
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm">Banner Data (for PDF Publishing Editor)</h3>
                  <div className="relative">
                    <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto whitespace-pre-wrap border border-border font-mono">
{`Marine Notes Journal
Vol. ${publishData.volume}, Issue ${publishData.issue}, ${new Date(publishData.publicationDate).getFullYear()}
DOI: ${publishData.doi}
${publishData.type}

Submitted: ${formatDate(publishData.submittedDate)}
Accepted: ${formatDate(publishData.acceptedDate)}
Published: ${publishData.publicationDate}`}
                    </pre>
                    <Button
                      size="sm"
                      variant="outline"
                      className="absolute top-2 right-2"
                      onClick={() => {
                        navigator.clipboard.writeText(`Marine Notes Journal\nVol. ${publishData.volume}, Issue ${publishData.issue}, ${new Date(publishData.publicationDate).getFullYear()}\nDOI: ${publishData.doi}\n${publishData.type}\n\nSubmitted: ${formatDate(publishData.submittedDate)}\nAccepted: ${formatDate(publishData.acceptedDate)}\nPublished: ${publishData.publicationDate}`);
                        toast({ title: "Copied!", description: "Banner data copied to clipboard." });
                      }}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* Footer Code */}
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm">Footer Code</h3>
                  <div className="relative">
                    <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto whitespace-pre-wrap border border-border font-mono">
{`© ${new Date(publishData.publicationDate).getFullYear()} Marine Notes Journal. All rights reserved.
${publishData.authors}. "${publishData.title}." Marine Notes Journal, Vol. ${publishData.volume}, Issue ${publishData.issue}, ${publishData.publicationDate}. DOI: ${publishData.doi}
This is an open access article under the CC BY 4.0 license.
Pages: ${publishData.articleNumber}`}
                    </pre>
                    <Button
                      size="sm"
                      variant="outline"
                      className="absolute top-2 right-2"
                      onClick={() => {
                        navigator.clipboard.writeText(`© ${new Date(publishData.publicationDate).getFullYear()} Marine Notes Journal. All rights reserved.\n${publishData.authors}. "${publishData.title}." Marine Notes Journal, Vol. ${publishData.volume}, Issue ${publishData.issue}, ${publishData.publicationDate}. DOI: ${publishData.doi}\nThis is an open access article under the CC BY 4.0 license.\nPages: ${publishData.articleNumber}`);
                        toast({ title: "Copied!", description: "Footer code copied to clipboard." });
                      }}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* Download Original Manuscript */}
                {selectedSub?.file_paths && selectedSub.file_paths.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm">Original Manuscript</h3>
                    {selectedSub.file_paths.map((fp, i) => (
                      <Button key={i} size="sm" variant="outline" onClick={() => downloadFile(fp)}>
                        <Download className="h-4 w-4 mr-2" /> Download {fp.split("/").pop()}
                      </Button>
                    ))}
                  </div>
                )}

                {/* Link to external PDF publishing app */}
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm">Open PDF Publishing Editor</h3>
                  <a
                    href="https://marine-journal-pdf-publishing.lovable.app/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" className="w-full">
                      <ExternalLink className="h-4 w-4 mr-2" /> Open PDF Publishing App
                    </Button>
                  </a>
                  <p className="text-xs text-muted-foreground">
                    Copy the banner data and footer code above, then use the PDF Publishing App to generate the final publication-ready PDF.
                  </p>
                </div>

                <Separator />

                {/* Upload Final Publication PDF */}
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm">Upload Final Publication PDF</h3>
                  <p className="text-xs text-muted-foreground">Upload the finalized PDF with banner, footer, and formatting from the publishing app.</p>
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => setFinalPdfFile(e.target.files?.[0] || null)}
                      className="flex-1"
                    />
                    <Button
                      size="sm"
                      disabled={!finalPdfFile || finalPdfUploading}
                      onClick={async () => {
                        if (!finalPdfFile || !publishData) return;
                        setFinalPdfUploading(true);
                        try {
                          const year = new Date(publishData.publicationDate).getFullYear();
                          const safeName = publishData.title.replace(/[^a-zA-Z0-9\s-]/g, "").replace(/\s+/g, "-").substring(0, 80);
                          const fileName = `${year}/vol${publishData.volume}-iss${publishData.issue}-${safeName}.pdf`;
                          
                          const { error } = await supabase.storage
                            .from("manuscripts")
                            .upload(fileName, finalPdfFile, { contentType: "application/pdf", upsert: true });
                          if (error) throw error;
                          
                          const { data: urlData } = supabase.storage.from("manuscripts").getPublicUrl(fileName);
                          setFinalPdfUrl(urlData.publicUrl);
                          toast({ title: "Uploaded!", description: "Final publication PDF uploaded successfully." });
                        } catch (err: any) {
                          toast({ title: "Upload failed", description: err.message, variant: "destructive" });
                        }
                        setFinalPdfUploading(false);
                      }}
                    >
                      {finalPdfUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3 mr-1" />}
                      Upload
                    </Button>
                  </div>
                  {finalPdfUrl && (
                    <p className="text-xs text-green-700">✅ Final PDF uploaded and ready for publishing.</p>
                  )}
                </div>

                <Separator />

                {/* Publish to database */}
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm">Publish to Journal Database</h3>
                  <p className="text-xs text-muted-foreground">
                    {finalPdfUrl 
                      ? "Final PDF is ready. Click below to register the article with the uploaded PDF."
                      : "You can publish now with the original manuscript, or upload the final PDF first."
                    }
                  </p>
                  <Button
                    onClick={async () => {
                      await publishArticle(finalPdfUrl || undefined);
                      setShowPublishModal(false);
                      setFinalPdfFile(null);
                      setFinalPdfUrl(null);
                    }}
                    disabled={publishLoading}
                    className="w-full"
                  >
                    {publishLoading ? (
                      <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Publishing...</>
                    ) : (
                      <><Send className="h-4 w-4 mr-2" /> Confirm & Publish to Database</>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default EditorSubmissions;
