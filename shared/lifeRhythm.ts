export const LIFE_PLAN_CYCLE_DAYS = 3;
export const LIFE_PLAN_COMPLETION_TALENT_EXP = 6;
export const LIFE_PLAN_PARTIAL_TALENT_EXP = 2;
export const LIFE_PLAN_CAREER_TARGET = 14;
export const LIFE_PLAN_HOME_DAY_TARGET = 2;
export const LIFE_PLAN_NPC_TARGET = 2;
export const LIFE_PLAN_SOCIAL_TARGET = 2;

export type LifePlanKey = "debt" | "career" | "health" | "social";
export type LifePlanEffectKey = "financial_rhythm" | "career_momentum" | "healthy_routine" | "human_warmth" | "";

export type LifePlanDefinition = {
  key: LifePlanKey;
  title: string;
  shortDescription: string;
  howToPlay: string[];
  rewardName: string;
  rewardDescription: string;
  effect: LifePlanEffectKey;
};

export const LIFE_PLAN_DEFINITIONS: readonly LifePlanDefinition[] = [
  {
    key: "debt",
    title: "債務整頓",
    shortDescription: "用三個玩家日建立主動還款節奏。",
    howToPlay: ["前往城市銀行主動還款", "三日內達成畫面顯示的還款目標"],
    rewardName: "財務節律",
    rewardDescription: "下一次主動還款額外獲得 2 點天賦經驗。",
    effect: "financial_rhythm",
  },
  {
    key: "career",
    title: "職涯突破",
    shortDescription: "把工作、寫作、學習與職業行動轉成職涯進度。",
    howToPlay: ["一般工作每小時 1 點", "寫作或上課 4 點，拾荒 2 點", "三日內累積 14 點"],
    rewardName: "職涯動能",
    rewardDescription: "下一次一般工作增加 10% 職業經驗，不增加薪資。",
    effect: "career_momentum",
  },
  {
    key: "health",
    title: "健康生活",
    shortDescription: "用住所活動穩定體力、健康與飽足。",
    howToPlay: ["三日內在兩個不同玩家日完成住所活動", "結算時健康至少 75、飽足至少 60"],
    rewardName: "規律作息",
    rewardDescription: "下一次完整睡眠額外恢復 3 點健康。",
    effect: "healthy_routine",
  },
  {
    key: "social",
    title: "社會連結",
    shortDescription: "與城市居民及其他玩家建立真正的往來。",
    howToPlay: ["與兩名不同 NPC 完成重要互動", "與兩名不同玩家完成有效互動", "重複找同一人不會累計"],
    rewardName: "人情溫度",
    rewardDescription: "下一次 NPC 互動額外增加 2 點關係。",
    effect: "human_warmth",
  },
] as const;

export function lifePlanDefinition(key: string) {
  return LIFE_PLAN_DEFINITIONS.find((plan) => plan.key === key) ?? null;
}

export function lifePlanDebtTarget(loanBalance: number, dailyMinimumPayment: number) {
  return Math.max(dailyMinimumPayment * LIFE_PLAN_CYCLE_DAYS, Math.ceil(Math.max(0, loanBalance) * 0.01));
}

export function lifePlanCareerPoints(action: string, value = 0) {
  if (action === "work") return Math.max(1, Math.floor(value));
  if (action === "writer_write" || action === "study") return 4;
  if (action === "street_scavenge") return 2;
  if (action === "city_commission") return 2;
  return 0;
}

export function lifePlanProgressPercent(current: number, target: number) {
  if (target <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round(current / target * 100)));
}
