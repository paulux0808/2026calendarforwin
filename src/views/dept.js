/* 부서 — 한 부서의 일정을 달별로, 오늘 줄과 함께 */
import { W, dayLabel, today } from "../core/dates.js";
import { M } from "../model.js";
import { hit } from "../search.js";
import { S } from "../state.js";
import { evHTML, nothing } from "../ui/dom.js";

export const deptN = d => M.schedule.reduce((s, e) => s + (e.dept === d), 0);

export function drawDept(){
  const rows = M.schedule.filter(e => e.dept === S.dept && hit(e.dept, e.text));
  if(!rows.length) return { n:0, html:nothing("일정 없음") };
  const now = today(), tm = now.slice(0, 7), cnt = new Map();
  for(const { k } of rows) cnt.set(k.slice(0, 7), (cnt.get(k.slice(0, 7)) || 0) + 1);
  let html = "", cur = "", put = false;
  /* 오늘 줄은 한 번만. 오늘 달에 지난 일정만 남았으면 그 달 끝에 둔다 */
  const mark = () => { put = true; return `<div class="grp-now now" aria-current="date">오늘 · ${dayLabel(now)}</div>`; };
  for(const r of rows){
    const m = r.k.slice(0, 7);
    if(m !== cur){
      if(cur){
        if(!put && cur === tm) html += mark();
        html += "</div>";
      }
      html += `<h2 class="cap">${m.slice(0, 4)}년 ${+m.slice(5)}월 · ${cnt.get(m)}건</h2><div class="frame">`;
      cur = m;
    }
    if(!put && r.k >= now) html += mark();
    html += `<div class="grp${r.k < now ? " past" : ""}"><span>${r.d.getMonth() + 1}월 ${r.d.getDate()}일 (${W[r.d.getDay()]})</span>${evHTML(r, false)}</div>`;
  }
  if(!put) html += mark();
  return { n:rows.length, html:html + "</div>" };
}
