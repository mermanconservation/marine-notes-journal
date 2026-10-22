export const PUBLICATION_RECORDED_NOTE = "Publication recorded: already published.";

export function recordedPublicationIds(
  reviews: { submission_id: string; action: string; comment: string | null }[],
): Set<string> {
  return new Set(reviews
    .filter(review => review.action === "note" && review.comment === PUBLICATION_RECORDED_NOTE)
    .map(review => review.submission_id));
}