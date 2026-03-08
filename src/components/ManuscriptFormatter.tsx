import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Download, Wand2, FileText, Check, AlertTriangle } from "lucide-react";

interface ManuscriptFormatterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submissionId: string;
  title: string;
  manuscriptType: string;
  authors: string;
}

const FORMATTING_RULES = [
  { label: "Double-spaced text", key: "doubleSpaced" },
  { label: "12pt Times New Roman", key: "font" },
  { label: "1-inch margins", key: "margins" },
  { label: "Line numbers", key: "lineNumbers" },
  { label: "SI units throughout", key: "siUnits" },
  { label: "Species names italicised", key: "speciesItalics" },
  { label: "300 DPI images noted", key: "imageDpi" },
  { label: "Figures/tables referenced", key: "figuresTables" },
];

const ManuscriptFormatter = ({
  open,
  onOpenChange,
  submissionId,
  title,
  manuscriptType,
  authors,
}: ManuscriptFormatterProps) => {
  const { toast } = useToast();
  const [content, setContent] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [formatting, setFormatting] = useState(false);
  const [extracted, setExtracted] = useState(false);
  const [formatted, setFormatted] = useState(false);
  const [formattingChecks, setFormattingChecks] = useState<Record<string, boolean | null>>({});

  const extractFromPdf = async () => {
    setExtracting(true);
    try {
      const { data, error } = await supabase.functions.invoke("format-manuscript", {
        body: { submission_id: submissionId, action: "extract" },
      });
      if (error) throw error;
      if (data?.content) {
        setContent(data.content);
        setExtracted(true);
        toast({
          title: "Text extracted",
          description: data.source === "pdf" ? "Full manuscript text extracted from PDF." : "Metadata extracted. Paste full text manually if needed.",
        });
      }
    } catch (err: any) {
      toast({ title: "Extraction failed", description: err.message, variant: "destructive" });
    }
    setExtracting(false);
  };

  const applyFormatting = async () => {
    if (!content.trim()) {
      toast({ title: "No content", description: "Extract or paste manuscript text first.", variant: "destructive" });
      return;
    }
    setFormatting(true);
    try {
      const LOVABLE_API_KEY_PROXY = true; // We'll call via edge function
      const { data, error } = await supabase.functions.invoke("format-manuscript", {
        body: {
          submission_id: submissionId,
          action: "apply-format",
          content,
          manuscript_type: manuscriptType,
          title,
          authors,
        },
      });
      if (error) throw error;
      if (data?.formatted_content) {
        setContent(data.formatted_content);
        setFormattingChecks(data.checks || {});
        setFormatted(true);
        toast({ title: "Formatting applied", description: "Manuscript has been formatted according to journal guidelines." });
      }
    } catch (err: any) {
      toast({ title: "Formatting failed", description: err.message, variant: "destructive" });
    }
    setFormatting(false);
  };

  const downloadAsHtml = () => {
    const htmlContent = generateFormattedHtml(content, title, authors, manuscriptType);
    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const slug = title.replace(/[^a-zA-Z0-9\s-]/g, "").trim().replace(/\s+/g, "-").substring(0, 60);
    a.download = `Formatted-${slug}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Downloaded", description: "Open the HTML file in Microsoft Word to edit further." });
  };

  const downloadAsDocx = () => {
    // Generate a Word-compatible HTML file with .doc extension
    const htmlContent = generateFormattedHtml(content, title, authors, manuscriptType);
    const blob = new Blob(
      ['\ufeff' + htmlContent], // BOM for Word compatibility
      { type: "application/msword" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const slug = title.replace(/[^a-zA-Z0-9\s-]/g, "").trim().replace(/\s+/g, "-").substring(0, 60);
    a.download = `Formatted-${slug}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Downloaded", description: "Word-compatible document downloaded." });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            Manuscript Formatting Editor
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Submission info */}
          <div className="p-3 rounded-md bg-muted/50 border border-border">
            <p className="text-sm font-medium">{title}</p>
            <p className="text-xs text-muted-foreground mt-1">{authors} · {manuscriptType}</p>
          </div>

          {/* Formatting rules checklist */}
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Formatting Requirements</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {FORMATTING_RULES.map((rule) => {
                const status = formattingChecks[rule.key];
                return (
                  <div
                    key={rule.key}
                    className={`flex items-center gap-1.5 text-xs p-2 rounded-md border ${
                      status === true
                        ? "bg-green-50 border-green-200 text-green-800"
                        : status === false
                        ? "bg-red-50 border-red-200 text-red-800"
                        : "bg-muted/30 border-border text-muted-foreground"
                    }`}
                  >
                    {status === true ? (
                      <Check className="h-3 w-3 shrink-0" />
                    ) : status === false ? (
                      <AlertTriangle className="h-3 w-3 shrink-0" />
                    ) : (
                      <div className="h-3 w-3 rounded-full border border-current shrink-0" />
                    )}
                    <span>{rule.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={extractFromPdf}
              disabled={extracting}
            >
              {extracting ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <FileText className="h-3 w-3 mr-1" />
              )}
              Extract from PDF
            </Button>
            <Button
              size="sm"
              onClick={applyFormatting}
              disabled={formatting || !content.trim()}
              className="bg-primary text-primary-foreground"
            >
              {formatting ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <Wand2 className="h-3 w-3 mr-1" />
              )}
              Auto-Format Manuscript
            </Button>
            {content.trim() && (
              <>
                <Button size="sm" variant="outline" onClick={downloadAsDocx}>
                  <Download className="h-3 w-3 mr-1" /> Download .doc
                </Button>
                <Button size="sm" variant="outline" onClick={downloadAsHtml}>
                  <Download className="h-3 w-3 mr-1" /> Download .html
                </Button>
              </>
            )}
          </div>

          {/* Editor */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Manuscript Content {extracted && <Badge variant="outline" className="ml-2 text-[10px]">Extracted</Badge>}
              {formatted && <Badge className="ml-2 text-[10px] bg-green-100 text-green-800">Formatted</Badge>}
            </Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Extract text from the PDF using the button above, or paste manuscript text here..."
              className="min-h-[400px] font-mono text-sm leading-relaxed"
            />
            <p className="text-[10px] text-muted-foreground">
              {content.length > 0
                ? `${content.split(/\s+/).filter(Boolean).length} words · ${content.length} characters`
                : "No content loaded"}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

function generateFormattedHtml(
  content: string,
  title: string,
  authors: string,
  manuscriptType: string
): string {
  // Process content: detect sections and apply formatting
  const lines = content.split("\n");
  let bodyHtml = "";
  let lineNumber = 1;

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      bodyHtml += `<p style="line-height: 2; margin: 0; font-size: 12pt; font-family: 'Times New Roman', Times, serif;">&nbsp;</p>\n`;
      continue;
    }

    // Detect section headings (ALL CAPS lines or lines starting with numbers like "1. INTRODUCTION")
    const isHeading = /^(\d+\.?\s+)?[A-Z][A-Z\s\/&:,.-]{3,}$/.test(trimmed) ||
                      /^(ABSTRACT|INTRODUCTION|METHODS|RESULTS|DISCUSSION|CONCLUSIONS?|REFERENCES|ACKNOWLEDGMENTS?|MATERIALS AND METHODS)$/i.test(trimmed);
    
    const isSubheading = /^\d+\.\d+\s+/.test(trimmed);

    // Italicize species names (two-word Latin-looking names)
    let processed = trimmed.replace(
      /\b([A-Z][a-z]+\s+[a-z]{2,}(?:\s+[a-z]+)?)\b/g,
      (match) => {
        // Common species name patterns
        const speciesPatterns = /^[A-Z][a-z]+\s+[a-z]+$/;
        if (speciesPatterns.test(match)) {
          return `<i>${match}</i>`;
        }
        return match;
      }
    );

    if (isHeading) {
      bodyHtml += `<p style="line-height: 2; margin: 24pt 0 12pt 0; font-size: 12pt; font-family: 'Times New Roman', Times, serif; font-weight: bold;">${lineNumber}. &nbsp; ${processed}</p>\n`;
    } else if (isSubheading) {
      bodyHtml += `<p style="line-height: 2; margin: 12pt 0 6pt 0; font-size: 12pt; font-family: 'Times New Roman', Times, serif; font-weight: bold; font-style: italic;">${lineNumber}. &nbsp; ${processed}</p>\n`;
    } else {
      bodyHtml += `<p style="line-height: 2; margin: 0; font-size: 12pt; font-family: 'Times New Roman', Times, serif;">${lineNumber}. &nbsp; ${processed}</p>\n`;
    }
    lineNumber++;
  }

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title} — Marine Notes Journal</title>
<style>
@page {
  margin: 1in;
  size: A4;
}
body {
  font-family: 'Times New Roman', Times, serif;
  font-size: 12pt;
  line-height: 2;
  margin: 1in;
  color: #000;
}
.header {
  text-align: center;
  margin-bottom: 24pt;
}
.header h1 {
  font-size: 14pt;
  font-weight: bold;
  margin-bottom: 12pt;
  line-height: 1.4;
}
.header .authors {
  font-size: 12pt;
  margin-bottom: 6pt;
}
.header .type-badge {
  font-size: 10pt;
  color: #666;
  font-style: italic;
}
.content {
  text-align: justify;
}
.format-note {
  font-size: 9pt;
  color: #999;
  border-top: 1px solid #ccc;
  padding-top: 12pt;
  margin-top: 24pt;
  text-align: center;
}
</style>
</head>
<body>
<div class="header">
  <h1>${title}</h1>
  <div class="authors">${authors}</div>
  <div class="type-badge">${manuscriptType} — Marine Notes Journal</div>
</div>
<hr style="border: none; border-top: 1px solid #000; margin: 12pt 0 24pt 0;">
<div class="content">
${bodyHtml}
</div>
<div class="format-note">
  Formatted according to Marine Notes Journal author guidelines.<br>
  Double-spaced · 12pt Times New Roman · 1-inch margins · Line numbers included<br>
  Generated on ${new Date().toISOString().split("T")[0]}
</div>
</body>
</html>`;
}

export default ManuscriptFormatter;
