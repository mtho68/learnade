import assert from "node:assert/strict";
import test from "node:test";

test("renders production Learnade metadata and navigation", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  const response = await worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html\b/i,
  );
  const html=await response.text();
  assert.doesNotMatch(html,/codex-preview/i);
  assert.match(html,/Open learning menu/);
  assert.doesNotMatch(html,/Continue with OpenAI|signin-with-chatgpt/i);
  assert.match(html,/Switch to dark mode/i);
  assert.match(html,/learnade-social-preview\.png/i);
  assert.match(html,/summary_large_image/i);
});
