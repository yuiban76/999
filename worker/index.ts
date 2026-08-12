type LocationId = "home" | "business" | "shopping" | "park" | "school";

interface Env { DB?: D1Database; ASSETS: Fetcher }

type PlayerRow = {
  user_id: string;
  display_name: string;
  email: string;
  cash: number;
  energy: number;
  health: number;
  mood: number;
  hunger: number;
  intelligence_exp: number;
  programming_exp: number;
  fitness_exp: number;
  work_exp: number;
  elapsed_minutes: number;
  location: LocationId;
};

const VALID_LOCATIONS = new Set<LocationId>(["home", "business", "shopping", "park", "school"]);
const clamp = (value: number) => Math.max(0, Math.min(100, value));

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

function identity(request: Request) {
  const userId = request.headers.get("oai-authenticated-user-id");
  const email = request.headers.get("oai-authenticated-user-email");
  if (!userId || !email) return null;
  let fullName: string | null = null;
  if (request.headers.get("oai-authenticated-user-full-name-encoding") === "percent-encoded-utf-8") {
    try { fullName = decodeURIComponent(request.headers.get("oai-authenticated-user-full-name") || ""); } catch { fullName = null; }
  }
  return { userId, email, displayName: fullName || email.split("@")[0] || "玩家" };
}

function guestPlayer() {
  return { cash: 10000, energy: 100, health: 100, mood: 80, hunger: 80, intelligenceExp: 0, programmingExp: 0, fitnessExp: 0, workExp: 0, elapsedMinutes: 450, location: "home" as LocationId };
}

function serializePlayer(row: PlayerRow) {
  return { cash: row.cash, energy: row.energy, health: row.health, mood: row.mood, hunger: row.hunger, intelligenceExp: row.intelligence_exp, programmingExp: row.programming_exp, fitnessExp: row.fitness_exp, workExp: row.work_exp, elapsedMinutes: row.elapsed_minutes, location: row.location };
}

async function ensureSchema(db: D1Database) {
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS players (
      user_id TEXT PRIMARY KEY, display_name TEXT NOT NULL, email TEXT NOT NULL,
      cash INTEGER NOT NULL DEFAULT 10000, energy INTEGER NOT NULL DEFAULT 100,
      health INTEGER NOT NULL DEFAULT 100, mood INTEGER NOT NULL DEFAULT 80,
      hunger INTEGER NOT NULL DEFAULT 80, intelligence_exp INTEGER NOT NULL DEFAULT 0,
      programming_exp INTEGER NOT NULL DEFAULT 0, fitness_exp INTEGER NOT NULL DEFAULT 0,
      work_exp INTEGER NOT NULL DEFAULT 0, elapsed_minutes INTEGER NOT NULL DEFAULT 450,
      location TEXT NOT NULL DEFAULT 'home', created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL, last_seen_at INTEGER NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS game_events (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, player_name TEXT NOT NULL,
      room_id TEXT NOT NULL DEFAULT 'lobby-01', title TEXT NOT NULL,
      detail TEXT NOT NULL, tone TEXT NOT NULL DEFAULT 'neutral',
      game_time TEXT NOT NULL, created_at INTEGER NOT NULL
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_players_last_seen ON players(last_seen_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_events_room_created ON game_events(room_id, created_at DESC)"),
  ]);
}

async function upsertPlayer(db: D1Database, user: NonNullable<ReturnType<typeof identity>>) {
  const now = Date.now();
  await db.prepare(`INSERT INTO players (user_id, display_name, email, created_at, updated_at, last_seen_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET display_name = excluded.display_name, email = excluded.email, last_seen_at = excluded.last_seen_at`)
    .bind(user.userId, user.displayName.slice(0, 40), user.email, now, now, now).run();
  return db.prepare("SELECT * FROM players WHERE user_id = ?").bind(user.userId).first<PlayerRow>();
}

async function multiplayer(db: D1Database) {
  const since = Date.now() - 30_000;
  const [players, events] = await Promise.all([
    db.prepare("SELECT user_id, display_name, location, last_seen_at FROM players WHERE last_seen_at >= ? ORDER BY last_seen_at DESC LIMIT 24").bind(since).all<{ user_id: string; display_name: string; location: LocationId; last_seen_at: number }>(),
    db.prepare("SELECT id, player_name, title, detail, tone, game_time FROM game_events WHERE room_id = 'lobby-01' ORDER BY created_at DESC LIMIT 12").all<{ id: string; player_name: string; title: string; detail: string; tone: "good" | "neutral" | "warn"; game_time: string }>(),
  ]);
  return {
    online: players.results.map((row) => ({ id: row.user_id, displayName: row.display_name, location: row.location, updatedAt: row.last_seen_at })),
    feed: events.results.map((row) => ({ id: row.id, playerName: row.player_name, title: row.title, detail: row.detail, tone: row.tone, time: row.game_time })),
  };
}

async function bootstrap(request: Request, env: Env) {
  const user = identity(request);
  if (!user || !env.DB) return json({ authenticated: false, profile: null, player: guestPlayer(), room: { id: "lobby-01", name: "城市大廳 01" }, online: [], feed: [] });
  await ensureSchema(env.DB);
  const row = await upsertPlayer(env.DB, user);
  if (!row) return json({ message: "無法載入玩家資料" }, 500);
  const world = await multiplayer(env.DB);
  return json({ authenticated: true, profile: { id: user.userId, displayName: user.displayName, email: user.email, signedIn: true }, player: serializePlayer(row), room: { id: "lobby-01", name: "城市大廳 01" }, ...world });
}

async function takeAction(request: Request, env: Env) {
  const user = identity(request);
  if (!user) return json({ message: "請先登入帳號，才能保存進度與加入多人世界。" }, 401);
  if (!env.DB) return json({ message: "遊戲資料庫尚未連接。" }, 503);
  await ensureSchema(env.DB);
  const current = await upsertPlayer(env.DB, user);
  if (!current) return json({ message: "找不到玩家資料。" }, 404);

  let body: { action?: string; location?: string; hours?: number; kind?: string };
  try { body = await request.json(); } catch { return json({ message: "行動資料格式錯誤。" }, 400); }
  const next = { ...current };
  let title = "完成行動";
  let message = "行動完成。";
  let tone: "good" | "neutral" | "warn" = "good";
  let minutes = 0;

  switch (body.action) {
    case "move": {
      if (!VALID_LOCATIONS.has(body.location as LocationId)) return json({ message: "目的地不存在。" }, 400);
      if (next.location === body.location) return json({ message: "你已經在這裡了。" }, 400);
      next.location = body.location as LocationId; next.energy = clamp(next.energy - 1); next.hunger = clamp(next.hunger - 1); minutes = 10;
      const placeName = ({ home: "溫暖小屋", business: "商業區", shopping: "購物街", park: "城市公園", school: "未來學院" } as Record<LocationId, string>)[next.location as LocationId];
      title = "前往新地點"; message = `花了 10 分鐘抵達${placeName}。`; tone = "neutral"; break;
    }
    case "work": {
      if (next.location !== "business") return json({ message: "請先前往商業區。" }, 400);
      const hours = Number(body.hours);
      if (![1, 4, 8].includes(hours)) return json({ message: "工時選擇不正確。" }, 400);
      if (next.energy < hours * 5) return json({ message: "體力不足，先回家休息吧。" }, 400);
      next.cash += hours * 180; next.energy = clamp(next.energy - hours * 5); next.mood = clamp(next.mood - Math.ceil(hours * .9)); next.hunger = clamp(next.hunger - hours * 2); next.work_exp += hours * 4; minutes = hours * 60;
      title = `工作 ${hours} 小時`; message = `完成工作，收入 +NT$${hours * 180}，工作經驗 +${hours * 4}。`; break;
    }
    case "study":
      if (next.location !== "school") return json({ message: "請先前往未來學院。" }, 400);
      if (next.cash < 500 || next.energy < 10) return json({ message: next.cash < 500 ? "學費不足。" : "體力不足，先休息一下吧。" }, 400);
      next.cash -= 500; next.energy = clamp(next.energy - 10); next.mood = clamp(next.mood - 3); next.hunger = clamp(next.hunger - 4); next.programming_exp += 25; next.intelligence_exp += 5; minutes = 120;
      title = "完成程式設計課"; message = "程式設計 EXP +25、知識 EXP +5。"; break;
    case "eat": {
      if (next.location !== "shopping") return json({ message: "請先前往購物街。" }, 400);
      const meal = body.kind === "rice" ? { name: "飯糰", price: 45, hunger: 20, mood: 1 } : body.kind === "bento" ? { name: "便當", price: 100, hunger: 45, mood: 3 } : null;
      if (!meal) return json({ message: "餐點不存在。" }, 400);
      if (next.cash < meal.price) return json({ message: "現金不足。" }, 400);
      next.cash -= meal.price; next.hunger = clamp(next.hunger + meal.hunger); next.mood = clamp(next.mood + meal.mood); minutes = 20;
      title = `享用${meal.name}`; message = `${meal.name}讓飽足 +${meal.hunger}。`; break;
    }
    case "sleep":
      if (next.location !== "home") return json({ message: "請先回到溫暖小屋。" }, 400);
      next.energy = 100; next.health = clamp(next.health + 5); next.mood = clamp(next.mood + 10); next.hunger = clamp(next.hunger - 12); minutes = 480;
      title = "好好睡了一覺"; message = "體力完全恢復，健康 +5、心情 +10。"; break;
    case "exercise":
      if (next.location !== "park") return json({ message: "請先前往城市公園。" }, 400);
      if (next.energy < 15) return json({ message: "體力不足，今天先休息吧。" }, 400);
      next.energy = clamp(next.energy - 15); next.health = clamp(next.health + 4); next.mood = clamp(next.mood + 8); next.hunger = clamp(next.hunger - 5); next.fitness_exp += 15; minutes = 60;
      title = "完成一小時運動"; message = "健康 +4、心情 +8、體能 EXP +15。"; break;
    case "reset":
      Object.assign(next, { cash: 10000, energy: 100, health: 100, mood: 80, hunger: 80, intelligence_exp: 0, programming_exp: 0, fitness_exp: 0, work_exp: 0, elapsed_minutes: 450, location: "home" });
      title = "重新開始人生"; message = "新的人生已開始，所有進度回到起點。"; tone = "neutral"; break;
    default: return json({ message: "未知的行動。" }, 400);
  }

  next.elapsed_minutes += minutes;
  const minuteOfDay = next.elapsed_minutes % 1440;
  const gameTime = `${String(Math.floor(minuteOfDay / 60)).padStart(2, "0")}:${String(minuteOfDay % 60).padStart(2, "0")}`;
  const now = Date.now();
  const eventId = crypto.randomUUID();
  await env.DB.batch([
    env.DB.prepare(`UPDATE players SET cash=?, energy=?, health=?, mood=?, hunger=?, intelligence_exp=?, programming_exp=?, fitness_exp=?, work_exp=?, elapsed_minutes=?, location=?, updated_at=?, last_seen_at=? WHERE user_id=?`)
      .bind(next.cash, next.energy, next.health, next.mood, next.hunger, next.intelligence_exp, next.programming_exp, next.fitness_exp, next.work_exp, next.elapsed_minutes, next.location, now, now, user.userId),
    env.DB.prepare("INSERT INTO game_events (id, user_id, player_name, room_id, title, detail, tone, game_time, created_at) VALUES (?, ?, ?, 'lobby-01', ?, ?, ?, ?, ?)")
      .bind(eventId, user.userId, user.displayName.slice(0, 40), title, message, tone, gameTime, now),
  ]);
  const saved = await env.DB.prepare("SELECT * FROM players WHERE user_id = ?").bind(user.userId).first<PlayerRow>();
  const world = await multiplayer(env.DB);
  return json({ player: serializePlayer(saved!), message, ...world });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/api/game" && request.method === "GET") return bootstrap(request, env);
    if (url.pathname === "/api/game/action" && request.method === "POST") return takeAction(request, env);
    if (url.pathname.startsWith("/api/")) return json({ message: "找不到 API。" }, 404);
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
