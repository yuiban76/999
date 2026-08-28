import { ABILITY_LABELS, ABILITY_MAX, ACADEMIES, BANK_LOAN_RATE_BP, careerForCategory, careerRequirements, careerWorkSpecialFor, careerWorkWaitSeconds, categoryInfo, crimeArrestChanceFor, crimeSentenceMinutesFor, financeDepositRateFor, financeLoanTermsFor, HACK_DAILY_LIMIT, HACK_MAX_STEAL, HACK_STEAL_RATE, HACK_SUCCESS_CHANCE, hospitalitySpecialHungerFor, jobInfo, medicalHospitalDiscountFor, medicalTreatmentFor, medicalWorkHealthBonusFor, meetsCareerRequirements, RESTAURANT_DAILY_NET, RESTAURANT_PURCHASE_PRICE, STREET_BEG_PAIR_COOLDOWN_MS, STREET_BEG_REQUEST_TIMEOUT_MS, STREET_INVENTORY, STREET_SCAVENGE_WAIT_SECONDS, streetBegDailyCapFor, streetBegDonationsFor, streetCanSellPriceFor, streetRankIndex, streetScavengeLimitFor, TERRITORY_DAILY_CAP, TERRITORY_VISIT_COOLDOWN_MINUTES, TERRITORY_VISIT_REWARD, WRITER_DAILY_FAN_RATE, WRITER_DAILY_WRITING_LIMIT, WRITER_MAX_ACTIVE_BOOKS, WRITER_MAX_PURCHASES_PER_BOOK, writerBookPriceFor, writerFanRangeFor, type Abilities } from "../shared/jobs";
import { CITY_EVENTS, STORY_CHAPTERS, storyChapterForDebt, talentInfo } from "../shared/progression";
import { isHospitalRegularOpen, isLocationOpen, minuteOfDay, OPENING_HOURS, worldMinutes } from "../shared/world";

type LocationId = "home" | "realtor" | "bank" | "business" | "shopping" | "bookstore" | "hotel" | "casino" | "school" | "hospital" | "underpass" | "prison";

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
  writer_fans: number;
  writer_day: number;
  writer_writes: number;
  owns_restaurant: number;
  prison_until: number;
  prison_crime: string;
  territory_location: string;
  territory_day: number;
  territory_payout_day: number;
  territory_visits: number;
  territory_income: number;
  territory_pending: number;
  hack_day: number;
  hack_uses: number;
  street_day: number;
  street_scavenges: number;
  street_beg_income: number;
  game_over: string;
  main_story: string;
  energy: number;
  health: number;
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
  elapsed_remainder_ms: number;
  location: LocationId;
  life_version: number;
  reset_game_over: string;
  mutation_token: string;
  updated_at: number;
  last_seen_at: number;
};

type CasinoRow = { user_id: string; player_name: string; player_cards: string; dealer_cards: string; bet: number; status: string; result: string; seat_no: number | null; reveal_at: number; life_version: number; updated_at: number; deal_token: string };
type CasinoTableRow = { id: string; deck: string; round_token: string; action_token: string; updated_at: number };
type PokerRow = { user_id: string; player_name: string; hole_cards: string; community_cards: string; bet: number; status: string; result: string; seat_no: number | null; reveal_at: number; street_bet: number; acted: number; life_version: number; round_token: string; action_token: string; updated_at: number };
type PokerTableRow = { id: string; deck: string; community_cards: string; street: string; current_bet: number; turn_seat: number; pot: number; status: string; round_token: string; action_token: string; updated_at: number };
type TournamentRoundRow = { tournament_no: number; round_no: number; game: "blackjack" | "poker"; status: string; deck: string; dealer_cards: string; community_cards: string; street: string; current_bet: number; turn_seat: number; pot: number; next_action_at: number; action_token: string; updated_at: number };
type TournamentHandRow = { tournament_no: number; round_no: number; user_id: string; player_name: string; seat_no: number; player_cards: string; hole_cards: string; bet: number; street_bet: number; stack: number; status: string; acted: number; result: string; life_version: number; action_token: string; updated_at: number };
type TournamentStateRow = { round_no: number; current_round: number; game: "blackjack" | "poker"; status: string; host_user_id: string; entry_fee: number; round_limit: number; next_round_at: number; latest_result: string };
type ProgressRow = { user_id: string; talent_exp: number; talents: string; story_chapter: number; story_seen_chapter: number; last_event_day: number; pending_event: string; updated_at: number };
type MemoryRow = { cycle_day: number; work_count: number; hospital_count: number; housing_count: number; casino_count: number; study_count: number; event_count: number };
type TransferRequestRow = { id: string; sender_id: string; sender_name: string; recipient_id: string; kind: "gift" | "scam"; amount: number; sender_life_version: number; recipient_life_version: number; status: string; outcome: string; resolution_token: string; created_at: number; expires_at: number; resolved_at: number | null };
type MedicalTreatmentRequestRow = { id: string; patient_id: string; patient_name: string; provider_id: string; provider_name: string; provider_job: string; health_gain: number; amount: number; patient_life_version: number; provider_life_version: number; status: string; outcome: string; resolution_token: string; created_at: number; expires_at: number; resolved_at: number | null };
type LoanRequestRow = { id: string; borrower_id: string; borrower_name: string; provider_id: string; provider_name: string; provider_job: string; amount: number; interest_rate_bp: number; spread_bp: number; borrower_life_version: number; provider_life_version: number; status: string; outcome: string; resolution_token: string; created_at: number; expires_at: number; resolved_at: number | null };
type LoanContractRow = { id: string; borrower_id: string; borrower_name: string; provider_id: string; provider_name: string; provider_job: string; principal_amount: number; outstanding_balance: number; interest_rate_bp: number; spread_bp: number; borrower_life_version: number; provider_life_version: number; revision: number; mutation_token: string; status: string; opened_at: number; closed_at: number | null };
type WriterBookRow = { id: string; author_id: string; author_name: string; author_life_version: number; title: string; price: number; status: "active" | "hidden"; created_at: number; updated_at: number; sales_count?: number; owned_count?: number };
type BegRequestRow = { id: string; requester_id: string; requester_name: string; recipient_id: string; requester_job: string; requester_life_version: number; recipient_life_version: number; status: string; outcome: string; amount: number; resolution_token: string; created_at: number; expires_at: number; resolved_at: number | null };
type LifeContractRow = { id: string; creator_id: string; creator_name: string; creator_life_version: number; partner_id: string; partner_name: string; partner_life_version: number; target_per_player: number; stake: number; creator_deposit: number; partner_deposit: number; status: string; expires_day: number; resolution_token: string; created_at: number; updated_at: number };

const VALID_LOCATIONS = new Set<LocationId>(["home", "realtor", "bank", "business", "shopping", "bookstore", "hotel", "casino", "school", "hospital", "underpass", "prison"]);
const TERRITORY_LOCATIONS = new Set<LocationId>(["realtor", "bank", "business", "shopping", "bookstore", "hotel", "casino", "school", "hospital", "underpass"]);
// Persist at most one idle heartbeat every ten seconds. Only a short,
// continuous gap counts as online play; returning after going offline adds no time.
const HEARTBEAT_WRITE_INTERVAL_MS = 10_000;
const ONLINE_HEARTBEAT_GRACE_MS = 30_000;
const TRANSFER_REQUEST_TIMEOUT_MS = 60_000;
const MEDICAL_REQUEST_TIMEOUT_MS = 30_000;
const LOAN_REQUEST_TIMEOUT_MS = 30_000;
const REQUEST_PROCESSING_TIMEOUT_MS = 30_000;
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
const REPUTATION_FACTIONS = ["居民", "商家", "文化", "街頭"] as const;
const CITY_COMMISSIONS = [
  { id: "office_support", category: "office", location: "business" as LocationId, title: "行政支援", detail: "協助社區整理今日的公共資料。", reward: 450, faction: "商家" },
  { id: "medical_outreach", category: "medical", location: "hospital" as LocationId, title: "健康關懷", detail: "支援社區健康宣導與基本照護。", reward: 500, faction: "居民" },
  { id: "finance_clinic", category: "finance", location: "bank" as LocationId, title: "財務諮詢", detail: "協助居民整理不安的帳單與還款順序。", reward: 500, faction: "商家" },
  { id: "literary_stage", category: "literary", location: "bookstore" as LocationId, title: "故事朗讀", detail: "在書店分享一段能讓人停下腳步的故事。", reward: 400, faction: "文化" },
  { id: "hospitality_relief", category: "hospitality", location: "hotel" as LocationId, title: "深夜供餐", detail: "替需要的人準備一份溫熱餐點。", reward: 450, faction: "居民" },
  { id: "freelance_fix", category: "freelance", location: "business" as LocationId, title: "緊急修復委託", detail: "完成一項臨時、需要專業的社區委託。", reward: 450, faction: "商家" },
  { id: "street_guide", category: "street", location: "underpass" as LocationId, title: "地下道引路", detail: "協助陌生人安全走過複雜的地下道。", reward: 350, faction: "街頭" },
] as const;
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

const hasControlCharacters = (value: string) => Array.from(value).some((character) => {
  const codePoint = character.codePointAt(0) ?? 0;
  return codePoint < 32 || codePoint === 127;
});

function actionWaitMessage(player: PlayerRow, now = Date.now()) {
  const seconds = Math.max(1, Math.ceil((player.action_available_at - now) / 1000));
  return `${player.action_label || "目前的行動"}尚未完成，請等待 ${seconds} 秒；期間仍可移動、換職、使用銀行、處理多人邀請或前往賭場。`;
}

function corsHeaders(request: Request, env: Env) {
  const allowedOrigins = (env.FRONTEND_ORIGIN || "https://yuiban76.github.io")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const fallback = allowedOrigins[0] || "https://yuiban76.github.io";
  const origin = request.headers.get("Origin");
  return {
    "Access-Control-Allow-Origin": origin && allowedOrigins.includes(origin) ? origin : fallback,
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
  return { cash: 10000, bankBalance: 0, loanBalance: 0, loanProviderName: "", loanRateBp: null, loanSpreadBp: null, dailyMinimumPayment: 0, dailyPaymentMade: 0, missedPaymentDays: 0, writerFans: 0, writingUses: 0, ownsRestaurant: false, prisonUntil: 0, prisonCrime: "", territoryLocation: "", territoryDay: 0, territoryPayoutDay: 0, territoryVisits: 0, territoryIncome: 0, territoryPending: 0, hackDay: 0, hackUses: 0, streetDay: 0, streetScavenges: 0, streetBegIncome: 0, gameOver: "", mainStory: "legacy", energy: 100, health: 100, hunger: 80, intelligenceExp: 0, creativityExp: 0, physicalExp: 0, socialExp: 0, charismaExp: 0, currentJob: "待業者", jobCategory: "unfixed", jobExp: 0, illness: "", ownsHome: false, rentalName: "", rentedUntil: 0, actionAvailableAt: 0, actionLabel: "", elapsedMinutes: 0, location: "realtor" as LocationId, talentExp: 0, talentLevel: 0, talentPoints: 0, talents: [] as string[], storyChapter: 0, storySeenChapter: 0, pendingEvent: "" };
}

function parseList(value: string) {
  try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : []; } catch { return []; }
}

function serializePlayer(row: PlayerRow, progress?: ProgressRow | null, loanContract?: LoanContractRow | null) {
  const currentJob = jobInfo(row.current_job) ? row.current_job : "待業者";
  const location = VALID_LOCATIONS.has(row.location) ? row.location : "casino";
  const talents = progress ? parseList(progress.talents) : [];
  const talentLevel = Math.min(10, Math.floor((progress?.talent_exp ?? 0) / 100));
  return { cash: row.cash, bankBalance: row.bank_balance, loanBalance: row.loan_balance, loanProviderName: loanContract?.provider_name ?? "", loanRateBp: loanContract?.interest_rate_bp ?? null, loanSpreadBp: loanContract?.spread_bp ?? null, dailyMinimumPayment: row.daily_minimum_payment, dailyPaymentMade: row.daily_payment_made, missedPaymentDays: row.missed_payment_days, writerFans: row.writer_fans, writingUses: row.writer_writes, ownsRestaurant: Boolean(row.owns_restaurant), prisonUntil: row.prison_until, prisonCrime: row.prison_crime, territoryLocation: row.territory_location, territoryDay: row.territory_day, territoryPayoutDay: row.territory_payout_day, territoryVisits: row.territory_visits, territoryIncome: row.territory_income, territoryPending: row.territory_pending, hackDay: row.hack_day, hackUses: row.hack_uses, streetDay: row.street_day, streetScavenges: row.street_scavenges, streetBegIncome: row.street_beg_income, gameOver: row.game_over, mainStory: row.main_story, energy: row.energy, health: row.health, hunger: row.hunger, intelligenceExp: row.intelligence_exp, creativityExp: row.programming_exp, physicalExp: row.fitness_exp, socialExp: row.work_exp, charismaExp: row.charisma_exp, currentJob, jobCategory: currentJob === "待業者" ? "unfixed" : row.job_category, jobExp: currentJob === "待業者" ? 0 : row.job_exp, illness: row.illness, ownsHome: Boolean(row.owns_home), rentalName: row.rental_name, rentedUntil: row.rented_until, actionAvailableAt: row.action_available_at, actionLabel: row.action_label, elapsedMinutes: row.elapsed_minutes, location, talentExp: progress?.talent_exp ?? 0, talentLevel, talentPoints: Math.max(0, talentLevel - talents.length), talents, storyChapter: progress?.story_chapter ?? 0, storySeenChapter: progress?.story_seen_chapter ?? 0, pendingEvent: progress?.pending_event ?? "" };
}

async function activeLoanContract(db: D1Database, borrowerId: string) {
  return db.prepare(`SELECT id, borrower_id, borrower_name, provider_id, provider_name, provider_job, principal_amount, outstanding_balance, interest_rate_bp, spread_bp,
      borrower_life_version, provider_life_version, revision, mutation_token, status, opened_at, closed_at
    FROM player_loan_contracts
    WHERE borrower_id=? AND status='active'
      AND borrower_life_version=(SELECT life_version FROM players WHERE user_id=?)
    LIMIT 1`).bind(borrowerId, borrowerId).first<LoanContractRow>();
}

async function bookStore(db: D1Database, userId: string) {
  const rows = await db.prepare(`SELECT b.id, b.author_id, b.author_name, b.author_life_version, b.title, b.price, b.status, b.created_at, b.updated_at,
      COALESCE((SELECT SUM(s.quantity) FROM writer_book_purchases s WHERE s.book_id=b.id), 0) AS sales_count,
      COALESCE((SELECT s.quantity FROM writer_book_purchases s WHERE s.book_id=b.id AND s.buyer_id=?), 0) AS owned_count
    FROM writer_books b
    WHERE (b.status='active' OR b.author_id=?)
      AND EXISTS (SELECT 1 FROM players author WHERE author.user_id=b.author_id AND author.life_version=b.author_life_version)
    ORDER BY CASE WHEN b.author_id=? THEN 0 ELSE 1 END, b.updated_at DESC
    LIMIT 120`).bind(userId, userId, userId).all<WriterBookRow>();
  const books = rows.results.map((book) => ({ id: book.id, authorId: book.author_id, authorName: book.author_name, title: book.title, price: book.price, status: book.status, salesCount: Number(book.sales_count ?? 0), ownedCount: Number(book.owned_count ?? 0), isMine: book.author_id === userId }));
  return { books, maxActiveBooks: WRITER_MAX_ACTIVE_BOOKS, maxPurchasesPerBook: WRITER_MAX_PURCHASES_PER_BOOK };
}

function randomWriterFans(job: string) {
  const range = writerFanRangeFor(job);
  if (!range) return 0;
  const random = crypto.getRandomValues(new Uint32Array(1))[0] / 4_294_967_296;
  return range[0] + Math.floor(random * (range[1] - range[0] + 1));
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
      writer_fans INTEGER NOT NULL DEFAULT 0, writer_day INTEGER NOT NULL DEFAULT 0,
      writer_writes INTEGER NOT NULL DEFAULT 0,
      owns_restaurant INTEGER NOT NULL DEFAULT 0,
      prison_until INTEGER NOT NULL DEFAULT 0, prison_crime TEXT NOT NULL DEFAULT '',
      territory_location TEXT NOT NULL DEFAULT '', territory_day INTEGER NOT NULL DEFAULT 0,
      territory_payout_day INTEGER NOT NULL DEFAULT 0, territory_visits INTEGER NOT NULL DEFAULT 0,
      territory_income INTEGER NOT NULL DEFAULT 0, territory_pending INTEGER NOT NULL DEFAULT 0,
      hack_day INTEGER NOT NULL DEFAULT 0, hack_uses INTEGER NOT NULL DEFAULT 0,
      street_day INTEGER NOT NULL DEFAULT 0, street_scavenges INTEGER NOT NULL DEFAULT 0,
      street_beg_income INTEGER NOT NULL DEFAULT 0,
      main_story TEXT NOT NULL DEFAULT 'legacy',
      energy INTEGER NOT NULL DEFAULT 100,
      health INTEGER NOT NULL DEFAULT 100,
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
      elapsed_remainder_ms INTEGER NOT NULL DEFAULT 0,
      location TEXT NOT NULL DEFAULT 'realtor', created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL, last_seen_at INTEGER NOT NULL,
      life_version INTEGER NOT NULL DEFAULT 0, reset_game_over TEXT NOT NULL DEFAULT '',
      mutation_token TEXT NOT NULL DEFAULT ''
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
      updated_at INTEGER NOT NULL, life_version INTEGER NOT NULL DEFAULT 0,
      deal_token TEXT NOT NULL DEFAULT ''
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS casino_table_state (
      id TEXT PRIMARY KEY, deck TEXT NOT NULL DEFAULT '[]',
      round_token TEXT NOT NULL DEFAULT '', action_token TEXT NOT NULL DEFAULT '', updated_at INTEGER NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS poker_hands (
      user_id TEXT PRIMARY KEY, player_name TEXT NOT NULL,
      hole_cards TEXT NOT NULL DEFAULT '[]', community_cards TEXT NOT NULL DEFAULT '[]',
      bet INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'idle',
      result TEXT NOT NULL DEFAULT '', seat_no INTEGER, reveal_at INTEGER NOT NULL DEFAULT 0,
      street_bet INTEGER NOT NULL DEFAULT 0, acted INTEGER NOT NULL DEFAULT 0,
      life_version INTEGER NOT NULL DEFAULT 0, round_token TEXT NOT NULL DEFAULT '',
      action_token TEXT NOT NULL DEFAULT '', updated_at INTEGER NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS poker_table_state (
      id TEXT PRIMARY KEY, deck TEXT NOT NULL DEFAULT '[]', community_cards TEXT NOT NULL DEFAULT '[]',
      street TEXT NOT NULL DEFAULT 'idle', current_bet INTEGER NOT NULL DEFAULT 0,
      turn_seat INTEGER NOT NULL DEFAULT 0, pot INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'idle', round_token TEXT NOT NULL DEFAULT '',
      action_token TEXT NOT NULL DEFAULT '', updated_at INTEGER NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS player_progress (
      user_id TEXT PRIMARY KEY, talent_exp INTEGER NOT NULL DEFAULT 0,
      talents TEXT NOT NULL DEFAULT '[]', story_chapter INTEGER NOT NULL DEFAULT 0,
      story_seen_chapter INTEGER NOT NULL DEFAULT 0,
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
    db.prepare(`CREATE TABLE IF NOT EXISTS player_reputation (
      user_id TEXT NOT NULL, faction TEXT NOT NULL, points INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, faction)
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS city_commission_claims (
      user_id TEXT NOT NULL, cycle_day INTEGER NOT NULL, commission_id TEXT NOT NULL,
      life_version INTEGER NOT NULL DEFAULT 0, completed_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, cycle_day, commission_id)
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS life_contracts (
      id TEXT PRIMARY KEY, creator_id TEXT NOT NULL, creator_name TEXT NOT NULL, creator_life_version INTEGER NOT NULL DEFAULT 0,
      partner_id TEXT NOT NULL, partner_name TEXT NOT NULL, partner_life_version INTEGER NOT NULL DEFAULT 0,
      target_per_player INTEGER NOT NULL DEFAULT 1000, stake INTEGER NOT NULL DEFAULT 200,
      creator_deposit INTEGER NOT NULL DEFAULT 0, partner_deposit INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending', expires_day INTEGER NOT NULL,
      resolution_token TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS player_inventory (
      user_id TEXT NOT NULL, item_key TEXT NOT NULL, quantity INTEGER NOT NULL DEFAULT 0,
      life_version INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, item_key)
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS street_beg_requests (
      id TEXT PRIMARY KEY, requester_id TEXT NOT NULL, requester_name TEXT NOT NULL,
      recipient_id TEXT NOT NULL, requester_job TEXT NOT NULL,
      requester_life_version INTEGER NOT NULL DEFAULT 0, recipient_life_version INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending', outcome TEXT NOT NULL DEFAULT '', amount INTEGER NOT NULL DEFAULT 0,
      resolution_token TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, resolved_at INTEGER
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS street_aid_boxes (
      owner_id TEXT NOT NULL, cycle_day INTEGER NOT NULL, owner_name TEXT NOT NULL,
      owner_life_version INTEGER NOT NULL DEFAULT 0, total_received INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active', updated_at INTEGER NOT NULL,
      PRIMARY KEY (owner_id, cycle_day)
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS street_aid_donations (
      owner_id TEXT NOT NULL, cycle_day INTEGER NOT NULL, donor_id TEXT NOT NULL,
      amount INTEGER NOT NULL, action_token TEXT NOT NULL DEFAULT '', donated_at INTEGER NOT NULL,
      PRIMARY KEY (owner_id, cycle_day, donor_id)
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS city_coop_projects (
      cycle_day INTEGER PRIMARY KEY, status TEXT NOT NULL DEFAULT 'open', completed_at INTEGER,
      completion_token TEXT NOT NULL DEFAULT '', updated_at INTEGER NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS city_coop_contributions (
      cycle_day INTEGER NOT NULL, role TEXT NOT NULL, user_id TEXT NOT NULL, player_name TEXT NOT NULL,
      job_category TEXT NOT NULL, life_version INTEGER NOT NULL DEFAULT 0, contributed_at INTEGER NOT NULL,
      PRIMARY KEY (cycle_day, role), UNIQUE (cycle_day, user_id)
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS player_transfer_requests (
      id TEXT PRIMARY KEY, sender_id TEXT NOT NULL, sender_name TEXT NOT NULL,
      recipient_id TEXT NOT NULL, kind TEXT NOT NULL, amount INTEGER NOT NULL,
      sender_life_version INTEGER NOT NULL DEFAULT 0, recipient_life_version INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending', outcome TEXT NOT NULL DEFAULT '',
      resolution_token TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL, resolved_at INTEGER
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS player_medical_requests (
      id TEXT PRIMARY KEY, patient_id TEXT NOT NULL, patient_name TEXT NOT NULL,
      provider_id TEXT NOT NULL, provider_name TEXT NOT NULL, provider_job TEXT NOT NULL,
      health_gain INTEGER NOT NULL, amount INTEGER NOT NULL,
      patient_life_version INTEGER NOT NULL DEFAULT 0, provider_life_version INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending', outcome TEXT NOT NULL DEFAULT '',
      resolution_token TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL, resolved_at INTEGER
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS player_loan_requests (
      id TEXT PRIMARY KEY, borrower_id TEXT NOT NULL, borrower_name TEXT NOT NULL,
      provider_id TEXT NOT NULL, provider_name TEXT NOT NULL, provider_job TEXT NOT NULL,
      amount INTEGER NOT NULL, interest_rate_bp INTEGER NOT NULL, spread_bp INTEGER NOT NULL,
      borrower_life_version INTEGER NOT NULL DEFAULT 0, provider_life_version INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending', outcome TEXT NOT NULL DEFAULT '',
      resolution_token TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL, resolved_at INTEGER
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS player_loan_contracts (
      id TEXT PRIMARY KEY, borrower_id TEXT NOT NULL, borrower_name TEXT NOT NULL,
      provider_id TEXT NOT NULL, provider_name TEXT NOT NULL, provider_job TEXT NOT NULL,
      principal_amount INTEGER NOT NULL, outstanding_balance INTEGER NOT NULL,
      interest_rate_bp INTEGER NOT NULL, spread_bp INTEGER NOT NULL,
      borrower_life_version INTEGER NOT NULL DEFAULT 0, provider_life_version INTEGER NOT NULL DEFAULT 0,
      revision INTEGER NOT NULL DEFAULT 0, mutation_token TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active', opened_at INTEGER NOT NULL, closed_at INTEGER
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS territory_visit_log (
      owner_id TEXT NOT NULL, visitor_id TEXT NOT NULL, cycle_day INTEGER NOT NULL,
      last_visit_minute INTEGER NOT NULL, action_token TEXT NOT NULL DEFAULT '',
      PRIMARY KEY (owner_id, visitor_id, cycle_day)
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS writer_books (
      id TEXT PRIMARY KEY, author_id TEXT NOT NULL, author_name TEXT NOT NULL,
      author_life_version INTEGER NOT NULL DEFAULT 0,
      title TEXT NOT NULL, price INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'active',
      created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS writer_book_purchases (
      book_id TEXT NOT NULL, buyer_id TEXT NOT NULL, author_id TEXT NOT NULL,
      buyer_life_version INTEGER NOT NULL DEFAULT 0, author_life_version INTEGER NOT NULL DEFAULT 0,
      quantity INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL, purchase_token TEXT NOT NULL DEFAULT '',
      PRIMARY KEY (book_id, buyer_id)
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS casino_bingo_state (
      id TEXT PRIMARY KEY, round_no INTEGER NOT NULL DEFAULT 1, status TEXT NOT NULL DEFAULT 'lobby',
      host_user_id TEXT NOT NULL DEFAULT '', entry_fee INTEGER NOT NULL DEFAULT 100, drawn_numbers TEXT NOT NULL DEFAULT '[]', next_draw_at INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS casino_bingo_entries (
      round_no INTEGER NOT NULL, user_id TEXT NOT NULL, player_name TEXT NOT NULL, card TEXT NOT NULL,
      life_version INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (round_no, user_id)
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS casino_tournament_state (
      id TEXT PRIMARY KEY, round_no INTEGER NOT NULL DEFAULT 1, current_round INTEGER NOT NULL DEFAULT 0, game TEXT NOT NULL DEFAULT 'blackjack', status TEXT NOT NULL DEFAULT 'lobby',
      host_user_id TEXT NOT NULL DEFAULT '', entry_fee INTEGER NOT NULL DEFAULT 500, round_limit INTEGER NOT NULL DEFAULT 5, next_round_at INTEGER NOT NULL DEFAULT 0, latest_result TEXT NOT NULL DEFAULT '', updated_at INTEGER NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS casino_tournament_entries (
      tournament_no INTEGER NOT NULL, user_id TEXT NOT NULL, player_name TEXT NOT NULL, score INTEGER NOT NULL DEFAULT 0, latest_hand TEXT NOT NULL DEFAULT '',
      life_version INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (tournament_no, user_id)
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS casino_tournament_rounds (
      tournament_no INTEGER NOT NULL, round_no INTEGER NOT NULL, game TEXT NOT NULL DEFAULT 'blackjack', status TEXT NOT NULL DEFAULT 'playing',
      deck TEXT NOT NULL DEFAULT '[]', dealer_cards TEXT NOT NULL DEFAULT '[]', community_cards TEXT NOT NULL DEFAULT '[]',
      street TEXT NOT NULL DEFAULT 'idle', current_bet INTEGER NOT NULL DEFAULT 0, turn_seat INTEGER NOT NULL DEFAULT 0,
      pot INTEGER NOT NULL DEFAULT 0, next_action_at INTEGER NOT NULL DEFAULT 0,
      action_token TEXT NOT NULL DEFAULT '', updated_at INTEGER NOT NULL,
      PRIMARY KEY (tournament_no, round_no)
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS casino_tournament_hands (
      tournament_no INTEGER NOT NULL, round_no INTEGER NOT NULL, user_id TEXT NOT NULL, player_name TEXT NOT NULL, seat_no INTEGER NOT NULL,
      player_cards TEXT NOT NULL DEFAULT '[]', hole_cards TEXT NOT NULL DEFAULT '[]', bet INTEGER NOT NULL DEFAULT 0,
      street_bet INTEGER NOT NULL DEFAULT 0, stack INTEGER NOT NULL DEFAULT 100, status TEXT NOT NULL DEFAULT 'playing',
      acted INTEGER NOT NULL DEFAULT 0, result TEXT NOT NULL DEFAULT '',
      life_version INTEGER NOT NULL DEFAULT 0, action_token TEXT NOT NULL DEFAULT '', updated_at INTEGER NOT NULL,
      PRIMARY KEY (tournament_no, round_no, user_id)
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_tournament_round_status ON casino_tournament_rounds(tournament_no, status)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_tournament_hands_round ON casino_tournament_hands(tournament_no, round_no, seat_no)"),
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
    db.prepare("CREATE INDEX IF NOT EXISTS idx_reputation_user_points ON player_reputation(user_id, points)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_commission_claim_day ON city_commission_claims(cycle_day, commission_id)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_contract_member_status ON life_contracts(creator_id, status)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_contract_partner_status ON life_contracts(partner_id, status)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_inventory_user_life ON player_inventory(user_id, life_version)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_beg_recipient_status ON street_beg_requests(recipient_id, status, expires_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_beg_pair_created ON street_beg_requests(requester_id, recipient_id, created_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_aid_boxes_day_status ON street_aid_boxes(cycle_day, status)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_aid_donations_donor_day ON street_aid_donations(donor_id, cycle_day)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_transfer_requests_recipient_status ON player_transfer_requests(recipient_id, status, expires_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_medical_requests_provider_status ON player_medical_requests(provider_id, status, expires_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_loan_requests_provider_status ON player_loan_requests(provider_id, status, expires_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_loan_requests_borrower_status ON player_loan_requests(borrower_id, status, expires_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_loan_contracts_borrower_status ON player_loan_contracts(borrower_id, status)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_loan_contracts_provider_status ON player_loan_contracts(provider_id, status)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_territory_visit_owner_day ON territory_visit_log(owner_id, cycle_day)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_writer_books_author_status ON writer_books(author_id, status)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_writer_books_status_updated ON writer_books(status, updated_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_writer_purchases_buyer ON writer_book_purchases(buyer_id, updated_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_writer_purchases_author ON writer_book_purchases(author_id, updated_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_bingo_entries_round ON casino_bingo_entries(round_no)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_tournament_entries_round ON casino_tournament_entries(tournament_no)"),
  ]);
  const columns = await db.prepare("PRAGMA table_info(players)").all<{ name: string }>();
  const columnNames = new Set(columns.results.map((column) => column.name));
  for (const statement of [
    !columnNames.has("writer_fans") ? "ALTER TABLE players ADD COLUMN writer_fans INTEGER NOT NULL DEFAULT 0" : null,
    !columnNames.has("writer_day") ? "ALTER TABLE players ADD COLUMN writer_day INTEGER NOT NULL DEFAULT 0" : null,
    !columnNames.has("writer_writes") ? "ALTER TABLE players ADD COLUMN writer_writes INTEGER NOT NULL DEFAULT 0" : null,
    !columnNames.has("owns_restaurant") ? "ALTER TABLE players ADD COLUMN owns_restaurant INTEGER NOT NULL DEFAULT 0" : null,
    !columnNames.has("prison_until") ? "ALTER TABLE players ADD COLUMN prison_until INTEGER NOT NULL DEFAULT 0" : null,
    !columnNames.has("prison_crime") ? "ALTER TABLE players ADD COLUMN prison_crime TEXT NOT NULL DEFAULT ''" : null,
    !columnNames.has("territory_location") ? "ALTER TABLE players ADD COLUMN territory_location TEXT NOT NULL DEFAULT ''" : null,
    !columnNames.has("territory_day") ? "ALTER TABLE players ADD COLUMN territory_day INTEGER NOT NULL DEFAULT 0" : null,
    !columnNames.has("territory_payout_day") ? "ALTER TABLE players ADD COLUMN territory_payout_day INTEGER NOT NULL DEFAULT 0" : null,
    !columnNames.has("territory_visits") ? "ALTER TABLE players ADD COLUMN territory_visits INTEGER NOT NULL DEFAULT 0" : null,
    !columnNames.has("territory_income") ? "ALTER TABLE players ADD COLUMN territory_income INTEGER NOT NULL DEFAULT 0" : null,
    !columnNames.has("territory_pending") ? "ALTER TABLE players ADD COLUMN territory_pending INTEGER NOT NULL DEFAULT 0" : null,
    !columnNames.has("elapsed_remainder_ms") ? "ALTER TABLE players ADD COLUMN elapsed_remainder_ms INTEGER NOT NULL DEFAULT 0" : null,
    !columnNames.has("life_version") ? "ALTER TABLE players ADD COLUMN life_version INTEGER NOT NULL DEFAULT 0" : null,
    !columnNames.has("reset_game_over") ? "ALTER TABLE players ADD COLUMN reset_game_over TEXT NOT NULL DEFAULT ''" : null,
    !columnNames.has("mutation_token") ? "ALTER TABLE players ADD COLUMN mutation_token TEXT NOT NULL DEFAULT ''" : null,
    !columnNames.has("hack_day") ? "ALTER TABLE players ADD COLUMN hack_day INTEGER NOT NULL DEFAULT 0" : null,
    !columnNames.has("hack_uses") ? "ALTER TABLE players ADD COLUMN hack_uses INTEGER NOT NULL DEFAULT 0" : null,
    !columnNames.has("street_day") ? "ALTER TABLE players ADD COLUMN street_day INTEGER NOT NULL DEFAULT 0" : null,
    !columnNames.has("street_scavenges") ? "ALTER TABLE players ADD COLUMN street_scavenges INTEGER NOT NULL DEFAULT 0" : null,
    !columnNames.has("street_beg_income") ? "ALTER TABLE players ADD COLUMN street_beg_income INTEGER NOT NULL DEFAULT 0" : null,
  ].filter((item): item is string => Boolean(item))) await db.prepare(statement).run();
  const extraColumns: Record<string, Record<string, string>> = {
    writer_books: { author_life_version: "INTEGER NOT NULL DEFAULT 0" },
    writer_book_purchases: {
      buyer_life_version: "INTEGER NOT NULL DEFAULT 0",
      author_life_version: "INTEGER NOT NULL DEFAULT 0",
      purchase_token: "TEXT NOT NULL DEFAULT ''",
    },
    casino_hands: { life_version: "INTEGER NOT NULL DEFAULT 0", deal_token: "TEXT NOT NULL DEFAULT ''" },
    casino_table_state: { round_token: "TEXT NOT NULL DEFAULT ''", action_token: "TEXT NOT NULL DEFAULT ''" },
    poker_hands: {
      life_version: "INTEGER NOT NULL DEFAULT 0",
      round_token: "TEXT NOT NULL DEFAULT ''",
      action_token: "TEXT NOT NULL DEFAULT ''",
    },
    poker_table_state: { round_token: "TEXT NOT NULL DEFAULT ''", action_token: "TEXT NOT NULL DEFAULT ''" },
    player_transfer_requests: {
      sender_life_version: "INTEGER NOT NULL DEFAULT 0",
      recipient_life_version: "INTEGER NOT NULL DEFAULT 0",
    },
    player_medical_requests: {
      patient_life_version: "INTEGER NOT NULL DEFAULT 0",
      provider_life_version: "INTEGER NOT NULL DEFAULT 0",
    },
    player_loan_requests: {
      borrower_life_version: "INTEGER NOT NULL DEFAULT 0",
      provider_life_version: "INTEGER NOT NULL DEFAULT 0",
    },
    player_loan_contracts: {
      borrower_life_version: "INTEGER NOT NULL DEFAULT 0",
      provider_life_version: "INTEGER NOT NULL DEFAULT 0",
      revision: "INTEGER NOT NULL DEFAULT 0",
      mutation_token: "TEXT NOT NULL DEFAULT ''",
    },
    territory_visit_log: { action_token: "TEXT NOT NULL DEFAULT ''" },
    casino_bingo_entries: { life_version: "INTEGER NOT NULL DEFAULT 0" },
    casino_tournament_entries: { life_version: "INTEGER NOT NULL DEFAULT 0" },
    casino_tournament_rounds: { action_token: "TEXT NOT NULL DEFAULT ''" },
    casino_tournament_hands: { life_version: "INTEGER NOT NULL DEFAULT 0", action_token: "TEXT NOT NULL DEFAULT ''" },
    player_progress: { story_seen_chapter: "INTEGER NOT NULL DEFAULT 0" },
    city_coop_projects: { completion_token: "TEXT NOT NULL DEFAULT ''" },
  };
  for (const [table, definitions] of Object.entries(extraColumns)) {
    const tableColumns = await db.prepare(`PRAGMA table_info(${table})`).all<{ name: string }>();
    const names = new Set(tableColumns.results.map((column) => column.name));
    for (const [name, definition] of Object.entries(definitions)) {
      if (!names.has(name)) await db.prepare(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`).run();
    }
  }
  if (columnNames.has("mood")) await db.prepare("ALTER TABLE players DROP COLUMN mood").run();
  await db.prepare("UPDATE players SET current_job='寫作助理', job_category='literary', job_exp=0 WHERE job_category='creative' OR current_job IN ('作家','畫家','設計師','演員','歌手','導演','實況主','網紅')").run();
  await db.prepare("UPDATE players SET current_job='廚房助理', job_category='hospitality', job_exp=0 WHERE current_job IN ('咖啡師','調酒師','旅館經理','導遊')").run();
  await db.prepare("UPDATE players SET current_job='unemployed', job_category='unfixed', job_exp=0 WHERE current_job IN ('職業球員','賽車手','格鬥選手','教練','裁判','健身教練')").run();
  await db.prepare("UPDATE players SET current_job='街友', job_category='street' WHERE current_job='流浪者'").run();
  await db.prepare(`UPDATE players SET current_job=CASE
      WHEN current_job IN ('攝影師','翻譯') THEN '接案助理'
      WHEN current_job='接案設計師' THEN '自由工作者'
      WHEN current_job IN ('顧問','家教') THEN '資深接案者'
      WHEN current_job='街頭藝人' THEN '自由工作顧問' END,
    job_category='freelance' WHERE current_job IN ('攝影師','翻譯','接案設計師','顧問','家教','街頭藝人')`).run();
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
    // A reset owns the row until its final batch commits.  Do not let a
    // heartbeat perform finance/territory side effects while that marker is
    // present; the reset handler will either finish or recover it.
    if (row.reset_game_over || row.game_over === "__resetting__") return row;
    // Calculate the online-only player clock from the database's current
    // last_seen_at inside one statement. Action waits are wall-clock timers:
    // going offline must not extend a work/sleep/class wait that already began.
    const heartbeat = await db.prepare(`UPDATE players SET
      display_name=?, email=?,
      elapsed_minutes=elapsed_minutes+CASE
        WHEN ?>=last_seen_at AND ?-last_seen_at<=? THEN CAST((elapsed_remainder_ms+(?-last_seen_at))/1000 AS INTEGER)
        ELSE 0 END,
      elapsed_remainder_ms=CASE
        WHEN ?>=last_seen_at AND ?-last_seen_at<=? THEN (elapsed_remainder_ms+(?-last_seen_at))%1000
        ELSE elapsed_remainder_ms END,
      last_seen_at=MAX(last_seen_at, ?)
      WHERE user_id=? AND (?=1 OR ?-last_seen_at>=?)
      RETURNING *`).bind(
        user.displayName.slice(0, 40), user.email,
        now, now, ONLINE_HEARTBEAT_GRACE_MS, now,
        now, now, ONLINE_HEARTBEAT_GRACE_MS, now,
        now, user.userId, forceHeartbeat ? 1 : 0, now, HEARTBEAT_WRITE_INTERVAL_MS,
      ).first<PlayerRow>();
    if (heartbeat) row = heartbeat;
  }
  if (!row) return null;
  if (row.prison_until > 0 && row.elapsed_minutes >= row.prison_until) {
    await db.prepare("UPDATE players SET prison_until=0, prison_crime='', location='realtor', updated_at=?, last_seen_at=? WHERE user_id=? AND life_version=? AND reset_game_over='' AND game_over<>'__resetting__'")
      .bind(now, now, user.userId, row.life_version).run();
    row = { ...row, prison_until: 0, prison_crime: "", location: "realtor", last_seen_at: now };
  }
  if (row.job_category === "crime" && row.current_job === "大橋頭營運長" && row.territory_location) {
    const cityDay = Math.floor(worldMinutes() / 1440) + 1;
    if (row.territory_day <= 0) {
      await db.prepare("UPDATE players SET territory_day=?, updated_at=? WHERE user_id=? AND life_version=? AND reset_game_over='' AND game_over<>'__resetting__'").bind(cityDay, now, user.userId, row.life_version).run();
      row.territory_day = cityDay;
    } else if (cityDay > row.territory_day) {
      const rolled = await db.prepare(`UPDATE players SET territory_day=?, territory_visits=0,
        territory_pending=territory_pending+territory_income, territory_income=0, updated_at=?
        WHERE user_id=? AND territory_day<? AND territory_location<>'' AND life_version=?
          AND reset_game_over='' AND game_over<>'__resetting__'
        RETURNING *`).bind(cityDay, now, user.userId, cityDay, row.life_version).first<PlayerRow>();
      if (rolled) row = rolled;
      else row = await db.prepare("SELECT * FROM players WHERE user_id=?").bind(user.userId).first<PlayerRow>() ?? row;
    }
    if (row.territory_pending > 0 && row.prison_until <= row.elapsed_minutes) {
      const paid = await db.prepare(`UPDATE players SET cash=cash+territory_pending, territory_pending=0,
        territory_payout_day=?, updated_at=?
        WHERE user_id=? AND territory_pending>0 AND prison_until<=elapsed_minutes AND life_version=?
          AND reset_game_over='' AND game_over<>'__resetting__'
        RETURNING *`).bind(cityDay, now, user.userId, row.life_version).first<PlayerRow>();
      if (paid) row = paid;
      else row = await db.prepare("SELECT * FROM players WHERE user_id=?").bind(user.userId).first<PlayerRow>() ?? row;
    }
  }
  let loanContract = row.loan_balance > 0 ? await activeLoanContract(db, user.userId) : null;
  const today = Math.floor(row.elapsed_minutes / 1440) + 1;
  if (row.writer_day <= 0) {
    await db.prepare("UPDATE players SET writer_day=?, writer_writes=0 WHERE user_id=?").bind(today, user.userId).run();
    row.writer_day = today; row.writer_writes = 0;
  }
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
    await db.prepare("UPDATE players SET finance_day=?, daily_minimum_payment=?, writer_day=?, writer_writes=0 WHERE user_id=?").bind(today, minimumPayment, today, user.userId).run();
    row.finance_day = today; row.daily_minimum_payment = minimumPayment; row.writer_day = today; row.writer_writes = 0;
  } else if (today > row.finance_day) {
    const sourceFinanceDay = row.finance_day;
    const sourceRevision = row.updated_at;
    const sourceLifeVersion = row.life_version;
    const financeClaimRevision = Math.max(now, sourceRevision + 1);
    const financeToken = crypto.randomUUID();
    const financeClaimStatements: D1PreparedStatement[] = [db.prepare(`UPDATE players SET updated_at=?, mutation_token=?
      WHERE user_id=? AND finance_day=? AND updated_at=? AND life_version=?
        AND game_over<>'__resetting__' AND reset_game_over=''
      RETURNING *`).bind(financeClaimRevision, financeToken, user.userId, sourceFinanceDay, sourceRevision, sourceLifeVersion)];
    if (loanContract) financeClaimStatements.push(db.prepare(`UPDATE player_loan_contracts
      SET revision=revision+1, mutation_token=?
      WHERE id=? AND status='active' AND revision=? AND borrower_life_version=?
        AND EXISTS (SELECT 1 FROM players WHERE user_id=? AND life_version=? AND mutation_token=? AND updated_at=?)
      RETURNING revision, mutation_token`).bind(financeToken, loanContract.id, loanContract.revision, sourceLifeVersion,
        user.userId, sourceLifeVersion, financeToken, financeClaimRevision));
    const financeClaims = await db.batch(financeClaimStatements);
    if ((financeClaims[0]?.results?.length ?? 0) !== 1 || (loanContract && (financeClaims[1]?.results?.length ?? 0) !== 1)) {
      return await db.prepare("SELECT * FROM players WHERE user_id=?").bind(user.userId).first<PlayerRow>() ?? row;
    }
    row = financeClaims[0].results[0] as PlayerRow;
    if (loanContract) loanContract = { ...loanContract, revision: loanContract.revision + 1, mutation_token: financeToken };
    const progress = await ensureProgress(db, row);
    const elapsedDays = today - row.finance_day;
    let cashBalance = row.cash;
    let bankBalance = row.bank_balance;
    let loanBalance = row.loan_balance;
    let minimumPayment = row.daily_minimum_payment || (row.main_story === "prodigal_return" ? prodigalMinimumPayment(loanBalance) : 0);
    let paymentMade = row.daily_payment_made;
    let missedPaymentDays = row.missed_payment_days;
    let writerWrites = row.writer_writes;
    let gameOver = row.game_over;
    let providerEarnings = 0;
    for (let day = 0; day < elapsedDays; day += 1) {
      if (row.owns_restaurant && row.job_category === "hospitality" && row.current_job === "餐廳老闆") cashBalance = Math.min(9_000_000_000_000_000, cashBalance + RESTAURANT_DAILY_NET);
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
      const depositRateBp = financeDepositRateFor(row.current_job);
      bankBalance = Math.min(9_000_000_000_000_000, bankBalance + Math.round(bankBalance * depositRateBp / 10_000));
      if (row.job_category === "literary") cashBalance = Math.min(9_000_000_000_000_000, cashBalance + row.writer_fans * WRITER_DAILY_FAN_RATE);
      if (loanContract && row.main_story !== "prodigal_return" && loanBalance > 0) {
        providerEarnings += Math.max(0, Math.round(loanBalance * loanContract.spread_bp / 10_000));
        loanBalance = Math.min(9_000_000_000_000_000, loanBalance + Math.round(loanBalance * loanContract.interest_rate_bp / 10_000));
      } else {
        const dailyLoanRateBp = row.main_story === "prodigal_return" ? (parseList(progress.talents).includes("credit_rebuild") ? 18 : 20) : BANK_LOAN_RATE_BP;
        loanBalance = Math.min(9_000_000_000_000_000, loanBalance + Math.round(loanBalance * dailyLoanRateBp / 10_000));
      }
      paymentMade = 0;
      minimumPayment = row.main_story === "prodigal_return" && !gameOver ? prodigalMinimumPayment(loanBalance) : 0;
    }
    writerWrites = 0;
    const financeFinishedRevision = financeClaimRevision + 1;
    const financeFinishedToken = crypto.randomUUID();
    const financeStatements = [db.prepare(`UPDATE players SET cash=?, bank_balance=?, loan_balance=?, finance_day=?, daily_minimum_payment=?,
      daily_payment_made=?, missed_payment_days=?, game_over=?, writer_day=?, writer_writes=?, updated_at=?, mutation_token=?
      WHERE user_id=? AND finance_day=? AND updated_at=? AND life_version=? AND mutation_token=?
        AND (?=0 OR EXISTS (SELECT 1 FROM player_loan_contracts WHERE id=? AND status='active' AND mutation_token=?))
      RETURNING user_id`)
      .bind(cashBalance, bankBalance, loanBalance, today, minimumPayment, paymentMade, missedPaymentDays, gameOver, today, writerWrites,
        financeFinishedRevision, financeFinishedToken, user.userId, sourceFinanceDay, financeClaimRevision, sourceLifeVersion, financeToken,
        loanContract ? 1 : 0, loanContract?.id ?? "", financeToken)];
    if (loanContract) {
      financeStatements.push(db.prepare(`UPDATE player_loan_contracts SET outstanding_balance=?, status=?, closed_at=?,
        revision=revision+1, mutation_token=?
        WHERE id=? AND status='active' AND mutation_token=?
          AND EXISTS (SELECT 1 FROM players WHERE user_id=? AND finance_day=? AND life_version=? AND mutation_token=? AND updated_at=?)
        RETURNING id`)
        .bind(loanBalance, loanBalance > 0 ? "active" : "paid", loanBalance > 0 ? null : now, financeFinishedToken,
          loanContract.id, financeToken, user.userId, today, sourceLifeVersion, financeFinishedToken, financeFinishedRevision));
      if (providerEarnings > 0 && loanContract.provider_id !== "bank") financeStatements.push(db.prepare(`UPDATE players SET cash=cash+?, updated_at=MAX(updated_at+1, ?)
        WHERE user_id=? AND life_version=? AND game_over<>'__resetting__' AND reset_game_over=''
          AND EXISTS (SELECT 1 FROM player_loan_contracts WHERE id=? AND provider_id=? AND provider_life_version=? AND mutation_token=?)
        RETURNING user_id`)
        .bind(providerEarnings, now, loanContract.provider_id, loanContract.provider_life_version, loanContract.id,
          loanContract.provider_id, loanContract.provider_life_version, financeFinishedToken));
    }
    const financeResults = await db.batch(financeStatements);
    if ((financeResults[0]?.results?.length ?? 0) !== 1) return await db.prepare("SELECT * FROM players WHERE user_id=?").bind(user.userId).first<PlayerRow>() ?? row;
    if (loanContract && loanBalance <= 0) loanContract = null;
    row.cash = cashBalance; row.bank_balance = bankBalance; row.loan_balance = loanBalance; row.finance_day = today; row.daily_minimum_payment = minimumPayment; row.daily_payment_made = paymentMade; row.missed_payment_days = missedPaymentDays; row.game_over = gameOver; row.writer_day = today; row.writer_writes = writerWrites; row.updated_at = financeFinishedRevision; row.mutation_token = financeFinishedToken;
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
    db.prepare(`SELECT p.user_id, p.display_name, p.location, p.cash, p.loan_balance, p.current_job, p.job_category, p.prison_until, p.prison_crime, p.last_seen_at,
      a.avatar_data IS NOT NULL AS has_avatar, a.avatar_updated_at
      FROM players p JOIN accounts a ON a.id = p.user_id
      WHERE p.last_seen_at >= ? ORDER BY p.last_seen_at DESC LIMIT 24`).bind(since).all<{ user_id: string; display_name: string; location: LocationId; cash: number; loan_balance: number; current_job: string; job_category: string; prison_until: number; prison_crime: string; last_seen_at: number; has_avatar: number; avatar_updated_at: number | null }>(),
    db.prepare("SELECT id, player_name, title, detail, tone, game_time FROM game_events WHERE room_id = 'lobby-01' AND title NOT IN ('前往新地點', '移動完成') ORDER BY created_at DESC LIMIT 12").all<{ id: string; player_name: string; title: string; detail: string; tone: "good" | "neutral" | "warn"; game_time: string }>(),
  ]);
  return {
    serverNow: Date.now(),
    online: players.results.map((row) => ({ id: row.user_id, displayName: row.display_name, location: row.location, cash: row.cash, loanBalance: row.loan_balance, currentJob: jobInfo(row.current_job) ? row.current_job : "待業者", jobCategory: jobInfo(row.current_job) ? row.job_category : "unfixed", prisonUntil: row.prison_until, prisonCrime: row.prison_crime, updatedAt: row.last_seen_at, avatarUrl: row.has_avatar ? `/api/avatar/${row.user_id}?v=${row.avatar_updated_at ?? 0}` : null })),
    feed: events.results.map((row) => ({ id: row.id, playerName: row.player_name, title: row.title, detail: row.detail, tone: row.tone, time: row.game_time })),
  };
}

async function recordTerritoryVisit(db: D1Database, visitorId: string, visitorLifeVersion: number, location: LocationId, gameDay: number, gameMinute: number) {
  if (!TERRITORY_LOCATIONS.has(location)) return null;
  const owner = await db.prepare(`SELECT user_id, current_job, job_category, prison_until, elapsed_minutes, territory_day, territory_visits, territory_income, life_version
    FROM players WHERE territory_location=? AND current_job='大橋頭營運長' AND job_category='crime'
      AND game_over<>'__resetting__' AND reset_game_over=''
    ORDER BY created_at, user_id LIMIT 1`).bind(location).first<{
    user_id: string; current_job: string; job_category: string; prison_until: number; elapsed_minutes: number;
    territory_day: number; territory_visits: number; territory_income: number; life_version: number;
  }>();
  if (!owner || owner.user_id === visitorId || owner.prison_until > owner.elapsed_minutes) return null;
  if (owner.territory_day !== gameDay) {
    const rolled = await db.prepare(`UPDATE players SET territory_day=?, territory_visits=0,
      territory_pending=territory_pending+territory_income, territory_income=0, updated_at=?
      WHERE user_id=? AND territory_location=? AND current_job='大橋頭營運長'
        AND job_category='crime' AND territory_day<? AND life_version=?
        AND game_over<>'__resetting__' AND reset_game_over=''
      RETURNING territory_day, territory_visits, territory_income`)
      .bind(gameDay, Date.now(), owner.user_id, location, gameDay, owner.life_version)
      .first<{ territory_day: number; territory_visits: number; territory_income: number }>();
    if (rolled) {
      owner.territory_day = rolled.territory_day;
      owner.territory_visits = rolled.territory_visits;
      owner.territory_income = rolled.territory_income;
    } else {
      const refreshed = await db.prepare(`SELECT territory_day, territory_visits, territory_income FROM players
        WHERE user_id=? AND territory_location=?`).bind(owner.user_id, location)
        .first<{ territory_day: number; territory_visits: number; territory_income: number }>();
      if (!refreshed || refreshed.territory_day !== gameDay) return null;
      owner.territory_day = refreshed.territory_day;
      owner.territory_visits = refreshed.territory_visits;
      owner.territory_income = refreshed.territory_income;
    }
  }
  if (owner.territory_income >= TERRITORY_DAILY_CAP || owner.territory_visits >= Math.floor(TERRITORY_DAILY_CAP / TERRITORY_VISIT_REWARD)) return null;
  const visitToken = crypto.randomUUID();
  const visitResults = await db.batch([
    db.prepare(`INSERT INTO territory_visit_log (owner_id, visitor_id, cycle_day, last_visit_minute, action_token)
      SELECT ?, ?, ?, ?, ? WHERE
        EXISTS (SELECT 1 FROM players visitor WHERE visitor.user_id=? AND visitor.life_version=?
          AND visitor.game_over<>'__resetting__' AND visitor.reset_game_over='')
        AND EXISTS (SELECT 1 FROM players owner WHERE owner.user_id=? AND owner.life_version=?
          AND owner.territory_location=? AND owner.current_job='大橋頭營運長' AND owner.job_category='crime'
          AND owner.game_over<>'__resetting__' AND owner.reset_game_over='')
      ON CONFLICT(owner_id, visitor_id, cycle_day) DO UPDATE SET
        last_visit_minute=excluded.last_visit_minute, action_token=excluded.action_token
      WHERE excluded.last_visit_minute-territory_visit_log.last_visit_minute>=?
      RETURNING last_visit_minute`).bind(owner.user_id, visitorId, gameDay, gameMinute, visitToken,
        visitorId, visitorLifeVersion, owner.user_id, owner.life_version, location, TERRITORY_VISIT_COOLDOWN_MINUTES),
    db.prepare(`UPDATE players SET territory_visits=territory_visits+1, territory_income=MIN(territory_income+?, ?), updated_at=MAX(updated_at+1, ?)
      WHERE user_id=? AND life_version=? AND territory_location=? AND current_job='大橋頭營運長' AND job_category='crime'
        AND game_over<>'__resetting__' AND reset_game_over='' AND prison_until<=elapsed_minutes
        AND territory_day=? AND territory_income<?
        AND EXISTS (SELECT 1 FROM territory_visit_log WHERE owner_id=? AND visitor_id=? AND cycle_day=? AND action_token=?)
      RETURNING territory_income`).bind(TERRITORY_VISIT_REWARD, TERRITORY_DAILY_CAP, Date.now(), owner.user_id,
        owner.life_version, location, gameDay, TERRITORY_DAILY_CAP, owner.user_id, visitorId, gameDay, visitToken),
  ]);
  if ((visitResults[0]?.results?.length ?? 0) !== 1 || (visitResults[1]?.results?.length ?? 0) !== 1) return null;
  return { ownerId: owner.user_id, amount: TERRITORY_VISIT_REWARD, income: Number((visitResults[1].results[0] as { territory_income: number }).territory_income) };
}

async function pendingTransferRequests(db: D1Database, recipientId: string) {
  const now = Date.now();
  const hasPending = await db.prepare("SELECT 1 AS pending FROM player_transfer_requests WHERE recipient_id=? AND status IN ('pending','processing') LIMIT 1").bind(recipientId).first<{ pending: number }>();
  if (!hasPending) return [];
  await db.batch([
    db.prepare("UPDATE player_transfer_requests SET status='cancelled', outcome='expired', resolved_at=? WHERE recipient_id=? AND status='pending' AND expires_at<=?").bind(now, recipientId, now),
    db.prepare("UPDATE player_transfer_requests SET status='cancelled', outcome='processing_timeout', resolved_at=? WHERE recipient_id=? AND status='processing' AND resolved_at<=?").bind(now, recipientId, now - REQUEST_PROCESSING_TIMEOUT_MS),
    db.prepare(`UPDATE player_transfer_requests SET status='cancelled', outcome='life_changed', resolved_at=?
      WHERE recipient_id=? AND status='pending' AND (
        NOT EXISTS (SELECT 1 FROM players sender WHERE sender.user_id=sender_id AND sender.life_version=sender_life_version AND sender.reset_game_over='' AND sender.game_over<>'__resetting__')
        OR NOT EXISTS (SELECT 1 FROM players recipient WHERE recipient.user_id=recipient_id AND recipient.life_version=recipient_life_version AND recipient.reset_game_over='' AND recipient.game_over<>'__resetting__')
      )`).bind(now, recipientId),
  ]);
  const requests = await db.prepare(`SELECT id, sender_id, sender_name, recipient_id, kind, amount, sender_life_version, recipient_life_version,
      status, outcome, resolution_token, created_at, expires_at, resolved_at
    FROM player_transfer_requests
    WHERE recipient_id=? AND status='pending' AND expires_at>?
    ORDER BY created_at ASC LIMIT 1`).bind(recipientId, now).all<TransferRequestRow>();
  return requests.results.map((request) => ({ id: request.id, senderName: request.sender_name, amount: request.amount, expiresAt: request.expires_at }));
}

async function pendingMedicalRequests(db: D1Database, providerId: string) {
  const now = Date.now();
  const hasPending = await db.prepare("SELECT 1 AS pending FROM player_medical_requests WHERE provider_id=? AND status IN ('pending','processing') LIMIT 1").bind(providerId).first<{ pending: number }>();
  if (!hasPending) return [];
  await db.batch([
    db.prepare("UPDATE player_medical_requests SET status='cancelled', outcome='expired', resolved_at=? WHERE provider_id=? AND status='pending' AND expires_at<=?").bind(now, providerId, now),
    db.prepare("UPDATE player_medical_requests SET status='cancelled', outcome='processing_timeout', resolved_at=? WHERE provider_id=? AND status='processing' AND resolved_at<=?").bind(now, providerId, now - REQUEST_PROCESSING_TIMEOUT_MS),
    db.prepare(`UPDATE player_medical_requests SET status='cancelled', outcome='provider_unavailable', resolved_at=?
      WHERE provider_id=? AND status='pending' AND NOT EXISTS (
        SELECT 1 FROM players p
        WHERE p.user_id=player_medical_requests.provider_id AND p.last_seen_at>=?
          AND p.current_job=player_medical_requests.provider_job AND p.life_version=player_medical_requests.provider_life_version
          AND p.reset_game_over='' AND p.game_over='' AND p.main_story<>'unselected'
      )`).bind(now, providerId, now - ONLINE_HEARTBEAT_GRACE_MS),
    db.prepare(`UPDATE player_medical_requests SET status='cancelled', outcome='patient_unavailable', resolved_at=?
      WHERE provider_id=? AND status='pending' AND NOT EXISTS (
        SELECT 1 FROM players p
        WHERE p.user_id=player_medical_requests.patient_id AND p.last_seen_at>=?
          AND p.life_version=player_medical_requests.patient_life_version AND p.reset_game_over=''
          AND p.game_over='' AND p.main_story<>'unselected'
      )`).bind(now, providerId, now - ONLINE_HEARTBEAT_GRACE_MS),
  ]);
  const requests = await db.prepare(`SELECT id, patient_id, patient_name, provider_id, provider_name, provider_job, health_gain, amount,
      patient_life_version, provider_life_version, status, outcome, resolution_token, created_at, expires_at, resolved_at
    FROM player_medical_requests
    WHERE provider_id=? AND status='pending' AND expires_at>?
    ORDER BY created_at ASC LIMIT 1`).bind(providerId, now).all<MedicalTreatmentRequestRow>();
  return requests.results.map((request) => ({ id: request.id, patientName: request.patient_name, providerName: request.provider_name, providerJob: request.provider_job, healthGain: request.health_gain, amount: request.amount, expiresAt: request.expires_at }));
}

async function pendingLoanRequests(db: D1Database, providerId: string) {
  const now = Date.now();
  const hasPending = await db.prepare("SELECT 1 AS pending FROM player_loan_requests WHERE provider_id=? AND status IN ('pending','processing') LIMIT 1").bind(providerId).first<{ pending: number }>();
  if (!hasPending) return [];
  await db.batch([
    db.prepare("UPDATE player_loan_requests SET status='cancelled', outcome='expired', resolved_at=? WHERE provider_id=? AND status='pending' AND expires_at<=?").bind(now, providerId, now),
    db.prepare("UPDATE player_loan_requests SET status='cancelled', outcome='processing_timeout', resolved_at=? WHERE provider_id=? AND status='processing' AND resolved_at<=?").bind(now, providerId, now - REQUEST_PROCESSING_TIMEOUT_MS),
    db.prepare(`UPDATE player_loan_requests SET status='cancelled', outcome='provider_unavailable', resolved_at=?
      WHERE provider_id=? AND status='pending' AND NOT EXISTS (
        SELECT 1 FROM players p
        WHERE p.user_id=player_loan_requests.provider_id AND p.last_seen_at>=?
          AND p.current_job=player_loan_requests.provider_job AND p.job_category='finance'
          AND p.life_version=player_loan_requests.provider_life_version AND p.reset_game_over=''
          AND p.game_over='' AND p.main_story<>'unselected'
      )`).bind(now, providerId, now - ONLINE_HEARTBEAT_GRACE_MS),
    db.prepare(`UPDATE player_loan_requests SET status='cancelled', outcome='borrower_unavailable', resolved_at=?
      WHERE provider_id=? AND status='pending' AND NOT EXISTS (
        SELECT 1 FROM players p
        WHERE p.user_id=player_loan_requests.borrower_id AND p.last_seen_at>=? AND p.loan_balance=0
          AND p.life_version=player_loan_requests.borrower_life_version AND p.reset_game_over=''
          AND p.game_over='' AND p.main_story NOT IN ('unselected', 'prodigal_return')
      )`).bind(now, providerId, now - ONLINE_HEARTBEAT_GRACE_MS),
  ]);
  const requests = await db.prepare(`SELECT id, borrower_id, borrower_name, provider_id, provider_name, provider_job, amount, interest_rate_bp, spread_bp,
      borrower_life_version, provider_life_version, status, outcome, resolution_token, created_at, expires_at, resolved_at
    FROM player_loan_requests
    WHERE provider_id=? AND status='pending' AND expires_at>?
    ORDER BY created_at ASC LIMIT 1`).bind(providerId, now).all<LoanRequestRow>();
  return requests.results.map((request) => ({ id: request.id, borrowerName: request.borrower_name, providerName: request.provider_name, providerJob: request.provider_job, amount: request.amount, interestRateBp: request.interest_rate_bp, spreadBp: request.spread_bp, expiresAt: request.expires_at }));
}

const cityCycleDay = () => Math.floor(worldMinutes() / 1440) + 1;

async function streetState(db: D1Database, player: PlayerRow) {
  const rows = await db.prepare(`SELECT item_key, quantity FROM player_inventory
    WHERE user_id=? AND life_version=? AND quantity>0 ORDER BY item_key`).bind(player.user_id, player.life_version)
    .all<{ item_key: keyof typeof STREET_INVENTORY; quantity: number }>();
  const items = rows.results.flatMap((row) => {
    const definition = STREET_INVENTORY[row.item_key];
    if (!definition) return [];
    return [{ key: row.item_key, ...definition, sellPrice: row.item_key === "can" ? streetCanSellPriceFor(player.current_job) : ("sellPrice" in definition ? definition.sellPrice : 0), quantity: row.quantity }];
  });
  const personalDay = Math.floor(player.elapsed_minutes / 1440) + 1;
  const used = player.street_day === personalDay ? player.street_scavenges : 0;
  const income = player.street_day === personalDay ? player.street_beg_income : 0;
  return { items, scavengesUsed: used, scavengesMax: streetScavengeLimitFor(player.current_job), begIncome: income, begCap: streetBegDailyCapFor(player.current_job) };
}

async function pendingBegRequests(db: D1Database, recipientId: string) {
  const now = Date.now();
  await db.batch([
    db.prepare("UPDATE street_beg_requests SET status='cancelled', outcome='expired', resolved_at=? WHERE recipient_id=? AND status='pending' AND expires_at<=?").bind(now, recipientId, now),
    db.prepare("UPDATE street_beg_requests SET status='cancelled', outcome='processing_timeout', resolved_at=? WHERE recipient_id=? AND status='processing' AND resolved_at<=?").bind(now, recipientId, now - REQUEST_PROCESSING_TIMEOUT_MS),
  ]);
  const rows = await db.prepare(`SELECT id, requester_id, requester_name, recipient_id, requester_job, requester_life_version, recipient_life_version,
      status, outcome, amount, resolution_token, created_at, expires_at, resolved_at
    FROM street_beg_requests WHERE recipient_id=? AND status='pending' AND expires_at>?
    ORDER BY created_at LIMIT 1`).bind(recipientId, now).all<BegRequestRow>();
  return rows.results.map((row) => ({ id: row.id, requesterName: row.requester_name, requesterJob: row.requester_job, amounts: streetBegDonationsFor(row.requester_job), expiresAt: row.expires_at }));
}

async function aidBoxState(db: D1Database, userId: string) {
  const day = cityCycleDay();
  const rows = await db.prepare(`SELECT b.owner_id, b.owner_name, b.total_received,
      EXISTS(SELECT 1 FROM street_aid_donations d WHERE d.owner_id=b.owner_id AND d.cycle_day=b.cycle_day AND d.donor_id=?) AS donated
    FROM street_aid_boxes b WHERE b.cycle_day=? AND b.status='active' ORDER BY b.updated_at DESC LIMIT 12`)
    .bind(userId, day).all<{ owner_id: string; owner_name: string; total_received: number; donated: number }>();
  return { cycleDay: day, dailyCap: 2_000, boxes: rows.results.map((row) => ({ ownerId: row.owner_id, ownerName: row.owner_name, totalReceived: row.total_received, donated: Boolean(row.donated), isMine: row.owner_id === userId })) };
}

const COOP_ROLES = [
  { id: "medical", label: "醫療照護", category: "medical" },
  { id: "finance", label: "資金規劃", category: "finance" },
  { id: "literary", label: "故事宣傳", category: "literary" },
  { id: "hospitality", label: "餐飲支援", category: "hospitality" },
] as const;

async function coopState(db: D1Database, player: PlayerRow) {
  const day = cityCycleDay(); const now = Date.now();
  await db.prepare("INSERT INTO city_coop_projects (cycle_day, status, updated_at) VALUES (?, 'open', ?) ON CONFLICT(cycle_day) DO NOTHING").bind(day, now).run();
  const [project, rows] = await Promise.all([
    db.prepare("SELECT status, completed_at FROM city_coop_projects WHERE cycle_day=?").bind(day).first<{ status: string; completed_at: number | null }>(),
    db.prepare("SELECT role, user_id, player_name FROM city_coop_contributions WHERE cycle_day=?").bind(day).all<{ role: string; user_id: string; player_name: string }>(),
  ]);
  const byRole = new Map(rows.results.map((row) => [row.role, row]));
  const eligible = COOP_ROLES.find((role) => role.category === player.job_category)?.id ?? "";
  return { cycleDay: day, status: project?.status ?? "open", reward: 600, talentExp: 8, eligibleRole: eligible,
    contributed: rows.results.some((row) => row.user_id === player.user_id),
    roles: COOP_ROLES.map((role) => ({ id: role.id, label: role.label, playerName: byRole.get(role.id)?.player_name ?? "" })) };
}

async function reputationState(db: D1Database, player: PlayerRow) {
  const rows = await db.prepare("SELECT faction, points FROM player_reputation WHERE user_id=? ORDER BY points DESC").bind(player.user_id).all<{ faction: string; points: number }>();
  const pointsByFaction = new Map(rows.results.map((row) => [row.faction, row.points]));
  return { factions: REPUTATION_FACTIONS.map((faction) => {
    const points = pointsByFaction.get(faction) ?? 0;
    const rank = points >= 150 ? "城市名望" : points >= 75 ? "值得信任" : points >= 30 ? "熟識" : "陌生";
    return { faction, points, rank, bonusPercent: Math.min(30, Math.floor(points / 50) * 10) };
  }) };
}

async function commissionState(db: D1Database, player: PlayerRow) {
  const day = cityCycleDay();
  const rows = await db.prepare("SELECT commission_id FROM city_commission_claims WHERE user_id=? AND cycle_day=? AND life_version=?")
    .bind(player.user_id, day, player.life_version).all<{ commission_id: string }>();
  const completed = new Set(rows.results.map((row) => row.commission_id));
  return { cycleDay: day, commissions: CITY_COMMISSIONS.filter((commission) => commission.category === player.job_category).map((commission) => ({
    id: commission.id, title: commission.title, detail: commission.detail, location: commission.location, reward: commission.reward,
    faction: commission.faction, completed: completed.has(commission.id),
  })) };
}

async function mysteryState(db: D1Database, userId: string) {
  const rows = await db.prepare("SELECT clue_key FROM mystery_clues WHERE user_id=? ORDER BY found_at").bind(userId).all<{ clue_key: string }>();
  const whispers: Record<string, string> = { address: "有人說，地圖上被塗掉的地址會在雨天浮現。", loan: "銀行深夜偶爾會出現一筆沒有名字的舊帳。", record: "醫院有人看過一份沒有姓名的病歷。", key: "旅店櫃台下的舊鑰匙還沒有對應房號。", company: "停業公司的資料都指向同一棟房子。", map: "一張舊地圖上少了一整個街區。", joker: "賭場裡的人說，鬼牌從來不只是一張牌。" };
  return { found: rows.results.length, total: 7, whispers: rows.results.map((row) => whispers[row.clue_key]).filter(Boolean) };
}

async function contractState(db: D1Database, player: PlayerRow) {
  const day = cityCycleDay();
  const rows = await db.prepare(`SELECT * FROM life_contracts WHERE (creator_id=? OR partner_id=?) AND status IN ('pending','active') ORDER BY updated_at DESC LIMIT 6`)
    .bind(player.user_id, player.user_id).all<LifeContractRow>();
  const contracts = [] as Array<Record<string, unknown>>;
  for (const row of rows.results) {
    if ((row.status === "active" || row.status === "pending") && day > row.expires_day) {
      const token = crypto.randomUUID();
      const expired = await db.prepare(`UPDATE life_contracts SET status='expired', resolution_token=?, updated_at=? WHERE id=? AND status IN ('pending','active') AND expires_day<? RETURNING *`)
        .bind(token, Date.now(), row.id, day).first<LifeContractRow>();
      if (expired) await db.batch([
        db.prepare("UPDATE players SET cash=cash+? WHERE user_id=? AND life_version=?").bind(expired.creator_deposit + expired.stake, expired.creator_id, expired.creator_life_version),
        db.prepare("UPDATE players SET cash=cash+? WHERE user_id=? AND life_version=?").bind(expired.partner_deposit, expired.partner_id, expired.partner_life_version),
      ]);
      continue;
    }
    const mineCreator = row.creator_id === player.user_id;
    contracts.push({ id: row.id, status: row.status, partnerName: mineCreator ? row.partner_name : row.creator_name, isCreator: mineCreator,
      targetPerPlayer: row.target_per_player, stake: row.stake, mineDeposit: mineCreator ? row.creator_deposit : row.partner_deposit,
      partnerDeposit: mineCreator ? row.partner_deposit : row.creator_deposit, expiresDay: row.expires_day });
  }
  return { contracts };
}

async function refreshedGameResponse(db: D1Database, user: AuthUser, message: string, extras: Record<string, unknown> = {}) {
  const player = await db.prepare("SELECT * FROM players WHERE user_id=?").bind(user.userId).first<PlayerRow>();
  if (!player) return json({ message: "找不到玩家資料。" }, 404);
  const [progress, contract, world, transfers, medical, loans, begs, street, aidBoxes, coop, reputation, commissions, mystery, contracts, ledger] = await Promise.all([
    ensureProgress(db, player), activeLoanContract(db, user.userId), multiplayer(db), pendingTransferRequests(db, user.userId),
    pendingMedicalRequests(db, user.userId), pendingLoanRequests(db, user.userId), pendingBegRequests(db, user.userId),
    streetState(db, player), aidBoxState(db, user.userId), coopState(db, player),
    reputationState(db, player), commissionState(db, player), mysteryState(db, user.userId), contractState(db, player), lifeLedgerState(db, user.userId),
  ]);
  return json({ player: serializePlayer(player, progress, contract), message, transferRequests: transfers, medicalRequests: medical, loanRequests: loans, begRequests: begs, street, aidBoxes, coop, reputation, commissions, mystery, contracts, lifeLedger: ledger, ...world, ...extras });
}

async function lifeLedgerState(db: D1Database, userId: string) {
  const rows = await db.prepare(`SELECT title, detail, tone, game_time FROM game_events WHERE user_id=? ORDER BY created_at DESC LIMIT 12`)
    .bind(userId).all<{ title: string; detail: string; tone: "good" | "neutral" | "warn"; game_time: string }>();
  return { entries: rows.results.map((row) => ({ title: row.title, detail: row.detail, tone: row.tone, gameTime: row.game_time })) };
}

async function transferActionResponse(db: D1Database, user: AuthUser, player: PlayerRow, progress: ProgressRow, message: string) {
  const [world, transfers, medicalRequests, loanRequests, loanContract] = await Promise.all([multiplayer(db), pendingTransferRequests(db, user.userId), pendingMedicalRequests(db, user.userId), pendingLoanRequests(db, user.userId), activeLoanContract(db, user.userId)]);
  return json({ player: serializePlayer(player, progress, loanContract), message, transferRequests: transfers, medicalRequests, loanRequests, ...world });
}

async function recordTransferEvent(db: D1Database, senderId: string, senderName: string, title: string, detail: string, tone: "good" | "neutral" | "warn" = "neutral") {
  const current = minuteOfDay(worldMinutes());
  const gameTime = `${String(Math.floor(current / 60)).padStart(2, "0")}:${String(current % 60).padStart(2, "0")}`;
  await db.prepare("INSERT INTO game_events (id, user_id, player_name, room_id, title, detail, tone, game_time, created_at) VALUES (?, ?, ?, 'lobby-01', ?, ?, ?, ?, ?)")
    .bind(crypto.randomUUID(), senderId, senderName.slice(0, 40), title, detail, tone, gameTime, Date.now()).run();
}

function arrestPlayer(player: PlayerRow, crime: string, job: string) {
  const sentence = crimeSentenceMinutesFor(job);
  player.location = "prison";
  player.prison_until = player.elapsed_minutes + sentence;
  player.prison_crime = crime;
  player.action_available_at = 0;
  player.action_label = "服刑中";
  return sentence;
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
const TOURNAMENT_START_DELAY_MS = 5_000;
const TOURNAMENT_ACTION_TIMEOUT_MS = 90_000;
const TOURNAMENT_STARTING_STACK = 100;
const TOURNAMENT_SMALL_BLIND = 5;
const TOURNAMENT_BIG_BLIND = 10;
const BINGO_LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
const randomIndex = (size: number) => Math.floor((crypto.getRandomValues(new Uint32Array(1))[0] / 4_294_967_296) * size);
const randomBingoCard = () => { const pool = Array.from({ length: 25 }, (_, index) => index + 1); const card: number[] = []; while (card.length < 9) card.push(pool.splice(randomIndex(pool.length), 1)[0]); return card; };
const bingoLine = (card: number[], drawn: number[]) => BINGO_LINES.some((line) => line.every((index) => drawn.includes(card[index])));

async function bingoState(db: D1Database, userId: string) {
  await db.prepare(`DELETE FROM casino_bingo_entries WHERE NOT EXISTS (
    SELECT 1 FROM players p WHERE p.user_id=casino_bingo_entries.user_id AND p.life_version=casino_bingo_entries.life_version
      AND p.reset_game_over='' AND p.game_over<>'__resetting__'
  )`).run();
  let state = await db.prepare("SELECT * FROM casino_bingo_state WHERE id='bingo-01'").first<{ round_no: number; status: string; host_user_id: string; entry_fee: number; drawn_numbers: string; next_draw_at: number }>();
  if (!state) { await db.prepare("INSERT INTO casino_bingo_state (id, updated_at) VALUES ('bingo-01', ?)").bind(Date.now()).run(); state = { round_no: 1, status: "lobby", host_user_id: "", entry_fee: BINGO_ENTRY_FEE, drawn_numbers: "[]", next_draw_at: 0 }; }
  if (state.status === "drawing" && state.next_draw_at <= Date.now()) {
    const claimNow = Date.now();
    const claimed = await db.prepare(`UPDATE casino_bingo_state SET next_draw_at=?, updated_at=?
      WHERE id='bingo-01' AND status='drawing' AND round_no=? AND next_draw_at=? RETURNING round_no`)
      .bind(claimNow + 5_000, claimNow, state.round_no, state.next_draw_at).first<{ round_no: number }>();
    if (!claimed) {
      state = await db.prepare("SELECT * FROM casino_bingo_state WHERE id='bingo-01'").first<typeof state>() ?? state;
    } else {
    const drawn = parseCards(state.drawn_numbers).map(Number); const remaining = Array.from({ length: 25 }, (_, index) => index + 1).filter((number) => !drawn.includes(number));
    if (remaining.length) drawn.push(remaining[randomIndex(remaining.length)]);
    const entries = await db.prepare(`SELECT e.user_id, e.player_name, e.card, e.life_version FROM casino_bingo_entries e
      JOIN players p ON p.user_id=e.user_id AND p.life_version=e.life_version
      WHERE e.round_no=? AND p.reset_game_over='' AND p.game_over<>'__resetting__'`).bind(state.round_no).all<{ user_id: string; player_name: string; card: string; life_version: number }>();
    const winners = entries.results.filter((entry) => bingoLine(parseCards(entry.card).map(Number), drawn));
    if (winners.length) {
      const prize = Math.floor((entries.results.length * state.entry_fee) / winners.length);
      await db.batch([db.prepare("UPDATE casino_bingo_state SET status='completed', drawn_numbers=?, next_draw_at=0, updated_at=? WHERE id='bingo-01'").bind(JSON.stringify(drawn), Date.now()), ...winners.map((winner) => db.prepare("UPDATE players SET cash=cash+?, updated_at=MAX(updated_at+1, ?) WHERE user_id=? AND life_version=? AND reset_game_over='' AND game_over<>'__resetting__'").bind(prize, Date.now(), winner.user_id, winner.life_version))]);
    } else await db.prepare("UPDATE casino_bingo_state SET drawn_numbers=?, next_draw_at=?, updated_at=? WHERE id='bingo-01'").bind(JSON.stringify(drawn), Date.now() + 2_000, Date.now()).run();
    state = await db.prepare("SELECT * FROM casino_bingo_state WHERE id='bingo-01'").first<{ round_no: number; status: string; host_user_id: string; entry_fee: number; drawn_numbers: string; next_draw_at: number }>();
    }
  }
  const entries = await db.prepare(`SELECT e.user_id, e.player_name, e.card FROM casino_bingo_entries e
    JOIN players p ON p.user_id=e.user_id AND p.life_version=e.life_version
    WHERE e.round_no=? AND p.reset_game_over='' AND p.game_over<>'__resetting__' ORDER BY e.player_name`).bind(state!.round_no).all<{ user_id: string; player_name: string; card: string }>();
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
      env.DB.prepare("UPDATE players SET cash=cash+?, updated_at=MAX(updated_at+1, ?) WHERE user_id=? AND life_version=? AND reset_game_over='' AND game_over='' AND EXISTS (SELECT 1 FROM casino_bingo_state WHERE id='bingo-01' AND status='lobby') AND EXISTS (SELECT 1 FROM casino_bingo_entries WHERE round_no=? AND user_id=? AND life_version=?)").bind(leavingFee, Date.now(), user.userId, player.life_version, state.roundNo, user.userId, player.life_version),
      env.DB.prepare("DELETE FROM casino_bingo_entries WHERE round_no=? AND user_id=? AND life_version=? AND EXISTS (SELECT 1 FROM casino_bingo_state WHERE id='bingo-01' AND status='lobby')").bind(state.roundNo, user.userId, player.life_version),
      env.DB.prepare("UPDATE casino_bingo_state SET host_user_id=COALESCE((SELECT user_id FROM casino_bingo_entries WHERE round_no=? ORDER BY rowid LIMIT 1), ''), entry_fee=CASE WHEN EXISTS (SELECT 1 FROM casino_bingo_entries WHERE round_no=?) THEN entry_fee ELSE ? END, updated_at=? WHERE id='bingo-01' AND status='lobby'").bind(state.roundNo, state.roundNo, BINGO_ENTRY_FEE, Date.now()),
    ]);
    state = await bingoState(env.DB, user.userId);
    if (state.players.some((entry) => entry.id === user.userId)) return json({ message: "賓果已經開始，無法離開座位。" }, 409);
    const saved = await env.DB.prepare("SELECT * FROM players WHERE user_id=?").bind(user.userId).first<PlayerRow>(); const progress = await ensureProgress(env.DB, saved!);
    return json({ player: serializePlayer(saved!, progress), bingo: state, message: `已離開賓果房間，退還 NT$${leavingFee.toLocaleString()}。` });
  }
  if (state.status === "completed") {
    await env.DB.prepare(`UPDATE casino_bingo_state SET round_no=round_no+1, status='lobby', host_user_id='',
      entry_fee=?, drawn_numbers='[]', next_draw_at=0, updated_at=?
      WHERE id='bingo-01' AND status='completed' AND round_no=? RETURNING round_no`)
      .bind(BINGO_ENTRY_FEE, Date.now(), state.roundNo).first<{ round_no: number }>();
    state = await bingoState(env.DB, user.userId);
  }
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
  let admission: D1Result<unknown>[];
  try {
    admission = await env.DB.batch([
      env.DB.prepare(`INSERT INTO casino_bingo_entries (round_no, user_id, player_name, card, life_version)
        SELECT ?, ?, ?, ?, ? WHERE
          EXISTS (SELECT 1 FROM casino_bingo_state WHERE id='bingo-01' AND round_no=? AND status='lobby')
          AND EXISTS (SELECT 1 FROM players WHERE user_id=? AND life_version=? AND cash>=? AND reset_game_over='' AND game_over='')
          AND (SELECT COUNT(*) FROM casino_bingo_entries WHERE round_no=?)<5
        RETURNING user_id`).bind(state.roundNo, user.userId, user.displayName.slice(0, 40), JSON.stringify(randomBingoCard()), player.life_version, state.roundNo, user.userId, player.life_version, entryFee, state.roundNo),
      env.DB.prepare(`UPDATE players SET cash=cash-?, updated_at=MAX(updated_at+1, ?) WHERE user_id=? AND life_version=? AND cash>=? AND reset_game_over='' AND game_over=''
        AND EXISTS (SELECT 1 FROM casino_bingo_entries WHERE round_no=? AND user_id=? AND life_version=?)
        RETURNING user_id`).bind(entryFee, Date.now(), user.userId, player.life_version, entryFee, state.roundNo, user.userId, player.life_version),
    ]);
  } catch {
    if (hosting) await env.DB.prepare("UPDATE casino_bingo_state SET host_user_id=COALESCE((SELECT user_id FROM casino_bingo_entries WHERE round_no=? ORDER BY rowid LIMIT 1), ''), entry_fee=CASE WHEN EXISTS (SELECT 1 FROM casino_bingo_entries WHERE round_no=?) THEN entry_fee ELSE ? END WHERE id='bingo-01' AND host_user_id=?").bind(state.roundNo, state.roundNo, BINGO_ENTRY_FEE, user.userId).run();
    return json({ message: "賓果房間狀態已變更，沒有扣除報名費。" }, 409);
  }
  if ((admission[0]?.results?.length ?? 0) !== 1 || (admission[1]?.results?.length ?? 0) !== 1) {
    if (hosting) await env.DB.prepare("UPDATE casino_bingo_state SET host_user_id=COALESCE((SELECT user_id FROM casino_bingo_entries WHERE round_no=? ORDER BY rowid LIMIT 1), ''), entry_fee=CASE WHEN EXISTS (SELECT 1 FROM casino_bingo_entries WHERE round_no=?) THEN entry_fee ELSE ? END WHERE id='bingo-01' AND host_user_id=?").bind(state.roundNo, state.roundNo, BINGO_ENTRY_FEE, user.userId).run();
    return json({ message: "賓果房間已滿、現金不足，或本輪狀態剛剛改變；沒有扣除報名費。" }, 409);
  }
  const joinedState = await bingoState(env.DB, user.userId);
  if (!joinedState.players.some((entry) => entry.id === user.userId)) return json({ message: "本輪賓果已滿 5 人，報名費已退回。" }, 409);
  if (joinedState.status === "lobby" && joinedState.players.length >= 2) await env.DB.prepare("UPDATE casino_bingo_state SET status='drawing', next_draw_at=?, updated_at=? WHERE id='bingo-01' AND status='lobby'").bind(Date.now() + 2_000, Date.now()).run();
  const saved = await env.DB.prepare("SELECT * FROM players WHERE user_id=?").bind(user.userId).first<PlayerRow>(); const progress = await ensureProgress(env.DB, saved!);
  return json({ player: serializePlayer(saved!, progress), bingo: await bingoState(env.DB, user.userId), message: joinedState.players.length >= 2 ? "賓果開獎開始！每 2 秒公開一個號碼。" : "已加入賓果，等待另一位玩家加入。" });
}

async function startTournamentRound(db: D1Database, state: TournamentStateRow) {
  const entries = await db.prepare(`SELECT e.user_id, e.player_name, e.life_version FROM casino_tournament_entries e
    JOIN players p ON p.user_id=e.user_id AND p.life_version=e.life_version
    WHERE e.tournament_no=? AND p.reset_game_over='' AND p.game_over<>'__resetting__' ORDER BY e.rowid`)
    .bind(state.round_no).all<{ user_id: string; player_name: string; life_version: number }>();
  if (entries.results.length < 2) return;
  const now = Date.now();
  const roundNo = state.current_round + 1;
  const roundToken = crypto.randomUUID();
  const deck = shuffledDeck();
  const dealerCards = state.game === "blackjack" ? [deck.pop()!, deck.pop()!] : [];
  const hands = entries.results.map((entry, index) => {
    const cards = [deck.pop()!, deck.pop()!];
    const smallBlind = state.game === "poker" && index === 0 ? TOURNAMENT_SMALL_BLIND : 0;
    const bigBlind = state.game === "poker" && index === 1 ? TOURNAMENT_BIG_BLIND : 0;
    return { ...entry, seatNo: index + 1, cards, bet: smallBlind + bigBlind, stack: TOURNAMENT_STARTING_STACK - smallBlind - bigBlind };
  });
  const firstTurn = state.game === "poker" ? (hands[2]?.seatNo ?? hands[0].seatNo) : 0;
  const round = db.prepare(`INSERT OR IGNORE INTO casino_tournament_rounds
    (tournament_no, round_no, game, status, deck, dealer_cards, community_cards, street, current_bet, turn_seat, pot, next_action_at, action_token, updated_at)
    VALUES (?, ?, ?, 'playing', ?, ?, '[]', ?, ?, ?, ?, ?, ?, ?)`)
    .bind(state.round_no, roundNo, state.game, JSON.stringify(deck), JSON.stringify(dealerCards), state.game === "poker" ? "preflop" : "blackjack", state.game === "poker" ? TOURNAMENT_BIG_BLIND : 0, firstTurn, state.game === "poker" ? TOURNAMENT_SMALL_BLIND + TOURNAMENT_BIG_BLIND : 0, now + TOURNAMENT_ACTION_TIMEOUT_MS, roundToken, now);
  const handStatements = hands.map((hand) => db.prepare(`INSERT OR IGNORE INTO casino_tournament_hands
    (tournament_no, round_no, user_id, player_name, seat_no, player_cards, hole_cards, bet, street_bet, stack, status, acted, result, life_version, action_token, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'playing', 0, '', ?, ?, ?)`)
    .bind(state.round_no, roundNo, hand.user_id, hand.player_name, hand.seatNo, state.game === "blackjack" ? JSON.stringify(hand.cards) : "[]", state.game === "poker" ? JSON.stringify(hand.cards) : "[]", hand.bet, hand.bet, hand.stack, hand.life_version, roundToken, now));
  await db.batch([round, ...handStatements, db.prepare("UPDATE casino_tournament_state SET next_round_at=0, updated_at=? WHERE id='tournament-01' AND round_no=? AND current_round=? AND status='playing'").bind(now, state.round_no, state.current_round)]);
}

async function settleTournamentRound(db: D1Database, state: TournamentStateRow, round: TournamentRoundRow, hands: TournamentHandRow[]) {
  const settleNow = Date.now();
  const staleSettlement = round.status === "settling" && round.updated_at <= settleNow - SETTLEMENT_RECOVERY_TIMEOUT_MS;
  const settlingRevision = Math.max(settleNow, round.updated_at + 1);
  const claimed = staleSettlement
    ? await db.prepare("UPDATE casino_tournament_rounds SET updated_at=? WHERE tournament_no=? AND round_no=? AND status='settling' AND updated_at=? RETURNING round_no")
      .bind(settlingRevision, state.round_no, round.round_no, round.updated_at).first<{ round_no: number }>()
    : await db.prepare("UPDATE casino_tournament_rounds SET status='settling', updated_at=? WHERE tournament_no=? AND round_no=? AND status='playing' AND updated_at=? RETURNING round_no")
      .bind(settlingRevision, state.round_no, round.round_no, round.updated_at).first<{ round_no: number }>();
  if (!claimed) return;
  round = { ...round, status: "settling", updated_at: settlingRevision };
  const entries = await db.prepare(`SELECT e.user_id, e.player_name, e.score, e.life_version FROM casino_tournament_entries e
    JOIN players p ON p.user_id=e.user_id AND p.life_version=e.life_version
    WHERE e.tournament_no=? AND p.reset_game_over='' AND p.game_over<>'__resetting__'`)
    .bind(state.round_no).all<{ user_id: string; player_name: string; score: number; life_version: number }>();
  const now = Date.now();
  const points = new Map<string, number>();
  const handResults = new Map<string, string>();
  const dealerCards = parseCards(round.dealer_cards);
  const deck = parseCards(round.deck);
  if (round.game === "blackjack") {
    while (handScore(dealerCards) < 17 && deck.length) dealerCards.push(deck.pop()!);
    const dealerScore = handScore(dealerCards);
    const evaluated = hands.map((hand) => {
      const cards = parseCards(hand.player_cards); const score = handScore(cards); const blackjack = score === 21 && cards.length === 2;
      const outcome = score > 21 ? 0 : dealerScore > 21 || blackjack || score > dealerScore ? 3 : score === dealerScore ? 1 : 0;
      const label = score > 21 ? "爆牌" : outcome === 3 ? "獲勝" : outcome === 1 ? "平手" : "落敗";
      return { hand, score, rank: outcome * 100 + Math.min(score, 21), result: `${cards.join(" ")} · ${score > 21 ? "爆牌" : `${score} 點`} · ${label}` };
    }).sort((left, right) => right.rank - left.rank || right.score - left.score);
    evaluated.forEach((item, index) => {
      const earned = Math.max(1, evaluated.length - index);
      points.set(item.hand.user_id, earned);
      handResults.set(item.hand.user_id, `莊家 ${dealerScore > 21 ? "爆牌" : `${dealerScore} 點`} · ${item.result} · 本局 +${earned} 分`);
    });
  } else {
    const community = parseCards(round.community_cards);
    const evaluated = hands.map((hand) => { const cards = [...parseCards(hand.hole_cards), ...community]; return { hand, evaluation: hand.status === "folded" ? null : bestPokerHand(cards) }; });
    evaluated.sort((left, right) => {
      if (!left.evaluation && !right.evaluation) return 0;
      if (!left.evaluation) return 1;
      if (!right.evaluation) return -1;
      return comparePokerScores(right.evaluation.score, left.evaluation.score);
    });
    evaluated.forEach((item, index) => { const earned = item.evaluation ? Math.max(1, evaluated.length - index) : 0; points.set(item.hand.user_id, earned); handResults.set(item.hand.user_id, item.evaluation ? `${item.evaluation.name} · ${item.evaluation.score.join("-")} · 本局 +${earned} 分` : "本局已棄牌 · 本局 +0 分"); });
  }
  const updates = entries.results.flatMap((entry) => [
    db.prepare("UPDATE casino_tournament_entries SET score=score+?, latest_hand=? WHERE tournament_no=? AND user_id=? AND life_version=?").bind(points.get(entry.user_id) ?? 0, handResults.get(entry.user_id) ?? "未完成本局", state.round_no, entry.user_id, entry.life_version),
    db.prepare("UPDATE casino_tournament_hands SET status='complete', result=?, updated_at=? WHERE tournament_no=? AND round_no=? AND user_id=? AND life_version=?").bind(handResults.get(entry.user_id) ?? "未完成本局", now, state.round_no, round.round_no, entry.user_id, entry.life_version),
  ]);
  // Rebuild totals from the persisted score and this round's points.  Using the
  // round ranking here used to make the fifth round's total look out of order
  // and could hide points that were already earned in earlier rounds.
  const finalScores = entries.results.map((entry) => {
    const roundPoints = points.get(entry.user_id) ?? 0;
    return { ...entry, score: (Number(entry.score) || 0) + roundPoints, points: roundPoints };
  }).sort((left, right) => right.score - left.score || right.points - left.points || left.player_name.localeCompare(right.player_name));
  const resolvedRound = state.current_round + 1;
  const summary = finalScores.map((entry, index) => `${index + 1}.${entry.player_name} 本局+${entry.points}（總分${entry.score}）`).join(" · ");
  const roundUpdate = db.prepare("UPDATE casino_tournament_rounds SET status='completed', deck=?, dealer_cards=?, updated_at=?, next_action_at=0 WHERE tournament_no=? AND round_no=? AND status='settling' AND updated_at=? RETURNING round_no").bind(JSON.stringify(deck), JSON.stringify(dealerCards), now, state.round_no, round.round_no, settlingRevision);
  if (resolvedRound >= state.round_limit) {
    const pool = entries.results.length * state.entry_fee; const shares = finalScores.length === 2 ? [.7, .3] : [.6, .3, .1];
    await db.batch([...updates, roundUpdate, ...finalScores.slice(0, shares.length).map((entry, index) => db.prepare("UPDATE players SET cash=cash+?, updated_at=MAX(updated_at+1, ?) WHERE user_id=? AND life_version=? AND reset_game_over='' AND game_over<>'__resetting__'").bind(Math.floor(pool * shares[index]), now, entry.user_id, entry.life_version)), db.prepare("UPDATE casino_tournament_state SET current_round=?, status='completed', latest_result=?, next_round_at=0, updated_at=? WHERE id='tournament-01' AND round_no=?").bind(resolvedRound, `賽事結束：${finalScores.map((entry, index) => `${index + 1}.${entry.player_name}（${entry.score}分）`).join(" · ")}`, now, state.round_no)]);
  } else await db.batch([...updates, roundUpdate, db.prepare("UPDATE casino_tournament_state SET current_round=?, status='playing', latest_result=?, next_round_at=?, updated_at=? WHERE id='tournament-01' AND round_no=?").bind(resolvedRound, `第 ${resolvedRound} 局完成：${summary}`, now + TOURNAMENT_START_DELAY_MS, now, state.round_no)]);
}

async function advanceTournamentRound(db: D1Database, state: TournamentStateRow) {
  if (state.status !== "playing") return;
  let now = Date.now();
  const round = await db.prepare("SELECT * FROM casino_tournament_rounds WHERE tournament_no=? AND round_no=?").bind(state.round_no, state.current_round + 1).first<TournamentRoundRow>();
  if (!round) { if (state.next_round_at <= now) await startTournamentRound(db, state); return; }
  if (round.status !== "playing") return;
  now = Math.max(now, round.updated_at + 1);
  let hands = (await db.prepare("SELECT * FROM casino_tournament_hands WHERE tournament_no=? AND round_no=? ORDER BY seat_no").bind(state.round_no, round.round_no).all<TournamentHandRow>()).results;
  if (round.game === "blackjack") {
    if (hands.some((hand) => hand.status === "playing" || hand.status === "drawing") && round.next_action_at <= now) {
      await db.prepare("UPDATE casino_tournament_hands SET status='stood', result='逾時自動停牌。', updated_at=? WHERE tournament_no=? AND round_no=? AND status IN ('playing','drawing')").bind(now, state.round_no, round.round_no).run();
      hands = (await db.prepare("SELECT * FROM casino_tournament_hands WHERE tournament_no=? AND round_no=? ORDER BY seat_no").bind(state.round_no, round.round_no).all<TournamentHandRow>()).results;
    }
    if (hands.every((hand) => ["stood", "bust"].includes(hand.status))) await settleTournamentRound(db, state, round, hands);
    return;
  }
  let active = hands.filter((hand) => ["playing", "all_in"].includes(hand.status));
  if (active.length <= 1) { await settleTournamentRound(db, state, round, hands); return; }
  const actionable = active.filter((hand) => hand.status === "playing").sort((left, right) => left.seat_no - right.seat_no);
  if (round.turn_seat < 0) {
    if (round.updated_at > now - TOURNAMENT_ACTION_TIMEOUT_MS) return;
    const lockedSeat = Math.abs(round.turn_seat);
    await db.prepare("UPDATE casino_tournament_rounds SET turn_seat=?, action_token='', next_action_at=?, updated_at=? WHERE tournament_no=? AND round_no=? AND turn_seat=?")
      .bind(lockedSeat, now + TOURNAMENT_ACTION_TIMEOUT_MS, now, state.round_no, round.round_no, -lockedSeat).run();
    return;
  }
  const current = actionable.find((hand) => hand.seat_no === round!.turn_seat);
  if (!current && actionable.length) {
    const next = actionable[0];
    await db.prepare("UPDATE casino_tournament_rounds SET turn_seat=?, next_action_at=?, updated_at=? WHERE tournament_no=? AND round_no=?").bind(next.seat_no, now + TOURNAMENT_ACTION_TIMEOUT_MS, now, state.round_no, round.round_no).run();
    return;
  }
  if (!actionable.length) {
    if (round.street === "river") { await settleTournamentRound(db, state, round, hands); return; }
    const deck = parseCards(round.deck); const community = parseCards(round.community_cards);
    const nextStreet = round.street === "preflop" ? "flop" : round.street === "flop" ? "turn" : "river";
    const cardsToDeal = nextStreet === "flop" ? 3 : 1;
    for (let index = 0; index < cardsToDeal; index += 1) community.push(deck.pop()!);
    await db.batch([
      db.prepare("UPDATE casino_tournament_hands SET street_bet=0, acted=0, updated_at=? WHERE tournament_no=? AND round_no=? AND status IN ('playing','all_in')").bind(now, state.round_no, round.round_no),
      db.prepare("UPDATE casino_tournament_rounds SET deck=?, community_cards=?, street=?, current_bet=0, turn_seat=0, next_action_at=?, updated_at=? WHERE tournament_no=? AND round_no=?").bind(JSON.stringify(deck), JSON.stringify(community), nextStreet, now + TOURNAMENT_ACTION_TIMEOUT_MS, now, state.round_no, round.round_no),
    ]);
    return advanceTournamentRound(db, state);
  }
  if (!current) return;
  if (round.next_action_at <= now) {
    await db.prepare("UPDATE casino_tournament_hands SET status='folded', acted=1, result='逾時自動棄牌。', updated_at=? WHERE tournament_no=? AND round_no=? AND user_id=? AND status='playing'").bind(now, state.round_no, round.round_no, current.user_id).run();
    return advanceTournamentRound(db, state);
  }
  if (!actionable.every((hand) => hand.acted && hand.street_bet === round!.current_bet)) {
    if (current.acted) {
      const ordered = actionable;
      const next = ordered.find((hand) => hand.seat_no > current.seat_no) ?? ordered[0];
      await db.prepare("UPDATE casino_tournament_rounds SET turn_seat=?, next_action_at=?, updated_at=? WHERE tournament_no=? AND round_no=?").bind(next.seat_no, now + TOURNAMENT_ACTION_TIMEOUT_MS, now, state.round_no, round.round_no).run();
    }
    return;
  }
  if (round.street === "river") { await settleTournamentRound(db, state, round, hands); return; }
  const deck = parseCards(round.deck); const community = parseCards(round.community_cards);
  const nextStreet = round.street === "preflop" ? "flop" : round.street === "flop" ? "turn" : "river";
  const cardsToDeal = nextStreet === "flop" ? 3 : 1;
  for (let index = 0; index < cardsToDeal; index += 1) community.push(deck.pop()!);
  active = hands.filter((hand) => ["playing", "all_in"].includes(hand.status)).sort((left, right) => left.seat_no - right.seat_no);
  const nextActionable = active.find((hand) => hand.status === "playing");
  await db.batch([
    db.prepare("UPDATE casino_tournament_hands SET street_bet=0, acted=0, updated_at=? WHERE tournament_no=? AND round_no=? AND status IN ('playing','all_in')").bind(now, state.round_no, round.round_no),
    db.prepare("UPDATE casino_tournament_rounds SET deck=?, community_cards=?, street=?, current_bet=0, turn_seat=?, next_action_at=?, updated_at=? WHERE tournament_no=? AND round_no=?").bind(JSON.stringify(deck), JSON.stringify(community), nextStreet, nextActionable?.seat_no ?? 0, now + TOURNAMENT_ACTION_TIMEOUT_MS, now, state.round_no, round.round_no),
  ]);
}

async function tournamentState(db: D1Database, userId: string) {
  await db.prepare(`DELETE FROM casino_tournament_entries WHERE NOT EXISTS (
    SELECT 1 FROM players p WHERE p.user_id=casino_tournament_entries.user_id AND p.life_version=casino_tournament_entries.life_version
      AND p.reset_game_over='' AND p.game_over<>'__resetting__'
  )`).run();
  let state = await db.prepare("SELECT * FROM casino_tournament_state WHERE id='tournament-01'").first<TournamentStateRow>();
  if (!state) { await db.prepare("INSERT INTO casino_tournament_state (id, updated_at) VALUES ('tournament-01', ?)").bind(Date.now()).run(); state = { round_no: 1, current_round: 0, game: "blackjack", status: "lobby", host_user_id: "", entry_fee: TOURNAMENT_ENTRY_FEE, round_limit: TOURNAMENT_ROUNDS, next_round_at: 0, latest_result: "" }; }
  const staleSettling = await db.prepare(`SELECT round_no FROM casino_tournament_rounds
    WHERE tournament_no=? AND status='settling' AND updated_at<? ORDER BY round_no LIMIT 1`)
    .bind(state.round_no, Date.now() - SETTLEMENT_RECOVERY_TIMEOUT_MS).first<{ round_no: number }>();
  if (staleSettling && state.status === "playing") {
    const staleRound = await db.prepare("SELECT * FROM casino_tournament_rounds WHERE tournament_no=? AND round_no=?").bind(state.round_no, staleSettling.round_no).first<TournamentRoundRow>();
    const staleHands = staleRound ? (await db.prepare("SELECT * FROM casino_tournament_hands WHERE tournament_no=? AND round_no=? ORDER BY seat_no").bind(state.round_no, staleSettling.round_no).all<TournamentHandRow>()).results : [];
    if (staleRound) await settleTournamentRound(db, state, staleRound, staleHands);
    state = await db.prepare("SELECT * FROM casino_tournament_state WHERE id='tournament-01'").first<TournamentStateRow>() ?? state;
  }
  await advanceTournamentRound(db, state);
  state = await db.prepare("SELECT * FROM casino_tournament_state WHERE id='tournament-01'").first<TournamentStateRow>() ?? state;
  const entries = await db.prepare(`SELECT e.user_id, e.player_name, e.score, e.latest_hand, e.life_version FROM casino_tournament_entries e
    JOIN players p ON p.user_id=e.user_id AND p.life_version=e.life_version
    WHERE e.tournament_no=? AND p.reset_game_over='' AND p.game_over<>'__resetting__' ORDER BY e.score DESC, e.player_name`)
    .bind(state.round_no).all<{ user_id: string; player_name: string; score: number; latest_hand: string; life_version: number }>();
  const targetRound = state.status === "completed" ? Math.max(1, state.current_round) : state.current_round + 1;
  const round = await db.prepare("SELECT * FROM casino_tournament_rounds WHERE tournament_no=? AND round_no=?").bind(state.round_no, targetRound).first<TournamentRoundRow>();
  const hands = round ? (await db.prepare(`SELECT h.* FROM casino_tournament_hands h JOIN players p ON p.user_id=h.user_id AND p.life_version=h.life_version
    WHERE h.tournament_no=? AND h.round_no=? AND p.reset_game_over='' AND p.game_over<>'__resetting__' ORDER BY h.seat_no`).bind(state.round_no, round.round_no).all<TournamentHandRow>()).results : [];
  const own = hands.find((hand) => hand.user_id === userId);
  const dealerCards = round ? parseCards(round.dealer_cards) : [];
  const visibleDealerCards = round?.game === "blackjack" && round.status === "playing" && dealerCards.length > 1 ? [dealerCards[0], "🂠"] : dealerCards;
  const viewRound = round ? { roundNo: round.round_no, game: round.game, status: round.status, dealerCards: visibleDealerCards, dealerScore: round.status === "completed" ? handScore(dealerCards) : null, communityCards: parseCards(round.community_cards), street: round.street, currentBet: round.current_bet, turnSeat: round.turn_seat, pot: round.pot, nextActionAt: round.next_action_at } : null;
  return {
    hostUserId: state.host_user_id, entryFee: state.entry_fee, capacity: 5, game: state.game, status: state.status, tournamentNo: state.round_no, currentRound: state.current_round, roundLimit: state.round_limit, nextRoundAt: state.next_round_at, latestResult: state.latest_result, round: viewRound,
    hand: own ? { playerCards: parseCards(own.player_cards), holeCards: parseCards(own.hole_cards), bet: own.bet, streetBet: own.street_bet, stack: own.stack, status: own.status, result: own.result, isTurn: Boolean(round?.game === "poker" && round.status === "playing" && own.status === "playing" && own.seat_no === round.turn_seat) } : null,
    players: entries.results.map((entry) => { const hand = hands.find((item) => item.user_id === entry.user_id); const playerCards = hand ? parseCards(hand.player_cards) : []; const cards = round?.game === "poker" && round.status === "playing" && entry.user_id !== userId ? (hand ? ["🂠", "🂠"] : []) : hand ? parseCards(round?.game === "poker" ? hand.hole_cards : hand.player_cards) : []; return { id: entry.user_id, displayName: entry.player_name, score: entry.score, latestHand: entry.latest_hand, cards, blackjackScore: round?.game === "blackjack" && hand ? handScore(playerCards) : null, status: hand?.status ?? "waiting", bet: hand?.bet ?? 0, streetBet: hand?.street_bet ?? 0, stack: hand?.stack ?? 0, seatNo: hand?.seat_no ?? 0, isTurn: Boolean(round?.game === "poker" && round.status === "playing" && hand?.status === "playing" && hand.seat_no === round.turn_seat), result: hand?.result ?? "", isMine: entry.user_id === userId }; }),
  };
}

async function tournamentAction(request: Request, env: Env) {
  const user = await identity(request, env.DB); if (!user || !env.DB) return json({ message: "請先登入才能參加錦標賽。" }, 401);
  await ensureSchemaOnce(env.DB); const player = await upsertPlayer(env.DB, user, true);
  if (!player || player.location !== "casino" || player.game_over) return json({ message: "請先前往賭場，並確認人生仍在進行。" }, 400);
  const body = await request.json() as { action?: string; game?: string; entryFee?: number; amount?: number };
  const gameplayActions = ["hit", "stand", "check", "call", "raise", "all_in", "fold"];
  if (!body.action || (!["join", "leave", "start", ...gameplayActions].includes(body.action))) return json({ message: "未知的錦標賽行動。" }, 400);
  if (body.action === "join" && !["blackjack", "poker"].includes(body.game || "")) return json({ message: "請選擇二十一點或德州撲克錦標賽。" }, 400);
  let state = await tournamentState(env.DB, user.userId);
  if (body.action === "leave") {
    if (state.status !== "lobby") return json({ message: "錦標賽已經開始，現在不能離開座位。" }, 409);
    if (!state.players.some((entry) => entry.id === user.userId)) return json({ message: "你不在這個錦標賽房間。" }, 409);
    const leavingFee = state.entryFee;
    await env.DB.batch([
      env.DB.prepare("UPDATE players SET cash=cash+?, updated_at=MAX(updated_at+1, ?) WHERE user_id=? AND life_version=? AND reset_game_over='' AND game_over='' AND EXISTS (SELECT 1 FROM casino_tournament_state WHERE id='tournament-01' AND status='lobby') AND EXISTS (SELECT 1 FROM casino_tournament_entries WHERE tournament_no=? AND user_id=? AND life_version=?)").bind(leavingFee, Date.now(), user.userId, player.life_version, state.tournamentNo, user.userId, player.life_version),
      env.DB.prepare("DELETE FROM casino_tournament_entries WHERE tournament_no=? AND user_id=? AND life_version=? AND EXISTS (SELECT 1 FROM casino_tournament_state WHERE id='tournament-01' AND status='lobby')").bind(state.tournamentNo, user.userId, player.life_version),
      env.DB.prepare("UPDATE casino_tournament_state SET host_user_id=COALESCE((SELECT user_id FROM casino_tournament_entries WHERE tournament_no=? ORDER BY rowid LIMIT 1), ''), game=CASE WHEN EXISTS (SELECT 1 FROM casino_tournament_entries WHERE tournament_no=?) THEN game ELSE 'blackjack' END, entry_fee=CASE WHEN EXISTS (SELECT 1 FROM casino_tournament_entries WHERE tournament_no=?) THEN entry_fee ELSE ? END, updated_at=? WHERE id='tournament-01' AND status='lobby'").bind(state.tournamentNo, state.tournamentNo, state.tournamentNo, TOURNAMENT_ENTRY_FEE, Date.now()),
    ]);
    state = await tournamentState(env.DB, user.userId);
    if (state.players.some((entry) => entry.id === user.userId)) return json({ message: "錦標賽已經開始，無法離開座位。" }, 409);
    const saved = await env.DB.prepare("SELECT * FROM players WHERE user_id=?").bind(user.userId).first<PlayerRow>(); const progress = await ensureProgress(env.DB, saved!);
    return json({ player: serializePlayer(saved!, progress), tournament: state, message: `已離開錦標賽，退還 NT$${leavingFee.toLocaleString()}。` });
  }
  if (body.action === "start") {
    if (state.status !== "lobby") return json({ message: "這場錦標賽已經開始或已結束。" }, 409);
    if (state.hostUserId !== user.userId) return json({ message: "只有開房的玩家可以開始錦標賽。" }, 403);
    if (state.players.length < 2) return json({ message: "至少需要 2 位玩家加入後才能開始。" }, 409);
    const now = Date.now();
    await env.DB.prepare("UPDATE casino_tournament_state SET status='playing', next_round_at=?, updated_at=? WHERE id='tournament-01' AND status='lobby' AND host_user_id=?").bind(now, now, user.userId).run();
    state = await tournamentState(env.DB, user.userId);
    if (state.status !== "playing") return json({ message: "錦標賽尚未成功開始，請重新整理後再試。" }, 409);
    const saved = await env.DB.prepare("SELECT * FROM players WHERE user_id=?").bind(user.userId).first<PlayerRow>(); const progress = await ensureProgress(env.DB, saved!);
    return json({ player: serializePlayer(saved!, progress), tournament: state, message: "房主已開始錦標賽，第一局牌局已開桌。" });
  }
  if (body.action === "join") {
    if (state.status === "completed") {
      await env.DB.prepare(`UPDATE casino_tournament_state SET round_no=round_no+1, current_round=0, game=?,
        status='lobby', host_user_id='', entry_fee=?, round_limit=?, next_round_at=0, latest_result='', updated_at=?
        WHERE id='tournament-01' AND status='completed' AND round_no=? RETURNING round_no`)
        .bind(body.game, TOURNAMENT_ENTRY_FEE, TOURNAMENT_ROUNDS, Date.now(), state.tournamentNo).first<{ round_no: number }>();
      state = await tournamentState(env.DB, user.userId);
    }
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
    let admission: D1Result<unknown>[];
    try {
      admission = await env.DB.batch([
        env.DB.prepare(`INSERT INTO casino_tournament_entries (tournament_no, user_id, player_name, life_version)
          SELECT ?, ?, ?, ? WHERE
            EXISTS (SELECT 1 FROM casino_tournament_state WHERE id='tournament-01' AND round_no=? AND status='lobby')
            AND EXISTS (SELECT 1 FROM players WHERE user_id=? AND life_version=? AND cash>=? AND reset_game_over='' AND game_over='')
            AND (SELECT COUNT(*) FROM casino_tournament_entries WHERE tournament_no=?)<5
          RETURNING user_id`).bind(state.tournamentNo, user.userId, user.displayName.slice(0, 40), player.life_version, state.tournamentNo, user.userId, player.life_version, entryFee, state.tournamentNo),
        env.DB.prepare(`UPDATE players SET cash=cash-?, updated_at=MAX(updated_at+1, ?) WHERE user_id=? AND life_version=? AND cash>=? AND reset_game_over='' AND game_over=''
          AND EXISTS (SELECT 1 FROM casino_tournament_entries WHERE tournament_no=? AND user_id=? AND life_version=?)
          RETURNING user_id`).bind(entryFee, Date.now(), user.userId, player.life_version, entryFee, state.tournamentNo, user.userId, player.life_version),
      ]);
    } catch {
      if (hosting) await env.DB.prepare("UPDATE casino_tournament_state SET host_user_id=COALESCE((SELECT user_id FROM casino_tournament_entries WHERE tournament_no=? ORDER BY rowid LIMIT 1), ''), game=CASE WHEN EXISTS (SELECT 1 FROM casino_tournament_entries WHERE tournament_no=?) THEN game ELSE 'blackjack' END, entry_fee=CASE WHEN EXISTS (SELECT 1 FROM casino_tournament_entries WHERE tournament_no=?) THEN entry_fee ELSE ? END WHERE id='tournament-01' AND host_user_id=?").bind(state.tournamentNo, state.tournamentNo, state.tournamentNo, TOURNAMENT_ENTRY_FEE, user.userId).run();
      return json({ message: "錦標賽房間狀態已變更，沒有扣除報名費。" }, 409);
    }
    if ((admission[0]?.results?.length ?? 0) !== 1 || (admission[1]?.results?.length ?? 0) !== 1) {
      if (hosting) await env.DB.prepare("UPDATE casino_tournament_state SET host_user_id=COALESCE((SELECT user_id FROM casino_tournament_entries WHERE tournament_no=? ORDER BY rowid LIMIT 1), ''), game=CASE WHEN EXISTS (SELECT 1 FROM casino_tournament_entries WHERE tournament_no=?) THEN game ELSE 'blackjack' END, entry_fee=CASE WHEN EXISTS (SELECT 1 FROM casino_tournament_entries WHERE tournament_no=?) THEN entry_fee ELSE ? END WHERE id='tournament-01' AND host_user_id=?").bind(state.tournamentNo, state.tournamentNo, state.tournamentNo, TOURNAMENT_ENTRY_FEE, user.userId).run();
      return json({ message: "錦標賽已滿、現金不足，或房間狀態剛剛改變；沒有扣除報名費。" }, 409);
    }
    const joinedState = await tournamentState(env.DB, user.userId);
    if (!joinedState.players.some((entry) => entry.id === user.userId)) return json({ message: "本場錦標賽已滿 5 人，報名費已退回。" }, 409);
    const saved = await env.DB.prepare("SELECT * FROM players WHERE user_id=?").bind(user.userId).first<PlayerRow>(); const progress = await ensureProgress(env.DB, saved!);
    return json({ player: serializePlayer(saved!, progress), tournament: joinedState, message: joinedState.players.length >= 2 ? "已滿足開賽條件，請房主按開始；每局都要實際操作牌局。" : "報名完成，等待至少一位玩家加入。" });
  }
  const dbState = await env.DB.prepare("SELECT * FROM casino_tournament_state WHERE id='tournament-01'").first<TournamentStateRow>();
  if (!dbState || dbState.status !== "playing") return json({ message: "目前沒有進行中的錦標賽牌局。" }, 409);
  const round = await env.DB.prepare("SELECT * FROM casino_tournament_rounds WHERE tournament_no=? AND round_no=?").bind(dbState.round_no, dbState.current_round + 1).first<TournamentRoundRow>();
  const hand = round ? await env.DB.prepare("SELECT * FROM casino_tournament_hands WHERE tournament_no=? AND round_no=? AND user_id=? AND life_version=?").bind(dbState.round_no, round.round_no, user.userId, player.life_version).first<TournamentHandRow>() : null;
  if (!round || !hand || round.status !== "playing") return json({ message: "下一局牌局尚未開桌，請稍候。" }, 409);
  const now = Date.now();
  if (round.game === "blackjack") {
    if (!(body.action === "hit" || body.action === "stand")) return json({ message: "二十一點只能選擇要牌或停牌。" }, 400);
    if (hand.status !== "playing") return json({ message: "你已完成這局，等待其他玩家。" }, 409);
    if (body.action === "hit") {
      const latestRound = await env.DB.prepare("SELECT * FROM casino_tournament_rounds WHERE tournament_no=? AND round_no=?").bind(dbState.round_no, round.round_no).first<TournamentRoundRow>();
      const deck = parseCards(latestRound?.deck ?? "[]"); const cards = parseCards(hand.player_cards); const nextCard = deck.pop();
      if (!nextCard || !latestRound) return json({ message: "牌堆已用盡，請等待結算。" }, 409);
      cards.push(nextCard); const score = handScore(cards); const status = score > 21 ? "bust" : score === 21 ? "stood" : "playing"; const result = score > 21 ? "要牌後爆牌。" : score === 21 ? "21 點，自動停牌。" : "";
      const actionToken = crypto.randomUUID();
      const actionRevision = Math.max(Date.now(), hand.updated_at + 1, latestRound.updated_at + 1);
      const hit = await env.DB.batch([
        env.DB.prepare(`UPDATE casino_tournament_rounds SET deck=?, next_action_at=?, action_token=?, updated_at=?
          WHERE tournament_no=? AND round_no=? AND status='playing' AND updated_at=? AND EXISTS (
            SELECT 1 FROM casino_tournament_hands WHERE tournament_no=? AND round_no=? AND user_id=? AND life_version=? AND status='playing' AND updated_at=?
          ) RETURNING round_no`).bind(JSON.stringify(deck), now + TOURNAMENT_ACTION_TIMEOUT_MS, actionToken, actionRevision,
            dbState.round_no, round.round_no, latestRound.updated_at, dbState.round_no, round.round_no, user.userId, player.life_version, hand.updated_at),
        env.DB.prepare(`UPDATE casino_tournament_hands SET player_cards=?, status=?, result=?, action_token=?, updated_at=?
          WHERE tournament_no=? AND round_no=? AND user_id=? AND life_version=? AND status='playing' AND updated_at=?
            AND EXISTS (SELECT 1 FROM casino_tournament_rounds WHERE tournament_no=? AND round_no=? AND action_token=? AND updated_at=?)
          RETURNING user_id`).bind(JSON.stringify(cards), status, result, actionToken, actionRevision, dbState.round_no,
            round.round_no, user.userId, player.life_version, hand.updated_at, dbState.round_no, round.round_no, actionToken, actionRevision),
      ]);
      if ((hit[0]?.results?.length ?? 0) !== 1 || (hit[1]?.results?.length ?? 0) !== 1) return json({ message: "另一位玩家剛完成要牌，請重新整理後再試。" }, 409);
    } else {
      const stoodRevision = Math.max(now, hand.updated_at + 1);
      const stood = await env.DB.prepare("UPDATE casino_tournament_hands SET status='stood', result='主動停牌。', updated_at=? WHERE tournament_no=? AND round_no=? AND user_id=? AND life_version=? AND status='playing' AND updated_at=? RETURNING user_id").bind(stoodRevision, dbState.round_no, round.round_no, user.userId, player.life_version, hand.updated_at).first<{ user_id: string }>();
      if (!stood) return json({ message: "這次停牌已被處理，請重新整理。" }, 409);
    }
  } else {
    if (!(body.action === "check" || body.action === "call" || body.action === "raise" || body.action === "all_in" || body.action === "fold")) return json({ message: "德州撲克請選擇過牌、跟注、加注、全押或棄牌。" }, 400);
    if (hand.status !== "playing" || hand.seat_no !== round.turn_seat) return json({ message: hand.status !== "playing" ? "你已完成這局，等待其他玩家。" : `目前輪到 ${round.turn_seat} 號玩家。` }, 409);
    const callAmount = Math.max(0, round.current_bet - hand.street_bet);
    if (body.action === "check" && callAmount > 0) return json({ message: "目前有人下注，請跟注、加注或棄牌。" }, 409);
    if (body.action === "call" && callAmount === 0) return json({ message: "目前沒有需要跟注的金額，請選擇過牌。" }, 409);
    const raiseBy = body.action === "raise" ? Number(body.amount) : 0;
    if (body.action === "raise" && (!Number.isSafeInteger(raiseBy) || raiseBy < 10)) return json({ message: "加注至少 10 籌碼。" }, 400);
    const plannedAdded = body.action === "all_in" ? hand.stack : body.action === "call" || body.action === "raise" ? callAmount + raiseBy : 0;
    if (body.action === "all_in" && hand.stack <= 0) return json({ message: "你的籌碼已經全押。" }, 409);
    if (hand.stack < plannedAdded) return json({ message: "籌碼不足以完成這個動作，請選擇全押、較小的加注或棄牌。" }, 409);
    const roundClaimRevision = Math.max(now, round.updated_at + 1);
    const claimedRound = await env.DB.prepare(`UPDATE casino_tournament_rounds SET turn_seat=?, updated_at=?
      WHERE tournament_no=? AND round_no=? AND status='playing' AND turn_seat=? AND updated_at=? RETURNING round_no`)
      .bind(-hand.seat_no, roundClaimRevision, dbState.round_no, round.round_no, hand.seat_no, round.updated_at).first<{ round_no: number }>();
    if (!claimedRound) return json({ message: "這個回合已被處理，請重新整理牌桌。" }, 409);
    const releaseRound = async () => {
      await env.DB!.prepare("UPDATE casino_tournament_rounds SET turn_seat=?, updated_at=? WHERE tournament_no=? AND round_no=? AND turn_seat=?")
        .bind(hand.seat_no, Math.max(Date.now(), roundClaimRevision + 1), dbState.round_no, round.round_no, -hand.seat_no).run();
    };
    const added = plannedAdded;
    const nextStreetBet = hand.street_bet + added;
    const nextBet = body.action === "all_in" ? Math.max(round.current_bet, nextStreetBet) : round.current_bet + (body.action === "raise" ? raiseBy : 0);
    const raised = nextBet > round.current_bet;
    const handRevision = roundClaimRevision + 1;
    const handStatement = body.action === "fold"
      ? env.DB.prepare(`UPDATE casino_tournament_hands SET status='folded', acted=1, result='本局已棄牌。', updated_at=?
          WHERE tournament_no=? AND round_no=? AND user_id=? AND status='playing'
            AND EXISTS (SELECT 1 FROM casino_tournament_rounds WHERE tournament_no=? AND round_no=? AND turn_seat=? AND updated_at=?) RETURNING user_id`)
        .bind(handRevision, dbState.round_no, round.round_no, user.userId, dbState.round_no, round.round_no, -hand.seat_no, roundClaimRevision)
      : body.action === "all_in"
        ? env.DB.prepare(`UPDATE casino_tournament_hands SET stack=0, bet=bet+?, street_bet=street_bet+?, status='all_in', acted=1, result='已全押，等待攤牌。', updated_at=?
            WHERE tournament_no=? AND round_no=? AND user_id=? AND status='playing'
              AND EXISTS (SELECT 1 FROM casino_tournament_rounds WHERE tournament_no=? AND round_no=? AND turn_seat=? AND updated_at=?) RETURNING user_id`)
          .bind(added, added, handRevision, dbState.round_no, round.round_no, user.userId, dbState.round_no, round.round_no, -hand.seat_no, roundClaimRevision)
        : env.DB.prepare(`UPDATE casino_tournament_hands SET stack=stack-?, bet=bet+?, street_bet=street_bet+?, acted=1, updated_at=?
            WHERE tournament_no=? AND round_no=? AND user_id=? AND status='playing'
              AND EXISTS (SELECT 1 FROM casino_tournament_rounds WHERE tournament_no=? AND round_no=? AND turn_seat=? AND updated_at=?) RETURNING user_id`)
          .bind(added, added, added, handRevision, dbState.round_no, round.round_no, user.userId, dbState.round_no, round.round_no, -hand.seat_no, roundClaimRevision);
    const actionStatements: D1PreparedStatement[] = [handStatement];
    if (raised) actionStatements.push(env.DB.prepare(`UPDATE casino_tournament_hands SET acted=0
      WHERE tournament_no=? AND round_no=? AND status='playing' AND user_id<>?
        AND EXISTS (SELECT 1 FROM casino_tournament_hands WHERE tournament_no=? AND round_no=? AND user_id=? AND updated_at=?)`)
      .bind(dbState.round_no, round.round_no, user.userId, dbState.round_no, round.round_no, user.userId, handRevision));
    const finishedAt = handRevision + 1;
    actionStatements.push(env.DB.prepare(`UPDATE casino_tournament_rounds SET current_bet=?, pot=pot+?, turn_seat=?, next_action_at=?, updated_at=?
      WHERE tournament_no=? AND round_no=? AND status='playing' AND turn_seat=? AND updated_at=?
        AND EXISTS (SELECT 1 FROM casino_tournament_hands WHERE tournament_no=? AND round_no=? AND user_id=? AND updated_at=?) RETURNING round_no`)
      .bind(nextBet, added, hand.seat_no, now + TOURNAMENT_ACTION_TIMEOUT_MS, finishedAt, dbState.round_no, round.round_no,
        -hand.seat_no, roundClaimRevision, dbState.round_no, round.round_no, user.userId, handRevision));
    const settledAction = await env.DB.batch(actionStatements);
    if ((settledAction[0]?.results?.length ?? 0) !== 1 || (settledAction[settledAction.length - 1]?.results?.length ?? 0) !== 1) {
      await releaseRound();
      return json({ message: "手牌狀態已變更，這次操作沒有生效。" }, 409);
    }
  }
  await advanceTournamentRound(env.DB, dbState);
  const saved = await env.DB.prepare("SELECT * FROM players WHERE user_id=?").bind(user.userId).first<PlayerRow>(); const progress = await ensureProgress(env.DB, saved!);
  return json({ player: serializePlayer(saved!, progress), tournament: await tournamentState(env.DB, user.userId), message: body.action === "hit" ? "已要牌。" : body.action === "stand" ? "已停牌，等待其他玩家完成。" : "牌局操作已完成。" });
}

const ACTIVE_CASINO_STATUSES = "('seated','waiting','dealing','playing','drawing','stood','settling')";
// The shared clock advances one game hour per real minute, so six game hours are six real minutes.
const IDLE_CASINO_SEAT_TIMEOUT_MS = 6 * 60 * 1000;
const SETTLEMENT_RECOVERY_TIMEOUT_MS = 5 * 60 * 1000;

async function expireIdleBlackjackSeats(db: D1Database) {
  await db.prepare("UPDATE casino_hands SET status='expired', result='超過 6 個遊戲小時未下注，已自動離開座位。', seat_no=NULL, reveal_at=0 WHERE status='seated' AND updated_at<?")
    .bind(Date.now() - IDLE_CASINO_SEAT_TIMEOUT_MS).run();
}

async function revealReadyCasinoRound(db: D1Database) {
  const now = Date.now();
  const ready = await db.prepare(`SELECT h.* FROM casino_hands h
    JOIN players p ON p.user_id=h.user_id AND p.life_version=h.life_version
    WHERE h.status='waiting' AND h.reveal_at>0 AND h.reveal_at<=?
      AND p.reset_game_over='' AND p.game_over<>'__resetting__'
    ORDER BY h.seat_no`).bind(now).all<CasinoRow>();
  if (!ready.results.length) return;
  const deck = shuffledDeck();
  const roundToken = crypto.randomUUID();
  const hands = new Map<string, string[]>();
  ready.results.forEach((row) => hands.set(row.user_id, [deck.pop()!]));
  const dealerCards = [deck.pop()!];
  ready.results.forEach((row) => hands.get(row.user_id)!.push(deck.pop()!));
  dealerCards.push(deck.pop()!);
  await db.batch([
    db.prepare(`INSERT INTO casino_table_state (id, deck, round_token, action_token, updated_at)
      SELECT 'table-01', ?, ?, ?, ? WHERE EXISTS (
        SELECT 1 FROM casino_hands WHERE user_id=? AND life_version=? AND status='waiting' AND deal_token=? AND reveal_at<=?
      ) ON CONFLICT(id) DO UPDATE SET deck=excluded.deck, round_token=excluded.round_token,
        action_token=excluded.action_token, updated_at=excluded.updated_at
      WHERE EXISTS (SELECT 1 FROM casino_hands WHERE user_id=? AND life_version=? AND status='waiting' AND deal_token=? AND reveal_at<=?)
      RETURNING id`).bind(JSON.stringify(deck), roundToken, roundToken, now,
        ready.results[0].user_id, ready.results[0].life_version, ready.results[0].deal_token, now,
        ready.results[0].user_id, ready.results[0].life_version, ready.results[0].deal_token, now),
    ...ready.results.map((row) => db.prepare(`UPDATE casino_hands SET player_cards=?, dealer_cards=?, status='playing',
      reveal_at=0, updated_at=?, deal_token=? WHERE user_id=? AND life_version=? AND status='waiting' AND deal_token=?
        AND EXISTS (SELECT 1 FROM casino_table_state WHERE id='table-01' AND round_token=?)
        AND EXISTS (SELECT 1 FROM players WHERE user_id=? AND life_version=? AND reset_game_over='' AND game_over<>'__resetting__')`)
      .bind(JSON.stringify(hands.get(row.user_id)), JSON.stringify(dealerCards), now, roundToken,
        row.user_id, row.life_version, row.deal_token, roundToken, row.user_id, row.life_version)),
  ]);
}

async function casinoState(db: D1Database, userId: string) {
  await resolveCasinoRoundIfReady(db);
  let [seats, own] = await Promise.all([
    db.prepare(`SELECT h.* FROM casino_hands h JOIN players p ON p.user_id=h.user_id AND p.life_version=h.life_version
      WHERE h.status IN ${ACTIVE_CASINO_STATUSES} AND h.seat_no IS NOT NULL AND p.reset_game_over='' AND p.game_over<>'__resetting__' ORDER BY h.seat_no LIMIT 5`).all<CasinoRow>(),
    db.prepare("SELECT h.* FROM casino_hands h JOIN players p ON p.user_id=h.user_id AND p.life_version=h.life_version WHERE h.user_id=?").bind(userId).first<CasinoRow>(),
  ]);
  const now = Date.now();
  const needsIdleExpiry = seats.results.some((seat) => seat.status === "seated" && seat.updated_at < now - IDLE_CASINO_SEAT_TIMEOUT_MS);
  const needsRoundReveal = seats.results.some((seat) => seat.status === "waiting" && seat.reveal_at > 0 && seat.reveal_at <= now);
  const roundCutoff = now - SETTLEMENT_RECOVERY_TIMEOUT_MS;
  const needsSettlingRecovery = seats.results.some((seat) => seat.status === "settling" && seat.updated_at < roundCutoff);
  const needsRoundExpiry = seats.results.some((seat) => ["waiting", "dealing", "playing", "drawing"].includes(seat.status) && seat.updated_at < roundCutoff);
  if (needsIdleExpiry || needsRoundReveal || needsRoundExpiry || needsSettlingRecovery) {
    if (needsIdleExpiry) await expireIdleBlackjackSeats(db);
    if (needsRoundReveal) await revealReadyCasinoRound(db);
    if (needsRoundExpiry) await db.prepare("UPDATE casino_hands SET status='expired', seat_no=NULL, reveal_at=0 WHERE status IN ('waiting','dealing','playing','drawing') AND updated_at<?").bind(roundCutoff).run();
    // A worker can be terminated after claiming settlement.  Re-enter the
    // deterministic payout path; the hand/table updates are one batch, so a
    // stale settling row means that batch did not commit yet.
    if (needsSettlingRecovery) await resolveCasinoRoundIfReady(db);
    [seats, own] = await Promise.all([
      db.prepare(`SELECT h.* FROM casino_hands h JOIN players p ON p.user_id=h.user_id AND p.life_version=h.life_version
        WHERE h.status IN ${ACTIVE_CASINO_STATUSES} AND h.seat_no IS NOT NULL AND p.reset_game_over='' AND p.game_over<>'__resetting__' ORDER BY h.seat_no LIMIT 5`).all<CasinoRow>(),
      db.prepare("SELECT h.* FROM casino_hands h JOIN players p ON p.user_id=h.user_id AND p.life_version=h.life_version WHERE h.user_id=?").bind(userId).first<CasinoRow>(),
    ]);
  }
  const ownIsActive = Boolean(own && ["seated", "waiting", "dealing", "playing", "drawing", "stood", "settling"].includes(own.status));
  const playing = ownIsActive && own?.status === "playing";
  const playerCards = own ? parseCards(own.player_cards) : [];
  const dealerCards = own ? parseCards(own.dealer_cards) : [];
  const waitingSeat = seats.results.find((seat) => seat.status === "waiting");
  const playingSeat = seats.results.find((seat) => ["dealing", "playing", "drawing", "stood", "settling"].includes(seat.status));
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
      status: ownIsActive ? own.status : ["seated", "waiting", "dealing", "playing", "drawing", "stood", "settling"].includes(own.status) ? "expired" : own.status,
      result: ownIsActive ? own.result : ["seated", "waiting", "dealing", "playing", "drawing", "stood", "settling"].includes(own.status) ? "離桌過久，本局下注已沒收。" : own.result,
    } : null,
  };
}

async function resolveCasinoRoundIfReady(db: D1Database) {
  const lease = Date.now();
  const claimed = await db.prepare(`UPDATE casino_hands SET status='settling', updated_at=?
    WHERE ((status='stood') OR (status='settling' AND updated_at<?))
      AND NOT EXISTS (SELECT 1 FROM casino_hands WHERE status IN ('dealing','playing','drawing')) RETURNING *`).bind(lease, lease - SETTLEMENT_RECOVERY_TIMEOUT_MS).run<CasinoRow>();
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
    statements.push(db.prepare("UPDATE casino_hands SET dealer_cards=?, status='seated', result=?, reveal_at=0, updated_at=? WHERE user_id=? AND life_version=? AND status='settling' AND updated_at=?").bind(JSON.stringify(dealerCards), result, now, row.user_id, row.life_version, row.updated_at));
    statements.push(db.prepare(`UPDATE players SET cash=cash+?, updated_at=MAX(updated_at+1, ?) WHERE user_id=? AND life_version=?
      AND reset_game_over='' AND game_over<>'__resetting__' AND EXISTS (
        SELECT 1 FROM casino_hands WHERE user_id=? AND life_version=? AND status='seated' AND updated_at=?
      )`).bind(payout, now, row.user_id, row.life_version, row.user_id, row.life_version, now));
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
  await env.DB.prepare("UPDATE casino_hands SET status='expired', seat_no=NULL, reveal_at=0 WHERE status IN ('waiting','dealing','playing','drawing') AND updated_at<?").bind(cutoff).run();
  let message = "牌桌已更新。";
  if (body.action === "join") {
    const seatNo = Number(body.seatNo);
    if (!Number.isInteger(seatNo) || seatNo < 1 || seatNo > 5) return json({ message: "請選擇 1～5 號座位。" }, 400);
    const current = await env.DB.prepare(`SELECT * FROM casino_hands WHERE user_id=? AND status IN ${ACTIVE_CASINO_STATUSES}`).bind(user.userId).first<CasinoRow>();
    if (current) return json({ message: `你已經坐在 ${current.seat_no} 號座位。` }, 400);
    try {
      const joined = await env.DB.prepare(`INSERT INTO casino_hands (user_id, player_name, player_cards, dealer_cards, bet, status, result, seat_no, reveal_at, updated_at, life_version, deal_token)
        SELECT ?, ?, '[]', '[]', 0, 'seated', '', ?, 0, ?, ?, '' WHERE EXISTS (
          SELECT 1 FROM players WHERE user_id=? AND life_version=? AND reset_game_over='' AND game_over=''
        )
        ON CONFLICT(user_id) DO UPDATE SET player_name=excluded.player_name, player_cards='[]', dealer_cards='[]', bet=0,
          status='seated', result='', seat_no=excluded.seat_no, reveal_at=0, updated_at=excluded.updated_at,
          life_version=excluded.life_version, deal_token=''
        WHERE casino_hands.status NOT IN ('seated','waiting','dealing','playing','drawing','stood','settling') RETURNING user_id`)
        .bind(user.userId, user.displayName.slice(0, 40), seatNo, now, player.life_version, user.userId, player.life_version).run();
      if (joined.results.length !== 1) return json({ message: "無法加入這個座位，請重新整理後再試。" }, 409);
    } catch { return json({ message: `${seatNo} 號座位已有人，請選擇其他空位。` }, 409); }
    message = `已加入 ${seatNo} 號座位，請輸入下注金額。`;
  } else if (body.action === "deal") {
    const bet = Number(body.bet);
    if (!Number.isSafeInteger(bet) || bet < 1 || bet > 1_000_000) return json({ message: "請輸入 NT$1～1,000,000 的整數下注金額。" }, 400);
    if (player.cash < bet) return json({ message: "現金不足，無法下注。" }, 400);
    const ownSeat = await env.DB.prepare("SELECT * FROM casino_hands WHERE user_id=? AND life_version=? AND status='seated'").bind(user.userId, player.life_version).first<CasinoRow>();
    if (!ownSeat) return json({ message: "請先點選 1～5 號空位加入遊戲。" }, 400);
    const activeRound = await env.DB.prepare("SELECT 1 AS active FROM casino_hands WHERE status IN ('dealing','playing','drawing','stood','settling') LIMIT 1").first<{ active: number }>();
    if (activeRound) return json({ message: "本局已經翻牌，你可以留在座位觀賽，下一局再下注。" }, 409);
    const pending = await env.DB.prepare("SELECT reveal_at FROM casino_hands WHERE status='waiting' AND reveal_at>? ORDER BY reveal_at LIMIT 1").bind(now).first<{ reveal_at: number }>();
    if (!pending) await env.DB.prepare("UPDATE casino_hands SET player_cards='[]', dealer_cards='[]', bet=0, result='', reveal_at=0 WHERE status='seated'").run();
    const revealAt = pending?.reveal_at ?? now + 5_000;
    const dealToken = crypto.randomUUID();
    const queued = await env.DB.batch([env.DB.prepare(`UPDATE casino_hands SET bet=?, status='waiting', result='', reveal_at=?, updated_at=?, deal_token=?
      WHERE user_id=? AND status='seated' AND NOT EXISTS (
        SELECT 1 FROM casino_hands active WHERE active.status IN ('dealing','playing','drawing','stood','settling')
      ) AND life_version=? AND EXISTS (SELECT 1 FROM players actor WHERE actor.user_id=? AND actor.life_version=? AND actor.reset_game_over='' AND actor.game_over='' AND actor.cash>=?) RETURNING user_id`)
      .bind(bet, revealAt, now, dealToken, user.userId, player.life_version, user.userId, player.life_version, bet),
      env.DB.prepare("UPDATE players SET cash=cash-?, updated_at=MAX(updated_at+1, ?), last_seen_at=? WHERE user_id=? AND life_version=? AND cash>=? AND reset_game_over='' AND game_over='' AND EXISTS (SELECT 1 FROM casino_hands WHERE user_id=? AND life_version=? AND status='waiting' AND bet=? AND deal_token=?) RETURNING user_id")
        .bind(bet, now, now, user.userId, player.life_version, bet, user.userId, player.life_version, bet, dealToken),
    ]);
    if ((queued[0]?.results?.length ?? 0) !== 1 || (queued[1]?.results?.length ?? 0) !== 1) {
      await env.DB.prepare("UPDATE casino_hands SET bet=0, status='seated', result='', reveal_at=0, deal_token='', updated_at=? WHERE user_id=? AND status='waiting' AND bet=? AND deal_token=?")
        .bind(now, user.userId, bet, dealToken).run();
      return json({ message: (queued[0]?.results?.length ?? 0) !== 1 ? "牌桌正在發牌或本局已翻牌，請等待下一局。" : "現金不足，無法下注。" }, 409);
    }
    if (!pending) {
      const finalRevealAt = Date.now() + 5_000;
      await env.DB.prepare("UPDATE casino_hands SET reveal_at=? WHERE status='waiting'").bind(finalRevealAt).run();
    }
    message = `已下注 NT$${bet}，等待其他玩家；倒數結束後翻牌。`;
  } else {
    const row = await env.DB.prepare("SELECT * FROM casino_hands WHERE user_id=? AND life_version=? AND status='playing' AND updated_at>=?").bind(user.userId, player.life_version, cutoff).first<CasinoRow>();
    if (body.action === "leave") {
      const active = await env.DB.prepare(`SELECT * FROM casino_hands WHERE user_id=? AND life_version=? AND status IN ${ACTIVE_CASINO_STATUSES}`).bind(user.userId, player.life_version).first<CasinoRow>();
      if (!active) return json({ message: "你目前沒有加入牌桌。" }, 400);
      if (["dealing", "drawing", "settling"].includes(active.status)) return json({ message: "牌桌正在處理發牌或結算，請稍候再離場。" }, 409);
      message = active.status === "seated" ? "已離開牌桌。" : "已離開牌桌，本局下注不退還。";
      await env.DB.prepare("UPDATE casino_hands SET status='left', result=?, seat_no=NULL, reveal_at=0, updated_at=? WHERE user_id=? AND life_version=?").bind(message, now, user.userId, player.life_version).run();
      await resolveCasinoRoundIfReady(env.DB);
    } else {
      if (!row) return json({ message: "牌局尚未翻牌，請等待倒數結束。" }, 400);
    const cards = parseCards(row.player_cards);
    if (body.action === "hit") {
      const table = await env.DB.prepare("SELECT * FROM casino_table_state WHERE id='table-01'").first<CasinoTableRow>();
      const deck = parseCards(table?.deck || "[]");
      const card = deck.pop();
      if (!card || !table) return json({ message: "本局牌靴已用完，請停牌等待結算。" }, 409);
      cards.push(card);
      const score = handScore(cards);
      const actionToken = crypto.randomUUID();
      const handFinishedRevision = Math.max(Date.now(), row.updated_at + 1, table.updated_at + 1);
      const result = score > 21 ? "你爆牌了，等待其他玩家完成。" : score === 21 ? "21 點，等待其他玩家完成。" : "";
      const hit = await env.DB.batch([
        env.DB.prepare(`UPDATE casino_table_state SET deck=?, action_token=?, updated_at=?
          WHERE id='table-01' AND round_token=? AND updated_at=? AND EXISTS (
            SELECT 1 FROM casino_hands WHERE user_id=? AND life_version=? AND status='playing' AND updated_at=? AND deal_token=?
          ) RETURNING id`).bind(JSON.stringify(deck), actionToken, handFinishedRevision, table.round_token, table.updated_at,
            user.userId, player.life_version, row.updated_at, table.round_token),
        env.DB.prepare(`UPDATE casino_hands SET player_cards=?, status=?, result=?, updated_at=?
          WHERE user_id=? AND life_version=? AND status='playing' AND updated_at=? AND deal_token=?
            AND EXISTS (SELECT 1 FROM casino_table_state WHERE id='table-01' AND round_token=? AND action_token=?)
          RETURNING user_id`).bind(JSON.stringify(cards), score >= 21 ? "stood" : "playing", result,
            handFinishedRevision, user.userId, player.life_version, row.updated_at, table.round_token, table.round_token, actionToken),
      ]);
      if ((hit[0]?.results?.length ?? 0) !== 1 || (hit[1]?.results?.length ?? 0) !== 1) {
        return json({ message: "另一位玩家剛完成要牌，請重新整理後再試。" }, 409);
      }
      if (score >= 21) {
        await resolveCasinoRoundIfReady(env.DB);
        const completed = await env.DB.prepare("SELECT result FROM casino_hands WHERE user_id=?").bind(user.userId).first<{ result: string }>();
        message = completed?.result || `${score} 點，等待其他玩家完成。`;
      }
      else message = `補牌後目前 ${score} 點。`;
    } else if (body.action === "stand") {
      const stoodRevision = Math.max(now, row.updated_at + 1);
      const stood = await env.DB.prepare("UPDATE casino_hands SET status='stood', result='已停牌，等待其他玩家完成。', updated_at=? WHERE user_id=? AND life_version=? AND status='playing' AND updated_at=? RETURNING user_id").bind(stoodRevision, user.userId, player.life_version, row.updated_at).first<{ user_id: string }>();
      if (!stood) return json({ message: "這次停牌已被處理，請重新整理牌桌。" }, 409);
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

const POKER_ACTIVE_STATUSES = "('seated','ready','playing','all_in','folded','settling')";
const POKER_ACTION_TIMEOUT_MS = 90_000;
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
  const now = Date.now();
  const staleSettlement = table.status === "settling" && table.updated_at <= now - SETTLEMENT_RECOVERY_TIMEOUT_MS;
  const settlingRevision = Math.max(now, table.updated_at + 1);
  const claimed = staleSettlement
    ? await db.prepare(`UPDATE poker_table_state SET turn_seat=0, updated_at=?
        WHERE id='table-01' AND status='settling' AND updated_at=? RETURNING *`).bind(settlingRevision, table.updated_at).first<PokerTableRow>()
    : await db.prepare(`UPDATE poker_table_state SET status='settling', turn_seat=0, updated_at=?
        WHERE id='table-01' AND status='playing' AND updated_at=? RETURNING *`).bind(settlingRevision, table.updated_at).first<PokerTableRow>();
  if (!claimed) return;
  table = claimed;
  const active = players.filter((row) => row.status === "playing" || row.status === "all_in");
  const community = parseCards(table.community_cards);
  const evaluations = new Map<string, PokerEvaluation>();
  const payouts = new Map<string, number>();
  const handNames = new Map<string, string>();
  const evaluate = (row: PokerRow) => {
    const existing = evaluations.get(row.user_id);
    if (existing) return existing;
    const hand = bestPokerHand([...parseCards(row.hole_cards), ...community]);
    evaluations.set(row.user_id, hand);
    return hand;
  };
  const levels = [...new Set(players.map((row) => row.bet).filter((bet) => bet > 0))].sort((left, right) => left - right);
  let previousLevel = 0;
  for (const level of levels) {
    const contributors = players.filter((row) => row.bet >= level);
    const potAmount = (level - previousLevel) * contributors.length;
    const eligible = contributors.filter((row) => row.status === "playing" || row.status === "all_in");
    if (potAmount > 0 && eligible.length > 0) {
      let winners: PokerRow[];
      if (eligible.length === 1) winners = eligible;
      else {
        const evaluated = eligible.map((row) => ({ row, hand: evaluate(row) }));
        let best = evaluated[0].hand.score;
        evaluated.forEach((item) => { if (comparePokerScores(item.hand.score, best) > 0) best = item.hand.score; });
        winners = evaluated.filter((item) => comparePokerScores(item.hand.score, best) === 0).map((item) => item.row);
      }
      winners.sort((left, right) => (left.seat_no ?? 99) - (right.seat_no ?? 99));
      const share = Math.floor(potAmount / winners.length);
      const remainder = potAmount % winners.length;
      winners.forEach((winner, index) => {
        payouts.set(winner.user_id, (payouts.get(winner.user_id) ?? 0) + share + (index < remainder ? 1 : 0));
        const hand = evaluate(winner);
        if (hand.name) handNames.set(winner.user_id, hand.name);
      });
    }
    previousLevel = level;
  }
  // The table pot is the canonical amount removed from player wallets. Repair
  // any old/malformed contribution mismatch without creating or destroying
  // money during settlement.
  let distributed = [...payouts.values()].reduce((sum, payout) => sum + payout, 0);
  if (distributed < table.pot && active.length) {
    const evaluated = active.map((row) => ({ row, hand: evaluate(row) }));
    let best = evaluated[0].hand.score;
    evaluated.forEach((item) => { if (comparePokerScores(item.hand.score, best) > 0) best = item.hand.score; });
    const winners = evaluated.filter((item) => comparePokerScores(item.hand.score, best) === 0).map((item) => item.row)
      .sort((left, right) => (left.seat_no ?? 99) - (right.seat_no ?? 99));
    const missing = table.pot - distributed;
    winners.forEach((winner, index) => payouts.set(winner.user_id, (payouts.get(winner.user_id) ?? 0) + Math.floor(missing / winners.length) + (index < missing % winners.length ? 1 : 0)));
    distributed = table.pot;
  }
  if (distributed > table.pot) {
    let excess = distributed - table.pot;
    const ordered = [...payouts.keys()].sort((left, right) => (players.find((row) => row.user_id === right)?.seat_no ?? 0) - (players.find((row) => row.user_id === left)?.seat_no ?? 0));
    for (const userId of ordered) {
      const currentPayout = payouts.get(userId) ?? 0;
      const reduction = Math.min(currentPayout, excess);
      payouts.set(userId, currentPayout - reduction);
      excess -= reduction;
      if (!excess) break;
    }
  }
  const statements: D1PreparedStatement[] = [];
  players.forEach((row) => {
    const payout = payouts.get(row.user_id) ?? 0;
    const handName = handNames.get(row.user_id) ?? (active.length > 1 && (row.status === "playing" || row.status === "all_in") ? evaluate(row).name : "");
    const result = payout ? `${handName || "其他玩家棄牌"}獲勝，獲得 NT$${payout}。` : row.status === "folded" ? "本局已棄牌。" : `${handName || "本局"}未贏得獎池。`;
    statements.push(db.prepare("UPDATE poker_hands SET status='seated', result=?, street_bet=0, acted=0, updated_at=? WHERE user_id=? AND life_version=? AND round_token=?").bind(result, now, row.user_id, row.life_version, table.round_token));
    if (payout) statements.push(db.prepare(`UPDATE players SET cash=cash+?, updated_at=MAX(updated_at+1, ?) WHERE user_id=? AND life_version=?
      AND reset_game_over='' AND game_over<>'__resetting__' AND EXISTS (
        SELECT 1 FROM poker_hands WHERE user_id=? AND life_version=? AND round_token=? AND status='seated' AND updated_at=?
      )`).bind(payout, now, row.user_id, row.life_version, row.user_id, row.life_version, table.round_token, now));
  });
  statements.push(db.prepare("UPDATE poker_table_state SET status='idle', street='showdown', current_bet=0, turn_seat=0, pot=0, updated_at=? WHERE id='table-01' AND status='settling' AND updated_at=?")
    .bind(Math.max(Date.now(), settlingRevision + 1), settlingRevision));
  await db.batch(statements);
}

async function advancePoker(db: D1Database, players: PokerRow[], table: PokerTableRow) {
  const active = players.filter((row) => row.status === "playing" || row.status === "all_in");
  const actors = players.filter((row) => row.status === "playing");
  if (active.length <= 1) return settlePoker(db, players, table);
  const roundDone = actors.length === 0 || actors.every((row) => row.acted && row.street_bet === table.current_bet);
  if (!roundDone) {
    await db.prepare("UPDATE poker_table_state SET turn_seat=?, updated_at=? WHERE id='table-01' AND status='playing' AND updated_at=?")
      .bind(nextPokerSeat(players, table.turn_seat), Math.max(Date.now(), table.updated_at + 1), table.updated_at).run();
    return;
  }
  if (table.street === "river") return settlePoker(db, players, table);
  const deck = parseCards(table.deck); const community = parseCards(table.community_cards);
  const nextStreet = table.street === "preflop" ? "flop" : table.street === "flop" ? "turn" : "river";
  const cardsToDeal = nextStreet === "flop" ? 3 : 1;
  for (let index = 0; index < cardsToDeal; index += 1) community.push(deck.pop()!);
  const firstSeat = (actors.length ? actors : active).sort((a, b) => a.seat_no! - b.seat_no!)[0].seat_no!;
  const now = Math.max(Date.now(), table.updated_at + 1);
  await db.batch([
    db.prepare("UPDATE poker_table_state SET deck=?, community_cards=?, street=?, current_bet=0, turn_seat=?, updated_at=? WHERE id='table-01' AND status='playing' AND updated_at=?")
      .bind(JSON.stringify(deck), JSON.stringify(community), nextStreet, firstSeat, now, table.updated_at),
    db.prepare(`UPDATE poker_hands SET street_bet=0, acted=CASE WHEN status='all_in' THEN 1 ELSE 0 END,
      community_cards=?, updated_at=? WHERE status IN ('playing','all_in')
        AND EXISTS (SELECT 1 FROM poker_table_state WHERE id='table-01' AND status='playing' AND updated_at=?)`)
      .bind(JSON.stringify(community), now, now),
  ]);
  if (actors.length === 0) return advancePoker(db, players, { ...table, deck: JSON.stringify(deck), community_cards: JSON.stringify(community), street: nextStreet, current_bet: 0, turn_seat: firstSeat, updated_at: now });
}

async function resolveExpiredPokerTurn(db: D1Database) {
  const table = await pokerTable(db);
  const now = Date.now();
  if (!table || table.status !== "playing" || !table.turn_seat || table.updated_at > now - POKER_ACTION_TIMEOUT_MS) return;
  const previousTurn = table.turn_seat;
  const seat = Math.abs(previousTurn);
  if (previousTurn < 0) {
    await db.prepare(`UPDATE poker_table_state SET turn_seat=?, action_token='', updated_at=?
      WHERE id='table-01' AND status='playing' AND turn_seat=? AND updated_at=?`)
      .bind(seat, now, previousTurn, table.updated_at).run();
    return;
  }
  const claimed = await db.prepare(`UPDATE poker_table_state SET turn_seat=?, updated_at=?
    WHERE id='table-01' AND status='playing' AND turn_seat=? AND updated_at=? RETURNING *`)
    .bind(-seat, now, previousTurn, table.updated_at).first<PokerTableRow>();
  if (!claimed) return;
  await db.prepare(`UPDATE poker_hands SET status='folded', acted=1, result='逾時自動棄牌。', updated_at=?
    WHERE seat_no=? AND status='playing'`).bind(now, seat).run();
  const resumedAt = Math.max(Date.now(), now + 1);
  await db.prepare("UPDATE poker_table_state SET turn_seat=?, updated_at=? WHERE id='table-01' AND status='playing' AND turn_seat=?")
    .bind(seat, resumedAt, -seat).run();
  const [players, refreshedTable] = await Promise.all([
    db.prepare("SELECT * FROM poker_hands WHERE status IN ('playing','all_in','folded') ORDER BY seat_no").all<PokerRow>(),
    pokerTable(db),
  ]);
  if (refreshedTable?.status === "playing") await advancePoker(db, players.results, refreshedTable);
}

async function recoverStalePokerStart(db: D1Database) {
  const table = await pokerTable(db);
  const now = Date.now();
  if (!table || table.status !== "starting" || table.updated_at > now - POKER_ACTION_TIMEOUT_MS) return;
  await db.prepare(`UPDATE poker_table_state SET status='idle', street='idle', current_bet=0,
    turn_seat=0, pot=0, deck='[]', community_cards='[]', updated_at=?
    WHERE id='table-01' AND status='starting' AND updated_at=?`)
    .bind(Math.max(now, table.updated_at + 1), table.updated_at).run();
}

async function recoverStalePokerSettlement(db: D1Database) {
  const table = await pokerTable(db);
  const now = Date.now();
  if (!table || table.status !== "settling" || table.updated_at > now - SETTLEMENT_RECOVERY_TIMEOUT_MS) return;
  const players = await db.prepare("SELECT * FROM poker_hands WHERE status IN ('playing','all_in','folded') ORDER BY seat_no").all<PokerRow>();
  await settlePoker(db, players.results, table);
}

async function pokerState(db: D1Database, userId: string) {
  await recoverStalePokerStart(db);
  await recoverStalePokerSettlement(db);
  await resolveExpiredPokerTurn(db);
  let [seats, own, table] = await Promise.all([
    db.prepare(`SELECT h.* FROM poker_hands h JOIN players p ON p.user_id=h.user_id AND p.life_version=h.life_version
      WHERE h.status IN ${POKER_ACTIVE_STATUSES} AND h.seat_no IS NOT NULL AND p.reset_game_over='' AND p.game_over<>'__resetting__' ORDER BY h.seat_no LIMIT 5`).all<PokerRow>(),
    db.prepare("SELECT h.* FROM poker_hands h JOIN players p ON p.user_id=h.user_id AND p.life_version=h.life_version WHERE h.user_id=?").bind(userId).first<PokerRow>(), pokerTable(db),
  ]);
  if (seats.results.some((seat) => ["seated", "ready"].includes(seat.status) && seat.updated_at < Date.now() - IDLE_CASINO_SEAT_TIMEOUT_MS)) {
    await expireIdlePokerSeats(db);
    [seats, own, table] = await Promise.all([
      db.prepare(`SELECT h.* FROM poker_hands h JOIN players p ON p.user_id=h.user_id AND p.life_version=h.life_version
        WHERE h.status IN ${POKER_ACTIVE_STATUSES} AND h.seat_no IS NOT NULL AND p.reset_game_over='' AND p.game_over<>'__resetting__' ORDER BY h.seat_no LIMIT 5`).all<PokerRow>(),
      db.prepare("SELECT h.* FROM poker_hands h JOIN players p ON p.user_id=h.user_id AND p.life_version=h.life_version WHERE h.user_id=?").bind(userId).first<PokerRow>(), pokerTable(db),
    ]);
  }
  const state = table ?? { street: "idle", current_bet: 0, turn_seat: 0, pot: 0, status: "idle", community_cards: "[]", updated_at: 0 };
  return { capacity: 5, activeCount: seats.results.length, serverNow: Date.now(), phase: state.status === "playing" || state.status === "settling" ? "playing" : "idle", communityCards: parseCards(state.community_cards), pot: state.pot, street: state.street, currentBet: state.current_bet, turnSeat: Math.max(0, state.turn_seat), nextActionAt: state.status === "playing" ? state.updated_at + POKER_ACTION_TIMEOUT_MS : 0,
    seats: seats.results.map((seat) => ({ id: seat.user_id, displayName: seat.player_name, seatNo: seat.seat_no, status: seat.status, bet: seat.bet, streetBet: seat.street_bet, cards: seat.user_id === userId || state.status !== "playing" ? parseCards(seat.hole_cards) : ["playing", "all_in"].includes(seat.status) ? ["🂠", "🂠"] : [], result: seat.result, isMine: seat.user_id === userId })),
    hand: own ? { cards: parseCards(own.hole_cards), bet: own.bet, streetBet: own.street_bet, seatNo: own.seat_no, status: own.status, result: own.result, isTurn: state.status === "playing" && own.status === "playing" && own.seat_no === state.turn_seat } : null };
}

async function pokerAction(request: Request, env: Env) {
  const user = await identity(request, env.DB);
  if (!user || !env.DB) return json({ message: "請先登入才能加入德州撲克牌桌。" }, 401);
  await ensureSchemaOnce(env.DB);
  const player = await upsertPlayer(env.DB, user, true);
  if (player?.game_over) return json({ message: "這段人生已經結束，請重新開始。" }, 409);
  if (!player || player.location !== "casino") return json({ message: "請先前往幸運賭場。" }, 400);
  await recoverStalePokerStart(env.DB);
  await recoverStalePokerSettlement(env.DB);
  await expireIdlePokerSeats(env.DB);
  await resolveExpiredPokerTurn(env.DB);
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
      const joined = await env.DB.prepare(`INSERT INTO poker_hands (user_id, player_name, hole_cards, community_cards, bet, status, result, seat_no, reveal_at, updated_at, life_version, round_token, action_token)
        SELECT ?, ?, '[]', '[]', 0, 'seated', '', ?, 0, ?, ?, '', '' WHERE EXISTS (
          SELECT 1 FROM players WHERE user_id=? AND life_version=? AND reset_game_over='' AND game_over=''
        )
        ON CONFLICT(user_id) DO UPDATE SET player_name=excluded.player_name, hole_cards='[]', community_cards='[]', bet=0, street_bet=0, acted=0, status='seated', result='', seat_no=excluded.seat_no, reveal_at=0, updated_at=excluded.updated_at
          , life_version=excluded.life_version, round_token='', action_token=''
        WHERE poker_hands.status NOT IN ('seated','ready','playing','all_in','folded','settling') RETURNING user_id`)
        .bind(user.userId, user.displayName.slice(0, 40), seatNo, now, player.life_version, user.userId, player.life_version).run();
      if (joined.results.length !== 1) return json({ message: "無法加入這個座位，請重新整理後再試。" }, 409);
    } catch { return json({ message: `${seatNo} 號座位已有人，請選擇其他空位。` }, 409); }
    message = `已加入德州撲克 ${seatNo} 號座位，請輸入下注金額。`;
  } else if (body.action === "ready") {
    const ready = await env.DB.prepare("UPDATE poker_hands SET hole_cards='[]', community_cards='[]', bet=0, street_bet=0, acted=0, status='ready', result='', updated_at=? WHERE user_id=? AND life_version=? AND status='seated' RETURNING user_id").bind(now, user.userId, player.life_version).run();
    if (ready.results.length !== 1) return json({ message: "請先選擇空位，或等待目前牌局結束。" }, 409);
    message = "你已準備參加下一局；至少兩位玩家準備後即可開局。";
  } else if (body.action === "start") {
    const blind = Number(body.bet);
    if (!Number.isSafeInteger(blind) || blind < 10 || blind > 100_000) return json({ message: "大盲請設定為 NT$10～100,000。" }, 400);
    const table = await pokerTable(env.DB); if (table && table.status !== "idle") return json({ message: "牌局已在進行或結算中。" }, 409);
    const joined = await env.DB.prepare(`SELECT h.*, p.cash FROM poker_hands h JOIN players p ON p.user_id=h.user_id AND p.life_version=h.life_version
      WHERE h.status='ready' AND h.seat_no IS NOT NULL AND p.reset_game_over='' AND p.game_over='' ORDER BY h.seat_no`).all<PokerRow & { cash: number }>();
    if (joined.results.length < 2) return json({ message: "至少需要兩位已準備玩家才能開局。" }, 409);
    const sb = joined.results[0];
    if (sb.user_id !== user.userId) return json({ message: `只有小盲 ${sb.seat_no} 號玩家可以開始牌局。` }, 409);
    if (joined.results.some((row) => row.cash < blind)) return json({ message: `有玩家現金少於開局起始資金 NT$${blind}，目前無法開局。` }, 409);
    const startToken = crypto.randomUUID();
    const startRevision = Math.max(now, (table?.updated_at ?? 0) + 1);
    const claimed = await env.DB.prepare(`INSERT INTO poker_table_state (id,deck,community_cards,street,current_bet,turn_seat,pot,status,round_token,action_token,updated_at)
      SELECT 'table-01','[]','[]','idle',0,0,0,'starting',?,?,? WHERE EXISTS (
        SELECT 1 FROM players WHERE user_id=? AND life_version=? AND reset_game_over='' AND game_over=''
      )
      ON CONFLICT(id) DO UPDATE SET status='starting', round_token=excluded.round_token, action_token=excluded.action_token, updated_at=excluded.updated_at
      WHERE poker_table_state.status='idle' AND EXISTS (
        SELECT 1 FROM players WHERE user_id=? AND life_version=? AND reset_game_over='' AND game_over=''
      ) RETURNING id`).bind(startToken, startToken, startRevision, user.userId, player.life_version,
        user.userId, player.life_version).first<{ id: string }>();
    if (!claimed) return json({ message: "已有玩家先開始或正在結算牌局。" }, 409);
    const deck = shuffledDeck(); const hands = new Map<string, string[]>(); joined.results.forEach((row) => hands.set(row.user_id, [deck.pop()!, deck.pop()!]));
    const smallBlind = Math.max(1, Math.floor(blind / 2)); const bb = joined.results[1]; const firstTurn = joined.results[2]?.seat_no ?? sb.seat_no!;
    const walletRevision = startRevision + 1;
    const handRevision = walletRevision + 1;
    const finalRevision = handRevision + 1;
    const statements: D1PreparedStatement[] = [env.DB.prepare(`UPDATE players SET
      cash=cash-CASE WHEN user_id=? THEN ? ELSE ? END, updated_at=MAX(updated_at+1, ?), mutation_token=?
      WHERE user_id IN (?, ?)
        AND life_version=CASE WHEN user_id=? THEN ? ELSE ? END AND reset_game_over='' AND game_over=''
        AND (SELECT cash FROM players WHERE user_id=?)>=?
        AND (SELECT cash FROM players WHERE user_id=?)>=?
        AND EXISTS (SELECT 1 FROM poker_table_state WHERE id='table-01' AND status='starting' AND round_token=? AND updated_at=?)
      RETURNING user_id`).bind(sb.user_id, smallBlind, blind, walletRevision, startToken, sb.user_id, bb.user_id,
        sb.user_id, sb.life_version, bb.life_version, sb.user_id, smallBlind, bb.user_id, blind, startToken, startRevision)];
    joined.results.forEach((row) => { const forced = row.user_id === sb.user_id ? smallBlind : row.user_id === bb.user_id ? blind : 0; const status = forced > 0 && row.cash === forced ? "all_in" : "playing"; const acted = status === "all_in" ? 1 : 0;
      statements.push(env.DB!.prepare(`UPDATE poker_hands SET hole_cards=?, community_cards='[]', bet=?, street_bet=?, acted=?, status=?, result='', round_token=?, action_token=?, updated_at=?
        WHERE user_id=? AND life_version=? AND seat_no=? AND status='ready'
          AND EXISTS (SELECT 1 FROM players WHERE user_id=? AND life_version=? AND mutation_token=?)
          AND EXISTS (SELECT 1 FROM players WHERE user_id=? AND life_version=? AND mutation_token=?)
        RETURNING user_id`).bind(JSON.stringify(hands.get(row.user_id)), forced, forced, acted, status, startToken, startToken, handRevision,
          row.user_id, row.life_version, row.seat_no, sb.user_id, sb.life_version, startToken, bb.user_id, bb.life_version, startToken)); });
    statements.push(env.DB.prepare(`UPDATE poker_table_state SET deck=?,community_cards='[]',street='preflop',current_bet=?,turn_seat=?,pot=?,status='playing',action_token=?,updated_at=?
      WHERE id='table-01' AND status='starting' AND round_token=? AND updated_at=?
        AND EXISTS (SELECT 1 FROM players WHERE user_id=? AND life_version=? AND mutation_token=?)
        AND EXISTS (SELECT 1 FROM players WHERE user_id=? AND life_version=? AND mutation_token=?)
      RETURNING id`).bind(JSON.stringify(deck), blind, firstTurn, smallBlind + blind, startToken, finalRevision, startToken, startRevision,
        sb.user_id, sb.life_version, startToken, bb.user_id, bb.life_version, startToken));
    const started = await env.DB.batch(statements);
    const startSucceeded = (started[0]?.results?.length ?? 0) === 2
      && joined.results.every((_, index) => (started[index + 1]?.results?.length ?? 0) === 1)
      && (started[started.length - 1]?.results?.length ?? 0) === 1;
    if (!startSucceeded) {
      await env.DB.batch([
        env.DB.prepare(`UPDATE players SET cash=cash+CASE WHEN user_id=? THEN ? ELSE ? END, updated_at=?, mutation_token=''
          WHERE user_id IN (?, ?) AND life_version=CASE WHEN user_id=? THEN ? ELSE ? END AND mutation_token=?`)
          .bind(sb.user_id, smallBlind, blind, Date.now(), sb.user_id, bb.user_id, sb.user_id, sb.life_version, bb.life_version, startToken),
        ...joined.results.map((row) => env.DB!.prepare(`UPDATE poker_hands SET hole_cards='[]', community_cards='[]', bet=0,
          street_bet=0, acted=0, status='ready', result='', round_token='', action_token='', updated_at=? WHERE user_id=? AND life_version=? AND round_token=?`)
          .bind(Date.now(), row.user_id, row.life_version, startToken)),
        env.DB.prepare("UPDATE poker_table_state SET status='idle', turn_seat=0, pot=0, deck='[]', community_cards='[]', round_token='', action_token='', updated_at=? WHERE id='table-01' AND status='starting' AND round_token=?").bind(Date.now(), startToken),
      ]);
      return json({ message: "有玩家現金或座位在開局前發生變動，牌局未開始且盲注已退回。" }, 409);
    }
    message = `牌局開始：小盲 ${sb.seat_no} 號 NT$${smallBlind}、大盲 ${bb.seat_no} 號 NT$${blind}。`;
  } else if (["check", "call", "raise", "fold", "all_in"].includes(body.action || "")) {
    const [table, row] = await Promise.all([pokerTable(env.DB), env.DB.prepare("SELECT * FROM poker_hands WHERE user_id=? AND life_version=?").bind(user.userId, player.life_version).first<PokerRow>()]);
    if (!table || table.status !== "playing" || !row || row.status !== "playing") return json({ message: "你目前不在進行中的牌局。" }, 409);
    if (row.seat_no !== table.turn_seat) return json({ message: `目前輪到 ${table.turn_seat} 號座位。` }, 409);
    const callAmount = Math.max(0, table.current_bet - row.street_bet);
    const requestedRaise = body.action === "raise" ? Number(body.amount) : 0;
    if (body.action === "check" && callAmount > 0) return json({ message: "目前有人下注，不能過牌；請跟注、加注或棄牌。" }, 409);
    if (body.action === "call" && callAmount === 0) return json({ message: "目前沒有需要跟注的金額，請選擇過牌。" }, 409);
    if (!Number.isSafeInteger(requestedRaise) || requestedRaise < 0 || (body.action === "raise" && requestedRaise < 10)) return json({ message: "加注金額至少為 NT$10。" }, 400);
    let added = 0; let nextBet = table.current_bet; let raiseBy = requestedRaise;
    let expectedWallet: number | null = null;
    if (body.action === "all_in") {
      const wallet = await env.DB.prepare("SELECT cash FROM players WHERE user_id=?").bind(user.userId).first<{ cash: number }>();
      added = Math.max(0, Number(wallet?.cash ?? 0));
      if (!added) return json({ message: "你已沒有可全押的現金。" }, 409);
      expectedWallet = added;
      raiseBy = Math.max(0, added - callAmount);
      nextBet = table.current_bet + raiseBy;
    } else if (body.action === "call" || body.action === "raise") {
      added = callAmount + requestedRaise;
      nextBet = table.current_bet + requestedRaise;
    }
    const actionToken = crypto.randomUUID();
    const tableClaimRevision = Math.max(now, table.updated_at + 1);
    const claimedTable = await env.DB.prepare(`UPDATE poker_table_state SET turn_seat=?, action_token=?, updated_at=?
      WHERE id='table-01' AND status='playing' AND round_token=? AND turn_seat=? AND updated_at=? RETURNING *`)
      .bind(-row.seat_no!, actionToken, tableClaimRevision, table.round_token, row.seat_no!, table.updated_at).first<PokerTableRow>();
    if (!claimedTable) return json({ message: "這個回合已被處理，請重新整理牌桌。" }, 409);
    const restoreTurn = async () => {
      await env.DB!.prepare("UPDATE poker_table_state SET turn_seat=?, action_token='', updated_at=? WHERE id='table-01' AND status='playing' AND round_token=? AND turn_seat=? AND action_token=?")
        .bind(row.seat_no, Math.max(Date.now(), tableClaimRevision + 1), table.round_token, -row.seat_no!, actionToken).run();
    };
    const walletRevision = tableClaimRevision + 1;
    const handRevision = walletRevision + 1;
    const finishedAt = handRevision + 1;
    const walletStatement = expectedWallet !== null
      ? env.DB.prepare("UPDATE players SET cash=cash-?, updated_at=MAX(updated_at+1, ?), mutation_token=? WHERE user_id=? AND life_version=? AND cash=? AND game_over='' AND reset_game_over='' AND EXISTS (SELECT 1 FROM poker_table_state WHERE id='table-01' AND round_token=? AND action_token=? AND turn_seat=?) RETURNING user_id, updated_at").bind(added, walletRevision, actionToken, user.userId, player.life_version, expectedWallet, table.round_token, actionToken, -row.seat_no!)
      : env.DB.prepare("UPDATE players SET cash=cash-?, updated_at=MAX(updated_at+1, ?), mutation_token=? WHERE user_id=? AND life_version=? AND cash>=? AND game_over='' AND reset_game_over='' AND EXISTS (SELECT 1 FROM poker_table_state WHERE id='table-01' AND round_token=? AND action_token=? AND turn_seat=?) RETURNING user_id, updated_at").bind(added, walletRevision, actionToken, user.userId, player.life_version, added, table.round_token, actionToken, -row.seat_no!);
    const handStatement = body.action === "fold"
      ? env.DB.prepare(`UPDATE poker_hands SET status='folded', acted=1, result='本局已棄牌。', action_token=?, updated_at=?
          WHERE user_id=? AND life_version=? AND round_token=? AND status='playing' AND updated_at=? AND EXISTS (SELECT 1 FROM players WHERE user_id=? AND life_version=? AND mutation_token=?) RETURNING user_id`)
        .bind(actionToken, handRevision, user.userId, player.life_version, table.round_token, row.updated_at, user.userId, player.life_version, actionToken)
      : body.action === "all_in"
        ? env.DB.prepare(`UPDATE poker_hands SET bet=bet+?, street_bet=street_bet+?, acted=1, status='all_in', result='已全押，等待攤牌。', action_token=?, updated_at=?
            WHERE user_id=? AND life_version=? AND round_token=? AND status='playing' AND updated_at=? AND EXISTS (SELECT 1 FROM players WHERE user_id=? AND life_version=? AND mutation_token=?) RETURNING user_id`)
          .bind(added, added, actionToken, handRevision, user.userId, player.life_version, table.round_token, row.updated_at, user.userId, player.life_version, actionToken)
        : env.DB.prepare(`UPDATE poker_hands SET bet=bet+?, street_bet=street_bet+?, acted=1, action_token=?, updated_at=?
            WHERE user_id=? AND life_version=? AND round_token=? AND status='playing' AND updated_at=? AND EXISTS (SELECT 1 FROM players WHERE user_id=? AND life_version=? AND mutation_token=?) RETURNING user_id`)
          .bind(added, added, actionToken, handRevision, user.userId, player.life_version, table.round_token, row.updated_at, user.userId, player.life_version, actionToken);
    const actionStatements: D1PreparedStatement[] = [walletStatement, handStatement];
    if (raiseBy > 0) actionStatements.push(env.DB.prepare(`UPDATE poker_hands SET acted=0
      WHERE status='playing' AND round_token=? AND user_id<>? AND EXISTS (SELECT 1 FROM poker_hands WHERE user_id=? AND life_version=? AND round_token=? AND action_token=? AND updated_at=?)`)
      .bind(table.round_token, user.userId, user.userId, player.life_version, table.round_token, actionToken, handRevision));
    actionStatements.push(env.DB.prepare(`UPDATE poker_table_state SET current_bet=?, pot=pot+?, turn_seat=?, updated_at=?
      WHERE id='table-01' AND status='playing' AND round_token=? AND turn_seat=? AND action_token=? AND updated_at=?
        AND EXISTS (SELECT 1 FROM poker_hands WHERE user_id=? AND life_version=? AND round_token=? AND action_token=? AND updated_at=?) RETURNING id`)
      .bind(nextBet, added, row.seat_no, finishedAt, table.round_token, -row.seat_no!, actionToken, tableClaimRevision,
        user.userId, player.life_version, table.round_token, actionToken, handRevision));
    const settledAction = await env.DB.batch(actionStatements);
    if ((settledAction[0]?.results?.length ?? 0) !== 1 || (settledAction[1]?.results?.length ?? 0) !== 1 || (settledAction[settledAction.length - 1]?.results?.length ?? 0) !== 1) {
      if (added && (settledAction[0]?.results?.length ?? 0) === 1) await env.DB.prepare("UPDATE players SET cash=cash+?, updated_at=MAX(updated_at+1, ?), mutation_token='' WHERE user_id=? AND life_version=? AND mutation_token=?").bind(added, Date.now(), user.userId, player.life_version, actionToken).run();
      await env.DB.prepare(`UPDATE poker_hands SET status='playing', bet=MAX(0,bet-?), street_bet=MAX(0,street_bet-?), acted=0, result='', updated_at=?
        WHERE user_id=? AND life_version=? AND round_token=? AND action_token=? AND updated_at=?`).bind(added, added, Date.now(), user.userId, player.life_version, table.round_token, actionToken, handRevision).run();
      await restoreTurn();
      return json({ message: "手牌或現金狀態已變更，下注未完成且款項已退回。" }, 409);
    }
    message = body.action === "fold" ? "你已棄牌。" : body.action === "check" ? "你選擇過牌。" : body.action === "all_in" ? `你已全押 NT$${added}，將保留到最後攤牌。` : body.action === "raise" ? `你跟注並加注 NT$${requestedRaise}。` : `你跟注 NT$${callAmount}。`;
    const refreshedPlayers = await env.DB.prepare("SELECT * FROM poker_hands WHERE status IN ('playing','all_in','folded') ORDER BY seat_no").all<PokerRow>(); const refreshedTable = await pokerTable(env.DB); await advancePoker(env.DB, refreshedPlayers.results, refreshedTable!);
  } else if (body.action === "leave") {
    const active = await env.DB.prepare(`SELECT * FROM poker_hands WHERE user_id=? AND life_version=? AND status IN ${POKER_ACTIVE_STATUSES}`).bind(user.userId, player.life_version).first<PokerRow>();
    if (!active) return json({ message: "你目前沒有加入德州撲克牌桌。" }, 400);
    const table = await pokerTable(env.DB);
    if (["playing", "all_in", "folded", "settling"].includes(active.status) || table?.status === "starting" || table?.status === "playing" || table?.status === "settling") return json({ message: "牌局正在開局、進行或結算，請等待本局完成後再離場。" }, 409);
    await env.DB.prepare("UPDATE poker_hands SET status='left', seat_no=NULL, reveal_at=0, updated_at=? WHERE user_id=? AND life_version=?").bind(now, user.userId, player.life_version).run();
    message = "已離開德州撲克牌桌。";
  } else return json({ message: "未知的德州撲克牌桌行動。" }, 400);
  const saved = await env.DB.prepare("SELECT * FROM players WHERE user_id=?").bind(user.userId).first<PlayerRow>();
  if (["bet", "call", "raise", "all_in"].includes(body.action || "")) await recordCityMemory(env.DB, user.userId, "casino");
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
  if (displayName.length < 2 || displayName.length > 24 || hasControlCharacters(displayName)) {
    return json({ message: "玩家名字需為 2～24 個字元，不能是空白或控制字元。" }, 400);
  }
  const current = await upsertPlayer(env.DB, user, true);
  if (!current) return json({ message: "找不到玩家資料。" }, 404);
  if (current.reset_game_over || current.game_over === "__resetting__") return json({ message: "人生資料正在重置，請稍候再更改名字。" }, 409);
  const now = Date.now();
  const nameToken = crypto.randomUUID();
  const renamed = await env.DB.prepare(`UPDATE players SET display_name=?, updated_at=MAX(updated_at+1, ?), last_seen_at=?, mutation_token=?
    WHERE user_id=? AND life_version=? AND updated_at=? AND reset_game_over='' AND game_over<>'__resetting__'
    RETURNING user_id`).bind(displayName, now, now, nameToken, user.userId, current.life_version, current.updated_at).first<{ user_id: string }>();
  if (!renamed) return json({ message: "玩家資料剛剛已更新，請再試一次。" }, 409);
  await env.DB.batch([
    env.DB.prepare("UPDATE accounts SET display_name=? WHERE id=?").bind(displayName, user.userId),
    env.DB.prepare("UPDATE game_events SET player_name=? WHERE user_id=? AND EXISTS (SELECT 1 FROM players WHERE user_id=? AND life_version=? AND mutation_token=?)").bind(displayName, user.userId, user.userId, current.life_version, nameToken),
    env.DB.prepare("UPDATE casino_hands SET player_name=? WHERE user_id=? AND life_version=?").bind(displayName, user.userId, current.life_version),
    env.DB.prepare("UPDATE poker_hands SET player_name=? WHERE user_id=? AND life_version=?").bind(displayName, user.userId, current.life_version),
    env.DB.prepare("UPDATE casino_bingo_entries SET player_name=? WHERE user_id=? AND life_version=?").bind(displayName, user.userId, current.life_version),
    env.DB.prepare("UPDATE casino_tournament_entries SET player_name=? WHERE user_id=? AND life_version=?").bind(displayName, user.userId, current.life_version),
    env.DB.prepare("UPDATE casino_tournament_hands SET player_name=? WHERE user_id=? AND life_version=?").bind(displayName, user.userId, current.life_version),
    env.DB.prepare("UPDATE writer_books SET author_name=?, updated_at=? WHERE author_id=? AND author_life_version=?").bind(displayName, now, user.userId, current.life_version),
    env.DB.prepare("UPDATE player_transfer_requests SET sender_name=? WHERE sender_id=?").bind(displayName, user.userId),
    env.DB.prepare("UPDATE player_medical_requests SET patient_name=? WHERE patient_id=?").bind(displayName, user.userId),
    env.DB.prepare("UPDATE player_medical_requests SET provider_name=? WHERE provider_id=?").bind(displayName, user.userId),
    env.DB.prepare("UPDATE player_loan_requests SET borrower_name=? WHERE borrower_id=?").bind(displayName, user.userId),
    env.DB.prepare("UPDATE player_loan_requests SET provider_name=? WHERE provider_id=?").bind(displayName, user.userId),
    env.DB.prepare("UPDATE player_loan_contracts SET borrower_name=? WHERE borrower_id=?").bind(displayName, user.userId),
    env.DB.prepare("UPDATE player_loan_contracts SET provider_name=? WHERE provider_id=?").bind(displayName, user.userId),
  ]);
  const saved = await env.DB.prepare("SELECT * FROM players WHERE user_id=?").bind(user.userId).first<PlayerRow>();
  if (!saved) return json({ message: "玩家資料更新後無法載入。" }, 500);
  const progress = await ensureProgress(env.DB, saved);
  const loanContract = await activeLoanContract(env.DB, user.userId);
  const updatedUser = { ...user, displayName };
  return json({ profile: profileFor(updatedUser), player: serializePlayer(saved, progress, loanContract), message: `玩家名字已更新為「${displayName}」。` });
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
  if (!user || !env.DB) return json({ serverNow: Date.now(), authenticated: false, profile: null, player: guestPlayer(), room: { id: "lobby-01", name: "城市大廳 01" }, online: [], feed: [], casino: { capacity: 5, activeCount: 0, seats: [], hand: null }, poker: { capacity: 5, activeCount: 0, seats: [], hand: null, communityCards: [], pot: 0 }, bingo: { status: "lobby", players: [], drawn: [] }, tournament: { status: "lobby", players: [] }, medicalRequests: [], loanRequests: [], begRequests: [], street: { items: [], scavengesUsed: 0, scavengesMax: 4, begIncome: 0, begCap: 500 }, aidBoxes: { cycleDay: 1, dailyCap: 2000, boxes: [] }, coop: { cycleDay: 1, status: "open", reward: 600, talentExp: 8, eligibleRole: "", contributed: false, roles: [] }, reputation: { factions: [] }, commissions: { cycleDay: 1, commissions: [] }, mystery: { found: 0, total: 7, whispers: [] }, contracts: { contracts: [] }, lifeLedger: { entries: [] }, bookStore: { books: [], maxActiveBooks: WRITER_MAX_ACTIVE_BOOKS, maxPurchasesPerBook: WRITER_MAX_PURCHASES_PER_BOOK } });
  await ensureSchemaOnce(env.DB);
  const row = await upsertPlayer(env.DB, user);
  if (!row) return json({ message: "無法載入玩家資料" }, 500);
  const progress = await ensureProgress(env.DB, row);
  const world = await multiplayer(env.DB);
  const emptyCasino = { capacity: 5, activeCount: 0, seats: [], hand: null };
  const emptyPoker = { capacity: 5, activeCount: 0, seats: [], hand: null, communityCards: [], pot: 0 };
  const [casino, poker, memory, transferRequests, medicalRequests, loanRequests, begRequests, street, aidBoxes, coop, bingo, tournament, loanContract, bookStoreState, reputation, commissions, mystery, contracts, ledger] = await Promise.all([
    row.location === "casino" ? casinoState(env.DB, user.userId) : Promise.resolve(emptyCasino),
    row.location === "casino" ? pokerState(env.DB, user.userId) : Promise.resolve(emptyPoker),
    cityMemory(env.DB),
    pendingTransferRequests(env.DB, user.userId),
    pendingMedicalRequests(env.DB, user.userId),
    pendingLoanRequests(env.DB, user.userId),
    pendingBegRequests(env.DB, user.userId),
    streetState(env.DB, row),
    aidBoxState(env.DB, user.userId),
    coopState(env.DB, row),
    row.location === "casino" ? bingoState(env.DB, user.userId) : Promise.resolve({ status: "lobby", players: [], drawn: [] }),
    row.location === "casino" ? tournamentState(env.DB, user.userId) : Promise.resolve({ status: "lobby", players: [] }),
    activeLoanContract(env.DB, user.userId),
    row.location === "bookstore" ? bookStore(env.DB, user.userId) : Promise.resolve({ books: [], maxActiveBooks: WRITER_MAX_ACTIVE_BOOKS, maxPurchasesPerBook: WRITER_MAX_PURCHASES_PER_BOOK }),
    reputationState(env.DB, row), commissionState(env.DB, row), mysteryState(env.DB, user.userId), contractState(env.DB, row), lifeLedgerState(env.DB, user.userId),
  ]);
  return json({ authenticated: true, profile: profileFor(user), player: serializePlayer(row, progress, loanContract), room: { id: "lobby-01", name: "城市大廳 01" }, ...world, casino, poker, bingo, tournament, cityMemory: memory, transferRequests, medicalRequests, loanRequests, begRequests, street, aidBoxes, coop, reputation, commissions, mystery, contracts, lifeLedger: ledger, bookStore: bookStoreState });
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

  let body: { action?: string; location?: string; territoryLocation?: string; hours?: number; kind?: string; days?: number; job?: string; amount?: number; quantity?: number; itemKey?: string; academy?: string; story?: string; talent?: string; choice?: string; targetId?: string; ownerId?: string; requestId?: string; medicalRequestId?: string; loanRequestId?: string; bookId?: string; commissionId?: string; contractId?: string; title?: string; status?: string };
  try { body = await request.json(); } catch { return json({ message: "行動資料格式錯誤。" }, 400); }
  if ((current.game_over || current.reset_game_over) && body.action !== "reset") return json({ message: current.reset_game_over ? "人生資料正在重置，請稍候再試。" : "這段人生已經結束，請重新開始。" }, 409);
  if (current.main_story === "unselected" && body.action !== "choose_story") return json({ message: "請先選擇人生主線。" }, 409);
  if (current.prison_until > current.elapsed_minutes && body.action !== "reset") return json({ message: `你目前因「${current.prison_crime || "違法行為"}」在監獄服刑，還需在線遊玩 ${Math.ceil((current.prison_until - current.elapsed_minutes) / 60)} 小時。` }, 409);
  if (!["move", "choose_story", "reset", "city_event", "bank", "job", "restaurant", "transfer_request", "transfer_response", "medical_request", "medical_response", "loan_request", "loan_response", "book_publish", "book_toggle", "book_buy", "beg_response", "inventory_use", "street_share_food", "aid_box_donate", "coop_contribute", "story_ack", "contract_create", "contract_accept", "contract_decline", "contract_deposit"].includes(body.action || "") && current.action_available_at > Date.now()) return json({ message: actionWaitMessage(current) }, 409);
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
  let illegalCrime = "";
  let illegalJob = "";
  let illegalIncome = 0;
  let pendingHack: { targetId: string; targetName: string; targetLifeVersion: number; targetRevision: number; amount: number } | null = null;
  let pendingTerritoryVisit: { location: LocationId; cycleDay: number; worldMinute: number } | null = null;
  let pendingTalentSet: string | null = null;
  let pendingCityEvent: { eventId: string; talentExp: number } | null = null;
  let pendingProviderJobCancellation = false;
  let resetStatements: D1PreparedStatement[] = [];
  let pendingLoanContractUpdate: { id: string; previousBalance: number; previousRevision: number; balance: number; closedAt: number | null } | null = null;
  const actionToken = crypto.randomUUID();
  let expectedLifeVersion = current.life_version;
  let expectedRevision = current.updated_at;
  let expectedResetMarker = current.reset_game_over || "";

  switch (body.action) {
    case "city_commission": {
      const commission = CITY_COMMISSIONS.find((item) => item.id === body.commissionId);
      if (!commission || commission.category !== current.job_category) return json({ message: "目前職業沒有這項城市委託。" }, 400);
      if (current.location !== commission.location) return json({ message: "請先前往委託指定地點。" }, 400);
      if (!isLocationOpen(commission.location, worldMinutes())) return json({ message: "委託地點目前已關門，請在營業時間再來。" }, 409);
      if (current.illness) return json({ message: "生病時不能接城市委託，請先治療。" }, 409);
      const day = cityCycleDay();
      const existing = await env.DB.prepare("SELECT 1 AS used FROM city_commission_claims WHERE user_id=? AND cycle_day=? AND commission_id=? AND life_version=?")
        .bind(user.userId, day, commission.id, current.life_version).first<{ used: number }>();
      if (existing) return json({ message: "這份委託今天已完成，明天會有新的機會。" }, 409);
      const reputation = await env.DB.prepare("SELECT points FROM player_reputation WHERE user_id=? AND faction=?").bind(user.userId, commission.faction).first<{ points: number }>();
      const bonus = Math.min(30, Math.floor((reputation?.points ?? 0) / 50) * 10);
      const reward = Math.floor(commission.reward * (1 + bonus / 100));
      const jobExp = current.job_category === "literary" ? current.job_exp : current.job_exp + 10;
      const job = current.job_category === "literary" ? current.current_job : careerForCategory(current.job_category, jobExp, current.current_job).title;
      const now = Math.max(Date.now(), current.updated_at + 1); const token = crypto.randomUUID();
      const results = await env.DB.batch([
        env.DB.prepare(`UPDATE players SET cash=cash+?, job_exp=?, current_job=?, action_available_at=?, action_label='城市委託中', updated_at=?, last_seen_at=?, mutation_token=?
          WHERE user_id=? AND life_version=? AND updated_at=? AND location=? RETURNING user_id`)
          .bind(reward, jobExp, job, Date.now() + 45_000, now, now, token, user.userId, current.life_version, current.updated_at, commission.location),
        env.DB.prepare(`INSERT INTO city_commission_claims (user_id, cycle_day, commission_id, life_version, completed_at)
          SELECT ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM players WHERE user_id=? AND life_version=? AND mutation_token=?)
          ON CONFLICT(user_id, cycle_day, commission_id) DO NOTHING RETURNING commission_id`)
          .bind(user.userId, day, commission.id, current.life_version, now, user.userId, current.life_version, token),
        env.DB.prepare(`INSERT INTO player_reputation (user_id, faction, points, updated_at) SELECT ?, ?, 15, ?
          WHERE EXISTS (SELECT 1 FROM players WHERE user_id=? AND life_version=? AND mutation_token=?)
          ON CONFLICT(user_id, faction) DO UPDATE SET points=player_reputation.points+15, updated_at=excluded.updated_at`)
          .bind(user.userId, commission.faction, now, user.userId, current.life_version, token),
        env.DB.prepare(`UPDATE player_progress SET talent_exp=MIN(1099,talent_exp+5), updated_at=? WHERE user_id=?
          AND EXISTS (SELECT 1 FROM players WHERE user_id=? AND life_version=? AND mutation_token=?)`)
          .bind(now, user.userId, user.userId, current.life_version, token),
      ]);
      if ((results[0]?.results?.length ?? 0) !== 1 || (results[1]?.results?.length ?? 0) !== 1) return json({ message: "委託剛被更新，請重新整理後再試。" }, 409);
      await recordTransferEvent(env.DB, user.userId, current.display_name, "完成城市委託", `${commission.title}完成，獲得 NT$${reward}，${commission.faction}聲望 +15。`, "good");
      return refreshedGameResponse(env.DB, user, `完成「${commission.title}」，獲得 NT$${reward}、${commission.faction}聲望 +15、天賦經驗 +5。`);
    }
    case "contract_create": {
      const target = body.targetId ? await env.DB.prepare("SELECT * FROM players WHERE user_id=?").bind(body.targetId).first<PlayerRow>() : null;
      if (!target || target.user_id === user.userId || target.last_seen_at < Date.now() - ONLINE_HEARTBEAT_GRACE_MS || target.game_over || target.reset_game_over || target.main_story === "unselected") return json({ message: "對方目前無法建立人生契約。" }, 400);
      const stake = 200; const targetPerPlayer = 1000;
      if (current.cash < stake) return json({ message: "建立人生契約需要 NT$200 保證金。" }, 409);
      const busyContract = await env.DB.prepare(`SELECT 1 AS active FROM life_contracts WHERE status IN ('pending','active') AND
        (creator_id IN (?, ?) OR partner_id IN (?, ?)) LIMIT 1`).bind(user.userId, target.user_id, user.userId, target.user_id).first<{ active: number }>();
      if (busyContract) return json({ message: "你或對方已有進行中的人生契約。" }, 409);
      const id = crypto.randomUUID(); const now = Math.max(Date.now(), current.updated_at + 1); const token = crypto.randomUUID();
      const results = await env.DB.batch([
        env.DB.prepare("UPDATE players SET cash=cash-?, updated_at=?, mutation_token=? WHERE user_id=? AND life_version=? AND updated_at=? AND cash>=? RETURNING user_id")
          .bind(stake, now, token, user.userId, current.life_version, current.updated_at, stake),
        env.DB.prepare(`INSERT INTO life_contracts (id, creator_id, creator_name, creator_life_version, partner_id, partner_name, partner_life_version, target_per_player, stake, status, expires_day, resolution_token, created_at, updated_at)
          SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, '', ?, ? WHERE EXISTS (SELECT 1 FROM players WHERE user_id=? AND life_version=? AND mutation_token=?)`)
          .bind(id, user.userId, current.display_name, current.life_version, target.user_id, target.display_name, target.life_version, targetPerPlayer, stake, cityCycleDay() + 3, now, now, user.userId, current.life_version, token),
      ]);
      if ((results[0]?.results?.length ?? 0) !== 1) return json({ message: "建立契約失敗，請重新整理後再試。" }, 409);
      return refreshedGameResponse(env.DB, user, `已向${target.display_name}送出人生契約：各存 NT$1,000，三個城市日內完成可各得 NT$150 獎勵。`);
    }
    case "contract_accept": {
      if (!body.contractId || current.cash < 200) return json({ message: "接受契約需要 NT$200 保證金。" }, 409);
      const contract = await env.DB.prepare("SELECT * FROM life_contracts WHERE id=? AND partner_id=? AND partner_life_version=? AND status='pending'").bind(body.contractId, user.userId, current.life_version).first<LifeContractRow>();
      const creatorActive = contract ? await env.DB.prepare("SELECT 1 AS active FROM players WHERE user_id=? AND life_version=? AND game_over='' AND reset_game_over='' AND main_story<>'unselected'")
        .bind(contract.creator_id, contract.creator_life_version).first<{ active: number }>() : null;
      if (!contract || !creatorActive) return json({ message: "這份人生契約已失效。" }, 409);
      const now = Math.max(Date.now(), current.updated_at + 1); const token = crypto.randomUUID();
      const results = await env.DB.batch([
        env.DB.prepare("UPDATE players SET cash=cash-?, updated_at=?, mutation_token=? WHERE user_id=? AND life_version=? AND updated_at=? AND cash>=? RETURNING user_id").bind(contract.stake, now, token, user.userId, current.life_version, current.updated_at, contract.stake),
        env.DB.prepare("UPDATE life_contracts SET status='active', updated_at=? WHERE id=? AND status='pending' AND partner_id=? AND partner_life_version=? AND EXISTS (SELECT 1 FROM players WHERE user_id=? AND life_version=? AND mutation_token=?) RETURNING id")
          .bind(now, contract.id, user.userId, current.life_version, user.userId, current.life_version, token),
      ]);
      if ((results[0]?.results?.length ?? 0) !== 1 || (results[1]?.results?.length ?? 0) !== 1) return json({ message: "契約狀態剛剛改變，請重新整理後再試。" }, 409);
      return refreshedGameResponse(env.DB, user, "人生契約已生效；雙方各存滿 NT$1,000 前，保證金會暫時保留。 ");
    }
    case "contract_decline": {
      if (!body.contractId) return json({ message: "找不到人生契約。" }, 400);
      const row = await env.DB.prepare("UPDATE life_contracts SET status='declined', updated_at=? WHERE id=? AND partner_id=? AND partner_life_version=? AND status='pending' RETURNING *")
        .bind(Date.now(), body.contractId, user.userId, current.life_version).first<LifeContractRow>();
      if (!row) return json({ message: "這份人生契約已失效。" }, 409);
      await env.DB.prepare("UPDATE players SET cash=cash+? WHERE user_id=? AND life_version=?").bind(row.stake, row.creator_id, row.creator_life_version).run();
      return refreshedGameResponse(env.DB, user, "已拒絕人生契約，對方的保證金已退回。 ");
    }
    case "contract_deposit": {
      if (!body.contractId) return json({ message: "找不到人生契約。" }, 400);
      const row = await env.DB.prepare(`SELECT * FROM life_contracts WHERE id=? AND status='active' AND
        ((creator_id=? AND creator_life_version=?) OR (partner_id=? AND partner_life_version=?))`).bind(body.contractId, user.userId, current.life_version, user.userId, current.life_version).first<LifeContractRow>();
      if (!row || cityCycleDay() > row.expires_day) return json({ message: "這份人生契約已到期。" }, 409);
      const mineCreator = row.creator_id === user.userId; const mineDeposit = mineCreator ? row.creator_deposit : row.partner_deposit;
      const amount = Math.min(Math.max(100, Math.floor(body.amount ?? 100)), row.target_per_player - mineDeposit);
      if (amount <= 0) return json({ message: "你的存入目標已完成。" }, 409);
      if (current.cash < amount) return json({ message: "現金不足，無法存入人生契約。" }, 409);
      const now = Math.max(Date.now(), current.updated_at + 1); const token = crypto.randomUUID();
      const column = mineCreator ? "creator_deposit" : "partner_deposit";
      const results = await env.DB.batch([
        env.DB.prepare("UPDATE players SET cash=cash-?, updated_at=?, mutation_token=? WHERE user_id=? AND life_version=? AND updated_at=? AND cash>=? RETURNING user_id").bind(amount, now, token, user.userId, current.life_version, current.updated_at, amount),
        env.DB.prepare(`UPDATE life_contracts SET ${column}=${column}+?, updated_at=? WHERE id=? AND status='active' AND EXISTS (SELECT 1 FROM players WHERE user_id=? AND life_version=? AND mutation_token=?) RETURNING *`)
          .bind(amount, now, row.id, user.userId, current.life_version, token),
      ]);
      const updated = results[1]?.results?.[0] as LifeContractRow | undefined;
      if ((results[0]?.results?.length ?? 0) !== 1 || !updated) return json({ message: "契約存入失敗，請重新整理後再試。" }, 409);
      if (updated.creator_deposit >= updated.target_per_player && updated.partner_deposit >= updated.target_per_player) {
        const settled = await env.DB.prepare("UPDATE life_contracts SET status='completed', resolution_token=?, updated_at=? WHERE id=? AND status='active' AND creator_deposit>=target_per_player AND partner_deposit>=target_per_player RETURNING *")
          .bind(crypto.randomUUID(), Date.now(), updated.id).first<LifeContractRow>();
        if (settled) await env.DB.batch([
          env.DB.prepare("UPDATE players SET cash=cash+? WHERE user_id=? AND life_version=?").bind(settled.creator_deposit + settled.stake + 150, settled.creator_id, settled.creator_life_version),
          env.DB.prepare("UPDATE players SET cash=cash+? WHERE user_id=? AND life_version=?").bind(settled.partner_deposit + settled.stake + 150, settled.partner_id, settled.partner_life_version),
        ]);
        await recordTransferEvent(env.DB, user.userId, current.display_name, "人生契約完成", `你和${mineCreator ? updated.partner_name : updated.creator_name}一起達成目標，各獲 NT$150 獎勵。`, "good");
        return refreshedGameResponse(env.DB, user, "人生契約完成！雙方的存入金與保證金已退回，並各獲 NT$150 獎勵。 ");
      }
      return refreshedGameResponse(env.DB, user, `已存入 NT$${amount}；你目前 NT$${mineDeposit + amount}／${row.target_per_player}。`);
    }
    case "street_scavenge": {
      if (current.job_category !== "street" || current.location !== "underpass") return json({ message: "只有街頭生存職業能在車站地下道拾荒。" }, 400);
      const personalDay = Math.floor(current.elapsed_minutes / 1440) + 1;
      const used = current.street_day === personalDay ? current.street_scavenges : 0;
      const maximum = streetScavengeLimitFor(current.current_job);
      if (used >= maximum) return json({ message: `今天已完成 ${maximum} 次拾荒，下一個玩家遊玩日再來。` }, 409);
      const rank = streetRankIndex(current.current_job);
      const roll = crypto.getRandomValues(new Uint32Array(1))[0] / 4_294_967_296;
      let itemKey: keyof typeof STREET_INVENTORY | "" = ""; let quantity = 0; let cashGain = 0; let findText = "什麼也沒找到";
      if (roll < .28) { itemKey = "can"; quantity = 1 + Math.floor(Math.random() * 3); findText = `${quantity} 個空罐`; }
      else if (roll < .50) { itemKey = "food"; quantity = 1; findText = "一份還能食用的食物"; }
      else if (roll < .70) { cashGain = 20 + Math.floor(Math.random() * 61); findText = `NT$${cashGain}`; }
      else if (rank >= 1 && roll < .82) { itemKey = "scratch"; quantity = 1; findText = "一張免費彩券"; }
      else if (rank >= 2 && roll < .94) { itemKey = "secondhand"; quantity = 1; findText = "一件二手物品"; }
      else if (rank >= 3 && roll < .98) { itemKey = "rare"; quantity = 1; findText = "一件稀有收藏品"; }
      const newExp = current.job_exp + 10; const newJob = careerForCategory("street", newExp, current.current_job).title;
      const now = Math.max(Date.now(), current.updated_at + 1); const token = crypto.randomUUID();
      const statements = [env.DB.prepare(`UPDATE players SET cash=cash+?, street_day=?, street_scavenges=?, job_exp=?, current_job=?,
          action_available_at=?, action_label='拾荒中', updated_at=?, last_seen_at=?, mutation_token=?
        WHERE user_id=? AND life_version=? AND updated_at=? AND job_category='street' AND location='underpass'
        RETURNING user_id`).bind(cashGain, personalDay, used + 1, newExp, newJob, Date.now() + STREET_SCAVENGE_WAIT_SECONDS * 1000,
          now, now, token, user.userId, current.life_version, current.updated_at)];
      if (itemKey) statements.push(env.DB.prepare(`INSERT INTO player_inventory (user_id,item_key,quantity,life_version,updated_at)
        SELECT ?,?,?,?,? WHERE EXISTS (SELECT 1 FROM players WHERE user_id=? AND life_version=? AND mutation_token=?)
        ON CONFLICT(user_id,item_key) DO UPDATE SET quantity=player_inventory.quantity+excluded.quantity,
          life_version=excluded.life_version, updated_at=excluded.updated_at
        RETURNING item_key`).bind(user.userId, itemKey, quantity, current.life_version, now, user.userId, current.life_version, token));
      const results = await env.DB.batch(statements);
      if ((results[0]?.results?.length ?? 0) !== 1 || (itemKey && (results[1]?.results?.length ?? 0) !== 1)) return json({ message: "拾荒狀態剛剛改變，請再試一次。" }, 409);
      return refreshedGameResponse(env.DB, user, `拾荒找到${findText}，街頭聲望 +10。${newJob !== current.current_job ? ` 你已晉升為${newJob}。` : ""}`);
    }
    case "inventory_use": {
      const key = body.itemKey as keyof typeof STREET_INVENTORY;
      if (!["food", "scratch"].includes(key)) return json({ message: "這項物品不能直接使用。" }, 400);
      const now = Date.now(); const token = crypto.randomUUID(); const prize = key === "scratch" ? scratchPrize() : 0;
      const results = await env.DB.batch([
        env.DB.prepare(`UPDATE player_inventory SET quantity=quantity-1, updated_at=?
          WHERE user_id=? AND item_key=? AND life_version=? AND quantity>0 RETURNING quantity`).bind(now, user.userId, key, current.life_version),
        env.DB.prepare(`UPDATE players SET hunger=MIN(100,hunger+?), cash=cash+?, updated_at=MAX(updated_at+1,?), mutation_token=?
          WHERE user_id=? AND life_version=? AND EXISTS (SELECT 1 FROM player_inventory WHERE user_id=? AND item_key=? AND life_version=? AND updated_at=?)
          RETURNING user_id`).bind(key === "food" ? STREET_INVENTORY.food.hunger : 0, prize, now, token, user.userId, current.life_version,
            user.userId, key, current.life_version, now),
      ]);
      if ((results[0]?.results?.length ?? 0) !== 1 || (results[1]?.results?.length ?? 0) !== 1) return json({ message: "背包裡沒有這項物品。" }, 409);
      return refreshedGameResponse(env.DB, user, key === "food" ? `吃下街頭食物，飽食度 +${STREET_INVENTORY.food.hunger}。` : `免費彩券開獎：${prize ? `獲得 NT$${prize}` : "這次沒有中獎"}。`, { scratch: key === "scratch" ? { price: 0, prize } : null });
    }
    case "inventory_sell": {
      const key = body.itemKey as keyof typeof STREET_INVENTORY; const quantity = Math.floor(Number(body.quantity ?? 1));
      if (current.location !== "shopping" || !isLocationOpen("shopping", sharedMinutes)) return json({ message: `請在購物街營業時間內出售物品（${OPENING_HOURS.shopping?.label}）。` }, 400);
      if (!["can", "secondhand", "rare"].includes(key) || quantity < 1 || quantity > 99) return json({ message: "出售物品或數量不正確。" }, 400);
      const sellPrices: Partial<Record<keyof typeof STREET_INVENTORY, number>> = { can: streetCanSellPriceFor(current.current_job), secondhand: STREET_INVENTORY.secondhand.sellPrice, rare: STREET_INVENTORY.rare.sellPrice };
      const price = sellPrices[key] ?? 0;
      const now = Date.now(); const token = crypto.randomUUID();
      const results = await env.DB.batch([
        env.DB.prepare(`UPDATE player_inventory SET quantity=quantity-?, updated_at=? WHERE user_id=? AND item_key=? AND life_version=? AND quantity>=? RETURNING quantity`)
          .bind(quantity, now, user.userId, key, current.life_version, quantity),
        env.DB.prepare(`UPDATE players SET cash=cash+?, updated_at=MAX(updated_at+1,?), mutation_token=? WHERE user_id=? AND life_version=?
          AND EXISTS (SELECT 1 FROM player_inventory WHERE user_id=? AND item_key=? AND life_version=? AND updated_at=?) RETURNING user_id`)
          .bind(price * quantity, now, token, user.userId, current.life_version, user.userId, key, current.life_version, now),
      ]);
      if ((results[0]?.results?.length ?? 0) !== 1 || (results[1]?.results?.length ?? 0) !== 1) return json({ message: "物品數量不足，沒有完成出售。" }, 409);
      return refreshedGameResponse(env.DB, user, `出售 ${quantity} 件${STREET_INVENTORY[key].name}，獲得 NT$${price * quantity}。`);
    }
    case "beg_request": {
      if (current.job_category !== "street") return json({ message: "只有街頭生存職業可以向其他玩家乞討。" }, 400);
      if (!body.targetId || body.targetId === user.userId) return json({ message: "請選擇另一位在線玩家。" }, 400);
      const personalDay = Math.floor(current.elapsed_minutes / 1440) + 1;
      const income = current.street_day === personalDay ? current.street_beg_income : 0;
      if (income >= streetBegDailyCapFor(current.current_job)) return json({ message: "今天的乞討收入已達上限。" }, 409);
      const target = await env.DB.prepare(`SELECT user_id,life_version FROM players WHERE user_id=? AND last_seen_at>=? AND game_over='' AND reset_game_over='' AND main_story<>'unselected'`)
        .bind(body.targetId, Date.now() - ONLINE_HEARTBEAT_GRACE_MS).first<{ user_id: string; life_version: number }>();
      if (!target) return json({ message: "對方目前不在線上。" }, 409);
      const recent = await env.DB.prepare("SELECT id FROM street_beg_requests WHERE requester_id=? AND recipient_id=? AND created_at>? LIMIT 1")
        .bind(user.userId, target.user_id, Date.now() - STREET_BEG_PAIR_COOLDOWN_MS).first<{ id: string }>();
      if (recent) return json({ message: "同一位玩家 10 分鐘內只能乞討一次。" }, 409);
      const pending = await env.DB.prepare("SELECT id FROM street_beg_requests WHERE recipient_id=? AND status='pending' AND expires_at>? LIMIT 1").bind(target.user_id, Date.now()).first<{ id: string }>();
      if (pending) return json({ message: "對方正在處理另一個乞討請求。" }, 409);
      const now = Date.now();
      await env.DB.prepare(`INSERT INTO street_beg_requests (id,requester_id,requester_name,recipient_id,requester_job,requester_life_version,recipient_life_version,created_at,expires_at)
        VALUES (?,?,?,?,?,?,?,?,?)`).bind(crypto.randomUUID(), user.userId, user.displayName.slice(0, 40), target.user_id, current.current_job, current.life_version, target.life_version, now, now + STREET_BEG_REQUEST_TIMEOUT_MS).run();
      return refreshedGameResponse(env.DB, user, "乞討請求已送出，對方可選擇給錢、拒絕或羞辱；30 秒後自動失效。");
    }
    case "beg_response": {
      if (!body.requestId || !["give", "decline", "humiliate"].includes(body.kind || "")) return json({ message: "乞討回覆不正確。" }, 400);
      const now = Date.now(); const token = crypto.randomUUID();
      const requestRow = await env.DB.prepare(`UPDATE street_beg_requests SET status='processing', resolution_token=?, resolved_at=?
        WHERE id=? AND recipient_id=? AND recipient_life_version=? AND status='pending' AND expires_at>? RETURNING *`)
        .bind(token, now, body.requestId, user.userId, current.life_version, now).first<BegRequestRow>();
      if (!requestRow) return json({ message: "這項乞討請求已失效或處理完畢。" }, 409);
      if (body.kind !== "give") {
        await env.DB.prepare("UPDATE street_beg_requests SET status='resolved', outcome=?, resolved_at=? WHERE id=? AND status='processing' AND resolution_token=?")
          .bind(body.kind, now, requestRow.id, token).run();
        return refreshedGameResponse(env.DB, user, body.kind === "decline" ? "你拒絕了這次乞討。" : "你選擇羞辱對方；不會造成任何數值損失。");
      }
      const amount = Math.floor(Number(body.amount ?? 0));
      if (!streetBegDonationsFor(requestRow.requester_job).includes(amount as never)) {
        await env.DB.prepare("UPDATE street_beg_requests SET status='pending', resolution_token='', resolved_at=NULL WHERE id=? AND resolution_token=?").bind(requestRow.id, token).run();
        return json({ message: "給予金額不在可選範圍。" }, 400);
      }
      const requester = await env.DB.prepare("SELECT * FROM players WHERE user_id=? AND life_version=? AND job_category='street' AND game_over='' AND reset_game_over=''")
        .bind(requestRow.requester_id, requestRow.requester_life_version).first<PlayerRow>();
      const requesterDay = requester ? Math.floor(requester.elapsed_minutes / 1440) + 1 : 0;
      const requesterIncome = requester && requester.street_day === requesterDay ? requester.street_beg_income : 0;
      const cap = requester ? streetBegDailyCapFor(requester.current_job) : 0;
      const granted = Math.min(amount, Math.max(0, cap - requesterIncome));
      if (!requester || granted <= 0 || current.cash < granted) {
        await env.DB.prepare("UPDATE street_beg_requests SET status='cancelled', outcome='unavailable', resolved_at=? WHERE id=? AND resolution_token=?").bind(now, requestRow.id, token).run();
        return json({ message: current.cash < granted ? "你的現金不足，無法給予這筆金額。" : "對方已離線、換職或達到今日上限。" }, 409);
      }
      const nextExp = requester.job_exp + 10; const nextJob = careerForCategory("street", nextExp, requester.current_job).title;
      const results = await env.DB.batch([
        env.DB.prepare("UPDATE players SET cash=cash-?, updated_at=MAX(updated_at+1,?), mutation_token=? WHERE user_id=? AND life_version=? AND cash>=? RETURNING user_id")
          .bind(granted, now, token, user.userId, current.life_version, granted),
        env.DB.prepare(`UPDATE players SET cash=cash+?, street_day=?, street_beg_income=?, job_exp=?, current_job=?, updated_at=MAX(updated_at+1,?), mutation_token=?
          WHERE user_id=? AND life_version=? AND job_category='street' AND game_over='' AND reset_game_over=''
          AND EXISTS (SELECT 1 FROM players WHERE user_id=? AND life_version=? AND mutation_token=?) RETURNING user_id`)
          .bind(granted, requesterDay, requesterIncome + granted, nextExp, nextJob, now, token, requester.user_id, requester.life_version,
            user.userId, current.life_version, token),
        env.DB.prepare(`UPDATE street_beg_requests SET status='resolved', outcome='give', amount=?, resolved_at=?
          WHERE id=? AND status='processing' AND resolution_token=?
          AND EXISTS (SELECT 1 FROM players WHERE user_id=? AND life_version=? AND mutation_token=?) RETURNING id`)
          .bind(granted, now, requestRow.id, token, requester.user_id, requester.life_version, token),
      ]);
      if (results.some((result) => (result?.results?.length ?? 0) !== 1)) return json({ message: "付款狀態剛剛改變，請重新整理確認。" }, 409);
      return refreshedGameResponse(env.DB, user, `你給了${requestRow.requester_name} NT$${granted}。`);
    }
    case "street_share_food": {
      if (current.job_category !== "street" || streetRankIndex(current.current_job) < 2 || !body.targetId || body.targetId === user.userId) return json({ message: "丐幫長老以上才能分享食物給其他玩家。" }, 400);
      const target = await env.DB.prepare("SELECT user_id,life_version FROM players WHERE user_id=? AND last_seen_at>=? AND game_over='' AND reset_game_over=''")
        .bind(body.targetId, Date.now() - ONLINE_HEARTBEAT_GRACE_MS).first<{ user_id: string; life_version: number }>();
      if (!target) return json({ message: "對方目前不在線上。" }, 409);
      const now = Date.now(); const token = crypto.randomUUID();
      const results = await env.DB.batch([
        env.DB.prepare("UPDATE player_inventory SET quantity=quantity-1, updated_at=? WHERE user_id=? AND item_key='food' AND life_version=? AND quantity>0 RETURNING quantity").bind(now, user.userId, current.life_version),
        env.DB.prepare(`UPDATE players SET hunger=MIN(100,hunger+25), updated_at=MAX(updated_at+1,?), mutation_token=? WHERE user_id=? AND life_version=?
          AND EXISTS (SELECT 1 FROM player_inventory WHERE user_id=? AND item_key='food' AND life_version=? AND updated_at=?) RETURNING user_id`)
          .bind(now, token, target.user_id, target.life_version, user.userId, current.life_version, now),
      ]);
      if (results.some((result) => (result?.results?.length ?? 0) !== 1)) return json({ message: "食物不足或對方狀態已改變。" }, 409);
      return refreshedGameResponse(env.DB, user, "已分享一份食物，對方飽食度 +25。");
    }
    case "aid_box_open": {
      if (current.current_job !== "丐幫幫主" || current.job_category !== "street" || current.location !== "underpass") return json({ message: "只有丐幫幫主能在車站地下道開設互助箱。" }, 400);
      const day = cityCycleDay(); const result = await env.DB.prepare(`INSERT INTO street_aid_boxes (owner_id,cycle_day,owner_name,owner_life_version,updated_at)
        VALUES (?,?,?,?,?) ON CONFLICT(owner_id,cycle_day) DO NOTHING RETURNING owner_id`)
        .bind(user.userId, day, user.displayName.slice(0, 40), current.life_version, Date.now()).first<{ owner_id: string }>();
      if (!result) return json({ message: "今天已開設過互助箱。" }, 409);
      return refreshedGameResponse(env.DB, user, "今日互助箱已開放，其他玩家可自願捐助，每人一次、每日最多累積 NT$2,000。");
    }
    case "aid_box_donate": {
      const amount = Math.floor(Number(body.amount ?? 0)); const day = cityCycleDay();
      if (current.location !== "underpass" || !body.ownerId || body.ownerId === user.userId || ![50, 100, 200].includes(amount)) return json({ message: "請在車站地下道選擇有效互助箱與捐助金額。" }, 400);
      const box = await env.DB.prepare("SELECT owner_id,owner_life_version,total_received FROM street_aid_boxes WHERE owner_id=? AND cycle_day=? AND status='active'")
        .bind(body.ownerId, day).first<{ owner_id: string; owner_life_version: number; total_received: number }>();
      const granted = box ? Math.min(amount, 2_000 - box.total_received) : 0;
      if (!box || granted <= 0 || current.cash < granted) return json({ message: "互助箱已滿、已失效，或你的現金不足。" }, 409);
      const now = Date.now(); const token = crypto.randomUUID();
      const results = await env.DB.batch([
        env.DB.prepare(`INSERT INTO street_aid_donations (owner_id,cycle_day,donor_id,amount,action_token,donated_at)
          VALUES (?,?,?,?,?,?) ON CONFLICT(owner_id,cycle_day,donor_id) DO NOTHING RETURNING donor_id`).bind(box.owner_id, day, user.userId, granted, token, now),
        env.DB.prepare(`UPDATE players SET cash=cash-?, updated_at=MAX(updated_at+1,?), mutation_token=? WHERE user_id=? AND life_version=? AND cash>=?
          AND EXISTS (SELECT 1 FROM street_aid_donations WHERE owner_id=? AND cycle_day=? AND donor_id=? AND action_token=?) RETURNING user_id`)
          .bind(granted, now, token, user.userId, current.life_version, granted, box.owner_id, day, user.userId, token),
        env.DB.prepare(`UPDATE players SET cash=cash+?, updated_at=MAX(updated_at+1,?), mutation_token=? WHERE user_id=? AND life_version=? AND current_job='丐幫幫主'
          AND EXISTS (SELECT 1 FROM players WHERE user_id=? AND life_version=? AND mutation_token=?) RETURNING user_id`)
          .bind(granted, now, token, box.owner_id, box.owner_life_version, user.userId, current.life_version, token),
        env.DB.prepare(`UPDATE street_aid_boxes SET total_received=total_received+?, updated_at=? WHERE owner_id=? AND cycle_day=? AND total_received+?<=2000
          AND EXISTS (SELECT 1 FROM players WHERE user_id=? AND life_version=? AND mutation_token=?) RETURNING total_received`)
          .bind(granted, now, box.owner_id, day, granted, box.owner_id, box.owner_life_version, token),
      ]);
      if (results.some((result) => (result?.results?.length ?? 0) !== 1)) return json({ message: "你今天已捐過，或互助箱狀態剛剛改變。" }, 409);
      return refreshedGameResponse(env.DB, user, `已自願捐助 NT$${granted}。`);
    }
    case "coop_contribute": {
      const role = COOP_ROLES.find((item) => item.category === current.job_category);
      if (!role) return json({ message: "目前職業無法承擔今日合作計畫的四個分工。" }, 400);
      const day = cityCycleDay(); const now = Date.now();
      const inserted = await env.DB.prepare(`INSERT INTO city_coop_contributions (cycle_day,role,user_id,player_name,job_category,life_version,contributed_at)
        SELECT ?,?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM city_coop_projects WHERE cycle_day=? AND status='open')
        ON CONFLICT DO NOTHING RETURNING role`).bind(day, role.id, user.userId, user.displayName.slice(0, 40), current.job_category, current.life_version, now, day).first<{ role: string }>();
      if (!inserted) return json({ message: "這個分工已有人完成，或你今天已參與過。" }, 409);
      const count = await env.DB.prepare("SELECT COUNT(*) AS count FROM city_coop_contributions WHERE cycle_day=?").bind(day).first<{ count: number }>();
      let messageText = `已完成「${role.label}」分工。`;
      if ((count?.count ?? 0) >= COOP_ROLES.length) {
        const completionToken = crypto.randomUUID();
        const claimed = await env.DB.prepare("UPDATE city_coop_projects SET status='completed',completed_at=?,completion_token=?,updated_at=? WHERE cycle_day=? AND status='open' RETURNING cycle_day")
          .bind(now, completionToken, now, day).first<{ cycle_day: number }>();
        if (claimed) {
          const contributors = await env.DB.prepare("SELECT user_id,life_version FROM city_coop_contributions WHERE cycle_day=?").bind(day).all<{ user_id: string; life_version: number }>();
          await env.DB.batch(contributors.results.map((contributor) => env.DB!.prepare(`UPDATE players SET cash=cash+600, updated_at=MAX(updated_at+1,?)
            WHERE user_id=? AND life_version=? AND EXISTS (SELECT 1 FROM city_coop_projects WHERE cycle_day=? AND completion_token=?)`).bind(now, contributor.user_id, contributor.life_version, day, completionToken)));
          await env.DB.batch(contributors.results.map((contributor) => env.DB!.prepare(`UPDATE player_progress SET talent_exp=MIN(1099,talent_exp+8),updated_at=?
            WHERE user_id=? AND EXISTS (SELECT 1 FROM players WHERE user_id=? AND life_version=?)
              AND EXISTS (SELECT 1 FROM city_coop_projects WHERE cycle_day=? AND completion_token=?)`).bind(now, contributor.user_id, contributor.user_id, contributor.life_version, day, completionToken)));
          messageText += " 四種職業已共同完成計畫，全員獲得 NT$600 與天賦經驗 +8。";
        }
      }
      return refreshedGameResponse(env.DB, user, messageText);
    }
    case "story_ack": {
      await env.DB.prepare("UPDATE player_progress SET story_seen_chapter=story_chapter,updated_at=? WHERE user_id=?").bind(Date.now(), user.userId).run();
      return refreshedGameResponse(env.DB, user, "主線章節已收進人生紀錄。");
    }
    case "crime_hack": {
      if (next.job_category !== "crime" || next.current_job !== "駭客") return json({ message: "只有駭客可以執行這項行動。" }, 400);
      if (!body.targetId || body.targetId === user.userId) return json({ message: "請選擇其他玩家。" }, 400);
      const target = await env.DB.prepare("SELECT user_id, display_name, cash, last_seen_at, location, main_story, game_over, reset_game_over, life_version, updated_at FROM players WHERE user_id=?")
        .bind(body.targetId).first<{ user_id: string; display_name: string; cash: number; last_seen_at: number; location: LocationId; main_story: string; game_over: string; reset_game_over: string; life_version: number; updated_at: number }>();
      if (!target || target.last_seen_at < Date.now() - ONLINE_HEARTBEAT_GRACE_MS || target.location === "prison" || target.main_story === "unselected" || target.game_over || target.reset_game_over) return json({ message: "這位玩家目前不在線上或無法成為目標。" }, 409);
      const personalDay = Math.floor(next.elapsed_minutes / 1440) + 1;
      if (next.hack_day !== personalDay) { next.hack_day = personalDay; next.hack_uses = 0; }
      if (next.hack_uses >= HACK_DAILY_LIMIT) return json({ message: `今天最多只能嘗試 ${HACK_DAILY_LIMIT} 次駭客竊取。` }, 409);
      next.hack_uses += 1;
      illegalCrime = `駭客竊取（目標：${target.display_name}）`;
      illegalJob = "駭客";
      minutes = 60;
      if (target.cash <= 0 || Math.random() >= HACK_SUCCESS_CHANCE) {
        title = "駭客行動失敗";
        message = `你嘗試從${target.display_name}的現金中竊取資金，但沒有成功。`;
      } else {
        const amount = Math.min(HACK_MAX_STEAL, Math.max(1, Math.floor(target.cash * HACK_STEAL_RATE)));
        pendingHack = { targetId: target.user_id, targetName: target.display_name, targetLifeVersion: target.life_version, targetRevision: target.updated_at, amount };
        title = "駭客行動完成";
        message = `你完成對${target.display_name}的駭客竊取，正在確認可取得的現金。`;
      }
      break;
    }
    case "territory": {
      if (body.kind !== "set") return json({ message: "地盤服務不存在。" }, 400);
      if (next.location !== "business") return json({ message: "請先前往工作地設定地盤。" }, 400);
      if (!isLocationOpen("business", sharedMinutes)) return json({ message: `工作地營業時間為 ${OPENING_HOURS.business?.label}。` }, 400);
      if (next.job_category !== "crime" || next.current_job !== "大橋頭營運長") return json({ message: "只有大橋頭營運長可以設定地盤。" }, 400);
      const territory = body.territoryLocation as LocationId;
      if (!TERRITORY_LOCATIONS.has(territory)) return json({ message: "這個地點不能設為地盤。" }, 400);
      if (next.territory_location === territory) return json({ message: "這裡已經是你的地盤。" }, 409);
      const occupied = await env.DB.prepare(`SELECT display_name FROM players
        WHERE territory_location=? AND current_job='大橋頭營運長' AND job_category='crime' AND user_id<>? LIMIT 1`)
        .bind(territory, user.userId).first<{ display_name: string }>();
      if (occupied) return json({ message: `這個地點已由${occupied.display_name}營運，請選擇其他地盤。` }, 409);
      const cityDay = Math.floor(sharedMinutes / 1440) + 1;
      const claimedTerritory = await env.DB.prepare(`UPDATE players SET
        territory_pending=territory_pending+CASE WHEN territory_day>0 AND territory_day<? THEN territory_income ELSE 0 END,
        territory_visits=CASE WHEN territory_day=? THEN territory_visits ELSE 0 END,
        territory_income=CASE WHEN territory_day=? THEN territory_income ELSE 0 END,
        territory_day=?, territory_location=?, updated_at=?, mutation_token=?
        WHERE user_id=? AND current_job='大橋頭營運長' AND job_category='crime'
          AND life_version=? AND updated_at=? AND reset_game_over='' AND game_over=''
          AND NOT EXISTS (SELECT 1 FROM players owner WHERE owner.territory_location=? AND owner.current_job='大橋頭營運長' AND owner.job_category='crime' AND owner.user_id<>?)
        RETURNING territory_location, territory_day, territory_visits, territory_income, territory_pending, updated_at`)
        .bind(cityDay, cityDay, cityDay, cityDay, territory, Date.now(), actionToken, user.userId,
          current.life_version, expectedRevision, territory, user.userId)
        .first<{ territory_location: string; territory_day: number; territory_visits: number; territory_income: number; territory_pending: number; updated_at: number }>();
      if (!claimedTerritory) return json({ message: "這個地點剛被其他營運長選走，請選擇其他地盤。" }, 409);
      next.territory_location = claimedTerritory.territory_location;
      next.territory_day = claimedTerritory.territory_day;
      next.territory_visits = claimedTerritory.territory_visits;
      next.territory_income = claimedTerritory.territory_income;
      next.territory_pending = claimedTerritory.territory_pending;
      next.updated_at = claimedTerritory.updated_at;
      expectedRevision = claimedTerritory.updated_at;
      illegalCrime = `地盤營運（${territory}）`;
      illegalJob = "大橋頭營運長";
      minutes = 30;
      title = "設定大橋頭地盤";
      message = `你把${territory}列為地盤；其他玩家進入時會留下紀錄，每次累積 NT$${TERRITORY_VISIT_REWARD}，每日上限 NT$${TERRITORY_DAILY_CAP}。`;
      break;
    }
    case "restaurant": {
      if (body.kind !== "buy") return json({ message: "餐廳服務不存在。" }, 400);
      if (next.location !== "business") return json({ message: "請先前往工作地購買餐廳。" }, 400);
      if (!isLocationOpen("business", sharedMinutes)) return json({ message: `工作地營業時間為 ${OPENING_HOURS.business?.label}。` }, 400);
      if (next.job_category !== "hospitality" || next.current_job !== "餐廳老闆") return json({ message: "只有餐廳老闆可以購買餐廳。" }, 400);
      if (next.owns_restaurant) return json({ message: "你已經擁有一間餐廳。" }, 409);
      if (next.cash < RESTAURANT_PURCHASE_PRICE) return json({ message: `購買餐廳需要 NT$${RESTAURANT_PURCHASE_PRICE.toLocaleString("zh-TW")}。` }, 400);
      next.cash -= RESTAURANT_PURCHASE_PRICE;
      next.owns_restaurant = 1;
      title = "買下餐廳";
      message = `支付 NT$${RESTAURANT_PURCHASE_PRICE.toLocaleString("zh-TW")}，取得自有餐廳。從下一個在線遊玩日開始，每日結算淨收益 NT$${RESTAURANT_DAILY_NET.toLocaleString("zh-TW")}。`;
      break;
    }
    case "writer_write": {
      if (next.location !== "business") return json({ message: "請先前往工作地寫作。" }, 400);
      if (!isLocationOpen("business", sharedMinutes)) return json({ message: `工作地營業時間為 ${OPENING_HOURS.business?.label}。` }, 400);
      if (next.job_category !== "literary" || !writerFanRangeFor(next.current_job)) return json({ message: "只有文學作家職業可以寫作。" }, 400);
      if (next.illness) return json({ message: `目前罹患${next.illness}，請先前往醫院治療。` }, 400);
      if (next.writer_writes >= WRITER_DAILY_WRITING_LIMIT) return json({ message: "今天的兩次寫作機會都已使用，下一個遊玩日才能再次寫作。" }, 409);
      if (next.energy < 5) return json({ message: "體力不足，先休息一下再寫作吧。" }, 400);
      const previousCareer = careerForCategory("literary", next.writer_fans, next.current_job);
      const gainedFans = randomWriterFans(next.current_job);
      next.writer_fans += gainedFans;
      next.writer_writes += 1;
      next.job_exp = next.writer_fans;
      next.energy = clampEnergy(next.energy - 5);
      next.health = clamp(next.health - 1);
      next.hunger = clamp(next.hunger - 2);
      minutes = 30;
      const newCareer = careerForCategory("literary", next.writer_fans, next.current_job);
      next.current_job = newCareer.title;
      if (newCareer.title !== previousCareer.title) talentExpGain += 10;
      title = newCareer.title !== previousCareer.title ? `升級為${newCareer.title}` : "完成今日寫作";
      message = `完成第 ${next.writer_writes} 次寫作：粉絲 +${gainedFans}，目前粉絲 ${next.writer_fans}。${newCareer.title !== previousCareer.title ? ` 恭喜成為${newCareer.title}！` : `今日還可寫作 ${WRITER_DAILY_WRITING_LIMIT - next.writer_writes} 次。`}`;
      break;
    }
    case "book_publish": {
      if (next.location !== "bookstore") return json({ message: "請先前往城市書店出版作品。" }, 400);
      if (!isLocationOpen("bookstore", sharedMinutes)) return json({ message: `城市書店營業時間為 ${OPENING_HOURS.bookstore?.label}。` }, 400);
      const price = writerBookPriceFor(next.current_job);
      const titleText = typeof body.title === "string" ? body.title.trim().replace(/\s+/g, " ") : "";
      if (next.job_category !== "literary" || price === null) return json({ message: "升至簽約作家後才能出版書籍。" }, 400);
      if (!titleText || titleText.length > 40) return json({ message: "書籍名稱需為 1～40 個字。" }, 400);
      const bookCount = await env.DB.prepare("SELECT COUNT(*) AS count FROM writer_books WHERE author_id=? AND author_life_version=?").bind(user.userId, current.life_version).first<{ count: number }>();
      if (Number(bookCount?.count ?? 0) >= WRITER_MAX_ACTIVE_BOOKS) return json({ message: `每位作者最多建立 ${WRITER_MAX_ACTIVE_BOOKS} 本書；下架不會增加出版名額。` }, 409);
      const duplicate = await env.DB.prepare("SELECT id FROM writer_books WHERE author_id=? AND author_life_version=? AND title=? LIMIT 1").bind(user.userId, current.life_version, titleText).first<{ id: string }>();
      if (duplicate) return json({ message: "你已經建立過一本同名書籍。" }, 409);
      const now = Date.now();
      const published = await env.DB.prepare(`INSERT INTO writer_books (id, author_id, author_name, author_life_version, title, price, status, created_at, updated_at)
        SELECT ?, ?, ?, ?, ?, ?, 'active', ?, ? WHERE EXISTS (
          SELECT 1 FROM players WHERE user_id=? AND life_version=? AND reset_game_over='' AND game_over=''
        ) RETURNING id`).bind(crypto.randomUUID(), user.userId, user.displayName.slice(0, 40), current.life_version,
          titleText, price, now, now, user.userId, current.life_version).first<{ id: string }>();
      if (!published) return json({ message: "人生狀態剛剛改變，新書沒有建立。" }, 409);
      title = "新書上架"; message = `《${titleText}》已上架書店，售價 NT$${price}。`;
      break;
    }
    case "book_toggle": {
      if (next.location !== "bookstore") return json({ message: "請先前往城市書店管理作品。" }, 400);
      if (!isLocationOpen("bookstore", sharedMinutes)) return json({ message: `城市書店營業時間為 ${OPENING_HOURS.bookstore?.label}。` }, 400);
      if (!body.bookId || !["active", "hidden"].includes(body.status || "")) return json({ message: "書籍上架狀態不正確。" }, 400);
      const updatedBook = await env.DB.prepare(`UPDATE writer_books SET status=?, updated_at=?
        WHERE id=? AND author_id=? AND author_life_version=?
          AND EXISTS (SELECT 1 FROM players WHERE user_id=? AND life_version=? AND reset_game_over='' AND game_over='')
        RETURNING title, status`).bind(body.status, Date.now(), body.bookId, user.userId, current.life_version,
          user.userId, current.life_version).first<{ title: string; status: string }>();
      if (!updatedBook) return json({ message: "找不到這本書或你不是作者。" }, 404);
      title = updatedBook.status === "active" ? "書籍上架" : "書籍下架"; message = `《${updatedBook.title}》已${updatedBook.status === "active" ? "上架" : "下架"}。`;
      break;
    }
    case "book_buy": {
      if (next.location !== "bookstore") return json({ message: "請先前往城市書店。" }, 400);
      if (!isLocationOpen("bookstore", sharedMinutes)) return json({ message: `城市書店營業時間為 ${OPENING_HOURS.bookstore?.label}。` }, 400);
      if (!body.bookId) return json({ message: "請選擇要購買的書籍。" }, 400);
      const book = await env.DB.prepare("SELECT id, author_id, author_name, author_life_version, title, price, status FROM writer_books WHERE id=?").bind(body.bookId).first<WriterBookRow>();
      if (!book || book.status !== "active") return json({ message: "這本書目前沒有上架。" }, 409);
      if (book.author_id === user.userId) return json({ message: "作者不能購買自己的書。" }, 400);
      const author = await env.DB.prepare("SELECT life_version, reset_game_over, game_over FROM players WHERE user_id=?")
        .bind(book.author_id).first<{ life_version: number; reset_game_over: string; game_over: string }>();
      if (!author || author.life_version !== book.author_life_version || author.reset_game_over || author.game_over) return json({ message: "作者目前無法完成交易。" }, 409);
      const owned = await env.DB.prepare("SELECT quantity, updated_at FROM writer_book_purchases WHERE book_id=? AND buyer_id=?")
        .bind(book.id, user.userId).first<{ quantity: number; updated_at: number }>();
      if (Number(owned?.quantity ?? 0) >= WRITER_MAX_PURCHASES_PER_BOOK) return json({ message: `每位玩家每本書最多購買 ${WRITER_MAX_PURCHASES_PER_BOOK} 次。` }, 409);
      const purchaseNow = Math.max(Date.now(), Number(owned?.updated_at ?? 0) + 1);
      const purchaseToken = crypto.randomUUID();
      const purchase = await env.DB.batch([
        env.DB.prepare(`INSERT INTO writer_book_purchases
          (book_id, buyer_id, author_id, buyer_life_version, author_life_version, quantity, updated_at, purchase_token)
          SELECT ?, ?, ?, ?, ?, 1, ?, ? WHERE
            EXISTS (SELECT 1 FROM writer_books WHERE id=? AND status='active' AND author_id=? AND author_life_version=?)
            AND EXISTS (SELECT 1 FROM players WHERE user_id=? AND life_version=? AND cash>=? AND reset_game_over='' AND game_over='')
            AND EXISTS (SELECT 1 FROM players WHERE user_id=? AND life_version=? AND reset_game_over='' AND game_over='')
          ON CONFLICT(book_id, buyer_id) DO UPDATE SET quantity=quantity+1, updated_at=excluded.updated_at, purchase_token=excluded.purchase_token
          WHERE writer_book_purchases.quantity < ? AND writer_book_purchases.buyer_life_version=excluded.buyer_life_version
            AND writer_book_purchases.author_life_version=excluded.author_life_version
          RETURNING quantity`).bind(book.id, user.userId, book.author_id, current.life_version, book.author_life_version,
            purchaseNow, purchaseToken, book.id, book.author_id, book.author_life_version,
            user.userId, current.life_version, book.price, book.author_id, book.author_life_version, WRITER_MAX_PURCHASES_PER_BOOK),
        env.DB.prepare(`UPDATE players SET cash=cash-?, updated_at=MAX(updated_at+1, ?)
          WHERE user_id=? AND life_version=? AND cash>=? AND reset_game_over='' AND game_over=''
            AND EXISTS (SELECT 1 FROM writer_book_purchases
            WHERE book_id=? AND buyer_id=? AND purchase_token=?) RETURNING user_id`)
          .bind(book.price, purchaseNow, user.userId, current.life_version, book.price, book.id, user.userId, purchaseToken),
        env.DB.prepare(`UPDATE players SET cash=cash+?, updated_at=MAX(updated_at+1, ?)
          WHERE user_id=? AND life_version=? AND reset_game_over='' AND game_over=''
            AND EXISTS (SELECT 1 FROM writer_book_purchases
            WHERE book_id=? AND buyer_id=? AND purchase_token=?) RETURNING user_id`)
          .bind(book.price, purchaseNow, book.author_id, book.author_life_version, book.id, user.userId, purchaseToken),
      ]);
      if ((purchase[0]?.results?.length ?? 0) !== 1 || (purchase[1]?.results?.length ?? 0) !== 1 || (purchase[2]?.results?.length ?? 0) !== 1) {
        return json({ message: "購買條件剛剛改變，沒有扣款。" }, 409);
      }
      const buyerAfter = await env.DB.prepare("SELECT * FROM players WHERE user_id=?").bind(user.userId).first<PlayerRow>();
      if (!buyerAfter) return json({ message: "購買完成但玩家資料尚未同步，請重新整理。" }, 409);
      Object.assign(next, buyerAfter);
      expectedRevision = buyerAfter.updated_at;
      title = "購買書籍"; message = `已購買《${book.title}》，NT$${book.price} 已直接交給作者${book.author_name}。`;
      break;
    }
    case "transfer_request": {
      const kind = body.kind === "gift" || body.kind === "scam" ? body.kind : null;
      const amount = Number(body.amount);
      if (!kind) return json({ message: "轉帳類型不正確。" }, 400);
      if (kind === "scam" && (next.job_category !== "crime" || next.current_job !== "詐騙犯")) return json({ message: "只有詐騙犯可以使用詐騙功能。" }, 403);
      if (!Number.isSafeInteger(amount) || amount < (kind === "scam" ? 2 : 1)) return json({ message: kind === "scam" ? "詐騙金額至少需 NT$2。" : "請輸入有效的贈送金額。" }, 400);
      if (amount > current.cash) return json({ message: "金額不能超過你手上的現金。" }, 400);
      if (!body.targetId || body.targetId === user.userId) return json({ message: "請選擇其他玩家。" }, 400);
      const target = await env.DB.prepare("SELECT user_id, last_seen_at, location, main_story, game_over, reset_game_over, life_version FROM players WHERE user_id=?")
        .bind(body.targetId).first<{ user_id: string; last_seen_at: number; location: LocationId; main_story: string; game_over: string; reset_game_over: string; life_version: number }>();
      if (!target || target.last_seen_at < Date.now() - ONLINE_HEARTBEAT_GRACE_MS) return json({ message: "這位玩家目前不在線上。" }, 409);
      if (target.location === "prison") return json({ message: "服刑中的玩家無法處理現金邀請。" }, 409);
      if (target.main_story === "unselected" || target.game_over || target.reset_game_over) return json({ message: "這位玩家目前無法處理邀請。" }, 409);
      const existing = await env.DB.prepare("SELECT id FROM player_transfer_requests WHERE recipient_id=? AND status='pending' AND expires_at>? LIMIT 1")
        .bind(target.user_id, Date.now()).first<{ id: string }>();
      if (existing) return json({ message: "這位玩家正在處理另一個現金邀請。" }, 409);
      if (kind === "scam" && Math.random() < crimeArrestChanceFor("詐騙犯")) {
        const sentence = arrestPlayer(next, `詐騙邀請（目標：${target.user_id}）`, "詐騙犯");
        title = "詐騙被捕"; tone = "warn";
        message = `你在送出詐騙邀請前被警方逮捕，判處在線遊玩 ${Math.ceil(sentence / 60)} 小時。`;
        break;
      }
      const now = Date.now();
      const insertedRequest = await env.DB.prepare(`INSERT INTO player_transfer_requests
        (id, sender_id, sender_name, recipient_id, kind, amount, sender_life_version, recipient_life_version, status, outcome, resolution_token, created_at, expires_at)
        SELECT ?, ?, ?, ?, ?, ?, ?, ?, 'pending', '', '', ?, ?
        WHERE EXISTS (SELECT 1 FROM players sender WHERE sender.user_id=? AND sender.life_version=? AND sender.reset_game_over='' AND sender.game_over='')
          AND EXISTS (SELECT 1 FROM players recipient WHERE recipient.user_id=? AND recipient.life_version=? AND recipient.reset_game_over='' AND recipient.game_over='')
        RETURNING id`).bind(crypto.randomUUID(), user.userId, user.displayName.slice(0, 40), target.user_id, kind, amount,
          current.life_version, target.life_version, now, now + TRANSFER_REQUEST_TIMEOUT_MS,
          user.userId, current.life_version, target.user_id, target.life_version).first<{ id: string }>();
      if (!insertedRequest) return json({ message: "任一玩家的人生狀態剛剛改變，邀請沒有送出。" }, 409);
      title = kind === "gift" ? "送出贈送邀請" : "送出詐騙邀請";
      message = kind === "gift" ? `已向對方送出 NT$${amount} 的贈送邀請，等待對方決定。` : `已送出 NT$${amount} 的詐騙邀請，等待對方決定。`;
      break;
    }
    case "transfer_response": {
      if (!body.requestId || !["accept", "decline"].includes(body.kind || "")) return json({ message: "邀請回覆不正確。" }, 400);
      const token = crypto.randomUUID();
      const request = await env.DB.prepare(`UPDATE player_transfer_requests
        SET status='processing', resolution_token=?, resolved_at=?
        WHERE id=? AND recipient_id=? AND status='pending' AND expires_at>?
          AND EXISTS (SELECT 1 FROM players sender WHERE sender.user_id=sender_id AND sender.life_version=sender_life_version AND sender.reset_game_over='' AND sender.game_over='')
          AND EXISTS (SELECT 1 FROM players recipient WHERE recipient.user_id=recipient_id AND recipient.life_version=recipient_life_version AND recipient.reset_game_over='' AND recipient.game_over='')
        RETURNING id, sender_id, sender_name, recipient_id, kind, amount, sender_life_version, recipient_life_version,
          status, outcome, resolution_token, created_at, expires_at, resolved_at`)
        .bind(token, Date.now(), body.requestId, user.userId, Date.now()).first<TransferRequestRow>();
      if (!request) return transferActionResponse(env.DB, user, current, progress, "這個現金邀請已失效或已被處理。" );
      if (body.kind === "decline") {
        await env.DB.prepare("UPDATE player_transfer_requests SET status='declined', outcome='declined', resolved_at=? WHERE id=? AND resolution_token=?")
          .bind(Date.now(), request.id, token).run();
        return transferActionResponse(env.DB, user, current, progress, "你已拒絕這筆現金邀請。" );
      }
      if (request.kind === "gift") {
        const transfer = await env.DB.batch([
          env.DB.prepare(`UPDATE player_transfer_requests SET status='accepted', outcome='gifted', resolved_at=?
            WHERE id=? AND resolution_token=? AND status='processing'
              AND EXISTS (SELECT 1 FROM players sender WHERE sender.user_id=sender_id AND sender.life_version=sender_life_version
                AND sender.cash>=amount AND sender.game_over='' AND sender.reset_game_over='')
              AND EXISTS (SELECT 1 FROM players recipient WHERE recipient.user_id=recipient_id AND recipient.life_version=recipient_life_version
                AND recipient.game_over='' AND recipient.reset_game_over='')
            RETURNING id`).bind(Date.now(), request.id, token),
          env.DB.prepare(`UPDATE players SET cash=CASE WHEN user_id=? THEN cash-? ELSE cash+? END,
            updated_at=MAX(updated_at+1, ?)
            WHERE user_id IN (?, ?) AND life_version=CASE WHEN user_id=? THEN ? ELSE ? END
              AND reset_game_over='' AND game_over='' AND EXISTS (SELECT 1 FROM player_transfer_requests
              WHERE id=? AND resolution_token=? AND status='accepted' AND outcome='gifted')
            RETURNING user_id`).bind(request.sender_id, request.amount, request.amount, Date.now(), request.sender_id, request.recipient_id,
              request.sender_id, request.sender_life_version, request.recipient_life_version, request.id, token),
        ]);
        if ((transfer[0]?.results?.length ?? 0) !== 1 || (transfer[1]?.results?.length ?? 0) !== 2) {
          await env.DB.prepare("UPDATE player_transfer_requests SET status='cancelled', outcome='sender_insufficient', resolved_at=? WHERE id=? AND resolution_token=?")
            .bind(Date.now(), request.id, token).run();
          return transferActionResponse(env.DB, user, current, progress, "對方現金不足，這筆贈送已取消。" );
        }
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
      const transfer = await env.DB.batch([
        env.DB.prepare(`UPDATE player_transfer_requests SET status='accepted', outcome='scam_success', resolved_at=?
          WHERE id=? AND resolution_token=? AND status='processing'
            AND EXISTS (SELECT 1 FROM players sender WHERE sender.user_id=sender_id AND sender.life_version=sender_life_version
              AND sender.cash>=amount AND sender.game_over='' AND sender.reset_game_over='')
            AND EXISTS (SELECT 1 FROM players recipient WHERE recipient.user_id=recipient_id AND recipient.life_version=recipient_life_version
              AND recipient.cash>=? AND recipient.game_over='' AND recipient.reset_game_over='')
          RETURNING id`).bind(Date.now(), request.id, token, stolen),
        env.DB.prepare(`UPDATE players SET cash=CASE WHEN user_id=? THEN cash+? ELSE cash-? END,
          updated_at=MAX(updated_at+1, ?)
          WHERE user_id IN (?, ?) AND life_version=CASE WHEN user_id=? THEN ? ELSE ? END
            AND reset_game_over='' AND game_over='' AND EXISTS (SELECT 1 FROM player_transfer_requests
            WHERE id=? AND resolution_token=? AND status='accepted' AND outcome='scam_success')
          RETURNING user_id`).bind(request.sender_id, stolen, stolen, Date.now(), request.sender_id, request.recipient_id,
            request.sender_id, request.sender_life_version, request.recipient_life_version, request.id, token),
      ]);
      if ((transfer[0]?.results?.length ?? 0) !== 1 || (transfer[1]?.results?.length ?? 0) !== 2) {
        await env.DB.prepare("UPDATE player_transfer_requests SET status='accepted', outcome='recipient_insufficient', resolved_at=? WHERE id=? AND resolution_token=?")
          .bind(Date.now(), request.id, token).run();
        return transferActionResponse(env.DB, user, current, progress, "現金邀請沒有完成，任一方的現金已低於邀請條件，沒有金錢變動。" );
      }
      const saved = await env.DB.prepare("SELECT * FROM players WHERE user_id=?").bind(user.userId).first<PlayerRow>();
      await recordTransferEvent(env.DB, request.sender_id, request.sender_name, "詐騙成功", `成功取得了 NT$${stolen}。`, "warn");
      return transferActionResponse(env.DB, user, saved ?? current, progress, `你遭到詐騙，NT$${stolen} 已被對方取走。`);
    }
    case "medical_request": {
      if (!body.targetId || body.targetId === user.userId) return json({ message: "請選擇其他玩家作為治療者。" }, 400);
      if (current.health >= 100) return json({ message: "健康已滿 100，現在不需要請求治療。" }, 400);
      const target = await env.DB.prepare(`SELECT user_id, display_name, current_job, job_category, last_seen_at, main_story, game_over, reset_game_over, life_version
        FROM players WHERE user_id=?`).bind(body.targetId).first<{ user_id: string; display_name: string; current_job: string; job_category: string; last_seen_at: number; main_story: string; game_over: string; reset_game_over: string; life_version: number }>();
      const service = target ? medicalTreatmentFor(target.current_job) : null;
      if (!target || !service || target.job_category !== "medical" || target.last_seen_at < Date.now() - ONLINE_HEARTBEAT_GRACE_MS) return json({ message: "這位玩家目前無法提供線上治療。" }, 409);
      if (target.main_story === "unselected" || target.game_over || target.reset_game_over) return json({ message: "這位玩家目前無法處理治療請求。" }, 409);
      const existing = await env.DB.prepare("SELECT id FROM player_medical_requests WHERE patient_id=? AND provider_id=? AND status='pending' AND expires_at>? LIMIT 1")
        .bind(user.userId, target.user_id, Date.now()).first<{ id: string }>();
      if (existing) return json({ message: "你已向這位玩家送出治療請求，請等待回覆。" }, 409);
      const now = Date.now();
      const insertedMedical = await env.DB.prepare(`INSERT INTO player_medical_requests
        (id, patient_id, patient_name, provider_id, provider_name, provider_job, health_gain, amount,
          patient_life_version, provider_life_version, status, outcome, resolution_token, created_at, expires_at)
        SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', '', '', ?, ?
        WHERE EXISTS (SELECT 1 FROM players patient WHERE patient.user_id=? AND patient.life_version=? AND patient.health<100 AND patient.reset_game_over='' AND patient.game_over='')
          AND EXISTS (SELECT 1 FROM players provider WHERE provider.user_id=? AND provider.life_version=? AND provider.current_job=? AND provider.reset_game_over='' AND provider.game_over='')
        RETURNING id`).bind(crypto.randomUUID(), user.userId, user.displayName.slice(0, 40), target.user_id,
          target.display_name.slice(0, 40), target.current_job, service.health, service.price, current.life_version, target.life_version,
          now, now + MEDICAL_REQUEST_TIMEOUT_MS, user.userId, current.life_version, target.user_id, target.life_version, target.current_job).first<{ id: string }>();
      if (!insertedMedical) return json({ message: "任一玩家的人生或職業狀態剛剛改變，治療請求沒有送出。" }, 409);
      return transferActionResponse(env.DB, user, current, progress, `已向${target.display_name}送出治療請求，等待對方在 30 秒內回覆。`);
    }
    case "medical_response": {
      const requestId = body.medicalRequestId ?? body.requestId;
      if (!requestId || !["accept", "decline"].includes(body.kind || "")) return json({ message: "治療請求回覆不正確。" }, 400);
      const token = crypto.randomUUID();
      const medicalRequest = await env.DB.prepare(`UPDATE player_medical_requests
        SET status='processing', resolution_token=?, resolved_at=?
        WHERE id=? AND provider_id=? AND status='pending' AND expires_at>?
          AND EXISTS (SELECT 1 FROM players patient WHERE patient.user_id=patient_id AND patient.life_version=patient_life_version AND patient.reset_game_over='' AND patient.game_over='')
          AND EXISTS (SELECT 1 FROM players provider WHERE provider.user_id=provider_id AND provider.life_version=provider_life_version AND provider.reset_game_over='' AND provider.game_over='')
        RETURNING id, patient_id, patient_name, provider_id, provider_name, provider_job, health_gain, amount,
          patient_life_version, provider_life_version, status, outcome, resolution_token, created_at, expires_at, resolved_at`)
        .bind(token, Date.now(), requestId, user.userId, Date.now()).first<MedicalTreatmentRequestRow>();
      if (!medicalRequest) return transferActionResponse(env.DB, user, current, progress, "這個治療請求已失效或已被處理。");
      if (body.kind === "decline") {
        await env.DB.prepare("UPDATE player_medical_requests SET status='declined', outcome='declined', resolved_at=? WHERE id=? AND resolution_token=?")
          .bind(Date.now(), medicalRequest.id, token).run();
        return transferActionResponse(env.DB, user, current, progress, "你已拒絕這次玩家治療請求。");
      }
      const now = Date.now();
      const db = env.DB;
      if (!db) return json({ message: "遊戲資料庫尚未連接。" }, 503);
      const provider = await env.DB.prepare("SELECT * FROM players WHERE user_id=?").bind(user.userId).first<PlayerRow>();
      const patient = await env.DB.prepare("SELECT * FROM players WHERE user_id=?").bind(medicalRequest.patient_id).first<PlayerRow>();
      const cancel = async (outcome: string, responseMessage: string) => {
        await db.prepare("UPDATE player_medical_requests SET status='cancelled', outcome=?, resolved_at=? WHERE id=? AND resolution_token=?")
          .bind(outcome, Date.now(), medicalRequest.id, token).run();
        return transferActionResponse(db, user, provider ?? current, progress, responseMessage);
      };
      if (!provider || provider.life_version !== medicalRequest.provider_life_version || provider.reset_game_over || provider.last_seen_at < now - ONLINE_HEARTBEAT_GRACE_MS || provider.game_over || provider.main_story === "unselected" || provider.current_job !== medicalRequest.provider_job || !medicalTreatmentFor(provider.current_job)) {
        return cancel("provider_unavailable", "你的職業或在線狀態已變更，這次治療請求已失效。");
      }
      if (!patient || patient.life_version !== medicalRequest.patient_life_version || patient.reset_game_over || patient.last_seen_at < now - ONLINE_HEARTBEAT_GRACE_MS || patient.game_over || patient.main_story === "unselected") return cancel("patient_unavailable", "病人目前不在線上或無法接受治療。");
      if (patient.health >= 100) return cancel("patient_full", "病人健康已滿 100，這次治療請求已取消。");
      if (patient.cash < medicalRequest.amount) return cancel("patient_insufficient", "病人現金不足，無法接受治療。");
      const service = medicalTreatmentFor(provider.current_job);
      if (!service) return cancel("provider_unavailable", "目前職業無法提供治療，請求已失效。");
      // Claim the request and settle both sides in one D1 batch. Every money
      // update is gated by the accepted token, so a changed condition cannot
      // produce a one-sided payment.
      const settlement = await env.DB.batch([
        env.DB.prepare(`UPDATE player_medical_requests SET status='accepted', outcome='treated', resolved_at=?
          WHERE id=? AND resolution_token=? AND status='processing'
            AND EXISTS (SELECT 1 FROM players patient WHERE patient.user_id=patient_id AND patient.life_version=patient_life_version
              AND patient.cash>=amount AND patient.health<100 AND patient.last_seen_at>=? AND patient.reset_game_over=''
              AND patient.game_over='' AND patient.main_story<>'unselected')
            AND EXISTS (SELECT 1 FROM players provider WHERE provider.user_id=provider_id AND provider.current_job=provider_job
              AND provider.life_version=provider_life_version AND provider.last_seen_at>=? AND provider.reset_game_over=''
              AND provider.game_over='' AND provider.main_story<>'unselected')
          RETURNING id`).bind(now, medicalRequest.id, token, now - ONLINE_HEARTBEAT_GRACE_MS, now - ONLINE_HEARTBEAT_GRACE_MS),
        env.DB.prepare(`UPDATE players SET cash=cash-?, health=MIN(100, health+?), updated_at=MAX(updated_at+1, ?),
          action_available_at=CASE WHEN action_available_at>? THEN action_available_at ELSE ? END, action_label=?
          WHERE user_id=? AND life_version=? AND reset_game_over='' AND game_over='' AND EXISTS (SELECT 1 FROM player_medical_requests
            WHERE id=? AND resolution_token=? AND status='accepted' AND outcome='treated')
          RETURNING user_id`).bind(medicalRequest.amount, medicalRequest.health_gain, now, now, now + service.minutes * 1_000, `接受${medicalRequest.provider_job}玩家治療`, medicalRequest.patient_id, medicalRequest.patient_life_version, medicalRequest.id, token),
        env.DB.prepare(`UPDATE players SET cash=cash+?, updated_at=MAX(updated_at+1, ?) WHERE user_id=?
          AND life_version=? AND reset_game_over='' AND game_over='' AND EXISTS (SELECT 1 FROM player_medical_requests
            WHERE id=? AND resolution_token=? AND status='accepted' AND outcome='treated')
          RETURNING user_id`).bind(medicalRequest.amount, now, medicalRequest.provider_id, medicalRequest.provider_life_version, medicalRequest.id, token),
      ]);
      if ((settlement[0]?.results?.length ?? 0) !== 1 || (settlement[1]?.results?.length ?? 0) !== 1 || (settlement[2]?.results?.length ?? 0) !== 1) {
        return cancel("settlement_failed", "治療條件在結算時已變更，這次治療沒有完成。");
      }
      await recordTransferEvent(env.DB, medicalRequest.provider_id, medicalRequest.provider_name, "玩家治療", `為${medicalRequest.patient_name}提供${medicalRequest.provider_job}，收取 NT$${medicalRequest.amount}。`, "good");
      const savedProvider = await env.DB.prepare("SELECT * FROM players WHERE user_id=?").bind(user.userId).first<PlayerRow>();
      return transferActionResponse(env.DB, user, savedProvider ?? provider, progress, `治療完成：${medicalRequest.patient_name}健康 +${medicalRequest.health_gain}，已收到 NT$${medicalRequest.amount}。`);
    }
    case "loan_request": {
      if (!body.targetId || body.targetId === user.userId) return json({ message: "請選擇其他玩家作為貸款媒合者。" }, 400);
      const amount = Number(body.amount);
      if (!Number.isSafeInteger(amount) || amount < 1 || amount > 50_000) return json({ message: "玩家貸款金額需為 NT$1～NT$50,000。" }, 400);
      if (current.loan_balance > 0) return json({ message: "你目前已有貸款，清償後才能申請新的玩家貸款。" }, 400);
      if (current.main_story === "prodigal_return") return json({ message: "《浪子回頭》主線債務不能轉為玩家貸款。" }, 400);
      const target = await env.DB.prepare(`SELECT user_id, display_name, current_job, job_category, last_seen_at, main_story, game_over, reset_game_over, life_version
        FROM players WHERE user_id=?`).bind(body.targetId).first<{ user_id: string; display_name: string; current_job: string; job_category: string; last_seen_at: number; main_story: string; game_over: string; reset_game_over: string; life_version: number }>();
      const terms = target ? financeLoanTermsFor(target.current_job) : null;
      if (!target || !terms || target.job_category !== "finance" || target.last_seen_at < Date.now() - ONLINE_HEARTBEAT_GRACE_MS) return json({ message: "這位玩家目前無法提供玩家貸款方案。" }, 409);
      if (target.main_story === "unselected" || target.game_over || target.reset_game_over) return json({ message: "這位玩家目前無法處理貸款申請。" }, 409);
      const existing = await env.DB.prepare("SELECT id FROM player_loan_requests WHERE borrower_id=? AND status='pending' AND expires_at>? LIMIT 1")
        .bind(user.userId, Date.now()).first<{ id: string }>();
      if (existing) return json({ message: "你已經有一筆待處理的玩家貸款申請。" }, 409);
      const now = Date.now();
      const insertedLoan = await env.DB.prepare(`INSERT INTO player_loan_requests
        (id, borrower_id, borrower_name, provider_id, provider_name, provider_job, amount, interest_rate_bp, spread_bp,
          borrower_life_version, provider_life_version, status, outcome, resolution_token, created_at, expires_at)
        SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', '', '', ?, ?
        WHERE EXISTS (SELECT 1 FROM players borrower WHERE borrower.user_id=? AND borrower.life_version=? AND borrower.loan_balance=0
          AND borrower.main_story<>'prodigal_return' AND borrower.reset_game_over='' AND borrower.game_over='')
          AND EXISTS (SELECT 1 FROM players provider WHERE provider.user_id=? AND provider.life_version=? AND provider.current_job=?
            AND provider.job_category='finance' AND provider.reset_game_over='' AND provider.game_over='')
        RETURNING id`).bind(crypto.randomUUID(), user.userId, user.displayName.slice(0, 40), target.user_id,
          target.display_name.slice(0, 40), target.current_job, amount, terms.rateBp, terms.spreadBp,
          current.life_version, target.life_version, now, now + LOAN_REQUEST_TIMEOUT_MS,
          user.userId, current.life_version, target.user_id, target.life_version, target.current_job).first<{ id: string }>();
      if (!insertedLoan) return json({ message: "任一玩家的人生、貸款或職業狀態剛剛改變，申請沒有送出。" }, 409);
      return transferActionResponse(env.DB, user, current, progress, `已向${target.display_name}送出 NT$${amount} 的貸款申請，等待對方在 30 秒內回覆。`);
    }
    case "loan_response": {
      const requestId = body.loanRequestId ?? body.requestId;
      if (!requestId || !["accept", "decline"].includes(body.kind || "")) return json({ message: "貸款申請回覆不正確。" }, 400);
      const token = crypto.randomUUID();
      const loanRequest = await env.DB.prepare(`UPDATE player_loan_requests
        SET status='processing', resolution_token=?, resolved_at=?
        WHERE id=? AND provider_id=? AND status='pending' AND expires_at>?
          AND EXISTS (SELECT 1 FROM players borrower WHERE borrower.user_id=borrower_id AND borrower.life_version=borrower_life_version AND borrower.reset_game_over='' AND borrower.game_over='')
          AND EXISTS (SELECT 1 FROM players provider WHERE provider.user_id=provider_id AND provider.life_version=provider_life_version AND provider.reset_game_over='' AND provider.game_over='')
        RETURNING id, borrower_id, borrower_name, provider_id, provider_name, provider_job, amount, interest_rate_bp, spread_bp,
          borrower_life_version, provider_life_version, status, outcome, resolution_token, created_at, expires_at, resolved_at`)
        .bind(token, Date.now(), requestId, user.userId, Date.now()).first<LoanRequestRow>();
      if (!loanRequest) return transferActionResponse(env.DB, user, current, progress, "這筆貸款申請已失效或已被處理。");
      if (body.kind === "decline") {
        await env.DB.prepare("UPDATE player_loan_requests SET status='declined', outcome='declined', resolved_at=? WHERE id=? AND resolution_token=?")
          .bind(Date.now(), loanRequest.id, token).run();
        return transferActionResponse(env.DB, user, current, progress, "你已拒絕這筆玩家貸款申請。");
      }
      const now = Date.now();
      const db = env.DB;
      if (!db) return json({ message: "遊戲資料庫尚未連接。" }, 503);
      const provider = await db.prepare("SELECT * FROM players WHERE user_id=?").bind(user.userId).first<PlayerRow>();
      const borrower = await db.prepare("SELECT * FROM players WHERE user_id=?").bind(loanRequest.borrower_id).first<PlayerRow>();
      const cancel = async (outcome: string, responseMessage: string) => {
        await db.prepare("UPDATE player_loan_requests SET status='cancelled', outcome=?, resolved_at=? WHERE id=? AND resolution_token=?")
          .bind(outcome, Date.now(), loanRequest.id, token).run();
        return transferActionResponse(db, user, provider ?? current, progress, responseMessage);
      };
      const currentTerms = provider ? financeLoanTermsFor(provider.current_job) : null;
      if (!provider || provider.life_version !== loanRequest.provider_life_version || provider.reset_game_over || provider.last_seen_at < now - ONLINE_HEARTBEAT_GRACE_MS || provider.game_over || provider.main_story === "unselected" || provider.job_category !== "finance" || provider.current_job !== loanRequest.provider_job || !currentTerms || currentTerms.rateBp !== loanRequest.interest_rate_bp || currentTerms.spreadBp !== loanRequest.spread_bp) {
        return cancel("provider_unavailable", "你的職業或在線狀態已變更，這筆貸款申請已失效。");
      }
      if (!borrower || borrower.life_version !== loanRequest.borrower_life_version || borrower.reset_game_over || borrower.last_seen_at < now - ONLINE_HEARTBEAT_GRACE_MS || borrower.game_over || borrower.main_story === "unselected") return cancel("borrower_unavailable", "借款玩家目前不在線上或無法接受貸款。");
      if (borrower.main_story === "prodigal_return") return cancel("story_restricted", "《浪子回頭》主線債務不能使用玩家貸款。");
      if (borrower.loan_balance > 0) return cancel("borrower_has_loan", "借款玩家已有貸款，這筆申請已取消。");
      const contractId = crypto.randomUUID();
      let funded: D1Result<unknown>[];
      try {
        funded = await db.batch([
          db.prepare(`UPDATE player_loan_requests SET status='accepted', outcome='funded', resolved_at=?
            WHERE id=? AND resolution_token=? AND status='processing'
              AND EXISTS (SELECT 1 FROM players borrower WHERE borrower.user_id=borrower_id AND borrower.life_version=borrower_life_version
                AND borrower.loan_balance=0 AND borrower.main_story<>'prodigal_return' AND borrower.reset_game_over='' AND borrower.game_over='')
              AND EXISTS (SELECT 1 FROM players provider WHERE provider.user_id=provider_id AND provider.current_job=provider_job
                AND provider.life_version=provider_life_version AND provider.job_category='finance' AND provider.reset_game_over='' AND provider.game_over='')
            RETURNING id`).bind(now, loanRequest.id, token),
          db.prepare(`UPDATE players SET loan_balance=?, cash=cash+?, updated_at=MAX(updated_at+1, ?)
            WHERE user_id=? AND life_version=? AND loan_balance=0 AND main_story<>'prodigal_return' AND reset_game_over='' AND game_over=''
              AND EXISTS (SELECT 1 FROM player_loan_requests WHERE id=? AND resolution_token=? AND status='accepted' AND outcome='funded')
            RETURNING user_id`).bind(loanRequest.amount, loanRequest.amount, now, loanRequest.borrower_id, loanRequest.borrower_life_version, loanRequest.id, token),
          db.prepare(`INSERT INTO player_loan_contracts (id, borrower_id, borrower_name, provider_id, provider_name, provider_job,
            principal_amount, outstanding_balance, interest_rate_bp, spread_bp, borrower_life_version, provider_life_version, revision, mutation_token, status, opened_at)
            SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'active', ?
            WHERE EXISTS (SELECT 1 FROM player_loan_requests WHERE id=? AND resolution_token=? AND status='accepted' AND outcome='funded')
            RETURNING id`).bind(contractId, loanRequest.borrower_id, loanRequest.borrower_name, loanRequest.provider_id, loanRequest.provider_name,
              loanRequest.provider_job, loanRequest.amount, loanRequest.amount, loanRequest.interest_rate_bp, loanRequest.spread_bp,
              loanRequest.borrower_life_version, loanRequest.provider_life_version, token, now, loanRequest.id, token),
        ]);
      } catch {
        return cancel("contract_failed", "貸款合約建立失敗，銀行沒有撥款。");
      }
      if ((funded[0]?.results?.length ?? 0) !== 1 || (funded[1]?.results?.length ?? 0) !== 1 || (funded[2]?.results?.length ?? 0) !== 1) {
        return cancel("borrower_has_loan", "借款玩家的貸款狀態已變更，這筆申請沒有完成。");
      }
      await recordTransferEvent(db, loanRequest.provider_id, loanRequest.provider_name, "玩家貸款成立", `為${loanRequest.borrower_name}媒合 NT$${loanRequest.amount} 貸款，優惠利率每日 ${(loanRequest.interest_rate_bp / 100).toFixed(2)}%。`, "good");
      return transferActionResponse(db, user, provider, progress, `貸款申請已成立：銀行撥款 NT$${loanRequest.amount}。借款者每日支付 ${(loanRequest.interest_rate_bp / 100).toFixed(2)}% 利息，你可獲得 ${(loanRequest.spread_bp / 100).toFixed(2)}% 利差收益。`);
    }
    case "talent": {
      if (body.kind === "reset") {
        if (!talents.size) return json({ message: "目前沒有已配置的天賦。" }, 400);
        if (next.cash < 2_000) return json({ message: "重置天賦需要 NT$2,000。" }, 400);
        next.cash -= 2_000; talents = new Set();
        pendingTalentSet = "[]";
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
      pendingTalentSet = JSON.stringify([...talents]);
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
      next.intelligence_exp = Math.min(ABILITY_MAX, next.intelligence_exp + ("intelligence" in choice ? choice.intelligence ?? 0 : 0));
      next.programming_exp = Math.min(ABILITY_MAX, next.programming_exp + Number("creativity" in choice ? choice.creativity ?? 0 : 0));
      next.fitness_exp = Math.min(ABILITY_MAX, next.fitness_exp + Number("physical" in choice ? choice.physical ?? 0 : 0));
      next.work_exp = Math.min(ABILITY_MAX, next.work_exp + Number("social" in choice ? choice.social ?? 0 : 0));
      next.charisma_exp = Math.min(ABILITY_MAX, next.charisma_exp + Number("charisma" in choice ? choice.charisma ?? 0 : 0));
      if ("rentalDays" in choice && choice.rentalDays) next.rented_until = Math.max(next.elapsed_minutes, next.rented_until) + choice.rentalDays * 1440;
      const gained = "talentExp" in choice ? choice.talentExp ?? 0 : 0;
      pendingCityEvent = { eventId: event.id, talentExp: gained };
      progress = { ...progress, talent_exp: Math.min(1099, progress.talent_exp + gained), pending_event: "" };
      title = event.title; message = choice.result; tone = cashChange < 0 || ("health" in choice && (choice.health ?? 0) < 0) ? "warn" : "good"; break;
    }
    case "choose_story":
      if (next.main_story !== "unselected") return json({ message: "人生主線選定後不能再次更換。" }, 409);
      if (body.story !== "prodigal_return") return json({ message: "這條人生主線目前尚未開放。" }, 400);
      Object.assign(next, { cash: 37, bank_balance: 0, loan_balance: 250_000, main_story: "prodigal_return", finance_day: Math.floor(next.elapsed_minutes / 1440) + 1, daily_minimum_payment: 750, daily_payment_made: 0, missed_payment_days: 0, writer_fans: 0, writer_day: Math.floor(next.elapsed_minutes / 1440) + 1, writer_writes: 0, owns_restaurant: 0, prison_until: 0, prison_crime: "", territory_location: "", territory_day: 0, territory_payout_day: 0, territory_visits: 0, territory_income: 0, territory_pending: 0, hack_day: 0, hack_uses: 0, street_day: 0, street_scavenges: 0, street_beg_income: 0, game_over: "", energy: 100, health: 100, hunger: 80, intelligence_exp: 0, programming_exp: 0, fitness_exp: 0, work_exp: 0, charisma_exp: 0, current_job: "unemployed", job_category: "unfixed", job_exp: 0, illness: "", owns_home: 0, rental_name: "", rented_until: 0, action_available_at: 0, action_label: "", location: "realtor" });
      title = "選擇主線：《浪子回頭》"; message = "你帶著 NT$37 與 NT$250,000 負債，決定承認失敗並重新開始。"; tone = "neutral"; break;
    case "move": {
      if (!VALID_LOCATIONS.has(body.location as LocationId)) return json({ message: "目的地不存在。" }, 400);
      if (next.location === body.location) return json({ message: "你已經在這裡了。" }, 400);
      if (body.location === "home" && !next.owns_home && next.rented_until <= next.elapsed_minutes) return json({ message: "你目前沒有住所，請先到房仲租屋或買房。" }, 400);
      const target = body.location as LocationId;
      if (target === "prison") return json({ message: "監獄只接受被捕玩家進入。" }, 403);
      if (!isLocationOpen(target, sharedMinutes)) return json({ message: `${OPENING_HOURS[target]?.label} 營業，現在已關門。` }, 400);
      next.location = body.location as LocationId;
      const placeName = ({ home: "我的住所", realtor: "安心房仲", bank: "城市銀行", business: "工作地", shopping: "購物街", bookstore: "城市書店", hotel: "不夜旅店", casino: "幸運賭場", school: "未來學院", hospital: "市立醫院", underpass: "車站地下道", prison: "監獄" } as Record<LocationId, string>)[next.location as LocationId];
      title = "移動完成"; message = `已抵達${placeName}。`; tone = "neutral";
      pendingTerritoryVisit = { location: target, cycleDay: Math.floor(sharedMinutes / 1440) + 1, worldMinute: sharedMinutes };
      break;
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
        next.cash -= amount; next.bank_balance += amount; title = "存入銀行"; message = `已存入 NT$${amount}；每個遊戲日結算 ${(financeDepositRateFor(next.current_job) / 100).toFixed(2)}% 收益。`;
      } else if (body.kind === "withdraw") {
        if (next.bank_balance < amount) return json({ message: "銀行存款不足。" }, 400);
        next.bank_balance -= amount; next.cash += amount; title = "提領存款"; message = `已從銀行提領 NT$${amount}。`;
      } else if (body.kind === "borrow") {
        if (next.loan_balance > 0) return json({ message: "請先還清目前貸款，才能再次借款。" }, 400);
        if (amount > 50_000) return json({ message: "單筆貸款上限為 NT$50,000。" }, 400);
        next.loan_balance = amount; next.cash += amount; title = "銀行貸款"; message = `借入 NT$${amount}；每個遊戲日結算 ${(BANK_LOAN_RATE_BP / 100).toFixed(2)}% 利息。`;
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
        const loanContract = await activeLoanContract(env.DB, user.userId);
        if (loanContract) pendingLoanContractUpdate = { id: loanContract.id, previousBalance: loanContract.outstanding_balance, previousRevision: loanContract.revision, balance: next.loan_balance, closedAt: next.loan_balance > 0 ? null : Date.now() };
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
      pendingProviderJobCancellation = true;
      if (next.current_job === "大橋頭營運長" && next.territory_location) {
        // Release the territory from the current database row so a visit
        // arriving at the same time is either included in this payout or is
        // rejected after the location is cleared; a stale snapshot must not
        // erase an already-recorded visit.
        const released = await env.DB.prepare(`UPDATE players SET
          cash=cash+territory_pending+territory_income, territory_location='', territory_day=0,
          territory_payout_day=0, territory_visits=0, territory_income=0, territory_pending=0,
          updated_at=MAX(updated_at+1, ?), mutation_token=?
          WHERE user_id=? AND current_job='大橋頭營運長' AND territory_location<>''
            AND life_version=? AND updated_at=? AND reset_game_over='' AND game_over=''
          RETURNING *`).bind(Date.now(), actionToken, user.userId, current.life_version, expectedRevision).first<PlayerRow>();
        if (released) {
          next.cash = released.cash; next.territory_location = released.territory_location;
          next.territory_day = released.territory_day; next.territory_payout_day = released.territory_payout_day;
          next.territory_visits = released.territory_visits; next.territory_income = released.territory_income; next.territory_pending = released.territory_pending;
          next.updated_at = released.updated_at; expectedRevision = released.updated_at;
        }
      }
      next.current_job = selected.job; next.job_category = selected.categoryId; next.job_exp = selected.categoryId === "literary" ? next.writer_fans : 0;
      if (selected.categoryId === "literary") next.current_job = careerForCategory("literary", next.writer_fans, selected.job).title;
      title = category.id === "unfixed" ? `狀態變更：${selected.job}` : `進入${selected.categoryLabel}`;
      message = category.id === "unfixed" ? `目前狀態已改為${selected.job}。` : `成功進入「${selected.categoryLabel}」，從${selected.job}開始發展；產業升遷經驗從 0 開始。`; break;
    }
    case "work": {
      if (next.location !== "business") return json({ message: "請先前往工作地。" }, 400);
      if (!isLocationOpen("business", sharedMinutes)) return json({ message: `工作地營業時間為 ${OPENING_HOURS.business?.label}。` }, 400);
      if (next.illness) return json({ message: `目前罹患${next.illness}，請先前往醫院治療。` }, 400);
      if (next.job_category === "unfixed") return json({ message: `目前是${next.current_job === "流浪者" ? "流浪者" : "待業者"}，請先選擇一條產業路線。` }, 400);
      if (next.job_category === "literary") return json({ message: "文學作家請使用每日寫作，不使用一般工作班次。" }, 400);
      if (next.job_category === "street") return json({ message: "街頭生存沒有固定薪資，請前往車站地下道拾荒、乞討或使用互助功能。" }, 400);
      const hours = Number(body.hours);
      const workSpecial = careerWorkSpecialFor(next.current_job, hours);
      const restaurantOwner = next.job_category === "hospitality" && next.current_job === "餐廳老闆" && Boolean(next.owns_restaurant);
      if (restaurantOwner && !workSpecial) return json({ message: "自有餐廳已改為每日結算，請使用餐廳營運班。" }, 400);
      if (![1, 4, 8].includes(hours) && !workSpecial) return json({ message: "工時選擇不正確。" }, 400);
      const energyCost = Math.ceil(hours * 5 * (talents.has("endurance") ? .85 : 1));
      if (next.energy < energyCost) return json({ message: "體力不足，先回家休息吧。" }, 400);
      const previousCareer = careerForCategory(next.job_category, next.job_exp, next.current_job, abilitiesFor(next));
      const incomeMultiplier = 1 + (talents.has("workaholic_1") ? .05 : 0) + (talents.has("workaholic_2") ? .05 : 0) + (memoryBefore.state.name === "就業熱潮" ? .05 : 0);
      const income = restaurantOwner ? 0 : Math.floor(hours * previousCareer.hourlyPay * incomeMultiplier);
      if (next.job_category === "crime") {
        illegalJob = previousCareer.title;
        illegalCrime = `${previousCareer.title}${workSpecial ? `：${workSpecial.name}` : "工作"}`;
        illegalIncome = income;
      }
      const jobGain = Math.ceil(hours * 4 * (talents.has("skilled") ? 1.15 : 1));
      const hungerGain = workSpecial && next.job_category === "hospitality" ? hospitalitySpecialHungerFor(next.current_job) : 0;
      next.cash += income; next.energy = Math.max(0, next.energy - energyCost); next.health = clamp(next.health - Math.ceil(hours / 2) + medicalWorkHealthBonusFor(next.current_job)); next.hunger = clamp(next.hunger - hours * 2 + hungerGain); next.job_exp += jobGain;
      minutes = careerWorkWaitSeconds(next.current_job, hours, talents.has("workaholic_2"));
      const newCareer = careerForCategory(next.job_category, next.job_exp, next.current_job, abilitiesFor(next));
      next.current_job = newCareer.title;
      if (newCareer.title !== previousCareer.title) talentExpGain += 10;
      title = newCareer.title !== previousCareer.title ? `升遷為${newCareer.title}` : workSpecial ? `${workSpecial.name} ${hours} 小時` : `工作 ${hours} 小時`;
      const medicalHealthBonus = medicalWorkHealthBonusFor(previousCareer.title);
      const incomeMessage = restaurantOwner ? "本次不另發時薪，餐廳收益每日結算" : `收入 +NT$${income}`;
      message = `以${previousCareer.title}完成${workSpecial ? `「${workSpecial.name}」` : "工作"}，${incomeMessage}，職業經驗 +${jobGain}${hungerGain ? `，飽足 +${hungerGain}` : ""}${medicalHealthBonus ? `，健康 +${medicalHealthBonus}` : ""}。${newCareer.title !== previousCareer.title ? ` 恭喜升遷為${newCareer.title}！` : ""}`; break;
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
        if (key === "physical") next.fitness_exp = Math.min(ABILITY_MAX, next.fitness_exp + gain);
        if (key === "intelligence") next.intelligence_exp = Math.min(ABILITY_MAX, next.intelligence_exp + gain);
        if (key === "creativity") next.programming_exp = Math.min(ABILITY_MAX, next.programming_exp + gain);
        if (key === "social") next.work_exp = Math.min(ABILITY_MAX, next.work_exp + gain);
        if (key === "charisma") next.charisma_exp = Math.min(ABILITY_MAX, next.charisma_exp + gain);
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
      const meal = body.kind === "rice" ? { name: "飯糰", price: Math.floor(45 * mealDiscount), hunger: 20 } : body.kind === "bento" ? { name: "便當", price: Math.floor(100 * mealDiscount), hunger: 45 } : null;
      if (!meal) return json({ message: "餐點不存在。" }, 400);
      if (next.cash < meal.price) return json({ message: "現金不足。" }, 400);
      next.cash -= meal.price; next.hunger = clamp(next.hunger + meal.hunger);
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
      next.energy = talents.has("strong_body") ? 120 : 100; next.health = clamp(next.health + 5); next.hunger = clamp(next.hunger - 12); minutes = 120;
      title = "好好睡了一覺"; message = "體力完全恢復，健康 +5。"; break;
    case "hospital": {
      if (next.location !== "hospital") return json({ message: "請先前往市立醫院。" }, 400);
      if (body.kind !== "emergency" && !isHospitalRegularOpen(sharedMinutes)) return json({ message: "一般門診與完整治療時間為 07:00～23:00；急診 24 小時開放。" }, 400);
      const careerDiscount = medicalHospitalDiscountFor(next.current_job);
      const memoryDiscount = memoryBefore.state.name === "健康警報" ? .2 : 0;
      const careDiscount = 1 - Math.max(careerDiscount, memoryDiscount);
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
    case "reset": {
      const resetNow = Date.now();
      if (next.reset_game_over && next.updated_at > resetNow - 30_000) return json({ message: "人生資料正在重置，請稍候再試。" }, 409);
      const previousGameOver = next.reset_game_over || (next.game_over === "__resetting__" ? "" : next.game_over);
      const resetRevision = Math.max(resetNow, next.updated_at + 1);
      const resetMarker = previousGameOver || "__empty__";
      const resetClaimed = await env.DB.prepare(`UPDATE players SET game_over='__resetting__', reset_game_over=?, life_version=life_version+1, updated_at=?, mutation_token=?
        WHERE user_id=? AND updated_at=? AND (reset_game_over='' OR updated_at<?)
        RETURNING life_version, updated_at`).bind(resetMarker, resetRevision, actionToken, user.userId, next.updated_at, resetNow - 30_000).first<{ life_version: number; updated_at: number }>();
      if (!resetClaimed) return json({ message: "玩家資料剛剛有更新，請重新整理後再重試。" }, 409);
      expectedLifeVersion = resetClaimed.life_version;
      expectedRevision = resetClaimed.updated_at;
      expectedResetMarker = resetMarker;
      const restoreResetClaim = async () => {
        await env.DB!.prepare("UPDATE players SET game_over=?, reset_game_over='', updated_at=?, mutation_token=? WHERE user_id=? AND game_over='__resetting__' AND reset_game_over=? AND life_version=? AND updated_at>=? AND mutation_token=?")
          .bind(previousGameOver, Date.now(), crypto.randomUUID(), user.userId, resetMarker, expectedLifeVersion, resetRevision, actionToken).run();
      };
      const [activeBlackjack, activePoker, activeBingo, activeTournament, activeRequest] = await Promise.all([
        env.DB.prepare("SELECT 1 AS active FROM casino_hands WHERE user_id=? AND status IN ('waiting','dealing','playing','drawing','stood','settling') LIMIT 1").bind(user.userId).first<{ active: number }>(),
        env.DB.prepare(`SELECT 1 AS active FROM poker_hands h JOIN poker_table_state t ON t.id='table-01'
          WHERE h.user_id=? AND h.status IN ('ready','playing','all_in','folded','settling') AND t.status IN ('starting','playing','settling') LIMIT 1`).bind(user.userId).first<{ active: number }>(),
        env.DB.prepare(`SELECT 1 AS active FROM casino_bingo_entries e JOIN casino_bingo_state s ON s.id='bingo-01' AND s.round_no=e.round_no
          WHERE e.user_id=? AND s.status='drawing' LIMIT 1`).bind(user.userId).first<{ active: number }>(),
        env.DB.prepare(`SELECT 1 AS active FROM casino_tournament_entries e JOIN casino_tournament_state s ON s.id='tournament-01' AND s.round_no=e.tournament_no
          WHERE e.user_id=? AND s.status='playing' LIMIT 1`).bind(user.userId).first<{ active: number }>(),
        env.DB.prepare(`SELECT 1 AS active FROM (
          SELECT id FROM player_transfer_requests WHERE status='processing' AND (sender_id=? OR recipient_id=?)
          UNION ALL SELECT id FROM player_medical_requests WHERE status='processing' AND (patient_id=? OR provider_id=?)
          UNION ALL SELECT id FROM player_loan_requests WHERE status='processing' AND (borrower_id=? OR provider_id=?)
          UNION ALL SELECT id FROM street_beg_requests WHERE status='processing' AND (requester_id=? OR recipient_id=?)
          UNION ALL SELECT id FROM life_contracts WHERE status IN ('pending','active') AND (creator_id=? OR partner_id=?)) LIMIT 1`)
          .bind(user.userId, user.userId, user.userId, user.userId, user.userId, user.userId, user.userId, user.userId, user.userId, user.userId).first<{ active: number }>(),
      ]);
      if (activeBlackjack || activePoker || activeBingo || activeTournament || activeRequest) {
        await restoreResetClaim();
        return json({ message: activeRequest ? "你有一筆多人交易正在結算，請稍候再重新開始人生。" : "你正在進行多人賭場牌局；請等待本局或賽事結束後再重新開始人生，避免獎池與新人生混在一起。" }, 409);
      }
      const previousLifeVersion = expectedLifeVersion - 1;
      const resetGate = `EXISTS (SELECT 1 FROM players reset_owner WHERE reset_owner.user_id=? AND reset_owner.life_version=? AND reset_owner.mutation_token=?)`;
      resetStatements = [
        env.DB.prepare(`DELETE FROM player_transfer_requests WHERE (sender_id=? OR recipient_id=?) AND ${resetGate}`).bind(user.userId, user.userId, user.userId, expectedLifeVersion, actionToken),
        env.DB.prepare(`DELETE FROM player_medical_requests WHERE (patient_id=? OR provider_id=?) AND ${resetGate}`).bind(user.userId, user.userId, user.userId, expectedLifeVersion, actionToken),
        env.DB.prepare(`DELETE FROM player_loan_requests WHERE (borrower_id=? OR provider_id=?) AND ${resetGate}`).bind(user.userId, user.userId, user.userId, expectedLifeVersion, actionToken),
        env.DB.prepare(`DELETE FROM street_beg_requests WHERE (requester_id=? OR recipient_id=?) AND ${resetGate}`).bind(user.userId, user.userId, user.userId, expectedLifeVersion, actionToken),
        env.DB.prepare(`DELETE FROM player_inventory WHERE user_id=? AND life_version=? AND ${resetGate}`).bind(user.userId, previousLifeVersion, user.userId, expectedLifeVersion, actionToken),
        env.DB.prepare(`DELETE FROM street_aid_donations WHERE donor_id=? AND ${resetGate}`).bind(user.userId, user.userId, expectedLifeVersion, actionToken),
        env.DB.prepare(`DELETE FROM street_aid_boxes WHERE owner_id=? AND owner_life_version=? AND ${resetGate}`).bind(user.userId, previousLifeVersion, user.userId, expectedLifeVersion, actionToken),
        env.DB.prepare(`DELETE FROM city_coop_contributions WHERE user_id=? AND life_version=? AND EXISTS (SELECT 1 FROM city_coop_projects p WHERE p.cycle_day=city_coop_contributions.cycle_day AND p.status='open') AND ${resetGate}`).bind(user.userId, previousLifeVersion, user.userId, expectedLifeVersion, actionToken),
        env.DB.prepare(`UPDATE player_loan_contracts SET outstanding_balance=0, status='reset', closed_at=?, revision=revision+1, mutation_token=?
          WHERE borrower_id=? AND borrower_life_version=? AND status='active' AND ${resetGate}`).bind(resetNow, actionToken, user.userId, previousLifeVersion, user.userId, expectedLifeVersion, actionToken),
        env.DB.prepare(`UPDATE player_loan_contracts SET provider_id='bank', provider_name='城市銀行', provider_job='', provider_life_version=0,
          spread_bp=0, revision=revision+1, mutation_token=?
          WHERE provider_id=? AND provider_life_version=? AND borrower_id<>? AND status='active' AND ${resetGate}`).bind(actionToken, user.userId, previousLifeVersion, user.userId, user.userId, expectedLifeVersion, actionToken),
        env.DB.prepare(`DELETE FROM writer_book_purchases WHERE ((author_id=? AND author_life_version=?) OR (buyer_id=? AND buyer_life_version=?)) AND ${resetGate}`).bind(user.userId, previousLifeVersion, user.userId, previousLifeVersion, user.userId, expectedLifeVersion, actionToken),
        env.DB.prepare(`DELETE FROM writer_books WHERE author_id=? AND author_life_version=? AND ${resetGate}`).bind(user.userId, previousLifeVersion, user.userId, expectedLifeVersion, actionToken),
        env.DB.prepare(`DELETE FROM mystery_clues WHERE user_id=? AND ${resetGate}`).bind(user.userId, user.userId, expectedLifeVersion, actionToken),
        env.DB.prepare(`DELETE FROM territory_visit_log WHERE (owner_id=? OR visitor_id=?) AND ${resetGate}`).bind(user.userId, user.userId, user.userId, expectedLifeVersion, actionToken),
        env.DB.prepare(`DELETE FROM casino_hands WHERE user_id=? AND life_version=? AND ${resetGate}`).bind(user.userId, previousLifeVersion, user.userId, expectedLifeVersion, actionToken),
        env.DB.prepare(`DELETE FROM poker_hands WHERE user_id=? AND life_version=? AND ${resetGate}`).bind(user.userId, previousLifeVersion, user.userId, expectedLifeVersion, actionToken),
        env.DB.prepare(`DELETE FROM casino_bingo_entries WHERE user_id=? AND life_version=? AND ${resetGate}`).bind(user.userId, previousLifeVersion, user.userId, expectedLifeVersion, actionToken),
        env.DB.prepare(`DELETE FROM casino_tournament_hands WHERE user_id=? AND life_version=? AND ${resetGate}`).bind(user.userId, previousLifeVersion, user.userId, expectedLifeVersion, actionToken),
        env.DB.prepare(`DELETE FROM casino_tournament_entries WHERE user_id=? AND life_version=? AND ${resetGate}`).bind(user.userId, previousLifeVersion, user.userId, expectedLifeVersion, actionToken),
        env.DB.prepare(`UPDATE casino_bingo_state SET host_user_id=COALESCE((SELECT user_id FROM casino_bingo_entries WHERE round_no=casino_bingo_state.round_no ORDER BY rowid LIMIT 1), ''), updated_at=? WHERE id='bingo-01' AND status='lobby' AND ${resetGate}`).bind(resetNow, user.userId, expectedLifeVersion, actionToken),
        env.DB.prepare(`UPDATE casino_tournament_state SET host_user_id=COALESCE((SELECT user_id FROM casino_tournament_entries WHERE tournament_no=casino_tournament_state.round_no ORDER BY rowid LIMIT 1), ''), updated_at=? WHERE id='tournament-01' AND status='lobby' AND ${resetGate}`).bind(resetNow, user.userId, expectedLifeVersion, actionToken),
        env.DB.prepare(`UPDATE player_progress SET talent_exp=0, talents='[]', story_chapter=0, story_seen_chapter=0, last_event_day=0, pending_event='', updated_at=? WHERE user_id=? AND ${resetGate}`).bind(resetNow, user.userId, user.userId, expectedLifeVersion, actionToken),
      ];
      Object.assign(next, { cash: next.main_story === "prodigal_return" ? 37 : 10000, bank_balance: 0, loan_balance: next.main_story === "prodigal_return" ? 250_000 : 0, finance_day: 1, daily_minimum_payment: next.main_story === "prodigal_return" ? 750 : 0, daily_payment_made: 0, missed_payment_days: 0, writer_fans: 0, writer_day: 1, writer_writes: 0, owns_restaurant: 0, prison_until: 0, prison_crime: "", territory_location: "", territory_day: 0, territory_payout_day: 0, territory_visits: 0, territory_income: 0, territory_pending: 0, hack_day: 0, hack_uses: 0, street_day: 0, street_scavenges: 0, street_beg_income: 0, game_over: "", reset_game_over: "", elapsed_remainder_ms: 0, energy: 100, health: 100, hunger: 80, intelligence_exp: 0, programming_exp: 0, fitness_exp: 0, work_exp: 0, charisma_exp: 0, current_job: "unemployed", job_category: "unfixed", job_exp: 0, illness: "", owns_home: 0, rental_name: "", rented_until: 0, action_available_at: 0, action_label: "", elapsed_minutes: 0, location: "realtor" });
      progress = { ...progress, talent_exp: 0, talents: "[]", story_chapter: 0, story_seen_chapter: 0, last_event_day: 0, pending_event: "" }; talents = new Set();
      title = "重新開始人生"; message = "新的人生已開始，所有進度回到起點。"; tone = "neutral"; break;
    }
    default: return json({ message: "未知的行動。" }, 400);
  }

  let arrested = false;
  if (illegalCrime && illegalJob && Math.random() < crimeArrestChanceFor(illegalJob)) {
    if (illegalIncome > 0) next.cash = Math.max(0, next.cash - illegalIncome);
    const sentence = arrestPlayer(next, illegalCrime, illegalJob);
    title = "違法行為被捕";
    message = `你因「${illegalCrime}」被警方逮捕，犯罪所得已被沒收，判處在線遊玩 ${Math.ceil(sentence / 60)} 小時。`;
    tone = "warn";
    minutes = 0;
    arrested = true;
  }
  if (arrested) pendingHack = null;
  else if (pendingHack) {
    next.cash += pendingHack.amount;
    message = `你成功從${pendingHack.targetName}手上竊取 NT$${pendingHack.amount}；這次行動仍可能在稍後被追查。`;
    tone = "warn";
  }

  const bypassVitalityEffects = body.action === "move" || body.action === "restaurant" || (body.action === "hotel" && body.kind === "work") || ["book_publish", "book_toggle", "book_buy"].includes(body.action || "");
  if (body.action !== "hospital" && body.action !== "reset" && !bypassVitalityEffects) {
    // Rest is the recovery action: low hunger/energy penalties must not erase
    // the promised health recovery in the same action.
    if (body.action !== "sleep" && next.hunger <= 15) next.health = clamp(next.health - 6);
    if (body.action !== "sleep" && next.energy <= 5) next.health = clamp(next.health - 4);
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
  const now = Math.max(Date.now(), next.updated_at + 1);
  const eventId = crypto.randomUUID();
  // Territory counters are owned by their atomic visit/rollover statements.
  // Every normal action must preserve the current database values; only a
  // reset intentionally clears them.
  const preserveTerritoryState = body.action === "reset" ? 0 : 1;
  const playerStatement = env.DB.prepare(`UPDATE players SET cash=?, bank_balance=?, loan_balance=?, finance_day=?, daily_minimum_payment=?, daily_payment_made=?, missed_payment_days=?, writer_fans=?, writer_day=?, writer_writes=?, owns_restaurant=?, prison_until=?, prison_crime=?,
    territory_location=CASE WHEN ?=1 THEN territory_location ELSE ? END,
    territory_day=CASE WHEN ?=1 THEN territory_day ELSE ? END,
    territory_payout_day=CASE WHEN ?=1 THEN territory_payout_day ELSE ? END,
    territory_visits=CASE WHEN ?=1 THEN territory_visits ELSE ? END,
    territory_income=CASE WHEN ?=1 THEN territory_income ELSE ? END,
    territory_pending=CASE WHEN ?=1 THEN territory_pending ELSE ? END,
    hack_day=?, hack_uses=?, street_day=?, street_scavenges=?, street_beg_income=?, game_over=?, main_story=?, energy=?, health=?, hunger=?, intelligence_exp=?, programming_exp=?, fitness_exp=?, work_exp=?, charisma_exp=?, current_job=?, job_category=?, job_exp=?, illness=?, owns_home=?, rental_name=?, rented_until=?, action_available_at=?, action_label=?, elapsed_minutes=?, elapsed_remainder_ms=?, location=?, updated_at=?, last_seen_at=?, reset_game_over=?, mutation_token=?
    WHERE user_id=? AND life_version=? AND updated_at=? AND reset_game_over=?
      AND (?=0 OR EXISTS (SELECT 1 FROM player_loan_contracts WHERE id=? AND status='active' AND outstanding_balance=? AND revision=?))
      AND (?=0 OR EXISTS (SELECT 1 FROM players target WHERE target.user_id=? AND target.life_version=? AND target.mutation_token=?))
    RETURNING user_id`)
    .bind(next.cash, next.bank_balance, next.loan_balance, next.finance_day, next.daily_minimum_payment, next.daily_payment_made, next.missed_payment_days, next.writer_fans, next.writer_day, next.writer_writes, next.owns_restaurant, next.prison_until, next.prison_crime,
      preserveTerritoryState, next.territory_location, preserveTerritoryState, next.territory_day, preserveTerritoryState, next.territory_payout_day,
      preserveTerritoryState, next.territory_visits, preserveTerritoryState, next.territory_income, preserveTerritoryState, next.territory_pending,
      next.hack_day, next.hack_uses, next.street_day, next.street_scavenges, next.street_beg_income, next.game_over, next.main_story, next.energy, next.health, next.hunger, next.intelligence_exp, next.programming_exp, next.fitness_exp, next.work_exp, next.charisma_exp, next.current_job, next.job_category, next.job_exp, next.illness, next.owns_home, next.rental_name, next.rented_until, next.action_available_at, next.action_label, next.elapsed_minutes, next.elapsed_remainder_ms, next.location, now, now, next.reset_game_over, actionToken,
      user.userId, expectedLifeVersion, expectedRevision, expectedResetMarker,
      pendingLoanContractUpdate ? 1 : 0, pendingLoanContractUpdate?.id ?? "", pendingLoanContractUpdate?.previousBalance ?? 0, pendingLoanContractUpdate?.previousRevision ?? 0,
      pendingHack ? 1 : 0, pendingHack?.targetId ?? "", pendingHack?.targetLifeVersion ?? 0, actionToken);
  const statements: D1PreparedStatement[] = [];
  if (pendingHack) statements.push(env.DB.prepare(`UPDATE players SET cash=cash-?, updated_at=MAX(updated_at+1, ?), mutation_token=?
    WHERE user_id=? AND life_version=? AND updated_at=? AND cash>=? AND last_seen_at>=?
      AND reset_game_over='' AND game_over='' AND EXISTS (
        SELECT 1 FROM players actor WHERE actor.user_id=? AND actor.life_version=? AND actor.updated_at=? AND actor.reset_game_over=?
      ) RETURNING user_id`).bind(pendingHack.amount, now, actionToken, pendingHack.targetId, pendingHack.targetLifeVersion,
      pendingHack.targetRevision, pendingHack.amount, Date.now() - ONLINE_HEARTBEAT_GRACE_MS,
      user.userId, expectedLifeVersion, expectedRevision, expectedResetMarker));
  const playerResultIndex = statements.length;
  statements.push(playerStatement, ...resetStatements);
  let loanContractResultIndex = -1;
  if (pendingLoanContractUpdate) {
    loanContractResultIndex = statements.length;
    statements.push(env.DB.prepare(`UPDATE player_loan_contracts SET outstanding_balance=?, status=?, closed_at=?, revision=revision+1, mutation_token=?
      WHERE id=? AND status='active' AND outstanding_balance=? AND revision=?
        AND EXISTS (SELECT 1 FROM players WHERE user_id=? AND life_version=? AND mutation_token=? AND updated_at=?)
      RETURNING id`).bind(pendingLoanContractUpdate.balance, pendingLoanContractUpdate.balance > 0 ? "active" : "paid", pendingLoanContractUpdate.closedAt,
        actionToken, pendingLoanContractUpdate.id, pendingLoanContractUpdate.previousBalance, pendingLoanContractUpdate.previousRevision,
        user.userId, expectedLifeVersion, actionToken, now));
  }
  if (pendingProviderJobCancellation) {
    statements.push(env.DB.prepare(`UPDATE player_medical_requests SET status='cancelled', outcome='provider_job_changed', resolved_at=?
      WHERE provider_id=? AND status='pending' AND EXISTS (SELECT 1 FROM players WHERE user_id=? AND life_version=? AND mutation_token=?)`)
      .bind(now, user.userId, user.userId, expectedLifeVersion, actionToken));
    statements.push(env.DB.prepare(`UPDATE player_loan_requests SET status='cancelled', outcome='provider_job_changed', resolved_at=?
      WHERE provider_id=? AND status='pending' AND EXISTS (SELECT 1 FROM players WHERE user_id=? AND life_version=? AND mutation_token=?)`)
      .bind(now, user.userId, user.userId, expectedLifeVersion, actionToken));
  }
  if (pendingTalentSet !== null) statements.push(env.DB.prepare(`UPDATE player_progress SET talents=?, updated_at=?
    WHERE user_id=? AND EXISTS (SELECT 1 FROM players WHERE user_id=? AND life_version=? AND mutation_token=?)`)
    .bind(pendingTalentSet, now, user.userId, user.userId, expectedLifeVersion, actionToken));
  if (pendingCityEvent) statements.push(env.DB.prepare(`UPDATE player_progress SET talent_exp=MIN(1099,talent_exp+?), pending_event='', updated_at=?
    WHERE user_id=? AND pending_event=? AND EXISTS (SELECT 1 FROM players WHERE user_id=? AND life_version=? AND mutation_token=?)`)
    .bind(pendingCityEvent.talentExp, now, user.userId, pendingCityEvent.eventId, user.userId, expectedLifeVersion, actionToken));
  if (talentExpGain > 0) statements.push(env.DB.prepare(`UPDATE player_progress SET talent_exp=MIN(1099,talent_exp+?), updated_at=?
    WHERE user_id=? AND EXISTS (SELECT 1 FROM players WHERE user_id=? AND life_version=? AND mutation_token=?)`)
    .bind(talentExpGain, now, user.userId, user.userId, expectedLifeVersion, actionToken));
  if (body.action !== "move") statements.push(env.DB.prepare(`INSERT INTO game_events
    (id, user_id, player_name, room_id, title, detail, tone, game_time, created_at)
    SELECT ?, ?, ?, 'lobby-01', ?, ?, ?, ?, ? WHERE EXISTS (
      SELECT 1 FROM players WHERE user_id=? AND life_version=? AND mutation_token=?
    )`).bind(eventId, user.userId, user.displayName.slice(0, 40), title, message, tone, gameTime, now,
      user.userId, expectedLifeVersion, actionToken));
  const savedBatch = await env.DB.batch(statements);
  if ((savedBatch[playerResultIndex]?.results?.length ?? 0) !== 1) {
    return json({ message: "玩家資料剛剛被其他操作更新，這次行動未套用；請重新整理後再試。" }, 409);
  }
  if (pendingLoanContractUpdate && (savedBatch[loanContractResultIndex]?.results?.length ?? 0) !== 1) {
    return json({ message: "貸款合約同步失敗，請重新整理確認還款狀態。" }, 409);
  }
  const saved = await env.DB.prepare("SELECT * FROM players WHERE user_id = ?").bind(user.userId).first<PlayerRow>();
  if (pendingTerritoryVisit) {
    const territoryVisit = await recordTerritoryVisit(env.DB, user.userId, saved!.life_version, pendingTerritoryVisit.location, pendingTerritoryVisit.cycleDay, pendingTerritoryVisit.worldMinute);
    if (territoryVisit) message += " 進入紀錄已留下，但你沒有被扣除任何費用。";
  }
  const metric = ["work", "writer_write"].includes(body.action || "") ? "work" : body.action === "hospital" ? "hospital" : body.action === "housing" ? "housing" : body.action === "study" ? "study" : body.action === "city_event" ? "event" : null;
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
    const eventPool = CITY_EVENTS.filter((item) => !("categories" in item) || !item.categories?.length || item.categories.includes(saved!.job_category as never));
    const event = Math.random() < chance ? eventPool[Math.floor(Math.random() * eventPool.length)] : null;
    await env.DB.prepare("UPDATE player_progress SET last_event_day=?, pending_event=?, updated_at=? WHERE user_id=?")
      .bind(personalDay, event?.id ?? "", Date.now(), user.userId).run();
    progress = { ...progress, last_event_day: personalDay, pending_event: event?.id ?? "" };
  }
  if (eligibleEvent) message += await maybeFindMysteryClue(env.DB, user.userId, saved!.location);
  const world = await multiplayer(env.DB);
  const [loanContract, loanRequests, begRequests, street, aidBoxes, coop, bookStoreState, reputation, commissions, mystery, contracts, ledger] = await Promise.all([
    activeLoanContract(env.DB, user.userId),
    pendingLoanRequests(env.DB, user.userId),
    pendingBegRequests(env.DB, user.userId),
    streetState(env.DB, saved!),
    aidBoxState(env.DB, user.userId),
    coopState(env.DB, saved!),
    saved!.location === "bookstore" ? bookStore(env.DB, user.userId) : Promise.resolve({ books: [], maxActiveBooks: WRITER_MAX_ACTIVE_BOOKS, maxPurchasesPerBook: WRITER_MAX_PURCHASES_PER_BOOK }),
    reputationState(env.DB, saved!), commissionState(env.DB, saved!), mysteryState(env.DB, user.userId), contractState(env.DB, saved!), lifeLedgerState(env.DB, user.userId),
  ]);
  const casinoSnapshot = body.action === "move" && saved!.location === "casino"
    ? await Promise.all([casinoState(env.DB, user.userId), pokerState(env.DB, user.userId), bingoState(env.DB, user.userId), tournamentState(env.DB, user.userId)])
    : null;
  return json({ player: serializePlayer(saved!, progress, loanContract), message, scratch, loanRequests, begRequests, street, aidBoxes, coop, reputation, commissions, mystery, contracts, lifeLedger: ledger, bookStore: bookStoreState, cityMemory: await cityMemory(env.DB), ...world,
    ...(casinoSnapshot ? { casino: casinoSnapshot[0], poker: casinoSnapshot[1], bingo: casinoSnapshot[2], tournament: casinoSnapshot[3] } : {}) });
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
