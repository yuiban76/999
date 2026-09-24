import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";

const origin = process.env.TEST_API_ORIGIN || "http://127.0.0.1:8788";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const wrangler = path.join(root, "node_modules", "wrangler", "bin", "wrangler.js");

function seed(sql) {
  execFileSync(process.execPath, [wrangler, "d1", "execute", "life-online-db", "--local", "--command", sql], { cwd: root, stdio: "ignore" });
}

async function request(path, token, body, expected = 200) {
  const response = await fetch(`${origin}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const value = await response.json();
  if (expected === "any") return { status: response.status, value };
  assert.equal(response.status, expected, `${path}: ${value.message || response.statusText}`);
  return value;
}

async function register(name) {
  const user = await request("/api/auth/register", null, {
    email: `last-chips-${randomUUID()}@smoke.test`, password: `Smoke-${randomUUID()}!`, displayName: name,
  }, 201);
  await request("/api/game", user.token);
  return user.token;
}

const [a, b, late] = await Promise.all([register("籌碼甲"), register("籌碼乙"), register("遲到隊友")]);
const created = await request("/api/last-chips/action", a, { action: "create" });
const code = created.lastChips.room.code;
assert.match(code, /^[A-HJ-NP-Z2-9]{6}$/);
await request("/api/last-chips/action", b, { action: "join", code });
await request("/api/last-chips/action", a, { action: "ready" });
await request("/api/last-chips/action", a, { action: "start" }, 409);
await request("/api/last-chips/action", b, { action: "ready" });
const started = await request("/api/last-chips/action", a, { action: "start" });
assert.equal(started.lastChips.room.status, "active");
assert.equal(started.lastChips.room.bankroll, 100_000);
assert.equal(started.lastChips.room.debt, 250_000);
assert.equal(started.lastChips.room.members.length, 2);
await request("/api/last-chips/action", late, { action: "join", code }, 404);
await request("/api/game/action", a, { action: "work", hours: 1 }, 409);
const payment = await request("/api/last-chips/action", b, { action: "repay", amount: 1_000 });
assert.equal(payment.lastChips.room.bankroll, 99_000);
assert.equal(payment.lastChips.room.debt, 249_000);
assert.equal((await request("/api/game", a)).player.cash, 99_000);
await request("/api/casino/action", a, { action: "join", seatNo: 3 });
await request("/api/casino/action", b, { action: "join", seatNo: 4 });
await request("/api/casino/action", a, { action: "deal", bet: 500 });
await request("/api/casino/action", b, { action: "deal", bet: 700 });
const duringRound = await request("/api/game", a);
assert.equal(duringRound.lastChips.room.bankroll, 97_800);
assert.equal((await request("/api/game", b)).player.cash, 97_800);
const bets = duringRound.lastChips.room.members.map((member) => member.totalBet);
assert.deepEqual(bets, [500, 700]);
await request("/api/casino/action", a, { action: "leave" });
await request("/api/casino/action", b, { action: "leave" });
const beforeNpc = (await request("/api/game", a)).lastChips.room.bankroll;
await request("/api/poker/action", a, { action: "npc_start", npcCount: 2, bigBlind: 10 });
const afterNpc = await request("/api/game", b);
assert.equal(afterNpc.lastChips.room.bankroll, beforeNpc - 300);
assert.equal(afterNpc.player.cash, beforeNpc - 300);
const chapter = await request("/api/last-chips/action", b, { action: "repay", amount: 49_000 });
assert.equal(chapter.lastChips.room.debt, 200_000);
assert.equal(chapter.lastChips.room.chapter, 1);
assert.equal(chapter.lastChips.room.members[1].net, -700);
process.stdout.write("✔ 房間邀請、全員準備、固定成員與共用賭本通過\n");

const solo = await register("獨行籌碼");
await request("/api/last-chips/action", solo, { action: "create" });
await request("/api/last-chips/action", solo, { action: "ready" });
await request("/api/last-chips/action", solo, { action: "start" });
const bankrupt = await request("/api/last-chips/action", solo, { action: "repay", amount: 100_000 });
assert.equal(bankrupt.lastChips.room.status, "bankrupt");
assert.equal(bankrupt.lastChips.room.bankroll, 0);
const restarted = await request("/api/game/action", solo, { action: "reset" });
assert.equal(restarted.player.mainStory, "unselected");
assert.equal(restarted.lastChips.history[0].status, "bankrupt");
process.stdout.write("✔ 破產、保留戰績與整局重來通過\n");

const overdue = await register("逾期籌碼");
const overdueRoom = await request("/api/last-chips/action", overdue, { action: "create" });
await request("/api/last-chips/action", overdue, { action: "ready" });
await request("/api/last-chips/action", overdue, { action: "start" });
const overdueCode = overdueRoom.lastChips.room.code;
const moveToDay = async (day) => {
  seed(`UPDATE last_chips_rooms SET elapsed_ms=${day * 86_400_000} WHERE code='${overdueCode}'`);
  return request("/api/game", overdue);
};
const firstDeadline = await moveToDay(3);
assert.equal(firstDeadline.lastChips.room.missedPeriods, 1);
assert.equal(firstDeadline.lastChips.room.bankroll, 100_000);
assert.ok(firstDeadline.lastChips.room.debt > 250_000);
await request("/api/last-chips/action", overdue, { action: "repay", amount: 500 });
const recovered = await moveToDay(6);
assert.equal(recovered.lastChips.room.missedPeriods, 0);
assert.equal(recovered.lastChips.room.bankroll, 99_500);
assert.equal((await moveToDay(9)).lastChips.room.missedPeriods, 1);
assert.equal((await moveToDay(12)).lastChips.room.status, "missed");
process.stdout.write("✔ 低利息、手動最低繳款與連續兩期未繳判定通過\n");

const [blindA, blindB] = await Promise.all([register("小盲籌碼"), register("大盲籌碼")]);
const blindRoom = await request("/api/last-chips/action", blindA, { action: "create" });
await request("/api/last-chips/action", blindB, { action: "join", code: blindRoom.lastChips.room.code });
await request("/api/last-chips/action", blindA, { action: "ready" });
await request("/api/last-chips/action", blindB, { action: "ready" });
await request("/api/last-chips/action", blindA, { action: "start" });
await request("/api/poker/action", blindA, { action: "join", seatNo: 4 });
await request("/api/poker/action", blindB, { action: "join", seatNo: 5 });
await request("/api/poker/action", blindA, { action: "ready" });
await request("/api/poker/action", blindB, { action: "ready" });
await request("/api/poker/action", blindA, { action: "start", tableId: "table-01" });
const blindSnapshot = await request("/api/game", blindA);
assert.equal(blindSnapshot.lastChips.room.bankroll, 99_850);
assert.equal(blindSnapshot.player.cash, 99_850);
assert.equal((await request("/api/game", blindB)).player.cash, 99_850);
assert.deepEqual(blindSnapshot.lastChips.room.members.map((member) => member.totalBet), [50, 100]);
process.stdout.write("✔ 多人德州固定大盲扣款後，全隊餘額保持一致\n");

await request("/api/baccarat/action", a, { action: "join", tableId: "baccarat-01" });
await request("/api/baccarat/action", b, { action: "join", tableId: "baccarat-01" });
const baccaratBefore = await request("/api/game", a);
const baccaratBalance = baccaratBefore.lastChips.room.bankroll;
const baccaratTotalsBefore = new Map(baccaratBefore.lastChips.room.members.map((member) => [member.id, member.totalBet]));
const concurrentBaccaratBets = await Promise.all([
  request("/api/baccarat/action", a, { action: "bet", tableId: "baccarat-01", side: "player", amount: 100 }),
  request("/api/baccarat/action", b, { action: "bet", tableId: "baccarat-01", side: "banker", amount: 200 }),
]);
assert.equal(concurrentBaccaratBets.filter((item) => item.baccarat?.players.some((member) => member.isMine && member.amount > 0)).length, 2);
const sharedBaccarat = await request("/api/game", b);
assert.equal(sharedBaccarat.lastChips.room.bankroll, baccaratBalance - 300);
assert.equal(sharedBaccarat.player.cash, baccaratBalance - 300);
assert.deepEqual(sharedBaccarat.lastChips.room.members.map((member) => member.totalBet - (baccaratTotalsBefore.get(member.id) ?? 0)).sort((left, right) => left - right), [100, 200]);
process.stdout.write("✔ 多名隊友同時下注百家樂會扣同一筆共用賭本並記錄個別下注\n");

const limitedTable = await request("/api/baccarat/action", a, { action: "create", tier: "low" });
const limitedTableId = limitedTable.baccarat.tableId;
await request("/api/baccarat/action", a, { action: "join", tableId: limitedTableId });
await request("/api/baccarat/action", b, { action: "join", tableId: limitedTableId });
const limitedRoom = sharedBaccarat.lastChips.room;
const limitedMemberIds = limitedRoom.members.map((member) => `'${member.id}'`).join(",");
seed(`UPDATE last_chips_rooms SET bankroll=250,wallet_sync=1 WHERE code='${limitedRoom.code}';
  UPDATE players SET cash=250 WHERE user_id IN (${limitedMemberIds});
  UPDATE last_chips_rooms SET wallet_sync=0 WHERE code='${limitedRoom.code}';`);
const constrainedBets = await Promise.all([
  request("/api/baccarat/action", a, { action: "bet", tableId: limitedTableId, side: "player", amount: 200 }, "any"),
  request("/api/baccarat/action", b, { action: "bet", tableId: limitedTableId, side: "banker", amount: 200 }, "any"),
]);
assert.deepEqual(constrainedBets.map((item) => item.status).sort((left, right) => left - right), [200, 409]);
const limitedBalance = await request("/api/game", a);
assert.equal(limitedBalance.lastChips.room.bankroll, 50);
assert.equal(limitedBalance.player.cash, 50);
assert.equal((await request("/api/game", b)).player.cash, 50);
process.stdout.write("✔ 共用賭本不足以承受兩筆並行百家樂下注時，只會接受一筆且不超支\n");
