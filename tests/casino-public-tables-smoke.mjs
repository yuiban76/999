import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const origin = process.env.TEST_API_ORIGIN || "http://127.0.0.1:8788";
const wrangler = path.join(root, "node_modules", "wrangler", "bin", "wrangler.js");
const persistTo = process.env.TEST_D1_PERSIST_TO;
const log = (message) => process.stdout.write(`✔ ${message}\n`);

async function request(pathname, { token, body, expected = 200 } = {}) {
  const response = await fetch(`${origin}${pathname}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const value = await response.json();
  assert.equal(response.status, expected, `${pathname}: ${value.message || response.statusText}`);
  return value;
}

const seed = (sql) => execFileSync(process.execPath, [wrangler, "d1", "execute", "life-online-db", "--local", ...(persistTo ? ["--persist-to", path.resolve(root, persistTo)] : []), "--command", sql], { cwd: root, stdio: "ignore" });
function deterministicBaccaratShoe(winner) {
  const suits = ["♠", "♥", "♦", "♣"];
  const ranks = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
  const shoe = Array.from({ length: 8 }, () => suits.flatMap((suit) => ranks.map((rank) => `${rank}${suit}`))).flat();
  const tail = winner === "banker" ? ["2♦", "7♣", "3♥", "5♠"] : winner === "player" ? ["2♣", "6♦", "K♠", "9♥"] : ["2♣", "6♦", "3♥", "5♠"];
  for (const card of tail) {
    const index = shoe.lastIndexOf(card);
    assert.notEqual(index, -1);
    shoe.splice(index, 1);
  }
  shoe.push(...tail);
  return JSON.stringify(shoe);
}
const expireBaccaratRound = (tableId, winner) => seed(`UPDATE casino_baccarat_state SET shoe='${deterministicBaccaratShoe(winner)}', betting_ends_at=${Date.now() - 1} WHERE table_id='${tableId}' AND status='betting';`);
async function beginNextBaccaratRound(player, tableId, previousRoundNo) {
  seed(`UPDATE casino_baccarat_state SET betting_ends_at=${Date.now() - 1} WHERE table_id='${tableId}' AND status='result';`);
  const next = await baccarat(player, { action: "view", tableId });
  assert.equal(next.baccarat.status, "betting");
  assert.ok(next.baccarat.roundNo > previousRoundNo);
  return next.baccarat.roundNo;
}
async function register(name) {
  const suffix = randomUUID();
  const created = await request("/api/auth/register", { body: { email: `${name}-${suffix}@smoke.test`, password: `Smoke-${randomUUID()}!`, displayName: name }, expected: 201 });
  await request("/api/game", { token: created.token });
  await request("/api/game/action", { token: created.token, body: { action: "choose_story", story: "prodigal_return" } });
  return { id: created.profile.id, token: created.token };
}
const poker = (player, body, expected) => request("/api/poker/action", { token: player.token, body, expected });
const baccarat = (player, body, expected) => request("/api/baccarat/action", { token: player.token, body, expected });

const players = await Promise.all(["公開桌甲", "公開桌乙", "公開桌丙", "公開桌丁", "公開桌戊", "公開桌己", "公開桌庚"].map(register));
const [a, b, c, d, e, f, g] = players;
const now = Date.now();
seed(`DELETE FROM poker_hands;
  UPDATE poker_table_state SET deck='[]',community_cards='[]',street='idle',current_bet=0,turn_seat=0,pot=0,status='idle',round_token='',action_token='',updated_at=${now};
  DELETE FROM casino_baccarat_bets;
  DELETE FROM casino_baccarat_members;
  UPDATE casino_baccarat_state SET shoe='[]',round_no=1,status='waiting',betting_ends_at=0,player_cards='[]',banker_cards='[]',result='',action_token='',updated_at=${now}
    WHERE table_id='baccarat-01';
  UPDATE players SET main_story='legacy',cash=5000,location='casino',action_available_at=0,game_over='',reset_game_over='',mutation_token='',last_seen_at=${now},updated_at=${now}
    WHERE user_id IN (${players.map((player) => `'${player.id}'`).join(",")});`);
await Promise.all(players.map((player) => request("/api/game", { token: player.token })));

const madeMedium = await poker(a, { action: "create", tier: "medium" });
const mediumId = madeMedium.poker.tableId;
assert.equal(madeMedium.poker.bigBlind, 500);
const madeHigh = await poker(a, { action: "create", tier: "high" });
assert.equal(madeHigh.poker.bigBlind, 1_000);
await poker(b, { action: "join", tableId: mediumId, seatNo: 2 });
await poker(e, { action: "join", tableId: mediumId, seatNo: 3 });
await poker(f, { action: "join", tableId: mediumId, seatNo: 4 });
await poker(g, { action: "join", tableId: mediumId, seatNo: 5 });
await poker(a, { action: "join", tableId: mediumId, seatNo: 1 });
await poker(c, { action: "join", tableId: mediumId, seatNo: 1 }, 409);
await poker(a, { action: "join", tableId: mediumId, seatNo: 1 }, 400);

await poker(c, { action: "join", tableId: "table-01", seatNo: 1 });
await poker(d, { action: "join", tableId: "table-01", seatNo: 2 });
const lobby = await request("/api/game", { token: a.token });
assert.ok(lobby.casinoTables.some((table) => table.id === "table-01" && table.bigBlind === 100));
assert.ok(lobby.casinoTables.some((table) => table.id === mediumId && table.bigBlind === 500 && table.activeCount === 5));
assert.ok(lobby.casinoTables.some((table) => table.id === madeHigh.poker.tableId && table.bigBlind === 1_000));
assert.ok(lobby.casinoTables.find((table) => table.id === mediumId).isMine);

for (const player of [a, b, c, d]) await poker(player, { action: "ready", tableId: player === a || player === b ? mediumId : "table-01" });
await Promise.all([
  poker(a, { action: "start", tableId: mediumId }),
  poker(c, { action: "start", tableId: "table-01" }),
]);
const [mediumState, lowState] = await Promise.all([request("/api/game", { token: a.token }), request("/api/game", { token: c.token })]);
assert.equal(mediumState.poker.tableId, mediumId);
assert.equal(mediumState.poker.phase, "playing");
assert.equal(mediumState.poker.pot, 750);
assert.equal(lowState.poker.tableId, "table-01");
assert.equal(lowState.poker.phase, "playing");
assert.equal(lowState.poker.pot, 150);

await poker(a, { action: "fold", tableId: mediumId });
const mediumStillPlaying = await request("/api/game", { token: d.token });
assert.equal(mediumStillPlaying.poker.phase, "playing");
assert.equal(mediumStillPlaying.poker.tableId, "table-01");
assert.equal(mediumStillPlaying.poker.pot, 150);
await poker(c, { action: "fold", tableId: "table-01" });
for (const player of [a, b, e, f, g]) await poker(player, { action: "leave", tableId: mediumId });
for (const player of [c, d]) await poker(player, { action: "leave", tableId: "table-01" });
log("低／中／高盲注公開桌可並行，座位上限、重複加入與桌況隔離正常");

const madeBaccarat = await baccarat(a, { action: "create", tier: "low" });
const baccaratId = madeBaccarat.baccarat.tableId;
assert.equal(madeBaccarat.baccarat.status, "waiting");
assert.equal(madeBaccarat.baccarat.bettingEndsAt, 0);
assert.equal(madeBaccarat.baccarat.shoeRemaining, 0);
seed(`UPDATE casino_baccarat_state SET betting_ends_at=${Date.now() - 1} WHERE table_id='${baccaratId}';`);
const emptyBaccarat = await baccarat(a, { action: "view", tableId: baccaratId });
assert.equal(emptyBaccarat.baccarat.status, "waiting");
assert.equal(emptyBaccarat.baccarat.roundNo, 1);
assert.equal(emptyBaccarat.baccarat.playerCards.length + emptyBaccarat.baccarat.bankerCards.length, 0);
assert.equal(emptyBaccarat.baccarat.shoeRemaining, 0);
await baccarat(a, { action: "join", tableId: baccaratId });
await baccarat(b, { action: "join", tableId: baccaratId });
const before = await Promise.all([request("/api/game", { token: a.token }), request("/api/game", { token: b.token })]);
await Promise.all([
  baccarat(a, { action: "bet", tableId: baccaratId, side: "player", amount: 100 }),
  baccarat(b, { action: "bet", tableId: baccaratId, side: "banker", amount: 100 }),
]);
const during = await Promise.all([baccarat(a, { action: "view", tableId: baccaratId }), baccarat(b, { action: "view", tableId: baccaratId })]);
const live = await request(`/api/casino/live?game=baccarat&tableId=${baccaratId}`, { token: a.token });
assert.equal(live.baccarat.tableId, baccaratId);
assert.equal(live.cash, during[0].player.cash);
assert.equal(during[0].baccarat.roundNo, during[1].baccarat.roundNo);
assert.equal(during[0].baccarat.players.filter((player) => player.amount === 100).length, 2);
assert.ok(during[0].baccarat.shoeRemaining >= 400 && during[0].baccarat.shoeRemaining <= 416);
assert.ok(during[0].baccarat.bettingEndsAt > Date.now());
assert.equal(before[0].player.cash - (await request("/api/game", { token: a.token })).player.cash, 100);
assert.equal(before[1].player.cash - (await request("/api/game", { token: b.token })).player.cash, 100);

expireBaccaratRound(baccaratId, "banker");
const lobbySettlement = await request("/api/game", { token: c.token });
assert.equal(lobbySettlement.casinoTables.find((table) => table.id === baccaratId).status, "result");
const settled = await baccarat(a, { action: "view", tableId: baccaratId });
assert.equal(settled.baccarat.status, "result");
assert.equal(settled.baccarat.playerCards.length >= 2, true);
assert.equal(settled.baccarat.bankerCards.length >= 2, true);
assert.match(settled.baccarat.result, /莊勝/);
assert.ok(settled.baccarat.players.every((player) => player.betStatus === "settled"));
assert.equal(settled.baccarat.players.find((player) => player.isMine).payout, 0);
assert.equal(settled.baccarat.players.find((player) => !player.isMine).payout, 195);
const settledCash = await Promise.all([request("/api/game", { token: a.token }), request("/api/game", { token: b.token })]);
assert.equal(settledCash[0].player.cash, before[0].player.cash - 100);
assert.equal(settledCash[1].player.cash, before[1].player.cash + 95);
await Promise.all([baccarat(a, { action: "view", tableId: baccaratId }), baccarat(b, { action: "view", tableId: baccaratId })]);
const checkedAgain = await Promise.all([request("/api/game", { token: a.token }), request("/api/game", { token: b.token })]);
assert.equal(checkedAgain[0].player.cash, settledCash[0].player.cash);
assert.equal(checkedAgain[1].player.cash, settledCash[1].player.cash);
assert.ok(checkedAgain[0].baccarat.players.some((player) => player.isMine && player.result));
log("百家樂莊勝抽出 0.95 倍莊注派彩，重複讀取不會重付");

const tieRound = await beginNextBaccaratRound(a, baccaratId, settled.baccarat.roundNo);
const tieBefore = await Promise.all([request("/api/game", { token: a.token }), request("/api/game", { token: b.token })]);
await Promise.all([
  baccarat(a, { action: "bet", tableId: baccaratId, side: "banker", amount: 100 }),
  baccarat(b, { action: "bet", tableId: baccaratId, side: "tie", amount: 100 }),
]);
await baccarat(a, { action: "bet", tableId: baccaratId, side: "player", amount: 100 }, 409);
expireBaccaratRound(baccaratId, "tie");
const tieSettled = await baccarat(a, { action: "view", tableId: baccaratId });
assert.equal(tieSettled.baccarat.roundNo, tieRound);
assert.match(tieSettled.baccarat.result, /和局/);
assert.deepEqual(tieSettled.baccarat.players.map((player) => player.payout).sort((left, right) => left - right), [100, 900]);
const tieCash = await Promise.all([request("/api/game", { token: a.token }), request("/api/game", { token: b.token })]);
assert.equal(tieCash[0].player.cash, tieBefore[0].player.cash);
assert.equal(tieCash[1].player.cash, tieBefore[1].player.cash + 800);
await Promise.all([baccarat(a, { action: "view", tableId: baccaratId }), baccarat(b, { action: "view", tableId: baccaratId })]);
const tieCheckedAgain = await Promise.all([request("/api/game", { token: a.token }), request("/api/game", { token: b.token })]);
assert.deepEqual(tieCheckedAgain.map((state) => state.player.cash), tieCash.map((state) => state.player.cash));
log("百家樂和局退回莊注本金、和注派彩 8:1、同局防重押與防重複派彩通過");

const playerRound = await beginNextBaccaratRound(a, baccaratId, tieSettled.baccarat.roundNo);
const playerBefore = await Promise.all([request("/api/game", { token: a.token }), request("/api/game", { token: b.token })]);
await Promise.all([
  baccarat(a, { action: "bet", tableId: baccaratId, side: "player", amount: 100 }),
  baccarat(b, { action: "bet", tableId: baccaratId, side: "banker", amount: 100 }),
]);
expireBaccaratRound(baccaratId, "player");
const playerSettled = await baccarat(a, { action: "view", tableId: baccaratId });
assert.equal(playerSettled.baccarat.roundNo, playerRound);
assert.match(playerSettled.baccarat.result, /閒勝/);
assert.deepEqual(playerSettled.baccarat.players.map((player) => player.payout).sort((left, right) => left - right), [0, 200]);
const playerCash = await Promise.all([request("/api/game", { token: a.token }), request("/api/game", { token: b.token })]);
assert.equal(playerCash[0].player.cash, playerBefore[0].player.cash + 100);
assert.equal(playerCash[1].player.cash, playerBefore[1].player.cash - 100);
log("百家樂閒勝派彩 1:1，並確認同桌多人逐人輸贏正確");

const pausedTable = await baccarat(a, { action: "create", tier: "low" });
const pausedTableId = pausedTable.baccarat.tableId;
assert.equal(pausedTable.baccarat.status, "waiting");
await baccarat(a, { action: "join", tableId: pausedTableId });
const startedTable = await baccarat(a, { action: "view", tableId: pausedTableId });
assert.equal(startedTable.baccarat.status, "betting");
assert.equal(startedTable.baccarat.shoeRemaining, 416);
const pausedRoundNo = startedTable.baccarat.roundNo;
seed(`UPDATE players SET last_seen_at=${Date.now() - 60_000} WHERE user_id='${a.id}';
  UPDATE casino_baccarat_state SET betting_ends_at=${Date.now() - 1} WHERE table_id='${pausedTableId}' AND status='betting';`);
const frozenTable = await baccarat(c, { action: "view", tableId: pausedTableId });
assert.equal(frozenTable.baccarat.status, "waiting");
assert.equal(frozenTable.baccarat.roundNo, pausedRoundNo);
assert.equal(frozenTable.baccarat.bettingEndsAt, 0);
assert.equal(frozenTable.baccarat.playerCards.length + frozenTable.baccarat.bankerCards.length, 0);
assert.equal(frozenTable.baccarat.shoeRemaining, 416);
assert.equal(frozenTable.casinoTables.find((table) => table.id === pausedTableId).activeCount, 0);
const resumedTable = await baccarat(a, { action: "view", tableId: pausedTableId });
assert.equal(resumedTable.baccarat.status, "betting");
assert.equal(resumedTable.baccarat.roundNo, pausedRoundNo);
assert.ok(resumedTable.baccarat.bettingEndsAt > Date.now());
await baccarat(a, { action: "bet", tableId: pausedTableId, side: "player", amount: 100 });
seed(`UPDATE players SET last_seen_at=${Date.now() - 60_000} WHERE user_id='${a.id}';`);
expireBaccaratRound(pausedTableId, "banker");
const offlineSettledTable = await baccarat(c, { action: "view", tableId: pausedTableId });
assert.equal(offlineSettledTable.baccarat.status, "result");
assert.equal(offlineSettledTable.baccarat.roundNo, pausedRoundNo);
assert.equal(offlineSettledTable.baccarat.players.find((player) => player.id === a.id).betStatus, "settled");
seed(`UPDATE casino_baccarat_state SET betting_ends_at=${Date.now() - 1} WHERE table_id='${pausedTableId}' AND status='result';`);
const frozenResult = await baccarat(c, { action: "view", tableId: pausedTableId });
assert.equal(frozenResult.baccarat.status, "result");
assert.equal(frozenResult.baccarat.roundNo, pausedRoundNo);
const resumedAfterResult = await baccarat(a, { action: "view", tableId: pausedTableId });
assert.equal(resumedAfterResult.baccarat.status, "betting");
assert.equal(resumedAfterResult.baccarat.roundNo, pausedRoundNo + 1);
log("百家樂無真人時不發牌或開新局，真人回桌後恢復；已下注局仍完成派彩");

seed(`DELETE FROM poker_hands WHERE user_id IN (${players.map((player) => `'${player.id}'`).join(",")});
  DELETE FROM casino_baccarat_bets WHERE table_id='${baccaratId}';
  DELETE FROM casino_baccarat_members WHERE table_id='${baccaratId}';
  DELETE FROM casino_baccarat_state WHERE table_id IN ('${baccaratId}','${pausedTableId}');
  DELETE FROM casino_public_tables WHERE id IN ('${mediumId}','${madeHigh.poker.tableId}','${baccaratId}','${pausedTableId}');
  DELETE FROM poker_table_state WHERE id IN ('${mediumId}','${madeHigh.poker.tableId}');`);
