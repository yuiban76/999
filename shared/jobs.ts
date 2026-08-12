export const JOB_CATEGORIES = [
  { id: "office", label: "一般職場", jobs: ["行政人員", "業務", "客服", "會計", "人資", "專案經理", "公務員"] },
  { id: "technology", label: "科技產業", jobs: ["程式設計師", "資料科學家", "資安工程師", "遊戲開發者", "AI 研究員"] },
  { id: "medical", label: "醫療照護", jobs: ["醫師", "護理師", "藥師", "心理師", "獸醫", "長照人員"] },
  { id: "education", label: "教育研究", jobs: ["教師", "教授", "補習班老師", "研究員", "校長"] },
  { id: "law", label: "法律治安", jobs: ["律師", "法官", "警察", "消防員", "偵探", "鑑識人員"] },
  { id: "finance", label: "商業金融", jobs: ["銀行員", "投資人", "保險顧問", "房仲", "企業家", "創投合夥人"] },
  { id: "creative", label: "創意娛樂", jobs: ["作家", "畫家", "設計師", "演員", "歌手", "導演", "實況主", "網紅"] },
  { id: "hospitality", label: "餐飲服務", jobs: ["廚師", "咖啡師", "調酒師", "餐廳老闆", "旅館經理", "導遊"] },
  { id: "nature", label: "自然環境", jobs: ["農夫", "漁夫", "園藝師", "森林巡護員", "氣象學家", "環保顧問"] },
  { id: "transport", label: "運輸物流", jobs: ["司機", "快遞員", "列車駕駛", "機師", "船長", "物流主管"] },
  { id: "sports", label: "運動競技", jobs: ["職業球員", "賽車手", "格鬥選手", "教練", "裁判", "健身教練"] },
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
  technology: ["intelligence", "creativity"],
  medical: ["intelligence", "social"],
  education: ["intelligence", "social"],
  law: ["intelligence", "physical"],
  finance: ["social", "intelligence"],
  creative: ["creativity", "charisma"],
  hospitality: ["social", "charisma"],
  nature: ["physical", "intelligence"],
  transport: ["physical", "intelligence"],
  sports: ["physical", "charisma"],
  freelance: ["creativity", "social"],
};

const PRIMARY_REQUIREMENTS = [10, 40, 80, 140, 220, 320, 440, 580] as const;
const SECONDARY_REQUIREMENTS = [5, 20, 40, 70, 110, 160, 220, 300] as const;
export const ALL_JOBS = JOB_CATEGORIES.flatMap((category) => category.jobs.map((job) => ({ job, categoryId: category.id, categoryLabel: category.label })));

export function categoryInfo(categoryId: string) {
  return JOB_CATEGORIES.find((category) => category.id === categoryId) ?? null;
}

export function jobInfo(job: string) {
  return ALL_JOBS.find((item) => item.job === job) ?? null;
}

export function careerRequirements(categoryId: string, index: number): Partial<Abilities> {
  const profile = CAREER_ABILITY_PROFILE[categoryId];
  if (!profile) return {};
  return {
    [profile[0]]: PRIMARY_REQUIREMENTS[index] ?? PRIMARY_REQUIREMENTS.at(-1),
    [profile[1]]: SECONDARY_REQUIREMENTS[index] ?? SECONDARY_REQUIREMENTS.at(-1),
  };
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
    if (exp >= CAREER_THRESHOLDS[cursor] && (!abilities || meetsCareerRequirements(abilities, careerRequirements(categoryId, cursor)))) index = cursor;
  }
  return { title: category.jobs[index], hourlyPay: CAREER_PAY[index], threshold: CAREER_THRESHOLDS[index], index };
}

export function nextCareerForCategory(categoryId: string, exp: number, fallback = "待業者", abilities?: Abilities) {
  const category = categoryInfo(categoryId);
  if (!category || category.id === "unfixed") return null;
  const current = careerForCategory(categoryId, exp, fallback, abilities);
  const nextIndex = current.index + 1;
  if (nextIndex >= category.jobs.length) return null;
  return { title: category.jobs[nextIndex], threshold: CAREER_THRESHOLDS[nextIndex], hourlyPay: CAREER_PAY[nextIndex], index: nextIndex, requirements: careerRequirements(categoryId, nextIndex) };
}
