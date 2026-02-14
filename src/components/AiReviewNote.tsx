import { Bot } from "lucide-react";

/**
 * Renders simple markdown-like text: **bold**, *italic*, line breaks, and bullet points.
 */
function renderSimpleMarkdown(text: string) {
  const lines = text.split("\n");
  return lines.map((line, i) => {
    // Process inline formatting: **bold** and *italic*
    const parts: (string | JSX.Element)[] = [];
    let remaining = line;
    let key = 0;

    while (remaining.length > 0) {
      // Bold: **text**
      const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
      if (boldMatch && boldMatch.index !== undefined) {
        if (boldMatch.index > 0) {
          parts.push(remaining.slice(0, boldMatch.index));
        }
        parts.push(<strong key={`b${i}-${key++}`}>{boldMatch[1]}</strong>);
        remaining = remaining.slice(boldMatch.index + boldMatch[0].length);
        continue;
      }

      // Italic: *text* (but not **)
      const italicMatch = remaining.match(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/);
      if (italicMatch && italicMatch.index !== undefined) {
        if (italicMatch.index > 0) {
          parts.push(remaining.slice(0, italicMatch.index));
        }
        parts.push(<em key={`i${i}-${key++}`}>{italicMatch[1]}</em>);
        remaining = remaining.slice(italicMatch.index + italicMatch[0].length);
        continue;
      }

      // No more matches
      parts.push(remaining);
      break;
    }

    // Detect bullet lines
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

interface AiReviewNoteProps {
  comment: string;
}

export function AiReviewNote({ comment }: AiReviewNoteProps) {
  return (
    <div className="mt-1.5 p-3 rounded-md bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 text-sm">
      <div className="flex items-center gap-1.5 mb-2 text-xs font-medium text-sky-700 dark:text-sky-400">
        <Bot className="h-3.5 w-3.5" /> AI Chief Editor Review
      </div>
      <div className="text-sky-900 dark:text-sky-200 space-y-0.5">
        {renderSimpleMarkdown(comment)}
      </div>
    </div>
  );
}

export function isAiReviewComment(comment: string | null): boolean {
  if (!comment) return false;
  return comment.startsWith("As the AI Chief Editor") || comment.startsWith("**");
}
