import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const publicFiles = ["meta.app", "board.js", "csv.js", "ping.js", "whoami.js"];
const retiredSecret = ["KORUAL", "ONLY"].join("-");
const retiredDeploymentId =
  "AKfycby2FlBu4YXEpeGUAvtXWTbYCi4BNGHNl7GCsaQtsCHuvGXYMELveOkoctEAepFg2F_0";

test("public browser files contain no retired secret or GAS deployment URL", async () => {
  for (const path of publicFiles) {
    const source = await readFile(path, "utf8");
    assert.equal(source.includes(retiredSecret), false, `${path} contains the retired shared secret`);
    assert.equal(source.includes(retiredDeploymentId), false, `${path} contains the retired GAS deployment ID`);
    assert.equal(source.includes("script.google.com/macros/s/"), false, `${path} calls GAS directly`);
  }
});

test("server proxy loads upstream credentials from server-only environment variables", async () => {
  const source = await readFile("route.js", "utf8");
  assert.match(source, /process\.env\.KORUAL_GAS_URL/);
  assert.match(source, /process\.env\.KORUAL_GAS_SECRET/);
  assert.doesNotMatch(source, /NEXT_PUBLIC_|VITE_/);
});
