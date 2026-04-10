export function formatUsername(username: string | null | undefined) {
  if (!username || username === "—" || username === "Аноним") return "@Admin";
  return username.startsWith("@") ? username : `@${username}`;
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString("ru-RU", {
    timeZone: "Asia/Yekaterinburg",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function isExpired(value: string | null | undefined, ttlMs: number) {
  if (!value) return true;
  const ts = new Date(value).getTime();
  return ts < Date.now() - ttlMs;
}
