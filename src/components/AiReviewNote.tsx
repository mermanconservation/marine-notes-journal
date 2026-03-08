import { Bot, UserCheck } from "lucide-react";

/**
 * Renders simple markdown-like text: **bold**, *italic*, line breaks, and bullet points.
 */
function renderSimpleMarkdown(text: string) {
  const lines = text.split("\n");
  return lines.map((line, i) => {
    const parts: (string | JSX.Element)[] = [];
    let remaining = line;
    let key = 0;

    while (remaining.length > 0) {
      const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
      if (boldMatch && boldMatch.index !== undefined) {
        if (boldMatch.index > 0) {
          parts.push(remaining.slice(0, boldMatch.index));
        }
        parts.push(<strong key={`b${i}-${key++}`}>{boldMatch[1]}</strong>);
        remaining = remaining.slice(boldMatch.index + boldMatch[0].length);
        continue;
      }

      const italicMatch = remaining.match(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/);
      if (italicMatch && italicMatch.index !== undefined) {
        if (italicMatch.index > 0) {
          parts.push(remaining.slice(0, italicMatch.index));
        }
        parts.push(<em key={`i${i}-${key++}`}>{italicMatch[1]}</em>);
        remaining = remaining.slice(italicMatch.index + italicMatch[0].length);
        continue;
      }

      parts.push(remaining);
      break;
    }

    const trimmed = line.trimStart();
    const isBullet = trimmed.startsWith("- ") || trimmed.startsWith("* ") || /^\d+\.\s/.test(trimmed);

    if (line.trim() === "") {
      return <br key={`ln${i}`} />;
    }

    return (
      <div key={`ln${i}`} className={isBullet ? "pl-3" : ""}>
        {parts}
      </div>
    );
  });
}

type AiDecision = "accepted" | "rejected" | "review";

function detectDecision(comment: string): AiDecision {
  if (/Result:\s*ACCEPTED/i.test(comment)) return "accepted";
  if (/Result:\s*REJECTED/i.test(comment)) return "rejected";
  return "review";
}

const decisionStyles: Record<AiDecision, { bg: string; border: string; label: string; labelColor: string; textColor: string }> = {
  accepted: {
    bg: "bg-green-50 dark:bg-green-950/30",
    border: "border-green-200 dark:border-green-800",
    label: "AI Recommendation: Accepted",
    labelColor: "text-green-700 dark:text-green-400",
    textColor: "text-green-900 dark:text-green-200",
  },
  rejected: {
    bg: "bg-red-50 dark:bg-red-950/30",
    border: "border-red-200 dark:border-red-800",
    label: "AI Recommendation: Rejected",
    labelColor: "text-red-700 dark:text-red-400",
    textColor: "text-red-900 dark:text-red-200",
  },
  review: {
    bg: "bg-sky-50 dark:bg-sky-950/30",
    border: "border-sky-200 dark:border-sky-800",
    label: "AI Chief Editor Review",
    labelColor: "text-sky-700 dark:text-sky-400",
    textColor: "text-sky-900 dark:text-sky-200",
  },
};

interface AiReviewNoteProps {
  comment: string;
}

export function AiReviewNote({ comment }: AiReviewNoteProps) {
  const decision = detectDecision(comment);
  const styles = decisionStyles[decision];

  return (
    <div className={`mt-1.5 p-3 rounded-md ${styles.bg} border ${styles.border} text-sm`}>
      <div className={`flex items-center gap-1.5 mb-2 text-xs font-medium ${styles.labelColor}`}>
        <Bot className="h-3.5 w-3.5" /> {styles.label}
      </div>
      <div className={`${styles.textColor} space-y-0.5`}>
        {renderSimpleMarkdown(comment)}
      </div>
      <div className={`mt-3 pt-2 border-t ${styles.border} flex items-center gap-1.5 text-xs ${styles.labelColor}`}>
        <UserCheck className="h-3.5 w-3.5" />
        <span>This is an automated AI editorial assessment. A human editor will review and make the final decision.</span>
      </div>
    </div>
  );
}

export function isAiReviewComment(comment: string | null): boolean {
  if (!comment) return false;
  return comment.startsWith("[AI AUTO-REVIEW PIPELINE]") || comment.startsWith("As the AI Chief Editor") || comment.startsWith("**");
}
