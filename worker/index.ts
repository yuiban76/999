import { ABILITY_LABELS, ACADEMIES, careerForCategory, careerRequirements, categoryInfo, jobInfo, meetsCareerRequirements, type Abilities } from "../shared/jobs";
import { isHospitalRegularOpen, isLocationOpen, minuteOfDay, OPENING_HOURS, worldMinutes } from "../shared/world";

type LocationId = "home" | "realtor" | "bank" | "business" | "shopping" | "hotel" | "casino" | "school" | "hospital";

interface Env { DB?: D1Database; ASSETS?: Fetcher; FRONTEND_ORIGIN?: string }

type AuthUser = { userId: string; email: string; displayName: string; hasAvatar: boolean; avatarUpdatedAt: number | null };

type PlayerRow = {
  user_id: string;
  display_name: string;
  email: string;
  cash: number;
  bank_balance: number;
  loan_balance: number;
  finance_day: number;
  daily_minimum_payment: number;
  daily_payment_made: number;
  missed_payment_days: number;
  game_over: string;
  main_story: string;
  energy: number;
  health: number;
  mood: number;
  hunger: number;
  intelligence_exp: number;
  programming_exp: number;
  fitness_exp: number;
  work_exp: number;
  charisma_exp: number;
  current_job: string;
  job_category: string;
  job_exp: number;
  illness: string;
  owns_home: number;
  rental_name: string;
  rented_until: number;
  action_available_at: number;
  action_label: string;
  elapsed_minutes: number;
  location: LocationId;
};

type CasinoRow = { user_id: string; player_name: string; player_cards: string; dealer_cards: string; bet: number; status: string; result: string; seat_no: number | null; reveal_at: number; updated_at: number };
type PokerRow = { user_id: string; player_name: string; hole_cards: string; community_cards: string; bet: number; status: string; result: string; seat_no: number | null; reveal_at: number; street_bet: number; acted: number; updated_at: number };
type PokerTableRow = { id: string; deck: string; community_cards: string; street: string; current_bet: number; turn_seat: number; pot: number; status: string; updated_at: number };

const VALID_LOCATIONS = new Set<LocationId>(["home", "realtor", "bank", "business", "shopping", "hotel", "casino", "school", "hospital"]);
// The client sends a heartbeat every five seconds. Only a short, continuous
// heartbeat gap counts as online play; returning after going offline adds no time.
const ONLINE_HEARTBEAT_GRACE_MS = 15_000;
const clamp = (value: number) => Math.max(0, Math.min(100, value));
const abilitiesFor = (player: PlayerRow): Abilities => ({
  physical: player.fitness_exp,
  intelligence: player.intelligence_exp,
  creativity: player.programming_exp,
  social: player.work_exp,
  charisma: player.charisma_exp,
});
const formatRequirements = (requirements: Partial<Abilities>) => Object.entries(requirements)
  .map(([key, value]) => `${ABILITY_LABELS[key as keyof Abilities]} ${value}`)
  .join("、");
const PRODIGAL_FAILURE_ENDING = "prodigal_insolvent";
const prodigalMinimumPayment = (balance: number) => balance > 0 ? Math.max(1, Math.ceil(balance * .003)) : 0;
function scratchPrize() {
  const roll = crypto.getRandomValues(new Uint32Array(1))[0] / 4_294_967_296;
  if (roll < 0.62) return 0;
  if (roll < 0.87) return 100;
  if (roll < 0.95) return 200;
  if (roll < 0.985) return 500;
  if (roll < 0.998) return 1_000;
  if (roll < 0.9998) return 10_000;
  return 50_000;
}
function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

function actionWaitMessage(player: PlayerRow, now = Date.now()) {
  const seconds = Math.max(1, Math.ceil((player.action_available_at - now) / 1000));
  return `${player.action_label || "目前的行動"}尚未完成，請等待 ${seconds} 秒；移動不受限制。`;
}

function corsHeaders(request: Request, env: Env) {
  const allowed = env.FRONTEND_ORIGIN || "https://yuiban76.github.io";
  const origin = request.headers.get("Origin");
  return {
    "Access-Control-Allow-Origin": origin === allowed ? origin : allowed,
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

function withCors(response: Response, request: Request, env: Env) {
  const next = new Response(response.body, response);
  for (const [key, value] of Object.entries(corsHeaders(request, env))) next.headers.set(key, value);
  return next;
}

const encoder = new TextEncoder();

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function base64UrlToBytes(value: string) {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

async function sha256(value: string) {
  return bytesToBase64Url(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value))));
}

async function passwordHash(password: string, salt: Uint8Array) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const saltBuffer = Uint8Array.from(salt).buffer;
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: saltBuffer, iterations: 100_000 }, key, 256);
  return bytesToBase64Url(new Uint8Array(bits));
}

async function identity(request: Request, db?: D1Database): Promise<AuthUser | null> {
  if (!db) return null;
  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  const token = authorization.slice(7).trim();
  if (!token) return null;
  const tokenHash = await sha256(token);
  const row = await db.prepare(`SELECT a.id, a.email, a.display_name, a.avatar_data IS NOT NULL AS has_avatar, a.avatar_updated_at
    FROM sessions s JOIN accounts a ON a.id = s.user_id
    WHERE s.token_hash = ? AND s.expires_at > ?`).bind(tokenHash, Date.now()).first<{ id: string; email: string; display_name: string; has_avatar: number; avatar_updated_at: number | null }>();
  return row ? { userId: row.id, email: row.email, displayName: row.display_name, hasAvatar: Boolean(row.has_avatar), avatarUpdatedAt: row.avatar_updated_at } : null;
}

function guestPlayer() {
  return { cash: 10000, bankBalance: 0, loanBalance: 0, dailyMinimumPayment: 0, dailyPaymentMade: 0, missedPaymentDays: 0, gameOver: "", mainStory: "legacy", energy: 100, health: 100, mood: 80, hunger: 80, intelligenceExp: 0, creativityExp: 0, physicalExp: 0, socialExp: 0, charismaExp: 0, currentJob: "待業者", jobCategory: "unfixed", jobExp: 0, illness: "", ownsHome: false, rentalName: "", rentedUntil: 0, actionAvailableAt: 0, actionLabel: "", elapsedMinutes: worldMinutes(), location: "realtor" as LocationId };
}

function serializePlayer(row: PlayerRow) {
  const currentJob = jobInfo(row.current_job) ? row.current_job : "待業者";
  const location = VALID_LOCATIONS.has(row.location) ? row.location : "casino";
  return { cash: row.cash, bankBalance: row.bank_balance, loanBalance: row.loan_balance, dailyMinimumPayment: row.daily_minimum_payment, dailyPaymentMade: row.daily_payment_made, missedPaymentDays: row.missed_payment_days, gameOver: row.game_over, mainStory: row.main_story, energy: row.energy, health: row.health, mood: row.mood, hunger: row.hunger, intelligenceExp: row.intelligence_exp, creativityExp: row.programming_exp, physicalExp: row.fitness_exp, socialExp: row.work_exp, charismaExp: row.charisma_exp, currentJob, jobCategory: currentJob === "待業者" ? "unfixed" : row.job_category, jobExp: currentJob === "待業者" ? 0 : row.job_exp, illness: row.illness, ownsHome: Boolean(row.owns_home), rentalName: row.rental_name, rentedUntil: row.rented_until, actionAvailableAt: row.action_available_at, actionLabel: row.action_label, elapsedMinutes: row.elapsed_minutes, location };
}

function profileFor(user: AuthUser) {
  return {
    id: user.userId,
    displayName: user.displayName,
    email: user.email,
    signedIn: true,
    avatarUrl: user.hasAvatar ? `/api/avatar/${user.userId}?v=${user.avatarUpdatedAt ?? 0}` : null,
  };
}

async function ensureSchema(db: D1Database) {
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY, email TEXT NOT NULL, display_name TEXT NOT NULL,
      password_hash TEXT NOT NULL, password_salt TEXT NOT NULL,
      avatar_key TEXT, avatar_data BLOB, avatar_content_type TEXT,
      avatar_updated_at INTEGER, created_at INTEGER NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL,
      expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS players (
      user_id TEXT PRIMARY KEY, display_name TEXT NOT NULL, email TEXT NOT NULL,
      cash INTEGER NOT NULL DEFAULT 10000, bank_balance INTEGER NOT NULL DEFAULT 0,
      loan_balance INTEGER NOT NULL DEFAULT 0, finance_day INTEGER NOT NULL DEFAULT 0,
      daily_minimum_payment INTEGER NOT NULL DEFAULT 0, daily_payment_made INTEGER NOT NULL DEFAULT 0,
      missed_payment_days INTEGER NOT NULL DEFAULT 0, game_over TEXT NOT NULL DEFAULT '',
      main_story TEXT NOT NULL DEFAULT 'legacy',
      energy INTEGER NOT NULL DEFAULT 100,
      health INTEGER NOT NULL DEFAULT 100, mood INTEGER NOT NULL DEFAULT 80,
      hunger INTEGER NOT NULL DEFAULT 80, intelligence_exp INTEGER NOT NULL DEFAULT 0,
      programming_exp INTEGER NOT NULL DEFAULT 0, fitness_exp INTEGER NOT NULL DEFAULT 0,
      work_exp INTEGER NOT NULL DEFAULT 0, charisma_exp INTEGER NOT NULL DEFAULT 0,
      illness TEXT NOT NULL DEFAULT '',
      current_job TEXT NOT NULL DEFAULT 'unemployed', job_category TEXT NOT NULL DEFAULT 'unfixed',
      job_exp INTEGER NOT NULL DEFAULT 0,
      owns_home INTEGER NOT NULL DEFAULT 0, rental_name TEXT NOT NULL DEFAULT '',
      rented_until INTEGER NOT NULL DEFAULT 0,
      action_available_at INTEGER NOT NULL DEFAULT 0, action_label TEXT NOT NULL DEFAULT '',
      elapsed_minutes INTEGER NOT NULL DEFAULT 450,
      location TEXT NOT NULL DEFAULT 'realtor', created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL, last_seen_at INTEGER NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS game_events (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, player_name TEXT NOT NULL,
      room_id TEXT NOT NULL DEFAULT 'lobby-01', title TEXT NOT NULL,
      detail TEXT NOT NULL, tone TEXT NOT NULL DEFAULT 'neutral',
      game_time TEXT NOT NULL, created_at INTEGER NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS casino_hands (
      user_id TEXT PRIMARY KEY, player_name TEXT NOT NULL,
      player_cards TEXT NOT NULL DEFAULT '[]', dealer_cards TEXT NOT NULL DEFAULT '[]',
      bet INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'idle',
      result TEXT NOT NULL DEFAULT '', seat_no INTEGER, reveal_at INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS casino_table_state (
      id TEXT PRIMARY KEY, deck TEXT NOT NULL DEFAULT '[]', updated_at INTEGER NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS poker_hands (
      user_id TEXT PRIMARY KEY, player_name TEXT NOT NULL,
      hole_cards TEXT NOT NULL DEFAULT '[]', community_cards TEXT NOT NULL DEFAULT '[]',
      bet INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'idle',
      result TEXT NOT NULL DEFAULT '', seat_no INTEGER, reveal_at INTEGER NOT NULL DEFAULT 0,
      street_bet INTEGER NOT NULL DEFAULT 0, acted INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS poker_table_state (
      id TEXT PRIMARY KEY, deck TEXT NOT NULL DEFAULT '[]', community_cards TEXT NOT NULL DEFAULT '[]',
      street TEXT NOT NULL DEFAULT 'idle', current_bet INTEGER NOT NULL DEFAULT 0,
      turn_seat INTEGER NOT NULL DEFAULT 0, pot INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'idle', updated_at INTEGER NOT NULL
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_players_last_seen ON players(last_seen_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_events_room_created ON game_events(room_id, created_at DESC)"),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_email ON accounts(email)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_casino_status_updated ON casino_hands(status, updated_at)"),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_casino_seat ON casino_hands(seat_no)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_poker_status_updated ON poker_hands(status, updated_at)"),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_poker_seat ON poker_hands(seat_no)"),
  ]);
}

async function upsertPlayer(db: D1Database, user: AuthUser) {
  const now = Date.now();
  await db.prepare(`INSERT INTO players (user_id, display_name, email, main_story, current_job, location, created_at, updated_at, last_seen_at)
    VALUES (?, ?, ?, 'unselected', 'unemployed', 'realtor', ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      display_name = excluded.display_name,
      email = excluded.email,
      elapsed_minutes = players.elapsed_minutes + CASE
        WHEN players.last_seen_at <= excluded.last_seen_at
          AND players.last_seen_at >= excluded.last_seen_at - ?
        THEN (excluded.last_seen_at - players.last_seen_at) / 1000.0
        ELSE 0
      END,
      last_seen_at = excluded.last_seen_at`)
    .bind(user.userId, user.displayName.slice(0, 40), user.email, now, now, now, ONLINE_HEARTBEAT_GRACE_MS).run();
  const row = await db.prepare("SELECT * FROM players WHERE user_id = ?").bind(user.userId).first<PlayerRow>();
  if (!row) return null;
  const today = Math.floor(row.elapsed_minutes / 1440) + 1;
  // Existing story saves receive a fresh first deadline when this system is introduced.
  if (row.main_story === "prodigal_return" && row.loan_balance > 0 && row.daily_minimum_payment <= 0 && !row.game_over) {
    const minimumPayment = prodigalMinimumPayment(row.loan_balance);
    await db.prepare("UPDATE players SET finance_day=?, daily_minimum_payment=?, daily_payment_made=0, missed_payment_days=0, updated_at=? WHERE user_id=?")
      .bind(today, minimumPayment, now, user.userId).run();
    row.finance_day = today; row.daily_minimum_payment = minimumPayment; row.daily_payment_made = 0; row.missed_payment_days = 0;
    return row;
  }
  if (row.finance_day <= 0) {
    const minimumPayment = row.main_story === "prodigal_return" ? prodigalMinimumPayment(row.loan_balance) : 0;
    await db.prepare("UPDATE players SET finance_day=?, daily_minimum_payment=? WHERE user_id=?").bind(today, minimumPayment, user.userId).run();
    row.finance_day = today; row.daily_minimum_payment = minimumPayment;
  } else if (today > row.finance_day) {
    const elapsedDays = today - row.finance_day;
    let bankBalance = row.bank_balance;
    let loanBalance = row.loan_balance;
    let minimumPayment = row.daily_minimum_payment || (row.main_story === "prodigal_return" ? prodigalMinimumPayment(loanBalance) : 0);
    let paymentMade = row.daily_payment_made;
    let missedPaymentDays = row.missed_payment_days;
    let gameOver = row.game_over;
    for (let day = 0; day < elapsedDays; day += 1) {
      if (row.main_story === "prodigal_return" && loanBalance > 0 && !gameOver) {
        const paymentShortfall = Math.min(loanBalance, Math.max(0, minimumPayment - paymentMade));
        if (paymentShortfall > 0 && bankBalance >= paymentShortfall) {
          bankBalance -= paymentShortfall;
          loanBalance -= paymentShortfall;
          paymentMade += paymentShortfall;
        }
        missedPaymentDays = paymentMade < minimumPayment ? missedPaymentDays + 1 : 0;
        if (missedPaymentDays >= 2) gameOver = PRODIGAL_FAILURE_ENDING;
      } else if (loanBalance <= 0) missedPaymentDays = 0;
      bankBalance = Math.min(9_000_000_000_000_000, Math.floor(bankBalance * 1.001));
      const dailyLoanRate = row.main_story === "prodigal_return" ? 1.002 : 1.005;
      loanBalance = Math.min(9_000_000_000_000_000, Math.ceil(loanBalance * dailyLoanRate));
      paymentMade = 0;
      minimumPayment = row.main_story === "prodigal_return" && !gameOver ? prodigalMinimumPayment(loanBalance) : 0;
    }
    await db.prepare("UPDATE players SET bank_balance=?, loan_balance=?, finance_day=?, daily_minimum_payment=?, daily_payment_made=?, missed_payment_days=?, game_over=?, updated_at=? WHERE user_id=?")
      .bind(bankBalance, loanBalance, today, minimumPayment, paymentMade, missedPaymentDays, gameOver, now, user.userId).run();
    row.bank_balance = bankBalance; row.loan_balance = loanBalance; row.finance_day = today; row.daily_minimum_payment = minimumPayment; row.daily_payment_made = paymentMade; row.missed_payment_days = missedPaymentDays; row.game_over = gameOver;
  }
  return row;
}

async function multiplayer(db: D1Database) {
  const since = Date.now() - 30_000;
  const [players, events] = await Promise.all([
    db.prepare(`SELECT p.user_id, p.display_name, p.location, p.cash, p.loan_balance, p.last_seen_at,
      a.avatar_data IS NOT NULL AS has_avatar, a.avatar_updated_at
      FROM players p JOIN accounts a ON a.id = p.user_id
      WHERE p.last_seen_at >= ? ORDER BY p.last_seen_at DESC LIMIT 24`).bind(since).all<{ user_id: string; display_name: string; location: LocationId; cash: number; loan_balance: number; last_seen_at: number; has_avatar: number; avatar_updated_at: number | null }>(),
    db.prepare("SELECT id, player_name, title, detail, tone, game_time FROM game_events WHERE room_id = 'lobby-01' AND title NOT IN ('前往新地點', '移動完成') ORDER BY created_at DESC LIMIT 12").all<{ id: string; player_name: string; title: string; detail: string; tone: "good" | "neutral" | "warn"; game_time: string }>(),
  ]);
  return {
    online: players.results.map((row) => ({ id: row.user_id, displayName: row.display_name, location: row.location, cash: row.cash, loanBalance: row.loan_balance, updatedAt: row.last_seen_at, avatarUrl: row.has_avatar ? `/api/avatar/${row.user_id}?v=${row.avatar_updated_at ?? 0}` : null })),
    feed: events.results.map((row) => ({ id: row.id, playerName: row.player_name, title: row.title, detail: row.detail, tone: row.tone, time: row.game_time })),
  };
}

const CARD_RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const CARD_SUITS = ["♠", "♥", "♦", "♣"];
function handScore(cards: string[]) {
  let score = 0; let aces = 0;
  for (const card of cards) {
    const rank = card.slice(0, -1);
    if (rank === "A") { score += 11; aces += 1; }
    else if (["J", "Q", "K"].includes(rank)) score += 10;
    else score += Number(rank);
  }
  while (score > 21 && aces > 0) { score -= 10; aces -= 1; }
  return score;
}
const parseCards = (value: string) => { try { return JSON.parse(value) as string[]; } catch { return []; } };

const ACTIVE_CASINO_STATUSES = "('seated','waiting','playing','stood','settling')";
// The shared clock advances one game hour per real minute, so six game hours are six real minutes.
const IDLE_CASINO_SEAT_TIMEOUT_MS = 6 * 60 * 1000;

async function expireIdleBlackjackSeats(db: D1Database) {
  await db.prepare("UPDATE casino_hands SET status='expired', result='超過 6 個遊戲小時未下注，已自動離開座位。', seat_no=NULL, reveal_at=0 WHERE status='seated' AND updated_at<?")
    .bind(Date.now() - IDLE_CASINO_SEAT_TIMEOUT_MS).run();
}

async function revealReadyCasinoRound(db: D1Database) {
  const now = Date.now();
  const ready = await db.prepare("SELECT * FROM casino_hands WHERE status='waiting' AND reveal_at>0 AND reveal_at<=? ORDER BY seat_no").bind(now).all<CasinoRow>();
  if (!ready.results.length) return;
  const deck = shuffledDeck();
  const hands = new Map<string, string[]>();
  ready.results.forEach((row) => hands.set(row.user_id, [deck.pop()!]));
  const dealerCards = [deck.pop()!];
  ready.results.forEach((row) => hands.get(row.user_id)!.push(deck.pop()!));
  dealerCards.push(deck.pop()!);
  await db.batch([
    ...ready.results.map((row) => db.prepare("UPDATE casino_hands SET player_cards=?, dealer_cards=?, status='playing', reveal_at=0, updated_at=? WHERE user_id=? AND status='waiting'")
      .bind(JSON.stringify(hands.get(row.user_id)), JSON.stringify(dealerCards), now, row.user_id)),
    db.prepare("INSERT INTO casino_table_state (id, deck, updated_at) VALUES ('table-01', ?, ?) ON CONFLICT(id) DO UPDATE SET deck=excluded.deck, updated_at=excluded.updated_at").bind(JSON.stringify(deck), now),
  ]);
}

async function casinoState(db: D1Database, userId: string) {
  await expireIdleBlackjackSeats(db);
  await revealReadyCasinoRound(db);
  const cutoff = Date.now() - 5 * 60 * 1000;
  await db.prepare("UPDATE casino_hands SET status='expired', seat_no=NULL, reveal_at=0 WHERE status IN ('waiting','playing','stood') AND updated_at<?").bind(cutoff).run();
  const [seats, own] = await Promise.all([
    db.prepare(`SELECT * FROM casino_hands WHERE status IN ${ACTIVE_CASINO_STATUSES} AND seat_no IS NOT NULL ORDER BY seat_no LIMIT 5`).all<CasinoRow>(),
    db.prepare("SELECT * FROM casino_hands WHERE user_id = ?").bind(userId).first<CasinoRow>(),
  ]);
  const ownIsActive = Boolean(own && ["seated", "waiting", "playing", "stood", "settling"].includes(own.status));
  const playing = ownIsActive && own?.status === "playing";
  const playerCards = own ? parseCards(own.player_cards) : [];
  const dealerCards = own ? parseCards(own.dealer_cards) : [];
  const waitingSeat = seats.results.find((seat) => seat.status === "waiting");
  const playingSeat = seats.results.find((seat) => ["playing", "stood", "settling"].includes(seat.status));
  const dealerSource = playingSeat ?? seats.results.find((seat) => parseCards(seat.dealer_cards).length > 0);
  const sharedDealerCards = dealerSource ? parseCards(dealerSource.dealer_cards) : [];
  const phase = waitingSeat ? "waiting" : playingSeat ? "playing" : "idle";
  return {
    capacity: 5,
    bettingSeconds: 5,
    activeCount: seats.results.length,
    serverNow: Date.now(),
    phase,
    revealAt: waitingSeat?.reveal_at ?? 0,
    dealerCards: phase === "playing" && sharedDealerCards.length > 1 ? [sharedDealerCards[0], "🂠"] : sharedDealerCards,
    dealerScore: phase === "playing" ? null : sharedDealerCards.length ? handScore(sharedDealerCards) : null,
    seats: seats.results.map((seat) => {
      const cards = parseCards(seat.player_cards);
      return { id: seat.user_id, displayName: seat.player_name, seatNo: seat.seat_no, status: seat.status, bet: seat.bet, cards, score: cards.length ? handScore(cards) : null, result: seat.result, isMine: seat.user_id === userId };
    }),
    hand: own ? {
      playerCards,
      dealerCards: playing && dealerCards.length > 1 ? [dealerCards[0], "🂠"] : dealerCards,
      playerScore: handScore(playerCards),
      dealerScore: playing ? null : dealerCards.length ? handScore(dealerCards) : null,
      bet: own.bet,
      seatNo: ownIsActive ? own.seat_no : null,
      revealAt: ownIsActive && own.status === "waiting" ? own.reveal_at : waitingSeat?.reveal_at ?? 0,
      status: ownIsActive ? own.status : ["seated", "waiting", "playing", "stood", "settling"].includes(own.status) ? "expired" : own.status,
      result: ownIsActive ? own.result : ["seated", "waiting", "playing", "stood", "settling"].includes(own.status) ? "離桌過久，本局下注已沒收。" : own.result,
    } : null,
  };
}

async function resolveCasinoRoundIfReady(db: D1Database) {
  const claimed = await db.prepare(`UPDATE casino_hands SET status='settling'
    WHERE status='stood' AND NOT EXISTS (SELECT 1 FROM casino_hands WHERE status='playing') RETURNING *`).run<CasinoRow>();
  if (!claimed.results.length) return;
  const dealerCards = parseCards(claimed.results[0].dealer_cards);
  const table = await db.prepare("SELECT deck FROM casino_table_state WHERE id='table-01'").first<{ deck: string }>();
  const deck = parseCards(table?.deck || "[]");
  while (handScore(dealerCards) < 17 && deck.length) dealerCards.push(deck.pop()!);
  const now = Date.now();
  const statements: D1PreparedStatement[] = [];
  for (const row of claimed.results) {
    const playerCards = parseCards(row.player_cards);
    const playerScore = handScore(playerCards); const dealerScore = handScore(dealerCards);
    const blackjack = playerCards.length === 2 && playerScore === 21;
    const dealerBlackjack = dealerCards.length === 2 && dealerScore === 21;
    let result = `莊家 ${dealerScore} 點，你輸了 NT$${row.bet}。`; let payout = 0;
    if (playerScore > 21) result = `你爆牌了，輸掉 NT$${row.bet}。`;
    else if (blackjack && !dealerBlackjack) { payout = Math.floor(row.bet * 2.5); result = `Blackjack！獲得 NT$${payout}。`; }
    else if (dealerScore > 21 || playerScore > dealerScore) { payout = row.bet * 2; result = `你以 ${playerScore} 點獲勝，獲得 NT$${payout}。`; }
    else if (playerScore === dealerScore) { payout = row.bet; result = `${playerScore} 點平手，退回 NT$${row.bet}。`; }
    statements.push(db.prepare("UPDATE casino_hands SET dealer_cards=?, status='seated', result=?, reveal_at=0, updated_at=? WHERE user_id=? AND status='settling'").bind(JSON.stringify(dealerCards), result, now, row.user_id));
    statements.push(db.prepare("UPDATE players SET cash=cash+?, updated_at=?, last_seen_at=? WHERE user_id=?").bind(payout, now, now, row.user_id));
  }
  statements.push(db.prepare("UPDATE casino_table_state SET deck=?, updated_at=? WHERE id='table-01'").bind(JSON.stringify(deck), now));
  await db.batch(statements);
}

async function casinoAction(request: Request, env: Env) {
  const user = await identity(request, env.DB);
  if (!user || !env.DB) return json({ message: "請先登入才能加入多人牌桌。" }, 401);
  await ensureSchema(env.DB);
  const player = await upsertPlayer(env.DB, user);
  if (!player) return json({ message: "找不到玩家資料。" }, 404);
  if (player.game_over) return json({ message: "這段人生已經結束，請重新開始。" }, 409);
  if (player.location !== "casino") return json({ message: "請先前往幸運賭場。" }, 400);
  await expireIdleBlackjackSeats(env.DB);
  let body: { action?: string; bet?: number; seatNo?: number };
  try { body = await request.json(); } catch { return json({ message: "牌桌資料格式錯誤。" }, 400); }
  if (body.action !== "leave" && player.action_available_at > Date.now()) return json({ message: actionWaitMessage(player) }, 409);
  await revealReadyCasinoRound(env.DB);
  const now = Date.now(); const cutoff = now - 5 * 60 * 1000;
  await env.DB.prepare("UPDATE casino_hands SET status='expired', seat_no=NULL, reveal_at=0 WHERE status IN ('waiting','playing','stood') AND updated_at<?").bind(cutoff).run();
  let message = "牌桌已更新。";
  if (body.action === "join") {
    const seatNo = Number(body.seatNo);
    if (!Number.isInteger(seatNo) || seatNo < 1 || seatNo > 5) return json({ message: "請選擇 1～5 號座位。" }, 400);
    const current = await env.DB.prepare(`SELECT * FROM casino_hands WHERE user_id=? AND status IN ${ACTIVE_CASINO_STATUSES}`).bind(user.userId).first<CasinoRow>();
    if (current) return json({ message: `你已經坐在 ${current.seat_no} 號座位。` }, 400);
    try {
      const joined = await env.DB.prepare(`INSERT INTO casino_hands (user_id, player_name, player_cards, dealer_cards, bet, status, result, seat_no, reveal_at, updated_at)
        VALUES (?, ?, '[]', '[]', 0, 'seated', '', ?, 0, ?)
        ON CONFLICT(user_id) DO UPDATE SET player_name=excluded.player_name, player_cards='[]', dealer_cards='[]', bet=0,
          status='seated', result='', seat_no=excluded.seat_no, reveal_at=0, updated_at=excluded.updated_at
        WHERE casino_hands.status NOT IN ('seated','waiting','playing','stood','settling') RETURNING user_id`)
        .bind(user.userId, user.displayName.slice(0, 40), seatNo, now).run();
      if (joined.results.length !== 1) return json({ message: "無法加入這個座位，請重新整理後再試。" }, 409);
    } catch { return json({ message: `${seatNo} 號座位已有人，請選擇其他空位。` }, 409); }
    message = `已加入 ${seatNo} 號座位，請輸入下注金額。`;
  } else if (body.action === "deal") {
    const bet = Number(body.bet);
    if (!Number.isSafeInteger(bet) || bet < 1 || bet > 1_000_000) return json({ message: "請輸入 NT$1～1,000,000 的整數下注金額。" }, 400);
    if (player.cash < bet) return json({ message: "現金不足，無法下注。" }, 400);
    const ownSeat = await env.DB.prepare("SELECT * FROM casino_hands WHERE user_id=? AND status='seated'").bind(user.userId).first<CasinoRow>();
    if (!ownSeat) return json({ message: "請先點選 1～5 號空位加入遊戲。" }, 400);
    const activeRound = await env.DB.prepare("SELECT 1 AS active FROM casino_hands WHERE status IN ('playing','stood','settling') LIMIT 1").first<{ active: number }>();
    if (activeRound) return json({ message: "本局已經翻牌，你可以留在座位觀賽，下一局再下注。" }, 409);
    const pending = await env.DB.prepare("SELECT reveal_at FROM casino_hands WHERE status='waiting' AND reveal_at>? ORDER BY reveal_at LIMIT 1").bind(now).first<{ reveal_at: number }>();
    if (!pending) await env.DB.prepare("UPDATE casino_hands SET player_cards='[]', dealer_cards='[]', bet=0, result='', reveal_at=0 WHERE status='seated'").run();
    const revealAt = pending?.reveal_at ?? now + 5_000;
    const queued = await env.DB.prepare("UPDATE casino_hands SET bet=?, status='waiting', result='', reveal_at=?, updated_at=? WHERE user_id=? AND status='seated' RETURNING user_id")
      .bind(bet, revealAt, now, user.userId).run();
    if (queued.results.length !== 1) return json({ message: "下注狀態已變更，請重新整理後再試。" }, 409);
    const charged = await env.DB.prepare("UPDATE players SET cash=cash-?, updated_at=?, last_seen_at=? WHERE user_id=? AND cash>=? RETURNING user_id").bind(bet, now, now, user.userId, bet).run();
    if (charged.results.length !== 1) {
      await env.DB.prepare("UPDATE casino_hands SET bet=0, status='seated', result='', reveal_at=0, updated_at=? WHERE user_id=?").bind(now, user.userId).run();
      return json({ message: "現金不足，無法下注。" }, 400);
    }
    if (!pending) {
      const finalRevealAt = Date.now() + 5_000;
      await env.DB.prepare("UPDATE casino_hands SET reveal_at=? WHERE status='waiting'").bind(finalRevealAt).run();
    }
    message = `已下注 NT$${bet}，等待其他玩家；倒數結束後翻牌。`;
  } else {
    const row = await env.DB.prepare("SELECT * FROM casino_hands WHERE user_id=? AND status='playing' AND updated_at>=?").bind(user.userId, cutoff).first<CasinoRow>();
    if (body.action === "leave") {
      const active = await env.DB.prepare(`SELECT * FROM casino_hands WHERE user_id=? AND status IN ${ACTIVE_CASINO_STATUSES}`).bind(user.userId).first<CasinoRow>();
      if (!active) return json({ message: "你目前沒有加入牌桌。" }, 400);
      message = active.status === "seated" ? "已離開牌桌。" : "已離開牌桌，本局下注不退還。";
      await env.DB.prepare("UPDATE casino_hands SET status='left', result=?, seat_no=NULL, reveal_at=0, updated_at=? WHERE user_id=?").bind(message, now, user.userId).run();
      await resolveCasinoRoundIfReady(env.DB);
    } else {
      if (!row) return json({ message: "牌局尚未翻牌，請等待倒數結束。" }, 400);
    const cards = parseCards(row.player_cards);
    if (body.action === "hit") {
      const table = await env.DB.prepare("SELECT deck FROM casino_table_state WHERE id='table-01'").first<{ deck: string }>();
      const deck = parseCards(table?.deck || "[]");
      const card = deck.pop();
      if (!card) return json({ message: "本局牌靴已用完，請停牌等待結算。" }, 409);
      cards.push(card);
      await env.DB.prepare("UPDATE casino_table_state SET deck=?, updated_at=? WHERE id='table-01'").bind(JSON.stringify(deck), now).run();
      if (handScore(cards) >= 21) {
        await env.DB.prepare("UPDATE casino_hands SET player_cards=?, status='stood', result=?, updated_at=? WHERE user_id=? AND status='playing'")
          .bind(JSON.stringify(cards), handScore(cards) > 21 ? `你爆牌了，等待其他玩家完成。` : "21 點，等待其他玩家完成。", now, user.userId).run();
        await resolveCasinoRoundIfReady(env.DB);
        const completed = await env.DB.prepare("SELECT result FROM casino_hands WHERE user_id=?").bind(user.userId).first<{ result: string }>();
        message = completed?.result || `${handScore(cards)} 點，等待其他玩家完成。`;
      }
      else { await env.DB.prepare("UPDATE casino_hands SET player_cards=?, updated_at=? WHERE user_id=?").bind(JSON.stringify(cards), now, user.userId).run(); message = `補牌後目前 ${handScore(cards)} 點。`; }
    } else if (body.action === "stand") {
      await env.DB.prepare("UPDATE casino_hands SET status='stood', result='已停牌，等待其他玩家完成。', updated_at=? WHERE user_id=? AND status='playing'").bind(now, user.userId).run();
      await resolveCasinoRoundIfReady(env.DB);
      const completed = await env.DB.prepare("SELECT result FROM casino_hands WHERE user_id=?").bind(user.userId).first<{ result: string }>();
      message = completed?.result || "已停牌，等待其他玩家完成。";
    }
    else return json({ message: "未知的牌桌行動。" }, 400);
    }
  }
  const saved = await env.DB.prepare("SELECT * FROM players WHERE user_id=?").bind(user.userId).first<PlayerRow>();
  return json({ player: serializePlayer(saved!), casino: await casinoState(env.DB, user.userId), message });
}

const POKER_ACTIVE_STATUSES = "('seated','ready','playing','folded','settling')";
const POKER_HAND_NAMES = ["高牌", "一對", "兩對", "三條", "順子", "同花", "葫蘆", "四條", "同花順"];
type PokerEvaluation = { score: number[]; name: string };

function shuffledDeck() {
  const deck = CARD_SUITS.flatMap((suit) => CARD_RANKS.map((rank) => `${rank}${suit}`));
  for (let index = deck.length - 1; index > 0; index -= 1) {
    const random = crypto.getRandomValues(new Uint32Array(1))[0] / 4_294_967_296;
    const swap = Math.floor(random * (index + 1));
    [deck[index], deck[swap]] = [deck[swap], deck[index]];
  }
  return deck;
}

function evaluateFive(cards: string[]): PokerEvaluation {
  const values = cards.map((card) => {
    const rank = card.slice(0, -1);
    return rank === "A" ? 14 : rank === "K" ? 13 : rank === "Q" ? 12 : rank === "J" ? 11 : Number(rank);
  }).sort((a, b) => b - a);
  const counts = new Map<number, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  const groups = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const flush = cards.every((card) => card.slice(-1) === cards[0].slice(-1));
  const unique = [...new Set(values)];
  if (unique[0] === 14) unique.push(1);
  let straightHigh = 0;
  for (let index = 0; index <= unique.length - 5; index += 1) {
    if (unique[index] - unique[index + 4] === 4) { straightHigh = unique[index]; break; }
  }
  let score: number[];
  if (flush && straightHigh) score = [8, straightHigh];
  else if (groups[0][1] === 4) score = [7, groups[0][0], groups[1][0]];
  else if (groups[0][1] === 3 && groups[1]?.[1] === 2) score = [6, groups[0][0], groups[1][0]];
  else if (flush) score = [5, ...values];
  else if (straightHigh) score = [4, straightHigh];
  else if (groups[0][1] === 3) score = [3, groups[0][0], ...groups.filter((group) => group[1] === 1).map((group) => group[0])];
  else if (groups[0][1] === 2 && groups[1]?.[1] === 2) score = [2, Math.max(groups[0][0], groups[1][0]), Math.min(groups[0][0], groups[1][0]), groups.find((group) => group[1] === 1)?.[0] ?? 0];
  else if (groups[0][1] === 2) score = [1, groups[0][0], ...groups.filter((group) => group[1] === 1).map((group) => group[0])];
  else score = [0, ...values];
  return { score, name: POKER_HAND_NAMES[score[0]] };
}

function comparePokerScores(left: number[], right: number[]) {
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0);
    if (difference) return difference;
  }
  return 0;
}

function bestPokerHand(cards: string[]): PokerEvaluation {
  let best: PokerEvaluation = { score: [-1], name: "" };
  for (let a = 0; a < cards.length - 4; a += 1) for (let b = a + 1; b < cards.length - 3; b += 1)
    for (let c = b + 1; c < cards.length - 2; c += 1) for (let d = c + 1; d < cards.length - 1; d += 1)
      for (let e = d + 1; e < cards.length; e += 1) {
        const evaluation = evaluateFive([cards[a], cards[b], cards[c], cards[d], cards[e]]);
        if (comparePokerScores(evaluation.score, best.score) > 0) best = evaluation;
      }
  return best;
}

async function pokerTable(db: D1Database) {
  return db.prepare("SELECT * FROM poker_table_state WHERE id='table-01'").first<PokerTableRow>();
}

async function expireIdlePokerSeats(db: D1Database) {
  await db.prepare("UPDATE poker_hands SET status='expired', result='超過 6 個遊戲小時未下注，已自動離開座位。', seat_no=NULL, reveal_at=0 WHERE status IN ('seated','ready') AND updated_at<?")
    .bind(Date.now() - IDLE_CASINO_SEAT_TIMEOUT_MS).run();
}

const nextPokerSeat = (players: PokerRow[], after: number) => players.filter((row) => row.status === "playing" && row.seat_no !== null).sort((a, b) => a.seat_no! - b.seat_no!).find((row) => row.seat_no! > after)?.seat_no
  ?? players.filter((row) => row.status === "playing" && row.seat_no !== null).sort((a, b) => a.seat_no! - b.seat_no!)[0]?.seat_no ?? 0;

async function settlePoker(db: D1Database, players: PokerRow[], table: PokerTableRow) {
  const active = players.filter((row) => row.status === "playing");
  const community = parseCards(table.community_cards);
  const winners = active.length === 1 ? active : (() => {
    const evaluated = active.map((row) => ({ row, hand: bestPokerHand([...parseCards(row.hole_cards), ...community]) }));
    let best = evaluated[0].hand.score;
    evaluated.forEach((item) => { if (comparePokerScores(item.hand.score, best) > 0) best = item.hand.score; });
    return evaluated.filter((item) => comparePokerScores(item.hand.score, best) === 0).map((item) => item.row);
  })();
  const share = Math.floor(table.pot / winners.length); const remainder = table.pot % winners.length; const now = Date.now();
  const statements: D1PreparedStatement[] = [];
  players.forEach((row) => {
    const winnerIndex = winners.findIndex((winner) => winner.user_id === row.user_id);
    const payout = winnerIndex >= 0 ? share + (winnerIndex < remainder ? 1 : 0) : 0;
    const handName = active.length > 1 && row.status === "playing" ? bestPokerHand([...parseCards(row.hole_cards), ...community]).name : "";
    const result = payout ? `${handName || "其他玩家棄牌"}獲勝，獲得 NT$${payout}。` : row.status === "folded" ? "本局已棄牌。" : `${handName}未贏得獎池。`;
    statements.push(db.prepare("UPDATE poker_hands SET status='seated', result=?, street_bet=0, acted=0, updated_at=? WHERE user_id=?").bind(result, now, row.user_id));
    if (payout) statements.push(db.prepare("UPDATE players SET cash=cash+?, updated_at=?, last_seen_at=? WHERE user_id=?").bind(payout, now, now, row.user_id));
  });
  statements.push(db.prepare("UPDATE poker_table_state SET status='idle', street='showdown', current_bet=0, turn_seat=0, pot=0, updated_at=? WHERE id='table-01'").bind(now));
  await db.batch(statements);
}

async function advancePoker(db: D1Database, players: PokerRow[], table: PokerTableRow) {
  const active = players.filter((row) => row.status === "playing");
  if (active.length <= 1) return settlePoker(db, players, table);
  const roundDone = active.every((row) => row.acted && row.street_bet === table.current_bet);
  if (!roundDone) {
    await db.prepare("UPDATE poker_table_state SET turn_seat=?, updated_at=? WHERE id='table-01'").bind(nextPokerSeat(players, table.turn_seat), Date.now()).run();
    return;
  }
  if (table.street === "river") return settlePoker(db, players, table);
  const deck = parseCards(table.deck); const community = parseCards(table.community_cards);
  const nextStreet = table.street === "preflop" ? "flop" : table.street === "flop" ? "turn" : "river";
  const cardsToDeal = nextStreet === "flop" ? 3 : 1;
  for (let index = 0; index < cardsToDeal; index += 1) community.push(deck.pop()!);
  const firstSeat = active.sort((a, b) => a.seat_no! - b.seat_no!)[0].seat_no!; const now = Date.now();
  await db.batch([
    db.prepare("UPDATE poker_hands SET street_bet=0, acted=0, community_cards=?, updated_at=? WHERE status='playing'").bind(JSON.stringify(community), now),
    db.prepare("UPDATE poker_table_state SET deck=?, community_cards=?, street=?, current_bet=0, turn_seat=?, updated_at=? WHERE id='table-01'").bind(JSON.stringify(deck), JSON.stringify(community), nextStreet, firstSeat, now),
  ]);
}

async function pokerState(db: D1Database, userId: string) {
  await expireIdlePokerSeats(db);
  const [seats, own, table] = await Promise.all([
    db.prepare(`SELECT * FROM poker_hands WHERE status IN ${POKER_ACTIVE_STATUSES} AND seat_no IS NOT NULL ORDER BY seat_no LIMIT 5`).all<PokerRow>(),
    db.prepare("SELECT * FROM poker_hands WHERE user_id=?").bind(userId).first<PokerRow>(), pokerTable(db),
  ]);
  const state = table ?? { street: "idle", current_bet: 0, turn_seat: 0, pot: 0, status: "idle", community_cards: "[]" };
  return { capacity: 5, activeCount: seats.results.length, phase: state.status === "playing" ? "playing" : "idle", communityCards: parseCards(state.community_cards), pot: state.pot, street: state.street, currentBet: state.current_bet, turnSeat: state.turn_seat,
    seats: seats.results.map((seat) => ({ id: seat.user_id, displayName: seat.player_name, seatNo: seat.seat_no, status: seat.status, bet: seat.bet, streetBet: seat.street_bet, cards: seat.user_id === userId || state.status !== "playing" ? parseCards(seat.hole_cards) : seat.status === "playing" ? ["🂠", "🂠"] : [], result: seat.result, isMine: seat.user_id === userId })),
    hand: own ? { cards: parseCards(own.hole_cards), bet: own.bet, streetBet: own.street_bet, seatNo: own.seat_no, status: own.status, result: own.result, isTurn: state.status === "playing" && own.status === "playing" && own.seat_no === state.turn_seat } : null };
}

async function pokerAction(request: Request, env: Env) {
  const user = await identity(request, env.DB);
  if (!user || !env.DB) return json({ message: "請先登入才能加入德州撲克牌桌。" }, 401);
  await ensureSchema(env.DB);
  const player = await upsertPlayer(env.DB, user);
  if (player?.game_over) return json({ message: "這段人生已經結束，請重新開始。" }, 409);
  if (!player || player.location !== "casino") return json({ message: "請先前往幸運賭場。" }, 400);
  await expireIdlePokerSeats(env.DB);
  let body: { action?: string; bet?: number; seatNo?: number; amount?: number };
  try { body = await request.json(); } catch { return json({ message: "牌桌資料格式錯誤。" }, 400); }
  if (body.action !== "leave" && player.action_available_at > Date.now()) return json({ message: actionWaitMessage(player) }, 409);
  const now = Date.now(); let message = "德州撲克牌桌已更新。";
  if (body.action === "join") {
    const seatNo = Number(body.seatNo);
    if (!Number.isInteger(seatNo) || seatNo < 1 || seatNo > 5) return json({ message: "請選擇 1～5 號座位。" }, 400);
    const current = await env.DB.prepare(`SELECT * FROM poker_hands WHERE user_id=? AND status IN ${POKER_ACTIVE_STATUSES}`).bind(user.userId).first<PokerRow>();
    if (current) return json({ message: `你已經坐在 ${current.seat_no} 號座位。` }, 400);
    try {
      const joined = await env.DB.prepare(`INSERT INTO poker_hands (user_id, player_name, hole_cards, community_cards, bet, status, result, seat_no, reveal_at, updated_at)
        VALUES (?, ?, '[]', '[]', 0, 'seated', '', ?, 0, ?)
        ON CONFLICT(user_id) DO UPDATE SET player_name=excluded.player_name, hole_cards='[]', community_cards='[]', bet=0, street_bet=0, acted=0, status='seated', result='', seat_no=excluded.seat_no, reveal_at=0, updated_at=excluded.updated_at
        WHERE poker_hands.status NOT IN ('seated','ready','playing','folded','settling') RETURNING user_id`).bind(user.userId, user.displayName.slice(0, 40), seatNo, now).run();
      if (joined.results.length !== 1) return json({ message: "無法加入這個座位，請重新整理後再試。" }, 409);
    } catch { return json({ message: `${seatNo} 號座位已有人，請選擇其他空位。` }, 409); }
    message = `已加入德州撲克 ${seatNo} 號座位，請輸入下注金額。`;
  } else if (body.action === "ready") {
    const ready = await env.DB.prepare("UPDATE poker_hands SET hole_cards='[]', community_cards='[]', bet=0, street_bet=0, acted=0, status='ready', result='', updated_at=? WHERE user_id=? AND status='seated' RETURNING user_id").bind(now, user.userId).run();
    if (ready.results.length !== 1) return json({ message: "請先選擇空位，或等待目前牌局結束。" }, 409);
    message = "你已準備參加下一局；至少兩位玩家準備後即可開局。";
  } else if (body.action === "start") {
    const blind = Number(body.bet);
    if (!Number.isSafeInteger(blind) || blind < 10 || blind > 100_000) return json({ message: "大盲請設定為 NT$10～100,000。" }, 400);
    const starter = await env.DB.prepare("SELECT 1 AS seated FROM poker_hands WHERE user_id=? AND status='ready' AND seat_no IS NOT NULL").bind(user.userId).first<{ seated: number }>();
    if (!starter) return json({ message: "請先選擇空位加入牌桌，才能開始牌局。" }, 409);
    const table = await pokerTable(env.DB); if (table?.status === "playing") return json({ message: "牌局已在進行中。" }, 409);
    const joined = await env.DB.prepare("SELECT h.*, p.cash FROM poker_hands h JOIN players p ON p.user_id=h.user_id WHERE h.status='ready' AND h.seat_no IS NOT NULL AND p.cash>=? ORDER BY h.seat_no").bind(blind).all<PokerRow & { cash: number }>();
    if (joined.results.length < 2) return json({ message: "至少需要兩位已準備且現金足夠的玩家才能開局。" }, 409);
    const deck = shuffledDeck(); const hands = new Map<string, string[]>(); joined.results.forEach((row) => hands.set(row.user_id, [deck.pop()!, deck.pop()!]));
    const smallBlind = Math.max(1, Math.floor(blind / 2)); const sb = joined.results[0]; const bb = joined.results[1]; const firstTurn = joined.results[2]?.seat_no ?? sb.seat_no!;
    const statements: D1PreparedStatement[] = [];
    joined.results.forEach((row) => { const forced = row.user_id === sb.user_id ? smallBlind : row.user_id === bb.user_id ? blind : 0;
      statements.push(env.DB!.prepare("UPDATE players SET cash=cash-? WHERE user_id=? AND cash>=?").bind(forced, row.user_id, forced));
      statements.push(env.DB!.prepare("UPDATE poker_hands SET hole_cards=?, community_cards='[]', bet=?, street_bet=?, acted=0, status='playing', result='', updated_at=? WHERE user_id=?").bind(JSON.stringify(hands.get(row.user_id)), forced, forced, now, row.user_id)); });
    statements.push(env.DB.prepare("INSERT INTO poker_table_state (id,deck,community_cards,street,current_bet,turn_seat,pot,status,updated_at) VALUES ('table-01',?,'[]','preflop',?,?,?,'playing',?) ON CONFLICT(id) DO UPDATE SET deck=excluded.deck,community_cards='[]',street='preflop',current_bet=excluded.current_bet,turn_seat=excluded.turn_seat,pot=excluded.pot,status='playing',updated_at=excluded.updated_at").bind(JSON.stringify(deck), blind, firstTurn, smallBlind + blind, now));
    await env.DB.batch(statements); message = `牌局開始：小盲 NT$${smallBlind}、大盲 NT$${blind}。`;
  } else if (["check", "call", "raise", "fold"].includes(body.action || "")) {
    const [table, row, players] = await Promise.all([pokerTable(env.DB), env.DB.prepare("SELECT * FROM poker_hands WHERE user_id=?").bind(user.userId).first<PokerRow>(), env.DB.prepare("SELECT * FROM poker_hands WHERE status IN ('playing','folded') ORDER BY seat_no").all<PokerRow>()]);
    if (!table || table.status !== "playing" || !row || row.status !== "playing") return json({ message: "你目前不在進行中的牌局。" }, 409);
    if (row.seat_no !== table.turn_seat) return json({ message: `目前輪到 ${table.turn_seat} 號座位。` }, 409);
    let added = 0; let nextBet = table.current_bet;
    if (body.action === "fold") { await env.DB.prepare("UPDATE poker_hands SET status='folded', acted=1, result='本局已棄牌。', updated_at=? WHERE user_id=?").bind(now, user.userId).run(); message = "你已棄牌。"; }
    else if (body.action === "check") { if (row.street_bet !== table.current_bet) return json({ message: "目前有人下注，不能過牌；請跟注、加注或棄牌。" }, 409); await env.DB.prepare("UPDATE poker_hands SET acted=1, updated_at=? WHERE user_id=?").bind(now, user.userId).run(); message = "你選擇過牌。"; }
    else { const callAmount = table.current_bet - row.street_bet; const raiseBy = body.action === "raise" ? Number(body.amount) : 0; if (!Number.isSafeInteger(raiseBy) || raiseBy < 0 || (body.action === "raise" && raiseBy < 10)) return json({ message: "加注金額至少為 NT$10。" }, 400); added = callAmount + raiseBy; if (player.cash < added) return json({ message: "現金不足，無法完成這次下注。" }, 409); nextBet = table.current_bet + raiseBy;
      await env.DB.batch([env.DB.prepare("UPDATE players SET cash=cash-? WHERE user_id=? AND cash>=?").bind(added, user.userId, added), env.DB.prepare("UPDATE poker_hands SET bet=bet+?, street_bet=street_bet+?, acted=1, updated_at=? WHERE user_id=?").bind(added, added, now, user.userId), ...(raiseBy ? [env.DB.prepare("UPDATE poker_hands SET acted=0 WHERE status='playing' AND user_id<>?").bind(user.userId)] : [])]); message = body.action === "raise" ? `你跟注並加注 NT$${raiseBy}。` : `你跟注 NT$${callAmount}。`; }
    await env.DB.prepare("UPDATE poker_table_state SET current_bet=?, pot=pot+?, updated_at=? WHERE id='table-01'").bind(nextBet, added, now).run();
    const refreshedPlayers = await env.DB.prepare("SELECT * FROM poker_hands WHERE status IN ('playing','folded') ORDER BY seat_no").all<PokerRow>(); const refreshedTable = await pokerTable(env.DB); await advancePoker(env.DB, refreshedPlayers.results, refreshedTable!);
  } else if (body.action === "leave") {
    const active = await env.DB.prepare(`SELECT * FROM poker_hands WHERE user_id=? AND status IN ${POKER_ACTIVE_STATUSES}`).bind(user.userId).first<PokerRow>();
    if (!active) return json({ message: "你目前沒有加入德州撲克牌桌。" }, 400);
    if (active.status === "playing") return json({ message: "牌局進行中，請先棄牌再離場。" }, 409);
    await env.DB.prepare("UPDATE poker_hands SET status='left', seat_no=NULL, reveal_at=0, updated_at=? WHERE user_id=?").bind(now, user.userId).run();
    message = "已離開德州撲克牌桌。";
  } else return json({ message: "未知的德州撲克牌桌行動。" }, 400);
  const saved = await env.DB.prepare("SELECT * FROM players WHERE user_id=?").bind(user.userId).first<PlayerRow>();
  return json({ player: serializePlayer(saved!), poker: await pokerState(env.DB, user.userId), message });
}

async function auth(request: Request, env: Env, mode: "register" | "login") {
  if (!env.DB) return json({ message: "資料庫尚未連接。" }, 503);
  await ensureSchema(env.DB);
  let body: { email?: string; password?: string; displayName?: string };
  try { body = await request.json(); } catch { return json({ message: "資料格式錯誤。" }, 400); }
  const email = body.email?.trim().toLowerCase() || "";
  const password = body.password || "";
  const displayName = body.displayName?.trim() || email.split("@")[0] || "玩家";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ message: "請輸入有效的 Email。" }, 400);
  if (password.length < 8 || password.length > 128) return json({ message: "密碼需為 8～128 個字元。" }, 400);
  let account = await env.DB.prepare("SELECT id, email, display_name, password_hash, password_salt FROM accounts WHERE email = ?").bind(email).first<{ id: string; email: string; display_name: string; password_hash: string; password_salt: string }>();
  if (mode === "register") {
    if (account) return json({ message: "此 Email 已註冊，請直接登入。" }, 409);
    if (displayName.length < 2 || displayName.length > 24) return json({ message: "暱稱需為 2～24 個字元。" }, 400);
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const now = Date.now();
    account = { id: crypto.randomUUID(), email, display_name: displayName, password_hash: await passwordHash(password, salt), password_salt: bytesToBase64Url(salt) };
    await env.DB.prepare("INSERT INTO accounts (id, email, display_name, password_hash, password_salt, created_at) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(account.id, account.email, account.display_name, account.password_hash, account.password_salt, now).run();
  } else {
    if (!account) return json({ message: "Email 或密碼不正確。" }, 401);
    const candidate = await passwordHash(password, base64UrlToBytes(account.password_salt));
    if (candidate !== account.password_hash) return json({ message: "Email 或密碼不正確。" }, 401);
  }
  const token = bytesToBase64Url(crypto.getRandomValues(new Uint8Array(32)));
  const now = Date.now();
  await env.DB.batch([
    env.DB.prepare("DELETE FROM sessions WHERE expires_at <= ?").bind(now),
    env.DB.prepare("INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)").bind(await sha256(token), account.id, now + 30 * 24 * 60 * 60 * 1000, now),
  ]);
  return json({ token, profile: { id: account.id, displayName: account.display_name, email: account.email, signedIn: true } }, mode === "register" ? 201 : 200);
}

async function logout(request: Request, env: Env) {
  if (!env.DB) return json({ ok: true });
  const authorization = request.headers.get("Authorization");
  if (authorization?.startsWith("Bearer ")) await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256(authorization.slice(7).trim())).run();
  return json({ ok: true });
}

async function uploadAvatar(request: Request, env: Env) {
  const user = await identity(request, env.DB);
  if (!user) return json({ message: "請先登入後再上傳照片。" }, 401);
  if (!env.DB) return json({ message: "照片儲存空間尚未連接。" }, 503);
  const contentType = request.headers.get("Content-Type")?.split(";")[0] ?? "";
  if (!["image/jpeg", "image/png", "image/webp"].includes(contentType)) return json({ message: "只接受 JPG、PNG 或 WebP 圖片。" }, 415);
  const contentLength = Number(request.headers.get("Content-Length") || 0);
  if (contentLength > 500_000) return json({ message: "照片處理後必須小於 500 KB。" }, 413);
  const image = await request.arrayBuffer();
  if (!image.byteLength || image.byteLength > 500_000) return json({ message: "照片處理後必須小於 500 KB。" }, 413);
  const now = Date.now();
  await env.DB.prepare("UPDATE accounts SET avatar_data = ?, avatar_content_type = ?, avatar_updated_at = ? WHERE id = ?")
    .bind(image, contentType, now, user.userId).run();
  return json({ avatarUrl: `/api/avatar/${user.userId}?v=${now}`, message: "大頭貼已更新。" });
}

async function getAvatar(userId: string, env: Env) {
  if (!env.DB) return new Response("Not found", { status: 404 });
  const account = await env.DB.prepare("SELECT avatar_data, avatar_content_type, avatar_updated_at FROM accounts WHERE id = ?")
    .bind(userId).first<{ avatar_data: number[] | null; avatar_content_type: string | null; avatar_updated_at: number | null }>();
  if (!account?.avatar_data) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(account.avatar_data), {
    headers: {
      "Content-Type": account.avatar_content_type || "image/jpeg",
      "Cache-Control": "public, max-age=31536000, immutable",
      "ETag": `"avatar-${userId}-${account.avatar_updated_at ?? 0}"`,
    },
  });
}

async function bootstrap(request: Request, env: Env) {
  const user = await identity(request, env.DB);
  if (!user || !env.DB) return json({ authenticated: false, profile: null, player: guestPlayer(), room: { id: "lobby-01", name: "城市大廳 01" }, online: [], feed: [], casino: { capacity: 5, activeCount: 0, seats: [], hand: null }, poker: { capacity: 5, activeCount: 0, seats: [], hand: null, communityCards: [], pot: 0 } });
  await ensureSchema(env.DB);
  const row = await upsertPlayer(env.DB, user);
  if (!row) return json({ message: "無法載入玩家資料" }, 500);
  const world = await multiplayer(env.DB);
  const [casino, poker] = await Promise.all([casinoState(env.DB, user.userId), pokerState(env.DB, user.userId)]);
  return json({ authenticated: true, profile: profileFor(user), player: serializePlayer(row), room: { id: "lobby-01", name: "城市大廳 01" }, ...world, casino, poker });
}

async function takeAction(request: Request, env: Env) {
  const user = await identity(request, env.DB);
  if (!user) return json({ message: "請先登入帳號，才能保存進度與加入多人世界。" }, 401);
  if (!env.DB) return json({ message: "遊戲資料庫尚未連接。" }, 503);
  await ensureSchema(env.DB);
  const current = await upsertPlayer(env.DB, user);
  if (!current) return json({ message: "找不到玩家資料。" }, 404);

  let body: { action?: string; location?: string; hours?: number; kind?: string; days?: number; job?: string; amount?: number; academy?: string; story?: string };
  try { body = await request.json(); } catch { return json({ message: "行動資料格式錯誤。" }, 400); }
  if (current.game_over && body.action !== "reset") return json({ message: "這段人生已經結束，請重新開始。" }, 409);
  if (current.main_story === "unselected" && body.action !== "choose_story") return json({ message: "請先選擇人生主線。" }, 409);
  if (!["move", "choose_story", "reset"].includes(body.action || "") && current.action_available_at > Date.now()) return json({ message: actionWaitMessage(current) }, 409);
  const next = { ...current };
  const sharedMinutes = worldMinutes();
  const storedJob = jobInfo(next.current_job);
  if (!storedJob || storedJob.categoryId !== next.job_category) { next.current_job = "unemployed"; next.job_category = "unfixed"; next.job_exp = 0; }
  let title = "完成行動";
  let message = "行動完成。";
  let tone: "good" | "neutral" | "warn" = "good";
  let minutes = 0;
  let scratch: { price: number; prize: number } | null = null;

  switch (body.action) {
    case "choose_story":
      if (next.main_story !== "unselected") return json({ message: "人生主線選定後不能再次更換。" }, 409);
      if (body.story !== "prodigal_return") return json({ message: "這條人生主線目前尚未開放。" }, 400);
      Object.assign(next, { cash: 37, bank_balance: 0, loan_balance: 250_000, main_story: "prodigal_return", finance_day: Math.floor(next.elapsed_minutes / 1440) + 1, daily_minimum_payment: 750, daily_payment_made: 0, missed_payment_days: 0, game_over: "", energy: 100, health: 100, mood: 80, hunger: 80, intelligence_exp: 0, programming_exp: 0, fitness_exp: 0, work_exp: 0, charisma_exp: 0, current_job: "unemployed", job_category: "unfixed", job_exp: 0, illness: "", owns_home: 0, rental_name: "", rented_until: 0, action_available_at: 0, action_label: "", location: "realtor" });
      title = "選擇主線：《浪子回頭》"; message = "你帶著 NT$37 與 NT$250,000 負債，決定承認失敗並重新開始。"; tone = "neutral"; break;
    case "move": {
      if (!VALID_LOCATIONS.has(body.location as LocationId)) return json({ message: "目的地不存在。" }, 400);
      if (next.location === body.location) return json({ message: "你已經在這裡了。" }, 400);
      if (body.location === "home" && !next.owns_home && next.rented_until <= next.elapsed_minutes) return json({ message: "你目前沒有住所，請先到房仲租屋或買房。" }, 400);
      const target = body.location as LocationId;
      if (!isLocationOpen(target, sharedMinutes)) return json({ message: `${OPENING_HOURS[target]?.label} 營業，現在已關門。` }, 400);
      next.location = body.location as LocationId; next.energy = clamp(next.energy - 1); next.hunger = clamp(next.hunger - 1);
      const placeName = ({ home: "我的住所", realtor: "安心房仲", bank: "城市銀行", business: "商業區", shopping: "購物街", hotel: "不夜旅店", casino: "幸運賭場", school: "未來學院", hospital: "市立醫院" } as Record<LocationId, string>)[next.location as LocationId];
      title = "移動完成"; message = `已抵達${placeName}。`; tone = "neutral"; break;
    }
    case "housing": {
      if (next.location !== "realtor") return json({ message: "請先前往安心房仲。" }, 400);
      if (!isLocationOpen("realtor", sharedMinutes)) return json({ message: `安心房仲營業時間為 ${OPENING_HOURS.realtor?.label}。` }, 400);
      if (body.kind === "rent") {
        const days = Number(body.days);
        if (![1, 7, 30].includes(days)) return json({ message: "租屋天數不正確。" }, 400);
        const dailyRent = 350;
        const cost = dailyRent * days;
        if (next.cash < cost) return json({ message: "現金不足，無法支付租金。" }, 400);
        const leaseStart = Math.max(next.elapsed_minutes, next.rented_until);
        next.cash -= cost; next.rental_name = "城市小套房"; next.rented_until = leaseStart + days * 1440; minutes = 30;
        title = `租下城市小套房 ${days} 天`; message = `支付 NT$${cost}，租期增加 ${days} 天。${next.owns_home ? "你原有的自有住宅仍然保留。" : "現在可以回到我的住所休息。"}`; break;
      }
      if (body.kind === "buy") {
        const price = 50_000;
        if (next.owns_home) return json({ message: "你已經擁有城市小宅，仍可繼續查看租屋方案。" }, 400);
        if (next.cash < price) return json({ message: "購屋需要 NT$50,000，目前資金不足。" }, 400);
        next.cash -= price; next.owns_home = 1; minutes = 60;
        title = "買下城市小宅"; message = "支付 NT$50,000，取得永久住所；你仍可在房仲查看與承租其他房屋。"; break;
      }
      return json({ message: "房屋方案不存在。" }, 400);
    }
    case "bank": {
      if (next.location !== "bank") return json({ message: "請先前往城市銀行。" }, 400);
      if (!isLocationOpen("bank", sharedMinutes)) return json({ message: `城市銀行營業時間為 ${OPENING_HOURS.bank?.label}。` }, 400);
      const amount = Number(body.amount);
      if (!Number.isSafeInteger(amount) || amount < 1 || amount > 9_000_000_000_000_000) return json({ message: "請輸入有效的整數金額。" }, 400);
      if (body.kind === "deposit") {
        if (next.cash < amount) return json({ message: "手上現金不足。" }, 400);
        next.cash -= amount; next.bank_balance += amount; title = "存入銀行"; message = `已存入 NT$${amount}；每個遊戲日結算 0.1% 收益。`;
      } else if (body.kind === "withdraw") {
        if (next.bank_balance < amount) return json({ message: "銀行存款不足。" }, 400);
        next.bank_balance -= amount; next.cash += amount; title = "提領存款"; message = `已從銀行提領 NT$${amount}。`;
      } else if (body.kind === "borrow") {
        if (next.loan_balance > 0) return json({ message: "請先還清目前貸款，才能再次借款。" }, 400);
        if (amount > 50_000) return json({ message: "單筆貸款上限為 NT$50,000。" }, 400);
        next.loan_balance = amount; next.cash += amount; title = "銀行貸款"; message = `借入 NT$${amount}；每個遊戲日結算 0.5% 利息。`;
      } else if (body.kind === "repay") {
        if (next.loan_balance <= 0) return json({ message: "目前沒有貸款。" }, 400);
        if (amount > next.loan_balance) return json({ message: "還款金額不能超過貸款餘額。" }, 400);
        if (next.cash < amount) return json({ message: "手上現金不足。" }, 400);
        next.cash -= amount; next.loan_balance -= amount;
        if (next.main_story === "prodigal_return") next.daily_payment_made += amount;
        title = "償還貸款"; message = `已償還 NT$${amount}，剩餘貸款 NT$${next.loan_balance}。${next.main_story === "prodigal_return" ? ` 本日累計已繳 NT$${next.daily_payment_made}／最低 NT$${next.daily_minimum_payment}。` : ""}`;
      } else return json({ message: "銀行服務不存在。" }, 400);
      minutes = 10; break;
    }
    case "hotel": {
      if (next.location !== "hotel") return json({ message: "請先前往不夜旅店。" }, 400);
      if (body.kind === "stay") {
        if (next.owns_home || next.rented_until > next.elapsed_minutes) return json({ message: "你目前已有住所，不需要入住旅店。" }, 400);
        if (next.cash < 1_200) return json({ message: "住宿需要 NT$1,200，目前現金不足。" }, 400);
        next.cash -= 1_200; next.energy = 100; next.health = clamp(next.health + 3); next.hunger = clamp(next.hunger - 12); minutes = 300;
        title = "入住不夜旅店"; message = "支付 NT$1,200，體力全滿、健康 +3。"; break;
      }
      if (body.kind === "work") {
        if (next.illness) return json({ message: `目前罹患${next.illness}，請先前往醫院治療。` }, 400);
        if (next.energy < 5) return json({ message: "體力不足，先休息後再打工吧。" }, 400);
        next.cash += 120; next.energy = clamp(next.energy - 5); next.hunger = clamp(next.hunger - 2); minutes = 60;
        title = "完成旅店臨時工"; message = "收入 +NT$120；這份臨時工作不增加職業經驗或能力。"; break;
      }
      const meal = body.kind === "meal" ? { name: "旅店餐", price: 250, hunger: 45 } : body.kind === "luxury" ? { name: "豪華餐", price: 500, hunger: 80 } : null;
      if (!meal) return json({ message: "旅店服務不存在。" }, 400);
      if (next.cash < meal.price) return json({ message: "手上現金不足。" }, 400);
      next.cash -= meal.price; next.hunger = clamp(next.hunger + meal.hunger); minutes = 20;
      title = `享用${meal.name}`; message = `${meal.name}讓飽足 +${meal.hunger}。`; break;
    }
    case "job": {
      if (next.location !== "business") return json({ message: "請先前往商業區的就業服務處。" }, 400);
      if (!isLocationOpen("business", sharedMinutes)) return json({ message: `商業區營業時間為 ${OPENING_HOURS.business?.label}。` }, 400);
      const selected = jobInfo(body.job || "");
      if (!selected) return json({ message: "這個職業不存在。" }, 400);
      if (next.current_job === selected.job) return json({ message: `你目前已經是${selected.job}。` }, 400);
      const category = categoryInfo(selected.categoryId);
      if (!category) return json({ message: "這個產業不存在。" }, 400);
      if (category.id !== "unfixed" && selected.job !== category.jobs[0]) return json({ message: `進入${category.label}必須從${category.jobs[0]}開始。` }, 400);
      const entryRequirements = careerRequirements(category.id, 0);
      if (category.id !== "unfixed" && !meetsCareerRequirements(abilitiesFor(next), entryRequirements)) return json({ message: `進入${category.label}需要${formatRequirements(entryRequirements)}。` }, 400);
      next.current_job = selected.job; next.job_category = selected.categoryId; next.job_exp = 0; minutes = 60;
      title = category.id === "unfixed" ? `狀態變更：${selected.job}` : `進入${selected.categoryLabel}`;
      message = category.id === "unfixed" ? `目前狀態已改為${selected.job}。` : `成功進入「${selected.categoryLabel}」，從${selected.job}開始發展；產業升遷經驗從 0 開始。`; break;
    }
    case "work": {
      if (next.location !== "business") return json({ message: "請先前往商業區。" }, 400);
      if (!isLocationOpen("business", sharedMinutes)) return json({ message: `商業區營業時間為 ${OPENING_HOURS.business?.label}。` }, 400);
      if (next.illness) return json({ message: `目前罹患${next.illness}，請先前往醫院治療。` }, 400);
      if (next.job_category === "unfixed") return json({ message: `目前是${next.current_job === "流浪者" ? "流浪者" : "待業者"}，請先選擇一條產業路線。` }, 400);
      const hours = Number(body.hours);
      if (![1, 4, 8].includes(hours)) return json({ message: "工時選擇不正確。" }, 400);
      if (next.energy < hours * 5) return json({ message: "體力不足，先回家休息吧。" }, 400);
      const previousCareer = careerForCategory(next.job_category, next.job_exp, next.current_job, abilitiesFor(next));
      const income = hours * previousCareer.hourlyPay;
      next.cash += income; next.energy = clamp(next.energy - hours * 5); next.health = clamp(next.health - Math.ceil(hours / 2)); next.mood = clamp(next.mood - Math.ceil(hours * .9)); next.hunger = clamp(next.hunger - hours * 2); next.job_exp += hours * 4; minutes = hours === 1 ? 45 : hours === 4 ? 180 : 360;
      const newCareer = careerForCategory(next.job_category, next.job_exp, next.current_job, abilitiesFor(next));
      next.current_job = newCareer.title;
      title = newCareer.title !== previousCareer.title ? `升遷為${newCareer.title}` : `工作 ${hours} 小時`;
      message = `以${previousCareer.title}完成工作，收入 +NT$${income}，職業經驗 +${hours * 4}。${newCareer.title !== previousCareer.title ? ` 恭喜升遷為${newCareer.title}！` : ""}`; break;
    }
    case "study": {
      if (next.location !== "school") return json({ message: "請先前往未來學院。" }, 400);
      if (!isLocationOpen("school", sharedMinutes)) return json({ message: `未來學院開放時間為 ${OPENING_HOURS.school?.label}。` }, 400);
      if (next.illness) return json({ message: `目前罹患${next.illness}，請先前往醫院治療。` }, 400);
      const academy = ACADEMIES.find((item) => item.id === body.academy);
      if (!academy) return json({ message: "這所學院不存在。" }, 400);
      if (next.cash < 500 || next.energy < 10) return json({ message: next.cash < 500 ? "學費不足。" : "體力不足，先休息一下吧。" }, 400);
      next.cash -= 500; next.energy = clamp(next.energy - 10); next.hunger = clamp(next.hunger - 4);
      for (const [key, gain] of Object.entries(academy.gains)) {
        if (key === "physical") next.fitness_exp += gain;
        if (key === "intelligence") next.intelligence_exp += gain;
        if (key === "creativity") next.programming_exp += gain;
        if (key === "social") next.work_exp += gain;
        if (key === "charisma") next.charisma_exp += gain;
      }
      const promoted = careerForCategory(next.job_category, next.job_exp, next.current_job, abilitiesFor(next));
      const promotionMessage = promoted.title !== next.current_job ? ` 能力達標，升遷為${promoted.title}！` : "";
      next.current_job = promoted.title; minutes = 120;
      title = `完成${academy.name}課程`; message = `${formatRequirements(academy.gains)}。${promotionMessage}`; break;
    }
    case "eat": {
      if (next.location !== "shopping") return json({ message: "請先前往購物街。" }, 400);
      if (!isLocationOpen("shopping", sharedMinutes)) return json({ message: `購物街營業時間為 ${OPENING_HOURS.shopping?.label}。` }, 400);
      const meal = body.kind === "rice" ? { name: "飯糰", price: 45, hunger: 20, mood: 1 } : body.kind === "bento" ? { name: "便當", price: 100, hunger: 45, mood: 3 } : null;
      if (!meal) return json({ message: "餐點不存在。" }, 400);
      if (next.cash < meal.price) return json({ message: "現金不足。" }, 400);
      next.cash -= meal.price; next.hunger = clamp(next.hunger + meal.hunger); next.mood = clamp(next.mood + meal.mood); minutes = 20;
      title = `享用${meal.name}`; message = `${meal.name}讓飽足 +${meal.hunger}。`; break;
    }
    case "scratch": {
      if (next.location !== "shopping") return json({ message: "請先前往購物街購買刮刮樂。" }, 400);
      if (!isLocationOpen("shopping", sharedMinutes)) return json({ message: `購物街營業時間為 ${OPENING_HOURS.shopping?.label}。` }, 400);
      if (next.cash < 100) return json({ message: "購買刮刮樂需要 NT$100，目前現金不足。" }, 400);
      const prize = scratchPrize();
      scratch = { price: 100, prize };
      next.cash = next.cash - 100 + prize; minutes = 5;
      title = prize ? `刮刮樂中獎 NT$${prize}` : "刮刮樂未中獎";
      message = prize ? `花費 NT$100，刮中 NT$${prize}，獎金已存入資產。` : "花費 NT$100，這張沒有中獎。";
      tone = prize >= 1_000 ? "good" : "neutral"; break;
    }
    case "sleep":
      if (next.location !== "home") return json({ message: "請先回到溫暖小屋。" }, 400);
      if (!next.owns_home && next.rented_until <= next.elapsed_minutes) return json({ message: "租約已到期，請先到房仲續租。" }, 400);
      next.energy = 100; next.health = clamp(next.health + 5); next.mood = clamp(next.mood + 10); next.hunger = clamp(next.hunger - 12); minutes = 300;
      title = "好好睡了一覺"; message = "體力完全恢復，健康 +5、心情 +10。"; break;
    case "hospital": {
      if (next.location !== "hospital") return json({ message: "請先前往市立醫院。" }, 400);
      if (body.kind !== "emergency" && !isHospitalRegularOpen(sharedMinutes)) return json({ message: "一般門診與完整治療時間為 08:00～20:00；急診 24 小時開放。" }, 400);
      const care = body.kind === "clinic"
        ? { name: "一般門診", price: 600, minutes: 60, health: Math.min(100, next.health + 25), energy: Math.min(100, next.energy + 10) }
        : body.kind === "treatment"
          ? { name: "完整治療", price: 1500, minutes: 120, health: Math.max(80, next.health), energy: Math.min(100, next.energy + 30) }
          : body.kind === "emergency"
            ? { name: "急診治療", price: 2500, minutes: 90, health: Math.max(70, next.health), energy: Math.min(100, next.energy + 20) }
          : null;
      if (!care) return json({ message: "醫療項目不存在。" }, 400);
      if (next.cash < care.price) return json({ message: "醫療費不足。" }, 400);
      const previousIllness = next.illness;
      next.cash -= care.price; next.health = care.health; next.energy = care.energy; next.illness = ""; minutes = care.minutes;
      title = previousIllness ? `治癒${previousIllness}` : care.name;
      message = `${care.name}完成，支付 NT$${care.price}，健康恢復至 ${next.health}${previousIllness ? `，${previousIllness}已痊癒` : ""}。`; break;
    }
    case "reset":
      Object.assign(next, { cash: next.main_story === "prodigal_return" ? 37 : 10000, bank_balance: 0, loan_balance: next.main_story === "prodigal_return" ? 250_000 : 0, finance_day: 1, daily_minimum_payment: next.main_story === "prodigal_return" ? 750 : 0, daily_payment_made: 0, missed_payment_days: 0, game_over: "", energy: 100, health: 100, mood: 80, hunger: 80, intelligence_exp: 0, programming_exp: 0, fitness_exp: 0, work_exp: 0, charisma_exp: 0, current_job: "unemployed", job_category: "unfixed", job_exp: 0, illness: "", owns_home: 0, rental_name: "", rented_until: 0, action_available_at: 0, action_label: "", elapsed_minutes: 450, location: "realtor" });
      title = "重新開始人生"; message = "新的人生已開始，所有進度回到起點。"; tone = "neutral"; break;
    default: return json({ message: "未知的行動。" }, 400);
  }

  if (body.action !== "hospital" && body.action !== "reset") {
    if (next.hunger <= 15) next.health = clamp(next.health - 6);
    if (next.energy <= 5) next.health = clamp(next.health - 4);
    if (!next.illness && next.health < 50) {
      const chance = next.health < 20 ? 0.35 : next.health < 35 ? 0.22 : 0.12;
      if (Math.random() < chance) {
        next.illness = next.health < 30 ? "重感冒" : "感冒";
        tone = "warn";
        title = `生病：${next.illness}`;
        message += ` 健康偏低，你罹患了${next.illness}，請前往市立醫院。`;
      }
    }
  }

  if (minutes > 0) {
    next.action_available_at = Date.now() + minutes * 1_000;
    next.action_label = title;
  } else if (next.action_available_at <= Date.now()) {
    next.action_available_at = 0;
    next.action_label = "";
  }

  if (!next.owns_home && next.rented_until <= next.elapsed_minutes && next.location === "home") {
    next.location = "realtor";
    message += " 租約已到期，你已回到房仲尋找住所。";
  }
  const eventMinute = minuteOfDay(sharedMinutes);
  const gameTime = `${String(Math.floor(eventMinute / 60)).padStart(2, "0")}:${String(eventMinute % 60).padStart(2, "0")}`;
  const now = Date.now();
  const eventId = crypto.randomUUID();
  const statements = [env.DB.prepare(`UPDATE players SET cash=?, bank_balance=?, loan_balance=?, finance_day=?, daily_minimum_payment=?, daily_payment_made=?, missed_payment_days=?, game_over=?, main_story=?, energy=?, health=?, mood=?, hunger=?, intelligence_exp=?, programming_exp=?, fitness_exp=?, work_exp=?, charisma_exp=?, current_job=?, job_category=?, job_exp=?, illness=?, owns_home=?, rental_name=?, rented_until=?, action_available_at=?, action_label=?, elapsed_minutes=?, location=?, updated_at=?, last_seen_at=? WHERE user_id=?`)
    .bind(next.cash, next.bank_balance, next.loan_balance, next.finance_day, next.daily_minimum_payment, next.daily_payment_made, next.missed_payment_days, next.game_over, next.main_story, next.energy, next.health, next.mood, next.hunger, next.intelligence_exp, next.programming_exp, next.fitness_exp, next.work_exp, next.charisma_exp, next.current_job, next.job_category, next.job_exp, next.illness, next.owns_home, next.rental_name, next.rented_until, next.action_available_at, next.action_label, next.elapsed_minutes, next.location, now, now, user.userId)];
  if (body.action !== "move") statements.push(env.DB.prepare("INSERT INTO game_events (id, user_id, player_name, room_id, title, detail, tone, game_time, created_at) VALUES (?, ?, ?, 'lobby-01', ?, ?, ?, ?, ?)")
    .bind(eventId, user.userId, user.displayName.slice(0, 40), title, message, tone, gameTime, now));
  await env.DB.batch(statements);
  const saved = await env.DB.prepare("SELECT * FROM players WHERE user_id = ?").bind(user.userId).first<PlayerRow>();
  const world = await multiplayer(env.DB);
  return json({ player: serializePlayer(saved!), message, scratch, ...world });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request, env) });
    let response: Response;
    if (url.pathname === "/api/auth/register" && request.method === "POST") response = await auth(request, env, "register");
    else if (url.pathname === "/api/auth/login" && request.method === "POST") response = await auth(request, env, "login");
    else if (url.pathname === "/api/auth/logout" && request.method === "POST") response = await logout(request, env);
    else if (url.pathname === "/api/profile/avatar" && request.method === "POST") response = await uploadAvatar(request, env);
    else if (url.pathname.startsWith("/api/avatar/") && request.method === "GET") response = await getAvatar(url.pathname.slice("/api/avatar/".length), env);
    else if (url.pathname === "/api/game" && request.method === "GET") response = await bootstrap(request, env);
    else if (url.pathname === "/api/game/action" && request.method === "POST") response = await takeAction(request, env);
    else if (url.pathname === "/api/casino/action" && request.method === "POST") response = await casinoAction(request, env);
    else if (url.pathname === "/api/poker/action" && request.method === "POST") response = await pokerAction(request, env);
    else if (url.pathname.startsWith("/api/")) response = json({ message: "找不到 API。" }, 404);
    else if (env.ASSETS) return env.ASSETS.fetch(request);
    else response = json({ service: "Life Online API", ok: true });
    return withCors(response, request, env);
  },
} satisfies ExportedHandler<Env>;
