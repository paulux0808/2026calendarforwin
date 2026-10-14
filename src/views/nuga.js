/* 누가기록 — 학년 · 영역별 활동 시간 표(폰에서는 카드) */
import { W } from "../core/dates.js";
import { esc } from "../core/text.js";
import { M } from "../model.js";
import { hit, hl } from "../search.js";
import { S, catTone } from "../state.js";
import { nothing } from "../ui/dom.js";

export const catOf = r => S.grade < 3 && ["자율","봉사"].includes(r.cat) ? "자율자치" : r.cat;
export const cats = () => S.grade === 3 ? ["전체","자율","봉사","동아리","진로"] : ["전체","자율자치","동아리","진로"];
export const nugaAll = () => M.nuga.filter(r => r.grades[S.grade - 1] && hit(catOf(r), r.text, r.note));

export function drawNuga(){
  if(!cats().includes(S.cat)) S.cat = "전체";
  const rows = nugaAll().filter(r => S.cat === "전체" || catOf(r) === S.cat);
  if(!rows.length) return { n:0, html:nothing("기록 없음") };
  const total = rows.reduce((s, r) => s + r.hours, 0);
  const unclear = rows.some(r => !r.ok);
  let run = 0;

  const table = `<div class="frame hide-s"><table>
    <thead><tr><th style="width:88px">일자</th><th style="width:84px">영역</th><th style="width:70px">교시</th>
      <th class="num">시간</th><th>활동내용</th><th style="width:20%">비고</th></tr></thead>
    <tbody>${rows.map(r => `<tr>
      <td>${r.d.getMonth() + 1}.${r.d.getDate()} (${W[r.d.getDay()]})</td>
      <td><span class="tag" style="${catTone(catOf(r))}">${esc(catOf(r))}</span></td><td>${esc(r.label)}</td>
      <td class="num">${r.ok ? r.hours : '<span class="dash">확인 필요</span>'}</td>
      <td>${hl(r.text)}</td><td>${hl(r.note)}</td></tr>`).join("")}</tbody>
    <tfoot><tr><td colspan="3">합계</td><td class="num">${total}</td><td colspan="2"></td></tr></tfoot>
  </table></div>`;

  const cards = `<div class="frame cards">${rows.map(r => {
    run += r.hours;
    return `<article class="card">
      <div class="card-h"><span>${r.d.getMonth() + 1}.${r.d.getDate()} (${W[r.d.getDay()]})</span>
        <span class="tag" style="${catTone(catOf(r))}">${esc(catOf(r))}</span></div>
      <p>${hl(r.text)}</p>${r.note ? `<p style="color:var(--ink-2);font-size:var(--f-sm)">${hl(r.note)}</p>` : ""}
      <div class="card-f"><span>${r.label ? esc(r.label) + "교시 · " : ""}${r.ok ? r.hours + "시간" : "확인 필요"}</span>
        <span>누계 ${run}</span></div></article>`;
  }).join("")}</div>`;

  const note = unclear ? '<p class="strip strip-w" style="border:0;border-radius:var(--r);margin-bottom:8px">교시를 읽을 수 없는 기록은 합계에서 뺐습니다.</p>' : "";
  return { n:rows.length, html:note + table + cards };
}
