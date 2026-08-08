import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import issuesData from "@/data/issues.json";

export interface JournalIssue {
  id: string;
  volume: string;
  issue: string;
  year: number;
  status: string;
  issue_pdf_url: string | null;
  notes: string | null;
  cover_url?: string | null;
}

function mapStaticIssues(): JournalIssue[] {
  return issuesData.issues.map((i) => ({
    id: `static-v${i.volume}-i${i.issue}`,
    volume: String(i.volume),
    issue: String(i.issue),
    year: Number(i.year),
    status: i.status,
    issue_pdf_url: i.issuePdfUrl || null,
    notes: i.notes || null,
    cover_url: (i as any).coverUrl || null,
  }));
}

/**
 * Volumes/issues are stored in git (src/data/issues.json) so the public site
 * never depends on the backend being awake. Database rows are merged in only
 * as an extra source for issues that have not yet been committed to the repo.
 */
export function useIssues() {
  const staticIssues = mapStaticIssues();
  const [issues, setIssues] = useState<JournalIssue[]>(staticIssues);

  useEffect(() => {
    let active = true;
    supabase
      .from("journal_issues")
      .select("id,volume,issue,year,status,issue_pdf_url,notes,cover_url")
      .then(({ data }) => {
        if (!active || !data) return;
        const seen = new Set(staticIssues.map((i) => `${i.volume}-${i.issue}`));
        const extra = (data as any[])
          .filter((d) => !seen.has(`${d.volume}-${d.issue}`))
          .map((d) => ({ ...d, volume: String(d.volume), issue: String(d.issue), year: Number(d.year) }));
        // Enrich static rows with cover/pdf info from the database when present
        const byKey = new Map((data as any[]).map((d) => [`${d.volume}-${d.issue}`, d]));
        const enriched = staticIssues.map((i) => {
          const row = byKey.get(`${i.volume}-${i.issue}`);
          return row
            ? {
                ...i,
                issue_pdf_url: i.issue_pdf_url || row.issue_pdf_url,
                // git-backed cover always wins over cloud storage
                cover_url: i.cover_url || row.cover_url,
              }
            : i;
        });
        setIssues([...enriched, ...extra]);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return issues;
}

export function findStaticIssue(volume?: string, issue?: string) {
  return (
    mapStaticIssues().find((i) => i.volume === String(volume) && i.issue === String(issue)) || null
  );
}
