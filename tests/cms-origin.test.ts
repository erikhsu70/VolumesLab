import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveCmsOrigin } from "../src/lib/cms-origin";

test("unconfigured deployments keep the existing CMS", () => {
  for (const value of [undefined, "", "  "]) {
    assert.equal(resolveCmsOrigin(value), "https://volumes-cms.vercel.app");
  }
});

test("the new CMS origin and local preview work without duplicate slashes", () => {
  assert.equal(resolveCmsOrigin(" https://cms.volumeslab.com/ "), "https://cms.volumeslab.com");
  assert.equal(resolveCmsOrigin("http://localhost:3000/"), "http://localhost:3000");
});

test("reject credentials and URL components that would corrupt API and media URLs", () => {
  for (const value of [
    "https://user:secret@cms.example.com",
    "https://cms.example.com/api",
    "https://cms.example.com?token=secret",
    "https://cms.example.com#admin",
    "file:///tmp/cms",
    "not-a-url",
  ]) {
    assert.throws(() => resolveCmsOrigin(value));
  }
});
