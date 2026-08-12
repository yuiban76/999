"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ABILITY_LABELS, ACADEMIES, careerForCategory, careerRequirements, categoryInfo, JOB_CATEGORIES, jobInfo, meetsCareerRequirements, nextCareerForCategory, type Abilities } from "../shared/jobs";

type LocationId = "home" | "realtor" | "bank" | "business" | "shopping" | "hotel" | "casino" | "school" | "hospital";
type StatKey = "energy" | "health" | "hunger";

type Player = {
  cash: number;
  bankBalance: number;
  loanBalance: number;
  energy: number;
  health: number;
  mood: number;
  hunger: number;
  intelligenceExp: number;
  creativityExp: number;
  physicalExp: number;
  socialExp: number;
  charismaExp: number;
  currentJob: string;
  jobCategory: string;
  jobExp: number;
  illness: string;
  ownsHome: boolean;
  rentalName: string;
  rentedUntil: number;
  elapsedMinutes: number;
  location: LocationId;
};

type Profile = {
  id: string;
  displayName: string;
  email: string;
  signedIn: boolean;
  avatarUrl: string | null;
};

type OnlinePlayer = {
  id: string;
  displayName: string;
  location: LocationId;
  cash: number;
  updatedAt: number;
  avatarUrl: string | null;
};

type FeedItem = {
  id: string;
  time: string;
  title: string;
  detail: string;
  tone: "good" | "neutral" | "warn";
  playerName?: string;
};

type CasinoState = {
  capacity: number;
  bettingSeconds?: number;
  activeCount: number;
  serverNow?: number;
  phase?: "idle" | "waiting" | "playing";
  revealAt?: number;
  dealerCards?: string[];
  dealerScore?: number | null;
  seats: Array<{ id: string; displayName: string; seatNo: number; status: string; bet: number; cards: string[]; score: number | null; result: string; isMine: boolean }>;
  hand: null | { playerCards: string[]; dealerCards: string[]; playerScore: number; dealerScore: number | null; bet: number; seatNo: number | null; revealAt: number; status: string; result: string };
};

type PokerState = {
  capacity: number;
  bettingSeconds?: number;
  activeCount: number;
  serverNow?: number;
  phase?: "idle" | "waiting";
  revealAt?: number;
  communityCards: string[];
  pot: number;
  seats: Array<{ id: string; displayName: string; seatNo: number; status: string; bet: number; cards: string[]; result: string; isMine: boolean }>;
  hand: null | { cards: string[]; bet: number; seatNo: number | null; status: string; result: string };
};

type Bootstrap = {
  authenticated: boolean;
  profile: Profile | null;
  player: Player;
  room: { id: string; name: string };
  online: OnlinePlayer[];
  feed: FeedItem[];
  casino: CasinoState;
  poker: PokerState;
};

const INITIAL_PLAYER: Player = {
  cash: 10000,
  bankBalance: 0,
  loanBalance: 0,
  energy: 100,
  health: 100,
  mood: 80,
  hunger: 80,
  intelligenceExp: 0,
  creativityExp: 0,
  physicalExp: 0,
  socialExp: 0,
  charismaExp: 0,
  currentJob: "待業者",
  jobCategory: "unfixed",
  jobExp: 0,
  illness: "",
  ownsHome: false,
  rentalName: "",
  rentedUntil: 0,
  elapsedMinutes: 450,
  location: "realtor",
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

const locations: Array<{ id: LocationId; emoji: string; name: string; caption: string; hours: string }> = [
  { id: "home", emoji: "⌂", name: "我的住所", caption: "有有效租約或自有住宅後，才能在這裡休息", hours: "24 小時" },
  { id: "realtor", emoji: "鑰", name: "安心房仲", caption: "按天租屋或購買永久住所，屋主也能繼續查看租屋", hours: "09:00～18:00" },
  { id: "bank", emoji: "銀", name: "城市銀行", caption: "存款每日收益 3%，貸款每日利息 5%", hours: "09:00～17:00" },
  { id: "business", emoji: "▦", name: "商業區", caption: "用時間換取收入，累積職涯經驗", hours: "08:00～18:00" },
  { id: "shopping", emoji: "◇", name: "購物街", caption: "補充飽足，偶爾也犒賞一下自己", hours: "10:00～22:00" },
  { id: "hotel", emoji: "旅", name: "不夜旅店", caption: "沒有住所也能住宿，餐點較貴但全天供應", hours: "24 小時" },
  { id: "casino", emoji: "♠", name: "幸運賭場", caption: "最多五位玩家同桌，各自挑戰二十一點莊家", hours: "24 小時" },
  { id: "school", emoji: "▤", name: "未來學院", caption: "投資自己，讓選擇越來越多", hours: "08:00～21:00" },
  { id: "hospital", emoji: "✚", name: "市立醫院", caption: "一般診療 08:00～20:00，急診全天開放", hours: "急診 24 小時" },
];

const statMeta: Array<{ key: StatKey; icon: string; label: string }> = [
  { key: "health", icon: "+", label: "健康" },
  { key: "energy", icon: "↯", label: "體力" },
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
const abilitiesFor = (player: Player): Abilities => ({
  physical: player.physicalExp,
  intelligence: player.intelligenceExp,
  creativity: player.creativityExp,
  social: player.socialExp,
  charisma: player.charismaExp,
});
const formatRequirements = (requirements: Partial<Abilities>) => Object.entries(requirements)
  .map(([key, value]) => `${ABILITY_LABELS[key as keyof Abilities]} ${value}`)
  .join("、");

const WORLD_EPOCH_MS = 1_786_533_617_376;
const WORLD_START_MINUTES = 2_858;
const worldMinutes = (now = Date.now()) => WORLD_START_MINUTES + Math.max(0, Math.floor((now - WORLD_EPOCH_MS) / 1_000));
const openingHours: Partial<Record<LocationId, { open: number; close: number }>> = {
  realtor: { open: 9 * 60, close: 18 * 60 }, business: { open: 8 * 60, close: 18 * 60 }, shopping: { open: 10 * 60, close: 22 * 60 }, school: { open: 8 * 60, close: 21 * 60 },
  bank: { open: 9 * 60, close: 17 * 60 },
};
const isLocationOpen = (location: LocationId, minutes = worldMinutes()) => {
  const hours = openingHours[location];
  if (!hours) return true;
  const current = ((minutes % 1440) + 1440) % 1440;
  return current >= hours.open && current < hours.close;
};

function clock(minutes: number) {
  const totalDays = Math.floor(minutes / 1440);
  const minuteOfDay = minutes % 1440;
  return {
    day: `遊玩第 ${totalDays + 1} 天`,
    time: `${String(Math.floor(minuteOfDay / 60)).padStart(2, "0")}:${String(minuteOfDay % 60).padStart(2, "0")}`,
  };
}

async function prepareAvatar(file: File) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("請選擇 JPG、PNG 或 WebP 照片。");
  const source = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("無法讀取這張照片。"));
      element.src = source;
    });
    const size = Math.min(image.naturalWidth, image.naturalHeight);
    const canvas = document.createElement("canvas");
    canvas.width = 256; canvas.height = 256;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("瀏覽器無法處理這張照片。");
    context.drawImage(image, (image.naturalWidth - size) / 2, (image.naturalHeight - size) / 2, size, size, 0, 0, 256, 256);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", .76));
    if (!blob) throw new Error("照片處理失敗。");
    return blob;
  } finally {
    URL.revokeObjectURL(source);
  }
}

function guestAction(current: Player, action: string, payload: Record<string, unknown>) {
  const sharedMinutes = worldMinutes();
  const next = { ...current, elapsedMinutes: sharedMinutes };
  let title = "完成行動";
  let message = "行動完成。";
  let minutes = 0;
  const fail = (text: string) => ({ error: text });
  if (action === "move") {
    const target = payload.location as LocationId;
    if (!locations.some((item) => item.id === target) || target === next.location) return fail("你已經在這裡了。");
    if (target === "home" && !next.ownsHome && next.rentedUntil <= sharedMinutes) return fail("你目前沒有住所，請先到安心房仲租屋或買房。");
    if (!isLocationOpen(target, sharedMinutes)) return fail(`${locations.find((item) => item.id === target)?.hours} 營業，現在已關門。`);
    next.location = target; next.energy = Math.max(0, next.energy - 1); next.hunger = Math.max(0, next.hunger - 1); title = "移動完成"; message = `已抵達${locationName(target)}。`;
  } else if (action === "housing") {
    if (next.location !== "realtor") return fail("請先前往安心房仲。");
    if (!isLocationOpen("realtor", sharedMinutes)) return fail("安心房仲營業時間為 09:00～18:00。");
    if (payload.kind === "rent") {
      const days = Number(payload.days);
      if (![1, 7, 30].includes(days)) return fail("租屋天數不正確。");
      const cost = days * 350;
      if (next.cash < cost) return fail("現金不足，無法支付租金。");
      next.cash -= cost; next.rentalName = "城市小套房"; next.rentedUntil = Math.max(sharedMinutes, next.rentedUntil) + days * 1440; minutes = 30;
      title = `租下城市小套房 ${days} 天`; message = `支付 NT$${cost}，租期增加 ${days} 天。`;
    } else if (payload.kind === "buy") {
      if (next.ownsHome) return fail("你已擁有城市小宅，仍可繼續查看租屋方案。");
      if (next.cash < 150000) return fail("購屋需要 NT$150,000，目前資金不足。");
      next.cash -= 150000; next.ownsHome = true; minutes = 60; title = "買下城市小宅"; message = "取得永久住所；仍可在房仲查看租屋方案。";
    } else return fail("房屋方案不存在。");
  } else if (action === "bank") {
    if (next.location !== "bank") return fail("請先前往城市銀行。");
    if (!isLocationOpen("bank", sharedMinutes)) return fail("城市銀行營業時間為 09:00～17:00。");
    const amount = Number(payload.amount);
    if (!Number.isSafeInteger(amount) || amount < 1) return fail("請輸入有效的整數金額。");
    if (payload.kind === "deposit") {
      if (next.cash < amount) return fail("手上現金不足。");
      next.cash -= amount; next.bankBalance += amount; title = "存入銀行"; message = `已存入 NT$${formatMoney(amount)}。`;
    } else if (payload.kind === "withdraw") {
      if (next.bankBalance < amount) return fail("銀行存款不足。");
      next.bankBalance -= amount; next.cash += amount; title = "提領存款"; message = `已提領 NT$${formatMoney(amount)}。`;
    } else if (payload.kind === "borrow") {
      if (next.loanBalance > 0) return fail("請先還清目前貸款。");
      if (amount > 50_000) return fail("單筆貸款上限為 NT$50,000。");
      next.loanBalance = amount; next.cash += amount; title = "銀行貸款"; message = `借入 NT$${formatMoney(amount)}，每日利息 5%。`;
    } else if (payload.kind === "repay") {
      if (next.loanBalance <= 0) return fail("目前沒有貸款。");
      if (amount > next.loanBalance) return fail("還款金額不能超過貸款餘額。");
      if (next.cash < amount) return fail("手上現金不足。");
      next.cash -= amount; next.loanBalance -= amount; title = "償還貸款"; message = `已還款 NT$${formatMoney(amount)}。`;
    } else return fail("銀行服務不存在。");
    minutes = 10;
  } else if (action === "hotel") {
    if (next.location !== "hotel") return fail("請先前往不夜旅店。");
    if (payload.kind === "stay") {
      if (next.ownsHome || next.rentedUntil > sharedMinutes) return fail("你目前已有住所，不需要入住旅店。");
      if (next.cash < 1_200) return fail("住宿需要 NT$1,200，目前現金不足。");
      next.cash -= 1_200; next.energy = 100; next.health = Math.min(100, next.health + 3); next.hunger = Math.max(0, next.hunger - 12); minutes = 480; title = "入住不夜旅店"; message = "支付 NT$1,200，體力全滿、健康 +3。";
    } else {
      const meal = payload.kind === "meal" ? { name: "旅店餐", price: 250, hunger: 45 } : payload.kind === "luxury" ? { name: "豪華餐", price: 500, hunger: 80 } : null;
      if (!meal) return fail("旅店服務不存在。");
      if (next.cash < meal.price) return fail("手上現金不足。");
      next.cash -= meal.price; next.hunger = Math.min(100, next.hunger + meal.hunger); minutes = 20; title = `享用${meal.name}`; message = `${meal.name}讓飽足 +${meal.hunger}。`;
    }
  } else if (action === "job") {
    if (next.location !== "business") return fail("請先前往商業區的就業服務處。");
    if (!isLocationOpen("business", sharedMinutes)) return fail("商業區營業時間為 08:00～18:00。");
    const selected = jobInfo(String(payload.job || ""));
    if (!selected) return fail("這個職業不存在。");
    if (next.currentJob === selected.job) return fail(`你目前已經是${selected.job}。`);
    const category = categoryInfo(selected.categoryId);
    if (!category) return fail("這個產業不存在。");
    if (category.id !== "unfixed" && selected.job !== category.jobs[0]) return fail(`進入${category.label}必須從${category.jobs[0]}開始。`);
    const entryRequirements = careerRequirements(category.id, 0);
    if (category.id !== "unfixed" && !meetsCareerRequirements(abilitiesFor(next), entryRequirements)) return fail(`進入${category.label}需要${formatRequirements(entryRequirements)}。`);
    next.currentJob = selected.job; next.jobCategory = selected.categoryId; next.jobExp = 0; minutes = 60;
    title = category.id === "unfixed" ? `狀態變更：${selected.job}` : `進入${selected.categoryLabel}`;
    message = category.id === "unfixed" ? `目前狀態已改為${selected.job}。` : `成功進入「${selected.categoryLabel}」，從${selected.job}開始發展。`;
  } else if (action === "work") {
    const hours = Number(payload.hours);
    if (next.location !== "business" || ![1, 4, 8].includes(hours)) return fail("請先前往商業區。");
    if (!isLocationOpen("business", sharedMinutes)) return fail("商業區營業時間為 08:00～18:00。");
    if (next.illness) return fail(`目前罹患${next.illness}，請先前往醫院治療。`);
    if (next.jobCategory === "unfixed") return fail(`目前是${next.currentJob}，請先選擇一條產業路線。`);
    if (next.energy < hours * 5) return fail("體力不足，先回家休息吧。");
    const previousCareer = careerForCategory(next.jobCategory, next.jobExp, next.currentJob, abilitiesFor(next));
    const income = hours * previousCareer.hourlyPay;
    next.cash += income; next.energy = Math.max(0, next.energy - hours * 5); next.health = Math.max(0, next.health - Math.ceil(hours / 2)); next.mood = Math.max(0, next.mood - Math.ceil(hours * .9)); next.hunger = Math.max(0, next.hunger - hours * 2); next.jobExp += hours * 4; minutes = hours * 60;
    const newCareer = careerForCategory(next.jobCategory, next.jobExp, next.currentJob, abilitiesFor(next));
    next.currentJob = newCareer.title;
    title = newCareer.title !== previousCareer.title ? `升遷為${newCareer.title}` : `工作 ${hours} 小時`;
    message = `收入 +NT$${income}、工作經驗 +${hours * 4}。${newCareer.title !== previousCareer.title ? `恭喜升遷為${newCareer.title}！` : ""}`;
  } else if (action === "study") {
    if (next.location !== "school") return fail("請先前往未來學院。");
    if (!isLocationOpen("school", sharedMinutes)) return fail("未來學院開放時間為 08:00～21:00。");
    if (next.illness) return fail(`目前罹患${next.illness}，請先前往醫院治療。`);
    const academy = ACADEMIES.find((item) => item.id === payload.academy);
    if (!academy) return fail("這所學院不存在。");
    if (next.cash < 500 || next.energy < 10) return fail(next.cash < 500 ? "學費不足。" : "體力不足。");
    next.cash -= 500; next.energy -= 10; next.hunger = Math.max(0, next.hunger - 4);
    for (const [key, gain] of Object.entries(academy.gains)) {
      if (key === "physical") next.physicalExp += gain;
      if (key === "intelligence") next.intelligenceExp += gain;
      if (key === "creativity") next.creativityExp += gain;
      if (key === "social") next.socialExp += gain;
      if (key === "charisma") next.charismaExp += gain;
    }
    const promoted = careerForCategory(next.jobCategory, next.jobExp, next.currentJob, abilitiesFor(next));
    const promotionMessage = promoted.title !== next.currentJob ? ` 能力達標，升遷為${promoted.title}！` : "";
    next.currentJob = promoted.title; minutes = 120; title = `完成${academy.name}課程`; message = `${formatRequirements(academy.gains)}。${promotionMessage}`;
  } else if (action === "eat") {
    if (next.location !== "shopping") return fail("請先前往購物街。");
    if (!isLocationOpen("shopping", sharedMinutes)) return fail("購物街營業時間為 10:00～22:00。");
    const meal = payload.kind === "rice" ? { name: "飯糰", price: 45, hunger: 20, mood: 1 } : { name: "便當", price: 100, hunger: 45, mood: 3 };
    if (next.cash < meal.price) return fail("現金不足。");
    next.cash -= meal.price; next.hunger = Math.min(100, next.hunger + meal.hunger); next.mood = Math.min(100, next.mood + meal.mood); minutes = 20; title = `享用${meal.name}`; message = `${meal.name}讓飽足 +${meal.hunger}。`;
  } else if (action === "scratch") {
    if (next.location !== "shopping") return fail("請先前往購物街購買刮刮樂。");
    if (!isLocationOpen("shopping", sharedMinutes)) return fail("購物街營業時間為 10:00～22:00。");
    if (next.cash < 100) return fail("購買刮刮樂需要 NT$100，目前現金不足。");
    next.cash -= 100; minutes = 5; title = "刮刮樂試玩"; message = "訪客模式不發放隨機獎金；登入後可購買正式刮刮樂。";
  } else if (action === "sleep") {
    if (next.location !== "home") return fail("請先回到溫暖小屋。");
    if (!next.ownsHome && next.rentedUntil <= sharedMinutes) return fail("租約已到期，請先到房仲續租。");
    next.energy = 100; next.health = Math.min(100, next.health + 5); next.mood = Math.min(100, next.mood + 10); next.hunger = Math.max(0, next.hunger - 12); minutes = 480; title = "好好睡了一覺"; message = "體力完全恢復，健康 +5、心情 +10。";
  } else if (action.startsWith("casino_")) {
    return fail("登入帳號後才能加入最多五人的二十一點牌桌。");
  } else if (action === "hospital") {
    if (next.location !== "hospital") return fail("請先前往市立醫院。");
    if (payload.kind !== "emergency" && !((((sharedMinutes % 1440) + 1440) % 1440) >= 8 * 60 && (((sharedMinutes % 1440) + 1440) % 1440) < 20 * 60)) return fail("一般門診與完整治療時間為 08:00～20:00；急診 24 小時開放。");
    const care = payload.kind === "clinic"
      ? { name: "一般門診", price: 600, health: Math.min(100, next.health + 25), energy: Math.min(100, next.energy + 10), minutes: 60 }
      : payload.kind === "treatment"
        ? { name: "完整治療", price: 1500, health: Math.max(80, next.health), energy: Math.min(100, next.energy + 30), minutes: 120 }
        : { name: "急診治療", price: 2500, health: Math.max(70, next.health), energy: Math.min(100, next.energy + 20), minutes: 90 };
    if (next.cash < care.price) return fail("醫療費不足。");
    const previousIllness = next.illness;
    next.cash -= care.price; next.health = care.health; next.energy = care.energy; next.illness = ""; minutes = care.minutes;
    title = previousIllness ? `治癒${previousIllness}` : care.name;
    message = `${care.name}完成，健康恢復至 ${next.health}${previousIllness ? `，${previousIllness}已痊癒` : ""}。`;
  } else if (action === "reset") {
    return { player: { ...INITIAL_PLAYER }, title: "重新開始人生", message: "新的人生已開始，所有試玩進度回到起點。" };
  } else return fail("未知的行動。");
  if (action !== "hospital") {
    if (next.hunger <= 15) next.health = Math.max(0, next.health - 6);
    if (next.energy <= 5) next.health = Math.max(0, next.health - 4);
    if (!next.illness && next.health < 50) {
      const chance = next.health < 20 ? .35 : next.health < 35 ? .22 : .12;
      if (Math.random() < chance) {
        next.illness = next.health < 30 ? "重感冒" : "感冒";
        title = `生病：${next.illness}`;
        message += ` 健康偏低，你罹患了${next.illness}，請前往市立醫院。`;
      }
    }
  }
  next.elapsedMinutes = worldMinutes();
  if (!next.ownsHome && next.rentedUntil <= next.elapsedMinutes && next.location === "home") {
    next.location = "realtor";
    message += " 租約已到期，你已回到房仲尋找住所。";
  }
  return { player: next, title, message };
}

export default function Home() {
  const [player, setPlayer] = useState<Player>(INITIAL_PLAYER);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [online, setOnline] = useState<OnlinePlayer[]>([]);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [casino, setCasino] = useState<CasinoState>({ capacity: 5, activeCount: 0, seats: [], hand: null });
  const [poker, setPoker] = useState<PokerState>({ capacity: 5, activeCount: 0, seats: [], hand: null, communityCards: [], pot: 0 });
  const [casinoGame, setCasinoGame] = useState<"blackjack" | "poker">("blackjack");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [jobOpen, setJobOpen] = useState(false);
  const [scratchResult, setScratchResult] = useState<{ price: number; prize: number } | null>(null);
  const [jobCategory, setJobCategory] = useState<string>(JOB_CATEGORIES[0].id);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authError, setAuthError] = useState("");
  const [notice, setNotice] = useState("正在連接人生世界……");
  const [sharedMinutes, setSharedMinutes] = useState(worldMinutes());
  const gameClock = useMemo(() => clock(sharedMinutes), [sharedMinutes]);
  const currentLocation = locations.find((item) => item.id === player.location)!;
  const playerAbilities = abilitiesFor(player);
  const career = careerForCategory(player.jobCategory, player.jobExp, player.currentJob, playerAbilities);
  const nextCareer = nextCareerForCategory(player.jobCategory, player.jobExp, player.currentJob, playerAbilities);
  const nextCareerTitle = nextCareer?.title ?? "職涯最高階級";
  const careerProgress = nextCareer ? Math.max(0, Math.min(100, ((player.jobExp - career.threshold) / (nextCareer.threshold - career.threshold)) * 100)) : 100;
  const avatarSrc = profile?.avatarUrl ? `${API_ORIGIN}${profile.avatarUrl}` : "";
  const rentalMinutesLeft = Math.max(0, player.rentedUntil - sharedMinutes);
  const rentalDaysLeft = rentalMinutesLeft ? Math.ceil(rentalMinutesLeft / 1440) : 0;
  const housingLabel = player.ownsHome ? "自有住宅 · 城市小宅" : rentalDaysLeft ? `租屋 · ${player.rentalName}（剩 ${rentalDaysLeft} 天）` : "目前沒有住所";
  const selectedJobCategory = JOB_CATEGORIES.find((category) => category.id === jobCategory) ?? JOB_CATEGORIES[0];
  const realtorOpen = isLocationOpen("realtor", sharedMinutes);
  const bankOpen = isLocationOpen("bank", sharedMinutes);
  const businessOpen = isLocationOpen("business", sharedMinutes);
  const shoppingOpen = isLocationOpen("shopping", sharedMinutes);
  const schoolOpen = isLocationOpen("school", sharedMinutes);
  const currentMinute = ((sharedMinutes % 1440) + 1440) % 1440;
  const hospitalRegularOpen = currentMinute >= 8 * 60 && currentMinute < 20 * 60;

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
      setCasino(data.casino);
      if (data.poker) setPoker(data.poker);
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

  useEffect(() => {
    const updateClock = () => setSharedMinutes(worldMinutes());
    updateClock();
    const timer = window.setInterval(updateClock, 1_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if ((!casino.phase || casino.phase === "idle") && (!poker.phase || poker.phase === "idle")) return;
    const timer = window.setInterval(() => void loadWorld(true), 750);
    return () => window.clearInterval(timer);
  }, [casino.phase, poker.phase, loadWorld]);

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
        if (action !== "move") setFeed((items) => [{ id: crypto.randomUUID(), time, title: result.title || "完成行動", detail: result.message || "", tone: "neutral" as const }, ...items].slice(0, 6));
      }
      setBusy(false);
      return;
    }
    try {
      const response = await fetch(`${API_ORIGIN}${action.startsWith("casino_") ? "/api/casino/action" : action.startsWith("poker_") ? "/api/poker/action" : "/api/game/action"}`, {
        method: "POST",
        headers: apiHeaders(true),
        body: JSON.stringify({ action: action.startsWith("casino_") ? action.slice(7) : action.startsWith("poker_") ? action.slice(6) : action, ...payload }),
      });
      const data = await response.json() as { player?: Player; online?: OnlinePlayer[]; feed?: FeedItem[]; casino?: CasinoState; poker?: PokerState; scratch?: { price: number; prize: number } | null; message?: string };
      if (!response.ok || !data.player) throw new Error(data.message || "行動失敗");
      setPlayer(data.player);
      if (data.online) setOnline(data.online);
      if (data.feed) setFeed(data.feed);
      if (data.casino) setCasino(data.casino);
      if (data.poker) setPoker(data.poker);
      if (data.scratch) setScratchResult(data.scratch);
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
    setProfile(null); setOnline([]); setFeed([]); setCasino({ capacity: 5, activeCount: 0, seats: [], hand: null }); setPlayer(INITIAL_PLAYER);
    setNotice("已登出；目前為訪客試玩模式。");
  }

  async function uploadAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !profile || busy) return;
    setBusy(true);
    try {
      const image = await prepareAvatar(file);
      const token = window.localStorage.getItem(TOKEN_KEY);
      const response = await fetch(`${API_ORIGIN}/api/profile/avatar`, {
        method: "POST",
        headers: { "Content-Type": image.type, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: image,
      });
      const data = await response.json() as { avatarUrl?: string; message?: string };
      if (!response.ok || !data.avatarUrl) throw new Error(data.message || "大頭貼上傳失敗。");
      setProfile((current) => current ? { ...current, avatarUrl: data.avatarUrl! } : current);
      setOnline((players) => players.map((item) => item.id === profile.id ? { ...item, avatarUrl: data.avatarUrl! } : item));
      setNotice(data.message || "大頭貼已更新。");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "大頭貼上傳失敗。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="game-shell">
      <header className="topbar">
        <a className="brand" href="#main-game" aria-label="人生 Online 首頁">
          <span className="brand-mark">人</span>
          <span><strong>人生 ONLINE</strong><small>LIFE, ONE CHOICE AT A TIME.</small></span>
        </a>
        <div className="world-time"><span>{gameClock.day}</span><strong>{gameClock.time}</strong><span>全體玩家同步</span></div>
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
          <div className="identity">
            <div className={`avatar ${avatarSrc ? "has-photo" : ""}`}>
              {avatarSrc ? <img src={avatarSrc} alt={`${profile?.displayName}的大頭貼`} /> : (profile?.displayName.slice(0, 1) ?? "旅")}
              {profile && <label className="avatar-upload" title="上傳自己的照片">換照片<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void uploadAvatar(event)} disabled={busy} /></label>}
            </div>
            <div><p>18 歲 · 人生新手</p><h1>{profile?.displayName ?? "旅行者"}</h1><span className="job-tag">{career.title}</span></div>
          </div>
          <div className="cash-card"><span>可用資產</span><strong><small>NT$</small>{formatMoney(player.cash)}</strong><p>{profile ? "伺服器已安全保存" : "訪客模式暫存"}</p></div>
          <div className={`housing-card ${!player.ownsHome && !rentalDaysLeft ? "homeless" : ""}`}><span>居住狀態</span><strong>{housingLabel}</strong><small>{player.ownsHome ? "永久住所" : rentalDaysLeft ? `租約至遊戲第 ${Math.ceil(player.rentedUntil / 1440)} 天` : "請前往安心房仲"}</small></div>
          <div className="career-card">
            <div><span>目前職業</span><strong>{career.title}</strong></div><small>時薪 NT${formatMoney(career.hourlyPay)}</small>
            <div className="career-track"><i style={{ width: `${careerProgress}%` }} /></div>
            <p>{nextCareer && player.jobCategory !== "unfixed" ? `升遷為${nextCareerTitle}：${Math.max(0, nextCareer.threshold - player.jobExp)} EXP，${formatRequirements(nextCareer.requirements)}` : player.jobCategory === "unfixed" ? "前往商業區選擇產業路線" : "已達此產業最高職位"}</p>
          </div>
          {player.illness && <div className="illness-alert"><strong>目前生病：{player.illness}</strong><span>工作與上課暫停，請前往市立醫院。</span></div>}
          <div className="stat-list">
            {statMeta.map((item) => <div className="stat-row" key={item.key}><span className="stat-label"><span>{item.icon}</span>{item.label}</span><div className="stat-track"><i style={{ width: `${player[item.key]}%` }} /></div><strong>{player[item.key]}</strong></div>)}
          </div>
          <div className="skills-block"><div className="section-heading"><span>能力履歷</span><small>SKILLS</small></div><Skill name="體力" exp={player.physicalExp} /><Skill name="智力" exp={player.intelligenceExp} /><Skill name="創造力" exp={player.creativityExp} /><Skill name="社交" exp={player.socialExp} /><Skill name="魅力" exp={player.charismaExp} /></div>
        </aside>

        <section className="world-panel panel">
          <div className="location-header"><div><p>YOU ARE HERE</p><h2><span>{currentLocation.emoji}</span>{currentLocation.name}</h2><small>{currentLocation.caption} · {currentLocation.hours}</small></div><span className="map-index">CITY · LOBBY 01</span></div>
          <nav className="location-strip" aria-label="城市地點">
            {locations.map((item) => <button className={`${item.id === player.location ? "active" : ""} ${!isLocationOpen(item.id, sharedMinutes) ? "closed" : ""}`} key={item.id} onClick={() => void act("move", { location: item.id })} disabled={busy}><span>{item.emoji}</span><small>{item.name}</small><em>{isLocationOpen(item.id, sharedMinutes) ? item.hours : "已關門"}</em></button>)}
          </nav>
          <div className="action-stage">
            <div className="stage-number">{String(locations.findIndex((item) => item.id === player.location) + 1).padStart(2, "0")}</div>
            <div className="action-intro"><span>今天，想把時間花在哪裡？</span><h3>{actionTitle(player.location)}</h3><p>{actionDescription(player.location)}</p></div>
            <div className="action-cards">
              {player.location === "home" && <ActionCard icon="☾" title="睡眠 8 小時" meta="體力全滿 · 健康 +5 · 心情 +10" button="好好休息" onClick={() => void act("sleep")} disabled={busy} />}
              {player.location === "realtor" && <><ActionCard icon="01" title="城市小套房 · 1 天" meta="每日 NT$350 · 租金 NT$350" button="租 1 天" onClick={() => void act("housing", { kind: "rent", days: 1 })} disabled={busy || !realtorOpen} disabledLabel={!realtorOpen ? "已關門" : undefined} /><ActionCard icon="07" title="城市小套房 · 7 天" meta="每日 NT$350 · 租金 NT$2,450" button="租 7 天" onClick={() => void act("housing", { kind: "rent", days: 7 })} featured disabled={busy || !realtorOpen} disabledLabel={!realtorOpen ? "已關門" : undefined} /><ActionCard icon="買" title="購買城市小宅" meta="NT$150,000 · 永久住所 · 買房後仍可查看租屋" button={player.ownsHome ? "已擁有，仍可看租屋" : "購買房屋"} onClick={() => void act("housing", { kind: "buy" })} disabled={busy || !realtorOpen} disabledLabel={!realtorOpen ? "已關門" : undefined} /></>}
              {player.location === "bank" && <BankPanel player={player} busy={busy || !bankOpen} closed={!bankOpen} onAction={(kind, amount) => void act("bank", { kind, amount })} />}
              {player.location === "business" && <><ActionCard icon="職" title="找工作" meta="12 條產業升遷路線 · 無固定職業" button="打開產業列表" onClick={() => setJobOpen(true)} featured disabled={busy || !businessOpen} disabledLabel={!businessOpen ? "已關門" : undefined} /><ActionCard icon="01" title="短班 1 小時" meta={`收入 NT$${formatMoney(career.hourlyPay)} · 產業 EXP +4`} button="開始工作" onClick={() => void act("work", { hours: 1 })} disabled={busy || !businessOpen} disabledLabel={!businessOpen ? "已關門" : undefined} /><ActionCard icon="04" title="標準班 4 小時" meta={`收入 NT$${formatMoney(career.hourlyPay * 4)} · 產業 EXP +16`} button="開始工作" onClick={() => void act("work", { hours: 4 })} disabled={busy || !businessOpen} disabledLabel={!businessOpen ? "已關門" : undefined} /><ActionCard icon="08" title="長班 8 小時" meta={`收入 NT$${formatMoney(career.hourlyPay * 8)} · 產業 EXP +32`} button="開始工作" onClick={() => void act("work", { hours: 8 })} disabled={busy || !businessOpen} disabledLabel={!businessOpen ? "已關門" : undefined} /></>}
              {player.location === "shopping" && <><ActionCard icon="刮" title="幸運刮刮樂" meta="每張 NT$100 · 最高獎金 NT$50,000" button="購買並刮開" onClick={() => void act("scratch")} featured disabled={busy || !shoppingOpen} disabledLabel={!shoppingOpen ? "已關門" : undefined} /><ActionCard icon="飯" title="巷口飯糰" meta="NT$45 · 飽足 +20" button="買來吃" onClick={() => void act("eat", { kind: "rice" })} disabled={busy || !shoppingOpen} disabledLabel={!shoppingOpen ? "已關門" : undefined} /><ActionCard icon="餐" title="豐盛便當" meta="NT$100 · 飽足 +45 · 心情 +3" button="享用便當" onClick={() => void act("eat", { kind: "bento" })} disabled={busy || !shoppingOpen} disabledLabel={!shoppingOpen ? "已關門" : undefined} /></>}
              {player.location === "hotel" && <><ActionCard icon="宿" title="旅店住宿一晚" meta="NT$1,200 · 體力全滿 · 健康 +3 · 僅限無住所" button="辦理入住" onClick={() => void act("hotel", { kind: "stay" })} featured disabled={busy || player.ownsHome || rentalDaysLeft > 0} disabledLabel={player.ownsHome || rentalDaysLeft > 0 ? "已有住所" : undefined} /><ActionCard icon="餐" title="24 小時旅店餐" meta="NT$250 · 飽足 +45" button="購買旅店餐" onClick={() => void act("hotel", { kind: "meal" })} disabled={busy} /><ActionCard icon="豪" title="24 小時豪華餐" meta="NT$500 · 飽足 +80" button="購買豪華餐" onClick={() => void act("hotel", { kind: "luxury" })} disabled={busy} /></>}
                {player.location === "casino" && <div className="casino-games"><div className="casino-game-tabs"><button className={casinoGame === "blackjack" ? "active" : ""} onClick={() => setCasinoGame("blackjack")}>二十一點</button><button className={casinoGame === "poker" ? "active" : ""} onClick={() => setCasinoGame("poker")}>德州撲克</button></div>{casinoGame === "blackjack" ? <CasinoTable state={casino} signedIn={Boolean(profile)} busy={busy} maxBet={player.cash} onAction={(action, payload) => void act(`casino_${action}`, payload)} /> : <PokerTable state={poker} signedIn={Boolean(profile)} busy={busy} maxBet={player.cash} onAction={(action, payload) => void act(`poker_${action}`, payload)} />}</div>}
              {player.location === "school" && ACADEMIES.map((academy, index) => <ActionCard key={academy.id} icon={academy.icon} title={academy.name} meta={`NT$500 · 2 小時 · ${formatRequirements(academy.gains)}`} button="報名上課" onClick={() => void act("study", { academy: academy.id })} featured={index === 0} disabled={busy || !schoolOpen} disabledLabel={!schoolOpen ? "已關門" : undefined} />)}
              {player.location === "hospital" && <><ActionCard icon="急" title="24 小時急診" meta="NT$2,500 · 健康至少恢復至 70 · 全天開放" button="前往急診" onClick={() => void act("hospital", { kind: "emergency" })} featured disabled={busy} /><ActionCard icon="診" title="一般門診" meta="08:00～20:00 · NT$600 · 健康 +25" button="掛號看診" onClick={() => void act("hospital", { kind: "clinic" })} disabled={busy || !hospitalRegularOpen} disabledLabel={!hospitalRegularOpen ? "已關門，請使用急診" : undefined} /><ActionCard icon="療" title="完整治療" meta="08:00～20:00 · NT$1,500 · 健康至少恢復至 80" button="接受治療" onClick={() => void act("hospital", { kind: "treatment" })} disabled={busy || !hospitalRegularOpen} disabledLabel={!hospitalRegularOpen ? "已關門，請使用急診" : undefined} /></>}
            </div>
          </div>
          <footer className="world-footer"><span>現實 1 分鐘 = 遊戲 1 小時 · 全服同步</span><button onClick={() => void act("reset")} disabled={busy}>重新開始人生</button></footer>
        </section>

        <aside className="story-panel panel">
          <div className="section-heading story-title"><span>多人世界</span><small>LIVE LOBBY</small></div>
          <div className="online-summary"><strong><i />{online.length} 位在線</strong><span>每 5 秒同步</span></div>
          <ul className="online-list">
            {online.length ? online.slice(0, 8).map((item) => <li key={item.id}><span className={`mini-avatar ${item.avatarUrl ? "has-photo" : ""}`}>{item.avatarUrl ? <img src={`${API_ORIGIN}${item.avatarUrl}`} alt={`${item.displayName}的大頭貼`} /> : item.displayName.slice(0, 1)}</span><div><strong>{item.displayName}{item.id === profile?.id ? "（你）" : ""}</strong><small>正在 {locationName(item.location)} · NT${formatMoney(item.cash)}</small></div></li>) : <li className="empty-online">登入後，你會在這裡遇見其他玩家。</li>}
          </ul>
          <div className="section-heading feed-heading"><span>城市動態</span><small>ACTIVITY</small></div>
          <ol className="feed-list">
            {feed.slice(0, 6).map((item) => <li key={item.id} className={item.tone}><time>{item.time}</time><div><strong>{item.playerName ? `${item.playerName} · ` : ""}{item.title}</strong><p>{item.detail}</p></div></li>)}
          </ol>
          <div className="next-goal"><span>職涯里程碑</span><strong>{player.jobCategory === "unfixed" ? "先選擇一條產業路線" : nextCareer ? `升遷：${nextCareerTitle}` : "此產業最高職位"}</strong><div><i style={{ width: `${player.jobCategory === "unfixed" ? 0 : careerProgress}%` }} /></div><small>{player.jobCategory === "unfixed" ? "商業區 · 找工作" : nextCareer ? `${player.jobExp} / ${nextCareer.threshold} EXP · ${formatRequirements(nextCareer.requirements)}` : `${player.jobExp} 產業 EXP`}</small></div>
        </aside>
      </div>
      {jobOpen && <div className="auth-overlay" role="dialog" aria-modal="true" aria-labelledby="job-title" onMouseDown={(event) => { if (event.currentTarget === event.target) setJobOpen(false); }}>
        <section className="job-board">
          <button className="auth-close" type="button" aria-label="關閉" onClick={() => setJobOpen(false)}>×</button>
          <span className="panel-kicker">CITY CAREER BOARD</span>
          <h2 id="job-title">找工作</h2>
          <p>每條產業都有指定能力門檻；先到未來學院培養能力，入行後同時達成產業 EXP 與能力要求才會依序升遷。更換產業會重設該路線經驗，五項能力會保留。</p>
          <div className="job-categories" role="tablist" aria-label="職業分類">
            {JOB_CATEGORIES.map((category) => <button role="tab" aria-selected={jobCategory === category.id} className={jobCategory === category.id ? "active" : ""} key={category.id} onClick={() => setJobCategory(category.id)}>{category.label}</button>)}
          </div>
          {selectedJobCategory.id === "unfixed" ? <div className="job-list">{selectedJobCategory.jobs.map((job) => <button className={player.currentJob === job ? "current" : ""} key={job} onClick={() => { setJobOpen(false); void act("job", { job }); }} disabled={busy}><span>{job}</span><small>{player.currentJob === job ? "目前狀態" : "無固定工作與收入"}</small></button>)}</div> : <div className="career-route">
            <div className="route-steps">{selectedJobCategory.jobs.map((job, index) => <div className={player.jobCategory === selectedJobCategory.id && player.currentJob === job ? "current" : ""} key={job}><small>第 {index + 1} 階</small><strong>{job}</strong><span>{index === 0 ? "入行" : `${[100, 250, 500, 900, 1400, 2000, 2700][index]} EXP`} · {formatRequirements(careerRequirements(selectedJobCategory.id, index))}</span></div>)}</div>
            <button className="enter-industry" onClick={() => { setJobOpen(false); void act("job", { job: selectedJobCategory.jobs[0] }); }} disabled={busy || (player.jobCategory === selectedJobCategory.id && player.jobExp === 0)}>進入{selectedJobCategory.label} · 從{selectedJobCategory.jobs[0]}開始</button>
          </div>}
        </section>
      </div>}
      {scratchResult && <div className="auth-overlay" role="dialog" aria-modal="true" aria-labelledby="scratch-title" onMouseDown={(event) => { if (event.currentTarget === event.target) setScratchResult(null); }}>
        <section className={`scratch-ticket ${scratchResult.prize ? "winner" : ""}`}>
          <button className="auth-close" type="button" aria-label="關閉" onClick={() => setScratchResult(null)}>×</button>
          <span>LUCKY STREET · NT$100</span><h2 id="scratch-title">幸運刮刮樂</h2>
          <div><small>本張獎金</small><strong>{scratchResult.prize ? `NT$${formatMoney(scratchResult.prize)}` : "銘謝惠顧"}</strong></div>
          <p>{scratchResult.prize ? "恭喜中獎！獎金已存入你的可用資產。" : "這張沒有中獎，謝謝參與。"}</p>
          <button className="scratch-confirm" onClick={() => setScratchResult(null)}>收下結果</button>
        </section>
      </div>}
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

function ActionCard({ icon, title, meta, button, featured = false, disabled, disabledLabel, onClick }: { icon: string; title: string; meta: string; button: string; featured?: boolean; disabled: boolean; disabledLabel?: string; onClick: () => void }) {
  return <article className={`action-card ${featured ? "featured" : ""}`}><span className="action-icon">{icon}</span><h4>{title}</h4><p>{meta}</p><button onClick={onClick} disabled={disabled}>{disabled ? disabledLabel ?? "同步中…" : button}<span>→</span></button></article>;
}

function BankPanel({ player, busy, closed, onAction }: { player: Player; busy: boolean; closed: boolean; onAction: (kind: "deposit" | "withdraw" | "borrow" | "repay", amount: number) => void }) {
  const [amount, setAmount] = useState("1000");
  const value = Number(amount);
  const valid = Number.isSafeInteger(value) && value > 0;
  return <section className="bank-panel">
    <header><div><span>BANK ACCOUNT</span><strong>存款 NT${formatMoney(player.bankBalance)}</strong></div><div><span>LOAN BALANCE</span><strong className={player.loanBalance ? "debt" : ""}>貸款 NT${formatMoney(player.loanBalance)}</strong></div></header>
    <p>存款每個遊戲日複利 3%；貸款每個遊戲日增加 5% 利息。每個遊戲日等於現實 48 分鐘。</p>
    <label>輸入金額<div><span>NT$</span><input type="number" inputMode="numeric" min="1" step="1" value={amount} onChange={(event) => setAmount(event.target.value)} disabled={busy} /></div></label>
    <div className="bank-actions">
      <button onClick={() => onAction("deposit", value)} disabled={busy || !valid}>存款</button>
      <button onClick={() => onAction("withdraw", value)} disabled={busy || !valid}>提款</button>
      <button onClick={() => onAction("borrow", value)} disabled={busy || !valid || value > 50_000 || player.loanBalance > 0}>貸款</button>
      <button onClick={() => onAction("repay", value)} disabled={busy || !valid || player.loanBalance <= 0}>還款</button>
    </div>
    <small>{closed ? "銀行目前已關門，營業時間為 09:00～17:00。" : player.loanBalance ? "貸款未清前不能再次借款。" : "單筆貸款上限 NT$50,000。"}</small>
  </section>;
}

function CasinoTable({ state, signedIn, busy, maxBet, onAction }: { state: CasinoState; signedIn: boolean; busy: boolean; maxBet: number; onAction: (action: string, payload?: Record<string, unknown>) => void }) {
  const [bet, setBet] = useState("100");
  const [now, setNow] = useState(Date.now());
  const active = state.hand && ["seated", "waiting", "playing", "stood", "settling"].includes(state.hand.status);
  const playing = state.hand?.status === "playing";
  const waiting = state.phase === "waiting";
  const roundPlaying = state.phase === "playing";
  const remaining = waiting ? Math.max(0, Math.ceil(((state.revealAt ?? 0) - now) / 1000)) : 0;
  useEffect(() => {
    if (!waiting) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(timer);
  }, [waiting, state.revealAt]);
  const submitBet = (event: React.FormEvent) => {
    event.preventDefault();
    const amount = Number(bet);
    if (Number.isSafeInteger(amount) && amount > 0) onAction("deal", { bet: amount });
  };
  return <section className="casino-table">
    <header><div><span>BLACKJACK TABLE 01</span><h4>二十一點同桌遊戲</h4></div><strong>{state.activeCount} / {state.capacity} 位在座 · {waiting ? `下注倒數 ${remaining} 秒` : roundPlaying ? "本局進行中" : "等待開局"}</strong></header>
    <div className="casino-seats">{Array.from({ length: 5 }, (_, index) => {
      const seatNo = index + 1;
      const seat = state.seats.find((item) => item.seatNo === seatNo);
      return <div className={`${seat ? "occupied" : ""} ${seat?.isMine ? "mine" : ""}`} key={seatNo}>
        <span>{seatNo}</span><strong>{seat?.isMine ? `${seat.displayName}（你）` : seat?.displayName ?? "空位"}</strong>
        {!seat && signedIn && !active && <button onClick={() => onAction("join", { seatNo })} disabled={busy}>加入遊戲</button>}
        {seat && <small>{seat.status === "waiting" ? `已下注 NT$${formatMoney(seat.bet)}` : seat.status === "playing" ? `行動中 · ${seat.score} 點` : seat.status === "stood" || seat.status === "settling" ? `已停牌 · ${seat.score} 點` : roundPlaying ? "觀賽中" : "等待下注"}</small>}
      </div>;
    })}</div>
    {(roundPlaying || (state.dealerCards?.length ?? 0) > 0) && <div className="shared-blackjack-board">
      <div className="shared-dealer"><span>共同莊家 {state.dealerScore === null ? "· 等所有下注玩家完成後開牌" : state.dealerScore === undefined ? "" : `· ${state.dealerScore} 點`}</span><CardRow cards={state.dealerCards ?? []} /></div>
      <div className="shared-player-hands">{state.seats.map((seat) => <article className={`${seat.isMine ? "mine" : ""} ${seat.cards.length ? "has-cards" : "spectator"}`} key={seat.id}>
        <header><strong>{seat.seatNo} 號 · {seat.displayName}{seat.isMine ? "（你）" : ""}</strong><small>{seat.cards.length ? `${seat.score} 點 · 下注 NT$${formatMoney(seat.bet)}` : "未下注 · 觀賽"}</small></header>
        {seat.cards.length ? <CardRow cards={seat.cards} /> : <p>本局觀賽中</p>}
        {seat.result && <em>{seat.result}</em>}
      </article>)}</div>
    </div>}
    {!signedIn ? <p className="casino-message">登入帳號後，請在 1～5 號空位點「加入遊戲」。</p> : waiting ? <div className="casino-round-actions">
      <div className="casino-waiting"><strong>{remaining}</strong><h5>秒後全桌翻牌</h5><p>未下注玩家不會被移除，可留在原座位觀賽。</p></div>
      {state.hand?.status === "seated" ? <BetForm bet={bet} setBet={setBet} maxBet={maxBet} busy={busy} submitBet={submitBet} onLeave={() => onAction("leave")} /> : state.hand?.status === "waiting" ? <button className="table-leave" onClick={() => onAction("leave")} disabled={busy}>離開牌桌（下注不退）</button> : !active ? <p className="casino-message">選擇空位加入後，仍可在倒數結束前下注。</p> : null}
    </div> : roundPlaying ? <div className="casino-round-actions">
      {playing ? <div className="casino-controls"><button onClick={() => onAction("hit")} disabled={busy}>補牌</button><button onClick={() => onAction("stand")} disabled={busy}>停牌</button><button className="leave" onClick={() => onAction("leave")} disabled={busy}>離桌</button></div> : active ? <><p className="casino-message">{state.hand?.status === "seated" ? "你本局未下注，正在原座位觀賽。" : "你已完成行動，正在等待其他玩家。"}</p><button className="table-leave" onClick={() => onAction("leave")} disabled={busy}>離開牌桌</button></> : <p className="casino-message">目前正在觀賽，下一局可選擇空位加入。</p>}
    </div> : state.hand?.status === "seated" ? <><BetForm bet={bet} setBet={setBet} maxBet={maxBet} busy={busy} submitBet={submitBet} onLeave={() => onAction("leave")} />{state.hand.result && <p className="casino-result">{state.hand.result}</p>}</> : <p className="casino-message">請選擇上方任一空位加入遊戲。</p>}
    <footer>先選座位再自訂下注 · 第一筆下注後等待 5 秒 · 未下注可留座觀賽或自由離場 · 全桌同步顯示手牌</footer>
  </section>;
}

function PokerTable({ state, signedIn, busy, maxBet, onAction }: { state: PokerState; signedIn: boolean; busy: boolean; maxBet: number; onAction: (action: string, payload?: Record<string, unknown>) => void }) {
  const [bet, setBet] = useState("100");
  const [now, setNow] = useState(Date.now());
  const active = state.hand && ["seated", "waiting", "settling"].includes(state.hand.status);
  const waiting = state.phase === "waiting";
  const remaining = waiting ? Math.max(0, Math.ceil(((state.revealAt ?? 0) - now) / 1000)) : 0;
  useEffect(() => {
    if (!waiting) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(timer);
  }, [waiting, state.revealAt]);
  const submitBet = (event: React.FormEvent) => {
    event.preventDefault();
    const amount = Number(bet);
    if (Number.isSafeInteger(amount) && amount > 0) onAction("deal", { bet: amount });
  };
  return <section className="casino-table poker-table">
    <header><div><span>TEXAS HOLD&apos;EM TABLE 01</span><h4>五人同步德州撲克</h4></div><strong>{state.activeCount} / {state.capacity} 位在座 · {waiting ? `下注倒數 ${remaining} 秒` : "等待新局"}</strong></header>
    <div className="casino-seats">{Array.from({ length: 5 }, (_, index) => {
      const seatNo = index + 1; const seat = state.seats.find((item) => item.seatNo === seatNo);
      return <div className={`${seat ? "occupied" : ""} ${seat?.isMine ? "mine" : ""}`} key={seatNo}>
        <span>{seatNo}</span><strong>{seat?.isMine ? `${seat.displayName}（你）` : seat?.displayName ?? "空位"}</strong>
        {!seat && signedIn && !active && <button onClick={() => onAction("join", { seatNo })} disabled={busy}>加入遊戲</button>}
        {seat && <small>{seat.status === "waiting" ? `已下注 NT$${formatMoney(seat.bet)}` : seat.result ? "本局已攤牌" : "等待下注"}</small>}
      </div>;
    })}</div>
    {(state.communityCards.length > 0 || waiting) && <div className="poker-board">
      <div className="poker-community"><span>公共牌 · 本局獎池 NT$${formatMoney(state.pot || state.seats.reduce((sum, seat) => sum + seat.bet, 0))}</span>{state.communityCards.length ? <CardRow cards={state.communityCards} /> : <p>倒數結束後同步攤牌</p>}</div>
      <div className="shared-player-hands">{state.seats.map((seat) => <article className={`${seat.isMine ? "mine" : ""} ${seat.cards.length ? "has-cards" : "spectator"}`} key={seat.id}>
        <header><strong>{seat.seatNo} 號 · {seat.displayName}{seat.isMine ? "（你）" : ""}</strong><small>{seat.status === "waiting" ? `下注 NT$${formatMoney(seat.bet)}` : seat.cards.length ? `底牌 · 下注 NT$${formatMoney(seat.bet)}` : "未下注 · 觀賽"}</small></header>
        {seat.cards.length ? <CardRow cards={seat.cards} /> : <p>{seat.status === "waiting" ? "等待發牌" : "本局觀賽中"}</p>}
        {seat.result && <em>{seat.result}</em>}
      </article>)}</div>
    </div>}
    {!signedIn ? <p className="casino-message">登入後才能加入五人德州撲克牌桌。</p> : waiting ? <div className="casino-round-actions">
      <div className="casino-waiting"><strong>{remaining}</strong><h5>秒後全桌攤牌</h5><p>至少兩位下注才開局；未下注玩家可留座觀賽。</p></div>
      {state.hand?.status === "seated" ? <BetForm bet={bet} setBet={setBet} maxBet={maxBet} busy={busy} submitBet={submitBet} onLeave={() => onAction("leave")} /> : state.hand?.status === "waiting" ? <p className="casino-message">你已下注，請等待同步攤牌。</p> : null}
    </div> : state.hand?.status === "seated" ? <><BetForm bet={bet} setBet={setBet} maxBet={maxBet} busy={busy} submitBet={submitBet} onLeave={() => onAction("leave")} />{state.hand.result && <p className="casino-result">{state.hand.result}</p>}</> : <p className="casino-message">請選擇上方任一空位加入遊戲。</p>}
    <footer>五人全下攤牌局 · 第一筆下注後等待 5 秒 · 至少兩位下注 · 同副牌不重複發牌 · 標準牌型比較並平分獎池</footer>
  </section>;
}

function CardRow({ cards }: { cards: string[] }) {
  return <div className="table-card-row">{cards.map((card, index) => <i className={/[♥♦]/.test(card) ? "red" : ""} key={`${card}-${index}`}>{card}</i>)}</div>;
}

function BetForm({ bet, setBet, maxBet, busy, submitBet, onLeave }: { bet: string; setBet: (value: string) => void; maxBet: number; busy: boolean; submitBet: (event: React.FormEvent) => void; onLeave: () => void }) {
  return <form className="custom-bet" onSubmit={submitBet}><label>輸入下注金額 <small>目前現金 NT${formatMoney(maxBet)}</small></label><div><span>NT$</span><input type="number" inputMode="numeric" min="1" max={Math.min(maxBet, 1_000_000)} step="1" value={bet} onChange={(event) => setBet(event.target.value)} required /><button disabled={busy || maxBet < 1}>確定下注</button></div><button className="leave-seat" type="button" onClick={onLeave} disabled={busy}>不下注，離開座位</button></form>;
}

function actionTitle(location: LocationId) {
  return { home: "有一個落腳處，才有安心休息的地方", realtor: "先找到住所，再打造自己的生活", bank: "管理資產，也要衡量借貸成本", business: "累積經驗，向下一次升遷前進", shopping: "照顧日常，才能走得更遠", hotel: "沒有住所，也能有一晚落腳處", casino: "五人同桌，挑戰二十一點與德州撲克", school: "今天學會的，會成為明天的選項", hospital: "及早治療，才能繼續人生旅程" }[location];
}

function actionDescription(location: LocationId) {
  return { home: "有效租約或自有住宅才能進入，全天 24 小時開放。睡一覺能恢復體力與健康。", realtor: "營業時間 09:00～18:00。租屋每日 NT$350，也能買下永久住所；買房後租屋方案仍會保留。", bank: "營業時間 09:00～17:00。存款每日收益 3%；貸款上限 NT$50,000，每日利息 5%。", business: "營業時間 08:00～18:00。工作會累積職涯經驗；經驗與指定能力都達標後才會升遷。", shopping: "營業時間 10:00～22:00。用合理的花費補充飽足，也能購買刮刮樂。", hotel: "全天 24 小時營業。無住所玩家可花 NT$1,200 住宿；餐點全天供應，但價格較高。", casino: "全天 24 小時開放。二十一點與德州撲克各有一張最多五人的同步牌桌。", school: "開放時間 08:00～21:00。五所學院分別培養體力、智力、創造力、社交與魅力。", hospital: "健康低於 50 時，行動後開始有機率生病。急診 24 小時開放；一般診療為 08:00～20:00。" }[location];
}
