export const CHECK_NAMES = ["scope_check", "grammar_check", "structure_check", "ethics_check", "originality_check", "reference_check"];

// Stop scheduling new work after an error; wait for in-flight workers to settle.
export async function mapBounded<T, R>(items: T[], concurrency: number, work: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  let failure: unknown;
  let failed = false;
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (!failed && next < items.length) {
      const index = next++;
      try { results[index] = await work(items[index], index); }
      catch (error) { failed = true; failure = error; }
    }
  }));
  if (failed) throw failure;
  return results;
}

export function progressPercent(completed: number): number {
  // Reserve the final 10% for saving the verdict and review note.
  return Math.round(Math.min(6, Math.max(0, completed)) / 6 * 90);
}