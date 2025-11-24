import { useState } from "react";
import Layout from "@/components/Layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SubmissionData {
  id: string;
  title: string;
  manuscript_type: string;
  status: string;
  created_at: string;
  corresponding_author_name: string;
}

const TrackSubmission = () => {
  const [submissionId, setSubmissionId] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submission, setSubmission] = useState<SubmissionData | null>(null);
  const { toast } = useToast();

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSubmission(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/track-submission`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ submissionId, email }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch submission");
      }

      setSubmission(data.submission);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch submission status",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return "bg-yellow-500";
      case "under review":
        return "bg-blue-500";
      case "accepted":
        return "bg-green-500";
      case "rejected":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-4">Track Your Submission</h1>
          <p className="text-muted-foreground">
            Enter your submission ID and email address to check the status of your manuscript
          </p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Submission Tracking</CardTitle>
            <CardDescription>
              Your submission ID was sent to your email after submission
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleTrack} className="space-y-4">
              <div>
                <Label htmlFor="submissionId">Submission ID</Label>
                <Input
                  id="submissionId"
                  type="text"
                  placeholder="e.g., 550e8400-e29b-41d4-a716-446655440000"
                  value={submissionId}
                  onChange={(e) => setSubmissionId(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Corresponding Author Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Track Submission
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {submission && (
          <Card>
            <CardHeader>
              <CardTitle>Submission Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Status</Label>
                <div className="mt-1">
                  <Badge className={getStatusColor(submission.status)}>
                    {submission.status}
                  </Badge>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Submission ID</Label>
                <p className="mt-1 font-mono text-sm">{submission.id}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Title</Label>
                <p className="mt-1">{submission.title}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Type</Label>
                <p className="mt-1">{submission.manuscript_type}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Corresponding Author</Label>
                <p className="mt-1">{submission.corresponding_author_name}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Submitted On</Label>
                <p className="mt-1">
                  {new Date(submission.created_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default TrackSubmission;
