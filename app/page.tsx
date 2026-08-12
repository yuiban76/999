"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type LocationId = "home" | "business" | "shopping" | "park" | "school";
type StatKey = "energy" | "health" | "mood" | "hunger";

type Player = {
  cash: number;
  energy: number;
  health: number;
  mood: number;
  hunger: number;
  intelligenceExp: number;
  programmingExp: number;
  fitnessExp: number;
  workExp: number;
  elapsedMinutes: number;
  location: LocationId;
};

type Profile = {
  id: string;
  displayName: string;
  email: string;
  signedIn: boolean;
};

type OnlinePlayer = {
  id: string;
  displayName: string;
  location: LocationId;
  updatedAt: number;
};

type FeedItem = {
  id: string;
  time: string;
  title: string;
  detail: string;
  tone: "good" | "neutral" | "warn";
  playerName?: string;
};

type Bootstrap = {
  authenticated: boolean;
  profile: Profile | null;
  player: Player;
  room: { id: string; name: string };
  online: OnlinePlayer[];
  feed: FeedItem[];
};

const INITIAL_PLAYER: Player = {
  cash: 10000,
  energy: 100,
  health: 100,
  mood: 80,
  hunger: 80,
  intelligenceExp: 0,
  programmingExp: 0,
  fitnessExp: 0,
  workExp: 0,
  elapsedMinutes: 450,
  location: "home",
};

const API_ORIGIN = (import.meta.env.VITE_API_ORIGIN as string | undefined)?.replace(/\/$/, "") || "";
const TOKEN_KEY = "life-online-session";

function apiHeaders(jsonBody = false) {
  const token = window.localStorage.getItem(TOKEN_KEY);
  return {
    ...(jsonBody ? { "Content-Type": "application/json" } : { Accept: "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

const locations: Array<{ id: LocationId; emoji: string; name: string; caption: string }> = [
  { id: "home", emoji: "⌂", name: "溫暖小屋", caption: "休息、恢復體力，準備迎接新的一天" },
  { id: "business", emoji: "▦", name: "商業區", caption: "用時間換取收入，累積職涯經驗" },
  { id: "shopping", emoji: "◇", name: "購物街", caption: "補充飽足，偶爾也犒賞一下自己" },
  { id: "park", emoji: "♧", name: "城市公園", caption: "鍛鍊身體，找回健康與好心情" },
  { id: "school", emoji: "▤", name: "未來學院", caption: "投資自己，讓選擇越來越多" },
];

const statMeta: Array<{ key: StatKey; icon: string; label: string }> = [
  { key: "health", icon: "+", label: "健康" },
  { key: "energy", icon: "↯", label: "體力" },
  { key: "mood", icon: "○", label: "心情" },
  { key: "hunger", icon: "△", label: "飽足" },
];

const locationName = (id: LocationId) => locations.find((item) => item.id === id)?.name ?? id;
const formatMoney = (value: number) => new Intl.NumberFormat("zh-TW").format(value);
const level = (exp: number) => exp >= 900 ? 5 : exp >= 500 ? 4 : exp >= 250 ? 3 : exp >= 100 ? 2 : 1;
const levelProgress = (exp: number) => {
  const thresholds = [0, 100, 250, 500, 900, 1500];
  const current = level(exp);
  return Math.min(100, ((exp - thresholds[current - 1]) / (thresholds[current] - thresholds[current - 1])) * 100);
};

function clock(minutes: number) {
  const totalDays = Math.floor(minutes / 1440);
  const minuteOfDay = minutes % 1440;
  const date = new Date(2052, 2, 17 + totalDays);
  const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
  return {
    date: `${date.getFullYear()} / ${String(date.getMonth() + 1).padStart(2, "0")} / ${String(date.getDate()).padStart(2, "0")}`,
    weekday: `星期${weekdays[date.getDay()]}`,
    time: `${String(Math.floor(minuteOfDay / 60)).padStart(2, "0")}:${String(minuteOfDay % 60).padStart(2, "0")}`,
  };
}

function guestAction(current: Player, action: string, payload: Record<string, unknown>) {
  const next = { ...current };
  let title = "完成行動";
  let message = "行動完成。";
  let minutes = 0;
  const fail = (text: string) => ({ error: text });
  if (action === "move") {
    const target = payload.location as LocationId;
    if (!locations.some((item) => item.id === target) || target === next.location) return fail("你已經在這裡了。");
    next.location = target; next.energy = Math.max(0, next.energy - 1); next.hunger = Math.max(0, next.hunger - 1); minutes = 10; title = "前往新地點"; message = `花了 10 分鐘抵達${locationName(target)}。`;
  } else if (action === "work") {
    const hours = Number(payload.hours);
    if (next.location !== "business" || ![1, 4, 8].includes(hours)) return fail("請先前往商業區。");
    if (next.energy < hours * 5) return fail("體力不足，先回家休息吧。");
    next.cash += hours * 180; next.energy = Math.max(0, next.energy - hours * 5); next.mood = Math.max(0, next.mood - Math.ceil(hours * .9)); next.hunger = Math.max(0, next.hunger - hours * 2); next.workExp += hours * 4; minutes = hours * 60; title = `工作 ${hours} 小時`; message = `完成工作，收入 +NT$${hours * 180}。`;
  } else if (action === "study") {
    if (next.location !== "school") return fail("請先前往未來學院。");
    if (next.cash < 500 || next.energy < 10) return fail(next.cash < 500 ? "學費不足。" : "體力不足。");
    next.cash -= 500; next.energy -= 10; next.mood = Math.max(0, next.mood - 3); next.hunger = Math.max(0, next.hunger - 4); next.programmingExp += 25; next.intelligenceExp += 5; minutes = 120; title = "完成程式設計課"; message = "程式設計 EXP +25、知識 EXP +5。";
  } else if (action === "eat") {
    if (next.location !== "shopping") return fail("請先前往購物街。");
    const meal = payload.kind === "rice" ? { name: "飯糰", price: 45, hunger: 20, mood: 1 } : { name: "便當", price: 100, hunger: 45, mood: 3 };
    if (next.cash < meal.price) return fail("現金不足。");
    next.cash -= meal.price; next.hunger = Math.min(100, next.hunger + meal.hunger); next.mood = Math.min(100, next.mood + meal.mood); minutes = 20; title = `享用${meal.name}`; message = `${meal.name}讓飽足 +${meal.hunger}。`;
  } else if (action === "sleep") {
    if (next.location !== "home") return fail("請先回到溫暖小屋。");
    next.energy = 100; next.health = Math.min(100, next.health + 5); next.mood = Math.min(100, next.mood + 10); next.hunger = Math.max(0, next.hunger - 12); minutes = 480; title = "好好睡了一覺"; message = "體力完全恢復，健康 +5、心情 +10。";
  } else if (action === "exercise") {
    if (next.location !== "park") return fail("請先前往城市公園。");
    if (next.energy < 15) return fail("體力不足，今天先休息吧。");
    next.energy -= 15; next.health = Math.min(100, next.health + 4); next.mood = Math.min(100, next.mood + 8); next.hunger = Math.max(0, next.hunger - 5); next.fitnessExp += 15; minutes = 60; title = "完成一小時運動"; message = "健康 +4、心情 +8、體能 EXP +15。";
  } else if (action === "reset") {
    return { player: { ...INITIAL_PLAYER }, title: "重新開始人生", message: "新的人生已開始，所有試玩進度回到起點。" };
  } else return fail("未知的行動。");
  next.elapsedMinutes += minutes;
  return { player: next, title, message };
}

export default function Home() {
  const [player, setPlayer] = useState<Player>(INITIAL_PLAYER);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [online, setOnline] = useState<OnlinePlayer[]>([]);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authError, setAuthError] = useState("");
  const [notice, setNotice] = useState("正在連接人生世界……");
  const gameClock = useMemo(() => clock(player.elapsedMinutes), [player.elapsedMinutes]);
  const currentLocation = locations.find((item) => item.id === player.location)!;

  const loadWorld = useCallback(async (quiet = false) => {
    try {
      const response = await fetch(`${API_ORIGIN}/api/game`, { headers: apiHeaders() });
      if (!response.ok) throw new Error("世界暫時無法連線");
      const data = await response.json() as Bootstrap;
      if (data.authenticated || !quiet) {
        setPlayer(data.player);
        setProfile(data.profile);
      }
      setOnline(data.online);
      setFeed(data.feed);
      if (!quiet) {
        setNotice(data.authenticated ? `歡迎回來，${data.profile?.displayName}。進度已同步。` : "目前是訪客試玩；登入後即可永久保存並加入多人世界。");
      }
    } catch {
      if (!quiet) setNotice("目前使用離線試玩模式；連線恢復後可重新同步。");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWorld();
    const timer = window.setInterval(() => void loadWorld(true), 5000);
    return () => window.clearInterval(timer);
  }, [loadWorld]);

  async function act(action: string, payload: Record<string, unknown> = {}) {
    if (busy) return;
    setBusy(true);
    if (!profile) {
      const result = guestAction(player, action, payload);
      if ("error" in result) setNotice(result.error || "行動失敗。");
      else if (result.player) {
        setPlayer(result.player);
        setNotice(`${result.message}（訪客進度不會儲存）`);
        const time = clock(result.player.elapsedMinutes).time;
        setFeed((items) => [{ id: crypto.randomUUID(), time, title: result.title || "完成行動", detail: result.message || "", tone: "neutral" as const }, ...items].slice(0, 6));
      }
      setBusy(false);
      return;
    }
    try {
      const response = await fetch(`${API_ORIGIN}/api/game/action`, {
        method: "POST",
        headers: apiHeaders(true),
        body: JSON.stringify({ action, ...payload }),
      });
      const data = await response.json() as { player?: Player; online?: OnlinePlayer[]; feed?: FeedItem[]; message?: string };
      if (!response.ok || !data.player) throw new Error(data.message || "行動失敗");
      setPlayer(data.player);
      if (data.online) setOnline(data.online);
      if (data.feed) setFeed(data.feed);
      setNotice(data.message || "行動完成");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "行動失敗，請稍後再試。");
    } finally {
      setBusy(false);
    }
  }

  async function submitAuth(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setAuthError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(`${API_ORIGIN}/api/auth/${authMode}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.get("email"), password: form.get("password"), displayName: form.get("displayName") }),
      });
      const data = await response.json() as { token?: string; message?: string };
      if (!response.ok || !data.token) throw new Error(data.message || "登入失敗。");
      window.localStorage.setItem(TOKEN_KEY, data.token);
      setAuthOpen(false);
      await loadWorld();
    } catch (error) { setAuthError(error instanceof Error ? error.message : "登入失敗。"); }
    finally { setBusy(false); }
  }

  async function logout() {
    try { await fetch(`${API_ORIGIN}/api/auth/logout`, { method: "POST", headers: apiHeaders() }); } catch { /* local logout still works */ }
    window.localStorage.removeItem(TOKEN_KEY);
    setProfile(null); setOnline([]); setFeed([]); setPlayer(INITIAL_PLAYER);
    setNotice("已登出；目前為訪客試玩模式。");
  }

  return (
    <main className="game-shell">
      <header className="topbar">
        <a className="brand" href="#main-game" aria-label="人生 Online 首頁">
          <span className="brand-mark">人</span>
          <span><strong>人生 ONLINE</strong><small>LIFE, ONE CHOICE AT A TIME.</small></span>
        </a>
        <div className="world-time"><span>{gameClock.date}</span><strong>{gameClock.time}</strong><span>{gameClock.weekday}</span></div>
        <div className="account-area">
          <span className={`connection-dot ${profile ? "connected" : ""}`} />
          {profile ? (
            <><div><strong>{profile.displayName}</strong><small>進度已儲存 · 大廳 01</small></div><button className="account-button" onClick={() => void logout()}>登出</button></>
          ) : (
            <><div><strong>訪客試玩</strong><small>進度不會儲存</small></div><button className="account-button login-link" onClick={() => { setAuthMode("login"); setAuthOpen(true); }}>登入帳號</button></>
          )}
        </div>
      </header>

      <section className="marquee" aria-live="polite">
        <span className="marquee-label">世界快訊</span><p>{notice}</p><span className="weather">台北 · 晴朗 27°</span>
      </section>

      <div className="game-grid" id="main-game" aria-busy={loading || busy}>
        <aside className="character-panel panel">
          <div className="panel-kicker">MY LIFE / {profile ? "ONLINE" : "GUEST"}</div>
          <div className="identity"><div className="avatar">{profile?.displayName.slice(0, 1) ?? "旅"}</div><div><p>18 歲 · 人生新手</p><h1>{profile?.displayName ?? "旅行者"}</h1><span className="job-tag">城市居民</span></div></div>
          <div className="cash-card"><span>可用資產</span><strong><small>NT$</small>{formatMoney(player.cash)}</strong><p>{profile ? "伺服器已安全保存" : "訪客模式暫存"}</p></div>
          <div className="stat-list">
            {statMeta.map((item) => <div className="stat-row" key={item.key}><span className="stat-label"><span>{item.icon}</span>{item.label}</span><div className="stat-track"><i style={{ width: `${player[item.key]}%` }} /></div><strong>{player[item.key]}</strong></div>)}
          </div>
          <div className="skills-block"><div className="section-heading"><span>能力履歷</span><small>SKILLS</small></div><Skill name="程式設計" exp={player.programmingExp} /><Skill name="體能" exp={player.fitnessExp} /><Skill name="工作經驗" exp={player.workExp} /></div>
        </aside>

        <section className="world-panel panel">
          <div className="location-header"><div><p>YOU ARE HERE</p><h2><span>{currentLocation.emoji}</span>{currentLocation.name}</h2><small>{currentLocation.caption}</small></div><span className="map-index">CITY · LOBBY 01</span></div>
          <nav className="location-strip" aria-label="城市地點">
            {locations.map((item) => <button className={item.id === player.location ? "active" : ""} key={item.id} onClick={() => void act("move", { location: item.id })} disabled={busy}><span>{item.emoji}</span><small>{item.name}</small></button>)}
          </nav>
          <div className="action-stage">
            <div className="stage-number">{String(locations.findIndex((item) => item.id === player.location) + 1).padStart(2, "0")}</div>
            <div className="action-intro"><span>今天，想把時間花在哪裡？</span><h3>{actionTitle(player.location)}</h3><p>{actionDescription(player.location)}</p></div>
            <div className="action-cards">
              {player.location === "home" && <ActionCard icon="☾" title="睡眠 8 小時" meta="體力全滿 · 健康 +5 · 心情 +10" button="好好休息" onClick={() => void act("sleep")} disabled={busy} />}
              {player.location === "business" && <><ActionCard icon="01" title="短班 1 小時" meta="收入 NT$180 · 體力 -5" button="開始工作" onClick={() => void act("work", { hours: 1 })} disabled={busy} /><ActionCard icon="04" title="標準班 4 小時" meta="收入 NT$720 · 體力 -20" button="開始工作" onClick={() => void act("work", { hours: 4 })} featured disabled={busy} /><ActionCard icon="08" title="長班 8 小時" meta="收入 NT$1,440 · 體力 -40" button="開始工作" onClick={() => void act("work", { hours: 8 })} disabled={busy} /></>}
              {player.location === "shopping" && <><ActionCard icon="飯" title="巷口飯糰" meta="NT$45 · 飽足 +20" button="買來吃" onClick={() => void act("eat", { kind: "rice" })} disabled={busy} /><ActionCard icon="餐" title="豐盛便當" meta="NT$100 · 飽足 +45 · 心情 +3" button="享用便當" onClick={() => void act("eat", { kind: "bento" })} featured disabled={busy} /></>}
              {player.location === "park" && <ActionCard icon="跑" title="運動 1 小時" meta="健康 +4 · 心情 +8 · 體能 EXP +15" button="開始鍛鍊" onClick={() => void act("exercise")} featured disabled={busy} />}
              {player.location === "school" && <ActionCard icon="學" title="程式設計課" meta="NT$500 · 2 小時 · 程式 EXP +25" button="報名上課" onClick={() => void act("study")} featured disabled={busy} />}
            </div>
          </div>
          <footer className="world-footer"><span>遊戲 1 小時 = 現實一次行動</span><button onClick={() => void act("reset")} disabled={busy}>重新開始人生</button></footer>
        </section>

        <aside className="story-panel panel">
          <div className="section-heading story-title"><span>多人世界</span><small>LIVE LOBBY</small></div>
          <div className="online-summary"><strong><i />{online.length} 位在線</strong><span>每 5 秒同步</span></div>
          <ul className="online-list">
            {online.length ? online.slice(0, 8).map((item) => <li key={item.id}><span className="mini-avatar">{item.displayName.slice(0, 1)}</span><div><strong>{item.displayName}{item.id === profile?.id ? "（你）" : ""}</strong><small>正在 {locationName(item.location)}</small></div></li>) : <li className="empty-online">登入後，你會在這裡遇見其他玩家。</li>}
          </ul>
          <div className="section-heading feed-heading"><span>城市動態</span><small>ACTIVITY</small></div>
          <ol className="feed-list">
            {feed.slice(0, 6).map((item) => <li key={item.id} className={item.tone}><time>{item.time}</time><div><strong>{item.playerName ? `${item.playerName} · ` : ""}{item.title}</strong><p>{item.detail}</p></div></li>)}
          </ol>
          <div className="next-goal"><span>下一個里程碑</span><strong>程式設計 Lv.2</strong><div><i style={{ width: `${levelProgress(player.programmingExp)}%` }} /></div><small>{player.programmingExp} / 100 EXP</small></div>
        </aside>
      </div>
      {authOpen && <div className="auth-overlay" role="dialog" aria-modal="true" aria-labelledby="auth-title" onMouseDown={(event) => { if (event.currentTarget === event.target) setAuthOpen(false); }}>
        <form className="auth-card" onSubmit={submitAuth}>
          <button className="auth-close" type="button" aria-label="關閉" onClick={() => setAuthOpen(false)}>×</button>
          <span className="panel-kicker">LIFE ONLINE ACCOUNT</span>
          <h2 id="auth-title">{authMode === "login" ? "歡迎回來" : "建立人生帳號"}</h2>
          <p>{authMode === "login" ? "登入後繼續上次的進度，並加入多人城市。" : "免費註冊，進度將安全保存在雲端。"}</p>
          {authMode === "register" && <label>玩家暱稱<input name="displayName" minLength={2} maxLength={24} required autoComplete="nickname" /></label>}
          <label>Email<input name="email" type="email" required autoComplete="email" /></label>
          <label>密碼<input name="password" type="password" minLength={8} maxLength={128} required autoComplete={authMode === "login" ? "current-password" : "new-password"} /></label>
          {authError && <p className="auth-error" role="alert">{authError}</p>}
          <button className="auth-submit" disabled={busy}>{busy ? "連線中…" : authMode === "login" ? "登入並繼續" : "註冊並開始"}</button>
          <button className="auth-switch" type="button" onClick={() => { setAuthMode(authMode === "login" ? "register" : "login"); setAuthError(""); }}>{authMode === "login" ? "還沒有帳號？免費註冊" : "已經有帳號？回到登入"}</button>
        </form>
      </div>}
    </main>
  );
}

function Skill({ name, exp }: { name: string; exp: number }) {
  return <div className="skill-row"><div><span>{name}</span><strong>Lv.{level(exp)}</strong></div><div className="skill-track"><i style={{ width: `${levelProgress(exp)}%` }} /></div></div>;
}

function ActionCard({ icon, title, meta, button, featured = false, disabled, onClick }: { icon: string; title: string; meta: string; button: string; featured?: boolean; disabled: boolean; onClick: () => void }) {
  return <article className={`action-card ${featured ? "featured" : ""}`}><span className="action-icon">{icon}</span><h4>{title}</h4><p>{meta}</p><button onClick={onClick} disabled={disabled}>{disabled ? "同步中…" : button}<span>→</span></button></article>;
}

function actionTitle(location: LocationId) {
  return { home: "休息不是停下，而是為下一步蓄力", business: "工作換來收入，也打開新的機會", shopping: "照顧日常，才能走得更遠", park: "健康是所有選擇的底氣", school: "今天學會的，會成為明天的選項" }[location];
}

function actionDescription(location: LocationId) {
  return { home: "回到自己的空間。睡一覺能恢復體力與心情，但也別忘了補充飽足。", business: "選擇不同工時，取得收入與工作經驗。長工時回報高，也會快速消耗狀態。", shopping: "用合理的花費補充飽足。更豐盛的餐點，也能讓今天的心情好一點。", park: "用一小時運動換取長期健康與體能。當體力太低時，先回家休息。", school: "支付學費與時間，累積程式設計能力。能力提升後，人生將有更多路可以走。" }[location];
}
