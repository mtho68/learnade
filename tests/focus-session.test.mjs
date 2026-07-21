import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createFocusSessionState, DEFAULT_FOCUS_SECONDS, focusSessionReducer, formatFocusTime } from "../lib/focusSession.ts";

test("focus timer keeps counting in shared app state", () => {
  let state=createFocusSessionState();
  state=focusSessionReducer(state,{type:"engage"});
  state=focusSessionReducer(state,{type:"toggle-running"});
  state=focusSessionReducer(state,{type:"tick"});
  state=focusSessionReducer(state,{type:"tick"});
  assert.equal(state.engaged,true);
  assert.equal(state.running,true);
  assert.equal(state.seconds,DEFAULT_FOCUS_SECONDS-2);
  assert.equal(formatFocusTime(state.seconds),"11:58");
});

test("focus session preserves task progress until a new session is requested", () => {
  let state=createFocusSessionState();
  state=focusSessionReducer(state,{type:"toggle-task",index:0});
  state=focusSessionReducer(state,{type:"shorten"});
  assert.deepEqual(state.done,[true,false,false]);
  assert.equal(state.seconds,5*60);
  state=focusSessionReducer(state,{type:"new-session"});
  assert.deepEqual(state.done,[false,false,false]);
  assert.equal(state.seconds,DEFAULT_FOCUS_SECONDS);
  assert.equal(state.round,1);
});

test("focus tasks expose a return path and persistent timer", () => {
  const app=readFileSync(new URL("../app/LearnadeApp.tsx",import.meta.url),"utf8");
  assert.match(app,/setReaderReturnMode\("focus"\)/);
  assert.match(app,/Back to focus session/);
  assert.match(app,/focus-session-dock/);
});
