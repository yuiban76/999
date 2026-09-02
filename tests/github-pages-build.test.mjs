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
  assert.match(worker, /elapsed_minutes=elapsed_minutes\+CASE/);
  assert.doesNotMatch(worker, /action_available_at=CASE\s+WHEN \?-last_seen_at/);
  assert.match(worker, /Action waits are wall-clock timers/);
  assert.match(worker, /last_seen_at=MAX\(last_seen_at, \?\)/);
  assert.match(worker, /elapsedMinutes: row\.elapsed_minutes/);
  assert.match(worker, /Math\.floor\(row\.elapsed_minutes \/ 1440\) \+ 1/);
  assert.match(worker, /let cashBalance = row\.cash/);
  assert.match(worker, /const automaticPayment = Math\.min\(paymentShortfall, cashBalance \+ bankBalance\)/);
  assert.match(worker, /UPDATE players SET cash=\?, bank_balance=\?/);
  assert.doesNotMatch(worker, /next\.elapsed_minutes = worldMinutes\(\)/);
  assert.match(page, /player\.rentedUntil - displayElapsedMinutes/);
  assert.match(page, /每滿 24:00 結算/);
  assert.match(page, /<span>城市時間<\/span><strong>\{gameClock\.time\}<\/strong><span>\{playClock\.day\} · 玩家 \{playClock\.time\}/);
  assert.match(page, /僅在線時計時/);
  assert.match(page, /在線時間每滿 24 小時結算/);
  assert.match(page, /先從手上現金、再從銀行存款自動扣除最低繳款/);
});

test("idle clients do not create unnecessary Cloudflare reads and writes", async () => {
  const worker = await readFile(new URL("worker/index.ts", root), "utf8");
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  const wrangler = await readFile(new URL("wrangler.jsonc", root), "utf8");

  assert.doesNotMatch(worker, /\bscheduled\s*\(|\balarm\s*\(/);
  assert.doesNotMatch(wrangler, /"crons"|"triggers"/);
  assert.match(worker, /ensureSchemaOnce/);
  assert.match(worker, /\(\?=1 OR \?-last_seen_at>=\?\)/);
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
  assert.match(page, /Math\.floor\(600 \* \(1 - effectiveHospitalDiscount\)\)/);
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
  assert.match(page, /策略賓果/);
  assert.match(page, /五局積分錦標賽/);
  assert.match(page, /<BingoTable/);
  assert.match(page, /<TournamentTable/);
  assert.match(page, /LeaveConfirmDialog/);
  assert.match(page, /確定要離開牌桌嗎/);
  assert.match(page, /確定要離開\$\{gameName\}錦標賽嗎/);
  assert.match(page, /要牌/);
  assert.match(page, /跟注/);
  assert.match(page, /onAction\("hit"\)/);
  assert.match(worker, /MIN_CASINO_ENTRY_FEE = 100/);
  assert.match(worker, /MAX_CASINO_ENTRY_FEE = 10_000/);
  assert.match(worker, /TOURNAMENT_ROUNDS = 5/);
  assert.match(worker, /entry_fee INTEGER NOT NULL DEFAULT 100/);
  assert.match(worker, /entry_fee INTEGER NOT NULL DEFAULT 500/);
  assert.match(worker, /async function bingoAction/);
  assert.match(worker, /async function tournamentAction/);
  assert.match(worker, /async function startTournamentRound/);
  assert.match(worker, /casino_tournament_hands/);
  assert.match(worker, /本局 \+\$\{earned\} 分/);
  assert.match(worker, /const finalScores = entries\.results\.map/);
  assert.match(worker, /總分\$\{entry\.score\}/);
  assert.match(page, /總分 \{player\.score\} 分/);
  assert.match(page, /player\.blackjackScore !== null/);
  assert.match(worker, /blackjackScore: round\?\.game === "blackjack"/);
  assert.match(worker, /body\.action === "hit"/);
  assert.match(worker, /body\.action === "call"/);
  assert.match(worker, /\["join", "leave", "start", "swap", "claim"\]/);
  assert.match(worker, /JSON\.stringify\(randomBingoCard\(\)\)/);
  assert.match(worker, /BINGO_STRATEGY_MS = 12_000/);
  assert.match(worker, /strategyUntil/);
  assert.match(worker, /async function dicePokerAction/);
  assert.match(worker, /dicePokerEvaluation/);
  assert.match(worker, /UPDATE casino_dice_state SET status='settling'/);
  assert.match(schema, /casinoDiceState = sqliteTable\("casino_dice_state"/);
  assert.match(schema, /casinoDiceEntries = sqliteTable\("casino_dice_entries"/);
  assert.match(page, /五骰撲克/);
  assert.match(page, /重擲未保留骰子/);
  assert.match(page, /casino-category-tabs/);
  assert.match(page, /離開房間並退還/);
  assert.match(page, /五局積分錦標賽/);
  assert.match(page, /建立下一輪賓果/);
  assert.match(page, /建立下一場並設定報名費/);
  assert.match(css, /\.social-casino-table/);
  assert.match(css, /\.table-confirm-card/);
  assert.match(css, /\.casino-table > header > strong.*font-size: 12px/);
  assert.match(worker, /bestPokerHand\(cards\)/);
  assert.match(page, /更改玩家名字/);
  assert.match(page, /api\/profile\/name/);
  assert.match(worker, /async function updateDisplayName/);
  assert.match(worker, /UPDATE accounts SET display_name=\?/);
  assert.match(worker, /UPDATE players SET display_name=\?/);
});

test("administrative actions are instant and gameplay waits stay shortened", async () => {
  const worker = await readFile(new URL("worker/index.ts", root), "utf8");
  const page = await readFile(new URL("app/page.tsx", root), "utf8");

  assert.doesNotMatch(worker, /next\.owns_home = 1; minutes =/);
  assert.doesNotMatch(worker, /next\.current_job = selected\.job;[^\n]*minutes =/);
  assert.doesNotMatch(worker, /next\.cash = next\.cash - 100 \+ prize; minutes =/);
  assert.match(worker, /minutes = careerWorkWaitSeconds\(next\.current_job, hours/);
  assert.match(worker, /next\.cash \+= 100; minutes = 30/);
  assert.match(worker, /next\.location = body\.location as LocationId;/);
  assert.match(worker, /bypassVitalityEffects = body\.action === "move"/);
  assert.match(page, /bypassVitalityEffects = action === "move"/);
  assert.doesNotMatch(worker, /next\.location = body\.location as LocationId; next\.energy/);
  assert.match(worker, /一般門診", price: Math\.floor\(600 \* careDiscount\), minutes: 15/);
  assert.match(worker, /完整治療", price: Math\.floor\(1500 \* careDiscount\), minutes: 30/);
  assert.match(worker, /急診治療", price: Math\.floor\(2500 \* careDiscount\), minutes: 20/);
  assert.match(page, /任何職位都能換職/);
  assert.match(page, /title="完整睡眠" meta=\{`現實等待 \$\{homeSleep\.waitSeconds\} 秒/);
  assert.match(page, /旅店臨時工 · 30 秒/);
  assert.match(page, /不扣體力、飽足、健康/);
  assert.match(page, /const canActDuringWait = \[.*"bank".*"beg_response".*"coop_contribute"/);
  assert.match(worker, /\[.*"bank".*"beg_response".*"coop_contribute".*\]\.includes\(body\.action/);
  assert.match(page, /期間可移動、換職、使用銀行、與 NPC 交談、處理玩家請求，或前往賭場遊玩/);
  assert.match(page, /BankPanel player=\{player\} busy=\{busy \|\| !bankOpen\}/);
  assert.match(page, /<CasinoTable state=\{casino\} signedIn=\{Boolean\(profile\)\} busy=\{busy\}/);
  assert.match(page, /<PokerTable state=\{poker\} signedIn=\{Boolean\(profile\)\} busy=\{busy\}/);
  assert.doesNotMatch(worker, /body\.action !== "leave" && player\.action_available_at > Date\.now\(\)/);
});

test("recovery, special-shift waits, synchronized time, and tournament all-in are wired", async () => {
  const worker = await readFile(new URL("worker/index.ts", root), "utf8");
  const page = await readFile(new URL("app/page.tsx", root), "utf8");

  assert.match(worker, /careerWorkWaitSeconds\(next\.current_job, hours, talents\.has\("workaholic_2"\)\)/);
  assert.match(page, /careerWorkWaitSeconds\(next\.currentJob, hours, next\.talents\.includes\("workaholic_2"\)\)/);
  assert.match(page, /const workWaitMinutes = \(hours: number\) => careerWorkWaitSeconds/);
  assert.match(worker, /body\.action !== "sleep" && next\.hunger <= 15/);
  assert.match(worker, /body\.action !== "sleep" && next\.energy <= 5/);
  assert.match(page, /action !== "sleep" && next\.hunger <= 15/);
  assert.match(page, /action !== "sleep" && next\.energy <= 5/);
  assert.match(worker, /serverNow: Date\.now\(\)/);
  assert.match(page, /setServerTimeOffsetMs\(data\.serverNow - currentWallClockMs\(\)\)/);
  assert.match(worker, /const gameplayActions = \["hit", "stand", "check", "call", "raise", "all_in", "fold"\]/);
  assert.match(worker, /\["join", "leave", "start", \.\.\.gameplayActions\]/);
  assert.match(worker, /status='playing', next_round_at=\?, updated_at=\?/);
  assert.match(worker, /status='all_in'/);
  assert.match(page, /onAction\("all_in"\)/);
  assert.match(page, /onAction\("start"\)/);
  assert.match(page, /const TOURNAMENT_STARTING_STACK = 100/);
  assert.match(page, /className="leave"/);
  assert.match(page, /onAction\("fold"\)/);
  assert.match(page, /任何職位都能換職/);
});

test("general office career has four ranks and role-specific work specials", async () => {
  const jobs = await readFile(new URL("shared/jobs.ts", root), "utf8");
  const worker = await readFile(new URL("worker/index.ts", root), "utf8");
  const page = await readFile(new URL("app/page.tsx", root), "utf8");

  assert.match(jobs, /jobs: \["行政助理", "行政專員", "資深行政專員", "行政主管"\]/);
  assert.match(jobs, /行政助理.*超長班/s);
  assert.match(jobs, /行政專員.*爆肝/s);
  assert.match(jobs, /資深行政專員.*摸魚/s);
  assert.match(jobs, /行政主管.*準時下班/s);
  assert.match(worker, /careerWorkSpecialFor\(next\.current_job, hours\)/);
  assert.match(page, /title=\{longWorkTitle\}/);
  assert.match(page, /workSpecial && workSpecial\.hours !== 8/);
});

test("every defined special shift has one shared real-time wait", async () => {
  const jobs = await readFile(new URL("shared/jobs.ts", root), "utf8");
  const worker = await readFile(new URL("worker/index.ts", root), "utf8");
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  const entries = [...jobs.matchAll(/"([^"]+)": \{ name: "[^"]+", hours: (\d+), minutes: (\d+) \}/g)];
  assert.equal(entries.length, 24);
  for (const [, job, hours, minutes] of entries) {
    assert.ok(Number(hours) >= 1 && Number(hours) <= 11, `${job} has an invalid special-shift length`);
    assert.ok(Number(minutes) >= 2 && Number(minutes) <= 5, `${job} has an invalid real wait`);
  }
  assert.match(jobs, /export function careerWorkWaitSeconds/);
  assert.match(worker, /minutes = careerWorkWaitSeconds\(next\.current_job, hours/);
  assert.match(page, /workWaitMinutes\(workSpecial\.hours\)/);
  assert.match(worker, /going offline must not extend a work\/sleep\/class wait/);
});

test("street survival, freelance ranks, story chapters, career events, and city co-op are wired", async () => {
  const jobs = await readFile(new URL("shared/jobs.ts", root), "utf8");
  const progression = await readFile(new URL("shared/progression.ts", root), "utf8");
  const worker = await readFile(new URL("worker/index.ts", root), "utf8");
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  const migration = await readFile(new URL("drizzle/0026_slimy_black_tom.sql", root), "utf8");

  assert.match(jobs, /jobs: \["街友", "丐幫成員", "丐幫長老", "丐幫幫主"\]/);
  assert.match(jobs, /jobs: \["接案助理", "自由工作者", "資深接案者", "自由工作顧問"\]/);
  assert.match(worker, /case "street_scavenge"/);
  assert.match(worker, /case "beg_request"/);
  assert.match(worker, /case "street_share_food"/);
  assert.match(worker, /case "aid_box_open"/);
  assert.match(worker, /case "coop_contribute"/);
  assert.match(worker, /completion_token/);
  assert.match(page, /車站地下道/);
  assert.match(page, /城市聯合支援/);
  assert.match(page, /STREET BAG/);
  assert.match(progression, /PRODIGAL_SUCCESS_STORY/);
  assert.match(progression, /categories: \["street"\]/);
  assert.match(migration, /CREATE TABLE `player_inventory`/);
  assert.match(migration, /CREATE TABLE `street_beg_requests`/);
  assert.match(migration, /CREATE TABLE `city_coop_contributions`/);
  assert.match(migration, /story_seen_chapter/);
});

test("hospitality career has four ranks, hunger specials, and a daily-settled restaurant", async () => {
  const jobs = await readFile(new URL("shared/jobs.ts", root), "utf8");
  const worker = await readFile(new URL("worker/index.ts", root), "utf8");
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  const schema = await readFile(new URL("db/schema.ts", root), "utf8");
  const migration = await readFile(new URL("drizzle/0023_restaurant_owner.sql", root), "utf8");

  assert.match(jobs, /jobs: \["廚房助理", "廚師", "主廚", "餐廳老闆"\]/);
  assert.match(jobs, /"廚房助理": \{ name: "備料班", hours: 4, minutes: 2 \}/);
  assert.match(jobs, /"廚師": \{ name: "出餐高峰班", hours: 6, minutes: 3 \}/);
  assert.match(jobs, /HOSPITALITY_SPECIAL_HUNGER/);
  assert.match(jobs, /RESTAURANT_PURCHASE_PRICE = 400_000/);
  assert.match(jobs, /RESTAURANT_DAILY_NET = RESTAURANT_DAILY_GROSS - RESTAURANT_DAILY_COST/);
  assert.match(worker, /case "restaurant"/);
  assert.match(worker, /next\.owns_restaurant = 1/);
  assert.match(worker, /row\.owns_restaurant && row\.job_category === "hospitality" && row\.current_job === "餐廳老闆"/);
  assert.match(worker, /餐廳收益每日結算/);
  assert.match(page, /購買自有餐廳/);
  assert.match(page, /每日在線結算淨收益/);
  assert.match(page, /飽足 \+\$\{restaurantSpecialHunger\}/);
  assert.match(schema, /ownsRestaurant: integer\("owns_restaurant", \{ mode: "boolean" \}\)/);
  assert.match(migration, /ALTER TABLE `players` ADD COLUMN `owns_restaurant` integer DEFAULT 0 NOT NULL/);
});

test("crime career adds guarded player actions, prison records, and territory income", async () => {
  const jobs = await readFile(new URL("shared/jobs.ts", root), "utf8");
  const worker = await readFile(new URL("worker/index.ts", root), "utf8");
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  const schema = await readFile(new URL("db/schema.ts", root), "utf8");
  const migration = await readFile(new URL("drizzle/0024_crime_prison_territory.sql", root), "utf8");

  assert.match(jobs, /id: "crime", label: "犯罪路線", jobs: \["詐騙犯", "駭客", "走私者", "大橋頭營運長"\]/);
  assert.match(jobs, /CRIME_ARREST_CHANCES/);
  assert.match(jobs, /HACK_SUCCESS_CHANCE = 0\.20/);
  assert.match(jobs, /TERRITORY_VISIT_REWARD = 100/);
  assert.match(jobs, /TERRITORY_DAILY_CAP = 10_000/);
  assert.match(worker, /case "crime_hack"/);
  assert.match(worker, /只有駭客可以執行這項行動/);
  assert.match(worker, /只有詐騙犯可以使用詐騙功能/);
  assert.match(worker, /function arrestPlayer/);
  assert.match(worker, /case "territory"/);
  assert.match(worker, /async function recordTerritoryVisit/);
  assert.match(worker, /territory_visit_log/);
  assert.match(worker, /current\.prison_until > current\.elapsed_minutes/);
  assert.match(worker, /UPDATE players SET current_job='unemployed'/);
  assert.match(page, /監獄服刑中/);
  assert.match(page, /竊取現金/);
  assert.match(page, /每日最多 \$\{HACK_DAILY_LIMIT\} 次/);
  assert.match(page, /設定大橋頭地盤/);
  assert.match(page, /監獄服刑 ·/);
  assert.match(schema, /territoryVisitLog = sqliteTable\("territory_visit_log"/);
  assert.match(migration, /ALTER TABLE `players` ADD COLUMN `prison_until`/);
  assert.match(migration, /CREATE TABLE `territory_visit_log`/);
  assert.match(migration, /idx_territory_visit_owner_day/);
});

test("production API origin and CORS allow both published frontends", async () => {
  const env = await readFile(new URL(".env.production", root), "utf8");
  const wrangler = await readFile(new URL("wrangler.jsonc", root), "utf8");
  const worker = await readFile(new URL("worker/index.ts", root), "utf8");

  assert.match(env, /VITE_API_ORIGIN=https:\/\/life-online-api\.yuiban76-life-online\.workers\.dev/);
  assert.match(wrangler, /https:\/\/yuiban76\.github\.io,https:\/\/life-online-game\.alert-joy-9259\.chatgpt\.site/);
  assert.match(worker, /split\("[,]"\)/);
  assert.match(worker, /allowedOrigins\.includes\(origin\)/);
});

test("medical career adds health support, hospital discounts, and guarded player treatment", async () => {
  const jobs = await readFile(new URL("shared/jobs.ts", root), "utf8");
  const worker = await readFile(new URL("worker/index.ts", root), "utf8");
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  const schema = await readFile(new URL("db/schema.ts", root), "utf8");
  const migration = await readFile(new URL("drizzle/0020_old_starfox.sql", root), "utf8");

  assert.match(jobs, /jobs: \["診所助理", "護理師", "資深護理師", "護理長"\]/);
  assert.match(jobs, /"護理師": \{ name: "輪班津貼", hours: 9, minutes: 3 \}/);
  assert.match(jobs, /"診所助理": 0\.05/);
  assert.match(jobs, /"護理師": \{ name: "護理師照護", health: 20, price: 300, minutes: 15 \}/);
  assert.match(worker, /MEDICAL_REQUEST_TIMEOUT_MS = 30_000/);
  assert.match(worker, /case "medical_request"/);
  assert.match(worker, /case "medical_response"/);
  assert.match(worker, /current\.health >= 100/);
  assert.match(worker, /expires_at>\?/);
  assert.match(worker, /provider\.current_job !== medicalRequest\.provider_job/);
  assert.match(worker, /patient\.cash < medicalRequest\.amount/);
  assert.match(worker, /medicalWorkHealthBonusFor\(next\.current_job\)/);
  assert.match(worker, /Math\.max\(careerDiscount, memoryDiscount\)/);
  assert.match(page, /請求治療/);
  assert.match(page, /玩家治療請求/);
  assert.match(page, /medical_response/);
  assert.match(schema, /playerMedicalRequests = sqliteTable\("player_medical_requests"/);
  assert.match(migration, /CREATE TABLE `player_medical_requests`/);
  assert.match(migration, /idx_medical_requests_provider_status/);
});

test("finance career improves deposits and mediates uncapped bank-funded player loans", async () => {
  const jobs = await readFile(new URL("shared/jobs.ts", root), "utf8");
  const worker = await readFile(new URL("worker/index.ts", root), "utf8");
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  const schema = await readFile(new URL("db/schema.ts", root), "utf8");
  const migration = await readFile(new URL("drizzle/0021_amusing_thanos.sql", root), "utf8");

  assert.match(jobs, /jobs: \["銀行員", "理財專員", "投資顧問", "分行經理"\]/);
  assert.match(jobs, /"銀行員": 12/);
  assert.match(jobs, /"分行經理": \{ rateBp: 40, spreadBp: 10 \}/);
  assert.match(worker, /case "loan_request"/);
  assert.match(worker, /case "loan_response"/);
  assert.match(worker, /銀行撥款 NT\$\$\{loanRequest\.amount\}/);
  assert.match(worker, /player_loan_contracts SET outstanding_balance/);
  assert.doesNotMatch(worker, /provider.*active.*3/);
  assert.match(page, /借款方案/);
  assert.match(page, /玩家貸款申請/);
  assert.match(page, /銀行撥款/);
  assert.match(schema, /playerLoanRequests = sqliteTable\("player_loan_requests"/);
  assert.match(schema, /playerLoanContracts = sqliteTable\("player_loan_contracts"/);
  assert.match(migration, /CREATE TABLE `player_loan_requests`/);
  assert.match(migration, /CREATE TABLE `player_loan_contracts`/);
  assert.match(migration, /idx_loan_contracts_provider_status/);
});

test("literary career provides daily writing, fan promotion, and bookstore publishing", async () => {
  const jobs = await readFile(new URL("shared/jobs.ts", root), "utf8");
  const world = await readFile(new URL("shared/world.ts", root), "utf8");
  const worker = await readFile(new URL("worker/index.ts", root), "utf8");
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  const schema = await readFile(new URL("db/schema.ts", root), "utf8");

  assert.match(jobs, /id: "literary", label: "文學作家", jobs: \["寫作助理", "無名作家", "簽約作家", "暢銷作家"\]/);
  assert.match(jobs, /WRITER_FAN_THRESHOLDS = \[0, 100, 500, 2_000\]/);
  assert.match(jobs, /WRITER_DAILY_WRITING_LIMIT = 2/);
  assert.match(jobs, /WRITER_MAX_ACTIVE_BOOKS = 10/);
  assert.match(jobs, /WRITER_MAX_PURCHASES_PER_BOOK = 10/);
  assert.match(worker, /case "writer_write"/);
  assert.match(worker, /WRITER_DAILY_WRITING_LIMIT/);
  assert.match(worker, /case "book_publish"/);
  assert.match(worker, /case "book_toggle"/);
  assert.match(worker, /case "book_buy"/);
  assert.match(worker, /UPDATE players SET cash=cash-\?/);
  assert.match(worker, /UPDATE players SET cash=cash\+\?/);
  assert.match(page, /城市書店/);
  assert.match(page, /<BookStorePanel/);
  assert.match(page, /今日寫作/);
  assert.doesNotMatch(page, /mood|心情/);
  assert.match(worker, /DROP COLUMN mood/);
  assert.match(world, /bookstore: \{ open: 7 \* 60, close: 23 \* 60, label: "07:00～23:00" \}/);
  assert.match(schema, /writerBooks = sqliteTable\("writer_books"/);
  assert.match(schema, /writerBookPurchases = sqliteTable\("writer_book_purchases"/);
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
  assert.match(page, /城市記憶/);
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

test("ability history shows numeric progress and its display cap", async () => {
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  const jobs = await readFile(new URL("shared/jobs.ts", root), "utf8");

  assert.match(page, /能力值 \/ 上限 \{ABILITY_MAX\}/);
  assert.match(page, /<strong>\{displayedExp\} \/ \{ABILITY_MAX\}<\/strong>/);
  assert.match(jobs, /export const ABILITY_MAX = 1500/);
  assert.match(page, /Math\.min\(ABILITY_MAX, Math\.max\(0, exp\)\)/);
  assert.doesNotMatch(page, /<strong>Lv\.\{level\(exp\)\}<\/strong>/);
});

test("critical multiplayer integrity fixes stay wired", async () => {
  const worker = await readFile(new URL("worker/index.ts", root), "utf8");

  assert.doesNotMatch(worker, /action_available_at\+\(\?-last_seen_at\)/);
  assert.match(worker, /status='accepted', outcome='treated'.*RETURNING id/s);
  assert.match(worker, /status='accepted' AND outcome='treated'.*RETURNING user_id/s);
  assert.doesNotMatch(worker, /round\.pot \+ added/);
  assert.match(worker, /POKER_ACTION_TIMEOUT_MS = 90_000/);
  assert.match(worker, /async function resolveExpiredPokerTurn/);
  assert.match(worker, /\["playing", "all_in", "folded", "settling"\]\.includes\(active\.status\)/);
  assert.match(worker, /DELETE FROM writer_books WHERE author_id=\?/);
  assert.match(worker, /DELETE FROM casino_tournament_entries WHERE user_id=\?/);
  assert.match(worker, /provider_id='bank'[^]*spread_bp=0/);
  assert.match(worker, /Math\.min\(ABILITY_MAX, next\.fitness_exp \+ gain\)/);
  assert.match(worker, /cash=cash\+territory_pending, territory_pending=0/);
  assert.match(worker, /status IN \('dealing','playing','drawing','stood','settling'\)/);
  assert.match(worker, /INSERT INTO casino_bingo_entries[\s\S]*life_version[\s\S]*SELECT \?, \?, \?, \?, \? WHERE/);
  assert.match(worker, /INSERT INTO casino_tournament_entries[\s\S]*life_version[\s\S]*SELECT \?, \?, \?, \? WHERE/);
  assert.match(worker, /game_over='__resetting__'/);
  assert.match(worker, /finance_day=\? AND updated_at=\?[^]*RETURNING user_id/);
  assert.doesNotMatch(worker, /UPDATE players SET cash=cash\+\?, updated_at=\?, last_seen_at=\? WHERE user_id=\?/);
});

test("money mutations and new-life multiplayer data are guarded", async () => {
  const worker = await readFile(new URL("worker/index.ts", root), "utf8");
  const schema = await readFile(new URL("db/schema.ts", root), "utf8");

  assert.match(schema, /lifeVersion: integer\("life_version"\)/);
  assert.match(schema, /mutationToken: text\("mutation_token"\)/);
  assert.match(worker, /sender_life_version, recipient_life_version/);
  assert.match(worker, /patient_life_version, provider_life_version/);
  assert.match(worker, /borrower_life_version, provider_life_version, revision, mutation_token/);
  assert.match(worker, /buyer_life_version, author_life_version/);
  assert.match(worker, /const resetGate = `EXISTS \(SELECT 1 FROM players reset_owner/);
  assert.match(worker, /mutation_token=\?[^]*reset_game_over=''[^]*game_over<>'__resetting__'/);
});

test("casino draw operations use atomic round and action tokens", async () => {
  const worker = await readFile(new URL("worker/index.ts", root), "utf8");

  assert.match(worker, /INSERT INTO casino_table_state \(id, deck, round_token, action_token, updated_at\)/);
  assert.match(worker, /UPDATE casino_table_state SET deck=\?, action_token=\?, updated_at=\?/);
  assert.match(worker, /EXISTS \(SELECT 1 FROM casino_table_state WHERE id='table-01' AND round_token=\? AND action_token=\?\)/);
  assert.match(worker, /UPDATE casino_tournament_rounds SET deck=\?, next_action_at=\?, action_token=\?, updated_at=\?/);
  assert.match(worker, /if \(previousTurn < 0\)[^]*action_token=''/);
  assert.doesNotMatch(worker, /UPDATE casino_hands SET status='drawing'/);
});

test("placeholder weather and age labels are not shown", async () => {
  const page = await readFile(new URL("app/page.tsx", root), "utf8");

  assert.doesNotMatch(page, /\u53f0\u5317 \u00b7 \u6674\u6717 27\u00b0/);
  assert.doesNotMatch(page, /18 \u6b72 \u00b7 \u4eba\u751f\u65b0\u624b/);
});

test("city locations use a unified SVG icon system while casino keeps its photo", async () => {
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  const styles = await readFile(new URL("app/globals.css", root), "utf8");
  const icon = await readFile(new URL("public/casino-icon.png", root));

  assert.match(page, /function LocationIcon/);
  assert.match(page, /className={`location-glyph/);
  assert.match(page, /aria-hidden="true"/);
  assert.match(styles, /\.location-glyph svg/);
  assert.match(styles, /\.location-strip button\.active \.location-glyph/);
  assert.match(page, /image: "\.\/casino-icon\.png"/);
  assert.match(page, /className="location-photo"/);
  assert.ok(icon.length > 0);
});

test("innovative city systems keep their multiplayer rules and personal records", async () => {
  const worker = await readFile(new URL("worker/index.ts", root), "utf8");
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  const schema = await readFile(new URL("db/schema.ts", root), "utf8");

  assert.match(schema, /export const playerReputation/);
  assert.match(schema, /export const cityCommissionClaims/);
  assert.match(schema, /export const lifeContracts/);
  assert.match(worker, /case "city_commission"/);
  assert.match(worker, /case "contract_create"/);
  assert.match(worker, /case "contract_accept"/);
  assert.match(worker, /case "contract_deposit"/);
  assert.match(worker, /async function lifeLedgerState/);
  assert.match(worker, /Math\.min\(30, Math\.floor\(points \/ 50\) \* 10\)/);
  assert.match(page, /城市委託/);
  assert.match(page, /人生契約/);
  assert.match(page, /城市傳聞/);
  assert.match(page, /人生紀錄/);
});

test("city pulse UI keeps the mobile game areas accessible", async () => {
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  const css = await readFile(new URL("app/globals.css", root), "utf8");

  assert.match(page, /className={`game-grid view-\${mobileView}`}/);
  assert.match(page, /className="mobile-dock" aria-label="主要遊戲區域"/);
  assert.match(page, /<MobileNavIcon name="city"/);
  assert.match(page, /<MobileNavIcon name="life"/);
  assert.match(page, /<MobileNavIcon name="social"/);
  assert.match(page, /className="skip-link" href="#city-actions"/);
  assert.match(css, /CITY PULSE UI/);
  assert.match(css, /\.game-grid\.view-city \.world-panel/);
  assert.match(css, /\.game-grid\.view-life \.character-panel/);
  assert.match(css, /\.game-grid\.view-social \.story-panel/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});

test("dense game information is grouped behind clear disclosures and tabs", async () => {
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  const css = await readFile(new URL("app/globals.css", root), "utf8");

  assert.match(page, /<details className="life-details">/);
  assert.match(page, /更多人生資料/);
  assert.match(page, /useState<"players" \| "tasks" \| "records">\("players"\)/);
  assert.match(page, /role="tablist" aria-label="多人世界內容"/);
  assert.match(page, />玩家<\/button>/);
  assert.match(page, />任務<\/button>/);
  assert.match(page, />紀錄<\/button>/);
  assert.doesNotMatch(page, /<div className="stage-number">/);
  assert.doesNotMatch(page, /CITY · LOBBY 01/);
  assert.match(css, /Information triage/);
  assert.match(css, /\.location-strip button:not\(\.closed\) em/);
  assert.match(page, /className="story-tab-panel records-panel"/);
  assert.match(css, /\.records-panel \{\s*grid-template-columns: minmax\(0, 1fr\)/s);
  assert.match(css, /\.records-panel \.feed-heading[\s\S]*?grid-row: auto/);
  assert.match(css, /\.story-panel > \.story-tab-panel/);
});

test("location NPCs provide durable relationships, daily choices, and career services", async () => {
  const worker = await readFile(new URL("worker/index.ts", root), "utf8");
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  const css = await readFile(new URL("app/globals.css", root), "utf8");
  const schema = await readFile(new URL("db/schema.ts", root), "utf8");
  const npcs = await readFile(new URL("shared/npcs.ts", root), "utf8");

  assert.match(npcs, /name: "江叔"/);
  assert.match(npcs, /name: "林護理長"/);
  assert.match(npcs, /name: "周專員"/);
  assert.match(npcs, /name: "沈店長"/);
  assert.match(npcs, /id: "lost_watch"/);
  assert.match(npcs, /requiredCategory: "hospitality"/);
  assert.match(npcs, /requiredCategory: "medical"/);
  assert.match(npcs, /requiredCategory: "finance"/);
  assert.match(npcs, /requiredCategory: "literary"/);
  assert.match(schema, /export const playerNpcRelationships/);
  assert.match(schema, /export const playerNpcStory/);
  assert.match(schema, /export const playerNpcInteractions/);
  assert.match(worker, /case "npc_interact"/);
  assert.match(worker, /last_interaction_day/);
  assert.match(worker, /npcAvailableAt\(npc, sharedMinutes\)/);
  assert.match(page, /<NpcResidents/);
  assert.match(page, /<NpcDialogue/);
  assert.match(page, /role="dialog" aria-modal="true"/);
  assert.match(css, /\.npc-resident-card > button \{[^}]*min-height: 44px/s);
  assert.match(css, /max-height: min\(90dvh, 760px\)/);
});

test("home location provides bounded daily activities and comfort upgrades", async () => {
  const worker = await readFile(new URL("worker/index.ts", root), "utf8");
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  const schema = await readFile(new URL("db/schema.ts", root), "utf8");
  const migration = await readFile(new URL("drizzle/0030_cozy_home_life.sql", root), "utf8");
  const housing = await readFile(new URL("shared/housing.ts", root), "utf8");

  assert.match(housing, /HOME_DAILY_COOK_LIMIT = 2/);
  assert.match(housing, /HOME_NAP_WAIT_SECONDS = 30/);
  assert.match(worker, /case "home"/);
  assert.match(worker, /home_cook_uses/);
  assert.match(worker, /home_chore_done/);
  assert.match(worker, /talentExpGain \+= 2/);
  assert.match(worker, /homeSleepBenefits\(next\.home_comfort\)/);
  assert.match(page, /住所舒適度 \{player\.homeComfort\}\/3/);
  assert.match(page, /短暫小睡/);
  assert.match(page, /居家料理/);
  assert.match(page, /整理生活空間/);
  assert.match(page, /永久升級/);
  assert.match(schema, /homeComfort: integer\("home_comfort"/);
  assert.match(migration, /ADD COLUMN `home_comfort`/);
  assert.match(migration, /ADD COLUMN `home_chore_done`/);
});

test("three-day life rhythm connects existing play without creating cash inflation", async () => {
  const rules = await readFile(new URL("shared/lifeRhythm.ts", root), "utf8");
  const worker = await readFile(new URL("worker/index.ts", root), "utf8");
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  const css = await readFile(new URL("app/globals.css", root), "utf8");
  const schema = await readFile(new URL("db/schema.ts", root), "utf8");
  const migration = await readFile(new URL("drizzle/0031_life_rhythm.sql", root), "utf8");

  assert.match(rules, /LIFE_PLAN_CYCLE_DAYS = 3/);
  assert.match(rules, /title: "債務整頓"/);
  assert.match(rules, /title: "職涯突破"/);
  assert.match(rules, /title: "健康生活"/);
  assert.match(rules, /title: "社會連結"/);
  assert.doesNotMatch(rules, /cash|現金獎勵|金錢獎勵/i);
  assert.match(schema, /playerLifePlans = sqliteTable\("player_life_plans"/);
  assert.match(schema, /playerLifePlanMarkers = sqliteTable\("player_life_plan_markers"/);
  assert.match(migration, /CREATE TABLE `player_life_plans`/);
  assert.match(migration, /CREATE TABLE `player_life_plan_markers`/);
  assert.match(worker, /case "life_plan_start"/);
  assert.match(worker, /async function settleExpiredLifePlan/);
  assert.match(worker, /async function addLifePlanSocialPair/);
  assert.match(worker, /effect_consumed_at IS NULL/);
  assert.match(worker, /lifeRhythm: rhythm/);
  assert.match(page, /<LifeRhythmPanel/);
  assert.match(page, /人生節奏是什麼？/);
  assert.match(page, /三個玩家日等於在線遊玩 72 分鐘/);
  assert.match(page, /失敗不會遊戲結束/);
  assert.match(css, /\.life-rhythm-guide-overlay/);
  assert.match(css, /\.life-rhythm-choices > div/);
  assert.match(css, /@media \(max-width: 760px\)/);
});

test("city favor network turns NPC trust into one bounded daily choice", async () => {
  const rules = await readFile(new URL("shared/npcs.ts", root), "utf8");
  const worker = await readFile(new URL("worker/index.ts", root), "utf8");
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  const css = await readFile(new URL("app/globals.css", root), "utf8");
  const schema = await readFile(new URL("db/schema.ts", root), "utf8");
  const migration = await readFile(new URL("drizzle/0032_city_favor_network.sql", root), "utf8");

  assert.match(rules, /NPC_FAVOR_UNLOCK_POINTS = 20/);
  assert.match(rules, /NPC_FAVOR_TRUSTED_POINTS = 50/);
  assert.match(rules, /title: "熱食與歇腳"/);
  assert.match(rules, /title: "健康評估"/);
  assert.match(rules, /title: "財務整理指導"/);
  assert.match(rules, /title: "閱讀與選書建議"/);
  assert.doesNotMatch(rules.slice(rules.indexOf("NPC_FAVORS"), rules.indexOf("export const NPCS")), /cash|money|現金/i);
  assert.match(schema, /playerNpcFavors = sqliteTable\("player_npc_favors"/);
  assert.match(migration, /PRIMARY KEY\(`user_id`, `life_version`, `play_day`\)/);
  assert.match(worker, /case "npc_favor"/);
  assert.match(worker, /action_token=\?/);
  assert.match(worker, /今天已向.*請求過協助/);
  assert.match(worker, /"npc_interact", "npc_favor"/);
  assert.match(page, /CITY FAVOR/);
  assert.match(page, /每個玩家日只能向一名居民請求協助/);
  assert.match(page, /role="progressbar"/);
  assert.match(css, /\.npc-favor-panel/);
  assert.match(css, /\.npc-relation-meter/);
});
