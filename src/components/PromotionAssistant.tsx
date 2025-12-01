import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Megaphone, Copy, Check, ChevronDown, ChevronUp } from "lucide-react";
import { Article } from "@/types/article";
import { useToast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface PromotionAssistantProps {
  article: Article;
}

export const PromotionAssistant = ({ article }: PromotionAssistantProps) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const generatePressRelease = () => {
    const date = new Date(article.publicationDate).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    return `FOR IMMEDIATE RELEASE

${date}

New Research Published in Marine Notes Journal: ${article.title}

${article.authors.split(',')[0].trim()} and colleagues have published groundbreaking research in Marine Notes Journal that advances our understanding of marine science.

${article.abstract}

The study, titled "${article.title}," represents a significant contribution to the field and is now available for review. This ${article.type.toLowerCase()} article has been peer-reviewed and published in Volume ${article.volume}, Issue ${article.issue} of Marine Notes Journal.

For more information and to access the full paper, visit: ${article.resolverUrl}

DOI: ${article.doi}

About Marine Notes Journal:
Marine Notes Journal is a peer-reviewed publication dedicated to advancing marine science research and knowledge.

###`;
  };

  const generatePlainLanguageSummary = () => {
    const firstAuthor = article.authors.split(',')[0].trim();
    return `🌊 What did researchers discover?

${firstAuthor} and their team have published new research that helps us better understand our oceans. 

${article.abstract}

This research was published in Marine Notes Journal and has been carefully reviewed by experts in the field.

Why does this matter?
Every piece of marine research helps us protect and understand our oceans better. This ${article.type.toLowerCase()} contributes valuable knowledge to the scientific community.

Want to learn more? Read the full paper: ${article.resolverUrl}`;
  };

  const generateSocialMediaPosts = () => {
    const firstAuthor = article.authors.split(',')[0].trim();
    
    return {
      twitter: `🔬 New research alert! "${article.title}" by ${firstAuthor} et al. now published in Marine Notes Journal 🌊

Read the full paper: ${article.resolverUrl}

#MarineScience #Research #Ocean #Science`,
      
      linkedin: `I'm pleased to share that our latest research has been published in Marine Notes Journal!

📄 ${article.title}

${article.abstract.substring(0, 150)}...

This ${article.type.toLowerCase()} represents important progress in marine science research. I'm grateful to my co-authors ${article.authors} for their collaboration.

Read the full paper here: ${article.resolverUrl}

#MarineScience #Research #AcademicPublishing`,
      
      facebook: `🌊 Exciting news from the world of marine science!

New research titled "${article.title}" has just been published in Marine Notes Journal.

${article.abstract.substring(0, 200)}...

This important work by ${firstAuthor} and colleagues advances our understanding of marine ecosystems.

Learn more: ${article.resolverUrl}

#MarineScience #OceanResearch #Science`
    };
  };

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast({
        title: "Copied to clipboard!",
        description: "Content has been copied successfully.",
      });
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const pressRelease = generatePressRelease();
  const plainSummary = generatePlainLanguageSummary();
  const socialPosts = generateSocialMediaPosts();

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
              {isOpen ? (
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              )}
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent>
            <Tabs defaultValue="press" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="press">Press Release</TabsTrigger>
                <TabsTrigger value="summary">Plain Summary</TabsTrigger>
                <TabsTrigger value="social">Social Media</TabsTrigger>
              </TabsList>

              <TabsContent value="press" className="space-y-4">
                <div className="relative">
                  <pre className="bg-muted p-4 rounded-lg text-sm whitespace-pre-wrap overflow-auto max-h-96">
                    {pressRelease}
                  </pre>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="absolute top-2 right-2"
                    onClick={() => handleCopy(pressRelease, "press")}
                  >
                    {copiedId === "press" ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="summary" className="space-y-4">
                <div className="relative">
                  <pre className="bg-muted p-4 rounded-lg text-sm whitespace-pre-wrap overflow-auto max-h-96">
                    {plainSummary}
                  </pre>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="absolute top-2 right-2"
                    onClick={() => handleCopy(plainSummary, "summary")}
                  >
                    {copiedId === "summary" ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="social" className="space-y-4">
                <div className="space-y-4">
                  <div className="relative">
                    <h4 className="font-semibold mb-2">Twitter/X</h4>
                    <pre className="bg-muted p-4 rounded-lg text-sm whitespace-pre-wrap">
                      {socialPosts.twitter}
                    </pre>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="absolute top-8 right-2"
                      onClick={() => handleCopy(socialPosts.twitter, "twitter")}
                    >
                      {copiedId === "twitter" ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  <div className="relative">
                    <h4 className="font-semibold mb-2">LinkedIn</h4>
                    <pre className="bg-muted p-4 rounded-lg text-sm whitespace-pre-wrap">
                      {socialPosts.linkedin}
                    </pre>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="absolute top-8 right-2"
                      onClick={() => handleCopy(socialPosts.linkedin, "linkedin")}
                    >
                      {copiedId === "linkedin" ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  <div className="relative">
                    <h4 className="font-semibold mb-2">Facebook</h4>
                    <pre className="bg-muted p-4 rounded-lg text-sm whitespace-pre-wrap">
                      {socialPosts.facebook}
                    </pre>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="absolute top-8 right-2"
                      onClick={() => handleCopy(socialPosts.facebook, "facebook")}
                    >
                      {copiedId === "facebook" ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};
