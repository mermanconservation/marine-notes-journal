import { expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { volumeYear } from "../src/utils/volumeYear";

test("Volume 2 manuscripts belong in 2027 and both PDFs exist there", () => {
  expect(volumeYear(2)).toBe(2027);
  const { articles } = JSON.parse(readFileSync("src/data/articles.json", "utf8"));
  const files = [
    "vol2-iss1-percnon-gibbesi-theotokos-southeastern-pelion-greece.pdf",
    "vol2-iss1-opportunistic-relocation-of-massive-coral-colonies-arabian-gulf.pdf",
  ];
  for (const file of files) {
    expect(articles.some((a: { volume: string; pdfUrl: string }) =>
      a.volume === "2" && a.pdfUrl === `/manuscripts/2027/${file}`)).toBe(true);
    expect(existsSync(`public/manuscripts/2027/${file}`)).toBe(true);
    expect(existsSync(`public/manuscripts/2026/${file}`)).toBe(false);
  }
  const { issues } = JSON.parse(readFileSync("src/data/issues.json", "utf8"));
  expect(issues.find((i: { volume: string }) => i.volume === "2").year).toBe(2027);
});

test("Volume 3 belongs in 2028", () => {
  expect(volumeYear("3")).toBe(2028);
});

test("subsequent volumes continue annually", () => {
  expect(volumeYear(4)).toBe(2029);
  expect(volumeYear(1)).toBe(2026);
});