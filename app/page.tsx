"use client";

/* eslint-disable jsx-a11y/no-noninteractive-element-interactions -- modal backdrops intentionally close when the pointer lands outside the dialog. */
/* eslint-disable @next/next/no-img-element -- avatar images come from runtime Cloudflare asset URLs. */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ABILITY_LABELS, ABILITY_MAX, ACADEMIES, BANK_LOAN_RATE_BP, careerForCategory, careerRequirements, careerThresholdForCategory, careerWorkSpecialFor, careerWorkWaitSeconds, categoryInfo, crimeArrestChanceFor, crimeSentenceMinutesFor, financeDepositRateFor, financeLoanTermsFor, HACK_DAILY_LIMIT, HACK_MAX_STEAL, HACK_STEAL_RATE, HACK_SUCCESS_CHANCE, hospitalitySpecialHungerFor, JOB_CATEGORIES, jobInfo, medicalHospitalDiscountFor, medicalTreatmentFor, medicalWorkHealthBonusFor, meetsCareerRequirements, nextCareerForCategory, RESTAURANT_DAILY_NET, RESTAURANT_PURCHASE_PRICE, streetRankIndex, TERRITORY_DAILY_CAP, TERRITORY_VISIT_REWARD, WRITER_DAILY_FAN_RATE, WRITER_DAILY_WRITING_LIMIT, WRITER_MAX_ACTIVE_BOOKS, WRITER_MAX_PURCHASES_PER_BOOK, writerBookPriceFor, writerFanRangeFor, type Abilities } from "../shared/jobs";
import { CITY_EVENTS, PRODIGAL_SUCCESS_STORY, STORY_CHAPTERS, TALENTS } from "../shared/progression";
import { isHospitalRegularOpen, isLocationOpen, worldMinutes } from "../shared/world";
import { CAREER_PREVIEW_ROUTES } from "../shared/careerPreview";
import { HOME_CHORE_WAIT_SECONDS, HOME_COMFORT_LEVELS, HOME_COOK_COST, HOME_COOK_WAIT_SECONDS, HOME_DAILY_COOK_LIMIT, HOME_NAP_WAIT_SECONDS, homeComfort, homeCookHunger, homeSleepBenefits } from "../shared/housing";

type LocationId = "home" | "realtor" | "bank" | "business" | "shopping" | "bookstore" | "hotel" | "casino" | "school" | "hospital" | "underpass" | "prison";
type StatKey = "energy" | "health" | "hunger";

type Player = {
  cash: number;
  bankBalance: number;
  loanBalance: number;
  loanProviderName: string;
  loanRateBp: number | null;
  loanSpreadBp: number | null;
  dailyMinimumPayment: number;
  dailyPaymentMade: number;
  missedPaymentDays: number;
  gameOver: string;
  mainStory: string;
  energy: number;
  health: number;
  hunger: number;
  writerFans: number;
  writingUses: number;
  ownsRestaurant: boolean;
  prisonUntil: number;
  prisonCrime: string;
  territoryLocation: string;
  territoryDay: number;
  territoryPayoutDay: number;
  territoryVisits: number;
  territoryIncome: number;
  territoryPending: number;
  hackDay: number;
  hackUses: number;
  streetDay: number;
  streetScavenges: number;
  streetBegIncome: number;
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
  homeComfort: number;
  homeDay: number;
  homeCookUses: number;
  homeChoreDone: boolean;
  actionAvailableAt: number;
  actionLabel: string;
  elapsedMinutes: number;
  location: LocationId;
  talentExp: number;
  talentLevel: number;
  talentPoints: number;
  talents: string[];
  storyChapter: number;
  storySeenChapter: number;
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
  currentJob: string;
  jobCategory: string;
  updatedAt: number;
  avatarUrl: string | null;
  prisonCrime: string;
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

type MedicalRequest = {
  id: string;
  patientName: string;
  providerName: string;
  providerJob: string;
  healthGain: number;
  amount: number;
  expiresAt: number;
};

type LoanRequest = {
  id: string;
  borrowerName: string;
  providerName: string;
  providerJob: string;
  amount: number;
  interestRateBp: number;
  spreadBp: number;
  expiresAt: number;
};

type BegRequest = { id: string; requesterName: string; requesterJob: string; amounts: readonly number[]; expiresAt: number };
type StreetState = { items: Array<{ key: string; name: string; icon: string; quantity: number; sellPrice?: number; hunger?: number }>; scavengesUsed: number; scavengesMax: number; begIncome: number; begCap: number };
type AidBoxState = { cycleDay: number; dailyCap: number; boxes: Array<{ ownerId: string; ownerName: string; totalReceived: number; donated: boolean; isMine: boolean }> };
type CoopState = { cycleDay: number; status: string; reward: number; talentExp: number; eligibleRole: string; contributed: boolean; roles: Array<{ id: string; label: string; playerName: string }> };

type WriterBook = {
  id: string;
  authorId: string;
  authorName: string;
  title: string;
  price: number;
  status: "active" | "hidden";
  createdAt: number;
  updatedAt: number;
  salesCount: number;
  ownedCount: number;
  isMine: boolean;
};

type BookStoreState = {
  books: WriterBook[];
  maxActiveBooks: number;
  maxPurchasesPerBook: number;
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
  nextActionAt?: number;
  seats: Array<{ id: string; displayName: string; seatNo: number; status: string; bet: number; streetBet?: number; cards: string[]; result: string; isMine: boolean }>;
  hand: null | { cards: string[]; bet: number; streetBet?: number; seatNo: number | null; status: string; result: string; isTurn?: boolean };
};

type BingoState = {
  hostUserId?: string;
  entryFee?: number;
  capacity?: number;
  status: string;
  roundNo?: number;
  drawn: number[];
  preview: number[];
  nextDrawAt?: number;
  strategyUntil?: number;
  claimUntil?: number;
  winnerIds: string[];
  serverNow?: number;
  players: Array<{ id: string; displayName: string; card: number[]; isMine: boolean; swapped: boolean; claimed: boolean }>;
};
type DicePokerState = {
  hostUserId?: string;
  entryFee?: number;
  capacity?: number;
  status: string;
  roundNo?: number;
  deadlineAt?: number;
  serverNow?: number;
  players: Array<{ id: string; displayName: string; dice: number[]; held: number[]; rerollsLeft: number; status: string; result: string; isMine: boolean }>;
};
type TournamentState = {
  hostUserId?: string;
  entryFee?: number;
  capacity?: number;
  game?: string;
  status: string;
  tournamentNo?: number;
  currentRound?: number;
  roundLimit?: number;
  nextRoundAt?: number;
  latestResult?: string;
  round?: { roundNo: number; game: string; status: string; dealerCards: string[]; dealerScore: number | null; communityCards: string[]; street: string; currentBet: number; turnSeat: number; pot: number; nextActionAt: number } | null;
  hand?: { playerCards: string[]; holeCards: string[]; bet: number; streetBet: number; stack: number; status: string; result: string; isTurn: boolean } | null;
  players: Array<{ id: string; displayName: string; score: number; latestHand: string; cards: string[]; blackjackScore: number | null; status: string; bet: number; streetBet: number; stack: number; seatNo: number; isTurn: boolean; result: string; isMine: boolean }>;
};
type ReputationState = { factions: Array<{ faction: string; points: number; rank: string; bonusPercent: number }> };
type CommissionState = { cycleDay: number; commissions: Array<{ id: string; title: string; detail: string; location: LocationId; reward: number; faction: string; completed: boolean }> };
type MysteryState = { found: number; total: number; whispers: string[] };
type LifeContractState = { contracts: Array<{ id: string; status: string; partnerName: string; isCreator: boolean; targetPerPlayer: number; stake: number; mineDeposit: number; partnerDeposit: number; expiresDay: number }> };
type LifeLedgerState = { entries: Array<{ title: string; detail: string; tone: "good" | "neutral" | "warn"; gameTime: string }> };
type NpcResident = {
  id: string;
  name: string;
  role: string;
  portrait: string;
  accent: "amber" | "teal" | "blue" | "violet";
  available: boolean;
  schedule: string;
  absentText: string;
  status: string;
  relationLabel: string;
  interactedToday: boolean;
  lastOutcome: string;
  event: null | { id: string; title: string; prompt: string; choices: Array<{ id: string; label: string; detail: string }> };
};
type NpcState = { residents: NpcResident[]; dailyLimit: number; note: string };

type Bootstrap = {
  serverNow?: number;
  authenticated: boolean;
  profile: Profile | null;
  player: Player;
  room: { id: string; name: string };
  online: OnlinePlayer[];
  feed: FeedItem[];
  casino: CasinoState;
  poker: PokerState;
  bingo?: BingoState;
  dicePoker?: DicePokerState;
  tournament?: TournamentState;
  cityMemory?: CityMemory;
  transferRequests?: TransferRequest[];
  medicalRequests?: MedicalRequest[];
  loanRequests?: LoanRequest[];
  begRequests?: BegRequest[];
  street?: StreetState;
  aidBoxes?: AidBoxState;
  coop?: CoopState;
  reputation?: ReputationState;
  commissions?: CommissionState;
  mystery?: MysteryState;
  contracts?: LifeContractState;
  lifeLedger?: LifeLedgerState;
  bookStore?: BookStoreState;
  npcs?: NpcState;
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
  loanProviderName: "",
  loanRateBp: null,
  loanSpreadBp: null,
  dailyMinimumPayment: 0,
  dailyPaymentMade: 0,
  missedPaymentDays: 0,
  gameOver: "",
  mainStory: "legacy",
  energy: 100,
  health: 100,
  hunger: 80,
  writerFans: 0,
  writingUses: 0,
  ownsRestaurant: false,
  prisonUntil: 0,
  prisonCrime: "",
  territoryLocation: "",
  territoryDay: 0,
  territoryPayoutDay: 0,
  territoryVisits: 0,
  territoryIncome: 0,
  territoryPending: 0,
  hackDay: 0,
  hackUses: 0,
  streetDay: 0,
  streetScavenges: 0,
  streetBegIncome: 0,
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
  homeComfort: 0,
  homeDay: 0,
  homeCookUses: 0,
  homeChoreDone: false,
  actionAvailableAt: 0,
  actionLabel: "",
  elapsedMinutes: 0,
  location: "realtor",
  talentExp: 0,
  talentLevel: 0,
  talentPoints: 0,
  talents: [],
  storyChapter: 0,
  storySeenChapter: 0,
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

const locations: Array<{ id: LocationId; image?: string; name: string; caption: string; hours: string }> = [
  { id: "home", name: "我的住所", caption: "有有效租約或自有住宅後，才能在這裡休息", hours: "24 小時" },
  { id: "realtor", name: "安心房仲", caption: "城市小宅 NT$50,000，也可按天租屋", hours: "07:00～23:00" },
  { id: "bank", name: "城市銀行", caption: "存款收益依金融職位｜一般貸款 0.5%｜《浪子回頭》債務 0.2%", hours: "07:00～23:00" },
  { id: "business", name: "工作地", caption: "用時間換取收入，累積職涯經驗", hours: "06:00～24:00" },
  { id: "shopping", name: "購物街", caption: "補充飽足，偶爾也犒賞一下自己", hours: "06:00～24:00" },
  { id: "bookstore", name: "城市書店", caption: "閱讀與出版作品的地方", hours: "07:00～23:00" },
  { id: "hotel", name: "不夜旅店", caption: "沒有住所也能住宿，餐點較貴但全天供應", hours: "24 小時" },
  { id: "casino", image: "./casino-icon.png", name: "幸運賭場", caption: "最多五人同桌遊玩二十一點、德州撲克、賓果與錦標賽", hours: "24 小時" },
  { id: "school", name: "未來學院", caption: "投資自己，讓選擇越來越多", hours: "07:00～23:00" },
  { id: "hospital", name: "市立醫院", caption: "一般診療 07:00～23:00，急診全天開放", hours: "急診 24 小時" },
  { id: "underpass", name: "車站地下道", caption: "街頭生存、拾荒、乞討與互助箱", hours: "24 小時" },
  { id: "prison", name: "監獄", caption: "違法行為被捕後服刑的地方", hours: "24 小時" },
];

function LocationIcon({ id, prominent = false }: { id: Exclude<LocationId, "casino">; prominent?: boolean }) {
  const glyph = {
    home: <><path d="M3.5 10.8 12 4l8.5 6.8" /><path d="M5.7 9.4V20h12.6V9.4" /><path d="M9.6 20v-6.2h4.8V20" /></>,
    realtor: <><path d="m4 11 8-6.5 8 6.5" /><path d="M6.5 9.6V20h7.1" /><circle cx="16.4" cy="15.2" r="2.3" /><path d="m18 16.9 3 3m-1.3-1.3-1.2 1.2" /></>,
    bank: <><path d="M3 9h18L12 4 3 9Z" /><path d="M5 11v6m4-6v6m6-6v6m4-6v6" /><path d="M3 20h18M4 17h16" /></>,
    business: <><rect x="3.5" y="7.5" width="17" height="12" rx="2" /><path d="M9 7.5V5.2h6v2.3M3.5 12h17" /><path d="M10 11.2h4v2.2h-4z" /></>,
    shopping: <><path d="M5.2 9.2h13.6l-1 10.3H6.2L5.2 9.2Z" /><path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10" /><path d="M4 5h2.5M17.5 5H20" /></>,
    bookstore: <><path d="M3.5 5.5h5.2A3.3 3.3 0 0 1 12 8.8V20a3.3 3.3 0 0 0-3.3-3.3H3.5V5.5Z" /><path d="M20.5 5.5h-5.2A3.3 3.3 0 0 0 12 8.8V20a3.3 3.3 0 0 1 3.3-3.3h5.2V5.5Z" /></>,
    hotel: <><path d="M3.5 19V8.5M20.5 19v-7.2H8.2" /><path d="M3.5 15.5h17M7.8 11.8V9.5H4.2" /><path d="M17 4.2a3.2 3.2 0 1 0 2.8 4.8A3.8 3.8 0 0 1 17 4.2Z" /></>,
    school: <><path d="m3 9 9-4.5L21 9l-9 4.5L3 9Z" /><path d="M6.5 11v5.2c2.8 2.2 8.2 2.2 11 0V11M21 9v6" /></>,
    hospital: <><rect x="4" y="3.5" width="16" height="17" rx="3" /><path d="M9.5 8.2h5v3.1h3.1v5h-3.1v3.1h-5v-3.1H6.4v-5h3.1V8.2Z" /></>,
    underpass: <><path d="M3.5 20v-6.2a8.5 8.5 0 0 1 17 0V20" /><path d="M7 20v-6.1a5 5 0 0 1 10 0V20M2.5 20h19" /><path d="M9.2 17h5.6" /></>,
    prison: <><rect x="4" y="3.5" width="16" height="17" rx="2" /><path d="M8 3.5v17m4-17v17m4-17v17M4 9h16M4 15h16" /></>,
  }[id];

  return <span className={`location-glyph ${prominent ? "prominent" : ""}`} aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{glyph}</svg></span>;
}

const statMeta: Array<{ key: StatKey; icon: string; label: string }> = [
  { key: "health", icon: "+", label: "健康" },
  { key: "energy", icon: "↯", label: "體力" },
  { key: "hunger", icon: "△", label: "飽足" },
];

function MobileNavIcon({ name }: { name: "city" | "life" | "social" }) {
  if (name === "city") return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 19V8l8-4 8 4v11M8 19v-6h8v6M3 19h18" /></svg>;
  if (name === "life") return <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="8" r="3" /><path d="M5.5 20c.7-4 3-6 6.5-6s5.8 2 6.5 6M4 4h4M16 4h4" /></svg>;
  return <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="8" cy="9" r="3" /><circle cx="17" cy="8" r="2.5" /><path d="M2.5 20c.6-4 2.5-6 5.5-6s5 2 5.5 6M14 14c3.7 0 5.9 1.8 6.5 5" /></svg>;
}

const locationName = (id: LocationId) => locations.find((item) => item.id === id)?.name ?? id;
const formatMoney = (value: number) => new Intl.NumberFormat("zh-TW").format(value);
const currentWallClockMs = () => new Date().getTime();
const hasControlCharacters = (value: string) => Array.from(value).some((character) => {
  const codePoint = character.codePointAt(0) ?? 0;
  return codePoint < 32 || codePoint === 127;
});
const formatWaitMinutes = (value: number) => value < 1 ? `${Math.round(value * 60)} 秒` : value >= 60 && value % 60 === 0 ? `${value / 60} 分鐘` : `${value} 分鐘`;
const TOURNAMENT_STARTING_STACK = 100;
const levelProgress = (exp: number) => {
  return Math.min(100, Math.max(0, (exp / ABILITY_MAX) * 100));
};
const abilitiesFor = (player: Player): Abilities => ({
  physical: player.physicalExp,
  intelligence: player.intelligenceExp,
  creativity: player.creativityExp,
  social: player.socialExp,
  charisma: player.charismaExp,
});
const displayJobName = (job: string) => job === "unemployed" ? "待業者" : job;
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

function guestAction(current: Player, action: string, payload: Record<string, unknown>, nowMs = currentWallClockMs()) {
  const sharedMinutes = worldMinutes(nowMs);
  const next = { ...current };
  let title = "完成行動";
  let message = "行動完成。";
  let minutes = 0;
  const fail = (text: string) => ({ error: text });
  if (action === "move") {
    const target = payload.location as LocationId;
    if (!locations.some((item) => item.id === target) || target === next.location) return fail("你已經在這裡了。");
    if (target === "prison") return fail("監獄只接受被捕玩家進入。");
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
      next.cash -= amount; next.bankBalance += amount; title = "存入銀行"; message = `已存入 NT$${formatMoney(amount)}，每日收益 ${(financeDepositRateFor(next.currentJob) / 100).toFixed(2)}%。`;
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
  } else if (action === "restaurant") {
    if (payload.kind !== "buy") return fail("餐廳服務不存在。");
    if (next.location !== "business") return fail("請先前往工作地購買餐廳。");
    if (!isLocationOpen("business", sharedMinutes)) return fail("工作地營業時間為 06:00～24:00。");
    if (next.jobCategory !== "hospitality" || next.currentJob !== "餐廳老闆") return fail("只有餐廳老闆可以購買餐廳。");
    if (next.ownsRestaurant) return fail("你已經擁有一間餐廳。");
    if (next.cash < RESTAURANT_PURCHASE_PRICE) return fail(`購買餐廳需要 NT$${formatMoney(RESTAURANT_PURCHASE_PRICE)}。`);
    next.cash -= RESTAURANT_PURCHASE_PRICE; next.ownsRestaurant = true;
    title = "買下餐廳"; message = `支付 NT$${formatMoney(RESTAURANT_PURCHASE_PRICE)}，取得自有餐廳；從下一個在線遊玩日開始，每日結算淨收益 NT$${formatMoney(RESTAURANT_DAILY_NET)}。`;
  } else if (action === "work") {
    const hours = Number(payload.hours);
    const workSpecial = careerWorkSpecialFor(next.currentJob, hours);
    if (next.location !== "business" || (![1, 4, 8].includes(hours) && !workSpecial)) return fail("請先前往工作地。");
    if (!isLocationOpen("business", sharedMinutes)) return fail("工作地營業時間為 06:00～24:00。");
    if (next.illness) return fail(`目前罹患${next.illness}，請先前往醫院治療。`);
    if (next.jobCategory === "unfixed") return fail(`目前是${next.currentJob}，請先選擇一條產業路線。`);
    if (next.jobCategory === "literary") return fail("文學作家請使用每日寫作，不使用一般工作班次。");
    const restaurantOwner = next.jobCategory === "hospitality" && next.currentJob === "餐廳老闆" && next.ownsRestaurant;
    if (restaurantOwner && !workSpecial) return fail("自有餐廳已改為每日結算，請使用餐廳營運班。");
    if (next.energy < hours * 5) return fail("體力不足，先回家休息吧。");
    const previousCareer = careerForCategory(next.jobCategory, next.jobExp, next.currentJob, abilitiesFor(next));
    const income = hours * previousCareer.hourlyPay;
    const hungerGain = workSpecial && next.jobCategory === "hospitality" ? hospitalitySpecialHungerFor(next.currentJob) : 0;
    const effectiveIncome = restaurantOwner ? 0 : income;
    next.cash += effectiveIncome; next.energy = Math.max(0, next.energy - hours * 5); next.health = Math.max(0, Math.min(100, next.health - Math.ceil(hours / 2) + medicalWorkHealthBonusFor(next.currentJob))); next.hunger = Math.max(0, Math.min(100, next.hunger - hours * 2 + hungerGain)); next.jobExp += hours * 4; minutes = careerWorkWaitSeconds(next.currentJob, hours, next.talents.includes("workaholic_2"));
    const newCareer = careerForCategory(next.jobCategory, next.jobExp, next.currentJob, abilitiesFor(next));
    next.currentJob = newCareer.title;
    title = newCareer.title !== previousCareer.title ? `升遷為${newCareer.title}` : workSpecial ? `${workSpecial.name} ${hours} 小時` : `工作 ${hours} 小時`;
    const medicalHealthBonus = medicalWorkHealthBonusFor(previousCareer.title);
    const incomeMessage = restaurantOwner ? "餐廳收益每日結算" : `收入 +NT$${effectiveIncome}`;
    message = `${workSpecial ? `完成「${workSpecial.name}」` : `工作 ${hours} 小時`}：${incomeMessage}、工作經驗 +${hours * 4}${hungerGain ? `、飽足 +${hungerGain}` : ""}${medicalHealthBonus ? `、健康 +${medicalHealthBonus}` : ""}。${newCareer.title !== previousCareer.title ? `恭喜升遷為${newCareer.title}！` : ""}`;
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
    const meal = payload.kind === "rice" ? { name: "飯糰", price: 45, hunger: 20 } : { name: "便當", price: 100, hunger: 45 };
    if (next.cash < meal.price) return fail("現金不足。");
    next.cash -= meal.price; next.hunger = Math.min(100, next.hunger + meal.hunger); title = `享用${meal.name}`; message = `${meal.name}讓飽足 +${meal.hunger}。`;
  } else if (action === "scratch") {
    if (next.location !== "shopping") return fail("請先前往購物街購買刮刮樂。");
    if (!isLocationOpen("shopping", sharedMinutes)) return fail("購物街營業時間為 06:00～24:00。");
    if (next.cash < 100) return fail("購買刮刮樂需要 NT$100，目前現金不足。");
    next.cash -= 100; title = "刮刮樂試玩"; message = "訪客模式不發放隨機獎金；登入後可購買正式刮刮樂。";
  } else if (action === "sleep") {
    if (next.location !== "home") return fail("請先回到溫暖小屋。");
    if (!next.ownsHome && next.rentedUntil <= sharedMinutes) return fail("租約已到期，請先到房仲續租。");
    const sleep = homeSleepBenefits(next.homeComfort);
    next.energy = 100; next.health = Math.min(100, next.health + sleep.health); next.hunger = Math.max(0, next.hunger - 12); minutes = sleep.waitSeconds; title = "好好睡了一覺"; message = `體力完全恢復，健康 +${sleep.health}。`;
  } else if (action === "home") {
    if (next.location !== "home") return fail("請先回到我的住所。");
    if (!next.ownsHome && next.rentedUntil <= sharedMinutes) return fail("租約已到期，請先到房仲續租。");
    const playDay = Math.floor(next.elapsedMinutes / 1440) + 1;
    const cookUses = next.homeDay === playDay ? next.homeCookUses : 0;
    const choreDone = next.homeDay === playDay && next.homeChoreDone;
    next.homeDay = playDay;
    if (payload.kind === "nap") {
      next.energy = Math.min(100, next.energy + 35); next.health = Math.min(100, next.health + (next.homeComfort >= 1 ? 3 : 2)); next.hunger = Math.max(0, next.hunger - 4); minutes = HOME_NAP_WAIT_SECONDS;
      title = "在家小睡片刻"; message = `體力 +35、健康 +${next.homeComfort >= 1 ? 3 : 2}。`;
    } else if (payload.kind === "cook") {
      if (cookUses >= HOME_DAILY_COOK_LIMIT) return fail("今天已經在家料理兩次，明天再準備新餐點。");
      if (next.cash < HOME_COOK_COST) return fail(`居家料理需要 NT$${HOME_COOK_COST} 購買食材。`);
      const hunger = homeCookHunger(next.homeComfort);
      next.cash -= HOME_COOK_COST; next.hunger = Math.min(100, next.hunger + hunger); next.homeCookUses = cookUses + 1; minutes = HOME_COOK_WAIT_SECONDS;
      title = "完成居家料理"; message = `食材 NT$${HOME_COOK_COST}，飽足 +${hunger}；今天還可料理 ${HOME_DAILY_COOK_LIMIT - next.homeCookUses} 次。`;
    } else if (payload.kind === "chore") {
      if (choreDone) return fail("今天已經整理過住所了。");
      if (next.energy < 4) return fail("體力不足，先休息再整理住所。");
      next.energy -= 4; next.hunger = Math.max(0, next.hunger - 2); next.health = Math.min(100, next.health + 3); next.homeChoreDone = true; minutes = HOME_CHORE_WAIT_SECONDS;
      title = "整理好生活空間"; message = "體力 -4、飽足 -2、健康 +3；登入後還會獲得少量天賦經驗。";
    } else if (payload.kind === "upgrade") {
      if (!next.ownsHome) return fail("永久家具升級只適用自有住宅，租屋仍可使用基本住所功能。");
      const comfort = homeComfort(next.homeComfort);
      if (comfort.upgradeCost === null) return fail("住所已完成最高階舒適升級。");
      if (next.cash < comfort.upgradeCost) return fail(`升級住所需要 NT$${comfort.upgradeCost}。`);
      next.cash -= comfort.upgradeCost; next.homeComfort += 1;
      title = `住所升級：${homeComfort(next.homeComfort).name}`; message = homeComfort(next.homeComfort).description;
    } else return fail("住所活動不存在。");
  } else if (action.startsWith("casino_")) {
    return fail("登入帳號後才能加入最多五人的二十一點牌桌。");
  } else if (action === "hospital") {
    if (next.location !== "hospital") return fail("請先前往市立醫院。");
    if (payload.kind !== "emergency" && !((((sharedMinutes % 1440) + 1440) % 1440) >= 7 * 60 && (((sharedMinutes % 1440) + 1440) % 1440) < 23 * 60)) return fail("一般門診與完整治療時間為 07:00～23:00；急診 24 小時開放。");
    const careDiscount = 1 - medicalHospitalDiscountFor(next.currentJob);
    const care = payload.kind === "clinic"
      ? { name: "一般門診", price: Math.floor(600 * careDiscount), health: Math.min(100, next.health + 25), energy: Math.min(100, next.energy + 10), minutes: 15 }
      : payload.kind === "treatment"
        ? { name: "完整治療", price: Math.floor(1500 * careDiscount), health: Math.max(80, next.health), energy: Math.min(100, next.energy + 30), minutes: 30 }
        : { name: "急診治療", price: Math.floor(2500 * careDiscount), health: Math.max(70, next.health), energy: Math.min(100, next.energy + 20), minutes: 20 };
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
    if (action !== "sleep" && next.hunger <= 15) next.health = Math.max(0, next.health - 6);
    if (action !== "sleep" && next.energy <= 5) next.health = Math.max(0, next.health - 4);
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
    next.actionAvailableAt = nowMs + minutes * 1_000;
    next.actionLabel = title;
  }
  if (!next.ownsHome && next.rentedUntil <= next.elapsedMinutes && next.location === "home") {
    next.location = "realtor";
    message += " 租約已到期，你已回到房仲尋找住所。";
  }
  return { player: next, title, message };
}

export default function Home() {
  const [previewMode] = useState(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("preview") === "careers");
  return previewMode ? <CareerPreviewPage /> : <GameHome />;
}

function CareerPreviewPage() {
  const [selectedId, setSelectedId] = useState(CAREER_PREVIEW_ROUTES[0].id);
  const selected = CAREER_PREVIEW_ROUTES.find((route) => route.id === selectedId) ?? CAREER_PREVIEW_ROUTES[0];
  return <main className="career-preview-shell">
    <header className="career-preview-topbar">
      <a href="./" aria-label="返回人生 Online">人生 ONLINE <small>LIFE, ONE CHOICE AT A TIME.</small></a>
      <span>CAREER SYSTEM · TEST BUILD</span>
    </header>
    <section className="career-preview-hero">
      <div><span className="career-preview-kicker">PROTOTYPE / READ ONLY</span><h1>四條新職業路線</h1><p>先看升遷、能力與玩法方向。這一頁只展示設計，不會改變正式遊戲的職業、金錢或存檔。</p><div className="career-preview-note"><strong>測試版</strong><span>數值與解鎖條件仍可依你的意見調整</span></div></div>
      <div className="career-preview-count"><strong>04</strong><span>試作路線</span><small>每條路線 4 個階級</small></div>
    </section>
    <section className="career-preview-layout">
      <nav className="career-preview-route-list" aria-label="測試職業路線">
        <span className="career-preview-section-label">SELECT A PATH</span>
        {CAREER_PREVIEW_ROUTES.map((route) => <button type="button" className={selected.id === route.id ? "active" : ""} key={route.id} onClick={() => setSelectedId(route.id)}><b>{route.icon}</b><span><strong>{route.name}</strong><small>{route.subtitle}</small></span><i>→</i></button>)}
      </nav>
      <section className="career-preview-detail" aria-live="polite">
        <header><div className="career-preview-detail-title"><span>{selected.icon}</span><div><span className="career-preview-kicker">CAREER PATH / 0{CAREER_PREVIEW_ROUTES.indexOf(selected) + 1}</span><h2>{selected.name}</h2><p>{selected.summary}</p></div></div><div className="career-preview-abilities"><span>核心能力</span>{selected.abilities.map((ability) => <b key={ability}>{ABILITY_LABELS[ability]}</b>)}</div></header>
        <div className="career-preview-main">
          <section><div className="career-preview-section-heading"><span>RANK LADDER</span><small>升遷路線</small></div><div className="career-preview-ranks">{selected.ranks.map((rank, index) => <article key={rank.title} className={index === 0 ? "entry" : ""}><span>0{index + 1}</span><div><strong>{rank.title}</strong><small>{rank.requirements}</small><p>{rank.unlock}</p></div><em>{rank.income}</em></article>)}</div></section>
          <aside className="career-preview-side"><div className="career-preview-section-heading"><span>CORE LOOP</span><small>核心行動</small></div><ul>{selected.actions.map((action) => <li key={action}>{action}</li>)}</ul><div className="career-preview-balance"><span>平衡原則</span><p>{selected.balance}</p></div></aside>
        </div>
      </section>
    </section>
    <footer className="career-preview-footer"><span>職業系統測試版 · 尚未寫入正式遊戲</span><a href="./">返回正式遊戲</a></footer>
  </main>;
}

function GameHome() {
  const [player, setPlayer] = useState<Player>(INITIAL_PLAYER);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [online, setOnline] = useState<OnlinePlayer[]>([]);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [casino, setCasino] = useState<CasinoState>({ capacity: 5, activeCount: 0, seats: [], hand: null });
  const [poker, setPoker] = useState<PokerState>({ capacity: 5, activeCount: 0, seats: [], hand: null, communityCards: [], pot: 0 });
  const [bookStore, setBookStore] = useState<BookStoreState>({ books: [], maxActiveBooks: WRITER_MAX_ACTIVE_BOOKS, maxPurchasesPerBook: WRITER_MAX_PURCHASES_PER_BOOK });
  const [bingo, setBingo] = useState<BingoState>({ status: "lobby", drawn: [], preview: [], winnerIds: [], players: [] });
  const [dicePoker, setDicePoker] = useState<DicePokerState>({ status: "lobby", players: [] });
  const [tournament, setTournament] = useState<TournamentState>({ status: "lobby", players: [] });
  const [casinoGame, setCasinoGame] = useState<"blackjack" | "poker" | "bingo" | "dice" | "tournament">("blackjack");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [jobOpen, setJobOpen] = useState(false);
  const [territoryOpen, setTerritoryOpen] = useState(false);
  const [territorySelection, setTerritorySelection] = useState<LocationId>("business");
  const [talentOpen, setTalentOpen] = useState(false);
  const [cityMemory, setCityMemory] = useState<CityMemory>(EMPTY_CITY_MEMORY);
  const [scratchResult, setScratchResult] = useState<{ price: number; prize: number } | null>(null);
  const [enlargedPlayer, setEnlargedPlayer] = useState<OnlinePlayer | null>(null);
  const [transferRequests, setTransferRequests] = useState<TransferRequest[]>([]);
  const [medicalRequests, setMedicalRequests] = useState<MedicalRequest[]>([]);
  const [loanRequests, setLoanRequests] = useState<LoanRequest[]>([]);
  const [begRequests, setBegRequests] = useState<BegRequest[]>([]);
  const [street, setStreet] = useState<StreetState>({ items: [], scavengesUsed: 0, scavengesMax: 4, begIncome: 0, begCap: 500 });
  const [aidBoxes, setAidBoxes] = useState<AidBoxState>({ cycleDay: 1, dailyCap: 2_000, boxes: [] });
  const [coop, setCoop] = useState<CoopState>({ cycleDay: 1, status: "open", reward: 600, talentExp: 8, eligibleRole: "", contributed: false, roles: [] });
  const [reputation, setReputation] = useState<ReputationState>({ factions: [] });
  const [commissions, setCommissions] = useState<CommissionState>({ cycleDay: 1, commissions: [] });
  const [mystery, setMystery] = useState<MysteryState>({ found: 0, total: 7, whispers: [] });
  const [contracts, setContracts] = useState<LifeContractState>({ contracts: [] });
  const [lifeLedger, setLifeLedger] = useState<LifeLedgerState>({ entries: [] });
  const [npcs, setNpcs] = useState<NpcState>({ residents: [], dailyLimit: 1, note: "登入後即可認識城市居民。" });
  const [npcDialogId, setNpcDialogId] = useState<string | null>(null);
  const closeNpcDialog = useCallback(() => setNpcDialogId(null), []);
  const [mobileView, setMobileView] = useState<"city" | "life" | "social">("city");
  const [socialView, setSocialView] = useState<"players" | "tasks" | "records">("players");
  const [transferTarget, setTransferTarget] = useState<{ player: OnlinePlayer; kind: "gift" | "scam" } | null>(null);
  const [transferAmount, setTransferAmount] = useState("");
  const [loanTarget, setLoanTarget] = useState<OnlinePlayer | null>(null);
  const [loanAmount, setLoanAmount] = useState("10000");
  const [jobCategory, setJobCategory] = useState<string>(JOB_CATEGORIES[0].id);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authError, setAuthError] = useState("");
  const [nameOpen, setNameOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [nameError, setNameError] = useState("");
  const [bookTitle, setBookTitle] = useState("");
  const [notice, setNotice] = useState("正在連接人生世界……");
  const [serverTimeOffsetMs, setServerTimeOffsetMs] = useState(0);
  const [sharedMinutes, setSharedMinutes] = useState(worldMinutes());
  const [displayElapsedMinutes, setDisplayElapsedMinutes] = useState(INITIAL_PLAYER.elapsedMinutes);
  const lastSyncedElapsedRef = useRef(INITIAL_PLAYER.elapsedMinutes);
  const syncPlayer = useCallback((nextPlayer: Player, resetClock = false) => {
    const serverClockAdvanced = nextPlayer.elapsedMinutes !== lastSyncedElapsedRef.current;
    lastSyncedElapsedRef.current = nextPlayer.elapsedMinutes;
    setPlayer(nextPlayer);
    setDisplayElapsedMinutes((displayedMinutes) => resetClock || serverClockAdvanced ? nextPlayer.elapsedMinutes : Math.max(displayedMinutes, nextPlayer.elapsedMinutes));
  }, []);
  const gameClock = useMemo(() => clock(sharedMinutes), [sharedMinutes]);
  const playClock = useMemo(() => clock(displayElapsedMinutes), [displayElapsedMinutes]);
  const currentLocation = locations.find((item) => item.id === player.location)!;
  const playerAbilities = abilitiesFor(player);
  const career = careerForCategory(player.jobCategory, player.jobExp, player.currentJob, playerAbilities);
  const nextCareer = nextCareerForCategory(player.jobCategory, player.jobExp, player.currentJob, playerAbilities);
  const nextCareerTitle = nextCareer?.title ?? "職涯最高階級";
  const careerProgress = nextCareer ? Math.max(0, Math.min(100, ((player.jobExp - career.threshold) / (nextCareer.threshold - career.threshold)) * 100)) : 100;
  const avatarSrc = profile?.avatarUrl ? `${API_ORIGIN}${profile.avatarUrl}` : "";
  const rentalMinutesLeft = Math.max(0, player.rentedUntil - displayElapsedMinutes);
  const rentalDaysLeft = rentalMinutesLeft ? Math.ceil(rentalMinutesLeft / 1440) : 0;
  const housingLabel = player.ownsHome ? "自有住宅 · 城市小宅" : rentalDaysLeft ? `租屋 · ${player.rentalName}（剩 ${rentalDaysLeft} 天）` : "目前沒有住所";
  const playerPlayDay = Math.floor(displayElapsedMinutes / 1440) + 1;
  const homeCookUses = player.homeDay === playerPlayDay ? player.homeCookUses : 0;
  const homeChoreDone = player.homeDay === playerPlayDay && player.homeChoreDone;
  const currentHomeComfort = homeComfort(player.homeComfort);
  const nextHomeComfort = HOME_COMFORT_LEVELS[player.homeComfort + 1] ?? null;
  const homeSleep = homeSleepBenefits(player.homeComfort);
  const homeCookGain = homeCookHunger(player.homeComfort);
  const selectedJobCategory = JOB_CATEGORIES.find((category) => category.id === jobCategory) ?? JOB_CATEGORIES[0];
  const workSpecial = careerWorkSpecialFor(player.currentJob);
  const medicalWorkHealth = medicalWorkHealthBonusFor(player.currentJob);
  const medicalWorkLabel = medicalWorkHealth ? ` · 工作後健康 +${medicalWorkHealth}` : "";
  const workWaitMinutes = (hours: number) => careerWorkWaitSeconds(player.currentJob, hours, player.talents.includes("workaholic_2")) / 60;
  const longWorkMinutes = workWaitMinutes(8);
  const longWorkTitle = workSpecial?.hours === 8 ? `${workSpecial.name} 8 小時` : "長班 8 小時";
  const longWorkButton = workSpecial?.hours === 8 ? `開始${workSpecial.name}` : "開始工作";
  const isWriter = player.jobCategory === "literary";
  const isStreet = player.jobCategory === "street";
  const isRestaurantOwner = player.jobCategory === "hospitality" && player.currentJob === "餐廳老闆";
  const hasRestaurant = isRestaurantOwner && player.ownsRestaurant;
  const isCrime = player.jobCategory === "crime";
  const isPrisoner = player.location === "prison" && player.prisonUntil > player.elapsedMinutes;
  const prisonHoursLeft = Math.max(0, Math.ceil((player.prisonUntil - player.elapsedMinutes) / 60));
  const isTerritoryOwner = isCrime && player.currentJob === "大橋頭營運長";
  const territoryLabel = locations.find((item) => item.id === player.territoryLocation)?.name ?? player.territoryLocation;
  const crimeRisk = isCrime ? Math.round(crimeArrestChanceFor(player.currentJob) * 100) : 0;
  const crimeSentence = isCrime ? Math.ceil(crimeSentenceMinutesFor(player.currentJob) / 60) : 0;
  const restaurantSpecialHunger = hospitalitySpecialHungerFor(player.currentJob);
  const writerRange = writerFanRangeFor(player.currentJob);
  const writerWritesLeft = Math.max(0, WRITER_DAILY_WRITING_LIMIT - player.writingUses);
  const realtorOpen = isLocationOpen("realtor", sharedMinutes);
  const bankOpen = isLocationOpen("bank", sharedMinutes);
  const businessOpen = isLocationOpen("business", sharedMinutes);
  const shoppingOpen = isLocationOpen("shopping", sharedMinutes);
  const bookstoreOpen = isLocationOpen("bookstore", sharedMinutes);
  const schoolOpen = isLocationOpen("school", sharedMinutes);
  const hospitalRegularOpen = isHospitalRegularOpen(sharedMinutes);
  const medicalHospitalDiscount = medicalHospitalDiscountFor(player.currentJob);
  const cityHospitalDiscount = cityMemory.state.name === "健康警報" ? 0.2 : 0;
  const effectiveHospitalDiscount = Math.max(medicalHospitalDiscount, cityHospitalDiscount);
  const dailyRent = player.talents.includes("rent_master") ? 315 : 350;
  const mealDiscount = player.talents.includes("frugal") ? 0.9 : 1;
  const mealPrice = (basePrice: number) => Math.floor(basePrice * mealDiscount);
  const mealDiscountLabel = mealDiscount < 1 ? " · 精打細算 9 折" : "";
  const authoritativeNow = currentWallClockMs() + serverTimeOffsetMs;
  const actionSecondsLeft = Math.max(0, Math.ceil((player.actionAvailableAt - authoritativeNow) / 1000));
  const actionLocked = actionSecondsLeft > 0;
  const actionBusy = busy || actionLocked;
  const pendingCityEvent = CITY_EVENTS.find((event) => event.id === player.pendingEvent);
  const nextStoryChapter = STORY_CHAPTERS[player.storyChapter];
  const nextStoryDebt = nextStoryChapter ? Math.round(250_000 * nextStoryChapter.remainingRatio) : 0;
  const storyProgress = Math.min(100, Math.max(0, ((250_000 - player.loanBalance) / 250_000) * 100));
  const pendingTransfer = transferRequests[0] ?? null;
  const pendingMedical = medicalRequests[0] ?? null;
  const pendingLoan = loanRequests[0] ?? null;
  const pendingBeg = begRequests[0] ?? null;
  const pendingContract = contracts.contracts.find((contract) => contract.status === "pending" && !contract.isCreator) ?? null;
  const selectedNpc = npcs.residents.find((resident) => resident.id === npcDialogId) ?? null;
  const unlockedStoryChapter = player.mainStory === "prodigal_return" && player.storyChapter > player.storySeenChapter
    ? STORY_CHAPTERS.find((chapter) => chapter.chapter === player.storyChapter) : null;

  const loadWorld = useCallback(async (quiet = false) => {
    try {
      const response = await fetch(`${API_ORIGIN}/api/game`, { headers: apiHeaders() });
      if (!response.ok) throw new Error("世界暫時無法連線");
      const data = await response.json() as Bootstrap;
      if (typeof data.serverNow === "number") setServerTimeOffsetMs(data.serverNow - currentWallClockMs());
      if (data.authenticated || !quiet) {
        syncPlayer(data.player, !quiet);
        setProfile(data.profile);
      }
      setOnline(data.online);
      setFeed(data.feed);
      setCasino(data.casino);
      if (data.poker) setPoker(data.poker);
      if (data.bingo) setBingo(data.bingo);
      if (data.dicePoker) setDicePoker(data.dicePoker);
      if (data.tournament) setTournament(data.tournament);
      if (data.bookStore) setBookStore(data.bookStore);
      if (data.cityMemory) setCityMemory(data.cityMemory);
      setTransferRequests(data.transferRequests ?? []);
      setMedicalRequests(data.medicalRequests ?? []);
      setLoanRequests(data.loanRequests ?? []);
      setBegRequests(data.begRequests ?? []);
      if (data.street) setStreet(data.street);
      if (data.aidBoxes) setAidBoxes(data.aidBoxes);
      if (data.coop) setCoop(data.coop);
      if (data.reputation) setReputation(data.reputation);
      if (data.commissions) setCommissions(data.commissions);
      if (data.mystery) setMystery(data.mystery);
      if (data.contracts) setContracts(data.contracts);
      if (data.lifeLedger) setLifeLedger(data.lifeLedger);
      if (data.npcs) setNpcs(data.npcs);
      if (!quiet) {
        setNotice(data.authenticated ? `歡迎回來，${data.profile?.displayName}。進度已同步。` : "目前是訪客試玩；登入後即可永久保存並加入多人世界。");
      }
    } catch {
      if (!quiet) setNotice("目前使用離線試玩模式；連線恢復後可重新同步。");
    } finally {
      setLoading(false);
    }
  }, [syncPlayer]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadWorld(); }, 0);
    return () => window.clearTimeout(timer);
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
    const updateClock = () => setSharedMinutes(worldMinutes(currentWallClockMs() + serverTimeOffsetMs));
    updateClock();
    const timer = window.setInterval(updateClock, 1_000);
    return () => window.clearInterval(timer);
  }, [serverTimeOffsetMs]);

  useEffect(() => {
    if (!profile) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") setDisplayElapsedMinutes((minutes) => minutes + 1);
    }, 1_000);
    return () => window.clearInterval(timer);
  }, [profile]);

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
    const canActDuringWait = ["move", "reset", "city_event", "bank", "job", "restaurant", "transfer_request", "transfer_response", "medical_request", "medical_response", "loan_request", "loan_response", "book_publish", "book_toggle", "book_buy", "beg_response", "inventory_use", "street_share_food", "aid_box_donate", "coop_contribute", "story_ack", "contract_create", "contract_accept", "contract_decline", "contract_deposit", "npc_interact"].includes(action)
      || action.startsWith("casino_") || action.startsWith("poker_") || action.startsWith("bingo_") || action.startsWith("dice_") || action.startsWith("tournament_");
    if (actionLocked && !canActDuringWait) {
      setNotice(`${player.actionLabel || "目前的行動"}尚未完成，請等待 ${actionSecondsLeft} 秒；期間可移動、換職、使用銀行、與 NPC 交談、處理玩家請求，或前往賭場遊玩。`);
      return;
    }
    setBusy(true);
    if (!profile) {
      const result = guestAction(player, action, payload, authoritativeNow);
      if ("error" in result) setNotice(result.error || "行動失敗。");
      else if (result.player) {
        syncPlayer(result.player, action === "reset");
        setNotice(`${result.message}（訪客進度不會儲存）`);
        const time = clock(result.player.elapsedMinutes).time;
        if (action !== "move") setFeed((items) => [{ id: crypto.randomUUID(), time, title: result.title || "完成行動", detail: result.message || "", tone: "neutral" as const }, ...items].slice(0, 6));
      }
      setBusy(false);
      return;
    }
    try {
      const response = await fetch(`${API_ORIGIN}${action.startsWith("casino_") ? "/api/casino/action" : action.startsWith("poker_") ? "/api/poker/action" : action.startsWith("bingo_") ? "/api/bingo/action" : action.startsWith("dice_") ? "/api/dice-poker/action" : action.startsWith("tournament_") ? "/api/tournament/action" : "/api/game/action"}`, {
        method: "POST",
        headers: apiHeaders(true),
        body: JSON.stringify({ action: action.startsWith("casino_") ? action.slice(7) : action.startsWith("poker_") ? action.slice(6) : action.startsWith("bingo_") ? action.slice(6) : action.startsWith("dice_") ? action.slice(5) : action.startsWith("tournament_") ? action.slice(11) : action, ...payload }),
      });
      const data = await response.json() as { serverNow?: number; player?: Player; online?: OnlinePlayer[]; feed?: FeedItem[]; casino?: CasinoState; poker?: PokerState; bingo?: BingoState; dicePoker?: DicePokerState; tournament?: TournamentState; bookStore?: BookStoreState; cityMemory?: CityMemory; transferRequests?: TransferRequest[]; medicalRequests?: MedicalRequest[]; loanRequests?: LoanRequest[]; begRequests?: BegRequest[]; street?: StreetState; aidBoxes?: AidBoxState; coop?: CoopState; reputation?: ReputationState; commissions?: CommissionState; mystery?: MysteryState; contracts?: LifeContractState; lifeLedger?: LifeLedgerState; npcs?: NpcState; scratch?: { price: number; prize: number } | null; message?: string };
      if (typeof data.serverNow === "number") setServerTimeOffsetMs(data.serverNow - currentWallClockMs());
      if (!response.ok || !data.player) throw new Error(data.message || "行動失敗");
      syncPlayer(data.player, action === "reset");
      if (data.online) setOnline(data.online);
      if (data.feed) setFeed(data.feed);
      if (data.casino) setCasino(data.casino);
      if (data.poker) setPoker(data.poker);
      if (data.bingo) setBingo(data.bingo);
      if (data.dicePoker) setDicePoker(data.dicePoker);
      if (data.tournament) setTournament(data.tournament);
      if (data.bookStore) setBookStore(data.bookStore);
      if (data.cityMemory) setCityMemory(data.cityMemory);
      if (data.transferRequests) setTransferRequests(data.transferRequests);
      if (data.medicalRequests) setMedicalRequests(data.medicalRequests);
      if (data.loanRequests) setLoanRequests(data.loanRequests);
      if (data.begRequests) setBegRequests(data.begRequests);
      if (data.street) setStreet(data.street);
      if (data.aidBoxes) setAidBoxes(data.aidBoxes);
      if (data.coop) setCoop(data.coop);
      if (data.reputation) setReputation(data.reputation);
      if (data.commissions) setCommissions(data.commissions);
      if (data.mystery) setMystery(data.mystery);
      if (data.contracts) setContracts(data.contracts);
      if (data.lifeLedger) setLifeLedger(data.lifeLedger);
      if (data.npcs) setNpcs(data.npcs);
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

  function requestMedicalTreatment(playerTarget: OnlinePlayer) {
    const service = medicalTreatmentFor(playerTarget.currentJob);
    if (!profile || !service || playerTarget.id === profile.id || player.health >= 100) return;
    void act("medical_request", { targetId: playerTarget.id });
  }

  function openLoanRequest(playerTarget: OnlinePlayer) {
    if (!profile || playerTarget.id === profile.id || !financeLoanTermsFor(playerTarget.currentJob) || player.loanBalance > 0) return;
    setLoanTarget(playerTarget);
    setLoanAmount("10000");
  }

  async function submitLoanRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!loanTarget) return;
    const amount = Number(loanAmount);
    if (!Number.isSafeInteger(amount) || amount < 1 || amount > 50_000 || player.loanBalance > 0) {
      setNotice("玩家貸款金額需為 NT$1～NT$50,000，且目前不能已有貸款。");
      return;
    }
    await act("loan_request", { targetId: loanTarget.id, amount });
    setLoanTarget(null);
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
    if (displayName.length < 2 || displayName.length > 24 || hasControlCharacters(displayName)) {
      setNameError("玩家名字需為 2～24 個字元，不能是空白或控制字元。");
      return;
    }
    setBusy(true); setNameError("");
    try {
      const response = await fetch(`${API_ORIGIN}/api/profile/name`, { method: "POST", headers: apiHeaders(true), body: JSON.stringify({ displayName }) });
      const data = await response.json() as { profile?: Profile; player?: Player; message?: string };
      if (!response.ok || !data.profile || !data.player) throw new Error(data.message || "玩家名字更新失敗。");
      setProfile(data.profile);
      syncPlayer(data.player);
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
    setProfile(null); setNameOpen(false); setOnline([]); setFeed([]); setTransferRequests([]); setMedicalRequests([]); setLoanRequests([]); setTransferTarget(null); setLoanTarget(null); setNpcDialogId(null); setNpcs({ residents: [], dailyLimit: 1, note: "登入後即可認識城市居民。" }); setBookTitle(""); setBookStore({ books: [], maxActiveBooks: WRITER_MAX_ACTIVE_BOOKS, maxPurchasesPerBook: WRITER_MAX_PURCHASES_PER_BOOK }); setCasino({ capacity: 5, activeCount: 0, seats: [], hand: null }); syncPlayer(INITIAL_PLAYER, true);
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
      <a className="skip-link" href="#city-actions">跳到城市行動</a>
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

      <div className={`game-grid view-${mobileView}`} id="main-game" aria-busy={loading || busy}>
        <aside className="character-panel panel">
          <div className="panel-kicker">我的人生 · {profile ? "已連線" : "訪客"}</div>
          <div className="identity">
            <div className={`avatar ${avatarSrc ? "has-photo" : ""}`}>
              {avatarSrc ? <img src={avatarSrc} alt={`${profile?.displayName}的大頭貼`} /> : (profile?.displayName.slice(0, 1) ?? "旅")}
              {profile && <label className="avatar-upload" title="上傳自己的照片">換照片<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void uploadAvatar(event)} disabled={busy} /></label>}
            </div>
            <div><h1>{profile?.displayName ?? "旅行者"}</h1><span className="job-tag">{career.title}</span>{player.mainStory === "prodigal_return" && <span className="story-tag">主線 · 浪子回頭</span>}</div>
          </div>
          <div className="cash-card"><span>資產概況</span><strong><small>手上 NT$</small>{formatMoney(player.cash)}</strong><div className="cash-breakdown"><p><span>銀行存款</span><b>NT${formatMoney(player.bankBalance)}</b></p><p className={player.loanBalance ? "debt" : ""}><span>貸款餘額</span><b>NT${formatMoney(player.loanBalance)}</b></p></div><small>{profile ? "伺服器已安全保存" : "訪客模式暫存"}</small></div>
          {player.mainStory === "prodigal_return" && player.loanBalance > 0 && <div className={`debt-deadline ${player.missedPaymentDays ? "warning" : ""}`}><span>本日最低繳款</span><strong>NT${formatMoney(player.dailyMinimumPayment)}</strong><small>已繳 NT${formatMoney(player.dailyPaymentMade)} · 尚欠 NT${formatMoney(Math.max(0, player.dailyMinimumPayment - player.dailyPaymentMade))} · 連續欠繳 {player.missedPaymentDays}/2 天</small></div>}
          <div className="career-card">
             <div><span>目前職業</span><strong>{career.title}</strong></div><small>{isCrime ? `違法行動被捕機率 ${crimeRisk}% · 服刑 ${crimeSentence} 小時` : isStreet ? `今日乞討 NT$${formatMoney(street.begIncome)} / NT$${formatMoney(street.begCap)} · 無固定薪資` : isWriter ? `粉絲 ${formatMoney(player.writerFans)} · 每日收益約 NT$${formatMoney(player.writerFans * WRITER_DAILY_FAN_RATE)}` : hasRestaurant ? `每日結算淨收益 NT$${formatMoney(RESTAURANT_DAILY_NET)}` : `時薪 NT$${formatMoney(career.hourlyPay)}`}</small>
            <div className="career-track"><i style={{ width: `${careerProgress}%` }} /></div>
            <p>{isWriter && nextCareer ? `升遷為${nextCareerTitle}：還需 ${Math.max(0, nextCareer.threshold - player.writerFans)} 位粉絲` : isWriter ? "已達文學作家最高職位" : hasRestaurant ? "餐廳已啟用每日結算，改職後收益暫停" : nextCareer && player.jobCategory !== "unfixed" ? `升遷為${nextCareerTitle}：${Math.max(0, nextCareer.threshold - player.jobExp)} EXP，${formatRequirements(nextCareer.requirements)}` : player.jobCategory === "unfixed" ? "前往工作地選擇產業路線" : "已達此產業最高職位"}</p>
          </div>
          {player.illness && <div className="illness-alert"><strong>目前生病：{player.illness}</strong><span>工作與上課暫停，請前往市立醫院。</span></div>}
          <div className="stat-list">
            {statMeta.map((item) => <div className="stat-row" key={item.key}><span className="stat-label"><span>{item.icon}</span>{item.label}</span><div className="stat-track"><i style={{ width: `${Math.min(100, player[item.key] / (item.key === "energy" && player.talents.includes("strong_body") ? 120 : 100) * 100)}%` }} /></div><strong>{player[item.key]}</strong></div>)}
          </div>
          <details className="life-details">
            <summary><span>更多人生資料</span><small>住所、天賦與能力</small></summary>
            <div className="life-details-content">
              <div className={`housing-card ${!player.ownsHome && !rentalDaysLeft ? "homeless" : ""}`}><span>居住狀態</span><strong>{housingLabel}</strong><small>{player.ownsHome ? "永久住所" : rentalDaysLeft ? `剩餘 ${Math.floor(rentalMinutesLeft / 60)} 小時 ${Math.floor(rentalMinutesLeft % 60)} 分 · 僅在線時計時` : "請前往安心房仲"}</small></div>
              {player.ownsRestaurant && <div className="restaurant-card"><span>事業資產</span><strong>自有餐廳</strong><small>{isRestaurantOwner ? `每日在線結算淨收益 NT$${formatMoney(RESTAURANT_DAILY_NET)}` : "目前更換職業，餐廳收益暫停"}</small></div>}
              {isWriter && <div className="writer-summary"><span>文學作家資料</span><strong>今日還可寫作 {writerWritesLeft} 次</strong><small>{writerRange ? `每次隨機增加 ${writerRange[0]}～${writerRange[1]} 位粉絲` : "粉絲持續累積中"}</small></div>}
              <button className="talent-summary" type="button" onClick={() => setTalentOpen(true)} disabled={!profile}><span>天賦等級 {player.talentLevel}</span><strong>{player.talentPoints} 點可配置</strong><small>{player.talentExp % 100} / 100 天賦經驗 · 查看天賦樹</small></button>
              <div className="skills-block"><div className="section-heading"><span>能力履歷</span><small>能力值 / 上限 {ABILITY_MAX}</small></div><Skill name="體力" exp={player.physicalExp} /><Skill name="智力" exp={player.intelligenceExp} /><Skill name="創造力" exp={player.creativityExp} /><Skill name="社交" exp={player.socialExp} /><Skill name="魅力" exp={player.charismaExp} /></div>
            </div>
          </details>
        </aside>

        <section className="world-panel panel">
          <div className="location-header"><div><p>目前位置</p><h2>{currentLocation.image ? <img className="location-photo" src={currentLocation.image} alt="" /> : <LocationIcon id={currentLocation.id as Exclude<LocationId, "casino">} prominent />}{currentLocation.name}</h2><small>{currentLocation.caption} · {currentLocation.hours}</small></div>{player.location === "business" ? <div className="location-career-progress"><span>升遷進度</span><strong>{player.jobCategory === "unfixed" ? "尚未選擇產業" : nextCareer ? `下一階：${nextCareerTitle}` : "已達產業最高職位"}</strong><div><i style={{ width: `${player.jobCategory === "unfixed" ? 0 : careerProgress}%` }} /></div><small>{player.jobCategory === "unfixed" ? "請從下方「找工作」選擇產業路線" : isWriter ? `粉絲數：${player.writerFans} / ${nextCareer?.threshold ?? player.writerFans}` : nextCareer ? `職業經驗：${player.jobExp} / ${nextCareer.threshold} EXP` : `目前累積 ${player.jobExp} EXP`}</small><small>{isWriter ? `每日寫作最多 ${WRITER_DAILY_WRITING_LIMIT} 次；升遷只看粉絲數` : nextCareer && player.jobCategory !== "unfixed" ? `能力要求：${formatRequirements(nextCareer.requirements) || "無"}` : player.jobCategory === "unfixed" ? "入行第一階免能力門檻" : "能力與經驗均已達標"}</small></div> : null}</div>
          <nav className="location-strip" aria-label="城市地點">
            {locations.map((item) => <button className={`${item.id === player.location ? "active" : ""} ${!isLocationOpen(item.id, sharedMinutes) ? "closed" : ""}`} key={item.id} onClick={() => void act("move", { location: item.id })} disabled={busy || (item.id === "prison" && player.location !== "prison")}>{item.image ? <img className="location-photo" src={item.image} alt="" /> : <LocationIcon id={item.id as Exclude<LocationId, "casino">} />}<small>{item.name}</small><em>{item.id === "prison" && player.location !== "prison" ? "僅限服刑" : isLocationOpen(item.id, sharedMinutes) ? item.hours : "已關門"}</em></button>)}
          </nav>
          <div className="action-stage" id="city-actions">
            <div className="action-intro"><h3>{actionTitle(player.location)}</h3><p>{actionLocked ? `${player.actionLabel || "目前的行動"}進行中，剩餘 ${actionSecondsLeft} 秒。等待期間仍可移動、換職、使用銀行、與 NPC 交談或前往賭場。` : actionDescription(player.location, dailyRent)}</p></div>
            {npcs.residents.length > 0 && <NpcResidents state={npcs} signedIn={Boolean(profile)} busy={busy} onTalk={(npcId) => setNpcDialogId(npcId)} />}
            <div className="action-cards">
              {player.location === "home" && <>
                <div className="home-status-card"><div><span>住所舒適度 {player.homeComfort}/3</span><strong>{currentHomeComfort.name}</strong><small>{currentHomeComfort.description}</small></div><div className="home-comfort-track" aria-label={`住所舒適度 ${player.homeComfort} / 3`}><i style={{ width: `${player.homeComfort / 3 * 100}%` }} /></div><em>今日料理 {homeCookUses}/{HOME_DAILY_COOK_LIMIT} · 整理 {homeChoreDone ? "已完成" : "未完成"}</em></div>
                <ActionCard icon="休" title="短暫小睡" meta={`現實等待 ${HOME_NAP_WAIT_SECONDS} 秒 · 體力 +35 · 健康 +${player.homeComfort >= 1 ? 3 : 2} · 飽足 -4`} button="小睡一下" onClick={() => void act("home", { kind: "nap" })} featured disabled={actionBusy} />
                <ActionCard icon="☾" title="完整睡眠" meta={`現實等待 ${homeSleep.waitSeconds} 秒 · 體力全滿 · 健康 +${homeSleep.health} · 飽足 -12`} button="好好休息" onClick={() => void act("sleep")} disabled={actionBusy} />
                <ActionCard icon="煮" title="居家料理" meta={`食材 NT$${HOME_COOK_COST} · 現實等待 ${HOME_COOK_WAIT_SECONDS} 秒 · 飽足 +${homeCookGain} · 每日 ${HOME_DAILY_COOK_LIMIT} 次`} button={homeCookUses >= HOME_DAILY_COOK_LIMIT ? "今日已料理完" : "準備餐點"} onClick={() => void act("home", { kind: "cook" })} disabled={actionBusy || homeCookUses >= HOME_DAILY_COOK_LIMIT || player.cash < HOME_COOK_COST} disabledLabel={homeCookUses >= HOME_DAILY_COOK_LIMIT ? "明日再料理" : player.cash < HOME_COOK_COST ? "食材費不足" : undefined} />
                <ActionCard icon="整" title="整理生活空間" meta={`每日一次 · 現實等待 ${HOME_CHORE_WAIT_SECONDS} 秒 · 體力 -4 · 飽足 -2 · 健康 +3 · 天賦經驗 +2`} button={homeChoreDone ? "今日已整理" : "開始整理"} onClick={() => void act("home", { kind: "chore" })} disabled={actionBusy || homeChoreDone || player.energy < 4} disabledLabel={homeChoreDone ? "明日再整理" : player.energy < 4 ? "體力不足" : undefined} />
                <ActionCard icon="家" title={nextHomeComfort ? `升級為${nextHomeComfort.name}` : "住所已達最高舒適度"} meta={nextHomeComfort ? `永久升級 NT$${formatMoney(currentHomeComfort.upgradeCost ?? 0)} · ${nextHomeComfort.description}` : "舒適寢具、家用廚房與安心小窩效果全部啟用"} button={!player.ownsHome ? "自有住宅才能升級" : nextHomeComfort ? "升級住所" : "已完成升級"} onClick={() => void act("home", { kind: "upgrade" })} disabled={actionBusy || !player.ownsHome || !nextHomeComfort || player.cash < (currentHomeComfort.upgradeCost ?? 0)} disabledLabel={!player.ownsHome ? "購屋後開放" : !nextHomeComfort ? "最高等級" : player.cash < (currentHomeComfort.upgradeCost ?? 0) ? "現金不足" : undefined} />
              </>}
              {player.location === "prison" && isPrisoner && <ActionCard icon="▥" title="監獄服刑中" meta={`罪名：${player.prisonCrime || "違法行為"} · 剩餘在線遊玩約 ${prisonHoursLeft} 小時 · 其他玩家可查看紀錄`} button="等待服刑結束" onClick={() => undefined} disabled />}
              {player.location === "realtor" && <><ActionCard icon="01" title="城市小套房 · 1 天" meta={`每日 NT$${formatMoney(dailyRent)} · 租金 NT$${formatMoney(dailyRent)}${dailyRent < 350 ? " · 租屋高手 9 折" : ""}`} button="租 1 天" onClick={() => void act("housing", { kind: "rent", days: 1 })} disabled={actionBusy || !realtorOpen} disabledLabel={!realtorOpen ? "已關門" : undefined} /><ActionCard icon="07" title="城市小套房 · 7 天" meta={`每日 NT$${formatMoney(dailyRent)} · 租金 NT$${formatMoney(dailyRent * 7)}${dailyRent < 350 ? " · 租屋高手 9 折" : ""}`} button="租 7 天" onClick={() => void act("housing", { kind: "rent", days: 7 })} featured disabled={actionBusy || !realtorOpen} disabledLabel={!realtorOpen ? "已關門" : undefined} /><ActionCard icon="買" title="購買城市小宅" meta="NT$50,000 · 永久住所 · 買房後仍可查看租屋" button={player.ownsHome ? "已擁有，仍可看租屋" : "購買房屋"} onClick={() => void act("housing", { kind: "buy" })} disabled={actionBusy || !realtorOpen} disabledLabel={!realtorOpen ? "已關門" : undefined} /></>}
              {player.location === "bank" && <BankPanel player={player} busy={busy || !bankOpen} closed={!bankOpen} onAction={(kind, amount) => void act("bank", { kind, amount })} />}
              {player.location === "business" && <>
                <ActionCard icon="職" title="找工作" meta="第一階工作免能力門檻 · 產業路線 · 任何職位都能換職" button="打開產業列表" onClick={() => setJobOpen(true)} featured disabled={busy || !businessOpen} disabledLabel={!businessOpen ? "已關門" : undefined} />
                {isTerritoryOwner && <ActionCard icon="地" title={player.territoryLocation ? `大橋頭地盤 · ${territoryLabel}` : "設定大橋頭地盤"} meta={player.territoryLocation ? `今日進入 ${player.territoryVisits} 次 · 已累積 NT$${formatMoney(player.territoryIncome)} · 待結算 NT$${formatMoney(player.territoryPending)}` : `選擇一個地點 · 每次進入紀錄 NT$${formatMoney(TERRITORY_VISIT_REWARD)} · 每日上限 NT$${formatMoney(TERRITORY_DAILY_CAP)}`} button={player.territoryLocation ? "更換地盤" : "選擇地盤"} onClick={() => { setTerritorySelection((player.territoryLocation as LocationId) || "business"); setTerritoryOpen(true); }} featured disabled={actionBusy || !businessOpen} disabledLabel={!businessOpen ? "已關門" : undefined} />}
                {isStreet ? <ActionCard icon="隧" title="街頭生存沒有固定班次" meta="拾荒、乞討、分享食物與互助箱都在車站地下道進行" button="前往車站地下道" onClick={() => void act("move", { location: "underpass" })} featured disabled={busy} /> : isWriter ? <>
                  <ActionCard icon="文" title={`今日寫作 · ${writerWritesLeft}/${WRITER_DAILY_WRITING_LIMIT} 次`} meta={`現實等待 30 秒 · 每次隨機 +${writerRange?.[0] ?? 0}～${writerRange?.[1] ?? 0} 粉絲 · 不直接發薪`} button={writerWritesLeft ? "開始寫作" : "今日次數已用完"} onClick={() => void act("writer_write")} featured disabled={actionBusy || !businessOpen || writerWritesLeft <= 0} disabledLabel={!businessOpen ? "已關門" : writerWritesLeft <= 0 ? "明日再寫" : undefined} />
                  <ActionCard icon="書" title="管理出版作品" meta="前往城市書店建立或下架作品，隨時管理" button="前往書店" onClick={() => void act("move", { location: "bookstore" })} disabled={actionBusy || !bookstoreOpen} disabledLabel={!bookstoreOpen ? "書店已關門" : undefined} />
                </> : <>
                  {isRestaurantOwner && !player.ownsRestaurant && <ActionCard icon="店" title="購買自有餐廳" meta={`一次性 NT$${formatMoney(RESTAURANT_PURCHASE_PRICE)} · 購買後每日在線結算淨收益 NT$${formatMoney(RESTAURANT_DAILY_NET)} · 不再領時薪`} button="購買餐廳" onClick={() => void act("restaurant", { kind: "buy" })} featured disabled={actionBusy || !businessOpen || player.cash < RESTAURANT_PURCHASE_PRICE} disabledLabel={!businessOpen ? "已關門" : player.cash < RESTAURANT_PURCHASE_PRICE ? "現金不足" : undefined} />}
                  {hasRestaurant ? <ActionCard icon="營" title="餐廳營運班 · 8 小時" meta={`特殊工作 · 現實等待 ${formatWaitMinutes(workWaitMinutes(8))} · 飽足 +${restaurantSpecialHunger} · 不另發時薪 · 每日淨收益 NT$${formatMoney(RESTAURANT_DAILY_NET)}`} button="開始營運" onClick={() => void act("work", { hours: 8 })} disabled={actionBusy || !businessOpen} disabledLabel={!businessOpen ? "已關門" : undefined} /> : <>
                    <ActionCard icon="01" title="短班 1 小時" meta={`現實等待 ${formatWaitMinutes(workWaitMinutes(1))} · 收入 NT$${formatMoney(career.hourlyPay)} · EXP +4${medicalWorkLabel}`} button="開始工作" onClick={() => void act("work", { hours: 1 })} disabled={actionBusy || !businessOpen} disabledLabel={!businessOpen ? "已關門" : undefined} />
                    {(!workSpecial || workSpecial.hours !== 4) && <ActionCard icon="04" title="標準班 4 小時" meta={`現實等待 ${formatWaitMinutes(workWaitMinutes(4))} · 收入 NT$${formatMoney(career.hourlyPay * 4)} · EXP +16${medicalWorkLabel}`} button="開始工作" onClick={() => void act("work", { hours: 4 })} disabled={actionBusy || !businessOpen} disabledLabel={!businessOpen ? "已關門" : undefined} />}
                    <ActionCard icon="08" title={longWorkTitle} meta={`${workSpecial?.hours === 8 ? "特殊能力 · " : ""}現實等待 ${formatWaitMinutes(longWorkMinutes)} · 收入 NT$${formatMoney(career.hourlyPay * 8)} · EXP +32${medicalWorkLabel}${workSpecial?.hours === 8 && player.jobCategory === "hospitality" ? ` · 飽足 +${restaurantSpecialHunger}` : ""}`} button={longWorkButton} onClick={() => void act("work", { hours: 8 })} disabled={actionBusy || !businessOpen} disabledLabel={!businessOpen ? "已關門" : undefined} />
                    {workSpecial && workSpecial.hours !== 8 && <ActionCard icon={String(workSpecial.hours)} title={`${workSpecial.name} ${workSpecial.hours} 小時`} meta={`特殊能力 · 現實等待 ${formatWaitMinutes(workWaitMinutes(workSpecial.hours))} · 收入 NT$${formatMoney(career.hourlyPay * workSpecial.hours)} · EXP +${workSpecial.hours * 4}${medicalWorkLabel}${player.jobCategory === "hospitality" ? ` · 飽足 +${restaurantSpecialHunger}` : ""}`} button={`開始${workSpecial.name}`} onClick={() => void act("work", { hours: workSpecial.hours })} disabled={actionBusy || !businessOpen} disabledLabel={!businessOpen ? "已關門" : undefined} />}
                  </>}
                </>}
              </>}
              {player.location === "shopping" && <><ActionCard icon="刮" title="幸運刮刮樂" meta="每張 NT$100 · 最高獎金 NT$50,000" button="購買並刮開" onClick={() => void act("scratch")} featured disabled={actionBusy || !shoppingOpen} disabledLabel={!shoppingOpen ? "已關門" : undefined} /><ActionCard icon="飯" title="巷口飯糰" meta={`NT$${formatMoney(mealPrice(45))} · 飽足 +20${mealDiscountLabel}`} button="買來吃" onClick={() => void act("eat", { kind: "rice" })} disabled={actionBusy || !shoppingOpen} disabledLabel={!shoppingOpen ? "已關門" : undefined} /><ActionCard icon="餐" title="豐盛便當" meta={`NT$${formatMoney(mealPrice(100))} · 飽足 +45${mealDiscountLabel}`} button="享用便當" onClick={() => void act("eat", { kind: "bento" })} disabled={actionBusy || !shoppingOpen} disabledLabel={!shoppingOpen ? "已關門" : undefined} /></>}
              {player.location === "shopping" && street.items.length > 0 && <StreetInventory items={street.items} busy={actionBusy || !shoppingOpen} canSell onAction={(action, payload) => void act(action, payload)} />}
              {player.location === "underpass" && <>
                {isStreet ? <ActionCard icon="拾" title={`今日拾荒 ${street.scavengesUsed}/${street.scavengesMax}`} meta="現實等待 30 秒 · 街頭聲望 +10 · 階級越高越可能找到彩券、二手物與稀有收藏" button={street.scavengesUsed < street.scavengesMax ? "開始拾荒" : "今日次數已用完"} onClick={() => void act("street_scavenge")} featured disabled={actionBusy || street.scavengesUsed >= street.scavengesMax} /> : <ActionCard icon="職" title="加入街頭生存路線" meta="街友 → 丐幫成員 → 丐幫長老 → 丐幫幫主" button="前往工作地選擇" onClick={() => void act("move", { location: "business" })} disabled={busy} />}
                {player.currentJob === "丐幫幫主" && <ActionCard icon="助" title="開設今日互助箱" meta={`其他玩家自願捐助 · 每人一次 · 每日最多 NT$${formatMoney(aidBoxes.dailyCap)}`} button="開設互助箱" onClick={() => void act("aid_box_open")} disabled={busy || aidBoxes.boxes.some((box) => box.isMine)} disabledLabel={aidBoxes.boxes.some((box) => box.isMine) ? "今日已開設" : undefined} />}
                {street.items.length > 0 && <StreetInventory items={street.items} busy={busy} onAction={(action, payload) => void act(action, payload)} />}
                {aidBoxes.boxes.map((box) => <div className="street-aid-card" key={box.ownerId}><span>今日互助箱</span><strong>{box.ownerName}</strong><small>已收到 NT${formatMoney(box.totalReceived)} / NT${formatMoney(aidBoxes.dailyCap)}</small>{!box.isMine && <div>{[50, 100, 200].map((amount) => <button key={amount} disabled={busy || box.donated || player.cash < amount || box.totalReceived >= aidBoxes.dailyCap} onClick={() => void act("aid_box_donate", { ownerId: box.ownerId, amount })}>捐 NT${amount}</button>)}</div>}</div>)}
              </>}
              {player.location === "bookstore" && <BookStorePanel state={bookStore} currentJob={player.currentJob} signedIn={Boolean(profile)} busy={busy || !bookstoreOpen} closed={!bookstoreOpen} title={bookTitle} setTitle={setBookTitle} onAction={(action, payload) => void act(action, payload)} />}
              {player.location === "hotel" && <><ActionCard icon="工" title="旅店臨時工 · 30 秒" meta="現實等待 30 秒 · 收入 NT$100 · 不扣體力、飽足、健康 · 無職業經驗" button="開始打工" onClick={() => void act("hotel", { kind: "work" })} featured disabled={actionBusy} /><ActionCard icon="宿" title="旅店住宿一晚" meta="NT$1,200 · 現實等待 2 分鐘 · 體力全滿" button="辦理入住" onClick={() => void act("hotel", { kind: "stay" })} disabled={actionBusy || player.ownsHome || rentalDaysLeft > 0} disabledLabel={player.ownsHome || rentalDaysLeft > 0 ? "已有住所" : undefined} /><ActionCard icon="餐" title="24 小時旅店餐" meta={`NT$${formatMoney(mealPrice(250))} · 飽足 +45 · 立即完成${mealDiscountLabel}`} button="購買旅店餐" onClick={() => void act("hotel", { kind: "meal" })} disabled={actionBusy} /><ActionCard icon="豪" title="24 小時豪華餐" meta={`NT$${formatMoney(mealPrice(500))} · 飽足 +80 · 立即完成${mealDiscountLabel}`} button="購買豪華餐" onClick={() => void act("hotel", { kind: "luxury" })} disabled={actionBusy} /></>}
                {player.location === "casino" && <div className="casino-games">
                  <div className="casino-category-tabs" role="tablist" aria-label="賭場玩法分類">
                    <button className={casinoGame === "blackjack" || casinoGame === "poker" ? "active" : ""} onClick={() => setCasinoGame("blackjack")}>牌桌</button>
                    <button className={casinoGame === "bingo" ? "active" : ""} onClick={() => setCasinoGame("bingo")}>多人開獎</button>
                    <button className={casinoGame === "dice" ? "active" : ""} onClick={() => setCasinoGame("dice")}>技巧遊戲</button>
                    <button className={casinoGame === "tournament" ? "active" : ""} onClick={() => setCasinoGame("tournament")}>錦標賽</button>
                  </div>
                  {(casinoGame === "blackjack" || casinoGame === "poker") && <div className="casino-game-tabs"><button className={casinoGame === "blackjack" ? "active" : ""} onClick={() => setCasinoGame("blackjack")}>二十一點</button><button className={casinoGame === "poker" ? "active" : ""} onClick={() => setCasinoGame("poker")}>德州撲克</button></div>}
                  {casinoGame === "blackjack" ? <CasinoTable state={casino} signedIn={Boolean(profile)} busy={busy} maxBet={player.cash} onAction={(action, payload) => void act(`casino_${action}`, payload)} /> : casinoGame === "poker" ? <PokerTable state={poker} signedIn={Boolean(profile)} busy={busy} maxBet={player.cash} onAction={(action, payload) => void act(`poker_${action}`, payload)} /> : casinoGame === "bingo" ? <BingoTable state={bingo} signedIn={Boolean(profile)} busy={busy} onAction={(action, payload) => void act(`bingo_${action}`, payload)} /> : casinoGame === "dice" ? <DicePokerTable state={dicePoker} signedIn={Boolean(profile)} busy={busy} onAction={(action, payload) => void act(`dice_${action}`, payload)} /> : <TournamentTable state={tournament} signedIn={Boolean(profile)} busy={busy} onAction={(action, payload) => void act(`tournament_${action}`, payload)} />}
                </div>}
              {player.location === "school" && ACADEMIES.map((academy, index) => <ActionCard key={academy.id} icon={academy.icon} title={academy.name} meta={`NT$500 · 現實等待 1 分鐘 · ${formatRequirements(academy.gains)}`} button="報名上課" onClick={() => void act("study", { academy: academy.id })} featured={index === 0} disabled={actionBusy || !schoolOpen} disabledLabel={!schoolOpen ? "已關門" : undefined} />)}
              {player.location === "hospital" && <><ActionCard icon="急" title="24 小時急診" meta={`NT$${formatMoney(Math.floor(2500 * (1 - effectiveHospitalDiscount)))} · 等待 20 秒 · 健康至少恢復至 70`} button="前往急診" onClick={() => void act("hospital", { kind: "emergency" })} featured disabled={actionBusy} /><ActionCard icon="診" title="一般門診" meta={`07:00～23:00 · NT$${formatMoney(Math.floor(600 * (1 - effectiveHospitalDiscount)))} · 等待 15 秒 · 健康 +25`} button="掛號看診" onClick={() => void act("hospital", { kind: "clinic" })} disabled={actionBusy || !hospitalRegularOpen} disabledLabel={!hospitalRegularOpen ? "已關門，請使用急診" : undefined} /><ActionCard icon="療" title="完整治療" meta={`07:00～23:00 · NT$${formatMoney(Math.floor(1500 * (1 - effectiveHospitalDiscount)))} · 等待 30 秒 · 健康至少恢復至 80`} button="接受治療" onClick={() => void act("hospital", { kind: "treatment" })} disabled={actionBusy || !hospitalRegularOpen} disabledLabel={!hospitalRegularOpen ? "已關門，請使用急診" : undefined} />{effectiveHospitalDiscount > 0 && <p className="hospital-discount-note">目前醫療費用折抵 {Math.round(effectiveHospitalDiscount * 100)}%（職業與城市效果取較高者）</p>}</>}
            </div>
          </div>
          <footer className="world-footer"><span>只有上線時計入個人遊玩天數 · 城市時間全服同步</span><button onClick={() => void act("reset")} disabled={busy}>重新開始人生</button></footer>
        </section>

        <aside className="story-panel panel">
          <div className="section-heading story-title"><span>多人世界</span><small>{online.length} 位在線</small></div>
          <div className="story-tabs" role="tablist" aria-label="多人世界內容">
            <button type="button" role="tab" aria-selected={socialView === "players"} className={socialView === "players" ? "active" : ""} onClick={() => setSocialView("players")}>玩家</button>
            <button type="button" role="tab" aria-selected={socialView === "tasks"} className={socialView === "tasks" ? "active" : ""} onClick={() => setSocialView("tasks")}>任務</button>
            <button type="button" role="tab" aria-selected={socialView === "records"} className={socialView === "records" ? "active" : ""} onClick={() => setSocialView("records")}>紀錄</button>
          </div>
          {socialView === "players" && <div className="story-tab-panel" role="tabpanel">
          <div className="online-summary"><strong><i />{online.length} 位在線</strong><span>每 5 秒同步</span></div>
          <ul className="online-list">
            {online.length ? online.slice(0, 8).map((item) => { const service = medicalTreatmentFor(item.currentJob); const loanTerms = financeLoanTermsFor(item.currentJob); const isOther = Boolean(profile && item.id !== profile.id); const isPrisonPlayer = item.location === "prison"; return <li key={item.id}><button type="button" className={`mini-avatar ${item.avatarUrl ? "has-photo" : ""}`} aria-label={`放大查看${item.displayName}的大頭貼`} onClick={() => setEnlargedPlayer(item)}>{item.avatarUrl ? <img src={`${API_ORIGIN}${item.avatarUrl}`} alt="" /> : item.displayName.slice(0, 1)}</button><div><strong>{item.displayName}{item.id === profile?.id ? "（你）" : ""}</strong><small>{isPrisonPlayer ? `監獄服刑 · ${item.prisonCrime || "違法行為"}` : `正在 ${locationName(item.location)} · ${displayJobName(item.currentJob)}`}</small><span className="online-finance">現金 NT${formatMoney(item.cash)} · 貸款 NT${formatMoney(item.loanBalance)}</span>{isOther && !isPrisoner && <span className="player-transfer-actions"><button type="button" onClick={() => openTransfer(item, "gift")} disabled={busy || player.cash < 1}>贈送</button><button type="button" className="finance" onClick={() => void act("contract_create", { targetId: item.id })} disabled={busy || Boolean(contracts.contracts.length) || player.cash < 200}>人生契約</button>{isStreet && <button type="button" onClick={() => void act("beg_request", { targetId: item.id })} disabled={busy || street.begIncome >= street.begCap}>乞討</button>}{isStreet && streetRankIndex(player.currentJob) >= 2 && <button type="button" className="medical" onClick={() => void act("street_share_food", { targetId: item.id })} disabled={busy || !street.items.some((entry) => entry.key === "food" && entry.quantity > 0)}>分享食物</button>}{player.currentJob === "詐騙犯" && !isPrisonPlayer && <button type="button" className="scam" onClick={() => openTransfer(item, "scam")} disabled={busy || player.cash < 2}>詐騙</button>}{player.currentJob === "駭客" && !isPrisonPlayer && <button type="button" className="crime" title={`每日最多 ${HACK_DAILY_LIMIT} 次 · 成功率 ${Math.round(HACK_SUCCESS_CHANCE * 100)}% · 竊取目標現金 ${Math.round(HACK_STEAL_RATE * 100)}%，單次上限 NT$${formatMoney(HACK_MAX_STEAL)}`} onClick={() => void act("crime_hack", { targetId: item.id })} disabled={busy || player.hackUses >= HACK_DAILY_LIMIT}>竊取現金</button>}{service && <button type="button" className="medical" onClick={() => requestMedicalTreatment(item)} disabled={busy || player.health >= 100}>請求治療 · NT${formatMoney(service.price)}</button>}{loanTerms && <button type="button" className="finance" onClick={() => openLoanRequest(item)} disabled={busy || player.loanBalance > 0}>借款方案</button>}</span>}</div></li>; }) : <li className="empty-online">登入後，你會在這裡遇見其他玩家。</li>}
          </ul>
          </div>}
          {socialView === "tasks" && <div className="story-tab-panel" role="tabpanel">
          <section className={`coop-card ${coop.status}`}><span>多人合作</span><strong>城市聯合支援</strong><p>醫療、金融、文學與餐飲各完成一個分工；完成後四位玩家各獲 NT${formatMoney(coop.reward)}、天賦經驗 +{coop.talentExp}。</p><div>{coop.roles.map((role) => <small className={role.playerName ? "done" : ""} key={role.id}>{role.label}<b>{role.playerName || "等待玩家"}</b></small>)}</div>{coop.status === "completed" ? <em>今日計畫已完成</em> : coop.eligibleRole ? <button disabled={busy || coop.contributed || coop.roles.some((role) => role.id === coop.eligibleRole && role.playerName)} onClick={() => void act("coop_contribute")}>{coop.contributed ? "今日已參與" : "加入我的職業分工"}</button> : <em>目前職業不是本日四種分工</em>}</section>
          <section className="innovation-card"><span>第 {commissions.cycleDay} 天</span><strong>城市委託</strong>{commissions.commissions.length ? commissions.commissions.map((commission) => <div className="innovation-row" key={commission.id}><b>{commission.title}</b><small>{commission.detail} · NT${formatMoney(commission.reward)} · {commission.faction}聲望</small><button disabled={busy || commission.completed} onClick={() => void act(player.location === commission.location ? "city_commission" : "move", player.location === commission.location ? { commissionId: commission.id } : { location: commission.location })}>{commission.completed ? "今日已完成" : player.location === commission.location ? "完成委託" : `前往${locationName(commission.location)}`}</button></div>) : <p>目前職業暫無城市委託。</p>}<div className="reputation-row">{reputation.factions.map((faction) => <small key={faction.faction}>{faction.faction} {faction.points} · {faction.rank}{faction.bonusPercent ? ` +${faction.bonusPercent}%` : ""}</small>)}</div></section>
          <section className="innovation-card"><span>共同目標</span><strong>人生契約</strong>{contracts.contracts.length ? contracts.contracts.map((contract) => <div className="innovation-row" key={contract.id}><b>{contract.partnerName} · {contract.status === "pending" ? "等待回覆" : "共同儲蓄中"}</b><small>你 NT${formatMoney(contract.mineDeposit)} / NT${formatMoney(contract.targetPerPlayer)} · 對方 NT${formatMoney(contract.partnerDeposit)} · 第 {contract.expiresDay} 天前完成</small>{contract.status === "active" && <button disabled={busy || player.cash < 100 || contract.mineDeposit >= contract.targetPerPlayer} onClick={() => void act("contract_deposit", { contractId: contract.id, amount: 100 })}>存入 NT$100</button>}</div>) : <p>對其他在線玩家發起契約；各存 NT$1,000，完成各得 NT$150。</p>}</section>
          </div>}
          {socialView === "records" && <div className="story-tab-panel" role="tabpanel">
          {(mystery.found > 0 || lifeLedger.entries.length > 0) && <section className="innovation-card"><span>個人紀錄</span><strong>人生紀錄</strong>{mystery.found > 0 && <p>城市傳聞 {mystery.found}/{mystery.total}：{mystery.whispers[0]}</p>}<ol className="life-ledger">{lifeLedger.entries.slice(0, 4).map((entry, index) => <li key={`${entry.gameTime}-${index}`} className={entry.tone}><b>{entry.gameTime} · {entry.title}</b><small>{entry.detail}</small></li>)}</ol></section>}
          <div className="section-heading feed-heading"><span>城市動態</span><small>最近 6 筆</small></div>
          <ol className="feed-list">
            {feed.slice(0, 6).map((item) => <li key={item.id} className={item.tone}><time>{item.time}</time><div><strong>{item.playerName ? `${item.playerName} · ` : ""}{item.title}</strong><p>{item.detail}</p></div></li>)}
          </ol>
          <div className={`city-memory-card ${cityMemory.state.tone}`}><span>城市記憶 · 三日週期</span><strong>{cityMemory.state.name}</strong><p>{cityMemory.state.description}</p><div><small>工作 {cityMemory.totals.work}</small><small>醫療 {cityMemory.totals.hospital}</small><small>居住 {cityMemory.totals.housing}</small><small>學習 {cityMemory.totals.study}</small><small>賭場 {cityMemory.totals.casino}</small><small>事件 {cityMemory.totals.event}</small></div></div>
          <div className="next-goal"><span>當前《浪子回頭》任務進度</span><strong>{player.mainStory !== "prodigal_return" ? "尚未開始《浪子回頭》" : nextStoryChapter ? `第 ${nextStoryChapter.chapter} 章 · ${nextStoryChapter.title}` : "第 6 章完成 · 回家的路"}</strong><div><i style={{ width: `${player.mainStory === "prodigal_return" ? storyProgress : 0}%` }} /></div><small>{player.mainStory !== "prodigal_return" ? "選擇人生主線後開始記錄" : nextStoryChapter ? `目前貸款 NT$${formatMoney(player.loanBalance)} · 目標降至 NT$${formatMoney(nextStoryDebt)}（初始負債 ${Math.round(nextStoryChapter.remainingRatio * 100)}%）` : "貸款已全部清償 · 《浪子回頭》全章完成"}</small></div>
          </div>}
        </aside>
      </div>
      <nav className="mobile-dock" aria-label="主要遊戲區域">
        <button type="button" className={mobileView === "city" ? "active" : ""} aria-pressed={mobileView === "city"} onClick={() => setMobileView("city")}><MobileNavIcon name="city" /><span>城市</span></button>
        <button type="button" className={mobileView === "life" ? "active" : ""} aria-pressed={mobileView === "life"} onClick={() => setMobileView("life")}><MobileNavIcon name="life" /><span>我的人生</span></button>
        <button type="button" className={mobileView === "social" ? "active" : ""} aria-pressed={mobileView === "social"} onClick={() => setMobileView("social")}><MobileNavIcon name="social" /><span>多人世界</span>{online.length > 0 && <b aria-label={`${online.length} 位玩家在線`}>{online.length}</b>}</button>
      </nav>
      {profile && player.mainStory === "unselected" && <div className="story-select-overlay" role="dialog" aria-modal="true" aria-labelledby="story-select-title">
        <section className="story-select-card"><header><span>CHOOSE YOUR LIFE STORY</span><h2 id="story-select-title">選擇人生主線</h2><p>主線選定後不能更換，並會決定你的初始條件。</p></header><article><div className="story-choice-title"><span>MAIN STORY 01</span><h3>《浪子回頭》</h3></div><div className="story-prologue">{PRODIGAL_RETURN_STORY.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div><div className="story-starting-stats"><div><span>初始金錢</span><strong>NT$37</strong></div><div className="debt"><span>初始負債</span><strong>NT$250,000</strong></div></div><button type="button" onClick={() => void act("choose_story", { story: "prodigal_return" })} disabled={busy}>{busy ? "正在開始人生……" : "選擇《浪子回頭》並開始"}<span>→</span></button></article></section>
      </div>}
      {profile && player.gameOver === "prodigal_insolvent" && <div className="story-select-overlay game-over-overlay" role="dialog" aria-modal="true" aria-labelledby="game-over-title">
        <section className="story-select-card game-over-card"><header><span>BAD ENDING</span><h2 id="game-over-title">《浪子回頭：無力償還》</h2><p>連續兩個遊戲日未繳足每日最低還款額</p></header><article><div className="story-prologue">{PRODIGAL_FAILURE_STORY.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div><button type="button" onClick={() => void act("reset")} disabled={busy}>{busy ? "正在重新開始……" : "重新開始《浪子回頭》"}<span>↻</span></button></article></section>
      </div>}
      {profile && unlockedStoryChapter && <div className="auth-overlay city-event-overlay" role="dialog" aria-modal="true" aria-labelledby="story-chapter-title"><section className="city-event-card story-chapter-card"><span>PRODIGAL RETURN · CHAPTER {unlockedStoryChapter.chapter}</span><h2 id="story-chapter-title">{unlockedStoryChapter.title}</h2>{unlockedStoryChapter.chapter === 6 ? PRODIGAL_SUCCESS_STORY.map((paragraph, index) => <p key={index}>{paragraph}</p>) : <p>{unlockedStoryChapter.story}</p>}<button disabled={busy} onClick={() => void act("story_ack")}>收進人生紀錄</button></section></div>}
      {talentOpen && <div className="auth-overlay" role="dialog" aria-modal="true" aria-labelledby="talent-title" onMouseDown={(event) => { if (event.currentTarget === event.target) setTalentOpen(false); }}><section className="talent-board"><button className="auth-close" type="button" aria-label="關閉天賦樹" onClick={() => setTalentOpen(false)}>×</button><span className="panel-kicker">LIFE TALENTS</span><h2 id="talent-title">天賦樹</h2><p>等級 {player.talentLevel} · 可用 {player.talentPoints} 點 · 每 100 經驗獲得 1 點。天賦不會改變賭場或刮刮樂機率。</p><div className="talent-branches">{["職涯", "生存", "財務", "機會"].map((branch) => <section key={branch}><h3>{branch}</h3>{TALENTS.filter((talent) => talent.branch === branch).map((talent) => { const owned = player.talents.includes(talent.id); const locked = talent.requires.some((required) => !player.talents.includes(required)); return <button className={owned ? "owned" : ""} key={talent.id} disabled={busy || owned || locked || player.talentPoints < 1} onClick={() => void act("talent", { talent: talent.id })}><strong>{talent.name}</strong><small>{talent.description}</small><em>{owned ? "已解鎖" : locked ? "需要前置天賦" : "使用 1 點"}</em></button>; })}</section>)}</div><button className="talent-reset" disabled={busy || !player.talents.length || player.cash < 2_000} onClick={() => void act("talent", { kind: "reset" })}>支付 NT$2,000 重置天賦</button></section></div>}
      {profile && pendingCityEvent && <div className="auth-overlay city-event-overlay" role="dialog" aria-modal="true" aria-labelledby="city-event-title"><section className="city-event-card"><span>THE CITY FOUND YOU</span><h2 id="city-event-title">{pendingCityEvent.title}</h2><p>{pendingCityEvent.text}</p><div>{pendingCityEvent.choices.map((choice) => { const unavailable = "requires" in choice && choice.requires && !player.talents.includes(choice.requires); return <button key={choice.id} disabled={busy || Boolean(unavailable)} onClick={() => void act("city_event", { choice: choice.id })}>{choice.label}{unavailable ? <small>需要談判能力</small> : null}</button>; })}</div></section></div>}
      {selectedNpc && <NpcDialogue resident={selectedNpc} busy={busy} onClose={closeNpcDialog} onChoose={(choiceId) => void act("npc_interact", { npcId: selectedNpc.id, eventId: selectedNpc.event?.id, choice: choiceId })} />}
      {transferTarget && <div className="auth-overlay transfer-overlay" role="dialog" aria-modal="true" aria-labelledby="transfer-title" onMouseDown={(event) => { if (event.currentTarget === event.target) setTransferTarget(null); }}><form className="transfer-card" onSubmit={submitTransfer}><button className="auth-close" type="button" aria-label="關閉" onClick={() => setTransferTarget(null)}>×</button><span className="panel-kicker">PLAYER TO PLAYER</span><h2 id="transfer-title">{transferTarget.kind === "gift" ? "贈送現金" : "發送詐騙邀請"}</h2><p>{transferTarget.kind === "gift" ? `向 ${transferTarget.player.displayName} 贈送現金；對方接受後才會完成轉帳。` : `向 ${transferTarget.player.displayName} 發送與贈送相同外觀的現金邀請。對方接受時，有 50% 機率被騙走填寫金額的一半。`}</p><label>金額（最多 NT${formatMoney(player.cash)}）<input inputMode="numeric" type="number" min={transferTarget.kind === "scam" ? 2 : 1} max={player.cash} step="1" value={transferAmount} onChange={(event) => setTransferAmount(event.target.value)} required /></label><small>{transferTarget.kind === "scam" ? "詐騙金額以你手上的現金為上限；成功時對方失去此金額的一半。" : "送出邀請後，請等待對方接受或拒絕。"}</small><button className="transfer-submit" disabled={busy || player.cash < (transferTarget.kind === "scam" ? 2 : 1)}>{transferTarget.kind === "gift" ? "送出贈送邀請" : "送出現金邀請"}</button></form></div>}
      {loanTarget && <div className="auth-overlay transfer-overlay" role="dialog" aria-modal="true" aria-labelledby="loan-request-title" onMouseDown={(event) => { if (event.currentTarget === event.target) setLoanTarget(null); }}><form className="transfer-card loan-request-card" onSubmit={submitLoanRequest}><button className="auth-close" type="button" aria-label="關閉貸款申請" onClick={() => setLoanTarget(null)}>×</button><span className="panel-kicker">PLAYER LOAN DESK</span><h2 id="loan-request-title">申請玩家貸款</h2><p>向 <strong>{loanTarget.displayName}</strong>（{loanTarget.currentJob}）申請由銀行撥款的優惠貸款。</p>{(() => { const terms = financeLoanTermsFor(loanTarget.currentJob); return terms ? <small>每日利率 {(terms.rateBp / 100).toFixed(2)}% · 金融玩家每日獲得 {(terms.spreadBp / 100).toFixed(2)}% 利差 · 最高 NT$50,000</small> : null; })()}<label>申請金額<input inputMode="numeric" type="number" min="1" max="50000" step="1" value={loanAmount} onChange={(event) => setLoanAmount(event.target.value)} required /></label><small>本金由銀行撥入你的現金，不會扣除對方現金；接受後會建立一筆一般貸款。</small><button className="transfer-submit finance-submit" disabled={busy || player.loanBalance > 0}>送出貸款申請</button></form></div>}
      {profile && pendingTransfer && <div className="auth-overlay transfer-overlay" role="dialog" aria-modal="true" aria-labelledby="incoming-transfer-title"><section className="transfer-card incoming-transfer"><span className="panel-kicker">CASH INVITATION</span><h2 id="incoming-transfer-title">現金邀請</h2><p><strong>{pendingTransfer.senderName}</strong> 想送給你 NT${formatMoney(pendingTransfer.amount)}，要接受這筆現金嗎？</p><small>接受後將立即處理；你也可以直接拒絕。</small><div className="transfer-response"><button type="button" className="decline" disabled={busy} onClick={() => void act("transfer_response", { requestId: pendingTransfer.id, kind: "decline" })}>拒絕</button><button type="button" disabled={busy} onClick={() => void act("transfer_response", { requestId: pendingTransfer.id, kind: "accept" })}>接受</button></div></section></div>}
      {profile && pendingContract && <div className="auth-overlay transfer-overlay" role="dialog" aria-modal="true" aria-labelledby="incoming-contract-title"><section className="transfer-card incoming-transfer"><span className="panel-kicker">LIFE CONTRACT</span><h2 id="incoming-contract-title">人生契約邀請</h2><p><strong>{pendingContract.partnerName}</strong> 想與你共同存入 NT${formatMoney(pendingContract.targetPerPlayer)}。</p><small>接受時先支付 NT${formatMoney(pendingContract.stake)} 保證金；三個城市日內雙方各存滿目標，保證金退回並各獲 NT$150。未完成只退回已存金額。</small><div className="transfer-response"><button type="button" className="decline" disabled={busy} onClick={() => void act("contract_decline", { contractId: pendingContract.id })}>拒絕</button><button type="button" disabled={busy || player.cash < pendingContract.stake} onClick={() => void act("contract_accept", { contractId: pendingContract.id })}>接受契約</button></div></section></div>}
      {profile && pendingMedical && <div className="auth-overlay transfer-overlay" role="dialog" aria-modal="true" aria-labelledby="incoming-medical-title"><section className="transfer-card incoming-transfer medical-request-card"><span className="panel-kicker">PLAYER MEDICAL CARE</span><h2 id="incoming-medical-title">玩家治療請求</h2><p><strong>{pendingMedical.patientName}</strong> 請求你的「{pendingMedical.providerJob}」治療。</p><small>恢復健康 +{pendingMedical.healthGain} · 收費 NT${formatMoney(pendingMedical.amount)} · 30 秒內回覆；雙方必須保持在線。</small><div className="transfer-response"><button type="button" className="decline" disabled={busy} onClick={() => void act("medical_response", { medicalRequestId: pendingMedical.id, kind: "decline" })}>拒絕</button><button type="button" disabled={busy} onClick={() => void act("medical_response", { medicalRequestId: pendingMedical.id, kind: "accept" })}>接受治療</button></div></section></div>}
      {profile && pendingLoan && <div className="auth-overlay transfer-overlay" role="dialog" aria-modal="true" aria-labelledby="incoming-loan-title"><section className="transfer-card incoming-transfer loan-request-card"><span className="panel-kicker">PLAYER LOAN DESK</span><h2 id="incoming-loan-title">玩家貸款申請</h2><p><strong>{pendingLoan.borrowerName}</strong> 申請 NT${formatMoney(pendingLoan.amount)} 的「{pendingLoan.providerJob}」優惠貸款。</p><small>借款者每日支付 {(pendingLoan.interestRateBp / 100).toFixed(2)}% · 你每日獲得 {(pendingLoan.spreadBp / 100).toFixed(2)}% 利差 · 銀行撥款 · 30 秒內回覆</small><div className="transfer-response"><button type="button" className="decline" disabled={busy} onClick={() => void act("loan_response", { loanRequestId: pendingLoan.id, kind: "decline" })}>拒絕</button><button type="button" className="finance-accept" disabled={busy} onClick={() => void act("loan_response", { loanRequestId: pendingLoan.id, kind: "accept" })}>接受貸款</button></div></section></div>}
      {profile && pendingBeg && <div className="auth-overlay transfer-overlay" role="dialog" aria-modal="true" aria-labelledby="incoming-beg-title"><section className="transfer-card incoming-transfer beg-request-card"><span className="panel-kicker">STREET REQUEST</span><h2 id="incoming-beg-title">街頭乞討</h2><p><strong>{pendingBeg.requesterName}</strong>（{pendingBeg.requesterJob}）向你請求一點幫助。</p><small>你可以給錢、拒絕或羞辱；羞辱不會造成對方任何數值損失。30 秒後請求失效。</small><div className="beg-response"><button type="button" className="decline" disabled={busy} onClick={() => void act("beg_response", { requestId: pendingBeg.id, kind: "decline" })}>拒絕</button><button type="button" className="decline" disabled={busy} onClick={() => void act("beg_response", { requestId: pendingBeg.id, kind: "humiliate" })}>羞辱</button>{pendingBeg.amounts.map((amount) => <button type="button" key={amount} disabled={busy || player.cash < amount} onClick={() => void act("beg_response", { requestId: pendingBeg.id, kind: "give", amount })}>給 NT${amount}</button>)}</div></section></div>}
      {enlargedPlayer && <div className="avatar-lightbox" role="dialog" aria-modal="true" aria-labelledby="avatar-lightbox-title" onMouseDown={(event) => { if (event.currentTarget === event.target) setEnlargedPlayer(null); }}>
        <section><button className="auth-close" type="button" aria-label="關閉大頭貼" onClick={() => setEnlargedPlayer(null)}>×</button><div className={`enlarged-avatar ${enlargedPlayer.avatarUrl ? "has-photo" : ""}`}>{enlargedPlayer.avatarUrl ? <img src={`${API_ORIGIN}${enlargedPlayer.avatarUrl}`} alt={`${enlargedPlayer.displayName}的大頭貼`} /> : enlargedPlayer.displayName.slice(0, 1)}</div><h2 id="avatar-lightbox-title">{enlargedPlayer.displayName}</h2><p>現金 NT${formatMoney(enlargedPlayer.cash)} · 貸款 NT${formatMoney(enlargedPlayer.loanBalance)}</p></section>
      </div>}
      {jobOpen && <div className="auth-overlay" role="dialog" aria-modal="true" aria-labelledby="job-title" onMouseDown={(event) => { if (event.currentTarget === event.target) setJobOpen(false); }}>
        <section className="job-board">
          <button className="auth-close" type="button" aria-label="關閉" onClick={() => setJobOpen(false)}>×</button>
          <span className="panel-kicker">CITY CAREER BOARD</span>
          <h2 id="job-title">找工作</h2>
           <p>{selectedJobCategory.id === "literary" ? "文學作家以粉絲數升遷，不使用一般工作班次；每天最多寫作兩次，簽約後可到城市書店出版。" : "每條產業都有指定能力門檻；先到未來學院培養能力，入行後同時達成產業 EXP 與能力要求才會依序升遷。更換產業會重設該路線經驗，五項能力會保留。"}</p>
          <div className="job-categories" role="tablist" aria-label="職業分類">
            {JOB_CATEGORIES.map((category) => <button role="tab" aria-selected={jobCategory === category.id} className={jobCategory === category.id ? "active" : ""} key={category.id} onClick={() => setJobCategory(category.id)}>{category.label}</button>)}
          </div>
           {selectedJobCategory.id === "unfixed" ? <div className="job-list">{selectedJobCategory.jobs.map((job) => <button className={player.currentJob === job ? "current" : ""} key={job} onClick={() => { setJobOpen(false); void act("job", { job }); }} disabled={busy}><span>{job}</span><small>{player.currentJob === job ? "目前狀態" : "無固定工作與收入"}</small></button>)}</div> : <div className="career-route">
               <div className="route-steps">{selectedJobCategory.jobs.map((job, index) => <div className={player.jobCategory === selectedJobCategory.id && player.currentJob === job ? "current" : ""} key={job}><small>第 {index + 1} 階</small><strong>{job}</strong><span>{selectedJobCategory.id === "literary" ? `${careerThresholdForCategory(selectedJobCategory.id, index)} 位粉絲` : index === 0 ? "免能力門檻入行" : `${careerThresholdForCategory(selectedJobCategory.id, index)} EXP`} · {selectedJobCategory.id === "literary" ? "粉絲達標即可升遷" : formatRequirements(careerRequirements(selectedJobCategory.id, index))}</span></div>)}</div>
            <button className="enter-industry" onClick={() => { setJobOpen(false); void act("job", { job: selectedJobCategory.jobs[0] }); }} disabled={busy || (player.jobCategory === selectedJobCategory.id && player.jobExp === 0)}>進入{selectedJobCategory.label} · 從{selectedJobCategory.jobs[0]}開始</button>
          </div>}
        </section>
      </div>}
      {territoryOpen && <div className="auth-overlay" role="dialog" aria-modal="true" aria-labelledby="territory-title" onMouseDown={(event) => { if (event.currentTarget === event.target) setTerritoryOpen(false); }}><section className="transfer-card territory-card"><button className="auth-close" type="button" aria-label="關閉地盤設定" onClick={() => setTerritoryOpen(false)}>×</button><span className="panel-kicker">DAQIAOTOU TERRITORY</span><h2 id="territory-title">設定大橋頭地盤</h2><p>選擇一個公共地點。其他玩家進入時不會被扣款，只會留下進入紀錄並累積你的保護費。</p><label>地盤位置<select value={territorySelection} onChange={(event) => setTerritorySelection(event.target.value as LocationId)}>{locations.filter((item) => !["home", "prison"].includes(item.id)).map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><small>每次有效進入 NT${formatMoney(TERRITORY_VISIT_REWARD)} · 每日上限 NT${formatMoney(TERRITORY_DAILY_CAP)} · 短時間重複進出不重複計算。</small><button className="transfer-submit" disabled={busy || !businessOpen} onClick={() => { setTerritoryOpen(false); void act("territory", { kind: "set", territoryLocation: territorySelection }); }}>確認設定地盤</button></section></div>}
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
          <label>玩家名字<input value={nameDraft} onChange={(event) => setNameDraft(event.target.value)} minLength={2} maxLength={24} autoComplete="nickname" required /></label>
          {nameError && <p className="auth-error" role="alert">{nameError}</p>}
          <button className="auth-submit" disabled={busy}>{busy ? "儲存中…" : "儲存新名字"}</button>
        </form>
      </div>}
    </main>
  );
}

function Skill({ name, exp }: { name: string; exp: number }) {
  const displayedExp = Math.min(ABILITY_MAX, Math.max(0, exp));
  return <div className="skill-row"><div><span>{name}</span><strong>{displayedExp} / {ABILITY_MAX}</strong></div><div className="skill-track"><i style={{ width: `${levelProgress(displayedExp)}%` }} /></div></div>;
}

function StreetInventory({ items, busy, canSell = false, onAction }: { items: StreetState["items"]; busy: boolean; canSell?: boolean; onAction: (action: string, payload: Record<string, unknown>) => void }) {
  return <section className="street-inventory"><header><span>STREET BAG</span><strong>街頭背包</strong></header>{items.map((item) => <div key={item.key}><span className="inventory-icon">{item.icon}</span><p><strong>{item.name}</strong><small>持有 {item.quantity}{item.hunger ? ` · 使用後飽足 +${item.hunger}` : item.sellPrice ? ` · 每件可售 NT$${formatMoney(item.sellPrice)}` : ""}</small></p>{["food", "scratch"].includes(item.key) ? <button disabled={busy} onClick={() => onAction("inventory_use", { itemKey: item.key })}>{item.key === "food" ? "食用" : "開獎"}</button> : canSell && item.sellPrice ? <button disabled={busy} onClick={() => onAction("inventory_sell", { itemKey: item.key, quantity: item.quantity })}>全部出售</button> : null}</div>)}</section>;
}

function ActionCard({ icon, title, meta, button, featured = false, disabled, disabledLabel, onClick }: { icon: string; title: string; meta: string; button: string; featured?: boolean; disabled: boolean; disabledLabel?: string; onClick: () => void }) {
  return <article className={`action-card ${featured ? "featured" : ""}`}><span className="action-icon">{icon}</span><h4>{title}</h4><p>{meta}</p><button onClick={onClick} disabled={disabled}>{disabled ? disabledLabel ?? "同步中…" : button}<span>→</span></button></article>;
}

function BookStorePanel({ state, currentJob, signedIn, busy, closed, title, setTitle, onAction }: { state: BookStoreState; currentJob: string; signedIn: boolean; busy: boolean; closed: boolean; title: string; setTitle: (value: string) => void; onAction: (action: string, payload?: Record<string, unknown>) => void }) {
  const price = writerBookPriceFor(currentJob);
  const canPublish = Boolean(signedIn && price);
  const ownBooks = state.books.filter((book) => book.isMine);
  const availableBooks = state.books.filter((book) => !book.isMine && book.status === "active");
  const bookLimitReached = ownBooks.length >= state.maxActiveBooks;
  return <section className="bookstore-panel">
    <header><div><span>CITY BOOKSTORE</span><strong>作品與書架</strong></div><small>{closed ? "目前已關門" : "07:00～23:00 開放"}</small></header>
    {canPublish ? <form className="book-publish-form" onSubmit={(event) => { event.preventDefault(); const clean = title.trim(); if (clean) { onAction("book_publish", { title: clean }); setTitle(""); } }}><label>建立書籍名稱 <small>簽約作家 NT${formatMoney(price!)} · 已建立 {ownBooks.length}/{state.maxActiveBooks} 本</small><input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={40} placeholder="輸入書名即可" disabled={busy || bookLimitReached} required /></label><button type="submit" disabled={busy || closed || !title.trim() || bookLimitReached}>{bookLimitReached ? "已達十本上限" : "上架作品"}</button></form> : <p className="bookstore-note">簽約作家後才能出版；目前可自由瀏覽其他玩家的作品。</p>}
    <div className="bookstore-columns"><div><div className="section-heading"><span>書店架上</span><small>{availableBooks.length} 本</small></div>{availableBooks.length ? <div className="book-list">{availableBooks.map((book) => <article className="book-card" key={book.id}><div><strong>{book.title}</strong><small>{book.authorName} · NT${formatMoney(book.price)} · 已售 {book.salesCount}</small><em>你已購買 {book.ownedCount}/{state.maxPurchasesPerBook} 次</em></div><button onClick={() => onAction("book_buy", { bookId: book.id })} disabled={busy || closed || book.ownedCount >= state.maxPurchasesPerBook}> {book.ownedCount >= state.maxPurchasesPerBook ? "已達上限" : `購買 NT$${formatMoney(book.price)}`}</button></article>)}</div> : <p className="bookstore-empty">目前沒有其他玩家上架作品。</p>}</div><div><div className="section-heading"><span>我的作品</span><small>{ownBooks.length}/{state.maxActiveBooks} 本</small></div>{ownBooks.length ? <div className="book-list">{ownBooks.map((book) => <article className="book-card mine" key={book.id}><div><strong>{book.title}</strong><small>定價 NT${formatMoney(book.price)} · 已售 {book.salesCount}</small><em>{book.status === "active" ? "架上販售中" : "已下架"}</em></div><button onClick={() => onAction("book_toggle", { bookId: book.id, status: book.status === "active" ? "hidden" : "active" })} disabled={busy || closed}>{book.status === "active" ? "下架" : "重新上架"}</button></article>)}</div> : <p className="bookstore-empty">尚未建立作品。</p>}</div></div>
    <footer>每位作者最多建立 {state.maxActiveBooks} 本書；每本書每位玩家最多購買 {state.maxPurchasesPerBook} 次。購買款項會立即存入作者手上現金，出版與上下架不消耗等待時間。</footer>
  </section>;
}

function BankPanel({ player, busy, closed, onAction }: { player: Player; busy: boolean; closed: boolean; onAction: (kind: "deposit" | "withdraw" | "borrow" | "repay", amount: number) => void }) {
  const [amount, setAmount] = useState("1000");
  const value = Number(amount);
  const valid = Number.isSafeInteger(value) && value > 0;
  const depositRateBp = financeDepositRateFor(player.currentJob);
  const loanRateBp = player.loanRateBp ?? BANK_LOAN_RATE_BP;
  return <section className="bank-panel">
    <header><div><span>BANK ACCOUNT</span><strong>存款 NT${formatMoney(player.bankBalance)}</strong></div><div><span>LOAN BALANCE</span><strong className={player.loanBalance ? "debt" : ""}>貸款 NT${formatMoney(player.loanBalance)}</strong></div></header>
    <p>存款每個遊戲日複利 {(depositRateBp / 100).toFixed(2)}%；{player.loanProviderName ? `玩家貸款方案每日增加 ${(loanRateBp / 100).toFixed(2)}%（媒合者：${player.loanProviderName}）` : `一般貸款每日增加 ${(BANK_LOAN_RATE_BP / 100).toFixed(2)}%`}，《浪子回頭》主線債務每日增加 0.2%。遊戲日結束時若未主動還款，系統會先從手上現金、再從銀行存款自動扣除最低繳款；兩者都不足才記為欠繳。每個遊戲日等於上線遊玩 24 分鐘，離線期間不結算。</p>
    {player.loanProviderName && <div className="loan-contract-note">玩家貸款方案：{player.loanProviderName} · 優惠利率 {(loanRateBp / 100).toFixed(2)}% · 媒合者可依利差獲得收益</div>}
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

function LeaveConfirmDialog({ open, title, detail, onCancel, onConfirm }: { open: boolean; title: string; detail: string; onCancel: () => void; onConfirm: () => void }) {
  if (!open) return null;
  return <div className="auth-overlay table-confirm-overlay" role="dialog" aria-modal="true" aria-label="離開牌桌確認">
    <section className="table-confirm-card">
      <span className="panel-kicker">CONFIRM EXIT</span>
      <h2>{title}</h2>
      <p>{detail}</p>
      <div className="table-confirm-actions"><button type="button" onClick={onCancel}>繼續留在牌桌</button><button type="button" className="danger" onClick={onConfirm}>確認離開</button></div>
    </section>
  </div>;
}

const BINGO_CARD_LINES = [
  [0, 1, 2, 3, 4], [5, 6, 7, 8, 9], [10, 11, 12, 13, 14], [15, 16, 17, 18, 19], [20, 21, 22, 23, 24],
  [0, 5, 10, 15, 20], [1, 6, 11, 16, 21], [2, 7, 12, 17, 22], [3, 8, 13, 18, 23], [4, 9, 14, 19, 24],
  [0, 6, 12, 18, 24], [4, 8, 12, 16, 20],
];

function bingoProgress(card: number[], drawn: number[]) {
  const marked = (index: number) => card[index] === 0 || drawn.includes(card[index]);
  return Math.max(0, ...BINGO_CARD_LINES.map((line) => line.filter(marked).length));
}

function BingoTable({ state, signedIn, busy, onAction }: { state: BingoState; signedIn: boolean; busy: boolean; onAction: (action: string, payload?: Record<string, unknown>) => void }) {
  const [entryFee, setEntryFee] = useState("100");
  const [leaveConfirm, setLeaveConfirm] = useState(false);
  const [swapIndex, setSwapIndex] = useState<number | null>(null);
  const [previewNumber, setPreviewNumber] = useState<number | null>(null);
  const [now, setNow] = useState(currentWallClockMs());
  useEffect(() => { const timer = window.setInterval(() => setNow(currentWallClockMs()), 500); return () => window.clearInterval(timer); }, []);
  const requestLeave = () => setLeaveConfirm(true);
  const confirmLeave = () => { setLeaveConfirm(false); onAction("leave"); };
  const mine = state.players.find((player) => player.isMine);
  const hosting = state.status === "lobby" && !state.hostUserId;
  const fee = state.entryFee ?? 100;
  const requestedFee = Number(entryFee);
  const validFee = Number.isInteger(requestedFee) && requestedFee >= 100 && requestedFee <= 10_000;
  const displayedFee = (hosting || state.status === "completed") && validFee ? requestedFee : fee;
  const countdownTarget = state.status === "strategy" ? state.strategyUntil : state.status === "claiming" ? state.claimUntil : state.nextDrawAt;
  const secondsLeft = countdownTarget ? Math.max(0, Math.ceil((countdownTarget - now) / 1000)) : 0;
  const statusLabel = state.status === "drawing" ? "開獎中" : state.status === "strategy" ? "策略換格" : state.status === "claiming" ? "賓果判定" : state.status === "completed" ? "本輪結束" : "等待玩家";
  const canSwap = Boolean(mine && state.status === "strategy" && !mine.swapped && swapIndex !== null && previewNumber !== null);
  const eligibleWinner = Boolean(mine && state.winnerIds.includes(mine.id));
  return <section className="casino-table social-casino-table bingo-table">
    <header><div><span>策略賓果</span><h3>5×5 多人共同開獎</h3><p>十球後可換一格；最先完成橫、直或斜線的玩家獲勝</p></div><strong className={`room-status ${state.status}`}>{statusLabel}</strong></header>
    <div className="casino-room-meta"><div><small>報名費</small><strong>NT${formatMoney(displayedFee)}</strong></div><div><small>房間人數</small><strong>{state.players.length} / {state.capacity ?? 5}</strong></div><div><small>獎池</small><strong>NT${formatMoney(fee * state.players.length)}</strong></div></div>
    {state.drawn.length > 0 && <div className="bingo-draws"><span>已開出 {state.drawn.length} 顆{state.status === "drawing" ? ` · 下一顆 ${secondsLeft} 秒` : ""}</span><strong className="latest-bingo-ball">{state.drawn.at(-1)}</strong><details><summary>查看全部開獎號碼</summary><div>{state.drawn.map((number) => <b key={number}>{number}</b>)}</div></details></div>}
    {state.status === "completed" ? <div className="room-entry-panel"><label className="room-fee-field"><span>建立下一輪並設定報名費</span><div><b>NT$</b><input aria-label="下一輪賓果報名費" type="number" min="100" max="10000" step="100" inputMode="numeric" value={entryFee} onChange={(event) => setEntryFee(event.target.value)} /></div><small>上一輪已結束，由下一位開房者設定新費用。</small></label><button className="casino-primary" disabled={busy || !signedIn || !validFee} onClick={() => onAction("join", { entryFee: requestedFee })}>建立下一輪賓果</button></div> : mine ? <div className="joined-room-panel">
      <div className="joined-room-copy"><span>{state.hostUserId === mine.id ? "你是房主" : "你已加入"}</span><strong>{state.status === "lobby" ? "由房主決定開始時間" : state.status === "strategy" ? `策略時間剩餘 ${secondsLeft} 秒` : state.status === "claiming" ? "正在確認本顆球的得主" : "你的賓果卡"}</strong><small>{state.status === "lobby" ? "至少兩人後，房主可以立即開始。" : state.status === "strategy" ? "選一個未標記格，再選同欄位的預告球。" : "亮起的數字代表已經開出；中央為免費格。"}</small></div>
      <div className="bingo-column-labels" aria-hidden="true"><b>B</b><b>I</b><b>N</b><b>G</b><b>O</b></div>
      <div className={`bingo-card ${state.status === "strategy" ? "strategy" : ""}`}>{mine.card.map((number, index) => { const marked = number === 0 || state.drawn.includes(number); return <button type="button" className={`${marked ? "marked" : ""} ${swapIndex === index ? "selected" : ""}`} key={`${index}-${number}`} disabled={state.status !== "strategy" || mine.swapped || marked} onClick={() => setSwapIndex(index)}>{number === 0 ? "FREE" : number}</button>; })}</div>
      {state.status === "strategy" && <div className="bingo-strategy"><span>預告球</span><div>{state.preview.map((number) => <button type="button" className={previewNumber === number ? "selected" : ""} key={number} disabled={mine.swapped} onClick={() => setPreviewNumber(number)}>{number}</button>)}</div><button className="casino-primary" disabled={busy || !canSwap} onClick={() => onAction("swap", { cardIndex: swapIndex, previewNumber })}>{mine.swapped ? "本局已完成換格" : "確認策略換格"}</button></div>}
      {state.status === "claiming" && eligibleWinner && <button className="casino-primary bingo-claim" disabled={busy || mine.claimed} onClick={() => onAction("claim")}>{mine.claimed ? "已喊賓果，等待結算" : "喊賓果！"}</button>}
      {state.status === "lobby" && state.hostUserId === mine.id && <button className="casino-primary" disabled={busy || state.players.length < 2} onClick={() => onAction("start")}>{state.players.length < 2 ? "至少需要兩位玩家" : "開始策略賓果"}</button>}
      {state.status === "lobby" && <button className="room-leave-button" disabled={busy} onClick={requestLeave}>離開房間並退還 NT${formatMoney(fee)}</button>}
    </div> : state.status === "lobby" && <div className="room-entry-panel">
      {hosting ? <label className="room-fee-field"><span>設定每人報名費</span><div><b>NT$</b><input aria-label="賓果報名費" type="number" min="100" max="10000" step="100" inputMode="numeric" value={entryFee} onChange={(event) => setEntryFee(event.target.value)} /></div><small>可設定 NT$100～10,000，開房後即鎖定。</small></label> : <div className="room-ready-copy"><span>房間已建立</span><strong>加入費用 NT${formatMoney(fee)}</strong><small>加入後立即開始公開開獎。</small></div>}
      <button className="casino-primary" disabled={busy || !signedIn || state.players.length >= 5 || (hosting && !validFee)} onClick={() => onAction("join", hosting ? { entryFee: requestedFee } : undefined)}>{signedIn ? hosting ? "建立賓果房間" : "加入這個房間" : "登入後加入"}</button>
    </div>}
    <div className="casino-player-list"><header><strong>房間玩家</strong><span>{state.players.length ? `${state.players.length} 人已就緒` : "尚未有人加入"}</span></header>{state.players.length ? state.players.map((player, index) => <div key={player.id}><b>{index + 1}</b><span><strong>{player.displayName}{player.isMine ? "（你）" : ""}</strong><small>{state.winnerIds.includes(player.id) ? "本顆球完成連線" : player.id === state.hostUserId ? "房主" : player.swapped ? "已完成策略換格" : "參賽中"}</small></span><em>最佳 {bingoProgress(player.card, state.drawn)}/5</em></div>) : <p>設定報名費，成為第一位開房玩家。</p>}</div>
    <LeaveConfirmDialog open={leaveConfirm} title="確定要離開賓果房間嗎？" detail="離開後會退出目前房間；若仍在報名階段，報名費會依房間規則退還。" onCancel={() => setLeaveConfirm(false)} onConfirm={confirmLeave} />
  </section>;
}

function DicePokerTable({ state, signedIn, busy, onAction }: { state: DicePokerState; signedIn: boolean; busy: boolean; onAction: (action: string, payload?: Record<string, unknown>) => void }) {
  const [entryFee, setEntryFee] = useState("100");
  const [held, setHeld] = useState<number[]>([]);
  const [leaveConfirm, setLeaveConfirm] = useState(false);
  const mine = state.players.find((player) => player.isMine);
  const hosting = state.status === "lobby" && !state.hostUserId;
  const fee = state.entryFee ?? 100;
  const requestedFee = Number(entryFee);
  const validFee = Number.isInteger(requestedFee) && requestedFee >= 100 && requestedFee <= 10_000;
  const toggleHeld = (index: number) => setHeld((current) => current.includes(index) ? current.filter((item) => item !== index) : [...current, index]);
  const reroll = () => { onAction("reroll", { held }); setHeld([]); };
  const statusLabel = state.status === "playing" ? "擲骰中" : state.status === "completed" ? "本輪結束" : "等待玩家";
  return <section className="casino-table social-casino-table dice-poker-table">
    <header><div><span>技巧遊戲</span><h3>五骰撲克</h3><p>保留想要的骰子，最多重擲兩次；牌型最高者獲得獎池</p></div><strong className={`room-status ${state.status}`}>{statusLabel}</strong></header>
    <div className="casino-room-meta"><div><small>報名費</small><strong>NT${formatMoney(fee)}</strong></div><div><small>房間人數</small><strong>{state.players.length} / {state.capacity ?? 5}</strong></div><div><small>獎池</small><strong>NT${formatMoney(fee * state.players.length)}</strong></div></div>
    {state.status === "completed" && !mine ? <div className="room-entry-panel"><label className="room-fee-field"><span>建立下一輪並設定報名費</span><div><b>NT$</b><input aria-label="下一輪骰子撲克報名費" type="number" min="100" max="10000" step="100" inputMode="numeric" value={entryFee} onChange={(event) => setEntryFee(event.target.value)} /></div></label><button className="casino-primary" disabled={busy || !signedIn || !validFee} onClick={() => onAction("join", { entryFee: requestedFee })}>建立下一輪骰子撲克</button></div> : mine ? <div className="joined-room-panel">
      <div className="joined-room-copy"><span>{state.hostUserId === mine.id ? "你是房主" : "你已加入"}</span><strong>{state.status === "lobby" ? "等待房主開始" : state.status === "playing" ? `剩餘 ${mine.rerollsLeft} 次重擲` : mine.result || "本輪已結束"}</strong><small>{state.status === "playing" && mine.status === "playing" ? "點擊骰子決定保留，再進行重擲或直接停手。" : "所有玩家完成後會自動比較牌型。"}</small></div>
      {mine.dice.length > 0 && <div className="dice-hand">{mine.dice.map((value, index) => <button type="button" key={index} className={held.includes(index) ? "held" : ""} disabled={state.status !== "playing" || mine.status !== "playing"} onClick={() => toggleHeld(index)}><b>{value}</b><small>{held.includes(index) ? "保留" : "點選保留"}</small></button>)}</div>}
      {state.status === "playing" && mine.status === "playing" && <div className="dice-actions"><button type="button" className="room-leave-button" disabled={busy} onClick={() => onAction("stand")}>停手比牌</button><button type="button" className="casino-primary" disabled={busy || mine.rerollsLeft <= 0} onClick={reroll}>重擲未保留骰子</button></div>}
      {state.status === "lobby" && state.hostUserId === mine.id && <button className="casino-primary" disabled={busy || state.players.length < 2} onClick={() => onAction("start")}>{state.players.length < 2 ? "至少需要兩位玩家" : "開始骰子撲克"}</button>}
      {state.status === "lobby" && <button className="room-leave-button" disabled={busy} onClick={() => setLeaveConfirm(true)}>離開房間並退還 NT${formatMoney(fee)}</button>}
    </div> : state.status === "lobby" && <div className="room-entry-panel">{hosting ? <label className="room-fee-field"><span>設定每人報名費</span><div><b>NT$</b><input aria-label="骰子撲克報名費" type="number" min="100" max="10000" step="100" inputMode="numeric" value={entryFee} onChange={(event) => setEntryFee(event.target.value)} /></div><small>可設定 NT$100～10,000，開房後即鎖定。</small></label> : <div className="room-ready-copy"><span>房間已建立</span><strong>加入費用 NT${formatMoney(fee)}</strong><small>房主會在 2～5 人時手動開始。</small></div>}<button className="casino-primary" disabled={busy || !signedIn || state.players.length >= 5 || (hosting && !validFee)} onClick={() => onAction("join", hosting ? { entryFee: requestedFee } : undefined)}>{signedIn ? hosting ? "建立骰子撲克房間" : "加入這個房間" : "登入後加入"}</button></div>}
    <div className="casino-player-list"><header><strong>房間玩家</strong><span>{state.players.length ? `${state.players.length} 人` : "尚未有人加入"}</span></header>{state.players.length ? state.players.map((player, index) => <div key={player.id}><b>{index + 1}</b><span><strong>{player.displayName}{player.isMine ? "（你）" : ""}</strong><small>{player.id === state.hostUserId ? "房主" : player.status === "done" ? "已停手" : state.status === "playing" ? `剩餘 ${player.rerollsLeft} 次` : "已就緒"}</small></span><em>{state.status === "completed" ? player.result : player.status === "done" ? "等待比牌" : "進行中"}</em></div>) : <p>設定報名費，成為第一位開房玩家。</p>}</div>
    <LeaveConfirmDialog open={leaveConfirm} title="確定要離開骰子撲克房間嗎？" detail="報名階段離開會退還報名費；遊戲開始後不能退出本輪。" onCancel={() => setLeaveConfirm(false)} onConfirm={() => { setLeaveConfirm(false); onAction("leave"); }} />
  </section>;
}

function TournamentTable({ state, signedIn, busy, onAction }: { state: TournamentState; signedIn: boolean; busy: boolean; onAction: (action: string, payload?: Record<string, unknown>) => void }) {
  const [entryFee, setEntryFee] = useState("500");
  const [raiseBy, setRaiseBy] = useState("10");
  const [leaveConfirm, setLeaveConfirm] = useState(false);
  const requestLeave = () => setLeaveConfirm(true);
  const confirmLeave = () => { setLeaveConfirm(false); onAction("leave"); };
  const joined = state.players.some((player) => player.isMine);
  const hosting = state.status === "lobby" && !state.hostUserId;
  const fee = state.entryFee ?? 500;
  const requestedFee = Number(entryFee);
  const validFee = Number.isInteger(requestedFee) && requestedFee >= 100 && requestedFee <= 10_000;
  const creatingRoom = hosting || state.status === "completed";
  const displayedFee = creatingRoom && validFee ? requestedFee : fee;
  const gameName = state.game === "poker" ? "德州撲克" : "二十一點";
  const isHost = Boolean(state.hostUserId && state.players.some((player) => player.isMine && player.id === state.hostUserId));
  const canStart = isHost && state.players.length >= 2;
  const statusLabel = state.status === "playing" ? `第 ${Math.min((state.currentRound ?? 0) + 1, state.roundLimit ?? 5)} / 5 局` : state.status === "completed" ? "賽事結束" : "等待玩家";
  const liveRound = state.round?.status === "playing";
  const liveGame = state.round?.game ?? state.game;
  const callAmount = Math.max(0, (state.round?.currentBet ?? 0) - (state.hand?.streetBet ?? 0));
  const blackjack = liveGame === "blackjack";
  const pokerTurn = Boolean(state.hand?.isTurn);
  const handStatus = (status: string) => status === "playing" ? "進行中" : status === "all_in" ? "已全押" : status === "stood" ? "已停牌" : status === "bust" ? "爆牌" : status === "folded" ? "已棄牌" : status === "complete" ? "本局完成" : "等待開局";
  return <section className="casino-table social-casino-table tournament-table">
    <header><div><span>CASINO TOURNAMENT</span><h3>五局積分錦標賽</h3><p>每局實際操作二十一點或德州撲克，完成五局後依總積分分配獎池</p></div><strong className={`room-status ${state.status}`}>{statusLabel}</strong></header>
    <div className="casino-room-meta"><div><small>比賽玩法</small><strong>{creatingRoom ? "房主決定" : gameName}</strong></div><div><small>報名費</small><strong>NT${formatMoney(displayedFee)}</strong></div><div><small>目前獎池</small><strong>NT${formatMoney(fee * state.players.length)}</strong></div></div>
    <div className="prize-split"><span>獎金分配</span><b>第 1 名 60%</b><b>第 2 名 30%</b><b>第 3 名 10%</b><small>只有 2 人時為 70% / 30% · 每局起始籌碼 {TOURNAMENT_STARTING_STACK} · 小盲 5／大盲 10</small></div>
    {(state.status === "completed" || (state.status === "lobby" && !joined)) && <div className="room-entry-panel tournament-entry-panel">
      {creatingRoom ? <label className="room-fee-field"><span>{state.status === "completed" ? "建立下一場並設定報名費" : "設定每人報名費"}</span><div><b>NT$</b><input aria-label="錦標賽報名費" type="number" min="100" max="10000" step="100" inputMode="numeric" value={entryFee} onChange={(event) => setEntryFee(event.target.value)} /></div><small>可設定 NT$100～10,000，選擇玩法後建立房間。</small></label> : <div className="room-ready-copy"><span>{gameName}房間已建立</span><strong>加入費用 NT${formatMoney(fee)}</strong><small>加入後由房主按「開始錦標賽」，不再等待倒數。</small></div>}
      <div className="tournament-game-options">{creatingRoom ? <><button disabled={busy || !signedIn || !validFee} onClick={() => onAction("join", { game: "blackjack", entryFee: requestedFee })}><b>21</b><span><strong>二十一點</strong><small>每人自行要牌或停牌，最後與莊家比較</small></span></button><button disabled={busy || !signedIn || !validFee} onClick={() => onAction("join", { game: "poker", entryFee: requestedFee })}><b>♠</b><span><strong>德州撲克</strong><small>輪流過牌、跟注、加注或棄牌</small></span></button></> : <button className="join-existing-room" disabled={busy || !signedIn} onClick={() => onAction("join", { game: state.game === "poker" ? "poker" : "blackjack" })}><b>{state.game === "poker" ? "♠" : "21"}</b><span><strong>加入{gameName}錦標賽</strong><small>報名費 NT${formatMoney(fee)}</small></span></button>}</div>
    </div>}
    {joined && state.status === "lobby" && <div className="joined-room-panel compact"><div className="joined-room-copy"><span>{isHost ? "你是房主" : "你已加入"}</span><strong>{isHost ? canStart ? "玩家已到齊，可以開始" : "等待另一位玩家加入" : "等待房主開始"}</strong><small>{gameName} · 5 局實際操作賽 · 報名費 NT${formatMoney(fee)} · 目前 {state.players.length} / 5 人</small></div><div className="tournament-lobby-actions"><button className="casino-primary" disabled={busy || !canStart} onClick={() => onAction("start")}>{isHost ? canStart ? "開始錦標賽" : "等待至少 2 位玩家" : "等待房主開始"}</button><button className="room-leave-button" disabled={busy} onClick={requestLeave}>離開並退還 NT${formatMoney(fee)}</button></div></div>}
    {joined && state.status === "playing" && !liveRound && <div className="joined-room-panel compact"><div className="joined-room-copy"><span>本局準備中</span><strong>下一局牌桌即將開啟</strong><small>每位玩家都要完成自己的牌局操作；不會直接隨機結算。</small></div></div>}
    {liveRound && blackjack && <div className="shared-blackjack-board tournament-live-board"><div className="shared-dealer"><span>共同莊家 · 開牌後比較點數</span><CardRow cards={state.round?.dealerCards ?? []} /></div><div className="shared-player-hands">{state.players.map((player) => <article className={player.isMine ? "mine" : ""} key={player.id}><header><strong>{player.seatNo} 號 · {player.displayName}{player.isMine ? "（你）" : ""}</strong><small>{handStatus(player.status)}{player.blackjackScore !== null ? ` · ${player.blackjackScore} 點` : ""}</small></header><CardRow cards={player.cards ?? []} />{player.result && <em>{player.result}</em>}</article>)}</div></div>}
    {liveRound && !blackjack && <div className="poker-board tournament-live-board"><div className="poker-community"><span>{state.round?.street === "preflop" ? "翻牌前" : state.round?.street === "flop" ? "翻牌圈" : state.round?.street === "turn" ? "轉牌圈" : "河牌圈"} · 獎池 {state.round?.pot ?? 0} 籌碼 · 本圈最高 {state.round?.currentBet ?? 0}</span>{state.round?.communityCards?.length ? <CardRow cards={state.round.communityCards} /> : <p>翻牌前下注中，公共牌尚未發出</p>}</div><div className="shared-player-hands">{state.players.map((player) => <article className={player.isMine ? "mine" : ""} key={player.id}><header><strong>{player.seatNo} 號 · {player.displayName}{player.isMine ? "（你）" : ""}</strong><small>{player.isTurn ? "輪到行動" : handStatus(player.status)} · 剩餘 {player.stack} 籌碼</small></header>{player.cards?.length ? <CardRow cards={player.cards} /> : <p>底牌覆蓋</p>}{player.result && <em>{player.result}</em>}</article>)}</div></div>}
    {liveRound && state.hand && <div className="tournament-controls">{blackjack ? state.hand.status === "playing" ? <div className="casino-controls"><button onClick={() => onAction("hit")} disabled={busy}>要牌</button><button onClick={() => onAction("stand")} disabled={busy}>停牌</button></div> : <p className="casino-message">{state.hand.result || "你已完成本局，等待其他玩家。"}</p> : state.hand.status === "playing" ? <div className="casino-controls"><button onClick={() => onAction("check")} disabled={busy || !pokerTurn || callAmount > 0}>過牌</button><button onClick={() => onAction("call")} disabled={busy || !pokerTurn || callAmount <= 0 || callAmount > state.hand.stack}>跟注 {callAmount}</button><input aria-label="錦標賽加注籌碼" type="number" min="10" max={Math.max(10, state.hand.stack - callAmount)} step="10" value={raiseBy} onChange={(event) => setRaiseBy(event.target.value)} /><button onClick={() => onAction("raise", { amount: Number(raiseBy) })} disabled={busy || !pokerTurn || Number(raiseBy) < 10 || callAmount + Number(raiseBy) > state.hand.stack}>加注</button><button className="all-in" onClick={() => onAction("all_in")} disabled={busy || !pokerTurn || state.hand.stack <= 0}>全押 {state.hand.stack}</button><button className="leave" onClick={() => onAction("fold")} disabled={busy || !pokerTurn}>棄牌</button>{!pokerTurn && <small className="casino-message">等待 {state.round?.turnSeat ?? "其他"} 號玩家行動。</small>}</div> : <p className="casino-message">{state.hand.status === "folded" ? "你已棄牌，可觀賽等待本局結束。" : state.hand.status === "all_in" ? "你已全押，等待其他玩家完成牌局。" : `等待 ${state.round?.turnSeat ?? "其他"} 號玩家行動。`}</p>}</div>}
    {state.latestResult && <p className="tournament-result">{state.latestResult}</p>}
    <div className="casino-player-list tournament-rankings"><header><strong>{liveRound ? "本局牌桌" : "即時排名"}</strong><span>{state.players.length} / {state.capacity ?? 5} 人</span></header>{state.players.length ? state.players.map((player, index) => <div key={player.id}><b>{index + 1}</b><span><strong>{player.displayName}{player.isMine ? "（你）" : ""}</strong><small>{liveRound ? `${handStatus(player.status)}${blackjack && player.blackjackScore !== null ? ` · ${player.blackjackScore} 點` : ""}${player.isTurn ? " · 行動中" : ""}` : player.latestHand || (player.id === state.hostUserId ? "房主 · 等待開賽" : "等待開賽")}</small></span><em>總分 {player.score} 分</em></div>) : <p>選擇玩法與報名費，建立第一場錦標賽。</p>}</div>
    <LeaveConfirmDialog open={leaveConfirm} title={`確定要離開${gameName}錦標賽嗎？`} detail="目前仍在等候開賽，確認離開後才會退出房間；已繳報名費會依房間狀態處理。" onCancel={() => setLeaveConfirm(false)} onConfirm={confirmLeave} />
  </section>;
}

function CasinoTable({ state, signedIn, busy, maxBet, onAction }: { state: CasinoState; signedIn: boolean; busy: boolean; maxBet: number; onAction: (action: string, payload?: Record<string, unknown>) => void }) {
  const [bet, setBet] = useState("100");
  const [leaveConfirm, setLeaveConfirm] = useState(false);
  const requestLeave = () => setLeaveConfirm(true);
  const confirmLeave = () => { setLeaveConfirm(false); onAction("leave"); };
  const [now, setNow] = useState(0);
  const active = state.hand && ["seated", "waiting", "playing", "stood", "settling"].includes(state.hand.status);
  const playing = state.hand?.status === "playing";
  const waiting = state.phase === "waiting";
  const roundPlaying = state.phase === "playing";
  const remaining = waiting ? Math.max(0, Math.ceil(((state.revealAt ?? 0) - now) / 1000)) : 0;
  useEffect(() => {
    if (!waiting) return;
    const timer = window.setInterval(() => setNow(currentWallClockMs()), 200);
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
      {state.hand?.status === "seated" ? <BetForm bet={bet} setBet={setBet} maxBet={maxBet} busy={busy} submitBet={submitBet} onLeave={requestLeave} /> : state.hand?.status === "waiting" ? <button className="table-leave" onClick={requestLeave} disabled={busy}>離開牌桌（下注不退）</button> : !active ? <p className="casino-message">選擇空位加入後，仍可在倒數結束前下注。</p> : null}
    </div> : roundPlaying ? <div className="casino-round-actions">
      {playing ? <div className="casino-controls"><button onClick={() => onAction("hit")} disabled={busy}>補牌</button><button onClick={() => onAction("stand")} disabled={busy}>停牌</button><button className="leave" onClick={requestLeave} disabled={busy}>離桌</button></div> : active ? <><p className="casino-message">{state.hand?.status === "seated" ? "你本局未下注，正在原座位觀賽。" : "你已完成行動，正在等待其他玩家。"}</p><button className="table-leave" onClick={requestLeave} disabled={busy}>離開牌桌</button></> : <p className="casino-message">目前正在觀賽，下一局可選擇空位加入。</p>}
    </div> : state.hand?.status === "seated" ? <><BetForm bet={bet} setBet={setBet} maxBet={maxBet} busy={busy} submitBet={submitBet} onLeave={requestLeave} />{state.hand.result && <p className="casino-result">{state.hand.result}</p>}</> : <p className="casino-message">請選擇上方任一空位加入遊戲。</p>}
    <LeaveConfirmDialog open={leaveConfirm} title="確定要離開牌桌嗎？" detail="如果本局已下注，下注金額不會因離桌而退回；你也可以先留下來觀賽。" onCancel={() => setLeaveConfirm(false)} onConfirm={confirmLeave} />
    <footer>先選座位再自訂下注 · 第一筆下注後等待 5 秒 · 連續 6 個遊戲小時未下注會自動離座 · 全桌同步顯示手牌</footer>
  </section>;
}

function PokerTable({ state, signedIn, busy, maxBet, onAction }: { state: PokerState; signedIn: boolean; busy: boolean; maxBet: number; onAction: (action: string, payload?: Record<string, unknown>) => void }) {
  const [blind, setBlind] = useState("100");
  const [raiseBy, setRaiseBy] = useState("100");
  const [leaveConfirm, setLeaveConfirm] = useState(false);
  const requestLeave = () => setLeaveConfirm(true);
  const confirmLeave = () => { setLeaveConfirm(false); onAction("leave"); };
  const active = Boolean(state.hand && ["seated", "ready", "playing", "all_in", "folded", "settling"].includes(state.hand.status));
  const readyCount = state.seats.filter((seat) => seat.status === "ready").length;
  const smallBlindSeat = state.seats.filter((seat) => seat.status === "ready").sort((left, right) => left.seatNo - right.seatNo)[0]?.seatNo;
  const isSmallBlind = Boolean(state.hand?.seatNo && smallBlindSeat === state.hand.seatNo);
  const playing = state.phase === "playing";
  const [now, setNow] = useState(currentWallClockMs());
  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setNow(currentWallClockMs()), 1_000);
    return () => window.clearInterval(timer);
  }, [playing]);
  const turnSeconds = playing && state.nextActionAt ? Math.max(0, Math.ceil((state.nextActionAt - now) / 1_000)) : 0;
  const callAmount = Math.max(0, (state.currentBet ?? 0) - (state.hand?.streetBet ?? 0));
  const streetLabel = ({ preflop: "翻牌前", flop: "翻牌圈", turn: "轉牌圈", river: "河牌圈", showdown: "攤牌" } as Record<string, string>)[state.street ?? ""] ?? "等待開局";
  return <section className="casino-table poker-table">
    <header><div><span>TEXAS HOLD&apos;EM TABLE 01</span><h4>五人同步德州撲克</h4></div><strong>{state.activeCount} / {state.capacity} 位在座 · {playing ? `${streetLabel} · 輪到 ${state.turnSeat} 號 · ${turnSeconds} 秒` : "等待新局"}</strong></header>
    <div className="casino-seats">{Array.from({ length: 5 }, (_, index) => {
      const seatNo = index + 1; const seat = state.seats.find((item) => item.seatNo === seatNo);
      return <div className={`${seat ? "occupied" : ""} ${seat?.isMine ? "mine" : ""}`} key={seatNo}>
        <span>{seatNo}</span><strong>{seat?.isMine ? `${seat.displayName}（你）` : seat?.displayName ?? "空位"}</strong>
        {!seat && signedIn && !playing && !active && <button onClick={() => onAction("join", { seatNo })} disabled={busy}>加入遊戲</button>}
        {seat && <small>{seat.status === "folded" ? "已棄牌" : seat.status === "all_in" ? `已全押 · 累計 NT$${formatMoney(seat.bet)}` : seat.status === "playing" ? `本圈 NT$${formatMoney(seat.streetBet ?? 0)} · 累計 NT$${formatMoney(seat.bet)}` : seat.status === "ready" ? "已準備" : seat.result ? "上一局已結算" : "等待準備"}</small>}
      </div>;
    })}</div>
    {(state.communityCards.length > 0 || playing) && <div className="poker-board">
      <div className="poker-community"><span>{streetLabel} · 獎池 NT$${formatMoney(state.pot)} · 本圈最高 NT$${formatMoney(state.currentBet ?? 0)}</span>{state.communityCards.length ? <CardRow cards={state.communityCards} /> : <p>翻牌前下注中，公共牌尚未發出</p>}</div>
      <div className="shared-player-hands">{state.seats.map((seat) => <article className={`${seat.isMine ? "mine" : ""} ${seat.cards.length ? "has-cards" : "spectator"}`} key={seat.id}>
        <header><strong>{seat.seatNo} 號 · {seat.displayName}{seat.isMine ? "（你）" : ""}</strong><small>{seat.status === "folded" ? "已棄牌" : seat.status === "all_in" ? `已全押 · 累計 NT$${formatMoney(seat.bet)}` : seat.cards.length ? `底牌 · 累計 NT$${formatMoney(seat.bet)}` : "等待開局"}</small></header>
        {seat.cards.length ? <CardRow cards={seat.cards} /> : <p>等待下一局</p>}
        {seat.result && <em>{seat.result}</em>}
      </article>)}</div>
    </div>}
    {!signedIn ? <p className="casino-message">登入後才能加入五人德州撲克牌桌。</p> : playing ? <div className="casino-round-actions">
      {state.hand?.isTurn ? <div className="casino-controls"><button onClick={() => onAction(callAmount ? "call" : "check")} disabled={busy || callAmount > maxBet}>{callAmount ? `跟注 NT$${formatMoney(callAmount)}` : "過牌"}</button><button onClick={() => onAction("raise", { amount: Number(raiseBy) })} disabled={busy || callAmount + Number(raiseBy) > maxBet}>加注</button><input aria-label="加注金額" type="number" min="10" step="10" value={raiseBy} onChange={(event) => setRaiseBy(event.target.value)} /><button className="all-in" onClick={() => onAction("all_in")} disabled={busy || maxBet <= 0}>全押 NT${formatMoney(maxBet)}</button><button className="leave" onClick={() => onAction("fold")} disabled={busy}>棄牌</button></div> : <p className="casino-message">{state.hand?.status === "folded" ? "你本局已棄牌，可繼續觀賽。" : state.hand?.status === "all_in" ? "你已全押，等待其他玩家完成牌局。" : `等待 ${state.turnSeat} 號玩家行動。`}</p>}
    </div> : state.hand?.status === "seated" ? <div className="custom-bet"><p className="casino-message">按下準備才會加入下一局；未準備的玩家不會被收取盲注。</p><button onClick={() => onAction("ready")} disabled={busy}>準備參加下一局</button><button className="leave-seat" onClick={requestLeave} disabled={busy}>離開牌桌</button>{state.hand.result && <p className="casino-result">{state.hand.result}</p>}</div> : state.hand?.status === "ready" ? <div className="custom-bet"><label>已準備（目前 {readyCount} 人）<small>小盲：{smallBlindSeat ?? "待定"} 號 · 只有小盲可開局</small></label>{isSmallBlind ? <div><span>大盲 NT$</span><input type="number" min="10" max={Math.min(maxBet, 100000)} step="10" value={blind} onChange={(event) => setBlind(event.target.value)} /><button onClick={() => onAction("start", { bet: Number(blind) })} disabled={busy || readyCount < 2}>開始牌局</button></div> : <p className="casino-message">等待 {smallBlindSeat ?? "小盲"} 號玩家設定大盲金額並開局。</p>}<button className="leave-seat" onClick={requestLeave} disabled={busy}>取消並離桌</button></div> : <p className="casino-message">請選擇空位加入；至少兩名玩家準備後才能開局。</p>}
    <LeaveConfirmDialog open={leaveConfirm} title="確定要離開德州撲克桌嗎？" detail="離開後會失去目前座位；牌局中的棄牌按鈕仍只代表棄牌，不會直接離桌。" onCancel={() => setLeaveConfirm(false)} onConfirm={confirmLeave} />
    <footer>標準 52 張牌 · 小盲玩家設定大盲並開局 · 每次行動限時 90 秒，逾時自動棄牌 · 連續 6 個遊戲小時未下注會自動離座 · 可全押並留到攤牌 · 勝者取得對應獎池</footer>
  </section>;
}

function CardRow({ cards }: { cards: string[] }) {
  return <div className="table-card-row">{cards.map((card, index) => <i className={/[♥♦]/.test(card) ? "red" : ""} key={`${card}-${index}`}>{card}</i>)}</div>;
}

function BetForm({ bet, setBet, maxBet, busy, submitBet, onLeave }: { bet: string; setBet: (value: string) => void; maxBet: number; busy: boolean; submitBet: (event: React.FormEvent) => void; onLeave: () => void }) {
  return <form className="custom-bet" onSubmit={submitBet}><label>輸入下注金額 <small>目前現金 NT${formatMoney(maxBet)}</small></label><div><span>NT$</span><input type="number" inputMode="numeric" min="1" max={Math.min(maxBet, 1_000_000)} step="1" value={bet} onChange={(event) => setBet(event.target.value)} required /><button disabled={busy || maxBet < 1}>確定下注</button></div><button className="leave-seat" type="button" onClick={onLeave} disabled={busy}>不下注，離開座位</button></form>;
}

function NpcResidents({ state, signedIn, busy, onTalk }: { state: NpcState; signedIn: boolean; busy: boolean; onTalk: (npcId: string) => void }) {
  return <section className="npc-residents" aria-labelledby="npc-residents-title">
    <header><div><span>這裡的人</span><h4 id="npc-residents-title">城市居民</h4></div><small>{state.note}</small></header>
    <div className="npc-resident-list">
      {state.residents.map((resident) => {
        const disabled = busy || !signedIn || !resident.available;
        const buttonLabel = !signedIn ? "登入後交談" : !resident.available ? "目前不在" : resident.interactedToday ? "查看今日對話" : "交談";
        return <article className={`npc-resident-card ${resident.accent} ${resident.available ? "available" : "absent"}`} key={resident.id}>
          <div className="npc-portrait" aria-hidden="true">{resident.portrait}</div>
          <div className="npc-resident-copy"><div><strong>{resident.name}</strong><span>{resident.relationLabel}</span></div><small>{resident.role} · {resident.schedule}</small><p>{resident.available ? resident.status : resident.absentText}</p></div>
          <button type="button" disabled={disabled} onClick={() => onTalk(resident.id)}>{buttonLabel}</button>
        </article>;
      })}
    </div>
  </section>;
}

function NpcDialogue({ resident, busy, onClose, onChoose }: { resident: NpcResident; busy: boolean; onClose: () => void; onChoose: (choiceId: string) => void }) {
  const cardRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const card = cardRef.current;
    const focusable = () => card ? Array.from(card.querySelectorAll<HTMLElement>("button:not([disabled])")) : [];
    window.setTimeout(() => focusable()[0]?.focus(), 0);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); onClose(); return; }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0]; const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => { window.removeEventListener("keydown", handleKeyDown); previous?.focus(); };
  }, [onClose]);
  const titleId = `npc-dialog-${resident.id}`;
  const descriptionId = `npc-dialog-description-${resident.id}`;
  return <div className="auth-overlay npc-dialog-overlay" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId} onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
    <section ref={cardRef} className={`npc-dialog-card ${resident.accent}`}>
      <button type="button" className="npc-dialog-close" aria-label={`關閉與${resident.name}的對話`} onClick={onClose}>×</button>
      <header><div className="npc-dialog-portrait" aria-hidden="true">{resident.portrait}</div><div><span>{resident.role}</span><h2 id={titleId}>{resident.name}</h2><small>關係：{resident.relationLabel}</small></div></header>
      {resident.interactedToday ? <div className="npc-dialog-result"><span>今日的對話</span><p id={descriptionId}>{resident.lastOutcome || `${resident.name}今天暫時沒有其他事情。`}</p><button type="button" onClick={onClose}>結束交談</button></div> : resident.event ? <div className="npc-dialog-event">
        <span>今日事件</span><h3>{resident.event.title}</h3><p id={descriptionId}>{resident.event.prompt}</p>
        <div className="npc-dialog-choices">{resident.event.choices.map((choice) => <button type="button" key={choice.id} disabled={busy} onClick={() => onChoose(choice.id)}><strong>{choice.label}</strong><small>{choice.detail}</small></button>)}</div>
      </div> : <div className="npc-dialog-result"><span>目前狀態</span><p id={descriptionId}>{resident.absentText}</p><button type="button" onClick={onClose}>知道了</button></div>}
    </section>
  </div>;
}

function actionTitle(location: LocationId) {
  return { home: "把住所經營成真正能生活的地方", realtor: "先找到住所，再打造自己的生活", bank: "管理資產，也要衡量借貸成本", business: "累積經驗，向下一次升遷前進", shopping: "照顧日常，才能走得更遠", bookstore: "讓故事被看見，也讓作品流通", hotel: "沒有住所，也能有一晚落腳處", casino: "五人同桌，挑戰二十一點與德州撲克", school: "今天學會的，會成為明天的選項", hospital: "及早治療，才能繼續人生旅程", underpass: "在街頭尋找資源，也建立彼此照應的方式", prison: "為違法行為付出時間代價" }[location];
}

function actionDescription(location: LocationId, dailyRent = 350) {
  return { home: "全天 24 小時開放。可選短休或完整睡眠、在家料理、每日整理；買下城市小宅後還能永久升級舒適度。", realtor: `營業時間 07:00～23:00。租屋每日 NT$${formatMoney(dailyRent)}；城市小宅售價 NT$50,000。`, bank: "營業時間 07:00～23:00。存款收益依金融職位而定；一般貸款每日利息 0.5%；《浪子回頭》主線債務每日利息 0.2%。在線玩家也能申請金融玩家的銀行貸款方案。", business: "營業時間 06:00～24:00。第一階工作免能力門檻；各產業最高階時薪皆為 NT$1,300。犯罪路線的違法行動有被捕風險；詐騙犯可發起詐騙，駭客可嘗試竊取在線玩家現金。大橋頭營運長可設定一處地盤，每次有效進入記錄 NT$100，每日最多 NT$10,000。", shopping: "營業時間 06:00～24:00。用合理的花費補充飽足，也能購買刮刮樂；街頭背包物品可在此回收或出售。", bookstore: "營業時間 07:00～23:00。簽約作家起可建立書名並上架作品；其他玩家可以購買，每本每人最多十次。", hotel: "全天 24 小時營業。旅店臨時工等待 30 秒、收入 NT$100，不扣體力、飽足或健康，也不會獲得職業經驗；住宿與餐點也全天供應。", casino: "全天 24 小時開放。二十一點、德州撲克、多人賓果與五局錦標賽皆可實際同桌遊玩。", school: "開放時間 07:00～23:00。五所學院分別培養體力、智力、創造力、社交與魅力。", hospital: "健康低於 50 時，行動後開始有機率生病。急診 24 小時開放；一般診療為 07:00～23:00。", underpass: "全天 24 小時開放。街頭生存職業在此拾荒、使用背包與開設互助箱；乞討與分享食物可從多人世界操作。", prison: "服刑期間只計算你在線上遊玩的時間；其他玩家可在多人世界看到你的罪名與服刑狀態。" }[location];
}
