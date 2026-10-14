/* 월 표 — 월중 계획 · 학생일정 (날짜 × 행사 · 경건회 · 자습감독) */
import { W, key, monthDays, today } from "../core/dates.js";
import { esc } from "../core/text.js";
import { IX, M, off } from "../model.js";
import { hit } from "../search.js";
import { S } from "../state.js";
import { dnum, evHTML } from "../ui/dom.js";

export function monthRows(v){
  const o = S[v === "plan" ? "plan" : "stu"];
  const src = v === "student" ? IX.stuDay : IX.day;
  return monthDays(S.month, o.noWeekend).map(d => {
    const k = key(d);
    return {
      d, k,
      rows:(src.get(k) || []).filter(e => v === "student" ? hit(e.text) : (!off(e.dept) && hit(e.dept, e.text))),
      prayer:M.prayer.get(k)?.name || "", sup:M.super.get(k) || ""
    };
  });
}
export function drawTable(v){
  const plan = v === "plan", o = S[plan ? "plan" : "stu"];
  const rows = monthRows(v).filter(r => !o.hideEmpty || r.rows.length);
  const now = today();
  let n = 0;

  const body = rows.map(r => {
    n += r.rows.length;
    const w = r.d.getDay(), cls = [];
    if(r.k === now) cls.push("now");
    if(w === 0) cls.push("s0", "wk");
    if(w === 6) cls.push("s6", "wk");
    return `<tr class="${cls.join(" ")}">
      <td class="c-d">${dnum(r.d)}</td><td class="c-w">${W[w]}</td>
      <td class="c-b"><div class="cell">${r.rows.map(e => evHTML(e, plan && o.dept, v === "student")).join("") || '<span class="dash">—</span>'}</div></td>
      ${plan && o.prayer ? `<td class="c-n" data-l="경건회">${esc(r.prayer)}</td>` : ""}
      ${plan && o.super ? `<td class="c-n" data-l="자습감독">${esc(r.sup)}</td>` : ""}</tr>`;
  }).join("");

  return { n, html:`<div class="frame"><table class="${o.flat ? "flat" : ""}">
    <thead><tr><th class="c-d">날짜</th><th class="c-w">요일</th>
      <th>${plan ? "주요 행사" : "학생일정"}</th>
      ${plan && o.prayer ? '<th class="c-n">경건회</th>' : ""}
      ${plan && o.super ? '<th class="c-n">자습감독</th>' : ""}</tr></thead>
    <tbody>${body || `<tr><td colspan="5" class="dash" style="padding:16px;text-align:center">표시할 날이 없습니다</td></tr>`}</tbody></table></div>` };
}
