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

  assert.match(worker, /HEARTBEAT_WRITE_INTERVAL_MS = 10_000/);
  assert.match(worker, /ONLINE_HEARTBEAT_GRACE_MS = 30_000/);
  assert.match(worker, /heartbeatGap <= ONLINE_HEARTBEAT_GRACE_MS/);
  assert.match(worker, /elapsedMinutes: row\.elapsed_minutes/);
  assert.match(worker, /Math\.floor\(row\.elapsed_minutes \/ 1440\) \+ 1/);
  assert.doesNotMatch(worker, /next\.elapsed_minutes = worldMinutes\(\)/);
  assert.match(page, /player\.rentedUntil - player\.elapsedMinutes/);
  assert.match(page, /每滿 24:00 結算/);
  assert.match(page, /<span>城市時間<\/span><strong>\{gameClock\.time\}<\/strong><span>\{playClock\.day\} · 玩家 \{playClock\.time\}/);
  assert.match(page, /僅在線時計時/);
  assert.match(page, /在線時間每滿 24 小時結算/);
});

test("idle clients do not create unnecessary Cloudflare reads and writes", async () => {
  const worker = await readFile(new URL("worker/index.ts", root), "utf8");
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  const wrangler = await readFile(new URL("wrangler.jsonc", root), "utf8");

  assert.doesNotMatch(worker, /\bscheduled\s*\(|\balarm\s*\(/);
  assert.doesNotMatch(wrangler, /"crons"|"triggers"/);
  assert.match(worker, /ensureSchemaOnce/);
  assert.match(worker, /heartbeatGap >= HEARTBEAT_WRITE_INTERVAL_MS/);
  assert.match(worker, /row\.location === "casino" \? casinoState/);
  assert.match(worker, /needsIdleExpiry \|\| needsRoundReveal \|\| needsRoundExpiry/);
  assert.match(page, /if \(!profile\) return/);
  assert.match(page, /document\.visibilityState === "visible"/);
  assert.match(page, /setInterval\(refreshWhileActive, 10_000\)/);
});

test("longer opening hours are consistent in rules, interface, and worker responses", async () => {
  const world = await readFile(new URL("shared/world.ts", root), "utf8");
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  const worker = await readFile(new URL("worker/index.ts", root), "utf8");
  const source = [world, page, worker].join("\n");

  assert.match(world, /realtor: \{ open: 7 \* 60, close: 23 \* 60, label: "07:00～23:00" \}/);
  assert.match(world, /bank: \{ open: 7 \* 60, close: 23 \* 60, label: "07:00～23:00" \}/);
  assert.match(world, /business: \{ open: 6 \* 60, close: 24 \* 60, label: "06:00～24:00" \}/);
  assert.match(world, /shopping: \{ open: 6 \* 60, close: 24 \* 60, label: "06:00～24:00" \}/);
  assert.match(world, /school: \{ open: 7 \* 60, close: 23 \* 60, label: "07:00～23:00" \}/);
  assert.match(world, /return current >= 7 \* 60 && current < 23 \* 60/);
  assert.match(page, /meta="07:00～23:00 · NT\$600/);
  assert.match(worker, /一般門診與完整治療時間為 07:00～23:00/);
  assert.doesNotMatch(source, /09:00～18:00|09:00～17:00|08:00～18:00|10:00～22:00|08:00～21:00|08:00～20:00/);
});

test("multiplayer cash invitations support gifts and protected scam resolution", async () => {
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  const css = await readFile(new URL("app/globals.css", root), "utf8");
  const worker = await readFile(new URL("worker/index.ts", root), "utf8");
  const schema = await readFile(new URL("db/schema.ts", root), "utf8");
  const migration = await readFile(new URL("drizzle/0016_eminent_naoko.sql", root), "utf8");

  assert.match(page, /openTransfer\(item, "gift"\)/);
  assert.match(page, /openTransfer\(item, "scam"\)/);
  assert.match(page, /transfer_response/);
  assert.match(page, /現金邀請/);
  assert.match(worker, /TRANSFER_REQUEST_TIMEOUT_MS = 60_000/);
  assert.match(worker, /case "transfer_request"/);
  assert.match(worker, /case "transfer_response"/);
  assert.match(worker, /Math\.random\(\) >= \.5/);
  assert.match(worker, /cash=CASE WHEN user_id=\? THEN cash-\? ELSE cash\+\? END/);
  assert.match(worker, /cash=CASE WHEN user_id=\? THEN cash\+\? ELSE cash-\? END/);
  assert.match(schema, /playerTransferRequests = sqliteTable\("player_transfer_requests"/);
  assert.match(migration, /CREATE TABLE `player_transfer_requests`/);
  assert.match(migration, /idx_transfer_requests_recipient_status/);
  assert.match(page, /賓果 · 公開開獎/);
  assert.match(page, /錦標賽 · 積分賽/);
  assert.match(page, /<BingoTable/);
  assert.match(page, /<TournamentTable/);
  assert.match(worker, /MIN_CASINO_ENTRY_FEE = 100/);
  assert.match(worker, /MAX_CASINO_ENTRY_FEE = 10_000/);
  assert.match(worker, /TOURNAMENT_ROUNDS = 5/);
  assert.match(worker, /entry_fee INTEGER NOT NULL DEFAULT 100/);
  assert.match(worker, /entry_fee INTEGER NOT NULL DEFAULT 500/);
  assert.match(worker, /async function bingoAction/);
  assert.match(worker, /async function tournamentAction/);
  assert.match(worker, /\["join", "leave"\]/);
  assert.match(worker, /JSON\.stringify\(randomBingoCard\(\)\)/);
  assert.match(page, /離開房間並退還/);
  assert.match(page, /五局積分錦標賽/);
  assert.match(page, /建立下一輪賓果/);
  assert.match(page, /建立下一場並設定報名費/);
  assert.match(css, /\.social-casino-table/);
  assert.match(worker, /bestPokerHand\(cards\)/);
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
  assert.match(page, /!action\.startsWith\("casino_"\) && !action\.startsWith\("poker_"\)/);
  assert.match(page, /期間可前往賭場遊玩/);
  assert.match(page, /<CasinoTable state=\{casino\} signedIn=\{Boolean\(profile\)\} busy=\{busy\}/);
  assert.match(page, /<PokerTable state=\{poker\} signedIn=\{Boolean\(profile\)\} busy=\{busy\}/);
  assert.doesNotMatch(worker, /body\.action !== "leave" && player\.action_available_at > Date\.now\(\)/);
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

test("casino uses the cropped photo icon", async () => {
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  const icon = await readFile(new URL("public/casino-icon.png", root));

  assert.match(page, /image: "\.\/casino-icon\.png"/);
  assert.match(page, /className="location-photo"/);
  assert.ok(icon.length > 0);
});
