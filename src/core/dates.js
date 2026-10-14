/* 날짜 도구 — 시트가 주는 온갖 날짜 표기를 Date 로, 달·학년도 셈 */
export const W = ["일","월","화","수","목","금","토"];
export const p2 = n => String(n).padStart(2, "0");
export const key = d => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
export const today = () => key(new Date());

export function mkDate(y, m, d){
  if(!Number.isInteger(y) || y < 1900 || y > 9999 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const x = new Date(y, m - 1, d);
  return x.getFullYear() === y && x.getMonth() === m - 1 && x.getDate() === d ? x : null;
}
/* 시트가 돌려주는 온갖 날짜 표기를 한 갈래로 모은다 */
export function toDate(v){
  if(v == null || v === "") return null;
  if(v instanceof Date) return Number.isNaN(+v) ? null : mkDate(v.getFullYear(), v.getMonth() + 1, v.getDate());
  if(typeof v === "object") return toDate(v.v) || toDate(v.f);
  if(typeof v === "number"){
    const d = new Date(Math.floor(v - 25569) * 86400000);
    return mkDate(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
  }
  const t = String(v).trim();
  const g = t.match(/^Date\s*\(\s*(\d{4})\s*,\s*(\d{1,2})\s*,\s*(\d{1,2})(?:\s*,[^)]*)?\s*\)$/);
  if(g) return mkDate(+g[1], +g[2] + 1, +g[3]);
  const p = t.match(/^(\d{4})\D+(\d{1,2})\D+(\d{1,2})(?!\d)/);
  return p ? mkDate(+p[1], +p[2], +p[3]) : null;
}
export const ayOf = d => d.getFullYear() - (d.getMonth() < 2 ? 1 : 0);
export const mKey = d => `${d.getFullYear()}-${p2(d.getMonth() + 1)}`;
export const m1 = k => toDate(k + "-01");
export function shiftMonth(k, n){ const d = m1(k); d.setMonth(d.getMonth() + n); return mKey(d); }
export function monthDays(k, skipWeekend){
  const s = m1(k), y = s.getFullYear(), m = s.getMonth();
  const last = new Date(y, m + 1, 0).getDate();
  return Array.from({ length:last }, (_, i) => new Date(y, m, i + 1))
    .filter(d => !skipWeekend || (d.getDay() !== 0 && d.getDay() !== 6));
}
export const dayLabel = k => { const d = toDate(k); return `${d.getMonth() + 1}월 ${d.getDate()}일 (${W[d.getDay()]})`; };
