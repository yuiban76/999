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

test("administrative actions are instant and gameplay waits stay shortened", async () => {
  const worker = await readFile(new URL("worker/index.ts", root), "utf8");
  const page = await readFile(new URL("app/page.tsx", root), "utf8");

  assert.doesNotMatch(worker, /next\.owns_home = 1; minutes =/);
  assert.doesNotMatch(worker, /next\.current_job = selected\.job;[^\n]*minutes =/);
  assert.doesNotMatch(worker, /next\.cash = next\.cash - 100 \+ prize; minutes =/);
  assert.match(worker, /minutes = hours === 1 \? 30 : hours === 4 \? 120 : 240/);
  assert.match(worker, /一般門診", price: Math\.floor\(600 \* careDiscount\), minutes: 15/);
  assert.match(worker, /完整治療", price: Math\.floor\(1500 \* careDiscount\), minutes: 30/);
  assert.match(worker, /急診治療", price: Math\.floor\(2500 \* careDiscount\), minutes: 20/);
  assert.match(page, /換工作立即完成/);
  assert.match(page, /睡眠 8 小時" meta="現實等待 2 分鐘/);
});

test("story, talents, city memory, events, and hidden mystery are wired", async () => {
  const worker = await readFile(new URL("worker/index.ts", root), "utf8");
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  const progression = await readFile(new URL("shared/progression.ts", root), "utf8");
  const migration = await readFile(new URL("drizzle/0015_ambitious_gabe_jones.sql", root), "utf8");

  assert.match(progression, /remainingRatio: \.90/);
  assert.match(progression, /remainingRatio: \.75/);
  assert.match(progression, /remainingRatio: \.50/);
  assert.match(progression, /remainingRatio: \.25/);
  assert.match(progression, /remainingRatio: \.10/);
  assert.match(progression, /remainingRatio: 0/);
  assert.match(worker, /Math\.random\(\) >= \.08/);
  assert.doesNotMatch(page, /共同謎團進度|謎團任務/);
  assert.match(page, /天賦樹/);
  assert.match(page, /CITY MEMORY/);
  assert.match(migration, /CREATE TABLE `player_progress`/);
  assert.match(migration, /CREATE TABLE `city_memory_contributions`/);
  assert.match(migration, /CREATE TABLE `mystery_clues`/);
});

test("story objective replaces career milestone and promotion details live in business header", async () => {
  const page = await readFile(new URL("app/page.tsx", root), "utf8");

  assert.match(page, /當前《浪子回頭》任務進度/);
  assert.match(page, /目前貸款 NT\$/);
  assert.doesNotMatch(page, />職涯里程碑</);
  assert.match(page, /location-career-progress/);
  assert.match(page, /職業經驗：/);
  assert.match(page, /能力要求：/);
  assert.match(page, /player\.location === "business"/);
});

test("placeholder weather and age labels are not shown", async () => {
  const page = await readFile(new URL("app/page.tsx", root), "utf8");

  assert.doesNotMatch(page, /\u53f0\u5317 \u00b7 \u6674\u6717 27\u00b0/);
  assert.doesNotMatch(page, /18 \u6b72 \u00b7 \u4eba\u751f\u65b0\u624b/);
});
