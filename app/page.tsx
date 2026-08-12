"use client";

import { useMemo, useState } from "react";

type StatKey = "energy" | "health" | "mood" | "hunger";
type LocationId = "home" | "business" | "shopping" | "park" | "school";

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
};

type FeedItem = {
  id: number;
  time: string;
  title: string;
  detail: string;
  tone: "good" | "neutral" | "warn";
};

const INITIAL_MINUTES = 7 * 60 + 30;
const GAME_START_DAY = 17;

const initialPlayer: Player = {
  cash: 10000,
  energy: 100,
  health: 100,
  mood: 80,
  hunger: 80,
  intelligenceExp: 0,
  programmingExp: 0,
  fitnessExp: 0,
  workExp: 0,
};

const locations: Array<{
  id: LocationId;
  emoji: string;
  name: string;
  caption: string;
}> = [
  { id: "home", emoji: "🏠", name: "住宅區", caption: "休息與整理生活" },
  { id: "business", emoji: "🏢", name: "商業區", caption: "努力換取報酬" },
  { id: "shopping", emoji: "🏪", name: "商店街", caption: "填飽肚子再出發" },
  { id: "park", emoji: "🌳", name: "城市公園", caption: "流汗，也讓心透氣" },
  { id: "school", emoji: "🏫", name: "社區學院", caption: "為下一份工作準備" },
];

const statMeta: Array<{ key: StatKey; icon: string; label: string }> = [
  { key: "health", icon: "♥", label: "健康" },
  { key: "energy", icon: "ϟ", label: "體力" },
  { key: "mood", icon: "☻", label: "心情" },
  { key: "hunger", icon: "●", label: "飽食" },
];

const clamp = (value: number) => Math.max(0, Math.min(100, value));

function formatMoney(value: number) {
  return new Intl.NumberFormat("zh-TW").format(value);
}

function getLevel(exp: number) {
  if (exp >= 900) return 5;
  if (exp >= 500) return 4;
  if (exp >= 250) return 3;
  if (exp >= 100) return 2;
  return 1;
}

function getLevelProgress(exp: number) {
  const thresholds = [0, 100, 250, 500, 900, 1500];
  const level = getLevel(exp);
  const start = thresholds[level - 1];
  const end = thresholds[level];
  return Math.min(100, ((exp - start) / (end - start)) * 100);
}

export default function Home() {
  const [player, setPlayer] = useState(initialPlayer);
  const [location, setLocation] = useState<LocationId>("home");
  const [elapsedMinutes, setElapsedMinutes] = useState(INITIAL_MINUTES);
  const [notice, setNotice] = useState("新的一天開始了。你想把今天過成什麼樣子？");
  const [feed, setFeed] = useState<FeedItem[]>([
    {
      id: 1,
      time: "07:30",
      title: "抵達新手出租屋",
      detail: "城市醒來了，你的人生也正式開始。",
      tone: "neutral",
    },
  ]);

  const gameClock = useMemo(() => {
    const totalDays = Math.floor(elapsedMinutes / 1440);
    const minuteOfDay = elapsedMinutes % 1440;
    const hour = Math.floor(minuteOfDay / 60);
    const minute = minuteOfDay % 60;
    const date = new Date(2052, 2, GAME_START_DAY + totalDays);
    const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
    return {
      date: `${date.getFullYear()} / ${String(date.getMonth() + 1).padStart(2, "0")} / ${String(date.getDate()).padStart(2, "0")}`,
      weekday: `星期${weekdays[date.getDay()]}`,
      time: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    };
  }, [elapsedMinutes]);

  const currentLocation = locations.find((item) => item.id === location)!;

  function commit(
    minutes: number,
    title: string,
    detail: string,
    tone: FeedItem["tone"],
    update: (current: Player) => Player,
  ) {
    const nextMinutes = elapsedMinutes + minutes;
    const minuteOfDay = nextMinutes % 1440;
    const time = `${String(Math.floor(minuteOfDay / 60)).padStart(2, "0")}:${String(minuteOfDay % 60).padStart(2, "0")}`;
    setPlayer((current) => update(current));
    setElapsedMinutes(nextMinutes);
    setNotice(detail);
    setFeed((current) => [
      { id: Date.now(), time, title, detail, tone },
      ...current,
    ].slice(0, 6));
  }

  function moveTo(target: LocationId) {
    if (target === location) return;
    const destination = locations.find((item) => item.id === target)!;
    setLocation(target);
    commit(
      10,
      `前往${destination.name}`,
      `你花了 10 分鐘抵達${destination.name}。`,
      "neutral",
      (current) => ({
        ...current,
        energy: clamp(current.energy - 1),
        hunger: clamp(current.hunger - 1),
      }),
    );
  }

  function work(hours: 1 | 4 | 8) {
    const energyCost = hours * 5;
    if (player.energy < energyCost) {
      setNotice("體力不足，先回家休息再工作吧。");
      return;
    }
    const salary = hours * 180;
    commit(
      hours * 60,
      `超商排班 ${hours} 小時`,
      `工作完成，薪資 +$${formatMoney(salary)}，工作經驗 +${hours * 4}。`,
      "good",
      (current) => ({
        ...current,
        cash: current.cash + salary,
        energy: clamp(current.energy - energyCost),
        mood: clamp(current.mood - Math.ceil(hours * 0.9)),
        hunger: clamp(current.hunger - hours * 2),
        workExp: current.workExp + hours * 4,
      }),
    );
  }

  function study() {
    if (player.cash < 500 || player.energy < 10) {
      setNotice(player.cash < 500 ? "課程費用不足。" : "體力不足，今天很難專心上課。");
      return;
    }
    commit(
      120,
      "基礎程式設計",
      "你完成了兩小時課程：程式 EXP +25、智力 EXP +5。",
      "good",
      (current) => ({
        ...current,
        cash: current.cash - 500,
        energy: clamp(current.energy - 10),
        mood: clamp(current.mood - 3),
        hunger: clamp(current.hunger - 4),
        programmingExp: current.programmingExp + 25,
        intelligenceExp: current.intelligenceExp + 5,
      }),
    );
  }

  function eat(kind: "rice" | "bento") {
    const meal = kind === "rice"
      ? { name: "飯糰", price: 45, hunger: 20 }
      : { name: "暖心便當", price: 100, hunger: 45 };
    if (player.cash < meal.price) {
      setNotice("現金不足，無法購買這份餐點。");
      return;
    }
    commit(
      20,
      `享用${meal.name}`,
      `${meal.name}讓飽食 +${meal.hunger}。有好好吃飯，也是一種前進。`,
      "good",
      (current) => ({
        ...current,
        cash: current.cash - meal.price,
        hunger: clamp(current.hunger + meal.hunger),
        mood: clamp(current.mood + (kind === "bento" ? 3 : 1)),
      }),
    );
  }

  function sleep() {
    commit(
      480,
      "好好睡了一覺",
      "八小時過去，體力完全恢復，健康與心情也變好了。",
      "good",
      (current) => ({
        ...current,
        energy: 100,
        health: clamp(current.health + 5),
        mood: clamp(current.mood + 10),
        hunger: clamp(current.hunger - 12),
      }),
    );
  }

  function exercise() {
    if (player.energy < 15) {
      setNotice("體力不足，現在運動可能會受傷。");
      return;
    }
    commit(
      60,
      "公園慢跑",
      "你繞著公園跑了幾圈：健康 +4、心情 +8、體能 EXP +15。",
      "good",
      (current) => ({
        ...current,
        energy: clamp(current.energy - 15),
        health: clamp(current.health + 4),
        mood: clamp(current.mood + 8),
        hunger: clamp(current.hunger - 5),
        fitnessExp: current.fitnessExp + 15,
      }),
    );
  }

  function resetLife() {
    setPlayer(initialPlayer);
    setLocation("home");
    setElapsedMinutes(INITIAL_MINUTES);
    setNotice("人生重新開始。這次，要走哪一條路？");
    setFeed([
      {
        id: Date.now(),
        time: "07:30",
        title: "重新開始",
        detail: "新的城市、全新的選擇。",
        tone: "neutral",
      },
    ]);
  }

  return (
    <main className="game-shell">
      <header className="topbar">
        <a className="brand" href="#main-game" aria-label="人生 Online 首頁">
          <span className="brand-mark">人</span>
          <span>
            <strong>人生 ONLINE</strong>
            <small>LIFE, ONE CHOICE AT A TIME.</small>
          </span>
        </a>
        <div className="world-time" aria-label="目前遊戲時間">
          <span>{gameClock.date}</span>
          <strong>{gameClock.time}</strong>
          <span>{gameClock.weekday}</span>
        </div>
        <div className="prototype-badge"><i /> 單機核心測試中</div>
      </header>

      <section className="marquee" aria-label="系統通知">
        <span className="marquee-label">今日速報</span>
        <p>{notice}</p>
        <span className="weather">城市天氣　晴朗 27°</span>
      </section>

      <div className="game-grid" id="main-game">
        <aside className="character-panel panel">
          <div className="panel-kicker">MY LIFE / 001</div>
          <div className="identity">
            <div className="avatar" aria-hidden="true">🧑</div>
            <div>
              <p>18 歲・樂觀</p>
              <h1>小明</h1>
              <span className="job-tag">目前無業</span>
            </div>
          </div>

          <div className="cash-card">
            <span>持有現金</span>
            <strong><small>NT$</small>{formatMoney(player.cash)}</strong>
            <p>新手出租屋・本月租金已付</p>
          </div>

          <div className="stat-list">
            {statMeta.map((stat) => {
              const value = player[stat.key];
              return (
                <div className="stat-row" key={stat.key}>
                  <div className="stat-label"><span>{stat.icon}</span>{stat.label}</div>
                  <div className="stat-track" aria-label={`${stat.label} ${value}`}>
                    <i style={{ width: `${value}%` }} />
                  </div>
                  <strong>{value}</strong>
                </div>
              );
            })}
          </div>

          <div className="skills-block">
            <div className="section-heading">
              <span>能力成長</span><small>LEVEL</small>
            </div>
            <Skill name="智力" exp={player.intelligenceExp} />
            <Skill name="程式設計" exp={player.programmingExp} />
            <Skill name="體能" exp={player.fitnessExp} />
          </div>
        </aside>

        <section className="world-panel panel">
          <div className="location-header">
            <div>
              <p>YOU ARE HERE</p>
              <h2><span>{currentLocation.emoji}</span>{currentLocation.name}</h2>
              <small>{currentLocation.caption}</small>
            </div>
            <span className="map-index">CITY — 01</span>
          </div>

          <nav className="location-strip" aria-label="城市地點">
            {locations.map((item) => (
              <button
                className={item.id === location ? "active" : ""}
                key={item.id}
                onClick={() => moveTo(item.id)}
                aria-current={item.id === location ? "location" : undefined}
              >
                <span>{item.emoji}</span>
                <small>{item.name}</small>
              </button>
            ))}
          </nav>

          <div className="action-stage">
            <div className="stage-number">{String(locations.findIndex((item) => item.id === location) + 1).padStart(2, "0")}</div>
            <div className="action-intro">
              <span>現在可以做什麼？</span>
              <h3>{actionTitle(location)}</h3>
              <p>{actionDescription(location)}</p>
            </div>
            <div className="action-cards">
              {location === "home" && (
                <ActionCard icon="☾" title="睡覺 8 小時" meta="體力回滿・健康 +5・心情 +10" button="關燈休息" onClick={sleep} />
              )}
              {location === "business" && (
                <>
                  <ActionCard icon="01" title="短班 1 小時" meta="薪資 $180・體力 -5" button="開始工作" onClick={() => work(1)} />
                  <ActionCard icon="04" title="半日班 4 小時" meta="薪資 $720・體力 -20" button="開始工作" onClick={() => work(4)} featured />
                  <ActionCard icon="08" title="全日班 8 小時" meta="薪資 $1,440・體力 -40" button="開始工作" onClick={() => work(8)} />
                </>
              )}
              {location === "shopping" && (
                <>
                  <ActionCard icon="飯" title="便利飯糰" meta="$45・飽食 +20" button="買來吃" onClick={() => eat("rice")} />
                  <ActionCard icon="暖" title="暖心便當" meta="$100・飽食 +45・心情 +3" button="坐下用餐" onClick={() => eat("bento")} featured />
                </>
              )}
              {location === "park" && (
                <ActionCard icon="跑" title="公園慢跑 1 小時" meta="健康 +4・心情 +8・體能 EXP +15" button="換鞋出發" onClick={exercise} featured />
              )}
              {location === "school" && (
                <ActionCard icon="學" title="基礎程式設計" meta="$500・2 小時・程式 EXP +25" button="報名上課" onClick={study} featured />
              )}
            </div>
          </div>

          <footer className="world-footer">
            <span>現實 1 小時 = 遊戲 1 天</span>
            <button onClick={resetLife}>重新開始人生</button>
          </footer>
        </section>

        <aside className="story-panel panel">
          <div className="section-heading story-title">
            <span>人生記事</span><small>LIVE FEED</small>
          </div>
          <div className="day-stamp">
            <strong>DAY {Math.floor(elapsedMinutes / 1440) + 1}</strong>
            <span>{gameClock.date}</span>
          </div>
          <ol className="feed-list">
            {feed.map((item) => (
              <li key={item.id} className={item.tone}>
                <time>{item.time}</time>
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.detail}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="next-goal">
            <span>下一個人生目標</span>
            <strong>程式設計 Lv.2</strong>
            <div><i style={{ width: `${getLevelProgress(player.programmingExp)}%` }} /></div>
            <small>{player.programmingExp} / 100 EXP</small>
          </div>
        </aside>
      </div>
    </main>
  );
}

function Skill({ name, exp }: { name: string; exp: number }) {
  const level = getLevel(exp);
  return (
    <div className="skill-row">
      <div><span>{name}</span><strong>Lv.{level}</strong></div>
      <div className="skill-track"><i style={{ width: `${getLevelProgress(exp)}%` }} /></div>
    </div>
  );
}

function ActionCard({
  icon,
  title,
  meta,
  button,
  featured = false,
  onClick,
}: {
  icon: string;
  title: string;
  meta: string;
  button: string;
  featured?: boolean;
  onClick: () => void;
}) {
  return (
    <article className={`action-card ${featured ? "featured" : ""}`}>
      <span className="action-icon">{icon}</span>
      <h4>{title}</h4>
      <p>{meta}</p>
      <button onClick={onClick}>{button}<span>→</span></button>
    </article>
  );
}

function actionTitle(location: LocationId) {
  return {
    home: "為明天補充能量",
    business: "用今天的時間，換明天的選擇",
    shopping: "先照顧好自己",
    park: "讓身體帶著心情向前",
    school: "投資還沒發生的未來",
  }[location];
}

function actionDescription(location: LocationId) {
  return {
    home: "睡眠會推進遊戲時間，恢復體力、健康與心情，但也會消耗飽食。",
    business: "便利商店不要求技能。工時越長，收入越高，也會更疲累。",
    shopping: "每一餐都需要花錢，但空著肚子很難把任何事情做好。",
    park: "規律運動可以提升體能，解鎖外送員等需要體力的工作。",
    school: "學會程式設計並提升智力，將來就能應徵薪資更高的工作。",
  }[location];
}
