"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ABILITY_LABELS, ACADEMIES, careerForCategory, careerRequirements, careerThresholdForCategory, categoryInfo, JOB_CATEGORIES, jobInfo, meetsCareerRequirements, nextCareerForCategory, type Abilities } from "../shared/jobs";
import { CITY_EVENTS, STORY_CHAPTERS, TALENTS } from "../shared/progression";
import { isHospitalRegularOpen, isLocationOpen, worldMinutes } from "../shared/world";

type LocationId = "home" | "realtor" | "bank" | "business" | "shopping" | "hotel" | "casino" | "school" | "hospital";
type StatKey = "energy" | "health" | "hunger";

type Player = {
  cash: number;
  bankBalance: number;
  loanBalance: number;
  dailyMinimumPayment: number;
  dailyPaymentMade: number;
  missedPaymentDays: number;
  gameOver: string;
  mainStory: string;
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
  actionAvailableAt: number;
  actionLabel: string;
  elapsedMinutes: number;
  location: LocationId;
  talentExp: number;
  talentLevel: number;
  talentPoints: number;
  talents: string[];
  storyChapter: number;
  pendingEvent: string;
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
  loanBalance: number;
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

type TransferRequest = {
  id: string;
  senderName: string;
  amount: number;
  expiresAt: number;
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
  phase?: "idle" | "playing";
  revealAt?: number;
  communityCards: string[];
  pot: number;
  street?: string;
  currentBet?: number;
  turnSeat?: number;
  seats: Array<{ id: string; displayName: string; seatNo: number; status: string; bet: number; streetBet?: number; cards: string[]; result: string; isMine: boolean }>;
  hand: null | { cards: string[]; bet: number; streetBet?: number; seatNo: number | null; status: string; result: string; isTurn?: boolean };
};

type BingoState = { hostUserId?: string; entryFee?: number; capacity?: number; status: string; roundNo?: number; drawn: number[]; nextDrawAt?: number; players: Array<{ id: string; displayName: string; card: number[]; isMine: boolean }> };
type TournamentState = { hostUserId?: string; entryFee?: number; capacity?: number; game?: string; status: string; tournamentNo?: number; currentRound?: number; roundLimit?: number; nextRoundAt?: number; latestResult?: string; players: Array<{ id: string; displayName: string; score: number; latestHand: string; isMine: boolean }> };

type Bootstrap = {
  authenticated: boolean;
  profile: Profile | null;
  player: Player;
  room: { id: string; name: string };
  online: OnlinePlayer[];
  feed: FeedItem[];
  casino: CasinoState;
  poker: PokerState;
  bingo?: BingoState;
  tournament?: TournamentState;
  cityMemory?: CityMemory;
  transferRequests?: TransferRequest[];
};

type CityMemory = {
  cycleDay: number;
  days: number;
  state: { name: string; description: string; tone: string };
  totals: { work: number; hospital: number; housing: number; casino: number; study: number; event: number };
};

const EMPTY_CITY_MEMORY: CityMemory = { cycleDay: 1, days: 3, state: { name: "平靜日常", description: "城市正在記住每位居民今天做出的選擇。", tone: "neutral" }, totals: { work: 0, hospital: 0, housing: 0, casino: 0, study: 0, event: 0 } };

const INITIAL_PLAYER: Player = {
  cash: 10000,
  bankBalance: 0,
  loanBalance: 0,
  dailyMinimumPayment: 0,
  dailyPaymentMade: 0,
  missedPaymentDays: 0,
  gameOver: "",
  mainStory: "legacy",
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
  actionAvailableAt: 0,
  actionLabel: "",
  elapsedMinutes: 0,
  location: "realtor",
  talentExp: 0,
  talentLevel: 0,
  talentPoints: 0,
  talents: [],
  storyChapter: 0,
  pendingEvent: "",
};

const API_ORIGIN = (import.meta.env.VITE_API_ORIGIN as string | undefined)?.replace(/\/$/, "") || "";
const TOKEN_KEY = "life-online-session";
const PRODIGAL_RETURN_STORY = [
  "凌晨四點，城市還沒醒。",
  "你坐在便利商店外的塑膠椅上，口袋裡只剩下三十七元。手機螢幕不斷亮起——銀行催繳、房東警告、公司未接來電，還有母親昨晚傳來的一句話：",
  "「今年生日，會回來吃飯嗎？」",
  "你沒有回覆。",
  "三年前，你曾經擁有一份穩定的工作、一群願意相信你的朋友，還有一個說過會陪你走到最後的人。那時的你相信，只要贏一次大的，所有問題都能解決。",
  "第一次進賭場，你贏了半個月的薪水。",
  "第二次，你贏回了一台新車。",
  "第三次開始，你只記得自己一直在追——追輸掉的錢、追曾經的運氣，也追那個好像無所不能的自己。",
  "最後，存款沒了，工作丟了，朋友不再接電話。你甚至偷拿父親留下的手錶去典當，只為了相信下一局真的會不一樣。",
  "但下一局從來沒有來。",
  "清晨的雨落在街道上。你低頭看著手中的名片，那是昨晚離開賭場時，一名陌生人塞給你的。",
  "「重新開始人生互助中心」",
  "背面只有一行手寫的字：",
  "「承認自己輸了，不代表你的人生也輸了。」",
  "你望向街道另一端。左邊是仍亮著霓虹燈的地下賭場；右邊是即將發出第一班車的公車站。再過兩個小時，母親就會起床。再過四個小時，曾經的主管也許願意給你最後一次解釋的機會。",
  "你的債務沒有消失，失去的信任也不會一夜恢復。",
  "但這一次，你終於沒有把最後的三十七元換成籌碼。",
  "你站起身，走進雨中。",
];

const PRODIGAL_FAILURE_STORY = [
  "還款期限的最後一天",
  "你坐在空蕩蕩的房間裡，一遍又一遍重新整理銀行頁面。",
  "你賣掉了手機、家具，以及父親留下的手錶。能借錢的人都已經借過，願意相信你的人也早已離開。",
  "午夜十二點，畫面上的日期跳到了下個月。",
  "沒有奇蹟發生。",
  "幾天後，催收通知正式寄達。你的帳戶遭到限制，僅剩的資產被處理，房東也要求你搬離住處。新工作因為連續缺勤而失去，母親最後一次打來的電話，你仍然沒有勇氣接聽。",
  "你拖著唯一的行李箱離開房間。",
  "外面下著和故事開始時一樣的雨。街道左邊依然是閃爍著霓虹燈的賭場，右邊則是你曾經沒有踏上的回家之路。",
  "你曾經得到過重新選擇的機會。",
  "但你用新的貸款填補舊的債務，用下一次翻本逃避這一次失敗。直到所有期限同時到來，你才發現，人生並不會永遠等待你準備好面對它。",
  "手機在被停用前收到最後一封通知：",
  "「債務協商申請已逾期，案件結束。」",
  "你望著雨中的城市，卻再也找不到一扇願意為你打開的門。",
  "你未能在期限內繳納貸款，也沒有保住任何維持生活的收入或資產。",
  "「壓垮你的不是最後一筆貸款，而是每一次以為明天還能補救的選擇。」",
  "——遊戲結束——",
];

function apiHeaders(jsonBody = false) {
  const token = window.localStorage.getItem(TOKEN_KEY);
  return {
    ...(jsonBody ? { "Content-Type": "application/json" } : { Accept: "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

const locations: Array<{ id: LocationId; emoji: string; image?: string; name: string; caption: string; hours: string }> = [
  { id: "home", emoji: "⌂", name: "我的住所", caption: "有有效租約或自有住宅後，才能在這裡休息", hours: "24 小時" },
  { id: "realtor", emoji: "鑰", name: "安心房仲", caption: "城市小宅 NT$50,000，也可按天租屋", hours: "07:00～23:00" },
  { id: "bank", emoji: "銀", name: "城市銀行", caption: "存款每日 0.1%｜一般貸款 0.5%｜《浪子回頭》債務 0.2%", hours: "07:00～23:00" },
  { id: "business", emoji: "▦", name: "工作地", caption: "用時間換取收入，累積職涯經驗", hours: "06:00～24:00" },
  { id: "shopping", emoji: "◇", name: "購物街", caption: "補充飽足，偶爾也犒賞一下自己", hours: "06:00～24:00" },
  { id: "hotel", emoji: "旅", name: "不夜旅店", caption: "沒有住所也能住宿，餐點較貴但全天供應", hours: "24 小時" },
  { id: "casino", emoji: "♠", image: "./casino-icon.png", name: "幸運賭場", caption: "最多五位玩家同桌，各自挑戰二十一點莊家", hours: "24 小時" },
  { id: "school", emoji: "▤", name: "未來學院", caption: "投資自己，讓選擇越來越多", hours: "07:00～23:00" },
  { id: "hospital", emoji: "✚", name: "市立醫院", caption: "一般診療 07:00～23:00，急診全天開放", hours: "急診 24 小時" },
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
  const next = { ...current };
  let title = "完成行動";
  let message = "行動完成。";
  let minutes = 0;
  const fail = (text: string) => ({ error: text });
  if (action === "move") {
    const target = payload.location as LocationId;
    if (!locations.some((item) => item.id === target) || target === next.location) return fail("你已經在這裡了。");
    if (target === "home" && !next.ownsHome && next.rentedUntil <= sharedMinutes) return fail("你目前沒有住所，請先到安心房仲租屋或買房。");
    if (!isLocationOpen(target, sharedMinutes)) return fail(`${locations.find((item) => item.id === target)?.hours} 營業，現在已關門。`);
    next.location = target; title = "移動完成"; message = `已抵達${locationName(target)}。`;
  } else if (action === "housing") {
    if (next.location !== "realtor") return fail("請先前往安心房仲。");
    if (!isLocationOpen("realtor", sharedMinutes)) return fail("安心房仲營業時間為 07:00～23:00。");
    if (payload.kind === "rent") {
      const days = Number(payload.days);
      if (![1, 7, 30].includes(days)) return fail("租屋天數不正確。");
      const cost = days * 350;
      if (next.cash < cost) return fail("現金不足，無法支付租金。");
      next.cash -= cost; next.rentalName = "城市小套房"; next.rentedUntil = Math.max(sharedMinutes, next.rentedUntil) + days * 1440;
      title = `租下城市小套房 ${days} 天`; message = `支付 NT$${cost}，租期增加 ${days} 天。`;
    } else if (payload.kind === "buy") {
      if (next.ownsHome) return fail("你已擁有城市小宅，仍可繼續查看租屋方案。");
      if (next.cash < 50000) return fail("購屋需要 NT$50,000，目前資金不足。");
      next.cash -= 50000; next.ownsHome = true; title = "買下城市小宅"; message = "支付 NT$50,000，取得永久住所；仍可在房仲查看租屋方案。";
    } else return fail("房屋方案不存在。");
  } else if (action === "bank") {
    if (next.location !== "bank") return fail("請先前往城市銀行。");
    if (!isLocationOpen("bank", sharedMinutes)) return fail("城市銀行營業時間為 07:00～23:00。");
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
      next.loanBalance = amount; next.cash += amount; title = "銀行貸款"; message = `借入 NT$${formatMoney(amount)}，每日利息 0.5%。`;
    } else if (payload.kind === "repay") {
      if (next.loanBalance <= 0) return fail("目前沒有貸款。");
      if (amount > next.loanBalance) return fail("還款金額不能超過貸款餘額。");
      if (next.cash < amount) return fail("手上現金不足。");
      next.cash -= amount; next.loanBalance -= amount; title = "償還貸款"; message = `已還款 NT$${formatMoney(amount)}。`;
    } else return fail("銀行服務不存在。");
  } else if (action === "hotel") {
    if (next.location !== "hotel") return fail("請先前往不夜旅店。");
    if (payload.kind === "stay") {
      if (next.ownsHome || next.rentedUntil > sharedMinutes) return fail("你目前已有住所，不需要入住旅店。");
      if (next.cash < 1_200) return fail("住宿需要 NT$1,200，目前現金不足。");
      next.cash -= 1_200; next.energy = 100; next.health = Math.min(100, next.health + 3); next.hunger = Math.max(0, next.hunger - 12); minutes = 120; title = "入住不夜旅店"; message = "支付 NT$1,200，體力全滿、健康 +3。";
    } else if (payload.kind === "work") {
      if (next.illness) return fail(`目前罹患${next.illness}，請先前往醫院治療。`);
      next.cash += 100; minutes = 30;
      title = "完成旅店臨時工"; message = "收入 +NT$100；不扣除體力、飽足或健康，也不增加職業經驗或能力。";
    } else {
      const meal = payload.kind === "meal" ? { name: "旅店餐", price: 250, hunger: 45 } : payload.kind === "luxury" ? { name: "豪華餐", price: 500, hunger: 80 } : null;
      if (!meal) return fail("旅店服務不存在。");
      if (next.cash < meal.price) return fail("手上現金不足。");
      next.cash -= meal.price; next.hunger = Math.min(100, next.hunger + meal.hunger); title = `享用${meal.name}`; message = `${meal.name}讓飽足 +${meal.hunger}。`;
    }
  } else if (action === "job") {
    if (next.location !== "business") return fail("請先前往工作地的就業服務處。");
    if (!isLocationOpen("business", sharedMinutes)) return fail("工作地營業時間為 06:00～24:00。");
    const selected = jobInfo(String(payload.job || ""));
    if (!selected) return fail("這個職業不存在。");
    if (next.currentJob === selected.job) return fail(`你目前已經是${selected.job}。`);
    const category = categoryInfo(selected.categoryId);
    if (!category) return fail("這個產業不存在。");
    if (category.id !== "unfixed" && selected.job !== category.jobs[0]) return fail(`進入${category.label}必須從${category.jobs[0]}開始。`);
    const entryRequirements = careerRequirements(category.id, 0);
    if (category.id !== "unfixed" && !meetsCareerRequirements(abilitiesFor(next), entryRequirements)) return fail(`進入${category.label}需要${formatRequirements(entryRequirements)}。`);
    next.currentJob = selected.job; next.jobCategory = selected.categoryId; next.jobExp = 0;
    title = category.id === "unfixed" ? `狀態變更：${selected.job}` : `進入${selected.categoryLabel}`;
    message = category.id === "unfixed" ? `目前狀態已改為${selected.job}。` : `成功進入「${selected.categoryLabel}」，從${selected.job}開始發展。`;
  } else if (action === "work") {
    const hours = Number(payload.hours);
    if (next.location !== "business" || ![1, 4, 8].includes(hours)) return fail("請先前往工作地。");
    if (!isLocationOpen("business", sharedMinutes)) return fail("工作地營業時間為 06:00～24:00。");
    if (next.illness) return fail(`目前罹患${next.illness}，請先前往醫院治療。`);
    if (next.jobCategory === "unfixed") return fail(`目前是${next.currentJob}，請先選擇一條產業路線。`);
    if (next.energy < hours * 5) return fail("體力不足，先回家休息吧。");
    const previousCareer = careerForCategory(next.jobCategory, next.jobExp, next.currentJob, abilitiesFor(next));
    const income = hours * previousCareer.hourlyPay;
    next.cash += income; next.energy = Math.max(0, next.energy - hours * 5); next.health = Math.max(0, next.health - Math.ceil(hours / 2)); next.mood = Math.max(0, next.mood - Math.ceil(hours * .9)); next.hunger = Math.max(0, next.hunger - hours * 2); next.jobExp += hours * 4; minutes = hours === 1 ? 30 : hours === 4 ? 120 : 240;
    const newCareer = careerForCategory(next.jobCategory, next.jobExp, next.currentJob, abilitiesFor(next));
    next.currentJob = newCareer.title;
    title = newCareer.title !== previousCareer.title ? `升遷為${newCareer.title}` : `工作 ${hours} 小時`;
    message = `收入 +NT$${income}、工作經驗 +${hours * 4}。${newCareer.title !== previousCareer.title ? `恭喜升遷為${newCareer.title}！` : ""}`;
  } else if (action === "study") {
    if (next.location !== "school") return fail("請先前往未來學院。");
    if (!isLocationOpen("school", sharedMinutes)) return fail("未來學院開放時間為 07:00～23:00。");
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
    next.currentJob = promoted.title; minutes = 60; title = `完成${academy.name}課程`; message = `${formatRequirements(academy.gains)}。${promotionMessage}`;
  } else if (action === "eat") {
    if (next.location !== "shopping") return fail("請先前往購物街。");
    if (!isLocationOpen("shopping", sharedMinutes)) return fail("購物街營業時間為 06:00～24:00。");
    const meal = payload.kind === "rice" ? { name: "飯糰", price: 45, hunger: 20, mood: 1 } : { name: "便當", price: 100, hunger: 45, mood: 3 };
    if (next.cash < meal.price) return fail("現金不足。");
    next.cash -= meal.price; next.hunger = Math.min(100, next.hunger + meal.hunger); next.mood = Math.min(100, next.mood + meal.mood); title = `享用${meal.name}`; message = `${meal.name}讓飽足 +${meal.hunger}。`;
  } else if (action === "scratch") {
    if (next.location !== "shopping") return fail("請先前往購物街購買刮刮樂。");
    if (!isLocationOpen("shopping", sharedMinutes)) return fail("購物街營業時間為 06:00～24:00。");
    if (next.cash < 100) return fail("購買刮刮樂需要 NT$100，目前現金不足。");
    next.cash -= 100; title = "刮刮樂試玩"; message = "訪客模式不發放隨機獎金；登入後可購買正式刮刮樂。";
  } else if (action === "sleep") {
    if (next.location !== "home") return fail("請先回到溫暖小屋。");
    if (!next.ownsHome && next.rentedUntil <= sharedMinutes) return fail("租約已到期，請先到房仲續租。");
    next.energy = 100; next.health = Math.min(100, next.health + 5); next.mood = Math.min(100, next.mood + 10); next.hunger = Math.max(0, next.hunger - 12); minutes = 120; title = "好好睡了一覺"; message = "體力完全恢復，健康 +5、心情 +10。";
  } else if (action.startsWith("casino_")) {
    return fail("登入帳號後才能加入最多五人的二十一點牌桌。");
  } else if (action === "hospital") {
    if (next.location !== "hospital") return fail("請先前往市立醫院。");
    if (payload.kind !== "emergency" && !((((sharedMinutes % 1440) + 1440) % 1440) >= 7 * 60 && (((sharedMinutes % 1440) + 1440) % 1440) < 23 * 60)) return fail("一般門診與完整治療時間為 07:00～23:00；急診 24 小時開放。");
    const care = payload.kind === "clinic"
      ? { name: "一般門診", price: 600, health: Math.min(100, next.health + 25), energy: Math.min(100, next.energy + 10), minutes: 15 }
      : payload.kind === "treatment"
        ? { name: "完整治療", price: 1500, health: Math.max(80, next.health), energy: Math.min(100, next.energy + 30), minutes: 30 }
        : { name: "急診治療", price: 2500, health: Math.max(70, next.health), energy: Math.min(100, next.energy + 20), minutes: 20 };
    if (next.cash < care.price) return fail("醫療費不足。");
    const previousIllness = next.illness;
    next.cash -= care.price; next.health = care.health; next.energy = care.energy; next.illness = ""; minutes = care.minutes;
    title = previousIllness ? `治癒${previousIllness}` : care.name;
    message = `${care.name}完成，健康恢復至 ${next.health}${previousIllness ? `，${previousIllness}已痊癒` : ""}。`;
  } else if (action === "reset") {
    return { player: { ...INITIAL_PLAYER }, title: "重新開始人生", message: "新的人生已開始，所有試玩進度回到起點。" };
  } else return fail("未知的行動。");
  const bypassVitalityEffects = action === "move" || (action === "hotel" && payload.kind === "work");
  if (action !== "hospital" && !bypassVitalityEffects) {
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
  if (minutes > 0) {
    next.actionAvailableAt = Date.now() + minutes * 1_000;
    next.actionLabel = title;
  }
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
  const [bingo, setBingo] = useState<BingoState>({ status: "lobby", drawn: [], players: [] });
  const [tournament, setTournament] = useState<TournamentState>({ status: "lobby", players: [] });
  const [casinoGame, setCasinoGame] = useState<"blackjack" | "poker" | "bingo" | "tournament">("blackjack");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [jobOpen, setJobOpen] = useState(false);
  const [talentOpen, setTalentOpen] = useState(false);
  const [cityMemory, setCityMemory] = useState<CityMemory>(EMPTY_CITY_MEMORY);
  const [scratchResult, setScratchResult] = useState<{ price: number; prize: number } | null>(null);
  const [enlargedPlayer, setEnlargedPlayer] = useState<OnlinePlayer | null>(null);
  const [transferRequests, setTransferRequests] = useState<TransferRequest[]>([]);
  const [transferTarget, setTransferTarget] = useState<{ player: OnlinePlayer; kind: "gift" | "scam" } | null>(null);
  const [transferAmount, setTransferAmount] = useState("");
  const [jobCategory, setJobCategory] = useState<string>(JOB_CATEGORIES[0].id);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authError, setAuthError] = useState("");
  const [nameOpen, setNameOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [nameError, setNameError] = useState("");
  const [notice, setNotice] = useState("正在連接人生世界……");
  const [sharedMinutes, setSharedMinutes] = useState(worldMinutes());
  const gameClock = useMemo(() => clock(sharedMinutes), [sharedMinutes]);
  const playClock = useMemo(() => clock(player.elapsedMinutes), [player.elapsedMinutes]);
  const currentLocation = locations.find((item) => item.id === player.location)!;
  const playerAbilities = abilitiesFor(player);
  const career = careerForCategory(player.jobCategory, player.jobExp, player.currentJob, playerAbilities);
  const nextCareer = nextCareerForCategory(player.jobCategory, player.jobExp, player.currentJob, playerAbilities);
  const nextCareerTitle = nextCareer?.title ?? "職涯最高階級";
  const careerProgress = nextCareer ? Math.max(0, Math.min(100, ((player.jobExp - career.threshold) / (nextCareer.threshold - career.threshold)) * 100)) : 100;
  const avatarSrc = profile?.avatarUrl ? `${API_ORIGIN}${profile.avatarUrl}` : "";
  const rentalMinutesLeft = Math.max(0, player.rentedUntil - player.elapsedMinutes);
  const rentalDaysLeft = rentalMinutesLeft ? Math.ceil(rentalMinutesLeft / 1440) : 0;
  const housingLabel = player.ownsHome ? "自有住宅 · 城市小宅" : rentalDaysLeft ? `租屋 · ${player.rentalName}（剩 ${rentalDaysLeft} 天）` : "目前沒有住所";
  const selectedJobCategory = JOB_CATEGORIES.find((category) => category.id === jobCategory) ?? JOB_CATEGORIES[0];
  const realtorOpen = isLocationOpen("realtor", sharedMinutes);
  const bankOpen = isLocationOpen("bank", sharedMinutes);
  const businessOpen = isLocationOpen("business", sharedMinutes);
  const shoppingOpen = isLocationOpen("shopping", sharedMinutes);
  const schoolOpen = isLocationOpen("school", sharedMinutes);
  const hospitalRegularOpen = isHospitalRegularOpen(sharedMinutes);
  const actionSecondsLeft = Math.max(0, Math.ceil((player.actionAvailableAt - Date.now()) / 1000));
  const actionLocked = actionSecondsLeft > 0;
  const actionBusy = busy || actionLocked;
  const pendingCityEvent = CITY_EVENTS.find((event) => event.id === player.pendingEvent);
  const nextStoryChapter = STORY_CHAPTERS[player.storyChapter];
  const nextStoryDebt = nextStoryChapter ? Math.round(250_000 * nextStoryChapter.remainingRatio) : 0;
  const storyProgress = Math.min(100, Math.max(0, ((250_000 - player.loanBalance) / 250_000) * 100));
  const pendingTransfer = transferRequests[0] ?? null;

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
      if (data.bingo) setBingo(data.bingo);
      if (data.tournament) setTournament(data.tournament);
      if (data.cityMemory) setCityMemory(data.cityMemory);
      setTransferRequests(data.transferRequests ?? []);
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
  }, [loadWorld]);

  useEffect(() => {
    if (!profile) return;
    const refreshWhileActive = () => { if (document.visibilityState === "visible") void loadWorld(true); };
    const timer = window.setInterval(refreshWhileActive, 10_000);
    document.addEventListener("visibilitychange", refreshWhileActive);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshWhileActive);
    };
  }, [profile, loadWorld]);

  useEffect(() => {
    const updateClock = () => setSharedMinutes(worldMinutes());
    updateClock();
    const timer = window.setInterval(updateClock, 1_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!profile || ((!casino.phase || casino.phase === "idle") && (!poker.phase || poker.phase === "idle") && bingo.status !== "drawing" && tournament.status !== "playing")) return;
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void loadWorld(true); }, 1_500);
    return () => window.clearInterval(timer);
  }, [profile, casino.phase, poker.phase, bingo.status, tournament.status, loadWorld]);

  useEffect(() => {
    if (!enlargedPlayer) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setEnlargedPlayer(null); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [enlargedPlayer]);

  async function act(action: string, payload: Record<string, unknown> = {}) {
    if (busy) return;
    if (actionLocked && !["move", "reset", "city_event"].includes(action) && !action.startsWith("casino_") && !action.startsWith("poker_") && !action.startsWith("bingo_") && !action.startsWith("tournament_")) {
      setNotice(`${player.actionLabel || "目前的行動"}尚未完成，請等待 ${actionSecondsLeft} 秒；期間可前往賭場遊玩。`);
      return;
    }
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
      const response = await fetch(`${API_ORIGIN}${action.startsWith("casino_") ? "/api/casino/action" : action.startsWith("poker_") ? "/api/poker/action" : action.startsWith("bingo_") ? "/api/bingo/action" : action.startsWith("tournament_") ? "/api/tournament/action" : "/api/game/action"}`, {
        method: "POST",
        headers: apiHeaders(true),
        body: JSON.stringify({ action: action.startsWith("casino_") ? action.slice(7) : action.startsWith("poker_") ? action.slice(6) : action.startsWith("bingo_") ? action.slice(6) : action.startsWith("tournament_") ? action.slice(11) : action, ...payload }),
      });
      const data = await response.json() as { player?: Player; online?: OnlinePlayer[]; feed?: FeedItem[]; casino?: CasinoState; poker?: PokerState; bingo?: BingoState; tournament?: TournamentState; cityMemory?: CityMemory; transferRequests?: TransferRequest[]; scratch?: { price: number; prize: number } | null; message?: string };
      if (!response.ok || !data.player) throw new Error(data.message || "行動失敗");
      setPlayer(data.player);
      if (data.online) setOnline(data.online);
      if (data.feed) setFeed(data.feed);
      if (data.casino) setCasino(data.casino);
      if (data.poker) setPoker(data.poker);
      if (data.bingo) setBingo(data.bingo);
      if (data.tournament) setTournament(data.tournament);
      if (data.cityMemory) setCityMemory(data.cityMemory);
      if (data.transferRequests) setTransferRequests(data.transferRequests);
      if (data.scratch) setScratchResult(data.scratch);
      setNotice(data.message || "行動完成");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "行動失敗，請稍後再試。");
    } finally {
      setBusy(false);
    }
  }

  function openTransfer(playerTarget: OnlinePlayer, kind: "gift" | "scam") {
    if (!profile || playerTarget.id === profile.id) return;
    setTransferTarget({ player: playerTarget, kind });
    setTransferAmount("");
  }

  async function submitTransfer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!transferTarget) return;
    const amount = Number(transferAmount);
    const minimum = transferTarget.kind === "scam" ? 2 : 1;
    if (!Number.isSafeInteger(amount) || amount < minimum || amount > player.cash) {
      setNotice(`請輸入 NT$${minimum}～NT$${formatMoney(player.cash)} 的整數金額。`);
      return;
    }
    await act("transfer_request", { targetId: transferTarget.player.id, kind: transferTarget.kind, amount });
    setTransferTarget(null);
    setTransferAmount("");
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

  function openNameEditor() {
    if (!profile) return;
    setNameDraft(profile.displayName);
    setNameError("");
    setNameOpen(true);
  }

  async function submitName(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) return;
    const displayName = nameDraft.trim().replace(/\s+/g, " ");
    if (displayName.length < 2 || displayName.length > 24 || /[\u0000-\u001f\u007f]/.test(displayName)) {
      setNameError("玩家名字需為 2～24 個字元，不能是空白或控制字元。");
      return;
    }
    setBusy(true); setNameError("");
    try {
      const response = await fetch(`${API_ORIGIN}/api/profile/name`, { method: "POST", headers: apiHeaders(true), body: JSON.stringify({ displayName }) });
      const data = await response.json() as { profile?: Profile; player?: Player; message?: string };
      if (!response.ok || !data.profile || !data.player) throw new Error(data.message || "玩家名字更新失敗。");
      setProfile(data.profile);
      setPlayer(data.player);
      setOnline((items) => items.map((item) => item.id === data.profile!.id ? { ...item, displayName } : item));
      setNameOpen(false);
      setNotice(data.message || "玩家名字已更新。");
      await loadWorld(true);
    } catch (error) {
      setNameError(error instanceof Error ? error.message : "玩家名字更新失敗，請稍後再試。");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    try { await fetch(`${API_ORIGIN}/api/auth/logout`, { method: "POST", headers: apiHeaders() }); } catch { /* local logout still works */ }
    window.localStorage.removeItem(TOKEN_KEY);
    setProfile(null); setNameOpen(false); setOnline([]); setFeed([]); setTransferRequests([]); setTransferTarget(null); setCasino({ capacity: 5, activeCount: 0, seats: [], hand: null }); setPlayer(INITIAL_PLAYER);
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
        <div className="world-time"><span>城市時間</span><strong>{gameClock.time}</strong><span>{playClock.day} · 玩家 {playClock.time} · 每滿 24:00 結算</span></div>
        <div className="account-area">
          <span className={`connection-dot ${profile ? "connected" : ""}`} />
          {profile ? (
            <><div><strong>{profile.displayName}</strong><small>進度已儲存 · 大廳 01</small></div><button className="account-button" type="button" onClick={openNameEditor} disabled={busy}>改名</button><button className="account-button" type="button" onClick={() => void logout()} disabled={busy}>登出</button></>
          ) : (
            <><div><strong>訪客試玩</strong><small>進度不會儲存</small></div><button className="account-button login-link" onClick={() => { setAuthMode("login"); setAuthOpen(true); }}>登入帳號</button></>
          )}
        </div>
      </header>

      <section className="marquee" aria-live="polite">
        <span className="marquee-label">世界快訊</span><p>{notice}</p>
      </section>

      <div className="game-grid" id="main-game" aria-busy={loading || busy}>
        <aside className="character-panel panel">
          <div className="panel-kicker">MY LIFE / {profile ? "ONLINE" : "GUEST"}</div>
          <div className="identity">
            <div className={`avatar ${avatarSrc ? "has-photo" : ""}`}>
              {avatarSrc ? <img src={avatarSrc} alt={`${profile?.displayName}的大頭貼`} /> : (profile?.displayName.slice(0, 1) ?? "旅")}
              {profile && <label className="avatar-upload" title="上傳自己的照片">換照片<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void uploadAvatar(event)} disabled={busy} /></label>}
            </div>
            <div><h1>{profile?.displayName ?? "旅行者"}</h1><span className="job-tag">{career.title}</span>{player.mainStory === "prodigal_return" && <span className="story-tag">主線 · 浪子回頭</span>}</div>
          </div>
          <div className="cash-card"><span>資產概況</span><strong><small>手上 NT$</small>{formatMoney(player.cash)}</strong><div className="cash-breakdown"><p><span>銀行存款</span><b>NT${formatMoney(player.bankBalance)}</b></p><p className={player.loanBalance ? "debt" : ""}><span>貸款餘額</span><b>NT${formatMoney(player.loanBalance)}</b></p></div><small>{profile ? "伺服器已安全保存" : "訪客模式暫存"}</small></div>
          {player.mainStory === "prodigal_return" && player.loanBalance > 0 && <div className={`debt-deadline ${player.missedPaymentDays ? "warning" : ""}`}><span>本日最低繳款</span><strong>NT${formatMoney(player.dailyMinimumPayment)}</strong><small>已繳 NT${formatMoney(player.dailyPaymentMade)} · 尚欠 NT${formatMoney(Math.max(0, player.dailyMinimumPayment - player.dailyPaymentMade))} · 連續欠繳 {player.missedPaymentDays}/2 天</small></div>}
          <div className={`housing-card ${!player.ownsHome && !rentalDaysLeft ? "homeless" : ""}`}><span>居住狀態</span><strong>{housingLabel}</strong><small>{player.ownsHome ? "永久住所" : rentalDaysLeft ? `剩餘 ${Math.floor(rentalMinutesLeft / 60)} 小時 ${Math.floor(rentalMinutesLeft % 60)} 分 · 僅在線時計時` : "請前往安心房仲"}</small></div>
          <div className="career-card">
            <div><span>目前職業</span><strong>{career.title}</strong></div><small>時薪 NT${formatMoney(career.hourlyPay)}</small>
            <div className="career-track"><i style={{ width: `${careerProgress}%` }} /></div>
            <p>{nextCareer && player.jobCategory !== "unfixed" ? `升遷為${nextCareerTitle}：${Math.max(0, nextCareer.threshold - player.jobExp)} EXP，${formatRequirements(nextCareer.requirements)}` : player.jobCategory === "unfixed" ? "前往工作地選擇產業路線" : "已達此產業最高職位"}</p>
          </div>
          <button className="talent-summary" type="button" onClick={() => setTalentOpen(true)} disabled={!profile}><span>天賦等級 {player.talentLevel}</span><strong>{player.talentPoints} 點可配置</strong><small>{player.talentExp % 100} / 100 天賦經驗 · 查看天賦樹</small></button>
          {player.illness && <div className="illness-alert"><strong>目前生病：{player.illness}</strong><span>工作與上課暫停，請前往市立醫院。</span></div>}
          <div className="stat-list">
            {statMeta.map((item) => <div className="stat-row" key={item.key}><span className="stat-label"><span>{item.icon}</span>{item.label}</span><div className="stat-track"><i style={{ width: `${Math.min(100, player[item.key] / (item.key === "energy" && player.talents.includes("strong_body") ? 120 : 100) * 100)}%` }} /></div><strong>{player[item.key]}</strong></div>)}
          </div>
          <div className="skills-block"><div className="section-heading"><span>能力履歷</span><small>SKILLS</small></div><Skill name="體力" exp={player.physicalExp} /><Skill name="智力" exp={player.intelligenceExp} /><Skill name="創造力" exp={player.creativityExp} /><Skill name="社交" exp={player.socialExp} /><Skill name="魅力" exp={player.charismaExp} /></div>
        </aside>

        <section className="world-panel panel">
          <div className="location-header"><div><p>YOU ARE HERE</p><h2>{currentLocation.image ? <img className="location-photo" src={currentLocation.image} alt="" /> : <span>{currentLocation.emoji}</span>}{currentLocation.name}</h2><small>{currentLocation.caption} · {currentLocation.hours}</small></div>{player.location === "business" ? <div className="location-career-progress"><span>PROMOTION PROGRESS</span><strong>{player.jobCategory === "unfixed" ? "尚未選擇產業" : nextCareer ? `下一階：${nextCareerTitle}` : "已達產業最高職位"}</strong><div><i style={{ width: `${player.jobCategory === "unfixed" ? 0 : careerProgress}%` }} /></div><small>{player.jobCategory === "unfixed" ? "請從下方「找工作」選擇產業路線" : nextCareer ? `職業經驗：${player.jobExp} / ${nextCareer.threshold} EXP` : `目前累積 ${player.jobExp} EXP`}</small><small>{nextCareer && player.jobCategory !== "unfixed" ? `能力要求：${formatRequirements(nextCareer.requirements) || "無"}` : player.jobCategory === "unfixed" ? "入行第一階免能力門檻" : "能力與經驗均已達標"}</small></div> : <span className="map-index">CITY · LOBBY 01</span>}</div>
          <nav className="location-strip" aria-label="城市地點">
            {locations.map((item) => <button className={`${item.id === player.location ? "active" : ""} ${!isLocationOpen(item.id, sharedMinutes) ? "closed" : ""}`} key={item.id} onClick={() => void act("move", { location: item.id })} disabled={busy}>{item.image ? <img className="location-photo" src={item.image} alt="" /> : <span>{item.emoji}</span>}<small>{item.name}</small><em>{isLocationOpen(item.id, sharedMinutes) ? item.hours : "已關門"}</em></button>)}
          </nav>
          <div className="action-stage">
            <div className="stage-number">{String(locations.findIndex((item) => item.id === player.location) + 1).padStart(2, "0")}</div>
            <div className="action-intro"><span>今天，想把時間花在哪裡？</span><h3>{actionTitle(player.location)}</h3><p>{actionLocked ? `${player.actionLabel || "目前的行動"}進行中，${actionSecondsLeft} 秒後可再次行動；期間可移動並前往賭場遊玩。` : actionDescription(player.location)}</p></div>
            <div className="action-cards">
              {player.location === "home" && <ActionCard icon="☾" title="睡眠 8 小時" meta="現實等待 2 分鐘 · 體力全滿 · 健康 +5" button="好好休息" onClick={() => void act("sleep")} disabled={actionBusy} />}
              {player.location === "realtor" && <><ActionCard icon="01" title="城市小套房 · 1 天" meta="每日 NT$350 · 租金 NT$350" button="租 1 天" onClick={() => void act("housing", { kind: "rent", days: 1 })} disabled={actionBusy || !realtorOpen} disabledLabel={!realtorOpen ? "已關門" : undefined} /><ActionCard icon="07" title="城市小套房 · 7 天" meta="每日 NT$350 · 租金 NT$2,450" button="租 7 天" onClick={() => void act("housing", { kind: "rent", days: 7 })} featured disabled={actionBusy || !realtorOpen} disabledLabel={!realtorOpen ? "已關門" : undefined} /><ActionCard icon="買" title="購買城市小宅" meta="NT$50,000 · 永久住所 · 買房後仍可查看租屋" button={player.ownsHome ? "已擁有，仍可看租屋" : "購買房屋"} onClick={() => void act("housing", { kind: "buy" })} disabled={actionBusy || !realtorOpen} disabledLabel={!realtorOpen ? "已關門" : undefined} /></>}
              {player.location === "bank" && <BankPanel player={player} busy={actionBusy || !bankOpen} closed={!bankOpen} onAction={(kind, amount) => void act("bank", { kind, amount })} />}
              {player.location === "business" && <><ActionCard icon="職" title="找工作" meta="第一階工作免能力門檻 · 12 條產業路線 · 換工作立即完成" button="打開產業列表" onClick={() => setJobOpen(true)} featured disabled={actionBusy || !businessOpen} disabledLabel={!businessOpen ? "已關門" : undefined} /><ActionCard icon="01" title="短班 1 小時" meta={`現實等待 30 秒 · 收入 NT$${formatMoney(career.hourlyPay)} · EXP +4`} button="開始工作" onClick={() => void act("work", { hours: 1 })} disabled={actionBusy || !businessOpen} disabledLabel={!businessOpen ? "已關門" : undefined} /><ActionCard icon="04" title="標準班 4 小時" meta={`現實等待 2 分鐘 · 收入 NT$${formatMoney(career.hourlyPay * 4)} · EXP +16`} button="開始工作" onClick={() => void act("work", { hours: 4 })} disabled={actionBusy || !businessOpen} disabledLabel={!businessOpen ? "已關門" : undefined} /><ActionCard icon="08" title="長班 8 小時" meta={`現實等待 4 分鐘 · 收入 NT$${formatMoney(career.hourlyPay * 8)} · EXP +32`} button="開始工作" onClick={() => void act("work", { hours: 8 })} disabled={actionBusy || !businessOpen} disabledLabel={!businessOpen ? "已關門" : undefined} /></>}
              {player.location === "shopping" && <><ActionCard icon="刮" title="幸運刮刮樂" meta="每張 NT$100 · 最高獎金 NT$50,000" button="購買並刮開" onClick={() => void act("scratch")} featured disabled={actionBusy || !shoppingOpen} disabledLabel={!shoppingOpen ? "已關門" : undefined} /><ActionCard icon="飯" title="巷口飯糰" meta="NT$45 · 飽足 +20" button="買來吃" onClick={() => void act("eat", { kind: "rice" })} disabled={actionBusy || !shoppingOpen} disabledLabel={!shoppingOpen ? "已關門" : undefined} /><ActionCard icon="餐" title="豐盛便當" meta="NT$100 · 飽足 +45 · 心情 +3" button="享用便當" onClick={() => void act("eat", { kind: "bento" })} disabled={actionBusy || !shoppingOpen} disabledLabel={!shoppingOpen ? "已關門" : undefined} /></>}
              {player.location === "hotel" && <><ActionCard icon="工" title="旅店臨時工 · 30 秒" meta="現實等待 30 秒 · 收入 NT$100 · 不扣體力、飽足、健康 · 無職業經驗" button="開始打工" onClick={() => void act("hotel", { kind: "work" })} featured disabled={actionBusy} /><ActionCard icon="宿" title="旅店住宿一晚" meta="NT$1,200 · 現實等待 2 分鐘 · 體力全滿" button="辦理入住" onClick={() => void act("hotel", { kind: "stay" })} disabled={actionBusy || player.ownsHome || rentalDaysLeft > 0} disabledLabel={player.ownsHome || rentalDaysLeft > 0 ? "已有住所" : undefined} /><ActionCard icon="餐" title="24 小時旅店餐" meta="NT$250 · 飽足 +45 · 立即完成" button="購買旅店餐" onClick={() => void act("hotel", { kind: "meal" })} disabled={actionBusy} /><ActionCard icon="豪" title="24 小時豪華餐" meta="NT$500 · 飽足 +80 · 立即完成" button="購買豪華餐" onClick={() => void act("hotel", { kind: "luxury" })} disabled={actionBusy} /></>}
                {player.location === "casino" && <div className="casino-games"><div className="casino-game-tabs"><button className={casinoGame === "blackjack" ? "active" : ""} onClick={() => setCasinoGame("blackjack")}>二十一點 · 真實牌靴</button><button className={casinoGame === "poker" ? "active" : ""} onClick={() => setCasinoGame("poker")}>德州撲克 · 完整下注</button><button className={casinoGame === "bingo" ? "active" : ""} onClick={() => setCasinoGame("bingo")}>賓果 · 公開開獎</button><button className={casinoGame === "tournament" ? "active" : ""} onClick={() => setCasinoGame("tournament")}>錦標賽 · 積分賽</button></div>{casinoGame === "blackjack" ? <CasinoTable state={casino} signedIn={Boolean(profile)} busy={busy} maxBet={player.cash} onAction={(action, payload) => void act(`casino_${action}`, payload)} /> : casinoGame === "poker" ? <PokerTable state={poker} signedIn={Boolean(profile)} busy={busy} maxBet={player.cash} onAction={(action, payload) => void act(`poker_${action}`, payload)} /> : casinoGame === "bingo" ? <BingoTable state={bingo} signedIn={Boolean(profile)} busy={busy} onAction={(action, entryFee) => void act(`bingo_${action}`, { entryFee })} /> : <TournamentTable state={tournament} signedIn={Boolean(profile)} busy={busy} onAction={(action, game, entryFee) => void act(`tournament_${action}`, { game, entryFee })} />}</div>}
              {player.location === "school" && ACADEMIES.map((academy, index) => <ActionCard key={academy.id} icon={academy.icon} title={academy.name} meta={`NT$500 · 現實等待 1 分鐘 · ${formatRequirements(academy.gains)}`} button="報名上課" onClick={() => void act("study", { academy: academy.id })} featured={index === 0} disabled={actionBusy || !schoolOpen} disabledLabel={!schoolOpen ? "已關門" : undefined} />)}
              {player.location === "hospital" && <><ActionCard icon="急" title="24 小時急診" meta="NT$2,500 · 等待 20 秒 · 健康至少恢復至 70" button="前往急診" onClick={() => void act("hospital", { kind: "emergency" })} featured disabled={actionBusy} /><ActionCard icon="診" title="一般門診" meta="07:00～23:00 · NT$600 · 等待 15 秒 · 健康 +25" button="掛號看診" onClick={() => void act("hospital", { kind: "clinic" })} disabled={actionBusy || !hospitalRegularOpen} disabledLabel={!hospitalRegularOpen ? "已關門，請使用急診" : undefined} /><ActionCard icon="療" title="完整治療" meta="07:00～23:00 · NT$1,500 · 等待 30 秒 · 健康至少恢復至 80" button="接受治療" onClick={() => void act("hospital", { kind: "treatment" })} disabled={actionBusy || !hospitalRegularOpen} disabledLabel={!hospitalRegularOpen ? "已關門，請使用急診" : undefined} /></>}
            </div>
          </div>
          <footer className="world-footer"><span>只有上線時計入個人遊玩天數 · 城市時間全服同步</span><button onClick={() => void act("reset")} disabled={busy}>重新開始人生</button></footer>
        </section>

        <aside className="story-panel panel">
          <div className="section-heading story-title"><span>多人世界</span><small>LIVE LOBBY</small></div>
          <div className="online-summary"><strong><i />{online.length} 位在線</strong><span>每 5 秒同步</span></div>
          <ul className="online-list">
            {online.length ? online.slice(0, 8).map((item) => <li key={item.id}><button type="button" className={`mini-avatar ${item.avatarUrl ? "has-photo" : ""}`} aria-label={`放大查看${item.displayName}的大頭貼`} onClick={() => setEnlargedPlayer(item)}>{item.avatarUrl ? <img src={`${API_ORIGIN}${item.avatarUrl}`} alt="" /> : item.displayName.slice(0, 1)}</button><div><strong>{item.displayName}{item.id === profile?.id ? "（你）" : ""}</strong><small>正在 {locationName(item.location)}</small><span className="online-finance">現金 NT${formatMoney(item.cash)} · 貸款 NT${formatMoney(item.loanBalance)}</span>{profile && item.id !== profile.id && <span className="player-transfer-actions"><button type="button" onClick={() => openTransfer(item, "gift")} disabled={busy || player.cash < 1}>贈送</button><button type="button" className="scam" onClick={() => openTransfer(item, "scam")} disabled={busy || player.cash < 2}>詐騙</button></span>}</div></li>) : <li className="empty-online">登入後，你會在這裡遇見其他玩家。</li>}
          </ul>
          <div className="section-heading feed-heading"><span>城市動態</span><small>ACTIVITY</small></div>
          <ol className="feed-list">
            {feed.slice(0, 6).map((item) => <li key={item.id} className={item.tone}><time>{item.time}</time><div><strong>{item.playerName ? `${item.playerName} · ` : ""}{item.title}</strong><p>{item.detail}</p></div></li>)}
          </ol>
          <div className={`city-memory-card ${cityMemory.state.tone}`}><span>CITY MEMORY · 3 DAY CYCLE</span><strong>{cityMemory.state.name}</strong><p>{cityMemory.state.description}</p><div><small>工作 {cityMemory.totals.work}</small><small>醫療 {cityMemory.totals.hospital}</small><small>居住 {cityMemory.totals.housing}</small><small>學習 {cityMemory.totals.study}</small><small>賭場 {cityMemory.totals.casino}</small><small>事件 {cityMemory.totals.event}</small></div></div>
          <div className="next-goal"><span>當前《浪子回頭》任務進度</span><strong>{player.mainStory !== "prodigal_return" ? "尚未開始《浪子回頭》" : nextStoryChapter ? `第 ${nextStoryChapter.chapter} 章 · ${nextStoryChapter.title}` : "第 6 章完成 · 回家的路"}</strong><div><i style={{ width: `${player.mainStory === "prodigal_return" ? storyProgress : 0}%` }} /></div><small>{player.mainStory !== "prodigal_return" ? "選擇人生主線後開始記錄" : nextStoryChapter ? `目前貸款 NT$${formatMoney(player.loanBalance)} · 目標降至 NT$${formatMoney(nextStoryDebt)}（初始負債 ${Math.round(nextStoryChapter.remainingRatio * 100)}%）` : "貸款已全部清償 · 《浪子回頭》全章完成"}</small></div>
        </aside>
      </div>
      {profile && player.mainStory === "unselected" && <div className="story-select-overlay" role="dialog" aria-modal="true" aria-labelledby="story-select-title">
        <section className="story-select-card"><header><span>CHOOSE YOUR LIFE STORY</span><h2 id="story-select-title">選擇人生主線</h2><p>主線選定後不能更換，並會決定你的初始條件。</p></header><article><div className="story-choice-title"><span>MAIN STORY 01</span><h3>《浪子回頭》</h3></div><div className="story-prologue">{PRODIGAL_RETURN_STORY.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div><div className="story-starting-stats"><div><span>初始金錢</span><strong>NT$37</strong></div><div className="debt"><span>初始負債</span><strong>NT$250,000</strong></div></div><button type="button" onClick={() => void act("choose_story", { story: "prodigal_return" })} disabled={busy}>{busy ? "正在開始人生……" : "選擇《浪子回頭》並開始"}<span>→</span></button></article></section>
      </div>}
      {profile && player.gameOver === "prodigal_insolvent" && <div className="story-select-overlay game-over-overlay" role="dialog" aria-modal="true" aria-labelledby="game-over-title">
        <section className="story-select-card game-over-card"><header><span>BAD ENDING</span><h2 id="game-over-title">《浪子回頭：無力償還》</h2><p>連續兩個遊戲日未繳足每日最低還款額</p></header><article><div className="story-prologue">{PRODIGAL_FAILURE_STORY.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div><button type="button" onClick={() => void act("reset")} disabled={busy}>{busy ? "正在重新開始……" : "重新開始《浪子回頭》"}<span>↻</span></button></article></section>
      </div>}
      {talentOpen && <div className="auth-overlay" role="dialog" aria-modal="true" aria-labelledby="talent-title" onMouseDown={(event) => { if (event.currentTarget === event.target) setTalentOpen(false); }}><section className="talent-board"><button className="auth-close" type="button" aria-label="關閉天賦樹" onClick={() => setTalentOpen(false)}>×</button><span className="panel-kicker">LIFE TALENTS</span><h2 id="talent-title">天賦樹</h2><p>等級 {player.talentLevel} · 可用 {player.talentPoints} 點 · 每 100 經驗獲得 1 點。天賦不會改變賭場或刮刮樂機率。</p><div className="talent-branches">{["職涯", "生存", "財務", "機會"].map((branch) => <section key={branch}><h3>{branch}</h3>{TALENTS.filter((talent) => talent.branch === branch).map((talent) => { const owned = player.talents.includes(talent.id); const locked = talent.requires.some((required) => !player.talents.includes(required)); return <button className={owned ? "owned" : ""} key={talent.id} disabled={busy || owned || locked || player.talentPoints < 1} onClick={() => void act("talent", { talent: talent.id })}><strong>{talent.name}</strong><small>{talent.description}</small><em>{owned ? "已解鎖" : locked ? "需要前置天賦" : "使用 1 點"}</em></button>; })}</section>)}</div><button className="talent-reset" disabled={busy || !player.talents.length || player.cash < 2_000} onClick={() => void act("talent", { kind: "reset" })}>支付 NT$2,000 重置天賦</button></section></div>}
      {profile && pendingCityEvent && <div className="auth-overlay city-event-overlay" role="dialog" aria-modal="true" aria-labelledby="city-event-title"><section className="city-event-card"><span>THE CITY FOUND YOU</span><h2 id="city-event-title">{pendingCityEvent.title}</h2><p>{pendingCityEvent.text}</p><div>{pendingCityEvent.choices.map((choice) => { const unavailable = "requires" in choice && choice.requires && !player.talents.includes(choice.requires); return <button key={choice.id} disabled={busy || Boolean(unavailable)} onClick={() => void act("city_event", { choice: choice.id })}>{choice.label}{unavailable ? <small>需要談判能力</small> : null}</button>; })}</div></section></div>}
      {transferTarget && <div className="auth-overlay transfer-overlay" role="dialog" aria-modal="true" aria-labelledby="transfer-title" onMouseDown={(event) => { if (event.currentTarget === event.target) setTransferTarget(null); }}><form className="transfer-card" onSubmit={submitTransfer}><button className="auth-close" type="button" aria-label="關閉" onClick={() => setTransferTarget(null)}>×</button><span className="panel-kicker">PLAYER TO PLAYER</span><h2 id="transfer-title">{transferTarget.kind === "gift" ? "贈送現金" : "發送詐騙邀請"}</h2><p>{transferTarget.kind === "gift" ? `向 ${transferTarget.player.displayName} 贈送現金；對方接受後才會完成轉帳。` : `向 ${transferTarget.player.displayName} 發送與贈送相同外觀的現金邀請。對方接受時，有 50% 機率被騙走填寫金額的一半。`}</p><label>金額（最多 NT${formatMoney(player.cash)}）<input inputMode="numeric" type="number" min={transferTarget.kind === "scam" ? 2 : 1} max={player.cash} step="1" value={transferAmount} onChange={(event) => setTransferAmount(event.target.value)} autoFocus required /></label><small>{transferTarget.kind === "scam" ? "詐騙金額以你手上的現金為上限；成功時對方失去此金額的一半。" : "送出邀請後，請等待對方接受或拒絕。"}</small><button className="transfer-submit" disabled={busy || player.cash < (transferTarget.kind === "scam" ? 2 : 1)}>{transferTarget.kind === "gift" ? "送出贈送邀請" : "送出現金邀請"}</button></form></div>}
      {profile && pendingTransfer && <div className="auth-overlay transfer-overlay" role="dialog" aria-modal="true" aria-labelledby="incoming-transfer-title"><section className="transfer-card incoming-transfer"><span className="panel-kicker">CASH INVITATION</span><h2 id="incoming-transfer-title">現金邀請</h2><p><strong>{pendingTransfer.senderName}</strong> 想送給你 NT${formatMoney(pendingTransfer.amount)}，要接受這筆現金嗎？</p><small>接受後將立即處理；你也可以直接拒絕。</small><div className="transfer-response"><button type="button" className="decline" disabled={busy} onClick={() => void act("transfer_response", { requestId: pendingTransfer.id, kind: "decline" })}>拒絕</button><button type="button" disabled={busy} onClick={() => void act("transfer_response", { requestId: pendingTransfer.id, kind: "accept" })}>接受</button></div></section></div>}
      {enlargedPlayer && <div className="avatar-lightbox" role="dialog" aria-modal="true" aria-labelledby="avatar-lightbox-title" onMouseDown={(event) => { if (event.currentTarget === event.target) setEnlargedPlayer(null); }}>
        <section><button className="auth-close" type="button" aria-label="關閉大頭貼" onClick={() => setEnlargedPlayer(null)}>×</button><div className={`enlarged-avatar ${enlargedPlayer.avatarUrl ? "has-photo" : ""}`}>{enlargedPlayer.avatarUrl ? <img src={`${API_ORIGIN}${enlargedPlayer.avatarUrl}`} alt={`${enlargedPlayer.displayName}的大頭貼`} /> : enlargedPlayer.displayName.slice(0, 1)}</div><h2 id="avatar-lightbox-title">{enlargedPlayer.displayName}</h2><p>現金 NT${formatMoney(enlargedPlayer.cash)} · 貸款 NT${formatMoney(enlargedPlayer.loanBalance)}</p></section>
      </div>}
      {jobOpen && <div className="auth-overlay" role="dialog" aria-modal="true" aria-labelledby="job-title" onMouseDown={(event) => { if (event.currentTarget === event.target) setJobOpen(false); }}>
        <section className="job-board">
          <button className="auth-close" type="button" aria-label="關閉" onClick={() => setJobOpen(false)}>×</button>
          <span className="panel-kicker">CITY CAREER BOARD</span>
          <h2 id="job-title">找工作</h2>
          <p>每條產業都有指定能力門檻；先到未來學院培養能力，入行後同時達成產業 EXP 與能力要求才會依序升遷。更換產業會重設該路線經驗，五項能力會保留。</p>
          <div className="job-categories" role="tablist" aria-label="職業分類">
            {JOB_CATEGORIES.map((category) => <button role="tab" aria-selected={jobCategory === category.id} className={jobCategory === category.id ? "active" : ""} key={category.id} onClick={() => setJobCategory(category.id)}>{category.label}</button>)}
          </div>
          {selectedJobCategory.id === "unfixed" ? <div className="job-list">{selectedJobCategory.jobs.map((job) => <button className={player.currentJob === job ? "current" : ""} key={job} onClick={() => { setJobOpen(false); void act("job", { job }); }} disabled={actionBusy}><span>{job}</span><small>{player.currentJob === job ? "目前狀態" : "無固定工作與收入"}</small></button>)}</div> : <div className="career-route">
              <div className="route-steps">{selectedJobCategory.jobs.map((job, index) => <div className={player.jobCategory === selectedJobCategory.id && player.currentJob === job ? "current" : ""} key={job}><small>第 {index + 1} 階</small><strong>{job}</strong><span>{index === 0 ? "免能力門檻入行" : `${careerThresholdForCategory(selectedJobCategory.id, index)} EXP`} · {formatRequirements(careerRequirements(selectedJobCategory.id, index))}</span></div>)}</div>
            <button className="enter-industry" onClick={() => { setJobOpen(false); void act("job", { job: selectedJobCategory.jobs[0] }); }} disabled={actionBusy || (player.jobCategory === selectedJobCategory.id && player.jobExp === 0)}>進入{selectedJobCategory.label} · 從{selectedJobCategory.jobs[0]}開始</button>
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
      {nameOpen && profile && <div className="auth-overlay" role="dialog" aria-modal="true" aria-labelledby="name-title" onMouseDown={(event) => { if (event.currentTarget === event.target) setNameOpen(false); }}>
        <form className="auth-card" onSubmit={submitName}>
          <button className="auth-close" type="button" aria-label="關閉改名視窗" onClick={() => setNameOpen(false)}>×</button>
          <span className="panel-kicker">PLAYER PROFILE</span>
          <h2 id="name-title">更改玩家名字</h2>
          <p>新名字會立即套用到多人世界、牌桌名單與之後的城市動態。</p>
          <label>玩家名字<input value={nameDraft} onChange={(event) => setNameDraft(event.target.value)} minLength={2} maxLength={24} autoComplete="nickname" autoFocus required /></label>
          {nameError && <p className="auth-error" role="alert">{nameError}</p>}
          <button className="auth-submit" disabled={busy}>{busy ? "儲存中…" : "儲存新名字"}</button>
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
    <p>存款每個遊戲日複利 0.1%；一般貸款每日增加 0.5%，《浪子回頭》主線債務每日增加 0.2%。遊戲日結束時若未主動還款，系統會先從手上現金、再從銀行存款自動扣除最低繳款；兩者都不足才記為欠繳。每個遊戲日等於上線遊玩 24 分鐘，離線期間不結算。</p>
    {player.mainStory === "prodigal_return" && player.loanBalance > 0 && <div className={`bank-payment-status ${player.missedPaymentDays ? "warning" : ""}`}><strong>本日最低繳款 NT${formatMoney(player.dailyMinimumPayment)}</strong><span>已繳 NT${formatMoney(player.dailyPaymentMade)} · 尚欠 NT${formatMoney(Math.max(0, player.dailyMinimumPayment - player.dailyPaymentMade))}</span><small>玩家在線時間每滿 24 小時結算，先扣手上現金，再扣銀行存款；兩者不足才記欠繳。連續欠繳 {player.missedPaymentDays}/2 天。</small></div>}
    <label>輸入金額<div><span>NT$</span><input type="number" inputMode="numeric" min="1" step="1" value={amount} onChange={(event) => setAmount(event.target.value)} disabled={busy} /></div></label>
    <div className="bank-actions">
      <button onClick={() => onAction("deposit", value)} disabled={busy || !valid}>存款</button>
      <button onClick={() => onAction("withdraw", value)} disabled={busy || !valid}>提款</button>
      <button onClick={() => onAction("borrow", value)} disabled={busy || !valid || value > 50_000 || player.loanBalance > 0}>貸款</button>
      <button onClick={() => onAction("repay", value)} disabled={busy || !valid || player.loanBalance <= 0}>還款</button>
    </div>
    <small>{closed ? "銀行目前已關門，營業時間為 07:00～23:00。" : player.loanBalance ? "貸款未清前不能再次借款。" : "單筆貸款上限 NT$50,000。"}</small>
  </section>;
}

function BingoTable({ state, signedIn, busy, onAction }: { state: BingoState; signedIn: boolean; busy: boolean; onAction: (action: "join" | "leave", entryFee?: number) => void }) {
  const [entryFee, setEntryFee] = useState("100");
  const mine = state.players.find((player) => player.isMine);
  const hosting = state.status === "lobby" && !state.hostUserId;
  const fee = state.entryFee ?? 100;
  const requestedFee = Number(entryFee);
  const validFee = Number.isInteger(requestedFee) && requestedFee >= 100 && requestedFee <= 10_000;
  const displayedFee = (hosting || state.status === "completed") && validFee ? requestedFee : fee;
  const statusLabel = state.status === "drawing" ? "開獎中" : state.status === "completed" ? "本輪結束" : "等待玩家";
  return <section className="casino-table social-casino-table bingo-table">
    <header><div><span>COMMUNITY BINGO</span><h3>多人共同開獎</h3><p>最先完成橫、直或斜線的玩家獲勝</p></div><strong className={`room-status ${state.status}`}>{statusLabel}</strong></header>
    <div className="casino-room-meta"><div><small>報名費</small><strong>NT${formatMoney(displayedFee)}</strong></div><div><small>房間人數</small><strong>{state.players.length} / {state.capacity ?? 5}</strong></div><div><small>獎池</small><strong>NT${formatMoney(fee * state.players.length)}</strong></div></div>
    {state.status === "drawing" && <div className="bingo-draws"><span>已開出 {state.drawn.length} / 25 個號碼</span><div>{state.drawn.map((number) => <b key={number}>{number}</b>)}</div></div>}
    {state.status === "completed" ? <div className="room-entry-panel"><label className="room-fee-field"><span>建立下一輪並設定報名費</span><div><b>NT$</b><input aria-label="下一輪賓果報名費" type="number" min="100" max="10000" step="100" inputMode="numeric" value={entryFee} onChange={(event) => setEntryFee(event.target.value)} /></div><small>上一輪已結束，由下一位開房者設定新費用。</small></label><button className="casino-primary" disabled={busy || !signedIn || !validFee} onClick={() => onAction("join", requestedFee)}>建立下一輪賓果</button></div> : mine ? <div className="joined-room-panel">
      <div className="joined-room-copy"><span>{state.hostUserId === mine.id ? "你是房主" : "你已加入"}</span><strong>{state.status === "lobby" ? "等待另一位玩家加入" : "你的賓果卡"}</strong><small>{state.status === "lobby" ? "第二位玩家加入後立即開始公開開獎。" : "亮起的數字代表已經開出。"}</small></div>
      <div className="bingo-card">{mine.card.map((number) => <span className={state.drawn.includes(number) ? "marked" : ""} key={number}>{number}</span>)}</div>
      {state.status === "lobby" && <button className="room-leave-button" disabled={busy} onClick={() => onAction("leave")}>離開房間並退還 NT${formatMoney(fee)}</button>}
    </div> : state.status === "lobby" && <div className="room-entry-panel">
      {hosting ? <label className="room-fee-field"><span>設定每人報名費</span><div><b>NT$</b><input aria-label="賓果報名費" type="number" min="100" max="10000" step="100" inputMode="numeric" value={entryFee} onChange={(event) => setEntryFee(event.target.value)} /></div><small>可設定 NT$100～10,000，開房後即鎖定。</small></label> : <div className="room-ready-copy"><span>房間已建立</span><strong>加入費用 NT${formatMoney(fee)}</strong><small>加入後立即開始公開開獎。</small></div>}
      <button className="casino-primary" disabled={busy || !signedIn || state.players.length >= 5 || (hosting && !validFee)} onClick={() => onAction("join", hosting ? requestedFee : undefined)}>{signedIn ? hosting ? "建立賓果房間" : "加入這個房間" : "登入後加入"}</button>
    </div>}
    <div className="casino-player-list"><header><strong>房間玩家</strong><span>{state.players.length ? `${state.players.length} 人已就緒` : "尚未有人加入"}</span></header>{state.players.length ? state.players.map((player, index) => <div key={player.id}><b>{index + 1}</b><span><strong>{player.displayName}{player.isMine ? "（你）" : ""}</strong><small>{player.id === state.hostUserId ? "房主" : state.status === "drawing" ? `${player.card.filter((number) => state.drawn.includes(number)).length}/9 已標記` : "已就緒"}</small></span><em>{player.card.filter((number) => state.drawn.includes(number)).length}/9</em></div>) : <p>設定報名費，成為第一位開房玩家。</p>}</div>
  </section>;
}

function TournamentTable({ state, signedIn, busy, onAction }: { state: TournamentState; signedIn: boolean; busy: boolean; onAction: (action: "join" | "leave", game?: "blackjack" | "poker", entryFee?: number) => void }) {
  const [entryFee, setEntryFee] = useState("500");
  const joined = state.players.some((player) => player.isMine);
  const hosting = state.status === "lobby" && !state.hostUserId;
  const fee = state.entryFee ?? 500;
  const requestedFee = Number(entryFee);
  const validFee = Number.isInteger(requestedFee) && requestedFee >= 100 && requestedFee <= 10_000;
  const creatingRoom = hosting || state.status === "completed";
  const displayedFee = creatingRoom && validFee ? requestedFee : fee;
  const gameName = state.game === "poker" ? "德州撲克" : "二十一點";
  const statusLabel = state.status === "playing" ? `第 ${Math.min((state.currentRound ?? 0) + 1, state.roundLimit ?? 5)} / 5 局` : state.status === "completed" ? "賽事結束" : "等待玩家";
  return <section className="casino-table social-casino-table tournament-table">
    <header><div><span>CASINO TOURNAMENT</span><h3>五局積分錦標賽</h3><p>每局依名次取得積分，五局後以總排名分配獎池</p></div><strong className={`room-status ${state.status}`}>{statusLabel}</strong></header>
    <div className="casino-room-meta"><div><small>比賽玩法</small><strong>{creatingRoom ? "房主決定" : gameName}</strong></div><div><small>報名費</small><strong>NT${formatMoney(displayedFee)}</strong></div><div><small>目前獎池</small><strong>NT${formatMoney(fee * state.players.length)}</strong></div></div>
    <div className="prize-split"><span>獎金分配</span><b>第 1 名 60%</b><b>第 2 名 30%</b><b>第 3 名 10%</b><small>只有 2 人時為 70% / 30%</small></div>
    {(state.status === "completed" || (state.status === "lobby" && !joined)) && <div className="room-entry-panel tournament-entry-panel">
      {creatingRoom ? <label className="room-fee-field"><span>{state.status === "completed" ? "建立下一場並設定報名費" : "設定每人報名費"}</span><div><b>NT$</b><input aria-label="錦標賽報名費" type="number" min="100" max="10000" step="100" inputMode="numeric" value={entryFee} onChange={(event) => setEntryFee(event.target.value)} /></div><small>可設定 NT$100～10,000，選擇玩法後建立房間。</small></label> : <div className="room-ready-copy"><span>{gameName}房間已建立</span><strong>加入費用 NT${formatMoney(fee)}</strong><small>第二位玩家加入後開始五局比賽。</small></div>}
      <div className="tournament-game-options">{creatingRoom ? <><button disabled={busy || !signedIn || !validFee} onClick={() => onAction("join", "blackjack", requestedFee)}><b>21</b><span><strong>二十一點</strong><small>比較每局最接近 21 點的牌面</small></span></button><button disabled={busy || !signedIn || !validFee} onClick={() => onAction("join", "poker", requestedFee)}><b>♠</b><span><strong>德州撲克</strong><small>以完整牌型比較每局排名</small></span></button></> : <button className="join-existing-room" disabled={busy || !signedIn} onClick={() => onAction("join", state.game === "poker" ? "poker" : "blackjack")}><b>{state.game === "poker" ? "♠" : "21"}</b><span><strong>加入{gameName}錦標賽</strong><small>報名費 NT${formatMoney(fee)}</small></span></button>}</div>
    </div>}
    {joined && state.status === "lobby" && <div className="joined-room-panel compact"><div className="joined-room-copy"><span>{state.hostUserId && state.players.find((player) => player.isMine)?.id === state.hostUserId ? "你是房主" : "你已加入"}</span><strong>等待另一位玩家加入</strong><small>{gameName} · 5 局積分賽 · 報名費 NT${formatMoney(fee)}</small></div><button className="room-leave-button" disabled={busy} onClick={() => onAction("leave")}>離開並退還 NT${formatMoney(fee)}</button></div>}
    {state.latestResult && <p className="tournament-result">{state.latestResult}</p>}
    <div className="casino-player-list tournament-rankings"><header><strong>即時排名</strong><span>{state.players.length} / {state.capacity ?? 5} 人</span></header>{state.players.length ? state.players.map((player, index) => <div key={player.id}><b>{index + 1}</b><span><strong>{player.displayName}{player.isMine ? "（你）" : ""}</strong><small>{player.latestHand || (player.id === state.hostUserId ? "房主 · 等待開賽" : "等待開賽")}</small></span><em>{player.score} PTS</em></div>) : <p>選擇玩法與報名費，建立第一場錦標賽。</p>}</div>
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
    <footer>先選座位再自訂下注 · 第一筆下注後等待 5 秒 · 連續 6 個遊戲小時未下注會自動離座 · 全桌同步顯示手牌</footer>
  </section>;
}

function PokerTable({ state, signedIn, busy, maxBet, onAction }: { state: PokerState; signedIn: boolean; busy: boolean; maxBet: number; onAction: (action: string, payload?: Record<string, unknown>) => void }) {
  const [blind, setBlind] = useState("100");
  const [raiseBy, setRaiseBy] = useState("100");
  const active = Boolean(state.hand && ["seated", "ready", "playing", "folded", "settling"].includes(state.hand.status));
  const readyCount = state.seats.filter((seat) => seat.status === "ready").length;
  const playing = state.phase === "playing";
  const callAmount = Math.max(0, (state.currentBet ?? 0) - (state.hand?.streetBet ?? 0));
  const streetLabel = ({ preflop: "翻牌前", flop: "翻牌圈", turn: "轉牌圈", river: "河牌圈", showdown: "攤牌" } as Record<string, string>)[state.street ?? ""] ?? "等待開局";
  return <section className="casino-table poker-table">
    <header><div><span>TEXAS HOLD&apos;EM TABLE 01</span><h4>五人同步德州撲克</h4></div><strong>{state.activeCount} / {state.capacity} 位在座 · {playing ? `${streetLabel} · 輪到 ${state.turnSeat} 號` : "等待新局"}</strong></header>
    <div className="casino-seats">{Array.from({ length: 5 }, (_, index) => {
      const seatNo = index + 1; const seat = state.seats.find((item) => item.seatNo === seatNo);
      return <div className={`${seat ? "occupied" : ""} ${seat?.isMine ? "mine" : ""}`} key={seatNo}>
        <span>{seatNo}</span><strong>{seat?.isMine ? `${seat.displayName}（你）` : seat?.displayName ?? "空位"}</strong>
        {!seat && signedIn && !playing && !active && <button onClick={() => onAction("join", { seatNo })} disabled={busy}>加入遊戲</button>}
        {seat && <small>{seat.status === "folded" ? "已棄牌" : seat.status === "playing" ? `本圈 NT$${formatMoney(seat.streetBet ?? 0)} · 累計 NT$${formatMoney(seat.bet)}` : seat.status === "ready" ? "已準備" : seat.result ? "上一局已結算" : "等待準備"}</small>}
      </div>;
    })}</div>
    {(state.communityCards.length > 0 || playing) && <div className="poker-board">
      <div className="poker-community"><span>{streetLabel} · 獎池 NT$${formatMoney(state.pot)} · 本圈最高 NT$${formatMoney(state.currentBet ?? 0)}</span>{state.communityCards.length ? <CardRow cards={state.communityCards} /> : <p>翻牌前下注中，公共牌尚未發出</p>}</div>
      <div className="shared-player-hands">{state.seats.map((seat) => <article className={`${seat.isMine ? "mine" : ""} ${seat.cards.length ? "has-cards" : "spectator"}`} key={seat.id}>
        <header><strong>{seat.seatNo} 號 · {seat.displayName}{seat.isMine ? "（你）" : ""}</strong><small>{seat.status === "folded" ? "已棄牌" : seat.cards.length ? `底牌 · 累計 NT$${formatMoney(seat.bet)}` : "等待開局"}</small></header>
        {seat.cards.length ? <CardRow cards={seat.cards} /> : <p>等待下一局</p>}
        {seat.result && <em>{seat.result}</em>}
      </article>)}</div>
    </div>}
    {!signedIn ? <p className="casino-message">登入後才能加入五人德州撲克牌桌。</p> : playing ? <div className="casino-round-actions">
      {state.hand?.isTurn ? <div className="casino-controls"><button onClick={() => onAction(callAmount ? "call" : "check")} disabled={busy || callAmount > maxBet}>{callAmount ? `跟注 NT$${formatMoney(callAmount)}` : "過牌"}</button><button onClick={() => onAction("raise", { amount: Number(raiseBy) })} disabled={busy || callAmount + Number(raiseBy) > maxBet}>加注</button><input aria-label="加注金額" type="number" min="10" step="10" value={raiseBy} onChange={(event) => setRaiseBy(event.target.value)} /><button className="leave" onClick={() => onAction("fold")} disabled={busy}>棄牌</button></div> : <p className="casino-message">{state.hand?.status === "folded" ? "你本局已棄牌，可繼續觀賽。" : `等待 ${state.turnSeat} 號玩家行動。`}</p>}
    </div> : state.hand?.status === "seated" ? <div className="custom-bet"><p className="casino-message">按下準備才會加入下一局；未準備的玩家不會被收取盲注。</p><button onClick={() => onAction("ready")} disabled={busy}>準備參加下一局</button><button className="leave-seat" onClick={() => onAction("leave")} disabled={busy}>離開牌桌</button>{state.hand.result && <p className="casino-result">{state.hand.result}</p>}</div> : state.hand?.status === "ready" ? <div className="custom-bet"><label>已準備（目前 {readyCount} 人）<small>開局者設定大盲，小盲為一半</small></label><div><span>NT$</span><input type="number" min="10" max={Math.min(maxBet, 100000)} step="10" value={blind} onChange={(event) => setBlind(event.target.value)} /><button onClick={() => onAction("start", { bet: Number(blind) })} disabled={busy || readyCount < 2}>開始牌局</button></div><button className="leave-seat" onClick={() => onAction("leave")} disabled={busy}>取消並離桌</button></div> : <p className="casino-message">請選擇空位加入；至少兩名玩家準備後才能開局。</p>}
    <footer>標準 52 張牌 · 準備制 · 連續 6 個遊戲小時未下注會自動離座 · 輪流過牌、跟注、加注或棄牌 · 勝者取得獎池</footer>
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
  return { home: "有效租約或自有住宅才能進入，全天 24 小時開放。睡一覺能恢復體力與健康。", realtor: "營業時間 07:00～23:00。租屋每日 NT$350；城市小宅售價 NT$50,000。", bank: "營業時間 07:00～23:00。存款每個遊戲日收益 0.1%；一般貸款每日利息 0.5%；《浪子回頭》主線債務每日利息 0.2%。", business: "營業時間 06:00～24:00。第一階工作免能力門檻；各產業最高階時薪皆為 NT$1,300。", shopping: "營業時間 06:00～24:00。用合理的花費補充飽足，也能購買刮刮樂。", hotel: "全天 24 小時營業。旅店臨時工等待 30 秒、收入 NT$100，不扣體力、飽足或健康，也不會獲得職業經驗；住宿與餐點也全天供應。", casino: "全天 24 小時開放。21 點每局使用同一副洗好的牌依序抽取；德州撲克有完整四輪下注。", school: "開放時間 07:00～23:00。五所學院分別培養體力、智力、創造力、社交與魅力。", hospital: "健康低於 50 時，行動後開始有機率生病。急診 24 小時開放；一般診療為 07:00～23:00。" }[location];
}
