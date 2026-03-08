import { useState, useEffect } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2, Shield, LogOut, CheckCircle, XCircle, Lock, Unlock, Users, FileText, UserPlus, Trash2, BarChart3,
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
    const [{ data: requests }, { data: roles }, { data: submissions }] = await Promise.all([
      supabase.from("unlock_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("*").order("created_at", { ascending: false }),
      supabase.from("manuscript_submissions").select("id, title, status, user_id, corresponding_author_email"),
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

    // Enrich roles with emails
    const enrichedRoles = ((roles as UserRole[]) || []).map(r => ({
      ...r,
      email: emailMap.get(r.user_id) || undefined,
    }));
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
                        <p className="text-xs text-muted-foreground">{article.doi} · {article.authors}</p>
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
