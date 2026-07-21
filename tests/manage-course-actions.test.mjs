import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("course action groups use consistent icon placement and sizing", () => {
  const app = fs.readFileSync(new URL("../app/LearnadeApp.tsx", import.meta.url), "utf8");
  const css = fs.readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.equal((app.match(/<ManagerActionButton/g) || []).length, 5);
  assert.match(app, /manager-action-icon/);
  assert.match(app, /manager-action-label/);
  assert.match(css, /\.manager-actions button \{[^}]*grid-template-rows:18px minmax\(60px,auto\)/);
  assert.match(css, /\.manager-actions \{[^}]*grid-template-columns:repeat\(5/);
  assert.doesNotMatch(css, /\.secondary span\s*\{/);
  assert.match(css, /\.course-actions button \{[^}]*display:inline-flex/);
  assert.equal((app.match(/<CourseActionButton/g) || []).length, 3);
  assert.match(app, /className="manage-modal-scroll"/);
  assert.match(css, /\.manage-modal \{[^}]*overflow:hidden;[^}]*padding:0/);
  assert.match(css, /\.manage-modal-scroll \{[^}]*overflow-y:auto/);
  assert.match(css, /\.manage-modal \.modal-close \{[^}]*position:absolute/);
});
