import { useEffect, useMemo, useState } from "react";
import { formatDateLong } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Megaphone, Copy, Check, ChevronDown, ChevronUp, Pencil, RotateCcw, Download } from "lucide-react";
import { Article } from "@/types/article";
import { useToast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface PromotionAssistantProps {
  article: Article;
}

const ISSN = "2979-8841";
const ABOUT_JOURNAL =
  "Marine Notes Journal is the first full AI-Edited and Peer-Reviewed Marine Science Journal dedicated to advancing marine science research and knowledge. ISSN " +
  ISSN +
  " (Online).";

/** Splits an author string into individual names (handles commas, "&" and "and"). */
export const splitAuthors = (authors: string): string[] =>
  (authors || "")
    .split(/,| and | & |;/i)
    .map((a) => a.trim())
    .filter(Boolean);

/** Full, human-readable author list: "A", "A and B", "A, B and C". */
export const formatAuthorList = (authors: string): string => {
  const list = splitAuthors(authors);
  if (list.length === 0) return "";
  if (list.length === 1) return list[0];
  return `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}`;
};

/** Short citation-style tag: "A" or "A et al.". */
export const formatAuthorTag = (authors: string): string => {
  const list = splitAuthors(authors);
  if (list.length === 0) return "";
  return list.length === 1 ? list[0] : `${list[0]} et al.`;
};

export const PromotionAssistant = ({ article }: PromotionAssistantProps) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const { toast } = useToast();

  const authorsFull = formatAuthorList(article.authors);
  const authorTag = formatAuthorTag(article.authors);
  const authorCount = splitAuthors(article.authors).length;

  const generated = useMemo(() => {
    const date = formatDateLong(article.publicationDate);
    const pageRef = article.pages ? `, pp. ${article.pages}` : "";

    const press = `FOR IMMEDIATE RELEASE

${date}

New Research Published in Marine Notes Journal: ${article.title}

${authorsFull} published new research in Marine Notes Journal that advances our understanding of marine science.

${article.abstract}

The study, titled "${article.title}," is now available for review. This ${article.type.toLowerCase()} article has been peer-reviewed and published in Volume ${article.volume}, Issue ${article.issue}${pageRef} of Marine Notes Journal (ISSN ${ISSN}).

For more information and to access the full paper, visit: ${article.resolverUrl}

Article ID: ${article.doi}
ISSN: ${ISSN} (Online)

About Marine Notes Journal:
${ABOUT_JOURNAL}

###`;

    const summary = `🌊 What did the researchers discover?

${authorsFull} published new research that helps us better understand our oceans.

${article.abstract}

This research was published in Marine Notes Journal (ISSN ${ISSN}) and has been carefully reviewed by experts in the field.

Why does this matter?
Every piece of marine research helps us protect and understand our oceans better. This ${article.type.toLowerCase()} contributes valuable knowledge to the scientific community.

Want to learn more? Read the full paper: ${article.resolverUrl}`;

    const twitter = `🔬 New research alert! "${article.title}" by ${authorTag} now published in Marine Notes Journal 🌊

Read the full paper: ${article.resolverUrl}

#MarineScience #Research #Ocean #Science`;

    const linkedin = `New research has been published in Marine Notes Journal (ISSN ${ISSN}).

📄 ${article.title}
✍️ ${authorsFull}

${article.abstract.substring(0, 200)}...

This ${article.type.toLowerCase()} appears in Volume ${article.volume}, Issue ${article.issue}${pageRef}.

Read the full paper here: ${article.resolverUrl}

#MarineScience #Research #AcademicPublishing`;

    const facebook = `🌊 News from the world of marine science!

New research titled "${article.title}" has just been published in Marine Notes Journal (ISSN ${ISSN}).

${article.abstract.substring(0, 200)}...

This work by ${authorsFull} advances our understanding of marine ecosystems.

Learn more: ${article.resolverUrl}

#MarineScience #OceanResearch #Science`;

    return { press, summary, twitter, linkedin, facebook };
  }, [article, authorsFull, authorTag]);

  const [draft, setDraft] = useState(generated);

  // Reset the editable draft whenever the source article changes
  useEffect(() => {
    setDraft(generated);
    setConfirmed(false);
  }, [generated]);

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast({ title: "Copied to clipboard", description: "Content has been copied successfully." });
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast({ title: "Failed to copy", description: "Please try again.", variant: "destructive" });
    }
  };

  const downloadAll = () => {
    const body = [
      "PRESS RELEASE", draft.press, "",
      "PLAIN LANGUAGE SUMMARY", draft.summary, "",
      "TWITTER / X", draft.twitter, "",
      "LINKEDIN", draft.linkedin, "",
      "FACEBOOK", draft.facebook,
    ].join("\n\n");
    const url = URL.createObjectURL(new Blob([body], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${article.doi}-promotion.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const block = (id: keyof typeof draft, label?: string) => (
    <div className="relative">
      {label && <h4 className="font-semibold mb-2">{label}</h4>}
      {confirmed ? (
        <pre className="bg-muted p-4 rounded-lg text-sm whitespace-pre-wrap overflow-auto max-h-96">
          {draft[id]}
        </pre>
      ) : (
        <Textarea
          value={draft[id]}
          onChange={(e) => setDraft({ ...draft, [id]: e.target.value })}
          className="text-sm font-mono min-h-[220px]"
        />
      )}
      <Button
        size="sm"
        variant="secondary"
        className={`absolute right-2 ${label ? "top-8" : "top-2"}`}
        disabled={!confirmed}
        onClick={() => handleCopy(draft[id], id)}
      >
        {copiedId === id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  );

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="w-full">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Megaphone className="h-5 w-5" />
                AI Promotion Assistant
              </div>
              {isOpen ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Preview / confirmation bar */}
            <div className="rounded-lg border bg-muted/40 p-3 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm">
                  <span className="font-medium">Step 1 — Review the draft.</span>{" "}
                  <span className="text-muted-foreground">
                    Author{authorCount > 1 ? "s" : ""} used: <strong>{authorsFull || "—"}</strong>
                    {authorCount > 1 && <> ({authorCount} authors)</>}
                  </span>
                </div>
                <Badge variant={confirmed ? "default" : "outline"}>
                  {confirmed ? "Confirmed" : "Draft — not confirmed"}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                {confirmed ? (
                  <>
                    <Button size="sm" variant="outline" onClick={() => setConfirmed(false)}>
                      <Pencil className="h-4 w-4 mr-1" /> Edit again
                    </Button>
                    <Button size="sm" variant="outline" onClick={downloadAll}>
                      <Download className="h-4 w-4 mr-1" /> Download all texts
                    </Button>
                  </>
                ) : (
                  <>
                    <Button size="sm" onClick={() => setConfirmed(true)}>
                      <Check className="h-4 w-4 mr-1" /> Confirm final text
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setDraft(generated)}>
                      <RotateCcw className="h-4 w-4 mr-1" /> Reset to generated
                    </Button>
                  </>
                )}
              </div>
              {!confirmed && (
                <p className="text-xs text-muted-foreground">
                  Edit any text above the copy buttons. Copying is enabled once you confirm the final wording.
                </p>
              )}
            </div>

            <Tabs defaultValue="press" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="press">Press Release</TabsTrigger>
                <TabsTrigger value="summary">Plain Summary</TabsTrigger>
                <TabsTrigger value="social">Social Media</TabsTrigger>
              </TabsList>

              <TabsContent value="press" className="space-y-4">{block("press")}</TabsContent>
              <TabsContent value="summary" className="space-y-4">{block("summary")}</TabsContent>
              <TabsContent value="social" className="space-y-4">
                {block("twitter", "Twitter/X")}
                {block("linkedin", "LinkedIn")}
                {block("facebook", "Facebook")}
              </TabsContent>
            </Tabs>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};
