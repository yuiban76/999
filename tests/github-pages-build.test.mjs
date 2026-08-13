import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("creates a complete full-stack game build", async () => {
  const output = new URL("dist/client/", root);
  const htmlUrl = new URL("index.html", output);

  await access(htmlUrl);
  await access(new URL("favicon.svg", output));
  await access(new URL("../life_online_api/index.js", output));
  await access(new URL("../life_online_api/wrangler.json", output));
  await access(new URL("../server/index.js", output));

  const html = await readFile(htmlUrl, "utf8");
  const assets = await readdir(new URL("assets/", output));

  assert.match(html, /<div id="root"><\/div>/);
  assert.match(html, /\.\/assets\//);
  assert.ok(assets.some((file) => file.endsWith(".js")));
  assert.ok(assets.some((file) => file.endsWith(".css")));
});

test("personal finance time only advances during continuous online heartbeats", async () => {
  const worker = await readFile(new URL("worker/index.ts", root), "utf8");
  const page = await readFile(new URL("app/page.tsx", root), "utf8");

  assert.match(worker, /ONLINE_HEARTBEAT_GRACE_MS = 15_000/);
  assert.match(worker, /players\.last_seen_at >= excluded\.last_seen_at - \?/);
  assert.match(worker, /elapsedMinutes: row\.elapsed_minutes/);
  assert.match(worker, /Math\.floor\(row\.elapsed_minutes \/ 1440\) \+ 1/);
  assert.doesNotMatch(worker, /next\.elapsed_minutes = worldMinutes\(\)/);
  assert.match(page, /player\.rentedUntil - player\.elapsedMinutes/);
  assert.match(page, /離線期間不結算/);
});
