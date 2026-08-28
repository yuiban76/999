import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const origin = process.env.TEST_API_ORIGIN || "http://127.0.0.1:8788";
const wrangler = path.join(projectRoot, "node_modules", "wrangler", "bin", "wrangler.js");

function log(message) {
  process.stdout.write(`\u2714 ${message}\n`);
}

async function request(pathname, { token, body, expected = 200 } = {}) {
  const response = await fetch(`${origin}${pathname}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const payload = await response.json();
  assert.equal(response.status, expected, `${pathname}: ${payload.message || response.statusText}`);
  return payload;
}

async function action(token, body, expected = 200) {
  return request("/api/game/action", { token, body, expected });
}

async function casinoAction(token, body, expected = 200) {
  return request("/api/casino/action", { token, body, expected });
}

async function pokerAction(token, body, expected = 200) {
  return request("/api/poker/action", { token, body, expected });
}

function seedPlayers(sql) {
  execFileSync(process.execPath, [wrangler, "d1", "execute", "life-online-db", "--local", "--command", sql], {
    cwd: projectRoot,
    stdio: "ignore",
  });
}

async function register(label) {
  const suffix = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  const result = await request("/api/auth/register", {
    body: {
      email: `${label}-${suffix}@smoke.test`,
      password: `Smoke-${randomUUID()}!`,
      displayName: `驗收${label}${suffix.slice(-4)}`,
    },
    expected: 201,
  });
  await request("/api/game", { token: result.token });
  await action(result.token, { action: "choose_story", story: "prodigal_return" });
  return { id: result.profile.id, token: result.token };
}

const [playerA, playerB] = await Promise.all([register("甲"), register("乙")]);
const now = Date.now();
seedPlayers(`UPDATE players SET main_story='legacy', cash=100000, bank_balance=10000, loan_balance=0,
  health=60, location='realtor', current_job='unemployed', job_category='unfixed', job_exp=0,
  action_available_at=0, action_label='', game_over='', reset_game_over='', last_seen_at=${now}, updated_at=${now}
  WHERE user_id IN ('${playerA.id}', '${playerB.id}')`);
await Promise.all([request("/api/game", { token: playerA.token }), request("/api/game", { token: playerB.token })]);

// A gift is claimed by exactly one of two simultaneous responses.
await action(playerA.token, { action: "transfer_request", kind: "gift", amount: 1000, targetId: playerB.id });
const giftInbox = await request("/api/game", { token: playerB.token });
assert.equal(giftInbox.transferRequests.length, 1);
const giftId = giftInbox.transferRequests[0].id;
const giftResponses = await Promise.all([
  action(playerB.token, { action: "transfer_response", requestId: giftId, kind: "accept" }),
  action(playerB.token, { action: "transfer_response", requestId: giftId, kind: "accept" }),
]);
assert.equal(giftResponses.filter((item) => item.message.includes("收下")).length, 1);
const [afterGiftA, afterGiftB] = await Promise.all([
  request("/api/game", { token: playerA.token }),
  request("/api/game", { token: playerB.token }),
]);
assert.equal(afterGiftA.player.cash, 99000);
assert.equal(afterGiftB.player.cash, 101000);
log("同時接受贈送只會結算一次");

// A pending request must not survive a new-life reset.
await action(playerA.token, { action: "transfer_request", kind: "gift", amount: 250, targetId: playerB.id });
const pendingBeforeReset = await request("/api/game", { token: playerB.token });
assert.equal(pendingBeforeReset.transferRequests.length, 1);
const staleGiftId = pendingBeforeReset.transferRequests[0].id;
await action(playerA.token, { action: "reset" });
const staleResponse = await action(playerB.token, { action: "transfer_response", requestId: staleGiftId, kind: "accept" });
assert.match(staleResponse.message, /失效|已被處理/);
const afterResetB = await request("/api/game", { token: playerB.token });
assert.equal(afterResetB.transferRequests.length, 0);
log("重新開始人生會清除舊現金邀請");

// Restore A after the reset, then settle player treatment exactly once.
const medicalSeedNow = Date.now();
seedPlayers(`UPDATE players SET main_story='legacy', cash=100000, bank_balance=10000, loan_balance=0,
  health=40, location='hospital', current_job='unemployed', job_category='unfixed', action_available_at=0,
  game_over='', reset_game_over='', last_seen_at=${medicalSeedNow}, updated_at=${medicalSeedNow}
  WHERE user_id='${playerA.id}';
  UPDATE players SET main_story='legacy', current_job='護理師', job_category='medical', action_available_at=0,
  game_over='', reset_game_over='', last_seen_at=${medicalSeedNow}, updated_at=${medicalSeedNow}
  WHERE user_id='${playerB.id}'`);
await Promise.all([request("/api/game", { token: playerA.token }), request("/api/game", { token: playerB.token })]);
await action(playerA.token, { action: "medical_request", targetId: playerB.id });
const medicalInbox = await request("/api/game", { token: playerB.token });
assert.equal(medicalInbox.medicalRequests.length, 1);
const medical = medicalInbox.medicalRequests[0];
const patientCashBefore = (await request("/api/game", { token: playerA.token })).player.cash;
const providerCashBefore = medicalInbox.player.cash;
const medicalResponses = await Promise.all([
  action(playerB.token, { action: "medical_response", medicalRequestId: medical.id, kind: "accept" }),
  action(playerB.token, { action: "medical_response", medicalRequestId: medical.id, kind: "accept" }),
]);
assert.equal(medicalResponses.filter((item) => item.message.includes("治療完成")).length, 1);
const [afterMedicalA, afterMedicalB] = await Promise.all([
  request("/api/game", { token: playerA.token }),
  request("/api/game", { token: playerB.token }),
]);
assert.equal(afterMedicalA.player.cash, patientCashBefore - medical.amount);
assert.equal(afterMedicalA.player.health, Math.min(100, 40 + medical.healthGain));
assert.equal(afterMedicalB.player.cash, providerCashBefore + medical.amount);
log("玩家治療同時接受只會收費與恢復一次");

// Bank-funded player loans are also single-settlement under duplicate responses.
const loanSeedNow = Date.now();
seedPlayers(`UPDATE players SET main_story='legacy', loan_balance=0, action_available_at=0,
  game_over='', reset_game_over='', last_seen_at=${loanSeedNow}, updated_at=${loanSeedNow}
  WHERE user_id='${playerA.id}';
  UPDATE players SET main_story='legacy', current_job='銀行員', job_category='finance', action_available_at=0,
  game_over='', reset_game_over='', last_seen_at=${loanSeedNow}, updated_at=${loanSeedNow}
  WHERE user_id='${playerB.id}'`);
await Promise.all([request("/api/game", { token: playerA.token }), request("/api/game", { token: playerB.token })]);
const borrowerCashBefore = (await request("/api/game", { token: playerA.token })).player.cash;
await action(playerA.token, { action: "loan_request", targetId: playerB.id, amount: 5000 });
const loanInbox = await request("/api/game", { token: playerB.token });
assert.equal(loanInbox.loanRequests.length, 1);
const loanId = loanInbox.loanRequests[0].id;
const loanResponses = await Promise.all([
  action(playerB.token, { action: "loan_response", loanRequestId: loanId, kind: "accept" }),
  action(playerB.token, { action: "loan_response", loanRequestId: loanId, kind: "accept" }),
]);
assert.equal(loanResponses.filter((item) => item.message.includes("貸款申請已成立")).length, 1);
const afterLoanA = await request("/api/game", { token: playerA.token });
assert.equal(afterLoanA.player.cash, borrowerCashBefore + 5000);
assert.equal(afterLoanA.player.loanBalance, 5000);
log("玩家貸款同時接受只會撥款一次");

// Both players keep the same cards and seats after a quiet period/reconnect.
const casinoSeedNow = Date.now();
seedPlayers(`DELETE FROM casino_hands WHERE user_id IN ('${playerA.id}', '${playerB.id}');
  UPDATE players SET cash=100000, location='casino', action_available_at=0, game_over='', reset_game_over='',
    last_seen_at=${casinoSeedNow}, updated_at=${casinoSeedNow}
  WHERE user_id IN ('${playerA.id}', '${playerB.id}')`);
await Promise.all([request("/api/game", { token: playerA.token }), request("/api/game", { token: playerB.token })]);
await casinoAction(playerA.token, { action: "join", seatNo: 1 });
await casinoAction(playerB.token, { action: "join", seatNo: 2 });
await casinoAction(playerA.token, { action: "deal", bet: 100 });
await casinoAction(playerB.token, { action: "deal", bet: 100 });
await new Promise((resolve) => setTimeout(resolve, 5200));
const [reconnectedA, reconnectedB] = await Promise.all([
  request("/api/game", { token: playerA.token }),
  request("/api/game", { token: playerB.token }),
]);
assert.equal(reconnectedA.casino.activeCount, 2);
assert.equal(reconnectedB.casino.activeCount, 2);
assert.equal(reconnectedA.casino.hand.seatNo, 1);
assert.equal(reconnectedB.casino.hand.seatNo, 2);
assert.equal(reconnectedA.casino.hand.playerCards.length, 2);
assert.equal(reconnectedB.casino.hand.playerCards.length, 2);
if (reconnectedA.casino.hand.status === "playing") await casinoAction(playerA.token, { action: "stand" });
if (reconnectedB.casino.hand.status === "playing") await casinoAction(playerB.token, { action: "stand" });
const [settledA, settledB] = await Promise.all([
  request("/api/game", { token: playerA.token }),
  request("/api/game", { token: playerB.token }),
]);
assert.equal(settledA.casino.hand.status, "seated");
assert.equal(settledB.casino.hand.status, "seated");
assert.ok(settledA.casino.hand.result);
assert.ok(settledB.casino.hand.result);
await casinoAction(playerA.token, { action: "leave" });
await casinoAction(playerB.token, { action: "leave" });
log("二十一點等待、重連、共同牌局與結算狀態一致");

// Two all-in players remain eligible for the same showdown; fold also settles.
const pokerSeedNow = Date.now();
seedPlayers(`DELETE FROM poker_hands WHERE user_id IN ('${playerA.id}', '${playerB.id}');
  UPDATE poker_table_state SET deck='[]', community_cards='[]', street='idle', current_bet=0,
    turn_seat=0, pot=0, status='idle', round_token='', action_token='', updated_at=${pokerSeedNow}
    WHERE id='table-01';
  UPDATE players SET cash=1000, location='casino', action_available_at=0, game_over='', reset_game_over='',
    last_seen_at=${pokerSeedNow}, updated_at=${pokerSeedNow}, mutation_token=''
  WHERE user_id IN ('${playerA.id}', '${playerB.id}')`);
await pokerAction(playerA.token, { action: "join", seatNo: 1 });
await pokerAction(playerB.token, { action: "join", seatNo: 4 });
await pokerAction(playerA.token, { action: "ready" });
await pokerAction(playerB.token, { action: "ready" });
await pokerAction(playerA.token, { action: "start", bet: 100 });
const pokerReconnect = await request("/api/game", { token: playerA.token });
assert.equal(pokerReconnect.poker.hand.isTurn, true);
assert.equal(pokerReconnect.poker.hand.cards.length, 2);
await pokerAction(playerA.token, { action: "all_in" });
const pokerTurnB = await request("/api/game", { token: playerB.token });
assert.equal(pokerTurnB.poker.hand.isTurn, true);
await pokerAction(playerB.token, { action: "all_in" });
const [showdownA, showdownB] = await Promise.all([
  request("/api/game", { token: playerA.token }),
  request("/api/game", { token: playerB.token }),
]);
assert.equal(showdownA.poker.hand.status, "seated");
assert.equal(showdownB.poker.hand.status, "seated");
assert.ok(showdownA.poker.hand.result);
assert.ok(showdownB.poker.hand.result);
assert.equal(showdownA.poker.communityCards.length, 5);

const foldSeedNow = Date.now();
seedPlayers(`UPDATE players SET cash=1000, last_seen_at=${foldSeedNow}, updated_at=${foldSeedNow}, mutation_token=''
  WHERE user_id IN ('${playerA.id}', '${playerB.id}')`);
await pokerAction(playerA.token, { action: "ready" });
await pokerAction(playerB.token, { action: "ready" });
await pokerAction(playerA.token, { action: "start", bet: 100 });
await pokerAction(playerA.token, { action: "fold" });
const folded = await request("/api/game", { token: playerA.token });
assert.equal(folded.poker.hand.status, "seated");
assert.match(folded.poker.hand.result, /棄牌|輸|獲得/);
await pokerAction(playerA.token, { action: "leave" });
await pokerAction(playerB.token, { action: "leave" });
log("德州撲克重連、雙方全押攤牌與棄牌均可實際完成");

log("本機雙玩家多人交易驗收完成");
