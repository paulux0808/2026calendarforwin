/* 달력 — 월 달력 칸 그리기, 칸 높이 맞추기와 +N 접기, 연간 미니 달력 */
import { W, key, monthDays, p2, today } from "../core/dates.js";
import { hl } from "../search.js";
import { onDay } from "../model.js";
import { S, tone } from "../state.js";
import { $, $$, dnum, evHTML } from "../ui/dom.js";

/* ---- 연간: 열두 달을 한 화면에 ---- */
export function drawYear(){
  const y = +S.month.slice(0, 4), now = today();
  const heads = ["일","월","화","수","목","금","토"];
  let n = 0;

  const html = Array.from({ length:12 }, (_, i) => {
    const mk = `${y}-${p2(i + 1)}`;
    const days = monthDays(mk, false);
    const lead = days[0].getDay();
    let count = 0;
    const cells = days.map(d => {
      const k = key(d), w = d.getDay(), list = onDay(k);
      count += list.length;
      const cls = [w === 0 ? "s0" : w === 6 ? "s6" : "", list.length ? "on" : "", k === now ? "now" : ""];
      return `<button type="button" data-d="${k}" class="${cls.join(" ").trim()}"
        aria-label="${i + 1}월 ${d.getDate()}일 일정 ${list.length}건">${d.getDate()}${
        list.length ? `<span class="n">${list.length}</span>` : ""}</button>`;
    }).join("");
    n += count;
    return `<section class="mini">
      <div class="mini-h"><button type="button" data-ym="${mk}">${i + 1}월</button><span>${count ? count + "건" : ""}</span></div>
      <div class="mini-g">${heads.map((w, j) =>
        `<span class="w ${j === 6 ? "s6" : j === 0 ? "s0" : ""}">${w}</span>`).join("")}
        ${'<span class="pad"></span>'.repeat(lead)}${cells}${'<span class="pad"></span>'.repeat(42 - lead - days.length)}</div>
    </section>`;
  }).join("");

  return { n, html:`<div class="years">${html}</div>` };
}

/* ---- 달력 ---- */
export function fitCalendar(){
  const cal = $(".cal");
  if(!cal) return;
  const bottom = parseFloat(getComputedStyle($("#main")).paddingBottom) || 0;
  const top = cal.getBoundingClientRect().top + window.scrollY;
  cal.style.setProperty("--calendar-height", Math.max(240, window.innerHeight - top - bottom) + "px");
  clampCells(cal);
}
/* 칸 높이는 격자가 정한다. 넘치는 일정을 뒤에서부터 감추고 +N 단추로 하루 상세를 연다.
   주말을 접었을 때는 금요일 칸 아래의 토·일 일정부터 감춰진다. */
export function clampCells(cal){
  for(const c of $$(".d[data-k]", cal)){
    c.querySelector(".more")?.remove();
    const items = $$(".ev", c).map(e => e.closest("li") || e);
    const fold = c.querySelector(".fold");
    items.forEach(x => { x.hidden = false; });
    if(fold) fold.hidden = false;
    if(c.scrollHeight <= c.clientHeight + 1) continue;

    const more = document.createElement("button");
    more.type = "button"; more.className = "more"; more.dataset.d = c.dataset.k;
    c.appendChild(more);
    let n = 0;
    for(let i = items.length - 1; i >= 0 && (n === 0 || c.scrollHeight > c.clientHeight + 1); i--){
      items[i].hidden = true;
      n++;
      more.textContent = `+${n}`;
      if(fold && !fold.querySelector(".ev:not([hidden])")) fold.hidden = true;
    }
    more.setAttribute("aria-label", `${n}건 더 보기`);
  }
}
export function drawCalendar(){
  const wk = S.cal.weekend;
  const months = [S.month];
  const heads = wk ? ["일","월","화","수","목","금","토"] : ["월","화","수","목","금"];
  const cols = wk ? 7 : 5;
  const now = today();
  let n = 0;

  const html = months.map(mk => {
    const days = monthDays(mk, !wk);
    const colOf = d => wk ? d.getDay() + 1 : d.getDay();
    const weeks = Math.ceil((colOf(days[0]) - 1 + days.length) / cols);
    const pad = c => '<div class="d-x" aria-hidden="true"></div>'.repeat(Math.max(0, c));

    const cells = days.map(d => {
      const k = key(d), w = d.getDay();
      const list = onDay(k);
      n += list.length;

      /* 주말을 접어도 토·일 일정이 사라지지 않게 금요일 칸에 모은다 */
      let fold = "", extra = 0;
      if(!wk && w === 5){
        const side = [1, 2].map(i => {
          const s = new Date(d);
          s.setDate(d.getDate() + i);
          if(s.getMonth() !== d.getMonth()) return null;
          const rows = onDay(key(s));
          n += rows.length;
          return rows.length ? { s, rows } : null;
        }).filter(Boolean);
        extra = side.reduce((t, x) => t + x.rows.length, 0);
        if(side.length) fold = `<div class="fold"><span class="fold-h">주말</span>${side.map(({ s, rows }) =>
          rows.map(e => `<button type="button" class="ev" data-e="${e.id}" style="${tone(e.dept)}">
            <span class="tag">${W[s.getDay()]} ${s.getDate()}</span>${hl(e.text)}</button>`).join("")).join("")}</div>`;
      }

      const cls = ["d"];
      if(k === now) cls.push("now");
      if(w === 0) cls.push("s0", "wk");
      if(w === 6) cls.push("s6", "wk");
      const total = list.length + extra;
      return `<section class="${cls.join(" ")}" data-k="${k}" aria-label="${d.getMonth() + 1}월 ${d.getDate()}일 ${W[w]}요일, 일정 ${total}건">${dnum(d)}
        <ul>${list.map(e => `<li>${evHTML(e)}</li>`).join("")}</ul>
        ${list.length || fold ? "" : '<span class="d-none">—</span>'}${fold}</section>`;
    }).join("");

    return `<div class="cal" style="--c:${cols};--weeks:${weeks}">
        ${heads.map(h => `<div class="cal-h ${h === "토" ? "s6" : h === "일" ? "s0" : ""}">${h}</div>`).join("")}
        ${pad(colOf(days[0]) - 1)}${cells}${pad(cols - colOf(days.at(-1)))}</div>`;
  }).join("");

  return { html, n };
}
