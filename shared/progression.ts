export const PRODIGAL_STARTING_DEBT = 250_000;

export const STORY_CHAPTERS = [
  { chapter: 1, remainingRatio: .90, title: "承認失敗", story: "你第一次沒有逃避帳單。債務仍沉重，但方向終於改變。", reward: 20 },
  { chapter: 2, remainingRatio: .75, title: "站穩腳步", story: "催繳通知少了一些，你開始相信生活可以慢慢修好。", reward: 25 },
  { chapter: 3, remainingRatio: .50, title: "重建信用", story: "一半的重擔已經放下。城市第一次看見你不是來尋找下一次翻本。", reward: 30 },
  { chapter: 4, remainingRatio: .25, title: "面對過去", story: "你終於有勇氣翻開那些一直不敢讀完的訊息。", reward: 40 },
  { chapter: 5, remainingRatio: .10, title: "重新站起來", story: "最後一段路不再靠運氣，而是靠每一天做出的選擇。", reward: 50 },
  { chapter: 6, remainingRatio: 0, title: "回家的路", story: "最後一筆債務歸零。你沒有贏回從前，而是重新成為能決定明天的人。", reward: 75 },
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
] as const;

export type CityEvent = typeof CITY_EVENTS[number];
