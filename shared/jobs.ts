export const JOB_CATEGORIES = [
  { id: "office", label: "一般職場", jobs: ["行政助理", "行政專員", "資深行政專員", "行政主管"] },
  { id: "medical", label: "醫療照護", jobs: ["診所助理", "護理師", "資深護理師", "護理長"] },
  { id: "finance", label: "商業金融", jobs: ["銀行員", "理財專員", "投資顧問", "分行經理"] },
  { id: "literary", label: "文學作家", jobs: ["寫作助理", "無名作家", "簽約作家", "暢銷作家"] },
  { id: "hospitality", label: "餐飲服務", jobs: ["廚房助理", "廚師", "主廚", "餐廳老闆"] },
  { id: "crime", label: "犯罪路線", jobs: ["詐騙犯", "駭客", "走私者", "大橋頭營運長"] },
  { id: "freelance", label: "自由工作", jobs: ["攝影師", "翻譯", "接案設計師", "顧問", "家教", "街頭藝人"] },
  { id: "unfixed", label: "無固定職業", jobs: ["待業者", "流浪者"] },
] as const;

export const CAREER_THRESHOLDS = [0, 100, 250, 500, 900, 1400, 2000, 2700] as const;
export const CAREER_PAY = [180, 230, 300, 400, 550, 750, 1000, 1300] as const;
export const ABILITY_LABELS = {
  physical: "體力",
  intelligence: "智力",
  creativity: "創造力",
  social: "社交",
  charisma: "魅力",
} as const;
export const ABILITY_MAX = 1500;

export type AbilityKey = keyof typeof ABILITY_LABELS;
export type Abilities = Record<AbilityKey, number>;

export const ACADEMIES = [
  { id: "fitness", name: "健身學院", icon: "健", gains: { physical: 25, charisma: 5 } },
  { id: "science", name: "科學學院", icon: "科", gains: { intelligence: 25, creativity: 5 } },
  { id: "art", name: "藝術學院", icon: "藝", gains: { creativity: 25, charisma: 5 } },
  { id: "performance", name: "表演學院", icon: "演", gains: { charisma: 20, social: 15 } },
  { id: "business", name: "商業學院", icon: "商", gains: { social: 20, intelligence: 10 } },
] as const;

const CAREER_ABILITY_PROFILE: Record<string, readonly [AbilityKey, AbilityKey]> = {
  office: ["social", "intelligence"],
  medical: ["intelligence", "social"],
  finance: ["social", "intelligence"],
  literary: ["creativity", "charisma"],
  hospitality: ["social", "charisma"],
  crime: ["intelligence", "social"],
  freelance: ["creativity", "social"],
};

const PRIMARY_REQUIREMENTS = [10, 40, 80, 140, 220, 320, 440, 580] as const;
const SECONDARY_REQUIREMENTS = [5, 20, 40, 70, 110, 160, 220, 300] as const;
export const ALL_JOBS = JOB_CATEGORIES.flatMap((category) => category.jobs.map((job) => ({ job, categoryId: category.id, categoryLabel: category.label })));

export const CAREER_WORK_SPECIALS = {
  "行政助理": { name: "超長班", hours: 10, minutes: 5 },
  "行政專員": { name: "爆肝", hours: 11, minutes: 5 },
  "資深行政專員": { name: "摸魚", hours: 8, minutes: 3 },
  "行政主管": { name: "準時下班", hours: 8, minutes: 2 },
  "銀行員": { name: "櫃檯加班", hours: 9, minutes: 3 },
  "理財專員": { name: "客戶開發", hours: 10, minutes: 4 },
  "投資顧問": { name: "市場研判", hours: 8, minutes: 3 },
  "分行經理": { name: "準時關帳", hours: 8, minutes: 2 },
  "診所助理": { name: "基本照護", hours: 8, minutes: 2 },
  "護理師": { name: "輪班津貼", hours: 9, minutes: 3 },
  "資深護理師": { name: "臨床專注", hours: 8, minutes: 3 },
  "護理長": { name: "準時交班", hours: 8, minutes: 2 },
  "廚房助理": { name: "備料班", hours: 4, minutes: 2 },
  "廚師": { name: "出餐高峰班", hours: 6, minutes: 3 },
  "主廚": { name: "品質監修班", hours: 8, minutes: 4 },
  "餐廳老闆": { name: "餐廳營運班", hours: 8, minutes: 4 },
  "詐騙犯": { name: "話術行動", hours: 4, minutes: 2 },
  "駭客": { name: "系統入侵", hours: 6, minutes: 3 },
  "走私者": { name: "地下運貨", hours: 8, minutes: 4 },
  "大橋頭營運長": { name: "地盤巡查", hours: 8, minutes: 4 },
} as const;

export const HOSPITALITY_SPECIAL_HUNGER = {
  "廚房助理": 10,
  "廚師": 20,
  "主廚": 30,
  "餐廳老闆": 40,
} as const;

export const RESTAURANT_PURCHASE_PRICE = 400_000;
export const RESTAURANT_DAILY_GROSS = 20_000;
export const RESTAURANT_DAILY_COST = 5_000;
export const RESTAURANT_DAILY_NET = RESTAURANT_DAILY_GROSS - RESTAURANT_DAILY_COST;

export const CRIME_ARREST_CHANCES = {
  "詐騙犯": 0.12,
  "駭客": 0.16,
  "走私者": 0.20,
  "大橋頭營運長": 0.18,
} as const;
export const CRIME_SENTENCE_MINUTES = {
  "詐騙犯": 120,
  "駭客": 180,
  "走私者": 240,
  "大橋頭營運長": 300,
} as const;
export const HACK_SUCCESS_CHANCE = 0.20;
export const HACK_STEAL_RATE = 0.10;
export const HACK_MAX_STEAL = 5_000;
export const HACK_DAILY_LIMIT = 3;
export const TERRITORY_VISIT_REWARD = 100;
export const TERRITORY_DAILY_CAP = 10_000;
export const TERRITORY_VISIT_COOLDOWN_MINUTES = 30;

export const MEDICAL_HOSPITAL_DISCOUNTS = {
  "診所助理": 0.05,
  "護理師": 0.10,
  "資深護理師": 0.15,
  "護理長": 0.20,
} as const;

export const MEDICAL_TREATMENT_SERVICES = {
  "護理師": { name: "護理師照護", health: 20, price: 300, minutes: 15 },
  "資深護理師": { name: "資深護理照護", health: 35, price: 600, minutes: 20 },
  "護理長": { name: "護理長照護", health: 50, price: 900, minutes: 25 },
} as const;

export const MEDICAL_WORK_HEALTH_BONUS = 6;

export const FINANCE_DEPOSIT_RATES_BP = {
  "銀行員": 12,
  "理財專員": 14,
  "投資顧問": 16,
  "分行經理": 18,
} as const;

export const FINANCE_LOAN_TERMS = {
  "銀行員": { rateBp: 48, spreadBp: 2 },
  "理財專員": { rateBp: 45, spreadBp: 5 },
  "投資顧問": { rateBp: 42, spreadBp: 8 },
  "分行經理": { rateBp: 40, spreadBp: 10 },
} as const;

export const BANK_DEPOSIT_RATE_BP = 10;
export const BANK_LOAN_RATE_BP = 50;

export const WRITER_FAN_THRESHOLDS = [0, 100, 500, 2_000] as const;
export const WRITER_FAN_RANGES = {
  "寫作助理": [0, 20],
  "無名作家": [10, 40],
  "簽約作家": [25, 80],
  "暢銷作家": [60, 180],
} as const;
export const WRITER_BOOK_PRICES = {
  "簽約作家": 200,
  "暢銷作家": 300,
} as const;
export const WRITER_DAILY_FAN_RATE = 1;
export const WRITER_DAILY_WRITING_LIMIT = 2;
export const WRITER_MAX_ACTIVE_BOOKS = 10;
export const WRITER_MAX_PURCHASES_PER_BOOK = 10;

export function medicalHospitalDiscountFor(job: string) {
  return MEDICAL_HOSPITAL_DISCOUNTS[job as keyof typeof MEDICAL_HOSPITAL_DISCOUNTS] ?? 0;
}

export function medicalTreatmentFor(job: string) {
  return MEDICAL_TREATMENT_SERVICES[job as keyof typeof MEDICAL_TREATMENT_SERVICES] ?? null;
}

export function medicalWorkHealthBonusFor(job: string) {
  return jobInfo(job)?.categoryId === "medical" ? MEDICAL_WORK_HEALTH_BONUS : 0;
}

export function hospitalitySpecialHungerFor(job: string) {
  return HOSPITALITY_SPECIAL_HUNGER[job as keyof typeof HOSPITALITY_SPECIAL_HUNGER] ?? 0;
}

export function crimeArrestChanceFor(job: string) {
  return CRIME_ARREST_CHANCES[job as keyof typeof CRIME_ARREST_CHANCES] ?? 0;
}

export function crimeSentenceMinutesFor(job: string) {
  return CRIME_SENTENCE_MINUTES[job as keyof typeof CRIME_SENTENCE_MINUTES] ?? 0;
}

export function financeDepositRateFor(job: string) {
  return FINANCE_DEPOSIT_RATES_BP[job as keyof typeof FINANCE_DEPOSIT_RATES_BP] ?? BANK_DEPOSIT_RATE_BP;
}

export function financeLoanTermsFor(job: string) {
  return FINANCE_LOAN_TERMS[job as keyof typeof FINANCE_LOAN_TERMS] ?? null;
}

export function writerFanRangeFor(job: string) {
  return WRITER_FAN_RANGES[job as keyof typeof WRITER_FAN_RANGES] ?? null;
}

export function writerBookPriceFor(job: string) {
  return WRITER_BOOK_PRICES[job as keyof typeof WRITER_BOOK_PRICES] ?? null;
}

export function careerWorkSpecialFor(job: string, hours?: number) {
  const special = CAREER_WORK_SPECIALS[job as keyof typeof CAREER_WORK_SPECIALS];
  return special && (hours === undefined || special.hours === hours) ? special : null;
}

export function categoryInfo(categoryId: string) {
  return JOB_CATEGORIES.find((category) => category.id === categoryId) ?? null;
}

export function jobInfo(job: string) {
  return ALL_JOBS.find((item) => item.job === job) ?? null;
}

export function careerRequirements(categoryId: string, index: number): Partial<Abilities> {
  const profile = CAREER_ABILITY_PROFILE[categoryId];
  if (!profile) return {};
  if (index === 0) return { [profile[0]]: 0, [profile[1]]: 0 };
  if (categoryId === "literary") return {};
  if (categoryId === "medical" || categoryId === "finance") {
    const requirements: Partial<Abilities>[] = [
      { intelligence: 0, social: 0 },
      { intelligence: 40, social: 20 },
      { intelligence: 80, social: 40 },
      { intelligence: 140, social: 70 },
    ];
    return requirements[index] ?? requirements.at(-1)!;
  }
  if (categoryId === "hospitality") {
    const requirements: Partial<Abilities>[] = [
      { social: 0, charisma: 0 },
      { social: 30, charisma: 20 },
      { social: 70, charisma: 50 },
      { social: 130, charisma: 90 },
    ];
    return requirements[index] ?? requirements.at(-1)!;
  }
  if (categoryId === "crime") {
    const requirements: Partial<Abilities>[] = [
      { social: 0, intelligence: 0 },
      { intelligence: 40, social: 20 },
      { social: 70, charisma: 40 },
      { intelligence: 100, social: 80, charisma: 60 },
    ];
    return requirements[index] ?? requirements.at(-1)!;
  }
  const tier = normalizedCareerTier(categoryId, index);
  return {
    [profile[0]]: PRIMARY_REQUIREMENTS[tier] ?? PRIMARY_REQUIREMENTS.at(-1),
    [profile[1]]: SECONDARY_REQUIREMENTS[tier] ?? SECONDARY_REQUIREMENTS.at(-1),
  };
}

function normalizedCareerTier(categoryId: string, index: number) {
  const category = categoryInfo(categoryId);
  if (!category || category.jobs.length <= 1) return 0;
  return Math.round((index * (CAREER_THRESHOLDS.length - 1)) / (category.jobs.length - 1));
}

export function careerThresholdForCategory(categoryId: string, index: number) {
  if (categoryId === "literary") return WRITER_FAN_THRESHOLDS[index] ?? WRITER_FAN_THRESHOLDS.at(-1)!;
  if (categoryId === "medical" || categoryId === "finance" || categoryId === "hospitality" || categoryId === "crime") return [0, 100, 250, 500][index] ?? 500;
  return CAREER_THRESHOLDS[normalizedCareerTier(categoryId, index)] ?? CAREER_THRESHOLDS.at(-1)!;
}

export function careerPayForCategory(categoryId: string, index: number) {
  if (categoryId === "literary") return 0;
  return CAREER_PAY[normalizedCareerTier(categoryId, index)] ?? CAREER_PAY.at(-1)!;
}

export function meetsCareerRequirements(abilities: Abilities, requirements: Partial<Abilities>) {
  return Object.entries(requirements).every(([key, value]) => abilities[key as AbilityKey] >= (value ?? 0));
}

export function careerForCategory(categoryId: string, exp: number, fallback = "待業者", abilities?: Abilities) {
  const category = categoryInfo(categoryId);
  if (!category || category.id === "unfixed") return { title: fallback === "流浪者" ? "流浪者" : "待業者", hourlyPay: 0, threshold: 0, index: 0 };
  const existingIndex = category.jobs.findIndex((job) => job === fallback);
  let index = Math.max(0, existingIndex);
  for (let cursor = index + 1; cursor < category.jobs.length; cursor += 1) {
    if (exp >= careerThresholdForCategory(categoryId, cursor) && (!abilities || meetsCareerRequirements(abilities, careerRequirements(categoryId, cursor)))) index = cursor;
  }
  return { title: category.jobs[index], hourlyPay: careerPayForCategory(categoryId, index), threshold: careerThresholdForCategory(categoryId, index), index };
}

export function nextCareerForCategory(categoryId: string, exp: number, fallback = "待業者", abilities?: Abilities) {
  const category = categoryInfo(categoryId);
  if (!category || category.id === "unfixed") return null;
  const current = careerForCategory(categoryId, exp, fallback, abilities);
  const nextIndex = current.index + 1;
  if (nextIndex >= category.jobs.length) return null;
  return { title: category.jobs[nextIndex], threshold: careerThresholdForCategory(categoryId, nextIndex), hourlyPay: careerPayForCategory(categoryId, nextIndex), index: nextIndex, requirements: careerRequirements(categoryId, nextIndex) };
}
