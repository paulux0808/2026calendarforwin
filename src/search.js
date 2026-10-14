/* 검색 — 검색어 쪼개기, 일치 판정, 일치 글자 표시, 달별 일치 건수 */
import { esc } from "./core/text.js";
import { M, off } from "./model.js";
import { S } from "./state.js";

export const terms = () => S.q.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
export function hit(...parts){
  const t = terms();
  if(!t.length) return true;
  const hay = parts.join(" ").toLocaleLowerCase();
  return t.every(x => hay.includes(x));
}
export function hl(v){
  const raw = String(v ?? ""), t = [...new Set(terms())];
  if(!t.length) return esc(raw);
  const re = new RegExp(t.sort((a, b) => b.length - a.length)
    .map(x => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"), "gi");
  let out = "", i = 0;
  for(const m of raw.matchAll(re)){ out += esc(raw.slice(i, m.index)) + `<mark>${esc(m[0])}</mark>`; i = m.index + m[0].length; }
  return out + esc(raw.slice(i));
}

/* 지금 달만 걸러 보이는 검색을 달 건너 찾게 한다 — [달, 건수]를 시간순으로 */
export function hitMonths(){
  const stu = S.view === "student", by = new Map();
  for(const e of stu ? M.student : M.schedule){
    if(stu ? !hit(e.text) : off(e.dept) || !hit(e.dept, e.text)) continue;
    const m = e.k.slice(0, 7);
    by.set(m, (by.get(m) || 0) + 1);
  }
  return [...by].sort(([a], [b]) => a < b ? -1 : 1);
}
