import * as fs from "fs";
import * as path from "path";

type TimelineSegment = {
  startTime: string;
  endTime: string;
  timelinePath?: unknown;
  timelineMemory?: unknown;
  [key: string]: unknown;
};

function toJSTYearMonth(timeString: string): string {
  const date = new Date(timeString);
  const jstMs = date.getTime() + 9 * 60 * 60 * 1000;
  return new Date(jstMs).toISOString().slice(0, 7);
}

const inputPath = process.argv[2];
if (!inputPath) {
  console.error("Usage: npx tsx scripts/split-timeline.ts <path-to-Timeline.json>");
  process.exit(1);
}

const outputDir = path.join(path.dirname(inputPath), "output", "location-history");
fs.mkdirSync(outputDir, { recursive: true });

console.log(`Reading ${inputPath}...`);
const raw = fs.readFileSync(inputPath, "utf-8");
const parsed = JSON.parse(raw) as { semanticSegments?: TimelineSegment[] };
const semanticSegments = parsed.semanticSegments ?? [];

const byMonth = new Map<string, TimelineSegment[]>();

for (const seg of semanticSegments) {
  if ("timelinePath" in seg || "timelineMemory" in seg) continue;
  const ym = toJSTYearMonth(seg.startTime);
  const arr = byMonth.get(ym) ?? [];
  arr.push(seg);
  byMonth.set(ym, arr);
}

const sorted = [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b));

for (const [ym, segments] of sorted) {
  const outFile = path.join(outputDir, `${ym}.json`);
  fs.writeFileSync(outFile, JSON.stringify({ semanticSegments: segments }));
  const sizeKb = Math.round(fs.statSync(outFile).size / 1024);
  console.log(`${ym}.json  ${segments.length} segments  ${sizeKb} KB`);
}

console.log(`\nDone. ${sorted.length} files written to ${outputDir}`);
