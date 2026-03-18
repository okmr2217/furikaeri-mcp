import { addDays, parseISO } from "date-fns";
import { fromZonedTime } from "date-fns-tz";

const JST = "Asia/Tokyo";

export function toJSTDateRange(date: string): { start: Date; end: Date } {
  const start = fromZonedTime(parseISO(date), JST);
  const end = fromZonedTime(addDays(parseISO(date), 1), JST);
  return { start, end };
}
