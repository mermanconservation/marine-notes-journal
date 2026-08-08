import { useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import issuesSource from "@/data/issues.json";
import articlesSource from "@/data/articles.json";

interface IssueRecord {
  volume: string;
  issue: string;
  year: number;
  status: string;
  title: string;
  issuePdfUrl: string;
  coverUrl: string;
  notes: string;
}

type CheckState = "ok" | "missing" | "misnamed" | "pending";

interface CheckResult {
  doi: string;
  title: string;
  state: CheckState;
  message: string;
  expected: string;
}

const PASSCODE = "Wildlifeuk2026";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 110);

const normaliseIssue = (i: any): IssueRecord => ({
  volume: String(i.volume),
  issue: String(i.issue),
  year: Number(i.year),
  status: i.status || "open",
  title: i.title || `Issue ${i.issue}`,
  issuePdfUrl: i.issuePdfUrl || "",
  coverUrl: i.coverUrl || "",
  notes: i.notes || "",
});

const download = (filename: string, content: string, type = "application/json") => {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export default function ContentManager() {
  const [code, setCode] = useState(
    typeof window !== "undefined" ? sessionStorage.getItem("editorPasscode") || "" : ""
  );
  const [verified, setVerified] = useState(
    typeof window !== "undefined" && sessionStorage.getItem("editorPasscode") === PASSCODE
  );

  const [issues, setIssues] = useState<IssueRecord[]>(
    (issuesSource.issues as any[]).map(normaliseIssue)
  );
  const [articles, setArticles] = useState<any[]>(articlesSource.articles as any[]);
  const [checks, setChecks] = useState<CheckResult[]>([]);
  const [checking, setChecking] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  // Local object URLs so newly chosen covers / PDFs show immediately, before the commit
  const [coverPreviews, setCoverPreviews] = useState<Record<string, string>>({});
  const [pdfPending, setPdfPending] = useState<Record<number, string>>({});


  const issueKeys = useMemo(
    () => issues.map((i) => `${i.volume}-${i.issue}`),
    [issues]
  );

  const yearFor = (volume: string, issue: string) =>
    issues.find((i) => i.volume === volume && i.issue === issue)?.year ||
    new Date().getFullYear();

  const expectedPath = (article: any) => {
    const year = yearFor(String(article.volume), String(article.issue));
    return `/manuscripts/${year}/vol${article.volume}-iss${article.issue}-${slugify(
      article.title
    )}.pdf`;
  };

  const issuesJson = useMemo(
    () =>
      JSON.stringify(
        {
          _comment:
            "Canonical, git-backed record of journal volumes and issues. This file is the source of truth for the public website; the backend database is only an optional supplement for editorial workflows. Covers live in public/covers/ and are referenced by coverUrl.",
          issues,
        },
        null,
        2
      ) + "\n",
    [issues]
  );

  const articlesJson = useMemo(
    () =>
      JSON.stringify(
        {
          articles,
          nextSequence:
            articles.reduce((max, a) => Math.max(max, Number(a.id) || 0), 0) + 1,
        },
        null,
        2
      ) + "\n",
    [articles]
  );

  /* ---------------- repo consistency check ---------------- */

  const runPublishCheck = async () => {
    setChecking(true);
    const results: CheckResult[] = [];

    const doiCount = new Map<string, number>();
    const pathCount = new Map<string, number>();
    articles.forEach((a) => {
      doiCount.set(a.doi, (doiCount.get(a.doi) || 0) + 1);
      if (a.pdfUrl) pathCount.set(a.pdfUrl, (pathCount.get(a.pdfUrl) || 0) + 1);
    });

    for (const article of articles) {
      const expected = expectedPath(article);
      const url: string = article.pdfUrl || "";
      const filename = url.split("/").pop() || "";
      const prefix = `vol${article.volume}-iss${article.issue}-`;
      const year = yearFor(String(article.volume), String(article.issue));
      const errors: string[] = [];
      let state: CheckState = "ok";

      if ((doiCount.get(article.doi) || 0) > 1) {
        state = "misnamed";
        errors.push(`Duplicate DOI ${article.doi} in articles.json.`);
      }
      if (url && (pathCount.get(url) || 0) > 1) {
        state = "misnamed";
        errors.push("Two articles point at the same PDF file.");
      }
      if (!issueKeys.includes(`${article.volume}-${article.issue}`)) {
        state = "misnamed";
        errors.push(
          `Volume ${article.volume}, Issue ${article.issue} is not declared in issues.json.`
        );
      }

      if (!url) {
        state = "missing";
        errors.push("No pdfUrl set on this article.");
      } else {
        if (!url.startsWith("/manuscripts/")) {
          state = "misnamed";
          errors.push("PDF is not stored under public/manuscripts/.");
        } else if (!url.startsWith(`/manuscripts/${year}/`)) {
          state = "misnamed";
          errors.push(`PDF should sit in the year folder public/manuscripts/${year}/.`);
        }
        if (!filename.toLowerCase().endsWith(".pdf")) {
          state = "misnamed";
          errors.push("File must be a .pdf.");
        }
        if (!filename.toLowerCase().startsWith(prefix.toLowerCase())) {
          state = "misnamed";
          errors.push(
            `Filename must start with "${prefix}" to match Volume ${article.volume}, Issue ${article.issue}.`
          );
        }
        if (/\s|%20/.test(url)) {
          state = "misnamed";
          errors.push("Filename contains spaces — use dashes instead.");
        }

        try {
          const res = await fetch(url, { method: "HEAD" });
          const type = res.headers.get("content-type") || "";
          if (!res.ok || type.includes("text/html")) {
            state = "missing";
            errors.push("File not found in public/manuscripts/ — commit the PDF to the repo.");
          }
        } catch {
          state = "missing";
          errors.push("Could not reach the PDF file.");
        }
      }

      results.push({
        doi: article.doi,
        title: article.title,
        state,
        message: errors.length ? errors.join(" ") : "PDF found, correctly named and linked.",
        expected,
      });
    }

    setChecks(results);
    setChecking(false);
    setHasRun(true);
    const bad = results.filter((r) => r.state !== "ok").length;
    toast[bad ? "warning" : "success"](
      bad ? `${bad} manuscript(s) need attention` : "All manuscripts verified"
    );
  };


  /* ---------------- issue editing ---------------- */

  const updateIssue = (index: number, patch: Partial<IssueRecord>) =>
    setIssues((prev) => prev.map((i, idx) => (idx === index ? { ...i, ...patch } : i)));

  const removeIssue = (index: number) =>
    setIssues((prev) => prev.filter((_, idx) => idx !== index));

  const addIssue = () => {
    const lastVolume = issues.reduce((m, i) => Math.max(m, Number(i.volume)), 1);
    const inVolume = issues.filter((i) => Number(i.volume) === lastVolume);
    const nextIssue = inVolume.reduce((m, i) => Math.max(m, Number(i.issue)), 0) + 1;
    setIssues((prev) => [
      ...prev,
      {
        volume: String(lastVolume),
        issue: String(nextIssue),
        year: new Date().getFullYear(),
        status: "open",
        title: `Issue ${nextIssue}`,
        issuePdfUrl: "",
        coverUrl: "",
        notes: "",
      },
    ]);
  };

  const addVolume = () => {
    const nextVolume = issues.reduce((m, i) => Math.max(m, Number(i.volume)), 0) + 1;
    setIssues((prev) => [
      ...prev,
      {
        volume: String(nextVolume),
        issue: "1",
        year: new Date().getFullYear(),
        status: "open",
        title: "Issue 1",
        issuePdfUrl: "",
        coverUrl: "",
        notes: "",
      },
    ]);
  };

  const closeIssue = (index: number) => {
    const target = issues[index];
    if (!target.issuePdfUrl) {
      toast.error("Add the full issue PDF path before closing this issue.");
      return;
    }
    updateIssue(index, { status: "closed" });
  };

  const handleCover = (index: number, file: File | null) => {
    if (!file) return;
    const target = issues[index];
    const ext = file.name.split(".").pop()?.toLowerCase() === "png" ? "png" : "jpg";
    const filename = `vol${target.volume}-iss${target.issue}.${ext}`;
    const objectUrl = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename;
    a.click();
    // keep the object URL alive so the issue card previews the new cover immediately
    setCoverPreviews((prev) => ({ ...prev, [`${target.volume}-${target.issue}`]: objectUrl }));
    updateIssue(index, { coverUrl: `/covers/${filename}` });
    toast.success(`Cover saved as ${filename} — commit it to public/covers/`);
  };

  /* ---------------- article linking ---------------- */

  const updateArticle = (id: number, patch: any) =>
    setArticles((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));

  const relink = (article: any) => {
    updateArticle(article.id, { pdfUrl: expectedPath(article) });
    toast.success("pdfUrl updated to the expected repository path.");
  };

  const handleManuscript = (article: any, file: File | null) => {
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Please choose a PDF file.");
      return;
    }
    if (!issueKeys.includes(`${article.volume}-${article.issue}`)) {
      toast.error(
        `Declare Volume ${article.volume}, Issue ${article.issue} in the issues section first.`
      );
      return;
    }
    const path = expectedPath(article);
    const filename = path.split("/").pop() as string;
    const objectUrl = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(objectUrl);
    updateArticle(article.id, { pdfUrl: path });
    setPdfPending((prev) => ({ ...prev, [article.id]: path }));
    toast.success(`Saved as ${filename} — drop it into public${path.replace(filename, "")}`);
  };


  const copy = async (label: string, text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  if (!verified) {
    return (
      <div className="container mx-auto max-w-md px-4 py-16">
        <Card>
          <CardHeader>
            <CardTitle>Editor passcode required</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              type="password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Passcode"
            />
            <Button
              className="w-full"
              onClick={() => {
                if (code === PASSCODE) {
                  sessionStorage.setItem("editorPasscode", code);
                  setVerified(true);
                } else toast.error("Incorrect passcode");
              }}
            >
              Unlock content manager
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-5xl px-4 py-10 space-y-8">
      <Helmet>
        <title>Content Manager | Marine Notes Journal</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <header className="space-y-1">
        <h1 className="text-3xl font-semibold">Git-backed content manager</h1>
        <p className="text-muted-foreground text-sm">
          Volumes, issues, manuscripts and covers are stored in the repository. Edit here, verify,
          then sync the generated files to git.
        </p>
      </header>

      {/* Publish check */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl">1. Repo consistency check</CardTitle>
          <Button onClick={runPublishCheck} disabled={checking}>
            {checking ? "Checking…" : "Run check"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Verifies every manuscript PDF exists under <code>public/manuscripts/</code>, sits in the
            right year folder, uses the{" "}
            <code>vol&#123;n&#125;-iss&#123;n&#125;-title.pdf</code> convention, is unique, and
            belongs to a volume and issue declared in <code>issues.json</code>.
          </p>
          {hasRun && (
            <div className="rounded border p-3 text-sm">
              {checks.filter((c) => c.state !== "ok").length === 0 ? (
                <span className="font-medium">
                  ✅ All {checks.length} articles pass — repository is consistent.
                </span>
              ) : (
                <span className="font-medium text-destructive">
                  {checks.filter((c) => c.state !== "ok").length} of {checks.length} articles have
                  errors ({checks.filter((c) => c.state === "missing").length} missing file,{" "}
                  {checks.filter((c) => c.state === "misnamed").length} naming/linking).
                </span>
              )}
            </div>
          )}
          {checks.map((c) => (

            <div key={c.doi} className="rounded border p-3 text-sm space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant={c.state === "ok" ? "secondary" : "destructive"}>
                  {c.state === "ok" ? "OK" : c.state}
                </Badge>
                <span className="font-medium">{c.doi}</span>
              </div>
              <p className="text-muted-foreground">{c.title}</p>
              <p>{c.message}</p>
              {c.state !== "ok" && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <code className="text-xs break-all">{c.expected}</code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const article = articles.find((a) => a.doi === c.doi);
                      if (article) relink(article);
                    }}
                  >
                    Link to expected path
                  </Button>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Volumes & issues */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl">2. Volumes &amp; issues</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={addIssue}>
              Add issue
            </Button>
            <Button size="sm" variant="outline" onClick={addVolume}>
              Add volume
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {issues.map((iss, index) => (
            <div key={`${iss.volume}-${iss.issue}-${index}`} className="rounded border p-4 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-medium">
                  Volume {iss.volume}, Issue {iss.issue}
                </span>
                <Badge variant={iss.status === "closed" ? "secondary" : "default"}>
                  {iss.status}
                </Badge>
                {(coverPreviews[`${iss.volume}-${iss.issue}`] || iss.coverUrl) && (
                  <img
                    src={coverPreviews[`${iss.volume}-${iss.issue}`] || iss.coverUrl}
                    alt={`Volume ${iss.volume} Issue ${iss.issue} cover`}
                    loading="lazy"
                    className="h-12 w-auto rounded border"
                  />
                )}
                {coverPreviews[`${iss.volume}-${iss.issue}`] && (
                  <Badge variant="outline">new cover — commit to public/covers/</Badge>
                )}

              </div>
              <div className="grid gap-3 md:grid-cols-4">
                <Input
                  value={iss.volume}
                  onChange={(e) => updateIssue(index, { volume: e.target.value })}
                  placeholder="Volume"
                />
                <Input
                  value={iss.issue}
                  onChange={(e) => updateIssue(index, { issue: e.target.value })}
                  placeholder="Issue"
                />
                <Input
                  type="number"
                  value={iss.year}
                  onChange={(e) => updateIssue(index, { year: Number(e.target.value) })}
                  placeholder="Year"
                />
                <Input
                  value={iss.title}
                  onChange={(e) => updateIssue(index, { title: e.target.value })}
                  placeholder="Title"
                />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  value={iss.issuePdfUrl}
                  onChange={(e) => updateIssue(index, { issuePdfUrl: e.target.value })}
                  placeholder="/manuscripts/2026/vol1-iss1-full-issue.pdf"
                />
                <Input
                  value={iss.coverUrl}
                  onChange={(e) => updateIssue(index, { coverUrl: e.target.value })}
                  placeholder="/covers/vol1-iss1.jpg"
                />
              </div>
              <Textarea
                value={iss.notes}
                onChange={(e) => updateIssue(index, { notes: e.target.value })}
                placeholder="Notes"
                rows={2}
              />
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-sm">
                  <span className="mr-2 text-muted-foreground">Cover image:</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="text-sm"
                    onChange={(e) => handleCover(index, e.target.files?.[0] || null)}
                  />
                </label>
                <Button size="sm" variant="outline" onClick={() => closeIssue(index)}>
                  Close issue
                </Button>
                <Button size="sm" variant="ghost" onClick={() => removeIssue(index)}>
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Article links */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">3. Manuscript ↔ issue links</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {articles.map((a) => (
            <div key={a.id} className="rounded border p-3 space-y-2">
              <p className="text-sm font-medium">
                {a.doi} — {a.title}
              </p>
              <div className="grid gap-2 md:grid-cols-4">
                <Input
                  value={a.volume}
                  onChange={(e) => updateArticle(a.id, { volume: e.target.value })}
                  placeholder="Volume"
                />
                <Input
                  value={a.issue}
                  onChange={(e) => updateArticle(a.id, { issue: e.target.value })}
                  placeholder="Issue"
                />
                <Input
                  value={a.pages || ""}
                  onChange={(e) => updateArticle(a.id, { pages: e.target.value })}
                  placeholder="Pages e.g. 1-12"
                />
                <Button variant="outline" onClick={() => relink(a)}>
                  Use expected path
                </Button>
              </div>
              <Input
                value={a.pdfUrl}
                onChange={(e) => updateArticle(a.id, { pdfUrl: e.target.value })}
                placeholder="/manuscripts/2026/vol1-iss1-title.pdf"
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Git sync */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">4. One-click Git sync</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p className="text-muted-foreground">
            Download both JSON files, drop them into <code>src/data/</code> together with any new
            PDFs in <code>public/manuscripts/&#123;year&#125;/</code> and covers in{" "}
            <code>public/covers/</code>, then commit. The website reads these files directly, so it
            updates as soon as the commit builds.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => {
                download("issues.json", issuesJson);
                download("articles.json", articlesJson);
                toast.success("Both files downloaded — commit them to src/data/");
              }}
            >
              Download issues.json + articles.json
            </Button>
            <Button variant="outline" onClick={() => copy("issues.json", issuesJson)}>
              Copy issues.json
            </Button>
            <Button variant="outline" onClick={() => copy("articles.json", articlesJson)}>
              Copy articles.json
            </Button>
            <Button variant="secondary" onClick={() => window.location.reload()}>
              Refresh website
            </Button>
          </div>
          <details>
            <summary className="cursor-pointer font-medium">Preview issues.json</summary>
            <pre className="mt-2 max-h-72 overflow-auto rounded bg-muted p-3 text-xs">
              {issuesJson}
            </pre>
          </details>
          <details>
            <summary className="cursor-pointer font-medium">Preview articles.json</summary>
            <pre className="mt-2 max-h-72 overflow-auto rounded bg-muted p-3 text-xs">
              {articlesJson}
            </pre>
          </details>
        </CardContent>
      </Card>
    </div>
  );
}
