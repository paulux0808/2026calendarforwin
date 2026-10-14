/* 하루 상세 — 그날의 교직원·학생 일정과 담당, 앞뒤 날 이동, 복사 */
import { W, key, toDate } from "../core/dates.js";
import { esc } from "../core/text.js";
import { M, dayRows } from "../model.js";
import { tone } from "../state.js";
import { $, toast } from "./dom.js";

export const DAY = { k:"", id:"" };

export function fillDay(k, id = ""){
  const d = toDate(k);
  if(!d) return;
  DAY.k = k; DAY.id = id;
  $("#dtitle").textContent = `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${W[d.getDay()]})`;

  const { staff, stu, deptOf } = dayRows(k);
  const prayer = M.prayer.get(k), sup = M.super.get(k) || "";
  let html = "";

  const block = (label, rows, isStu) => {
    html += `<h3>${label}</h3>`;
    if(!rows.length){ html += '<p style="color:var(--ink-3);font-size:var(--f-sm)">없음</p>'; return; }
    html += rows.map(e => {
      const dept = isStu ? deptOf.get(e.id) || "" : e.dept;
      return `<div class="item${e.id === id ? " on" : ""}" style="${tone(dept)}">
        ${dept ? `<button class="tag" data-dept="${esc(dept)}" type="button">${esc(dept)}</button>` : ""}
        <p>${esc(e.text)}</p>
        <button class="btn btn-s btn-q" data-ask="${e.id}" type="button">수정 요청</button></div>`;
    }).join("");
  };
  block("교직원 일정", staff, false);
  block("학생 일정", stu, true);

  const meta = [["경건회", prayer?.name], ["말씀", prayer?.bible], ["찬송", prayer?.hymn], ["자습감독", sup]]
    .filter(([, v]) => v);
  if(meta.length) html += `<h3>담당</h3><dl class="duty">${meta.map(([a, b]) => `<dt>${a}</dt><dd>${esc(b)}</dd>`).join("")}</dl>`;
  $("#dbody").innerHTML = html;
}
export function openDay(k, id = ""){
  fillDay(k, id);
  if(!$("#ddlg").open) $("#ddlg").showModal();
}
export function moveDay(n){
  if(!DAY.k) return;
  const d = toDate(DAY.k);
  d.setDate(d.getDate() + n);
  fillDay(key(d));
}
export function dayText(k){
  const { staff, stu } = dayRows(k);
  const prayer = M.prayer.get(k), sup = M.super.get(k) || "";
  const d = toDate(k);
  const out = [`${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${W[d.getDay()]})`];
  for(const e of staff) out.push(`[${e.dept}] ${e.text}`);
  for(const e of stu) out.push(`[학생] ${e.text}`);
  if(prayer) out.push(`경건회 ${prayer.name}${prayer.bible ? ` / ${prayer.bible}` : ""}${prayer.hymn ? ` / ${prayer.hymn}` : ""}`);
  if(sup) out.push(`자습감독 ${sup}`);
  return out.join("\n");
}
export async function copyDay(){
  if(!DAY.k) return;
  try{ await navigator.clipboard.writeText(dayText(DAY.k)); toast("복사했습니다"); }
  catch{ toast("복사할 수 없습니다"); }
}
