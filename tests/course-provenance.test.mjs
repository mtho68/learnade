import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { courseGenerationSummary } from "../lib/courseLibrary.ts";

const material = (mode) => ({
  id: crypto.randomUUID(),
  title: "Source",
  source: "Source text",
  createdAt: "2026-07-20T00:00:00.000Z",
  kind: "pasted",
  package: {},
  ...(mode ? { generation: { mode, generatedAt: "2026-07-20T00:00:00.000Z" } } : {}),
});

test("course dashboard provenance describes only AI that was actually used", () => {
  assert.equal(courseGenerationSummary([material("gpt-5.6-terra")]).eyebrow, "AI-ENHANCED COURSE");
  assert.match(courseGenerationSummary([material("gpt-5.6-terra")]).title, /enhanced by Learnade AI/);
  assert.equal(courseGenerationSummary([material("on-device-ai")]).eyebrow, "ON-DEVICE AI COURSE");
  assert.equal(courseGenerationSummary([material()]).eyebrow, "PRIVATE LOCAL COURSE");
  assert.match(courseGenerationSummary([material()]).title, /without a language model/);
});

test("mixed courses report the number of hosted-AI sources", () => {
  const summary = courseGenerationSummary([material("gpt-5.6-terra"), material("local"), material()]);
  assert.match(summary.title, /1 of 3 sources/);
});

test("the app explains browser-only memory and shows course provenance on the dashboard", () => {
  const app = fs.readFileSync(new URL("../app/LearnadeApp.tsx", import.meta.url), "utf8");
  assert.match(app, /How Learnade remembers without an account/);
  assert.match(app, /No account or cloud sync/);
  assert.match(app, /generation-banner/);
});
