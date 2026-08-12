export const JOB_CATEGORIES = [
  { id: "office", label: "一般職場", jobs: ["行政人員", "業務", "客服", "會計", "人資", "專案經理", "公務員"] },
  { id: "technology", label: "科技產業", jobs: ["程式設計師", "資料科學家", "資安工程師", "遊戲開發者", "AI 研究員"] },
  { id: "medical", label: "醫療照護", jobs: ["醫師", "護理師", "藥師", "心理師", "獸醫", "長照人員"] },
  { id: "education", label: "教育研究", jobs: ["教師", "教授", "補習班老師", "研究員", "校長"] },
  { id: "law", label: "法律治安", jobs: ["律師", "法官", "警察", "消防員", "偵探", "鑑識人員"] },
  { id: "finance", label: "商業金融", jobs: ["銀行員", "投資人", "保險顧問", "房仲", "企業家", "創投合夥人"] },
  { id: "creative", label: "創意娛樂", jobs: ["作家", "畫家", "設計師", "演員", "歌手", "導演", "實況主", "網紅"] },
  { id: "engineering", label: "工程製造", jobs: ["建築師", "機械工程師", "技師", "電工", "木工", "汽車維修員"] },
  { id: "hospitality", label: "餐飲服務", jobs: ["廚師", "咖啡師", "調酒師", "餐廳老闆", "旅館經理", "導遊"] },
  { id: "nature", label: "自然環境", jobs: ["農夫", "漁夫", "園藝師", "森林巡護員", "氣象學家", "環保顧問"] },
  { id: "transport", label: "運輸物流", jobs: ["司機", "快遞員", "列車駕駛", "機師", "船長", "物流主管"] },
  { id: "sports", label: "運動競技", jobs: ["職業球員", "賽車手", "格鬥選手", "教練", "裁判", "健身教練"] },
  { id: "freelance", label: "自由工作", jobs: ["攝影師", "翻譯", "接案設計師", "顧問", "家教", "街頭藝人"] },
  { id: "underground", label: "灰色或犯罪路線", jobs: ["詐騙犯", "駭客", "走私者", "幫派成員", "地下賭場老闆"] },
  { id: "special", label: "特殊職業", jobs: ["太空人", "外交官", "考古學家", "特務", "賞金獵人", "宗教領袖"] },
  { id: "unfixed", label: "無固定職業", jobs: ["家庭主夫／主婦", "學生", "退休者", "待業者", "繼承人", "流浪者"] },
] as const;

export const JOB_RANKS = [
  { threshold: 0, label: "見習", hourlyPay: 180 },
  { threshold: 100, label: "正式", hourlyPay: 230 },
  { threshold: 250, label: "資深", hourlyPay: 300 },
  { threshold: 500, label: "主管", hourlyPay: 400 },
  { threshold: 900, label: "首席", hourlyPay: 550 },
] as const;

export const ALL_JOBS = JOB_CATEGORIES.flatMap((category) => category.jobs.map((job) => ({ job, categoryId: category.id, categoryLabel: category.label })));

export function jobInfo(job: string) {
  return ALL_JOBS.find((item) => item.job === job) ?? null;
}

export function careerForJob(job: string, exp: number) {
  if (job === "待業者") return { title: "待業者", hourlyPay: 0, threshold: 0, label: "待業" };
  const rank = [...JOB_RANKS].reverse().find((item) => exp >= item.threshold) ?? JOB_RANKS[0];
  const title = rank.label === "正式" ? job : rank.label === "主管" ? `${job}主管` : `${rank.label}${job}`;
  return { ...rank, title };
}

export function nextRankFor(exp: number) {
  return JOB_RANKS.find((rank) => rank.threshold > exp) ?? null;
}
