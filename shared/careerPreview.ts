import type { AbilityKey } from "./jobs";

export type CareerPreviewRank = {
  title: string;
  requirements: string;
  unlock: string;
  income: string;
};

export type CareerPreviewRoute = {
  id: string;
  icon: string;
  name: string;
  subtitle: string;
  summary: string;
  abilities: AbilityKey[];
  actions: string[];
  balance: string;
  ranks: CareerPreviewRank[];
};

/**
 * A read-only design slice for the proposed career rewrite.
 * It is intentionally separate from JOB_CATEGORIES until the player approves
 * the rules and numbers.
 */
export const CAREER_PREVIEW_ROUTES: readonly CareerPreviewRoute[] = [
  {
    id: "beggar-gang",
    icon: "丐",
    name: "丐幫生存",
    subtitle: "沒有住所，也能靠城市活下來",
    summary: "透過乞討、拾荒與玩家互動累積聲望，逐步建立自己的丐幫網絡。",
    abilities: ["social", "charisma", "physical"],
    actions: ["向其他玩家乞討", "拒絕、給錢或羞辱回應", "拾荒取得空罐、食物、現金與彩券", "解鎖高價拾荒地點"],
    balance: "乞討與拾荒都有每日次數上限；收入低但不需要住所或固定工作。",
    ranks: [
      { title: "街友", requirements: "初始身分", unlock: "普通乞討、基礎拾荒", income: "浮動" },
      { title: "丐幫成員", requirements: "社交／魅力達標＋完成生存行動", unlock: "空罐回收、第二個拾荒區", income: "浮動" },
      { title: "丐幫長老", requirements: "職業經驗＋丐幫聲望", unlock: "拾荒情報、故事式乞討", income: "浮動" },
      { title: "丐幫幫主", requirements: "高聲望＋完成城市事件", unlock: "管理區域、接受成員求助", income: "網絡分成" },
    ],
  },
  {
    id: "recycling",
    icon: "♻",
    name: "資源回收",
    subtitle: "把城市遺落的東西變成下一頓飯",
    summary: "搜尋、分類並出售回收物，後期可以管理回收站與稀有材料。",
    abilities: ["physical", "intelligence", "creativity"],
    actions: ["街區搜尋", "分類回收物", "修理可用物品", "管理回收站訂單"],
    balance: "材料價格每天變動；需要時間與體力，稀有物品不保證出現。",
    ranks: [
      { title: "回收者", requirements: "初始身分", unlock: "撿拾空罐與紙箱", income: "低至中" },
      { title: "分類員", requirements: "體力＋智力達標", unlock: "分類加成、金屬材料", income: "中" },
      { title: "回收站技師", requirements: "職業經驗＋創造力", unlock: "修理物品、提升材料價值", income: "中至高" },
      { title: "循環站主管", requirements: "管理經驗＋資金", unlock: "回收站訂單、被動收入", income: "高但波動" },
    ],
  },
  {
    id: "street-performer",
    icon: "藝",
    name: "街頭藝人",
    subtitle: "先讓一個人停下腳步，再讓整座城市記住你",
    summary: "透過表演、人氣與觀眾回饋升遷，能接到城市活動與玩家委託。",
    abilities: ["creativity", "charisma", "social"],
    actions: ["街頭表演", "選擇表演風格", "收取觀眾小費", "接城市活動與玩家委託"],
    balance: "收入取決於人氣與城市時間；表演有冷卻，不能連續刷取固定高收入。",
    ranks: [
      { title: "表演新手", requirements: "創造力達標", unlock: "基礎表演與小費", income: "低至中" },
      { title: "駐點藝人", requirements: "人氣＋魅力達標", unlock: "固定表演地點、觀眾加成", income: "中" },
      { title: "城市藝人", requirements: "表演經驗＋社交", unlock: "城市活動邀請", income: "中至高" },
      { title: "演出製作人", requirements: "高人氣＋資金", unlock: "組織多人演出、活動分成", income: "高但需要管理" },
    ],
  },
  {
    id: "night-market",
    icon: "攤",
    name: "夜市攤販",
    subtitle: "每天的客人不同，每一鍋都要自己承擔",
    summary: "採購材料、製作商品並觀察每日需求，最後經營自己的攤位與商圈。",
    abilities: ["creativity", "social", "physical"],
    actions: ["採購食材", "製作商品", "設定售價", "觀察人潮與每日需求"],
    balance: "需要先投入成本；賣不完會造成浪費，定價與需求會影響收益。",
    ranks: [
      { title: "攤販學徒", requirements: "初始身分", unlock: "販售一種基礎商品", income: "不穩定" },
      { title: "熟客攤主", requirements: "社交＋創造力達標", unlock: "兩種商品、熟客加成", income: "中" },
      { title: "夜市老闆", requirements: "營業經驗＋資金", unlock: "雇用幫手、擴充攤位", income: "中至高" },
      { title: "商圈主理人", requirements: "高聲望＋多日經營", unlock: "商圈活動、攤位租金分成", income: "高但有營運成本" },
    ],
  },
] as const;
