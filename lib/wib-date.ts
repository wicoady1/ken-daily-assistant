export function todayWIB(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function yesterdayWIB(): string {
  const now = new Date();
  const wibNow = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Jakarta" })
  );
  const day = wibNow.getDay();
  const daysToSubtract = day === 1 ? 3 : day === 0 ? 2 : day === 6 ? 1 : 1;
  wibNow.setDate(wibNow.getDate() - daysToSubtract);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(wibNow);
}

export function isValidDate(dateStr: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
}
