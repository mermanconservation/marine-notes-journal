import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useArticles } from "@/hooks/useArticles";
import { supabase } from "@/integrations/supabase/client";
import {
  Megaphone, Copy, Check, Type, Loader2,
  Twitter, Linkedin, Facebook, Instagram, Mail, RefreshCw, Sparkles
} from "lucide-react";

const PLATFORMS = [
  { id: "twitter", label: "Twitter / X", icon: Twitter, maxChars: 280 },
  { id: "linkedin", label: "LinkedIn", icon: Linkedin },
  { id: "facebook", label: "Facebook", icon: Facebook },
  { id: "instagram", label: "Instagram", icon: Instagram },
  { id: "email", label: "Email Newsletter", icon: Mail },
];

const TONES = [
  "Professional & Engaging",
  "Friendly & Informative",
  "Inspiring & Motivational",
  "Academic & Authoritative",
  "Casual & Fun",
];

const Promote = () => {
  const { toast } = useToast();
  const { articles } = useArticles();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [platform, setPlatform] = useState("twitter");
  const [tone, setTone] = useState(TONES[0]);
  const [topic, setTopic] = useState("");
  const [selectedArticleDoi, setSelectedArticleDoi] = useState<string>("");
  const [generatedText, setGeneratedText] = useState("");
  const [isGeneratingText, setIsGeneratingText] = useState(false);

  const selectedArticle = articles.find(a => a.doi === selectedArticleDoi);

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast({ title: "Copied!", description: "Content copied to clipboard." });
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  };

  const generateText = async () => {
    setIsGeneratingText(true);
    setGeneratedText("");
    try {
      const { data, error } = await supabase.functions.invoke("generate-promotion", {
        body: {
          type: "text",
          platform,
          topic: topic || "general marine science journal promotion",
          tone,
          articleTitle: selectedArticle?.title || "",
          articleDoi: selectedArticle?.doi || "",
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setGeneratedText(data.text);
    } catch (e: any) {
      toast({ title: "Generation failed", description: e.message, variant: "destructive" });
    } finally {
      setIsGeneratingText(false);
    }
  };

  const PlatformIcon = PLATFORMS.find(p => p.id === platform)?.icon || Type;

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Megaphone className="h-8 w-8 text-primary" />
            <h1 className="font-academic text-4xl lg:text-5xl font-semibold">
              Promote the Journal
            </h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Generate AI-powered promotional content to share Marine Notes Journal
            on your social media. All content links back to{" "}
            <a href="https://www.marinenotesjournal.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">
              marinenotesjournal.com
            </a>
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Generate Social Media Post
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Platform</label>
                <Select value={platform} onValueChange={setPlatform}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        <span className="flex items-center gap-2">
                          <p.icon className="h-4 w-4" />
                          {p.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Tone</label>
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TONES.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Topic or Focus (optional)</label>
              <Input
                placeholder="e.g., Call for submissions, ocean conservation, new research..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            </div>

            {articles.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Feature a Specific Article (optional)</label>
                <Select value={selectedArticleDoi} onValueChange={setSelectedArticleDoi}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an article to promote..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None - General promotion</SelectItem>
                    {articles.map(a => (
                      <SelectItem key={a.doi} value={a.doi}>
                        {a.title.substring(0, 80)}{a.title.length > 80 ? "..." : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button onClick={generateText} disabled={isGeneratingText} className="w-full" size="lg">
              {isGeneratingText ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Post for <PlatformIcon className="ml-1 h-4 w-4" />
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Generated text result */}
        {generatedText && (
          <Card className="mt-6 border-primary/30">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <PlatformIcon className="h-5 w-5" />
                  Generated Post
                  <Badge variant="outline">{PLATFORMS.find(p => p.id === platform)?.label}</Badge>
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={generateText}
                    disabled={isGeneratingText}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleCopy(generatedText, "generated-text")}
                  >
                    {copiedId === "generated-text" ? (
                      <Check className="mr-1 h-4 w-4" />
                    ) : (
                      <Copy className="mr-1 h-4 w-4" />
                    )}
                    Copy
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="bg-muted p-4 rounded-lg whitespace-pre-wrap text-sm leading-relaxed">
                {generatedText}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tips section */}
        <Card className="mt-12 bg-muted/30">
          <CardContent className="p-8">
            <h3 className="font-academic text-xl font-semibold mb-4">📣 Promotion Tips</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Always include the link <strong className="text-foreground">marinenotesjournal.com</strong> in your posts</li>
              <li>• Tag relevant marine science accounts and use community hashtags</li>
              <li>• Share specific articles to highlight new research findings</li>
              <li>• Post consistently across platforms to build awareness</li>
              <li>• Regenerate content until you find the perfect message for your audience</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Promote;
