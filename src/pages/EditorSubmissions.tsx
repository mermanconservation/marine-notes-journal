import { useState, useEffect } from "react";
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
  LogOut, MessageSquare, UserCheck, Filter, ExternalLink, Bot, Lock,
} from "lucide-react";
import { supabase as supabaseClient } from "@/integrations/supabase/client";

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

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) checkEditorRole();
  }, [user]);

  const checkEditorRole = async () => {
    const { data } = await supabase.rpc("has_role", { _user_id: user!.id, _role: "editor" });
    const { data: adminData } = await supabase.rpc("has_role", { _user_id: user!.id, _role: "admin" });
    if (data || adminData) {
      setIsEditor(true);
      await loadSubmissions();
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
          <Button variant="outline" size="sm" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" /> Sign Out
          </Button>
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
                  <p className="text-xs text-muted-foreground">
                    {sub.corresponding_author_name} · {new Date(sub.created_at).toLocaleDateString()}
                  </p>
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
                            <span className="text-xs text-muted-foreground">{new Date(selectedSub.created_at).toLocaleDateString()}</span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-0.5">Manuscript submitted</p>
                        </div>
                      </div>
                      {/* Review entries in chronological order */}
                      {[...(reviews[selectedSub.id] || [])].reverse().map(r => {
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
                                <Badge variant="outline" className="text-xs">{ACTION_LABELS[r.action] || r.action}</Badge>
                                <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
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
                              Unlock submission
                            </Button>
                          ) : (
                            <div className="space-y-2 p-3 border border-destructive/30 rounded-md bg-destructive/5">
                              <Label className="text-xs font-medium">Reason for unlocking (required)</Label>
                              <Textarea
                                value={unlockReason}
                                onChange={e => setUnlockReason(e.target.value)}
                                placeholder="Explain why this submission needs to be reopened..."
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
                                      await supabase.from("submission_reviews").insert({
                                        submission_id: selectedSub.id,
                                        reviewer_id: user!.id,
                                        action: "unlock",
                                        comment: `Submission unlocked. Reason: ${unlockReason.trim()}`,
                                      });
                                      await supabase.from("manuscript_submissions")
                                        .update({ status: "under_review", decision_date: null })
                                        .eq("id", selectedSub.id);
                                      toast({ title: "Unlocked", description: "Submission reopened for review." });
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
                                  Confirm Unlock
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
                          <div className="p-3 rounded-md bg-accent/50 border border-border text-sm whitespace-pre-wrap max-h-60 overflow-y-auto">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2 font-medium">
                                <Bot className="h-4 w-4 text-primary" /> AI Chief Editor Review
                              </div>
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
                            {aiReviewResult}
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
                          <Button size="sm" variant="destructive" disabled={actionLoading} onClick={() => performAction("reject", "rejected")}>
                            <XCircle className="h-3 w-3 mr-1" /> Reject
                          </Button>
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
      </div>
    </div>
  );
};

export default EditorSubmissions;
