export const PRODIGAL_STARTING_DEBT = 250_000;

export const STORY_CHAPTERS = [
  { chapter: 1, remainingRatio: .90, title: "承認失敗", story: "你第一次沒有逃避帳單。債務仍沉重，但方向終於改變。", reward: 20 },
  { chapter: 2, remainingRatio: .75, title: "站穩腳步", story: "催繳通知少了一些，你開始相信生活可以慢慢修好。", reward: 25 },
  { chapter: 3, remainingRatio: .50, title: "重建信用", story: "一半的重擔已經放下。城市第一次看見你不是來尋找下一次翻本。", reward: 30 },
  { chapter: 4, remainingRatio: .25, title: "面對過去", story: "你終於有勇氣翻開那些一直不敢讀完的訊息。", reward: 40 },
  { chapter: 5, remainingRatio: .10, title: "重新站起來", story: "最後一段路不再靠運氣，而是靠每一天做出的選擇。", reward: 50 },
  { chapter: 6, remainingRatio: 0, title: "回家的路", story: "最後一筆債務歸零。你沒有贏回從前，而是重新成為能決定明天的人。", reward: 75 },
] as const;

export const PRODIGAL_SUCCESS_STORY = [
  "銀行頁面上的數字終於歸零。你盯著畫面很久，沒有歡呼，也沒有立刻告訴任何人。",
  "這一路沒有奇蹟。是每一次準時還款、每一次拒絕翻本，以及每一個願意重新開始的早晨，把你帶回這裡。",
  "你撥通母親的電話。這次，你沒有等她先開口。",
  "債務已經清償，失去的信任仍需要時間，但你終於不再用明天逃避今天。",
  "《浪子回頭》主線完成。這段人生不會結束，你可以繼續工作、生活，也可以重新開始另一段人生。",
] as const;

export function storyChapterForDebt(balance: number) {
  if (balance <= 0) return 6;
  const ratio = balance / PRODIGAL_STARTING_DEBT;
  let chapter = 0;
  for (const item of STORY_CHAPTERS) if (ratio <= item.remainingRatio) chapter = item.chapter;
  return chapter;
}

export const TALENTS = [
  { id: "workaholic_1", branch: "職涯", name: "工作狂 I", description: "工作收入 +5%。", requires: [] },
  { id: "workaholic_2", branch: "職涯", name: "工作狂 II", description: "工作收入再 +5%，工作等待 -10%。", requires: ["workaholic_1"] },
  { id: "skilled", branch: "職涯", name: "熟能生巧", description: "工作取得的職業經驗 +15%。", requires: ["workaholic_1"] },
  { id: "strong_body", branch: "生存", name: "強健體魄", description: "體力上限提高至 120。", requires: [] },
  { id: "endurance", branch: "生存", name: "耐力充沛", description: "工作消耗的體力降低 15%。", requires: ["strong_body"] },
  { id: "resistance", branch: "生存", name: "抵抗力", description: "生病機率降低 25%。", requires: ["strong_body"] },
  { id: "frugal", branch: "財務", name: "精打細算", description: "商店與旅店餐點價格降低 10%。", requires: [] },
  { id: "rent_master", branch: "財務", name: "租屋高手", description: "租金降低 10%。", requires: ["frugal"] },
  { id: "credit_rebuild", branch: "財務", name: "信用重建", description: "《浪子回頭》債務日利率降至 0.18%。", requires: ["frugal"] },
  { id: "connections", branch: "機會", name: "城市人脈", description: "城市事件觸發率提高至 28%。", requires: [] },
  { id: "negotiator", branch: "機會", name: "談判能力", description: "部分城市事件出現更好的第三選項。", requires: ["connections"] },
  { id: "lucky_turn", branch: "機會", name: "幸運轉機", description: "負面事件會提供一次較安全的選項。", requires: ["connections"] },
] as const;

export type TalentId = typeof TALENTS[number]["id"];
export const talentInfo = (id: string) => TALENTS.find((talent) => talent.id === id);

export const CITY_EVENTS = [
  { id: "lost_wallet", title: "路邊的皮夾", text: "你在街角撿到一只裝著現金的皮夾。", choices: [
    { id: "return", label: "交給警察", result: "你把皮夾交給警察，心裡踏實許多。", talentExp: 6 },
    { id: "keep", label: "留下現金", result: "你留下其中的現金，卻一路擔心有人看見。", cash: 600, health: -2 },
    { id: "find_owner", label: "親自尋找失主", result: "你花時間找到失主，對方堅持給你謝禮。", cash: 300, talentExp: 8, requires: "negotiator" },
  ] },
  { id: "overtime", title: "臨時加班", text: "公司臨時需要人手，你可以接下這份額外工作。", choices: [
    { id: "accept", label: "接受加班", result: "你完成加班，收入增加但身體有些疲憊。", cash: 500, energy: -12, health: -3, talentExp: 4 },
    { id: "decline", label: "保留體力", result: "你婉拒加班，把今晚留給自己。", health: 3 },
  ] },
  { id: "free_clinic", title: "街區義診", text: "醫療團隊今天提供一次免費健康檢查。", choices: [
    { id: "visit", label: "接受檢查", result: "醫護人員替你處理了幾個健康問題。", health: 18, talentExp: 3 },
    { id: "give", label: "把名額讓給別人", result: "你將名額讓給更需要的人。", talentExp: 8 },
  ] },
  { id: "landlord_offer", title: "房東的提議", text: "房東願意用一次性的價格替你延長租期。", choices: [
    { id: "accept", label: "支付 NT$600 延長 2 天", result: "租約延長了兩天。", cash: -600, rentalDays: 2 },
    { id: "decline", label: "暫時不用", result: "你決定保留現金。" },
  ] },
  { id: "night_class", title: "臨時公開課", text: "學院臨時開放一堂城市生活講座。", choices: [
    { id: "attend", label: "支付 NT$300 上課", result: "這堂課讓你對生活多了一些理解。", cash: -300, intelligence: 3, talentExp: 5 },
    { id: "skip", label: "略過課程", result: "你把時間留給原本的安排。" },
  ] },
  { id: "office_audit", categories: ["office"], title: "臨時稽核", text: "主管請你協助整理一批混亂的行政資料。", choices: [
    { id: "organize", label: "留下整理", result: "你把資料整理完成，也讓主管看見你的可靠。", cash: 450, energy: -8, talentExp: 6 },
    { id: "handoff", label: "交接處理", result: "你清楚交接工作，保留了今天的體力。", talentExp: 2 },
  ] },
  { id: "medical_emergency", categories: ["medical"], title: "街頭緊急救護", text: "附近有人突然不適，現場需要具備照護經驗的人。", choices: [
    { id: "help", label: "協助救護", result: "你穩定了患者狀況，醫院致贈一筆協助津貼。", cash: 500, energy: -10, talentExp: 8 },
    { id: "call", label: "呼叫專業支援", result: "你迅速通報，讓救護人員及時抵達。", talentExp: 4 },
  ] },
  { id: "finance_panic", categories: ["finance"], title: "市場恐慌", text: "客戶因市場波動打來，希望你立刻給出建議。", choices: [
    { id: "explain", label: "耐心說明", result: "你避免客戶做出衝動決定，獲得專業獎金。", cash: 600, energy: -8, talentExp: 7 },
    { id: "decline", label: "不做倉促判斷", result: "你拒絕在資訊不足時給出建議。", talentExp: 4 },
  ] },
  { id: "literary_reading", categories: ["literary"], title: "巷口讀書會", text: "一間小店邀請你分享自己的作品。", choices: [
    { id: "read", label: "公開朗讀", result: "你的文字被更多人聽見，也收到一筆車馬費。", cash: 350, energy: -6, talentExp: 8 },
    { id: "listen", label: "先聽別人的故事", result: "你記下了許多新的創作靈感。", creativity: 4, talentExp: 5 },
  ] },
  { id: "food_festival", categories: ["hospitality"], title: "城市美食節", text: "活動臨時缺少餐飲人手，主辦方邀請你支援。", choices: [
    { id: "cook", label: "支援出餐", result: "你撐過出餐高峰，獲得活動津貼。", cash: 550, energy: -10, talentExp: 7 },
    { id: "advise", label: "協助調整流程", result: "你的建議讓現場效率提高。", social: 3, talentExp: 5 },
  ] },
  { id: "police_patrol", categories: ["crime"], title: "警方臨檢", text: "街口突然出現警方臨檢，你必須立刻決定。", choices: [
    { id: "leave", label: "放棄行動離開", result: "你避開風險，但錯失了原本的收入。", cash: -150, talentExp: 3 },
    { id: "blend", label: "混入人群", result: "你保持冷靜，成功避開注意。", energy: -8, talentExp: 6 },
  ] },
  { id: "urgent_commission", categories: ["freelance"], title: "緊急委託", text: "客戶希望你今天完成一份臨時專案。", choices: [
    { id: "rush", label: "接下趕件", result: "你準時交件並取得額外報酬。", cash: 500, energy: -12, talentExp: 7 },
    { id: "negotiate", label: "重新協商期限", result: "你守住工作品質，也讓合作可以繼續。", social: 3, talentExp: 5 },
  ] },
  { id: "cold_night", categories: ["street"], title: "地下道的冷夜", text: "夜裡氣溫驟降，附近有人需要一點協助。", choices: [
    { id: "share", label: "分享物資", result: "你分出手上的物資，街頭夥伴記住了這份情。", cash: -80, talentExp: 10 },
    { id: "shelter", label: "尋找避風處", result: "你帶大家找到較安全的地方過夜。", energy: -6, health: 3, talentExp: 7 },
  ] },
] as const;

export type CityEvent = typeof CITY_EVENTS[number];
