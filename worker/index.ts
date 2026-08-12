type LocationId = "home" | "business" | "shopping" | "park" | "school" | "hospital";

interface Env { DB?: D1Database; ASSETS?: Fetcher; FRONTEND_ORIGIN?: string }

type AuthUser = { userId: string; email: string; displayName: string; hasAvatar: boolean; avatarUpdatedAt: number | null };

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
  illness: string;
  elapsed_minutes: number;
  location: LocationId;
};

const VALID_LOCATIONS = new Set<LocationId>(["home", "business", "shopping", "park", "school", "hospital"]);
const clamp = (value: number) => Math.max(0, Math.min(100, value));
const CAREERS = [
  { title: "職場實習生", threshold: 0, hourlyPay: 180 },
  { title: "初級專員", threshold: 100, hourlyPay: 230 },
  { title: "資深專員", threshold: 250, hourlyPay: 300 },
  { title: "部門主管", threshold: 500, hourlyPay: 400 },
  { title: "事業經理", threshold: 900, hourlyPay: 550 },
];

function careerFor(exp: number) {
  return [...CAREERS].reverse().find((career) => exp >= career.threshold) ?? CAREERS[0];
}

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
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
  return { cash: 10000, energy: 100, health: 100, mood: 80, hunger: 80, intelligenceExp: 0, programmingExp: 0, fitnessExp: 0, workExp: 0, illness: "", elapsedMinutes: 450, location: "home" as LocationId };
}

function serializePlayer(row: PlayerRow) {
  return { cash: row.cash, energy: row.energy, health: row.health, mood: row.mood, hunger: row.hunger, intelligenceExp: row.intelligence_exp, programmingExp: row.programming_exp, fitnessExp: row.fitness_exp, workExp: row.work_exp, illness: row.illness, elapsedMinutes: row.elapsed_minutes, location: row.location };
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
      cash INTEGER NOT NULL DEFAULT 10000, energy INTEGER NOT NULL DEFAULT 100,
      health INTEGER NOT NULL DEFAULT 100, mood INTEGER NOT NULL DEFAULT 80,
      hunger INTEGER NOT NULL DEFAULT 80, intelligence_exp INTEGER NOT NULL DEFAULT 0,
      programming_exp INTEGER NOT NULL DEFAULT 0, fitness_exp INTEGER NOT NULL DEFAULT 0,
      work_exp INTEGER NOT NULL DEFAULT 0, illness TEXT NOT NULL DEFAULT '',
      elapsed_minutes INTEGER NOT NULL DEFAULT 450,
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
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_email ON accounts(email)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at)"),
  ]);
}

async function upsertPlayer(db: D1Database, user: AuthUser) {
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
  if (!user || !env.DB) return json({ authenticated: false, profile: null, player: guestPlayer(), room: { id: "lobby-01", name: "城市大廳 01" }, online: [], feed: [] });
  await ensureSchema(env.DB);
  const row = await upsertPlayer(env.DB, user);
  if (!row) return json({ message: "無法載入玩家資料" }, 500);
  const world = await multiplayer(env.DB);
  return json({ authenticated: true, profile: profileFor(user), player: serializePlayer(row), room: { id: "lobby-01", name: "城市大廳 01" }, ...world });
}

async function takeAction(request: Request, env: Env) {
  const user = await identity(request, env.DB);
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
      const placeName = ({ home: "溫暖小屋", business: "商業區", shopping: "購物街", park: "城市公園", school: "未來學院", hospital: "市立醫院" } as Record<LocationId, string>)[next.location as LocationId];
      title = "前往新地點"; message = `花了 10 分鐘抵達${placeName}。`; tone = "neutral"; break;
    }
    case "work": {
      if (next.location !== "business") return json({ message: "請先前往商業區。" }, 400);
      if (next.illness) return json({ message: `目前罹患${next.illness}，請先前往醫院治療。` }, 400);
      const hours = Number(body.hours);
      if (![1, 4, 8].includes(hours)) return json({ message: "工時選擇不正確。" }, 400);
      if (next.energy < hours * 5) return json({ message: "體力不足，先回家休息吧。" }, 400);
      const previousCareer = careerFor(next.work_exp);
      const income = hours * previousCareer.hourlyPay;
      next.cash += income; next.energy = clamp(next.energy - hours * 5); next.health = clamp(next.health - Math.ceil(hours / 2)); next.mood = clamp(next.mood - Math.ceil(hours * .9)); next.hunger = clamp(next.hunger - hours * 2); next.work_exp += hours * 4; minutes = hours * 60;
      const newCareer = careerFor(next.work_exp);
      title = newCareer.title !== previousCareer.title ? `升遷為${newCareer.title}` : `工作 ${hours} 小時`;
      message = `以${previousCareer.title}完成工作，收入 +NT$${income}，工作經驗 +${hours * 4}。${newCareer.title !== previousCareer.title ? ` 恭喜升遷為${newCareer.title}！` : ""}`; break;
    }
    case "study":
      if (next.location !== "school") return json({ message: "請先前往未來學院。" }, 400);
      if (next.illness) return json({ message: `目前罹患${next.illness}，請先前往醫院治療。` }, 400);
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
      if (next.illness) return json({ message: `目前罹患${next.illness}，不適合運動，請先就醫。` }, 400);
      if (next.energy < 15) return json({ message: "體力不足，今天先休息吧。" }, 400);
      next.energy = clamp(next.energy - 15); next.health = clamp(next.health + 4); next.mood = clamp(next.mood + 8); next.hunger = clamp(next.hunger - 5); next.fitness_exp += 15; minutes = 60;
      title = "完成一小時運動"; message = "健康 +4、心情 +8、體能 EXP +15。"; break;
    case "hospital": {
      if (next.location !== "hospital") return json({ message: "請先前往市立醫院。" }, 400);
      const care = body.kind === "clinic"
        ? { name: "一般門診", price: 600, minutes: 60, health: Math.min(100, next.health + 25), energy: Math.min(100, next.energy + 10) }
        : body.kind === "treatment"
          ? { name: "完整治療", price: 1500, minutes: 120, health: Math.max(80, next.health), energy: Math.min(100, next.energy + 30) }
          : null;
      if (!care) return json({ message: "醫療項目不存在。" }, 400);
      if (next.cash < care.price) return json({ message: "醫療費不足。" }, 400);
      const previousIllness = next.illness;
      next.cash -= care.price; next.health = care.health; next.energy = care.energy; next.illness = ""; minutes = care.minutes;
      title = previousIllness ? `治癒${previousIllness}` : care.name;
      message = `${care.name}完成，支付 NT$${care.price}，健康恢復至 ${next.health}${previousIllness ? `，${previousIllness}已痊癒` : ""}。`; break;
    }
    case "reset":
      Object.assign(next, { cash: 10000, energy: 100, health: 100, mood: 80, hunger: 80, intelligence_exp: 0, programming_exp: 0, fitness_exp: 0, work_exp: 0, illness: "", elapsed_minutes: 450, location: "home" });
      title = "重新開始人生"; message = "新的人生已開始，所有進度回到起點。"; tone = "neutral"; break;
    default: return json({ message: "未知的行動。" }, 400);
  }

  if (body.action !== "hospital" && body.action !== "reset") {
    if (next.hunger <= 15) next.health = clamp(next.health - 6);
    if (next.energy <= 5) next.health = clamp(next.health - 4);
    if (!next.illness && next.health < 70) {
      const chance = next.health < 30 ? 0.35 : next.health < 50 ? 0.18 : 0.08;
      if (Math.random() < chance) {
        next.illness = next.health < 30 ? "重感冒" : "感冒";
        tone = "warn";
        title = `生病：${next.illness}`;
        message += ` 健康偏低，你罹患了${next.illness}，請前往市立醫院。`;
      }
    }
  }

  next.elapsed_minutes += minutes;
  const minuteOfDay = next.elapsed_minutes % 1440;
  const gameTime = `${String(Math.floor(minuteOfDay / 60)).padStart(2, "0")}:${String(minuteOfDay % 60).padStart(2, "0")}`;
  const now = Date.now();
  const eventId = crypto.randomUUID();
  await env.DB.batch([
    env.DB.prepare(`UPDATE players SET cash=?, energy=?, health=?, mood=?, hunger=?, intelligence_exp=?, programming_exp=?, fitness_exp=?, work_exp=?, illness=?, elapsed_minutes=?, location=?, updated_at=?, last_seen_at=? WHERE user_id=?`)
      .bind(next.cash, next.energy, next.health, next.mood, next.hunger, next.intelligence_exp, next.programming_exp, next.fitness_exp, next.work_exp, next.illness, next.elapsed_minutes, next.location, now, now, user.userId),
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
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request, env) });
    let response: Response;
    if (url.pathname === "/api/auth/register" && request.method === "POST") response = await auth(request, env, "register");
    else if (url.pathname === "/api/auth/login" && request.method === "POST") response = await auth(request, env, "login");
    else if (url.pathname === "/api/auth/logout" && request.method === "POST") response = await logout(request, env);
    else if (url.pathname === "/api/profile/avatar" && request.method === "POST") response = await uploadAvatar(request, env);
    else if (url.pathname.startsWith("/api/avatar/") && request.method === "GET") response = await getAvatar(url.pathname.slice("/api/avatar/".length), env);
    else if (url.pathname === "/api/game" && request.method === "GET") response = await bootstrap(request, env);
    else if (url.pathname === "/api/game/action" && request.method === "POST") response = await takeAction(request, env);
    else if (url.pathname.startsWith("/api/")) response = json({ message: "找不到 API。" }, 404);
    else if (env.ASSETS) return env.ASSETS.fetch(request);
    else response = json({ service: "Life Online API", ok: true });
    return withCors(response, request, env);
  },
} satisfies ExportedHandler<Env>;
