export const PRODIGAL_DAILY_MINIMUM_PAYMENT = 2_500;
export const PRODIGAL_DAILY_INTEREST_BP = 20;

export function prodigalMinimumPayment(balance: number) {
  if (!Number.isFinite(balance) || balance <= 0) return 0;
  return Math.min(Math.floor(balance), PRODIGAL_DAILY_MINIMUM_PAYMENT);
}

export function prodigalDailyInterest(balance: number, rateBp = PRODIGAL_DAILY_INTEREST_BP) {
  if (!Number.isFinite(balance) || balance <= 0 || !Number.isFinite(rateBp) || rateBp <= 0) return 0;
  return Math.round(balance * rateBp / 10_000);
}
