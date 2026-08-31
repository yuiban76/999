export type NpcId = "jiang" | "lin" | "zhou" | "shen";

export type NpcChoice = {
  id: string;
  label: string;
  detail: string;
  outcome: string;
  relation: number;
  cashDelta?: number;
  healthDelta?: number;
  hungerDelta?: number;
  talentExp?: number;
  jobExp?: number;
  writerFans?: number;
  reputationFaction?: "市民" | "地下";
  reputationPoints?: number;
  requiredCategory?: string;
  memoryAdd?: string[];
  memoryRemove?: string[];
  mysteryClue?: string;
};

export type NpcEvent = {
  id: string;
  npcId: NpcId;
  title: string;
  prompt: string;
  status: string;
  choices: NpcChoice[];
  requiresAllMemories?: string[];
  forbidsAnyMemories?: string[];
  priority?: boolean;
};

export type NpcDefinition = {
  id: NpcId;
  name: string;
  role: string;
  location: "hotel" | "hospital" | "bank" | "bookstore";
  portrait: string;
  accent: "amber" | "teal" | "blue" | "violet";
  schedule: { opens: number; closes: number; label: string };
  absentText: string;
};

export const NPCS: NpcDefinition[] = [
  { id: "jiang", name: "江叔", role: "不夜旅店老闆", location: "hotel", portrait: "江", accent: "amber", schedule: { opens: 18 * 60, closes: 6 * 60, label: "18:00～翌日 06:00" }, absentText: "江叔去市場補貨了，旅店櫃檯仍照常營業。" },
  { id: "lin", name: "林護理長", role: "市立醫院護理長", location: "hospital", portrait: "林", accent: "teal", schedule: { opens: 8 * 60, closes: 20 * 60, label: "08:00～20:00" }, absentText: "林護理長已下班，急診與一般醫療功能不受影響。" },
  { id: "zhou", name: "周專員", role: "城市銀行資深專員", location: "bank", portrait: "周", accent: "blue", schedule: { opens: 9 * 60, closes: 19 * 60, label: "09:00～19:00" }, absentText: "周專員目前不在座位，銀行櫃檯仍可正常使用。" },
  { id: "shen", name: "沈店長", role: "城市書店店長", location: "bookstore", portrait: "沈", accent: "violet", schedule: { opens: 10 * 60, closes: 22 * 60, label: "10:00～22:00" }, absentText: "沈店長外出選書，書店原有服務仍照常開放。" },
];

export const NPC_EVENTS: NpcEvent[] = [
  {
    id: "lost_watch",
    npcId: "jiang",
    title: "櫃檯下的舊手錶",
    prompt: "江叔從旅店沙發縫裡找到一只停在凌晨四點的舊手錶。背面刻痕被磨得只剩半個姓氏，他想聽聽你的意見。",
    status: "正端詳一只來歷不明的舊手錶",
    priority: true,
    forbidsAnyMemories: ["watch_started", "watch_resolved", "watch_sold"],
    choices: [
      { id: "ask_bank", label: "請銀行協助查找失主", detail: "不會立即獲得金錢，線索將轉往城市銀行。", outcome: "江叔把手錶裝進信封，請你帶去找周專員。", relation: 6, talentExp: 4, memoryAdd: ["watch_started", "watch_bank"] },
      { id: "ask_bookstore", label: "拿去書店查看刻字", detail: "不會立即獲得金錢，可能發現城市舊聞。", outcome: "江叔想起沈店長熟悉舊城故事，將手錶交給你查看。", relation: 5, talentExp: 4, memoryAdd: ["watch_started", "watch_bookstore"] },
      { id: "keep_safe", label: "先留在旅店等待失主", detail: "獲得 NT$120 謝禮，事件在此告一段落。", outcome: "江叔將手錶鎖進失物櫃，並請你收下幫忙登記的謝禮。", relation: 8, cashDelta: 120, talentExp: 3, reputationFaction: "市民", reputationPoints: 4, memoryAdd: ["watch_started", "watch_resolved"] },
    ],
  },
  {
    id: "hotel_rush",
    npcId: "jiang",
    title: "深夜突然客滿",
    prompt: "幾班末班車同時抵達，旅店大廳一下子擠滿了旅客。江叔忙得連水都來不及喝。",
    status: "正在處理突然湧入的旅客",
    choices: [
      { id: "help_lobby", label: "幫忙整理大廳", detail: "立即完成 · 收入 NT$100。", outcome: "你把混亂的行李重新排好，江叔終於能喘口氣。", relation: 6, cashDelta: 100, talentExp: 3 },
      { id: "hospitality_plan", label: "重新安排房務動線", detail: "餐飲服務專屬 · 收入 NT$180、職業經驗 +10。", outcome: "你的服務經驗讓入住速度快了不少，江叔對你的能力印象深刻。", relation: 8, cashDelta: 180, jobExp: 10, talentExp: 4, requiredCategory: "hospitality" },
      { id: "decline", label: "今晚沒有餘力幫忙", detail: "不獲得獎勵，也不影響關係。", outcome: "江叔點點頭，繼續獨自處理櫃檯的隊伍。", relation: 0 },
    ],
  },
  {
    id: "hotel_hungry_guest",
    npcId: "jiang",
    title: "沒錢吃飯的旅客",
    prompt: "一名旅客把最後的零錢拿去付床位，江叔正猶豫要不要先讓他賒一份晚餐。",
    status: "正在替一名旅客想辦法",
    choices: [
      { id: "buy_meal", label: "支付 NT$80 請他吃飯", detail: "現金 -NT$80 · 市民名聲提高。", outcome: "旅客把飯吃得乾乾淨淨，江叔沒有多說，只默默記住你的選擇。", relation: 8, cashDelta: -80, talentExp: 4, reputationFaction: "市民", reputationPoints: 6 },
      { id: "find_work", label: "幫他安排一份臨時工作", detail: "立即完成 · 天賦經驗 +3。", outcome: "旅客用工作換到晚餐與住宿，事情有了不傷尊嚴的結局。", relation: 6, talentExp: 3 },
      { id: "leave", label: "不介入這件事", detail: "不產生任何變化。", outcome: "你離開櫃檯，江叔最後仍自己想辦法處理。", relation: -1 },
    ],
  },
  {
    id: "hospital_supplies",
    npcId: "lin",
    title: "急診物資送錯樓層",
    prompt: "一批急診用品被送到舊倉庫，林護理長正在找能立刻幫忙的人。",
    status: "正在清點送錯位置的醫療用品",
    choices: [
      { id: "carry", label: "協助搬運物資", detail: "立即完成 · 收入 NT$100。", outcome: "物資在尖峰前送回急診，林護理長向你道謝。", relation: 5, cashDelta: 100, talentExp: 3 },
      { id: "medical_check", label: "重新核對醫療清單", detail: "醫療照護專屬 · 收入 NT$180、健康 +2、職業經驗 +10。", outcome: "你不只搬回物資，還找出清單中的錯誤，避免了一次醫療疏失。", relation: 8, cashDelta: 180, healthDelta: 2, jobExp: 10, talentExp: 4, requiredCategory: "medical" },
      { id: "decline", label: "讓醫院自行處理", detail: "不獲得獎勵。", outcome: "林護理長轉身聯絡其他同事，急診仍會正常運作。", relation: 0 },
    ],
  },
  {
    id: "hospital_patient",
    npcId: "lin",
    title: "付不起藥費的病人",
    prompt: "一名病人站在領藥窗口前反覆數著零錢。林護理長問你是否願意一起想辦法。",
    status: "正在協助一名需要幫忙的病人",
    choices: [
      { id: "donate", label: "補上 NT$100 藥費", detail: "現金 -NT$100 · 市民名聲提高。", outcome: "病人終於領到藥，林護理長把這份幫助記在心裡。", relation: 8, cashDelta: -100, talentExp: 4, reputationFaction: "市民", reputationPoints: 6 },
      { id: "social_worker", label: "聯絡社福資源", detail: "立即完成 · 天賦經驗 +4。", outcome: "你找到可用的補助，讓病人不必依靠臨時捐款。", relation: 7, talentExp: 4 },
      { id: "ignore", label: "這不是我的責任", detail: "林護理長關係略微下降。", outcome: "林護理長沒有責怪你，但她的語氣明顯冷了一些。", relation: -3 },
    ],
  },
  {
    id: "hospital_night_shift",
    npcId: "lin",
    title: "連續值班的夜晚",
    prompt: "昨夜急診異常忙碌，林護理長仍在交班。她需要有人協助整理病床紀錄。",
    status: "正在完成昨夜留下的交班紀錄",
    choices: [
      { id: "organize", label: "幫忙整理紀錄", detail: "立即完成 · 收入 NT$90。", outcome: "你把散亂的紀錄依時間排好，交班終於順利完成。", relation: 5, cashDelta: 90, talentExp: 3 },
      { id: "medical_handoff", label: "協助完成專業交班", detail: "醫療照護專屬 · 收入 NT$190、職業經驗 +10。", outcome: "你的專業判讀補上幾個關鍵細節，林護理長放心地完成交班。", relation: 8, cashDelta: 190, healthDelta: 2, jobExp: 10, talentExp: 4, requiredCategory: "medical" },
      { id: "coffee", label: "買杯咖啡給她", detail: "現金 -NT$60 · 關係提高。", outcome: "林護理長接過咖啡，難得露出放鬆的笑容。", relation: 6, cashDelta: -60, talentExp: 2 },
    ],
  },
  {
    id: "watch_bank_trace",
    npcId: "zhou",
    title: "手錶的典當紀錄",
    prompt: "周專員查到這只手錶曾被拿去典當，紀錄上的地址卻早已不存在。下一步要由你決定。",
    status: "正在查找一只舊手錶的金融紀錄",
    priority: true,
    requiresAllMemories: ["watch_bank"],
    forbidsAnyMemories: ["watch_resolved", "watch_sold"],
    choices: [
      { id: "find_owner", label: "繼續查找真正失主", detail: "獲得 NT$350 謝禮與市民名聲。", outcome: "周專員找到了失主家屬。手錶終於回到等待它多年的人手中。", relation: 9, cashDelta: 350, talentExp: 6, reputationFaction: "市民", reputationPoints: 8, memoryAdd: ["watch_resolved"], memoryRemove: ["watch_bank"] },
      { id: "send_bookstore", label: "把舊地址交給沈店長", detail: "事件會繼續前往城市書店。", outcome: "周專員認為這更像一段城市歷史，將資料封好請你送往書店。", relation: 5, talentExp: 4, memoryAdd: ["watch_bookstore"], memoryRemove: ["watch_bank"] },
      { id: "close_case", label: "停止追查並歸還江叔", detail: "事件結束 · 關係小幅提高。", outcome: "周專員尊重你的決定，把手錶重新封存並交還旅店。", relation: 4, talentExp: 2, memoryAdd: ["watch_resolved"], memoryRemove: ["watch_bank"] },
    ],
  },
  {
    id: "bank_queue",
    npcId: "zhou",
    title: "櫃檯前的長隊伍",
    prompt: "銀行今天擠滿了前來詢問貸款的人，周專員需要有人協助整理基本資料。",
    status: "正在處理大量貸款諮詢",
    choices: [
      { id: "guide", label: "協助引導排隊民眾", detail: "立即完成 · 收入 NT$100。", outcome: "混亂的隊伍恢復秩序，周專員終於能專心處理申請。", relation: 5, cashDelta: 100, talentExp: 3 },
      { id: "finance_review", label: "初步審核貸款資料", detail: "商業金融專屬 · 收入 NT$200、職業經驗 +10。", outcome: "你先找出高風險資料，替銀行省下不少時間。", relation: 8, cashDelta: 200, jobExp: 10, talentExp: 4, requiredCategory: "finance" },
      { id: "leave", label: "稍後再回來", detail: "不產生任何變化。", outcome: "你決定不打擾忙碌的櫃檯。", relation: 0 },
    ],
  },
  {
    id: "bank_wrong_transfer",
    npcId: "zhou",
    title: "錯誤匯入的款項",
    prompt: "周專員發現一筆 NT$500 的測試款項誤入你的名下。系統尚未正式入帳，他詢問你的處理意願。",
    status: "正在核對一筆錯誤匯款",
    choices: [
      { id: "return", label: "主動歸還款項", detail: "市民名聲與關係提高。", outcome: "周專員完成沖銷，並在你的紀錄旁留下可靠的備註。", relation: 8, talentExp: 4, reputationFaction: "市民", reputationPoints: 6 },
      { id: "investigate", label: "協助找出匯款原因", detail: "立即完成 · 收入 NT$120。", outcome: "你發現是測試帳號設定錯誤，銀行支付了協助費。", relation: 6, cashDelta: 120, talentExp: 3 },
      { id: "finance_fix", label: "修正批次匯款流程", detail: "商業金融專屬 · 收入 NT$220、職業經驗 +10。", outcome: "你從流程源頭修正問題，周專員認可你的專業。", relation: 9, cashDelta: 220, jobExp: 10, talentExp: 5, requiredCategory: "finance" },
    ],
  },
  {
    id: "watch_bookstore_mark",
    npcId: "shen",
    title: "刻痕裡的舊城地址",
    prompt: "沈店長用放大鏡看出手錶上的刻痕不是姓氏，而是一家早已歇業的鐘錶行縮寫。",
    status: "正在翻找一本舊城商店名錄",
    priority: true,
    requiresAllMemories: ["watch_bookstore"],
    forbidsAnyMemories: ["watch_resolved", "watch_sold"],
    choices: [
      { id: "trace_family", label: "循舊名錄尋找店主家人", detail: "獲得 NT$500 謝禮、市民名聲與一則城市傳聞。", outcome: "你找到鐘錶行後人的聯絡方式。對方認出這是家族失散多年的紀念品。", relation: 10, cashDelta: 500, talentExp: 7, reputationFaction: "市民", reputationPoints: 10, memoryAdd: ["watch_resolved"], memoryRemove: ["watch_bookstore"], mysteryClue: "key" },
      { id: "archive", label: "將故事整理進城市檔案", detail: "不領取金錢，獲得較多天賦經驗。", outcome: "沈店長把調查經過寫進舊城檔案，讓這段故事不再被遺忘。", relation: 9, talentExp: 10, reputationFaction: "市民", reputationPoints: 6, memoryAdd: ["watch_resolved"], memoryRemove: ["watch_bookstore"], mysteryClue: "key" },
      { id: "return_jiang", label: "把手錶交回江叔保管", detail: "事件結束 · 關係小幅提高。", outcome: "沈店長尊重你的決定，將手錶連同查到的資料交還旅店。", relation: 4, talentExp: 2, memoryAdd: ["watch_resolved"], memoryRemove: ["watch_bookstore"] },
    ],
  },
  {
    id: "bookstore_fair",
    npcId: "shen",
    title: "小型城市書展",
    prompt: "沈店長想在門口辦一場只有一天的小書展，需要有人協助選書與布置。",
    status: "正在準備今天的小型書展",
    choices: [
      { id: "decorate", label: "協助布置書展", detail: "立即完成 · 收入 NT$100。", outcome: "你把入口整理得更醒目，經過的人開始停下腳步。", relation: 5, cashDelta: 100, talentExp: 3 },
      { id: "writer_curate", label: "策劃本日主題書展", detail: "文學作家專屬 · 收入 NT$180、粉絲 +15。", outcome: "你的選書受到讀者喜愛，也有人開始詢問你的作品。", relation: 8, cashDelta: 180, writerFans: 15, talentExp: 5, requiredCategory: "literary" },
      { id: "promote_others", label: "推薦其他玩家的作品", detail: "市民名聲與關係提高。", outcome: "幾本原本沒人注意的作品得到曝光，沈店長欣賞你的選擇。", relation: 7, talentExp: 4, reputationFaction: "市民", reputationPoints: 5 },
    ],
  },
  {
    id: "bookstore_shelves",
    npcId: "shen",
    title: "找不到位置的新書",
    prompt: "一批新書已送達，但書架分類與進貨清單完全對不上。沈店長需要一雙可靠的手。",
    status: "正在整理剛送到的新書",
    choices: [
      { id: "sort", label: "協助分類上架", detail: "立即完成 · 收入 NT$90。", outcome: "你依主題重新整理書架，混亂的紙箱很快清空。", relation: 5, cashDelta: 90, talentExp: 3 },
      { id: "writer_notes", label: "替讀者撰寫推薦短句", detail: "文學作家專屬 · 收入 NT$170、粉絲 +10。", outcome: "你的推薦文字被放上展示桌，也替自己的名字增加了一點曝光。", relation: 8, cashDelta: 170, writerFans: 10, talentExp: 4, requiredCategory: "literary" },
      { id: "browse", label: "只看看今天的新書", detail: "不產生獎勵。", outcome: "沈店長讓你慢慢看書，自己繼續處理剩下的紙箱。", relation: 1 },
    ],
  },
];

export function npcAvailableAt(npc: NpcDefinition, sharedMinutes: number) {
  const minute = ((sharedMinutes % 1440) + 1440) % 1440;
  return npc.schedule.opens <= npc.schedule.closes
    ? minute >= npc.schedule.opens && minute < npc.schedule.closes
    : minute >= npc.schedule.opens || minute < npc.schedule.closes;
}

export function relationshipLabel(points: number) {
  if (points >= 80) return "摯交";
  if (points >= 50) return "信任";
  if (points >= 20) return "熟識";
  return "陌生";
}

export function eventMatchesMemories(event: NpcEvent, memories: Set<string>) {
  if (event.requiresAllMemories?.some((memory) => !memories.has(memory))) return false;
  if (event.forbidsAnyMemories?.some((memory) => memories.has(memory))) return false;
  return true;
}

