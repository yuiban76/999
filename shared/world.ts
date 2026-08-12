export const WORLD_EPOCH_MS = 1_786_533_617_376;
export const WORLD_START_MINUTES = 2_858;

export const OPENING_HOURS: Partial<Record<string, { open: number; close: number; label: string }>> = {
  realtor: { open: 9 * 60, close: 18 * 60, label: "09:00～18:00" },
  bank: { open: 9 * 60, close: 17 * 60, label: "09:00～17:00" },
  business: { open: 8 * 60, close: 18 * 60, label: "08:00～18:00" },
  shopping: { open: 10 * 60, close: 22 * 60, label: "10:00～22:00" },
  school: { open: 8 * 60, close: 21 * 60, label: "08:00～21:00" },
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
  return current >= 8 * 60 && current < 20 * 60;
}
