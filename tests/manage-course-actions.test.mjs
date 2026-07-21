import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("course manager actions share one icon-over-label button layout", () => {
  const app = fs.readFileSync(new URL("../app/LearnadeApp.tsx", import.meta.url), "utf8");
  const css = fs.readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.equal((app.match(/<ManagerActionButton/g) || []).length, 5);
  assert.match(app, /manager-action-icon/);
  assert.match(app, /manager-action-label/);
  assert.match(css, /\.manager-actions button \{[^}]*flex-direction:column/);
  assert.match(css, /\.manager-actions \{[^}]*grid-template-columns:repeat\(5/);
});
