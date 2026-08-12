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
export const ALL_JOBS = JOB_CATEGORIES.flatMap((category) => category.jobs.map((job) => ({ job, categoryId: category.id, categoryLabel: category.label })));

export function categoryInfo(categoryId: string) {
  return JOB_CATEGORIES.find((category) => category.id === categoryId) ?? null;
}

export function jobInfo(job: string) {
  return ALL_JOBS.find((item) => item.job === job) ?? null;
}

export function careerForCategory(categoryId: string, exp: number, fallback = "待業者") {
  const category = categoryInfo(categoryId);
  if (!category || category.id === "unfixed") return { title: fallback === "流浪者" ? "流浪者" : "待業者", hourlyPay: 0, threshold: 0, index: 0 };
  let index = 0;
  for (let cursor = 0; cursor < category.jobs.length; cursor += 1) {
    if (exp >= CAREER_THRESHOLDS[cursor]) index = cursor;
  }
  return { title: category.jobs[index], hourlyPay: CAREER_PAY[index], threshold: CAREER_THRESHOLDS[index], index };
}

export function nextCareerForCategory(categoryId: string, exp: number) {
  const category = categoryInfo(categoryId);
  if (!category || category.id === "unfixed") return null;
  const current = careerForCategory(categoryId, exp);
  const nextIndex = current.index + 1;
  if (nextIndex >= category.jobs.length) return null;
  return { title: category.jobs[nextIndex], threshold: CAREER_THRESHOLDS[nextIndex], hourlyPay: CAREER_PAY[nextIndex], index: nextIndex };
}
