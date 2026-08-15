import { ABILITY_LABELS, ACADEMIES, careerForCategory, careerRequirements, categoryInfo, jobInfo, meetsCareerRequirements, type Abilities } from "../shared/jobs";
import { CITY_EVENTS, STORY_CHAPTERS, storyChapterForDebt, talentInfo } from "../shared/progression";
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
  last_seen_at: number;
};

type CasinoRow = { user_id: string; player_name: string; player_cards: string; dealer_cards: string; bet: number; status: string; result: string; seat_no: number | null; reveal_at: number; updated_at: number };
type PokerRow = { user_id: string; player_name: string; hole_cards: string; community_cards: string; bet: number; status: string; result: string; seat_no: number | null; reveal_at: number; street_bet: number; acted: number; updated_at: number };
type PokerTableRow = { id: string; deck: string; community_cards: string; street: string; current_bet: number; turn_seat: number; pot: number; status: string; updated_at: number };
type ProgressRow = { user_id: string; talent_exp: number; talents: string; story_chapter: number; last_event_day: number; pending_event: string; updated_at: number };
type MemoryRow = { cycle_day: number; work_count: number; hospital_count: number; housing_count: number; casino_count: number; study_count: number; event_count: number };
type TransferRequestRow = { id: string; sender_id: string; sender_name: string; recipient_id: string; kind: "gift" | "scam"; amount: number; status: string; outcome: string; resolution_token: string; created_at: number; expires_at: number; resolved_at: number | null };

const VALID_LOCATIONS = new Set<LocationId>(["home", "realtor", "bank", "business", "shopping", "hotel", "casino", "school", "hospital"]);
// Persist at most one idle heartbeat every ten seconds. Only a short,
// continuous gap counts as online play; returning after going offline adds no time.
const HEARTBEAT_WRITE_INTERVAL_MS = 10_000;
const ONLINE_HEARTBEAT_GRACE_MS = 30_000;
const TRANSFER_REQUEST_TIMEOUT_MS = 60_000;
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
  return { cash: 10000, bankBalance: 0, loanBalance: 0, dailyMinimumPayment: 0, dailyPaymentMade: 0, missedPaymentDays: 0, gameOver: "", mainStory: "legacy", energy: 100, health: 100, mood: 80, hunger: 80, intelligenceExp: 0, creativityExp: 0, physicalExp: 0, socialExp: 0, charismaExp: 0, currentJob: "待業者", jobCategory: "unfixed", jobExp: 0, illness: "", ownsHome: false, rentalName: "", rentedUntil: 0, actionAvailableAt: 0, actionLabel: "", elapsedMinutes: 0, location: "realtor" as LocationId, talentExp: 0, talentLevel: 0, talentPoints: 0, talents: [] as string[], storyChapter: 0, pendingEvent: "" };
}

function parseList(value: string) {
  try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : []; } catch { return []; }
}

function serializePlayer(row: PlayerRow, progress?: ProgressRow | null) {
  const currentJob = jobInfo(row.current_job) ? row.current_job : "待業者";
  const location = VALID_LOCATIONS.has(row.location) ? row.location : "casino";
  const talents = progress ? parseList(progress.talents) : [];
  const talentLevel = Math.min(10, Math.floor((progress?.talent_exp ?? 0) / 100));
  return { cash: row.cash, bankBalance: row.bank_balance, loanBalance: row.loan_balance, dailyMinimumPayment: row.daily_minimum_payment, dailyPaymentMade: row.daily_payment_made, missedPaymentDays: row.missed_payment_days, gameOver: row.game_over, mainStory: row.main_story, energy: row.energy, health: row.health, mood: row.mood, hunger: row.hunger, intelligenceExp: row.intelligence_exp, creativityExp: row.programming_exp, physicalExp: row.fitness_exp, socialExp: row.work_exp, charismaExp: row.charisma_exp, currentJob, jobCategory: currentJob === "待業者" ? "unfixed" : row.job_category, jobExp: currentJob === "待業者" ? 0 : row.job_exp, illness: row.illness, ownsHome: Boolean(row.owns_home), rentalName: row.rental_name, rentedUntil: row.rented_until, actionAvailableAt: row.action_available_at, actionLabel: row.action_label, elapsedMinutes: row.elapsed_minutes, location, talentExp: progress?.talent_exp ?? 0, talentLevel, talentPoints: Math.max(0, talentLevel - talents.length), talents, storyChapter: progress?.story_chapter ?? 0, pendingEvent: progress?.pending_event ?? "" };
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
      elapsed_minutes INTEGER NOT NULL DEFAULT 0,
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
    db.prepare(`CREATE TABLE IF NOT EXISTS player_progress (
      user_id TEXT PRIMARY KEY, talent_exp INTEGER NOT NULL DEFAULT 0,
      talents TEXT NOT NULL DEFAULT '[]', story_chapter INTEGER NOT NULL DEFAULT 0,
      last_event_day INTEGER NOT NULL DEFAULT 0, pending_event TEXT NOT NULL DEFAULT '',
      updated_at INTEGER NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS city_memory_contributions (
      user_id TEXT NOT NULL, cycle_day INTEGER NOT NULL,
      work_count INTEGER NOT NULL DEFAULT 0, hospital_count INTEGER NOT NULL DEFAULT 0,
      housing_count INTEGER NOT NULL DEFAULT 0, casino_count INTEGER NOT NULL DEFAULT 0,
      study_count INTEGER NOT NULL DEFAULT 0, event_count INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (user_id, cycle_day)
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS mystery_clues (
      user_id TEXT NOT NULL, clue_key TEXT NOT NULL, found_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, clue_key)
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS player_transfer_requests (
      id TEXT PRIMARY KEY, sender_id TEXT NOT NULL, sender_name TEXT NOT NULL,
      recipient_id TEXT NOT NULL, kind TEXT NOT NULL, amount INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending', outcome TEXT NOT NULL DEFAULT '',
      resolution_token TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL, resolved_at INTEGER
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS casino_bingo_state (
      id TEXT PRIMARY KEY, round_no INTEGER NOT NULL DEFAULT 1, status TEXT NOT NULL DEFAULT 'lobby',
      host_user_id TEXT NOT NULL DEFAULT '', entry_fee INTEGER NOT NULL DEFAULT 100, drawn_numbers TEXT NOT NULL DEFAULT '[]', next_draw_at INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS casino_bingo_entries (
      round_no INTEGER NOT NULL, user_id TEXT NOT NULL, player_name TEXT NOT NULL, card TEXT NOT NULL,
      PRIMARY KEY (round_no, user_id)
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS casino_tournament_state (
      id TEXT PRIMARY KEY, round_no INTEGER NOT NULL DEFAULT 1, current_round INTEGER NOT NULL DEFAULT 0, game TEXT NOT NULL DEFAULT 'blackjack', status TEXT NOT NULL DEFAULT 'lobby',
      host_user_id TEXT NOT NULL DEFAULT '', entry_fee INTEGER NOT NULL DEFAULT 500, round_limit INTEGER NOT NULL DEFAULT 5, next_round_at INTEGER NOT NULL DEFAULT 0, latest_result TEXT NOT NULL DEFAULT '', updated_at INTEGER NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS casino_tournament_entries (
      tournament_no INTEGER NOT NULL, user_id TEXT NOT NULL, player_name TEXT NOT NULL, score INTEGER NOT NULL DEFAULT 0, latest_hand TEXT NOT NULL DEFAULT '',
      PRIMARY KEY (tournament_no, user_id)
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
    db.prepare("CREATE INDEX IF NOT EXISTS idx_city_memory_cycle ON city_memory_contributions(cycle_day)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_mystery_clues_key ON mystery_clues(clue_key)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_transfer_requests_recipient_status ON player_transfer_requests(recipient_id, status, expires_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_bingo_entries_round ON casino_bingo_entries(round_no)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_tournament_entries_round ON casino_tournament_entries(tournament_no)"),
  ]);
}

let schemaReady: Promise<void> | null = null;
async function ensureSchemaOnce(db: D1Database) {
  if (!schemaReady) {
    schemaReady = ensureSchema(db).catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  await schemaReady;
}

async function upsertPlayer(db: D1Database, user: AuthUser, forceHeartbeat = false) {
  const now = Date.now();
  let row = await db.prepare("SELECT * FROM players WHERE user_id = ?").bind(user.userId).first<PlayerRow>();
  if (!row) {
    row = await db.prepare(`INSERT INTO players (user_id, display_name, email, main_story, current_job, location, elapsed_minutes, created_at, updated_at, last_seen_at)
      VALUES (?, ?, ?, 'unselected', 'unemployed', 'realtor', 0, ?, ?, ?)
      RETURNING *`).bind(user.userId, user.displayName.slice(0, 40), user.email, now, now, now).first<PlayerRow>();
  } else {
    const heartbeatGap = Math.max(0, now - row.last_seen_at);
    if (forceHeartbeat || heartbeatGap >= HEARTBEAT_WRITE_INTERVAL_MS) {
      const creditedMinutes = heartbeatGap <= ONLINE_HEARTBEAT_GRACE_MS ? Math.floor(heartbeatGap / 1000) : 0;
      const elapsedMinutes = Math.floor(row.elapsed_minutes) + creditedMinutes;
      await db.prepare("UPDATE players SET display_name=?, email=?, elapsed_minutes=?, last_seen_at=? WHERE user_id=?")
        .bind(user.displayName.slice(0, 40), user.email, elapsedMinutes, now, user.userId).run();
      row = { ...row, display_name: user.displayName.slice(0, 40), email: user.email, elapsed_minutes: elapsedMinutes, last_seen_at: now };
    }
  }
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
    const progress = await ensureProgress(db, row);
    const elapsedDays = today - row.finance_day;
    let cashBalance = row.cash;
    let bankBalance = row.bank_balance;
    let loanBalance = row.loan_balance;
    let minimumPayment = row.daily_minimum_payment || (row.main_story === "prodigal_return" ? prodigalMinimumPayment(loanBalance) : 0);
    let paymentMade = row.daily_payment_made;
    let missedPaymentDays = row.missed_payment_days;
    let gameOver = row.game_over;
    for (let day = 0; day < elapsedDays; day += 1) {
      if (row.main_story === "prodigal_return" && loanBalance > 0 && !gameOver) {
        const paymentShortfall = Math.min(loanBalance, Math.max(0, minimumPayment - paymentMade));
        if (paymentShortfall > 0) {
          const automaticPayment = Math.min(paymentShortfall, cashBalance + bankBalance);
          const cashPayment = Math.min(cashBalance, automaticPayment);
          cashBalance -= cashPayment;
          bankBalance -= automaticPayment - cashPayment;
          loanBalance -= automaticPayment;
          paymentMade += automaticPayment;
        }
        missedPaymentDays = loanBalance > 0 && paymentMade < minimumPayment ? missedPaymentDays + 1 : 0;
        if (missedPaymentDays >= 2) gameOver = PRODIGAL_FAILURE_ENDING;
      } else if (loanBalance <= 0) missedPaymentDays = 0;
      bankBalance = Math.min(9_000_000_000_000_000, Math.floor(bankBalance * 1.001));
      const dailyLoanRate = row.main_story === "prodigal_return" ? (parseList(progress.talents).includes("credit_rebuild") ? 1.0018 : 1.002) : 1.005;
      loanBalance = Math.min(9_000_000_000_000_000, Math.ceil(loanBalance * dailyLoanRate));
      paymentMade = 0;
      minimumPayment = row.main_story === "prodigal_return" && !gameOver ? prodigalMinimumPayment(loanBalance) : 0;
    }
    await db.prepare("UPDATE players SET cash=?, bank_balance=?, loan_balance=?, finance_day=?, daily_minimum_payment=?, daily_payment_made=?, missed_payment_days=?, game_over=?, updated_at=? WHERE user_id=?")
      .bind(cashBalance, bankBalance, loanBalance, today, minimumPayment, paymentMade, missedPaymentDays, gameOver, now, user.userId).run();
    row.cash = cashBalance; row.bank_balance = bankBalance; row.loan_balance = loanBalance; row.finance_day = today; row.daily_minimum_payment = minimumPayment; row.daily_payment_made = paymentMade; row.missed_payment_days = missedPaymentDays; row.game_over = gameOver;
  }
  return row;
}

async function ensureProgress(db: D1Database, player: PlayerRow) {
  const now = Date.now();
  let progress = await db.prepare("SELECT * FROM player_progress WHERE user_id=?").bind(player.user_id).first<ProgressRow>();
  if (!progress) {
    progress = await db.prepare("INSERT INTO player_progress (user_id, updated_at) VALUES (?, ?) ON CONFLICT(user_id) DO NOTHING RETURNING *")
      .bind(player.user_id, now).first<ProgressRow>();
    if (!progress) progress = await db.prepare("SELECT * FROM player_progress WHERE user_id=?").bind(player.user_id).first<ProgressRow>();
  }
  if (!progress) throw new Error("Unable to initialize player progression");
  const chapter = player.main_story === "prodigal_return" ? storyChapterForDebt(player.loan_balance) : 0;
  if (chapter > progress.story_chapter) {
    const reward = STORY_CHAPTERS.filter((item) => item.chapter > progress!.story_chapter && item.chapter <= chapter).reduce((sum, item) => sum + item.reward, 0);
    await db.prepare("UPDATE player_progress SET story_chapter=?, talent_exp=MIN(1099, talent_exp+?), updated_at=? WHERE user_id=?")
      .bind(chapter, reward, now, player.user_id).run();
    progress = { ...progress, story_chapter: chapter, talent_exp: Math.min(1099, progress.talent_exp + reward), updated_at: now };
  }
  return progress;
}

function memoryCycleDay() {
  const day = Math.floor(worldMinutes() / 1440) + 1;
  return day - ((day - 1) % 3);
}

async function recordCityMemory(db: D1Database, userId: string, metric: "work" | "hospital" | "housing" | "casino" | "study" | "event") {
  const cycle = memoryCycleDay();
  const column = `${metric}_count`;
  await db.prepare(`INSERT INTO city_memory_contributions (user_id, cycle_day, ${column}) VALUES (?, ?, 1)
    ON CONFLICT(user_id, cycle_day) DO UPDATE SET ${column}=MIN(5, ${column}+1)`)
    .bind(userId, cycle).run();
}

async function cityMemory(db: D1Database) {
  const cycleDay = memoryCycleDay();
  const row = await db.prepare(`SELECT ? AS cycle_day,
    COALESCE(SUM(work_count),0) AS work_count, COALESCE(SUM(hospital_count),0) AS hospital_count,
    COALESCE(SUM(housing_count),0) AS housing_count, COALESCE(SUM(casino_count),0) AS casino_count,
    COALESCE(SUM(study_count),0) AS study_count, COALESCE(SUM(event_count),0) AS event_count
    FROM city_memory_contributions WHERE cycle_day=?`).bind(cycleDay, cycleDay).first<MemoryRow>();
  const memory = row ?? { cycle_day: cycleDay, work_count: 0, hospital_count: 0, housing_count: 0, casino_count: 0, study_count: 0, event_count: 0 };
  const state = memory.work_count >= 20 ? { name: "就業熱潮", description: "全城工作收入暫時提高 5%。", tone: "good" }
    : memory.hospital_count >= 10 ? { name: "健康警報", description: "市立醫院費用暫時降低 20%。", tone: "warn" }
      : memory.housing_count >= 15 ? { name: "租屋熱潮", description: "城市正在關注快速增加的居住需求。", tone: "neutral" }
        : { name: "平靜日常", description: "城市正在記住每位居民今天做出的選擇。", tone: "neutral" };
  return { cycleDay, days: 3, state, totals: { work: memory.work_count, hospital: memory.hospital_count, housing: memory.housing_count, casino: memory.casino_count, study: memory.study_count, event: memory.event_count } };
}

async function maybeFindMysteryClue(db: D1Database, userId: string, location: LocationId) {
  const clueByLocation: Partial<Record<LocationId, string>> = { realtor: "address", bank: "loan", hospital: "record", hotel: "key", business: "company", school: "map", casino: "joker" };
  const clue = clueByLocation[location];
  if (!clue || Math.random() >= .08) return "";
  const inserted = await db.prepare("INSERT INTO mystery_clues (user_id, clue_key, found_at) VALUES (?, ?, ?) ON CONFLICT(user_id, clue_key) DO NOTHING RETURNING clue_key")
    .bind(userId, clue, Date.now()).first<{ clue_key: string }>();
  if (!inserted) return "";
  const notes: Record<string, string> = { address: "收據背面寫著一個地圖上不存在的地址。", loan: "一筆沒有屋主姓名的舊貸款從畫面上一閃而過。", record: "病歷櫃深處夾著一張沒有姓名的病歷。", key: "櫃台下方有一把沒有房號的舊鑰匙。", company: "停業公司的資料裡反覆出現同一棟房子。", map: "舊地圖的空白處似乎被人刻意刮去。", joker: "陌生人留下半句話：那間房子從來不在地圖上。" };
  const shared = await db.prepare("SELECT COUNT(DISTINCT clue_key) AS total FROM mystery_clues").first<{ total: number }>();
  return ` 你似乎發現了不屬於這裡的東西：${notes[clue]}${(shared?.total ?? 0) >= 7 ? " 城市裡不同的人似乎已經看見了同一個輪廓；某扇沒有地址的門，短暫地亮起了燈。" : ""}`;
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

async function pendingTransferRequests(db: D1Database, recipientId: string) {
  const requests = await db.prepare(`SELECT id, sender_id, sender_name, recipient_id, kind, amount, status, outcome, resolution_token, created_at, expires_at, resolved_at
    FROM player_transfer_requests
    WHERE recipient_id=? AND status='pending' AND expires_at>?
    ORDER BY created_at ASC LIMIT 1`).bind(recipientId, Date.now()).all<TransferRequestRow>();
  return requests.results.map((request) => ({ id: request.id, senderName: request.sender_name, amount: request.amount, expiresAt: request.expires_at }));
}

async function transferActionResponse(db: D1Database, user: AuthUser, player: PlayerRow, progress: ProgressRow, message: string) {
  const [world, transfers] = await Promise.all([multiplayer(db), pendingTransferRequests(db, user.userId)]);
  return json({ player: serializePlayer(player, progress), message, transferRequests: transfers, ...world });
}

async function recordTransferEvent(db: D1Database, senderId: string, senderName: string, title: string, detail: string, tone: "good" | "neutral" | "warn" = "neutral") {
  const current = minuteOfDay(worldMinutes());
  const gameTime = `${String(Math.floor(current / 60)).padStart(2, "0")}:${String(current % 60).padStart(2, "0")}`;
  await db.prepare("INSERT INTO game_events (id, user_id, player_name, room_id, title, detail, tone, game_time, created_at) VALUES (?, ?, ?, 'lobby-01', ?, ?, ?, ?, ?)")
    .bind(crypto.randomUUID(), senderId, senderName.slice(0, 40), title, detail, tone, gameTime, Date.now()).run();
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

const MIN_CASINO_ENTRY_FEE = 100;
const MAX_CASINO_ENTRY_FEE = 10_000;
const BINGO_ENTRY_FEE = 100;
const TOURNAMENT_ENTRY_FEE = 500;
const TOURNAMENT_ROUNDS = 5;
const BINGO_LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
const randomIndex = (size: number) => Math.floor((crypto.getRandomValues(new Uint32Array(1))[0] / 4_294_967_296) * size);
const randomBingoCard = () => { const pool = Array.from({ length: 25 }, (_, index) => index + 1); const card: number[] = []; while (card.length < 9) card.push(pool.splice(randomIndex(pool.length), 1)[0]); return card; };
const bingoLine = (card: number[], drawn: number[]) => BINGO_LINES.some((line) => line.every((index) => drawn.includes(card[index])));

async function bingoState(db: D1Database, userId: string) {
  let state = await db.prepare("SELECT * FROM casino_bingo_state WHERE id='bingo-01'").first<{ round_no: number; status: string; host_user_id: string; entry_fee: number; drawn_numbers: string; next_draw_at: number }>();
  if (!state) { await db.prepare("INSERT INTO casino_bingo_state (id, updated_at) VALUES ('bingo-01', ?)").bind(Date.now()).run(); state = { round_no: 1, status: "lobby", host_user_id: "", entry_fee: BINGO_ENTRY_FEE, drawn_numbers: "[]", next_draw_at: 0 }; }
  if (state.status === "drawing" && state.next_draw_at <= Date.now()) {
    const drawn = parseCards(state.drawn_numbers).map(Number); const remaining = Array.from({ length: 25 }, (_, index) => index + 1).filter((number) => !drawn.includes(number));
    if (remaining.length) drawn.push(remaining[randomIndex(remaining.length)]);
    const entries = await db.prepare("SELECT user_id, player_name, card FROM casino_bingo_entries WHERE round_no=?").bind(state.round_no).all<{ user_id: string; player_name: string; card: string }>();
    const winners = entries.results.filter((entry) => bingoLine(parseCards(entry.card).map(Number), drawn));
    if (winners.length) {
      const prize = Math.floor((entries.results.length * state.entry_fee) / winners.length);
      await db.batch([db.prepare("UPDATE casino_bingo_state SET status='completed', drawn_numbers=?, next_draw_at=0, updated_at=? WHERE id='bingo-01'").bind(JSON.stringify(drawn), Date.now()), ...winners.map((winner) => db.prepare("UPDATE players SET cash=cash+? WHERE user_id=?").bind(prize, winner.user_id))]);
    } else await db.prepare("UPDATE casino_bingo_state SET drawn_numbers=?, next_draw_at=?, updated_at=? WHERE id='bingo-01'").bind(JSON.stringify(drawn), Date.now() + 2_000, Date.now()).run();
    state = await db.prepare("SELECT * FROM casino_bingo_state WHERE id='bingo-01'").first<{ round_no: number; status: string; host_user_id: string; entry_fee: number; drawn_numbers: string; next_draw_at: number }>();
  }
  const entries = await db.prepare("SELECT user_id, player_name, card FROM casino_bingo_entries WHERE round_no=? ORDER BY player_name").bind(state!.round_no).all<{ user_id: string; player_name: string; card: string }>();
  const drawn = parseCards(state!.drawn_numbers).map(Number);
  return { hostUserId: state!.host_user_id, entryFee: state!.entry_fee, capacity: 5, status: state!.status, roundNo: state!.round_no, drawn, nextDrawAt: state!.next_draw_at, players: entries.results.map((entry) => ({ id: entry.user_id, displayName: entry.player_name, card: parseCards(entry.card).map(Number), isMine: entry.user_id === userId })) };
}

async function bingoAction(request: Request, env: Env) {
  const user = await identity(request, env.DB); if (!user || !env.DB) return json({ message: "請先登入才能參加賓果。" }, 401);
  await ensureSchemaOnce(env.DB); const player = await upsertPlayer(env.DB, user, true);
  if (!player || player.location !== "casino" || player.game_over) return json({ message: "請先前往賭場，並確認人生仍在進行。" }, 400);
  const body = await request.json() as { action?: string; entryFee?: number };
  if (!body.action || !["join", "leave"].includes(body.action)) return json({ message: "未知的賓果行動。" }, 400);
  let state = await bingoState(env.DB, user.userId);
  if (body.action === "leave") {
    if (state.status !== "lobby") return json({ message: "賓果已經開始，現在不能離開座位。" }, 409);
    if (!state.players.some((entry) => entry.id === user.userId)) return json({ message: "你不在這個賓果房間。" }, 409);
    const leavingFee = state.entryFee;
    await env.DB.batch([
      env.DB.prepare("UPDATE players SET cash=cash+? WHERE user_id=? AND EXISTS (SELECT 1 FROM casino_bingo_state WHERE id='bingo-01' AND status='lobby') AND EXISTS (SELECT 1 FROM casino_bingo_entries WHERE round_no=? AND user_id=?)").bind(leavingFee, user.userId, state.roundNo, user.userId),
      env.DB.prepare("DELETE FROM casino_bingo_entries WHERE round_no=? AND user_id=? AND EXISTS (SELECT 1 FROM casino_bingo_state WHERE id='bingo-01' AND status='lobby')").bind(state.roundNo, user.userId),
      env.DB.prepare("UPDATE casino_bingo_state SET host_user_id=COALESCE((SELECT user_id FROM casino_bingo_entries WHERE round_no=? ORDER BY rowid LIMIT 1), ''), entry_fee=CASE WHEN EXISTS (SELECT 1 FROM casino_bingo_entries WHERE round_no=?) THEN entry_fee ELSE ? END, updated_at=? WHERE id='bingo-01' AND status='lobby'").bind(state.roundNo, state.roundNo, BINGO_ENTRY_FEE, Date.now()),
    ]);
    state = await bingoState(env.DB, user.userId);
    if (state.players.some((entry) => entry.id === user.userId)) return json({ message: "賓果已經開始，無法離開座位。" }, 409);
    const saved = await env.DB.prepare("SELECT * FROM players WHERE user_id=?").bind(user.userId).first<PlayerRow>(); const progress = await ensureProgress(env.DB, saved!);
    return json({ player: serializePlayer(saved!, progress), bingo: state, message: `已離開賓果房間，退還 NT$${leavingFee.toLocaleString()}。` });
  }
  if (state.status === "completed") { await env.DB.prepare("UPDATE casino_bingo_state SET round_no=round_no+1, status='lobby', host_user_id='', entry_fee=?, drawn_numbers='[]', next_draw_at=0, updated_at=? WHERE id='bingo-01'").bind(BINGO_ENTRY_FEE, Date.now()).run(); state = await bingoState(env.DB, user.userId); }
  if (state.status !== "lobby") return json({ message: "本輪賓果已開始，請等待下一輪。" }, 409);
  if (state.players.some((entry) => entry.id === user.userId)) return json({ message: "你已加入本輪賓果。" }, 409);
  const hosting = !state.hostUserId;
  const entryFee = hosting ? Math.floor(Number(body.entryFee)) : state.entryFee;
  if (!Number.isInteger(entryFee) || entryFee < MIN_CASINO_ENTRY_FEE || entryFee > MAX_CASINO_ENTRY_FEE) return json({ message: `報名費需介於 NT$${MIN_CASINO_ENTRY_FEE}～${MAX_CASINO_ENTRY_FEE.toLocaleString()}。` }, 400);
  if (state.players.length >= 5 || player.cash < entryFee) return json({ message: state.players.length >= 5 ? "本輪賓果已滿 5 人。" : `現金不足 NT$${entryFee.toLocaleString()}。` }, 409);
  if (hosting) {
    await env.DB.prepare("UPDATE casino_bingo_state SET host_user_id=?, entry_fee=?, updated_at=? WHERE id='bingo-01' AND host_user_id=''").bind(user.userId, entryFee, Date.now()).run();
    const claimed = await bingoState(env.DB, user.userId);
    if (claimed.hostUserId !== user.userId) return json({ message: "已有玩家先開房，請依目前報名費重新加入。" }, 409);
  }
  try {
    await env.DB.batch([env.DB.prepare("UPDATE players SET cash=cash-? WHERE user_id=? AND cash>=?").bind(entryFee, user.userId, entryFee), env.DB.prepare("INSERT INTO casino_bingo_entries (round_no, user_id, player_name, card) VALUES (?, ?, ?, ?)").bind(state.roundNo, user.userId, user.displayName.slice(0, 40), JSON.stringify(randomBingoCard()))]);
  } catch (error) {
    if (hosting) await env.DB.prepare("UPDATE casino_bingo_state SET host_user_id=COALESCE((SELECT user_id FROM casino_bingo_entries WHERE round_no=? ORDER BY rowid LIMIT 1), ''), entry_fee=CASE WHEN EXISTS (SELECT 1 FROM casino_bingo_entries WHERE round_no=?) THEN entry_fee ELSE ? END WHERE id='bingo-01' AND host_user_id=?").bind(state.roundNo, state.roundNo, BINGO_ENTRY_FEE, user.userId).run();
    throw error;
  }
  const joinedState = await bingoState(env.DB, user.userId);
  if (joinedState.status === "lobby" && joinedState.players.length >= 2) await env.DB.prepare("UPDATE casino_bingo_state SET status='drawing', next_draw_at=?, updated_at=? WHERE id='bingo-01' AND status='lobby'").bind(Date.now() + 2_000, Date.now()).run();
  const saved = await env.DB.prepare("SELECT * FROM players WHERE user_id=?").bind(user.userId).first<PlayerRow>(); const progress = await ensureProgress(env.DB, saved!);
  return json({ player: serializePlayer(saved!, progress), bingo: await bingoState(env.DB, user.userId), message: joinedState.players.length >= 2 ? "賓果開獎開始！每 2 秒公開一個號碼。" : "已加入賓果，等待另一位玩家加入。" });
}

async function tournamentState(db: D1Database, userId: string) {
  let state = await db.prepare("SELECT * FROM casino_tournament_state WHERE id='tournament-01'").first<{ round_no: number; current_round: number; game: string; status: string; host_user_id: string; entry_fee: number; round_limit: number; next_round_at: number; latest_result: string }>();
  if (!state) { await db.prepare("INSERT INTO casino_tournament_state (id, updated_at) VALUES ('tournament-01', ?)").bind(Date.now()).run(); state = { round_no: 1, current_round: 0, game: "blackjack", status: "lobby", host_user_id: "", entry_fee: TOURNAMENT_ENTRY_FEE, round_limit: TOURNAMENT_ROUNDS, next_round_at: 0, latest_result: "" }; }
  if (state.status === "playing" && state.next_round_at <= Date.now()) {
    const entries = await db.prepare("SELECT * FROM casino_tournament_entries WHERE tournament_no=?").bind(state.round_no).all<{ user_id: string; player_name: string; score: number; latest_hand: string }>();
    const deck = shuffledDeck();
    const results = entries.results.map((entry) => {
      if (state!.game === "blackjack") { const cards = [deck.pop()!, deck.pop()!]; while (handScore(cards) < 17) cards.push(deck.pop()!); const score = handScore(cards); return { ...entry, value: score > 21 ? 0 : score, hand: `${cards.join(" ")} · ${score > 21 ? "爆牌" : `${score} 點`}` }; }
      const cards = [deck.pop()!, deck.pop()!, deck.pop()!, deck.pop()!, deck.pop()!, deck.pop()!, deck.pop()!]; const hand = bestPokerHand(cards); return { ...entry, value: hand.score, hand: `${hand.name} · ${cards.slice(0, 2).join(" ")}` };
    });
    results.sort((left, right) => state!.game === "blackjack" ? Number(right.value) - Number(left.value) : comparePokerScores(right.value as number[], left.value as number[]));
    const updates = results.map((result, index) => db.prepare("UPDATE casino_tournament_entries SET score=score+?, latest_hand=? WHERE tournament_no=? AND user_id=?").bind(results.length - index, result.hand, state!.round_no, result.user_id));
    const summary = results.map((result, index) => `${index + 1}.${result.player_name}`).join(" · ");
    const resolvedRound = state.current_round + 1;
    if (resolvedRound >= state.round_limit) {
      const finalScores = results.map((entry, index) => ({ ...entry, score: entry.score + results.length - index })).sort((left, right) => right.score - left.score);
      const pool = entries.results.length * state.entry_fee; const shares = finalScores.length === 2 ? [.7, .3] : [.6, .3, .1];
      await db.batch([...updates, ...finalScores.slice(0, shares.length).map((entry, index) => db.prepare("UPDATE players SET cash=cash+? WHERE user_id=?").bind(Math.floor(pool * shares[index]), entry.user_id)), db.prepare("UPDATE casino_tournament_state SET status='completed', latest_result=?, next_round_at=0, updated_at=? WHERE id='tournament-01'").bind(`賽事結束：${finalScores.map((entry, index) => `${index + 1}.${entry.player_name}`).join(" · ")}`, Date.now())]);
    } else await db.batch([...updates, db.prepare("UPDATE casino_tournament_state SET current_round=?, latest_result=?, next_round_at=?, updated_at=? WHERE id='tournament-01'").bind(resolvedRound, `第 ${resolvedRound} 局結果：${summary}`, Date.now() + 5_000, Date.now())]);
    state = await db.prepare("SELECT * FROM casino_tournament_state WHERE id='tournament-01'").first<{ round_no: number; current_round: number; game: string; status: string; host_user_id: string; entry_fee: number; round_limit: number; next_round_at: number; latest_result: string }>();
  }
  const entries = await db.prepare("SELECT user_id, player_name, score, latest_hand FROM casino_tournament_entries WHERE tournament_no=? ORDER BY score DESC, player_name").bind(state!.round_no).all<{ user_id: string; player_name: string; score: number; latest_hand: string }>();
  return { hostUserId: state!.host_user_id, entryFee: state!.entry_fee, capacity: 5, game: state!.game, status: state!.status, tournamentNo: state!.round_no, currentRound: state!.current_round, roundLimit: state!.round_limit, nextRoundAt: state!.next_round_at, latestResult: state!.latest_result, players: entries.results.map((entry) => ({ id: entry.user_id, displayName: entry.player_name, score: entry.score, latestHand: entry.latest_hand, isMine: entry.user_id === userId })) };
}

async function tournamentAction(request: Request, env: Env) {
  const user = await identity(request, env.DB); if (!user || !env.DB) return json({ message: "請先登入才能參加錦標賽。" }, 401);
  await ensureSchemaOnce(env.DB); const player = await upsertPlayer(env.DB, user, true);
  if (!player || player.location !== "casino" || player.game_over) return json({ message: "請先前往賭場，並確認人生仍在進行。" }, 400);
  const body = await request.json() as { action?: string; game?: string; entryFee?: number };
  if (!body.action || !["join", "leave"].includes(body.action)) return json({ message: "未知的錦標賽行動。" }, 400);
  if (body.action === "join" && !["blackjack", "poker"].includes(body.game || "")) return json({ message: "請選擇二十一點或德州撲克錦標賽。" }, 400);
  let state = await tournamentState(env.DB, user.userId);
  if (body.action === "leave") {
    if (state.status !== "lobby") return json({ message: "錦標賽已經開始，現在不能離開座位。" }, 409);
    if (!state.players.some((entry) => entry.id === user.userId)) return json({ message: "你不在這個錦標賽房間。" }, 409);
    const leavingFee = state.entryFee;
    await env.DB.batch([
      env.DB.prepare("UPDATE players SET cash=cash+? WHERE user_id=? AND EXISTS (SELECT 1 FROM casino_tournament_state WHERE id='tournament-01' AND status='lobby') AND EXISTS (SELECT 1 FROM casino_tournament_entries WHERE tournament_no=? AND user_id=?)").bind(leavingFee, user.userId, state.tournamentNo, user.userId),
      env.DB.prepare("DELETE FROM casino_tournament_entries WHERE tournament_no=? AND user_id=? AND EXISTS (SELECT 1 FROM casino_tournament_state WHERE id='tournament-01' AND status='lobby')").bind(state.tournamentNo, user.userId),
      env.DB.prepare("UPDATE casino_tournament_state SET host_user_id=COALESCE((SELECT user_id FROM casino_tournament_entries WHERE tournament_no=? ORDER BY rowid LIMIT 1), ''), game=CASE WHEN EXISTS (SELECT 1 FROM casino_tournament_entries WHERE tournament_no=?) THEN game ELSE 'blackjack' END, entry_fee=CASE WHEN EXISTS (SELECT 1 FROM casino_tournament_entries WHERE tournament_no=?) THEN entry_fee ELSE ? END, updated_at=? WHERE id='tournament-01' AND status='lobby'").bind(state.tournamentNo, state.tournamentNo, state.tournamentNo, TOURNAMENT_ENTRY_FEE, Date.now()),
    ]);
    state = await tournamentState(env.DB, user.userId);
    if (state.players.some((entry) => entry.id === user.userId)) return json({ message: "錦標賽已經開始，無法離開座位。" }, 409);
    const saved = await env.DB.prepare("SELECT * FROM players WHERE user_id=?").bind(user.userId).first<PlayerRow>(); const progress = await ensureProgress(env.DB, saved!);
    return json({ player: serializePlayer(saved!, progress), tournament: state, message: `已離開錦標賽，退還 NT$${leavingFee.toLocaleString()}。` });
  }
  if (state.status === "completed") { await env.DB.prepare("UPDATE casino_tournament_state SET round_no=round_no+1, current_round=0, game=?, status='lobby', host_user_id='', entry_fee=?, round_limit=?, next_round_at=0, latest_result='', updated_at=? WHERE id='tournament-01'").bind(body.game, TOURNAMENT_ENTRY_FEE, TOURNAMENT_ROUNDS, Date.now()).run(); state = await tournamentState(env.DB, user.userId); }
  if (state.status !== "lobby") return json({ message: "錦標賽已經開始，請等待下一場。" }, 409);
  if (state.hostUserId && state.game !== body.game) return json({ message: "目前大廳正在等待另一種錦標賽，請選擇相同玩法。" }, 409);
  const hosting = !state.hostUserId;
  const entryFee = hosting ? Math.floor(Number(body.entryFee)) : state.entryFee;
  if (!Number.isInteger(entryFee) || entryFee < MIN_CASINO_ENTRY_FEE || entryFee > MAX_CASINO_ENTRY_FEE) return json({ message: `報名費需介於 NT$${MIN_CASINO_ENTRY_FEE}～${MAX_CASINO_ENTRY_FEE.toLocaleString()}。` }, 400);
  if (state.players.some((entry) => entry.id === user.userId) || state.players.length >= 5 || player.cash < entryFee) return json({ message: state.players.some((entry) => entry.id === user.userId) ? "你已報名這場錦標賽。" : state.players.length >= 5 ? "本場錦標賽已滿 5 人。" : `現金不足 NT$${entryFee.toLocaleString()}。` }, 409);
  if (hosting) {
    await env.DB.prepare("UPDATE casino_tournament_state SET host_user_id=?, game=?, entry_fee=?, round_limit=?, updated_at=? WHERE id='tournament-01' AND host_user_id=''").bind(user.userId, body.game, entryFee, TOURNAMENT_ROUNDS, Date.now()).run();
    const claimed = await tournamentState(env.DB, user.userId);
    if (claimed.hostUserId !== user.userId) return json({ message: "已有玩家先開房，請依目前玩法與報名費重新加入。" }, 409);
  }
  try {
    await env.DB.batch([env.DB.prepare("UPDATE players SET cash=cash-? WHERE user_id=? AND cash>=?").bind(entryFee, user.userId, entryFee), env.DB.prepare("INSERT INTO casino_tournament_entries (tournament_no, user_id, player_name) VALUES (?, ?, ?)").bind(state.tournamentNo, user.userId, user.displayName.slice(0, 40))]);
  } catch (error) {
    if (hosting) await env.DB.prepare("UPDATE casino_tournament_state SET host_user_id=COALESCE((SELECT user_id FROM casino_tournament_entries WHERE tournament_no=? ORDER BY rowid LIMIT 1), ''), game=CASE WHEN EXISTS (SELECT 1 FROM casino_tournament_entries WHERE tournament_no=?) THEN game ELSE 'blackjack' END, entry_fee=CASE WHEN EXISTS (SELECT 1 FROM casino_tournament_entries WHERE tournament_no=?) THEN entry_fee ELSE ? END WHERE id='tournament-01' AND host_user_id=?").bind(state.tournamentNo, state.tournamentNo, state.tournamentNo, TOURNAMENT_ENTRY_FEE, user.userId).run();
    throw error;
  }
  const joinedState = await tournamentState(env.DB, user.userId);
  if (joinedState.status === "lobby" && joinedState.players.length >= 2) await env.DB.prepare("UPDATE casino_tournament_state SET status='playing', next_round_at=?, updated_at=? WHERE id='tournament-01' AND status='lobby'").bind(Date.now() + 5_000, Date.now()).run();
  const saved = await env.DB.prepare("SELECT * FROM players WHERE user_id=?").bind(user.userId).first<PlayerRow>(); const progress = await ensureProgress(env.DB, saved!);
  return json({ player: serializePlayer(saved!, progress), tournament: await tournamentState(env.DB, user.userId), message: joinedState.players.length >= 2 ? "錦標賽開始，五局積分後依名次分配獎金。" : "報名完成，等待至少一位玩家加入。" });
}

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
  let [seats, own] = await Promise.all([
    db.prepare(`SELECT * FROM casino_hands WHERE status IN ${ACTIVE_CASINO_STATUSES} AND seat_no IS NOT NULL ORDER BY seat_no LIMIT 5`).all<CasinoRow>(),
    db.prepare("SELECT * FROM casino_hands WHERE user_id = ?").bind(userId).first<CasinoRow>(),
  ]);
  const now = Date.now();
  const needsIdleExpiry = seats.results.some((seat) => seat.status === "seated" && seat.updated_at < now - IDLE_CASINO_SEAT_TIMEOUT_MS);
  const needsRoundReveal = seats.results.some((seat) => seat.status === "waiting" && seat.reveal_at > 0 && seat.reveal_at <= now);
  const roundCutoff = now - 5 * 60 * 1000;
  const needsRoundExpiry = seats.results.some((seat) => ["waiting", "playing", "stood"].includes(seat.status) && seat.updated_at < roundCutoff);
  if (needsIdleExpiry || needsRoundReveal || needsRoundExpiry) {
    if (needsIdleExpiry) await expireIdleBlackjackSeats(db);
    if (needsRoundReveal) await revealReadyCasinoRound(db);
    if (needsRoundExpiry) await db.prepare("UPDATE casino_hands SET status='expired', seat_no=NULL, reveal_at=0 WHERE status IN ('waiting','playing','stood') AND updated_at<?").bind(roundCutoff).run();
    [seats, own] = await Promise.all([
      db.prepare(`SELECT * FROM casino_hands WHERE status IN ${ACTIVE_CASINO_STATUSES} AND seat_no IS NOT NULL ORDER BY seat_no LIMIT 5`).all<CasinoRow>(),
      db.prepare("SELECT * FROM casino_hands WHERE user_id = ?").bind(userId).first<CasinoRow>(),
    ]);
  }
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
  await ensureSchemaOnce(env.DB);
  const player = await upsertPlayer(env.DB, user, true);
  if (!player) return json({ message: "找不到玩家資料。" }, 404);
  if (player.game_over) return json({ message: "這段人生已經結束，請重新開始。" }, 409);
  if (player.location !== "casino") return json({ message: "請先前往幸運賭場。" }, 400);
  await expireIdleBlackjackSeats(env.DB);
  let body: { action?: string; bet?: number; seatNo?: number };
  try { body = await request.json(); } catch { return json({ message: "牌桌資料格式錯誤。" }, 400); }
  // Work, sleep, and other timed activities continue in the background; casino play stays available during that wait.
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
  if (body.action === "deal") await recordCityMemory(env.DB, user.userId, "casino");
  const progress = await ensureProgress(env.DB, saved!);
  return json({ player: serializePlayer(saved!, progress), casino: await casinoState(env.DB, user.userId), message, cityMemory: await cityMemory(env.DB) });
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
  let [seats, own, table] = await Promise.all([
    db.prepare(`SELECT * FROM poker_hands WHERE status IN ${POKER_ACTIVE_STATUSES} AND seat_no IS NOT NULL ORDER BY seat_no LIMIT 5`).all<PokerRow>(),
    db.prepare("SELECT * FROM poker_hands WHERE user_id=?").bind(userId).first<PokerRow>(), pokerTable(db),
  ]);
  if (seats.results.some((seat) => ["seated", "ready"].includes(seat.status) && seat.updated_at < Date.now() - IDLE_CASINO_SEAT_TIMEOUT_MS)) {
    await expireIdlePokerSeats(db);
    [seats, own, table] = await Promise.all([
      db.prepare(`SELECT * FROM poker_hands WHERE status IN ${POKER_ACTIVE_STATUSES} AND seat_no IS NOT NULL ORDER BY seat_no LIMIT 5`).all<PokerRow>(),
      db.prepare("SELECT * FROM poker_hands WHERE user_id=?").bind(userId).first<PokerRow>(), pokerTable(db),
    ]);
  }
  const state = table ?? { street: "idle", current_bet: 0, turn_seat: 0, pot: 0, status: "idle", community_cards: "[]" };
  return { capacity: 5, activeCount: seats.results.length, phase: state.status === "playing" ? "playing" : "idle", communityCards: parseCards(state.community_cards), pot: state.pot, street: state.street, currentBet: state.current_bet, turnSeat: state.turn_seat,
    seats: seats.results.map((seat) => ({ id: seat.user_id, displayName: seat.player_name, seatNo: seat.seat_no, status: seat.status, bet: seat.bet, streetBet: seat.street_bet, cards: seat.user_id === userId || state.status !== "playing" ? parseCards(seat.hole_cards) : seat.status === "playing" ? ["🂠", "🂠"] : [], result: seat.result, isMine: seat.user_id === userId })),
    hand: own ? { cards: parseCards(own.hole_cards), bet: own.bet, streetBet: own.street_bet, seatNo: own.seat_no, status: own.status, result: own.result, isTurn: state.status === "playing" && own.status === "playing" && own.seat_no === state.turn_seat } : null };
}

async function pokerAction(request: Request, env: Env) {
  const user = await identity(request, env.DB);
  if (!user || !env.DB) return json({ message: "請先登入才能加入德州撲克牌桌。" }, 401);
  await ensureSchemaOnce(env.DB);
  const player = await upsertPlayer(env.DB, user, true);
  if (player?.game_over) return json({ message: "這段人生已經結束，請重新開始。" }, 409);
  if (!player || player.location !== "casino") return json({ message: "請先前往幸運賭場。" }, 400);
  await expireIdlePokerSeats(env.DB);
  let body: { action?: string; bet?: number; seatNo?: number; amount?: number };
  try { body = await request.json(); } catch { return json({ message: "牌桌資料格式錯誤。" }, 400); }
  // Work, sleep, and other timed activities continue in the background; casino play stays available during that wait.
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
  if (["bet", "call", "raise"].includes(body.action || "")) await recordCityMemory(env.DB, user.userId, "casino");
  const progress = await ensureProgress(env.DB, saved!);
  return json({ player: serializePlayer(saved!, progress), poker: await pokerState(env.DB, user.userId), message, cityMemory: await cityMemory(env.DB) });
}

async function auth(request: Request, env: Env, mode: "register" | "login") {
  if (!env.DB) return json({ message: "資料庫尚未連接。" }, 503);
  await ensureSchemaOnce(env.DB);
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

async function updateDisplayName(request: Request, env: Env) {
  const user = await identity(request, env.DB);
  if (!user) return json({ message: "請先登入後再更改玩家名字。" }, 401);
  if (!env.DB) return json({ message: "遊戲資料庫尚未連接。" }, 503);
  await ensureSchemaOnce(env.DB);
  let body: { displayName?: string };
  try { body = await request.json(); } catch { return json({ message: "資料格式錯誤。" }, 400); }
  const displayName = typeof body.displayName === "string" ? body.displayName.trim().replace(/\s+/g, " ") : "";
  if (displayName.length < 2 || displayName.length > 24 || /[\u0000-\u001f\u007f]/.test(displayName)) {
    return json({ message: "玩家名字需為 2～24 個字元，不能是空白或控制字元。" }, 400);
  }
  const current = await upsertPlayer(env.DB, user, true);
  if (!current) return json({ message: "找不到玩家資料。" }, 404);
  const now = Date.now();
  await env.DB.batch([
    env.DB.prepare("UPDATE accounts SET display_name=? WHERE id=?").bind(displayName, user.userId),
    env.DB.prepare("UPDATE players SET display_name=?, updated_at=?, last_seen_at=? WHERE user_id=?").bind(displayName, now, now, user.userId),
    env.DB.prepare("UPDATE game_events SET player_name=? WHERE user_id=?").bind(displayName, user.userId),
    env.DB.prepare("UPDATE casino_hands SET player_name=? WHERE user_id=?").bind(displayName, user.userId),
    env.DB.prepare("UPDATE poker_hands SET player_name=? WHERE user_id=?").bind(displayName, user.userId),
    env.DB.prepare("UPDATE casino_bingo_entries SET player_name=? WHERE user_id=?").bind(displayName, user.userId),
    env.DB.prepare("UPDATE casino_tournament_entries SET player_name=? WHERE user_id=?").bind(displayName, user.userId),
    env.DB.prepare("UPDATE player_transfer_requests SET sender_name=? WHERE sender_id=?").bind(displayName, user.userId),
  ]);
  const saved = await env.DB.prepare("SELECT * FROM players WHERE user_id=?").bind(user.userId).first<PlayerRow>();
  if (!saved) return json({ message: "玩家資料更新後無法載入。" }, 500);
  const progress = await ensureProgress(env.DB, saved);
  const updatedUser = { ...user, displayName };
  return json({ profile: profileFor(updatedUser), player: serializePlayer(saved, progress), message: `玩家名字已更新為「${displayName}」。` });
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
  if (!user || !env.DB) return json({ authenticated: false, profile: null, player: guestPlayer(), room: { id: "lobby-01", name: "城市大廳 01" }, online: [], feed: [], casino: { capacity: 5, activeCount: 0, seats: [], hand: null }, poker: { capacity: 5, activeCount: 0, seats: [], hand: null, communityCards: [], pot: 0 }, bingo: { status: "lobby", players: [], drawn: [] }, tournament: { status: "lobby", players: [] } });
  await ensureSchemaOnce(env.DB);
  const row = await upsertPlayer(env.DB, user);
  if (!row) return json({ message: "無法載入玩家資料" }, 500);
  const progress = await ensureProgress(env.DB, row);
  const world = await multiplayer(env.DB);
  const emptyCasino = { capacity: 5, activeCount: 0, seats: [], hand: null };
  const emptyPoker = { capacity: 5, activeCount: 0, seats: [], hand: null, communityCards: [], pot: 0 };
  const [casino, poker, memory, transferRequests, bingo, tournament] = await Promise.all([
    row.location === "casino" ? casinoState(env.DB, user.userId) : Promise.resolve(emptyCasino),
    row.location === "casino" ? pokerState(env.DB, user.userId) : Promise.resolve(emptyPoker),
    cityMemory(env.DB),
    pendingTransferRequests(env.DB, user.userId),
    row.location === "casino" ? bingoState(env.DB, user.userId) : Promise.resolve({ status: "lobby", players: [], drawn: [] }),
    row.location === "casino" ? tournamentState(env.DB, user.userId) : Promise.resolve({ status: "lobby", players: [] }),
  ]);
  return json({ authenticated: true, profile: profileFor(user), player: serializePlayer(row, progress), room: { id: "lobby-01", name: "城市大廳 01" }, ...world, casino, poker, bingo, tournament, cityMemory: memory, transferRequests });
}

async function takeAction(request: Request, env: Env) {
  const user = await identity(request, env.DB);
  if (!user) return json({ message: "請先登入帳號，才能保存進度與加入多人世界。" }, 401);
  if (!env.DB) return json({ message: "遊戲資料庫尚未連接。" }, 503);
  await ensureSchemaOnce(env.DB);
  const current = await upsertPlayer(env.DB, user, true);
  if (!current) return json({ message: "找不到玩家資料。" }, 404);
  let progress = await ensureProgress(env.DB, current);
  let talents = new Set(parseList(progress.talents));
  const clampEnergy = (value: number) => Math.max(0, Math.min(talents.has("strong_body") ? 120 : 100, value));

  let body: { action?: string; location?: string; hours?: number; kind?: string; days?: number; job?: string; amount?: number; academy?: string; story?: string; talent?: string; choice?: string; targetId?: string; requestId?: string };
  try { body = await request.json(); } catch { return json({ message: "行動資料格式錯誤。" }, 400); }
  if (current.game_over && body.action !== "reset") return json({ message: "這段人生已經結束，請重新開始。" }, 409);
  if (current.main_story === "unselected" && body.action !== "choose_story") return json({ message: "請先選擇人生主線。" }, 409);
  if (!["move", "choose_story", "reset", "city_event", "transfer_request", "transfer_response"].includes(body.action || "") && current.action_available_at > Date.now()) return json({ message: actionWaitMessage(current) }, 409);
  const next = { ...current };
  const sharedMinutes = worldMinutes();
  const memoryBefore = await cityMemory(env.DB);
  const storedJob = jobInfo(next.current_job);
  if (!storedJob || storedJob.categoryId !== next.job_category) { next.current_job = "unemployed"; next.job_category = "unfixed"; next.job_exp = 0; }
  let title = "完成行動";
  let message = "行動完成。";
  let tone: "good" | "neutral" | "warn" = "good";
  let minutes = 0;
  let talentExpGain = 0;
  let scratch: { price: number; prize: number } | null = null;

  switch (body.action) {
    case "transfer_request": {
      const kind = body.kind === "gift" || body.kind === "scam" ? body.kind : null;
      const amount = Number(body.amount);
      if (!kind) return json({ message: "轉帳類型不正確。" }, 400);
      if (!Number.isSafeInteger(amount) || amount < (kind === "scam" ? 2 : 1)) return json({ message: kind === "scam" ? "詐騙金額至少需 NT$2。" : "請輸入有效的贈送金額。" }, 400);
      if (amount > current.cash) return json({ message: "金額不能超過你手上的現金。" }, 400);
      if (!body.targetId || body.targetId === user.userId) return json({ message: "請選擇其他玩家。" }, 400);
      const target = await env.DB.prepare("SELECT user_id, last_seen_at, main_story, game_over FROM players WHERE user_id=?")
        .bind(body.targetId).first<{ user_id: string; last_seen_at: number; main_story: string; game_over: string }>();
      if (!target || target.last_seen_at < Date.now() - ONLINE_HEARTBEAT_GRACE_MS) return json({ message: "這位玩家目前不在線上。" }, 409);
      if (target.main_story === "unselected" || target.game_over) return json({ message: "這位玩家目前無法處理邀請。" }, 409);
      const existing = await env.DB.prepare("SELECT id FROM player_transfer_requests WHERE recipient_id=? AND status='pending' AND expires_at>? LIMIT 1")
        .bind(target.user_id, Date.now()).first<{ id: string }>();
      if (existing) return json({ message: "這位玩家正在處理另一個現金邀請。" }, 409);
      const now = Date.now();
      await env.DB.prepare(`INSERT INTO player_transfer_requests (id, sender_id, sender_name, recipient_id, kind, amount, status, outcome, resolution_token, created_at, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, 'pending', '', '', ?, ?)`)
        .bind(crypto.randomUUID(), user.userId, user.displayName.slice(0, 40), target.user_id, kind, amount, now, now + TRANSFER_REQUEST_TIMEOUT_MS).run();
      return transferActionResponse(env.DB, user, current, progress, kind === "gift" ? `已向對方送出 NT$${amount} 的贈送邀請，等待對方決定。` : `已送出 NT$${amount} 的現金邀請，等待對方決定。`);
    }
    case "transfer_response": {
      if (!body.requestId || !["accept", "decline"].includes(body.kind || "")) return json({ message: "邀請回覆不正確。" }, 400);
      const token = crypto.randomUUID();
      const request = await env.DB.prepare(`UPDATE player_transfer_requests
        SET status='processing', resolution_token=?
        WHERE id=? AND recipient_id=? AND status='pending' AND expires_at>?
        RETURNING id, sender_id, sender_name, recipient_id, kind, amount, status, outcome, resolution_token, created_at, expires_at, resolved_at`)
        .bind(token, body.requestId, user.userId, Date.now()).first<TransferRequestRow>();
      if (!request) return transferActionResponse(env.DB, user, current, progress, "這個現金邀請已失效或已被處理。" );
      if (body.kind === "decline") {
        await env.DB.prepare("UPDATE player_transfer_requests SET status='declined', outcome='declined', resolved_at=? WHERE id=? AND resolution_token=?")
          .bind(Date.now(), request.id, token).run();
        return transferActionResponse(env.DB, user, current, progress, "你已拒絕這筆現金邀請。" );
      }
      if (request.kind === "gift") {
        const transfer = await env.DB.prepare(`UPDATE players SET cash=CASE WHEN user_id=? THEN cash-? ELSE cash+? END
          WHERE user_id IN (?, ?) AND (SELECT cash FROM players WHERE user_id=?) >= ?
          RETURNING user_id`).bind(request.sender_id, request.amount, request.amount, request.sender_id, request.recipient_id, request.sender_id, request.amount).all<{ user_id: string }>();
        if (transfer.results.length !== 2) {
          await env.DB.prepare("UPDATE player_transfer_requests SET status='cancelled', outcome='sender_insufficient', resolved_at=? WHERE id=? AND resolution_token=?")
            .bind(Date.now(), request.id, token).run();
          return transferActionResponse(env.DB, user, current, progress, "對方現金不足，這筆贈送已取消。" );
        }
        await env.DB.prepare("UPDATE player_transfer_requests SET status='accepted', outcome='gifted', resolved_at=? WHERE id=? AND resolution_token=?")
          .bind(Date.now(), request.id, token).run();
        const saved = await env.DB.prepare("SELECT * FROM players WHERE user_id=?").bind(user.userId).first<PlayerRow>();
        await recordTransferEvent(env.DB, request.sender_id, request.sender_name, "贈送現金", `向玩家贈送了 NT$${request.amount}。`, "good");
        return transferActionResponse(env.DB, user, saved ?? current, progress, `你已收下 NT$${request.amount} 的現金。`);
      }
      if (Math.random() >= .5) {
        await env.DB.prepare("UPDATE player_transfer_requests SET status='accepted', outcome='scam_failed', resolved_at=? WHERE id=? AND resolution_token=?")
          .bind(Date.now(), request.id, token).run();
        return transferActionResponse(env.DB, user, current, progress, "現金邀請沒有完成，沒有金錢變動。" );
      }
      const stolen = Math.floor(request.amount / 2);
      const transfer = await env.DB.prepare(`UPDATE players SET cash=CASE WHEN user_id=? THEN cash+? ELSE cash-? END
        WHERE user_id IN (?, ?) AND (SELECT cash FROM players WHERE user_id=?) >= ?
        RETURNING user_id`).bind(request.sender_id, stolen, stolen, request.sender_id, request.recipient_id, request.recipient_id, stolen).all<{ user_id: string }>();
      if (transfer.results.length !== 2) {
        await env.DB.prepare("UPDATE player_transfer_requests SET status='accepted', outcome='recipient_insufficient', resolved_at=? WHERE id=? AND resolution_token=?")
          .bind(Date.now(), request.id, token).run();
        return transferActionResponse(env.DB, user, current, progress, "現金邀請沒有完成，餘額不足，沒有金錢變動。" );
      }
      await env.DB.prepare("UPDATE player_transfer_requests SET status='accepted', outcome='scam_success', resolved_at=? WHERE id=? AND resolution_token=?")
        .bind(Date.now(), request.id, token).run();
      const saved = await env.DB.prepare("SELECT * FROM players WHERE user_id=?").bind(user.userId).first<PlayerRow>();
      await recordTransferEvent(env.DB, request.sender_id, request.sender_name, "詐騙成功", `成功取得了 NT$${stolen}。`, "warn");
      return transferActionResponse(env.DB, user, saved ?? current, progress, `你遭到詐騙，NT$${stolen} 已被對方取走。`);
    }
    case "talent": {
      if (body.kind === "reset") {
        if (!talents.size) return json({ message: "目前沒有已配置的天賦。" }, 400);
        if (next.cash < 2_000) return json({ message: "重置天賦需要 NT$2,000。" }, 400);
        next.cash -= 2_000; talents = new Set();
        await env.DB.prepare("UPDATE player_progress SET talents='[]', updated_at=? WHERE user_id=?").bind(Date.now(), user.userId).run();
        progress = { ...progress, talents: "[]" };
        title = "重新配置天賦"; message = "已支付 NT$2,000，所有天賦點已返還。"; break;
      }
      const info = talentInfo(body.talent || "");
      if (!info) return json({ message: "天賦不存在。" }, 400);
      if (talents.has(info.id)) return json({ message: "你已經擁有這項天賦。" }, 409);
      const level = Math.min(10, Math.floor(progress.talent_exp / 100));
      if (talents.size >= level) return json({ message: "目前沒有可用的天賦點。" }, 400);
      if (!info.requires.every((required) => talents.has(required))) return json({ message: "請先解鎖前置天賦。" }, 400);
      talents.add(info.id);
      await env.DB.prepare("UPDATE player_progress SET talents=?, updated_at=? WHERE user_id=?").bind(JSON.stringify([...talents]), Date.now(), user.userId).run();
      progress = { ...progress, talents: JSON.stringify([...talents]) };
      title = `解鎖天賦：${info.name}`; message = info.description; break;
    }
    case "city_event": {
      const event = CITY_EVENTS.find((item) => item.id === progress.pending_event);
      if (!event) return json({ message: "目前沒有等待處理的城市事件。" }, 400);
      const choice = event.choices.find((item) => item.id === body.choice);
      if (!choice || ("requires" in choice && choice.requires && !talents.has(choice.requires))) return json({ message: "這個選項目前無法使用。" }, 400);
      const cashChange = "cash" in choice ? choice.cash ?? 0 : 0;
      if (cashChange < 0 && next.cash < Math.abs(cashChange)) return json({ message: "現金不足，請選擇其他處理方式。" }, 400);
      next.cash += cashChange;
      next.energy = Math.min(talents.has("strong_body") ? 120 : 100, Math.max(0, next.energy + ("energy" in choice ? choice.energy ?? 0 : 0)));
      next.health = clamp(next.health + ("health" in choice ? choice.health ?? 0 : 0));
      next.intelligence_exp += "intelligence" in choice ? choice.intelligence ?? 0 : 0;
      if ("rentalDays" in choice && choice.rentalDays) next.rented_until = Math.max(next.elapsed_minutes, next.rented_until) + choice.rentalDays * 1440;
      const gained = "talentExp" in choice ? choice.talentExp ?? 0 : 0;
      await env.DB.prepare("UPDATE player_progress SET talent_exp=MIN(1099,talent_exp+?), pending_event='', updated_at=? WHERE user_id=?")
        .bind(gained, Date.now(), user.userId).run();
      progress = { ...progress, talent_exp: Math.min(1099, progress.talent_exp + gained), pending_event: "" };
      title = event.title; message = choice.result; tone = cashChange < 0 || ("health" in choice && (choice.health ?? 0) < 0) ? "warn" : "good"; break;
    }
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
      next.location = body.location as LocationId;
      const placeName = ({ home: "我的住所", realtor: "安心房仲", bank: "城市銀行", business: "工作地", shopping: "購物街", hotel: "不夜旅店", casino: "幸運賭場", school: "未來學院", hospital: "市立醫院" } as Record<LocationId, string>)[next.location as LocationId];
      title = "移動完成"; message = `已抵達${placeName}。`; tone = "neutral"; break;
    }
    case "housing": {
      if (next.location !== "realtor") return json({ message: "請先前往安心房仲。" }, 400);
      if (!isLocationOpen("realtor", sharedMinutes)) return json({ message: `安心房仲營業時間為 ${OPENING_HOURS.realtor?.label}。` }, 400);
      if (body.kind === "rent") {
        const days = Number(body.days);
        if (![1, 7, 30].includes(days)) return json({ message: "租屋天數不正確。" }, 400);
        const dailyRent = talents.has("rent_master") ? 315 : 350;
        const cost = dailyRent * days;
        if (next.cash < cost) return json({ message: "現金不足，無法支付租金。" }, 400);
        const leaseStart = Math.max(next.elapsed_minutes, next.rented_until);
        next.cash -= cost; next.rental_name = "城市小套房"; next.rented_until = leaseStart + days * 1440;
        title = `租下城市小套房 ${days} 天`; message = `支付 NT$${cost}，租期增加 ${days} 天。${next.owns_home ? "你原有的自有住宅仍然保留。" : "現在可以回到我的住所休息。"}`; break;
      }
      if (body.kind === "buy") {
        const price = 50_000;
        if (next.owns_home) return json({ message: "你已經擁有城市小宅，仍可繼續查看租屋方案。" }, 400);
        if (next.cash < price) return json({ message: "購屋需要 NT$50,000，目前資金不足。" }, 400);
        next.cash -= price; next.owns_home = 1;
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
        const wasMinimumComplete = next.daily_payment_made >= next.daily_minimum_payment;
        next.cash -= amount; next.loan_balance -= amount;
        if (next.main_story === "prodigal_return") {
          next.daily_payment_made += amount;
          if (!wasMinimumComplete && next.daily_payment_made >= next.daily_minimum_payment) talentExpGain += 3;
        }
        title = "償還貸款"; message = `已償還 NT$${amount}，剩餘貸款 NT$${next.loan_balance}。${next.main_story === "prodigal_return" ? ` 本日累計已繳 NT$${next.daily_payment_made}／最低 NT$${next.daily_minimum_payment}。` : ""}`;
      } else return json({ message: "銀行服務不存在。" }, 400);
      break;
    }
    case "hotel": {
      if (next.location !== "hotel") return json({ message: "請先前往不夜旅店。" }, 400);
      if (body.kind === "stay") {
        if (next.owns_home || next.rented_until > next.elapsed_minutes) return json({ message: "你目前已有住所，不需要入住旅店。" }, 400);
        if (next.cash < 1_200) return json({ message: "住宿需要 NT$1,200，目前現金不足。" }, 400);
        next.cash -= 1_200; next.energy = talents.has("strong_body") ? 120 : 100; next.health = clamp(next.health + 3); next.hunger = clamp(next.hunger - 12); minutes = 120;
        title = "入住不夜旅店"; message = "支付 NT$1,200，體力全滿、健康 +3。"; break;
      }
      if (body.kind === "work") {
        if (next.illness) return json({ message: `目前罹患${next.illness}，請先前往醫院治療。` }, 400);
        next.cash += 100; minutes = 30;
        title = "完成旅店臨時工"; message = "收入 +NT$100；不扣除體力、飽足或健康，也不增加職業經驗或能力。"; break;
      }
      const mealDiscount = talents.has("frugal") ? .9 : 1;
      const meal = body.kind === "meal" ? { name: "旅店餐", price: Math.floor(250 * mealDiscount), hunger: 45 } : body.kind === "luxury" ? { name: "豪華餐", price: Math.floor(500 * mealDiscount), hunger: 80 } : null;
      if (!meal) return json({ message: "旅店服務不存在。" }, 400);
      if (next.cash < meal.price) return json({ message: "手上現金不足。" }, 400);
      next.cash -= meal.price; next.hunger = clamp(next.hunger + meal.hunger);
      title = `享用${meal.name}`; message = `${meal.name}讓飽足 +${meal.hunger}。`; break;
    }
    case "job": {
      if (next.location !== "business") return json({ message: "請先前往工作地的就業服務處。" }, 400);
      if (!isLocationOpen("business", sharedMinutes)) return json({ message: `工作地營業時間為 ${OPENING_HOURS.business?.label}。` }, 400);
      const selected = jobInfo(body.job || "");
      if (!selected) return json({ message: "這個職業不存在。" }, 400);
      if (next.current_job === selected.job) return json({ message: `你目前已經是${selected.job}。` }, 400);
      const category = categoryInfo(selected.categoryId);
      if (!category) return json({ message: "這個產業不存在。" }, 400);
      if (category.id !== "unfixed" && selected.job !== category.jobs[0]) return json({ message: `進入${category.label}必須從${category.jobs[0]}開始。` }, 400);
      const entryRequirements = careerRequirements(category.id, 0);
      if (category.id !== "unfixed" && !meetsCareerRequirements(abilitiesFor(next), entryRequirements)) return json({ message: `進入${category.label}需要${formatRequirements(entryRequirements)}。` }, 400);
      next.current_job = selected.job; next.job_category = selected.categoryId; next.job_exp = 0;
      title = category.id === "unfixed" ? `狀態變更：${selected.job}` : `進入${selected.categoryLabel}`;
      message = category.id === "unfixed" ? `目前狀態已改為${selected.job}。` : `成功進入「${selected.categoryLabel}」，從${selected.job}開始發展；產業升遷經驗從 0 開始。`; break;
    }
    case "work": {
      if (next.location !== "business") return json({ message: "請先前往工作地。" }, 400);
      if (!isLocationOpen("business", sharedMinutes)) return json({ message: `工作地營業時間為 ${OPENING_HOURS.business?.label}。` }, 400);
      if (next.illness) return json({ message: `目前罹患${next.illness}，請先前往醫院治療。` }, 400);
      if (next.job_category === "unfixed") return json({ message: `目前是${next.current_job === "流浪者" ? "流浪者" : "待業者"}，請先選擇一條產業路線。` }, 400);
      const hours = Number(body.hours);
      if (![1, 4, 8].includes(hours)) return json({ message: "工時選擇不正確。" }, 400);
      if (next.energy < hours * 5) return json({ message: "體力不足，先回家休息吧。" }, 400);
      const previousCareer = careerForCategory(next.job_category, next.job_exp, next.current_job, abilitiesFor(next));
      const incomeMultiplier = 1 + (talents.has("workaholic_1") ? .05 : 0) + (talents.has("workaholic_2") ? .05 : 0) + (memoryBefore.state.name === "就業熱潮" ? .05 : 0);
      const income = Math.floor(hours * previousCareer.hourlyPay * incomeMultiplier);
      const energyCost = Math.ceil(hours * 5 * (talents.has("endurance") ? .85 : 1));
      const jobGain = Math.ceil(hours * 4 * (talents.has("skilled") ? 1.15 : 1));
      next.cash += income; next.energy = Math.max(0, next.energy - energyCost); next.health = clamp(next.health - Math.ceil(hours / 2)); next.mood = clamp(next.mood - Math.ceil(hours * .9)); next.hunger = clamp(next.hunger - hours * 2); next.job_exp += jobGain; minutes = hours === 1 ? 30 : hours === 4 ? 120 : 240;
      if (talents.has("workaholic_2")) minutes = Math.ceil(minutes * .9);
      const newCareer = careerForCategory(next.job_category, next.job_exp, next.current_job, abilitiesFor(next));
      next.current_job = newCareer.title;
      if (newCareer.title !== previousCareer.title) talentExpGain += 10;
      title = newCareer.title !== previousCareer.title ? `升遷為${newCareer.title}` : `工作 ${hours} 小時`;
      message = `以${previousCareer.title}完成工作，收入 +NT$${income}，職業經驗 +${jobGain}。${newCareer.title !== previousCareer.title ? ` 恭喜升遷為${newCareer.title}！` : ""}`; break;
    }
    case "study": {
      if (next.location !== "school") return json({ message: "請先前往未來學院。" }, 400);
      if (!isLocationOpen("school", sharedMinutes)) return json({ message: `未來學院開放時間為 ${OPENING_HOURS.school?.label}。` }, 400);
      if (next.illness) return json({ message: `目前罹患${next.illness}，請先前往醫院治療。` }, 400);
      const academy = ACADEMIES.find((item) => item.id === body.academy);
      if (!academy) return json({ message: "這所學院不存在。" }, 400);
      if (next.cash < 500 || next.energy < 10) return json({ message: next.cash < 500 ? "學費不足。" : "體力不足，先休息一下吧。" }, 400);
      next.cash -= 500; next.energy = clampEnergy(next.energy - 10); next.hunger = clamp(next.hunger - 4);
      for (const [key, gain] of Object.entries(academy.gains)) {
        if (key === "physical") next.fitness_exp += gain;
        if (key === "intelligence") next.intelligence_exp += gain;
        if (key === "creativity") next.programming_exp += gain;
        if (key === "social") next.work_exp += gain;
        if (key === "charisma") next.charisma_exp += gain;
      }
      const promoted = careerForCategory(next.job_category, next.job_exp, next.current_job, abilitiesFor(next));
      const promotionMessage = promoted.title !== next.current_job ? ` 能力達標，升遷為${promoted.title}！` : "";
      next.current_job = promoted.title; minutes = 60;
      title = `完成${academy.name}課程`; message = `${formatRequirements(academy.gains)}。${promotionMessage}`; break;
    }
    case "eat": {
      if (next.location !== "shopping") return json({ message: "請先前往購物街。" }, 400);
      if (!isLocationOpen("shopping", sharedMinutes)) return json({ message: `購物街營業時間為 ${OPENING_HOURS.shopping?.label}。` }, 400);
      const mealDiscount = talents.has("frugal") ? .9 : 1;
      const meal = body.kind === "rice" ? { name: "飯糰", price: Math.floor(45 * mealDiscount), hunger: 20, mood: 1 } : body.kind === "bento" ? { name: "便當", price: Math.floor(100 * mealDiscount), hunger: 45, mood: 3 } : null;
      if (!meal) return json({ message: "餐點不存在。" }, 400);
      if (next.cash < meal.price) return json({ message: "現金不足。" }, 400);
      next.cash -= meal.price; next.hunger = clamp(next.hunger + meal.hunger); next.mood = clamp(next.mood + meal.mood);
      title = `享用${meal.name}`; message = `${meal.name}讓飽足 +${meal.hunger}。`; break;
    }
    case "scratch": {
      if (next.location !== "shopping") return json({ message: "請先前往購物街購買刮刮樂。" }, 400);
      if (!isLocationOpen("shopping", sharedMinutes)) return json({ message: `購物街營業時間為 ${OPENING_HOURS.shopping?.label}。` }, 400);
      if (next.cash < 100) return json({ message: "購買刮刮樂需要 NT$100，目前現金不足。" }, 400);
      const prize = scratchPrize();
      scratch = { price: 100, prize };
      next.cash = next.cash - 100 + prize;
      title = prize ? `刮刮樂中獎 NT$${prize}` : "刮刮樂未中獎";
      message = prize ? `花費 NT$100，刮中 NT$${prize}，獎金已存入資產。` : "花費 NT$100，這張沒有中獎。";
      tone = prize >= 1_000 ? "good" : "neutral"; break;
    }
    case "sleep":
      if (next.location !== "home") return json({ message: "請先回到溫暖小屋。" }, 400);
      if (!next.owns_home && next.rented_until <= next.elapsed_minutes) return json({ message: "租約已到期，請先到房仲續租。" }, 400);
      next.energy = talents.has("strong_body") ? 120 : 100; next.health = clamp(next.health + 5); next.mood = clamp(next.mood + 10); next.hunger = clamp(next.hunger - 12); minutes = 120;
      title = "好好睡了一覺"; message = "體力完全恢復，健康 +5、心情 +10。"; break;
    case "hospital": {
      if (next.location !== "hospital") return json({ message: "請先前往市立醫院。" }, 400);
      if (body.kind !== "emergency" && !isHospitalRegularOpen(sharedMinutes)) return json({ message: "一般門診與完整治療時間為 07:00～23:00；急診 24 小時開放。" }, 400);
      const careDiscount = memoryBefore.state.name === "健康警報" ? .8 : 1;
      const energyMax = talents.has("strong_body") ? 120 : 100;
      const care = body.kind === "clinic"
        ? { name: "一般門診", price: Math.floor(600 * careDiscount), minutes: 15, health: Math.min(100, next.health + 25), energy: Math.min(energyMax, next.energy + 10) }
        : body.kind === "treatment"
          ? { name: "完整治療", price: Math.floor(1500 * careDiscount), minutes: 30, health: Math.max(80, next.health), energy: Math.min(energyMax, next.energy + 30) }
          : body.kind === "emergency"
            ? { name: "急診治療", price: Math.floor(2500 * careDiscount), minutes: 20, health: Math.max(70, next.health), energy: Math.min(energyMax, next.energy + 20) }
          : null;
      if (!care) return json({ message: "醫療項目不存在。" }, 400);
      if (next.cash < care.price) return json({ message: "醫療費不足。" }, 400);
      const previousIllness = next.illness;
      next.cash -= care.price; next.health = care.health; next.energy = care.energy; next.illness = ""; minutes = care.minutes;
      title = previousIllness ? `治癒${previousIllness}` : care.name;
      message = `${care.name}完成，支付 NT$${care.price}，健康恢復至 ${next.health}${previousIllness ? `，${previousIllness}已痊癒` : ""}。`; break;
    }
    case "reset":
      Object.assign(next, { cash: next.main_story === "prodigal_return" ? 37 : 10000, bank_balance: 0, loan_balance: next.main_story === "prodigal_return" ? 250_000 : 0, finance_day: 1, daily_minimum_payment: next.main_story === "prodigal_return" ? 750 : 0, daily_payment_made: 0, missed_payment_days: 0, game_over: "", energy: 100, health: 100, mood: 80, hunger: 80, intelligence_exp: 0, programming_exp: 0, fitness_exp: 0, work_exp: 0, charisma_exp: 0, current_job: "unemployed", job_category: "unfixed", job_exp: 0, illness: "", owns_home: 0, rental_name: "", rented_until: 0, action_available_at: 0, action_label: "", elapsed_minutes: 0, location: "realtor" });
      await env.DB.prepare("UPDATE player_progress SET talent_exp=0, talents='[]', story_chapter=0, last_event_day=0, pending_event='', updated_at=? WHERE user_id=?").bind(Date.now(), user.userId).run();
      progress = { ...progress, talent_exp: 0, talents: "[]", story_chapter: 0, last_event_day: 0, pending_event: "" }; talents = new Set();
      title = "重新開始人生"; message = "新的人生已開始，所有進度回到起點。"; tone = "neutral"; break;
    default: return json({ message: "未知的行動。" }, 400);
  }

  if (talentExpGain > 0) {
    await env.DB.prepare("UPDATE player_progress SET talent_exp=MIN(1099,talent_exp+?), updated_at=? WHERE user_id=?")
      .bind(talentExpGain, Date.now(), user.userId).run();
    progress = { ...progress, talent_exp: Math.min(1099, progress.talent_exp + talentExpGain) };
  }

  const bypassVitalityEffects = body.action === "move" || (body.action === "hotel" && body.kind === "work");
  if (body.action !== "hospital" && body.action !== "reset" && !bypassVitalityEffects) {
    if (next.hunger <= 15) next.health = clamp(next.health - 6);
    if (next.energy <= 5) next.health = clamp(next.health - 4);
    if (!next.illness && next.health < 50) {
      const chance = next.health < 20 ? 0.35 : next.health < 35 ? 0.22 : 0.12;
      if (Math.random() < chance * (talents.has("resistance") ? .75 : 1)) {
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
  const metric = body.action === "work" ? "work" : body.action === "hospital" ? "hospital" : body.action === "housing" ? "housing" : body.action === "study" ? "study" : body.action === "city_event" ? "event" : null;
  if (metric) await recordCityMemory(env.DB, user.userId, metric);
  const chapterBefore = progress.story_chapter;
  progress = await ensureProgress(env.DB, saved!);
  if (progress.story_chapter > chapterBefore) {
    const chapter = STORY_CHAPTERS[progress.story_chapter - 1];
    if (chapter) message += ` 主線章節解鎖——${chapter.chapter}. ${chapter.title}：${chapter.story}（天賦經驗 +${chapter.reward}）`;
  }
  const eligibleEvent = !["move", "choose_story", "reset", "talent", "city_event"].includes(body.action || "");
  const personalDay = Math.floor(saved!.elapsed_minutes / 1440) + 1;
  if (eligibleEvent && !progress.pending_event && progress.last_event_day < personalDay) {
    const chance = talents.has("connections") ? .28 : .20;
    const event = Math.random() < chance ? CITY_EVENTS[Math.floor(Math.random() * CITY_EVENTS.length)] : null;
    await env.DB.prepare("UPDATE player_progress SET last_event_day=?, pending_event=?, updated_at=? WHERE user_id=?")
      .bind(personalDay, event?.id ?? "", Date.now(), user.userId).run();
    progress = { ...progress, last_event_day: personalDay, pending_event: event?.id ?? "" };
  }
  if (eligibleEvent) message += await maybeFindMysteryClue(env.DB, user.userId, saved!.location);
  const world = await multiplayer(env.DB);
  return json({ player: serializePlayer(saved!, progress), message, scratch, cityMemory: await cityMemory(env.DB), ...world });
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
    else if (url.pathname === "/api/profile/name" && request.method === "POST") response = await updateDisplayName(request, env);
    else if (url.pathname.startsWith("/api/avatar/") && request.method === "GET") response = await getAvatar(url.pathname.slice("/api/avatar/".length), env);
    else if (url.pathname === "/api/game" && request.method === "GET") response = await bootstrap(request, env);
    else if (url.pathname === "/api/game/action" && request.method === "POST") response = await takeAction(request, env);
    else if (url.pathname === "/api/casino/action" && request.method === "POST") response = await casinoAction(request, env);
    else if (url.pathname === "/api/poker/action" && request.method === "POST") response = await pokerAction(request, env);
    else if (url.pathname === "/api/bingo/action" && request.method === "POST") response = await bingoAction(request, env);
    else if (url.pathname === "/api/tournament/action" && request.method === "POST") response = await tournamentAction(request, env);
    else if (url.pathname.startsWith("/api/")) response = json({ message: "找不到 API。" }, 404);
    else if (env.ASSETS) return env.ASSETS.fetch(request);
    else response = json({ service: "Life Online API", ok: true });
    return withCors(response, request, env);
  },
} satisfies ExportedHandler<Env>;
