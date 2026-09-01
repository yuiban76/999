export const HOME_COOK_COST = 70;
export const HOME_DAILY_COOK_LIMIT = 2;
export const HOME_NAP_WAIT_SECONDS = 30;
export const HOME_COOK_WAIT_SECONDS = 20;
export const HOME_CHORE_WAIT_SECONDS = 30;

export const HOME_COMFORT_LEVELS = [
  { level: 0, name: "基本落腳處", description: "可以小睡、完整睡眠、簡單料理與整理住所。", upgradeCost: 3_000 },
  { level: 1, name: "舒適寢具", description: "睡眠恢復的健康提高至 +7。", upgradeCost: 9_000 },
  { level: 2, name: "家用廚房", description: "居家料理的飽足效果由 +30 提高至 +45。", upgradeCost: 18_000 },
  { level: 3, name: "安心小窩", description: "完整睡眠只需 90 秒，並恢復健康 +10。", upgradeCost: null },
] as const;

export function homeComfort(level: number) {
  return HOME_COMFORT_LEVELS[Math.max(0, Math.min(HOME_COMFORT_LEVELS.length - 1, Math.floor(level)))]!;
}

export function homeSleepBenefits(level: number) {
  return {
    health: level >= 3 ? 10 : level >= 1 ? 7 : 5,
    waitSeconds: level >= 3 ? 90 : 120,
  };
}

export function homeCookHunger(level: number) {
  return level >= 2 ? 45 : 30;
}
