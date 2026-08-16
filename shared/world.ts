export const WORLD_EPOCH_MS = 1_786_533_617_376;
export const WORLD_START_MINUTES = 2_858;

export const OPENING_HOURS: Partial<Record<string, { open: number; close: number; label: string }>> = {
  realtor: { open: 7 * 60, close: 23 * 60, label: "07:00～23:00" },
  bank: { open: 7 * 60, close: 23 * 60, label: "07:00～23:00" },
  business: { open: 6 * 60, close: 24 * 60, label: "06:00～24:00" },
  shopping: { open: 6 * 60, close: 24 * 60, label: "06:00～24:00" },
  bookstore: { open: 7 * 60, close: 23 * 60, label: "07:00～23:00" },
  school: { open: 7 * 60, close: 23 * 60, label: "07:00～23:00" },
};

export const worldMinutes = (now = Date.now()) => WORLD_START_MINUTES + Math.max(0, Math.floor((now - WORLD_EPOCH_MS) / 1_000));
export const minuteOfDay = (minutes = worldMinutes()) => ((minutes % 1440) + 1440) % 1440;

export function isLocationOpen(location: string, minutes = worldMinutes()) {
  const hours = OPENING_HOURS[location];
  if (!hours) return true;
  const current = minuteOfDay(minutes);
  return current >= hours.open && current < hours.close;
}

export function isHospitalRegularOpen(minutes = worldMinutes()) {
  const current = minuteOfDay(minutes);
  return current >= 7 * 60 && current < 23 * 60;
}
