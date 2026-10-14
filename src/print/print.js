/* 인쇄 — A4 한 장 종이 만들기, 글자 크기 맞추기, 미리보기 창, 브라우저 인쇄 연결 */
import { W, ayOf, key, m1, monthDays, p2, today } from "../core/dates.js";
import { esc } from "../core/text.js";
import { IX, M, off } from "../model.js";
import { RT, S, VIEWS } from "../state.js";
import { $, chk } from "../ui/dom.js";

export const P = { w:196, h:281, max:11, min:6.6 };
export const mm = v => v * 96 / 25.4;
export const PR = { view:"", fit:null };
export function setPaperSize(){
  const landscape = PR.view === "calendar";
  P.w = landscape ? 283 : 196;
  P.h = landscape ? 194 : 281;
  const stage = $("#stage");
  stage.style.setProperty("--paper-width", P.w + "mm");
  stage.style.setProperty("--paper-height", P.h + "mm");
  $("#printPageStyle").textContent = `@page{size:A4 ${landscape ? "landscape" : "portrait"};margin:7mm}`;
}

export function paperHTML(v){
  const o = S.print, d = m1(S.month), ay = ayOf(d), mn = d.getMonth() + 1;
  const now = today();

  if(v === "calendar"){
    const days = monthDays(S.month, !o.weekend);
    const cols = o.weekend ? 7 : 5;
    const heads = o.weekend ? ["일","월","화","수","목","금","토"] : ["월","화","수","목","금"];
    const colOf = x => o.weekend ? x.getDay() + 1 : x.getDay();
    const weeks = Math.ceil((colOf(days[0]) - 1 + days.length) / cols);
    const pad = c => '<div class="c"></div>'.repeat(Math.max(0, c));
    const cells = days.map(x => {
      const k = key(x), w = x.getDay();
      const rows = (IX.day.get(k) || []).filter(e => !off(e.dept));
      const cls = ["c"];
      if(w === 0 || w === 6) cls.push("we", `s${w}`);
      if(k === now) cls.push("nw");
      return `<div class="${cls.join(" ")}"><b>${x.getDate()}</b>${rows.map(e =>
        `<span class="pe">${o.dept ? `<span class="pd">[${esc(e.dept)}]</span> ` : ""}${esc(e.text)}</span>`).join("")}</div>`;
    }).join("");
    return `<div class="paper"><h1>${ay}학년도 ${mn}월 학사일정</h1>
      <div class="pcal" style="--print-weeks:${weeks};grid-template-columns:repeat(${cols},minmax(0,1fr))">
        ${heads.map(h => `<div class="h">${h}</div>`).join("")}
        ${pad(colOf(days[0]) - 1)}${cells}${pad(cols - colOf(days.at(-1)))}</div>
      <div class="pf"><span>${esc(hiddenNote())}</span><span>${stamp()}</span></div></div>`;
  }

  const plan = v === "plan";
  const src = plan ? IX.day : IX.stuDay;
  const rows = monthDays(S.month, !o.weekend).map(x => {
    const k = key(x);
    return { x, k, rows:(src.get(k) || []).filter(e => plan ? !off(e.dept) : true),
             prayer:M.prayer.get(k)?.name || "", sup:M.super.get(k) || "" };
  });
  const sp = plan && o.prayer, ss = plan && o.super;

  return `<div class="paper${o.flat ? " flat" : ""}">
    <h1>${ay}학년도 ${mn}월 ${plan ? "학사운영 계획" : "학생일정"}</h1>
    <table><colgroup><col style="width:7mm"><col style="width:8.5mm"><col>
      ${sp ? '<col style="width:20mm">' : ""}${ss ? '<col style="width:20mm">' : ""}</colgroup>
    <thead><tr><th class="p1">일</th><th class="p2">요일</th><th>${plan ? "주요 행사" : "학생일정"}</th>
      ${sp ? '<th class="p3">경건회</th>' : ""}${ss ? '<th class="p3">자습감독</th>' : ""}</tr></thead>
    <tbody>${rows.map(r => {
      const w = r.x.getDay(), cls = [];
      if(w === 0 || w === 6) cls.push("we", `s${w}`);
      if(r.k === now) cls.push("nw");
      return `<tr class="${cls.join(" ")}"><td class="p1">${r.x.getDate()}</td><td class="p2">${W[w]}</td>
        <td>${r.rows.map(e => `<span class="pe">${plan && o.dept ? `<span class="pd">[${esc(e.dept)}]</span> ` : ""}${esc(e.text)}</span>`).join("")
          || '<span class="pn">—</span>'}</td>
        ${sp ? `<td class="p3">${esc(r.prayer)}</td>` : ""}${ss ? `<td class="p3">${esc(r.sup)}</td>` : ""}</tr>`;
    }).join("")}</tbody></table>
    <div class="pf"><span>${esc(hiddenNote())}</span><span>${stamp()}</span></div></div>`;
}
export const hiddenNote = () => S.hidden.length ? `숨김: ${S.hidden.join(", ")}` : "";
export const stamp = () => { const n = new Date(); return `${n.getFullYear()}. ${p2(n.getMonth() + 1)}. ${p2(n.getDate())}`; };

/* 글자를 키울 수 있는 만큼 키우고, 남는 세로를 행이 나눠 갖고, 그래도 넘치면 통째로 줄인다 */
export function fitPaper(stage){
  const paper = stage.querySelector(".paper");
  const limH = mm(P.h) - 2, limW = mm(P.w);
  paper.style.removeProperty("--pr");
  paper.style.removeProperty("--pp");
  paper.style.transform = "none";

  const at = s => { paper.style.setProperty("--pf", `${s}pt`); return paper.getBoundingClientRect().height; };
  const best = () => {
    if(at(P.max) <= limH) return P.max;
    let lo = P.min, hi = P.max;
    for(let i = 0; i < 12; i++){ const mid = (lo + hi) / 2; if(at(mid) <= limH) lo = mid; else hi = mid; }
    return Math.floor(lo * 100) / 100;
  };

  /* 이분 탐색의 경계값은 딱 맞지 않을 수 있다. 실제로 들어갈 때까지 한 칸씩 줄인다. */
  const settle = () => {
    let font = best();
    at(font);
    for(let i = 0; i < 40 && paper.getBoundingClientRect().height > limH && font > P.min; i++){
      font = Math.max(P.min, Math.round((font - 0.05) * 100) / 100);
      at(font);
    }
    return font;
  };
  let font = settle();
  if(paper.getBoundingClientRect().height > limH){
    paper.style.setProperty("--pp", "0.5px");
    font = settle();
  }
  let h = paper.getBoundingClientRect().height;
  /* scrollWidth 는 정수로 올림돼서 1px 쯤 넘는 것처럼 보인다. 그 정도는 넘긴 것으로 치지 않는다. */
  const wide = paper.scrollWidth > limW + 1 ? limW / paper.scrollWidth : 1;
  let scale = Math.min(1, wide, limH / h);

  if(scale >= 1){
    /* 표는 행 수, 달력은 격자 줄 수를 기준으로 남는 세로를 나눈다 */
    let count = paper.querySelectorAll("tbody tr").length;
    if(!count){
      const cal = paper.querySelector(".pcal");
      const cols = getComputedStyle(cal).gridTemplateColumns.split(" ").filter(Boolean).length || 7;
      count = Math.max(1, Math.ceil(cal.children.length / cols) - 1);
    }
    let lo = 0, hi = limH / Math.max(count, 1);
    for(let i = 0; i < 12; i++){
      const mid = (lo + hi) / 2;
      paper.style.setProperty("--pr", `${mid}px`);
      if(paper.getBoundingClientRect().height <= limH) lo = mid; else hi = mid;
    }
    paper.style.setProperty("--pr", `${Math.floor(lo * 100) / 100}px`);
    h = paper.getBoundingClientRect().height;
    scale = Math.min(1, limH / h);
  }
  if(scale < 1) scale *= 0.998;
  paper.style.transform = `scale(${scale})`;
  return { font, scale, pt:font * scale };
}
export function buildPaper(){
  setPaperSize();
  const stage = $("#stage"), prev = stage.style.transform;
  stage.style.transform = "none";
  stage.innerHTML = paperHTML(PR.view);
  PR.fit = fitPaper(stage);
  stage.style.transform = prev;

  const pt = PR.fit.pt, tight = pt < 7.4, o = S.print;
  const tips = [];
  if(PR.view !== "calendar" && !o.flat) tips.push("한 줄");
  if(PR.view === "plan" && (o.prayer || o.super)) tips.push("경건회·자습감독 끄기");
  if(o.weekend) tips.push("주말 빼기");
  const el = $("#fit");
  el.className = `fit${tight ? " tight" : ""}`;
  el.textContent = !tight ? `A4 ${PR.view === "calendar" ? "가로" : "세로"} 한 장 · ${pt.toFixed(1)}pt`
    : tips.length ? `${pt.toFixed(1)}pt — ${tips.join(", ")}` : `${pt.toFixed(1)}pt · 나눠 인쇄 권장`;
}
export function scaleView(){
  const view = $("#pview"), stage = $("#stage");
  const w = view.clientWidth - 20;
  const room = Math.max(240, innerHeight * 0.84 - 190);
  const s = Math.max(0.15, Math.min(1, w / mm(P.w), room / mm(P.h)));
  stage.style.transform = `scale(${s})`;
  stage.style.marginLeft = `${Math.max(0, (w - mm(P.w) * s) / 2)}px`;
  view.style.height = `${mm(P.h) * s + 20}px`;
}
export function printOpts(){
  const v = PR.view, out = [chk("주말", "print", "weekend")];
  if(v === "plan" || v === "calendar") out.push(chk("부서명", "print", "dept"));
  if(v === "plan"){ out.push(chk("경건회", "print", "prayer")); out.push(chk("자습감독", "print", "super")); }
  if(v !== "calendar") out.push(chk("한 줄", "print", "flat"));
  return out.join("");
}
export function openPrint(){
  if(!RT.loaded || !VIEWS[S.view].paper) return;
  PR.view = S.view;
  $("#pview").appendChild($("#stage"));
  $("#pset").innerHTML = printOpts();
  if(!$("#pdlg").open) $("#pdlg").showModal();
  buildPaper();
  scaleView();
}
export function doPrint(){
  const stage = $("#stage");
  $("#pdlg").close();
  $("#proot").appendChild(stage);
  stage.style.transform = "none";
  stage.style.marginLeft = "0";
  RT.printing = true;
  document.body.classList.add("pr");
  clearTimeout(RT.printTimer);
  RT.printTimer = setTimeout(endPrint, 4000);
  print();
}
export function endPrint(){
  clearTimeout(RT.printTimer);
  if(!RT.printing) return;
  RT.printing = false;
  document.body.classList.remove("pr");
  if($("#pdlg").open){ $("#pview").appendChild($("#stage")); scaleView(); }
}

/* 브라우저의 인쇄(Ctrl+P 포함) 전후에 종이를 붙였다 뗀다 */
export function bindPrint(){
  addEventListener("afterprint", endPrint);
  addEventListener("beforeprint", () => {
    if(RT.printing || !RT.loaded) return;
    const open = $("#pdlg").open;
    if(!open && !VIEWS[S.view].paper) return;
    if(!open) PR.view = S.view;
    $("#proot").appendChild($("#stage"));
    $("#stage").style.transform = "none";
    $("#stage").style.marginLeft = "0";
    try{ if(!open) buildPaper(); }catch{ return; }
    RT.printing = true;
    document.body.classList.add("pr");
    clearTimeout(RT.printTimer);
    RT.printTimer = setTimeout(endPrint, 4000);
  });
}
