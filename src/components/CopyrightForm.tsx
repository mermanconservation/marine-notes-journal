import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { FileText, CheckCircle } from "lucide-react";

interface CopyrightFormProps {
  manuscriptTitle: string;
  authorName: string;
  onComplete: () => void;
}

export const CopyrightForm = ({ manuscriptTitle, authorName, onComplete }: CopyrightFormProps) => {
  const [formData, setFormData] = useState({
    authorSignature: "",
    date: new Date().toISOString().split('T')[0],
    originalWork: false,
    noConflict: false,
    transferRights: false,
    creativeCommons: false
  });

  const [isComplete, setIsComplete] = useState(false);

  const allChecked = formData.originalWork && 
                     formData.noConflict && 
                     formData.transferRights && 
                     formData.creativeCommons;

  const handleComplete = () => {
    if (allChecked && formData.authorSignature) {
      setIsComplete(true);
      setTimeout(() => {
        onComplete();
      }, 2000);
    }
  };

  if (isComplete) {
    return (
      <Card className="border-accent/50">
        <CardContent className="p-8 text-center">
          <CheckCircle className="h-16 w-16 text-accent mx-auto mb-4" />
          <h3 className="text-2xl font-semibold mb-2">Copyright Form Completed</h3>
          <p className="text-muted-foreground">
            Thank you for completing the copyright agreement. Your submission is now complete.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-accent/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Copyright Transfer Agreement
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-muted/30 p-4 rounded-lg space-y-2 text-sm">
          <p><strong>Manuscript Title:</strong> {manuscriptTitle}</p>
          <p><strong>Corresponding Author:</strong> {authorName}</p>
        </div>

        <div className="space-y-4 text-sm">
          <p className="font-medium">
            By signing this agreement, I/we confirm the following:
          </p>

          <div className="flex items-start space-x-3 p-3 bg-background rounded border">
            <Checkbox
              id="originalWork"
              checked={formData.originalWork}
              onCheckedChange={(checked) => 
                setFormData(prev => ({ ...prev, originalWork: checked as boolean }))
              }
            />
            <Label htmlFor="originalWork" className="cursor-pointer leading-relaxed">
              This manuscript is original work and has not been published elsewhere, nor is it currently under consideration for publication elsewhere.
            </Label>
          </div>

          <div className="flex items-start space-x-3 p-3 bg-background rounded border">
            <Checkbox
              id="noConflict"
              checked={formData.noConflict}
              onCheckedChange={(checked) => 
                setFormData(prev => ({ ...prev, noConflict: checked as boolean }))
              }
            />
            <Label htmlFor="noConflict" className="cursor-pointer leading-relaxed">
              All authors have reviewed and approved the manuscript and there are no conflicts of interest to declare.
            </Label>
          </div>

          <div className="flex items-start space-x-3 p-3 bg-background rounded border">
            <Checkbox
              id="transferRights"
              checked={formData.transferRights}
              onCheckedChange={(checked) => 
                setFormData(prev => ({ ...prev, transferRights: checked as boolean }))
              }
            />
            <Label htmlFor="transferRights" className="cursor-pointer leading-relaxed">
              I/we transfer copyright of this manuscript to Marine Notes Journal upon acceptance for publication.
            </Label>
          </div>

          <div className="flex items-start space-x-3 p-3 bg-background rounded border">
            <Checkbox
              id="creativeCommons"
              checked={formData.creativeCommons}
              onCheckedChange={(checked) => 
                setFormData(prev => ({ ...prev, creativeCommons: checked as boolean }))
              }
            />
            <Label htmlFor="creativeCommons" className="cursor-pointer leading-relaxed">
              I/we agree to publish this work under a Creative Commons Attribution 4.0 International License (CC BY 4.0), allowing others to share and adapt the work with proper attribution.
            </Label>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <Label htmlFor="authorSignature">Full Name (Electronic Signature) *</Label>
            <Input
              id="authorSignature"
              value={formData.authorSignature}
              onChange={(e) => setFormData(prev => ({ ...prev, authorSignature: e.target.value }))}
              placeholder="Type your full name"
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
              className="mt-2"
              readOnly
            />
          </div>
        </div>

        <div className="pt-4">
          <Button 
            onClick={handleComplete}
            disabled={!allChecked || !formData.authorSignature}
            className="w-full"
          >
            Complete Copyright Agreement
          </Button>
          {(!allChecked || !formData.authorSignature) && (
            <p className="text-xs text-muted-foreground text-center mt-2">
              Please check all boxes and provide your signature to continue
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};