import { format } from "date-fns";

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

export function toKST(date: Date): Date {
  return new Date(date.getTime() + KST_OFFSET_MS);
}

export function getKSTDate(date: Date): string {
  const kst = toKST(date);
  return format(kst, "yyyy-MM-dd");
}

export function getKSTHour(date: Date): number {
  const kst = toKST(date);
  return kst.getUTCHours();
}

export function todayKST(): string {
  return getKSTDate(new Date());
}

export function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return getKSTDate(d);
}
