import { useEffect, useState } from "react";
import { CheckCircle, Clock, Loader2, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const STAGES = [
  ["scope_check", "Scope and relevance"],
  ["grammar_check", "Language quality"],
  ["structure_check", "Structure and formatting"],
  ["ethics_check", "Ethical compliance"],
  ["originality_check", "Originality assessment"],
  ["reference_check", "Reference verification"],
];

interface Props {
  status: string;
  results?: {
    steps?: { step: string; score: number }[];
    progress?: { active_steps?: string[]; percent?: number; started_at?: string; updated_at?: string; phase?: string };
    error?: string;
  } | null;
}

export function PipelineProgress({ status, results }: Props) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (status !== "running") return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [status]);
  const progress = results?.progress;
  const completed = results?.steps || [];
  const terminal = ["passed", "failed", "editor_review"].includes(status);
  const stopped = status === "error" || status === "paused";
  const elapsed = progress?.started_at ? Math.max(0, Math.floor((now - Date.parse(progress.started_at)) / 1000)) : 0;
  const stale = status === "running" && (!progress?.updated_at || now - Date.parse(progress.updated_at) > 180000);
  const percent = terminal ? 100 : progress?.percent ?? Math.round(completed.length / 6 * 90);
  return (
    <div className="space-y-3 py-3" aria-label="AI review progress">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm" role="status" aria-live="polite">
        <span className="flex items-center gap-2 font-medium">
          {stopped ? <AlertCircle className="h-4 w-4 text-destructive" /> : terminal ? <CheckCircle className="h-4 w-4 text-primary" /> : <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none text-primary" />}
          {stopped ? "Review stopped" : terminal ? "Review complete" : status === "pending" ? "Awaiting review" : "Review in progress"}
        </span>
        <span className="text-muted-foreground">{completed.length}/6 checks · {percent}%{elapsed > 0 && !terminal && ` · ${Math.floor(elapsed / 60)}m ${elapsed % 60}s`}</span>
      </div>
      <Progress value={percent} aria-label="Completed review checks" className="h-2" />
      <ol className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        {STAGES.map(([key, label]) => {
          const done = completed.find(step => step.step === key);
          const active = progress?.active_steps?.includes(key) && !stopped && !terminal;
          return <li key={key} className="flex items-center gap-2 min-w-0">
            {done ? <CheckCircle className="h-3.5 w-3.5 shrink-0 text-primary" /> : active ? <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin motion-reduce:animate-none text-primary" /> : <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
            <span className={done || active ? "text-foreground" : "text-muted-foreground"}>{label}{done ? ` · ${done.score}/100` : active ? " · Running" : ""}</span>
          </li>;
        })}
      </ol>
      {progress?.phase && !terminal && !stopped && <p className="text-xs text-muted-foreground">{progress.phase}</p>}
      {stopped && <p role="alert" className="text-sm text-destructive">{results?.error || "The review could not finish. An editor can restart it."}</p>}
      {stale && <p className="text-xs text-muted-foreground">No recent progress update. An editor can restart the review if it has been interrupted.</p>}
    </div>
  );
}