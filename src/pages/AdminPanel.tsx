import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2, Shield, LogOut, CheckCircle, XCircle, Lock, Unlock, Users, FileText,
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
}

interface UserRole {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
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
    const [{ data: requests }, { data: roles }] = await Promise.all([
      supabase.from("unlock_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("*").order("created_at", { ascending: false }),
    ]);
    setUnlockRequests((requests as UnlockRequest[]) || []);
    setUserRoles((roles as UserRole[]) || []);
    setLoading(false);
  };

  const handleUnlockDecision = async (request: UnlockRequest, approved: boolean) => {
    setActionLoading(request.id);
    try {
      const comment = decisionComments[request.id] || null;
      
      // Update the unlock request
      await supabase.from("unlock_requests").update({
        status: approved ? "approved" : "denied",
        decided_by: user!.id,
        decision_comment: comment,
        decided_at: new Date().toISOString(),
      }).eq("id", request.id);

      if (approved) {
        // Actually unlock the submission
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
              <p className="text-muted-foreground text-sm mt-1">Manage unlock requests and user roles</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" /> Sign Out
          </Button>
        </div>

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
                        <p className="text-sm font-medium">Submission: <span className="font-mono text-xs">{req.submission_id.slice(0, 8)}...</span></p>
                        <p className="text-xs text-muted-foreground">Requested: {new Date(req.created_at).toLocaleString()}</p>
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
                      <p className="text-sm font-medium">Submission: <span className="font-mono text-xs">{req.submission_id.slice(0, 8)}...</span></p>
                      <p className="text-xs text-muted-foreground mt-0.5">Reason: {req.reason}</p>
                      {req.decision_comment && (
                        <p className="text-xs text-muted-foreground mt-0.5">Admin: {req.decision_comment}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {req.decided_at && new Date(req.decided_at).toLocaleString()}
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
                      <p className="text-sm font-mono">{role.user_id.slice(0, 8)}...</p>
                      <p className="text-xs text-muted-foreground">Since {new Date(role.created_at).toLocaleDateString()}</p>
                    </div>
                    <Badge variant={role.role === "admin" ? "default" : "secondary"}>
                      {role.role}
                    </Badge>
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
