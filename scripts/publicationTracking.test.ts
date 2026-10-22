import { expect, test } from "bun:test";
import { recordedPublicationIds, PUBLICATION_RECORDED_NOTE } from "../src/utils/publicationTracking";

test("already-published acknowledgements remove only the recorded submission from the waiting queue", () => {
  const ids = recordedPublicationIds([
    { submission_id: "published", action: "note", comment: PUBLICATION_RECORDED_NOTE },
    { submission_id: "waiting", action: "note", comment: "Accepted for publication" },
    { submission_id: "unrelated", action: "accept", comment: PUBLICATION_RECORDED_NOTE },
  ]);
  expect([...ids]).toEqual(["published"]);
  expect(["published", "waiting"].filter(id => !ids.has(id))).toEqual(["waiting"]);
});

test("repeated acknowledgements count as one publication", () => {
  const review = { submission_id: "published", action: "note", comment: PUBLICATION_RECORDED_NOTE };
  expect(recordedPublicationIds([review, review]).size).toBe(1);
});