// JST(UTC+9) の日付範囲を UTC の Date オブジェクトとして返す
export function toJSTDateRange(date: string): { start: Date; end: Date } {
  const [year, month, day] = date.split("-").map(Number);
  // JST 00:00:00 = UTC 前日 15:00:00
  const startMs = Date.UTC(year, month - 1, day) - 9 * 60 * 60 * 1000;
  const endMs = Date.UTC(year, month - 1, day + 1) - 9 * 60 * 60 * 1000;
  return { start: new Date(startMs), end: new Date(endMs) };
}
