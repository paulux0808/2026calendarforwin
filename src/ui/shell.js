/* 뼈대 — 한 번 그리기(draw)와 머리·탭·도구·공지·출처·검색 결과 달, 화면 이동 */
import { TABS } from "../../config.js";
import { shiftMonth, today } from "../core/dates.js";
import { esc } from "../core/text.js";
import { sheetLink, tabsOf } from "../core/years.js";
import { activeYear } from "../data.js";
import { M, SRC, off, notices } from "../model.js";
import { hitMonths, terms } from "../search.js";
import { DEPT_NAMES, RT, S, VIEWS, VK, catTone, savePrefs, tone } from "../state.js";
import { drawCalendar, drawYear, fitCalendar } from "../views/calendar.js";
import { deptN, drawDept } from "../views/dept.js";
import { cats, catOf, drawNuga, nugaAll } from "../views/nuga.js";
import { drawRequest, saveDraft, syncRequest } from "../views/request.js";
import { drawTable } from "../views/table.js";
import { $, nothing, opt } from "./dom.js";

/* 지금 달만 걸러 보이는 검색을 달 건너 찾게 하는 줄을 띄울 때 */
export const hitsOn = () => VIEWS[S.view].month && RT.loaded && terms().length > 0;
export function hitJump(m){
  S.month = m;
  if(S.view === "calendar") S.cal.year = false;   /* 연간이면 그 달이 보이지 않는다 */
  draw();
  window.scrollTo({ top:0, behavior:"instant" });
}
export function drawHits(){
  const box = $("#hits");
  box.hidden = !hitsOn();
  if(box.hidden) return;

  const list = hitMonths(), y = S.month.slice(0, 4);
  if(!list.length){ box.innerHTML = '<span class="hits-n">일치하는 일정 없음</span>'; return; }
  const foc = document.activeElement?.dataset?.hm, left = $(".hits-c", box)?.scrollLeft || 0;
  box.innerHTML = `<span class="hits-t">검색 <b>${list.reduce((s, [, n]) => s + n, 0)}건</b></span>
    <div class="hits-c">${list.map(([m, n]) => {
      const lbl = `${m.slice(0, 4) === y ? "" : m.slice(2, 4) + "년 "}${+m.slice(5)}월`;
      return `<button type="button" class="hm" data-hm="${m}" aria-label="${lbl} ${n}건"${m === S.month ? ' aria-current="true"' : ""}>${lbl}<b>${n}</b></button>`;
    }).join("")}</div>`;

  /* 다시 그려도 키보드 초점과 가로 위치가 그대로이게 */
  if(foc) $(`[data-hm="${foc}"]`, box)?.focus({ preventScroll:true });
  const c = $(".hits-c", box), cur = $('[aria-current="true"]', c);
  c.scrollLeft = cur && c.scrollWidth > c.clientWidth ? cur.offsetLeft - (c.clientWidth - cur.offsetWidth) / 2 : left;
}

export function drawTabs(){
  $("#tabs").innerHTML = VK.map(k =>
    `<button type="button" data-v="${k}"${k === S.view ? ' aria-current="page"' : ""}>${VIEWS[k].label}</button>`).join("");
}

export function drawTools(){
  const v = S.view, out = [];
  if(VIEWS[v].month){
    const yr = v === "calendar" && S.cal.year;
    out.push(`<div class="step">
      <button class="btn btn-n" data-a="prev" type="button" aria-label="이전">‹</button>
      <input class="fld" id="mi" aria-label="${yr ? "연도" : "조회 월"}" type="${yr ? "number" : "month"}"
        ${yr ? 'min="1900" max="9999"' : 'min="1900-01" max="9999-12"'} value="${yr ? S.month.slice(0, 4) : S.month}">
      <button class="btn btn-n" data-a="next" type="button" aria-label="다음">›</button>
      <button class="btn" data-a="today" type="button">오늘</button></div>`);
  }
  if(v === "calendar") out.push(`<div class="opts">${opt("주말", "cal", "weekend")}${opt("연간", "cal", "year")}</div>`);
  if(v === "plan") out.push(`<div class="opts">${opt("부서명", "plan", "dept")}${opt("경건회", "plan", "prayer")}${opt("자습감독", "plan", "super")}${opt("주말 빼기", "plan", "noWeekend")}${opt("빈 날 숨김", "plan", "hideEmpty")}${opt("한 줄", "plan", "flat")}</div>`);
  if(v === "student") out.push(`<div class="opts">${opt("주말 빼기", "stu", "noWeekend")}${opt("빈 날 숨김", "stu", "hideEmpty")}${opt("한 줄", "stu", "flat")}</div>`);
  if(v === "dept") out.push(`<label class="lbl">부서
    <select class="fld" id="ds">${DEPT_NAMES.map(d => `<option value="${esc(d)}"${S.dept === d ? " selected" : ""}>${esc(d)} ${deptN(d)}</option>`).join("")}</select></label>`);
  if(v === "nuga"){
    out.push(`<div class="seg" role="group" aria-label="학년">${[1,2,3].map(n =>
      `<button type="button" data-g="${n}" aria-pressed="${S.grade === n}">${n}학년</button>`).join("")}</div>`);
    const base = nugaAll();
    out.push(`<div class="seg" role="group" aria-label="영역">${cats().map(c =>
      `<button type="button" data-cat="${esc(c)}" aria-pressed="${S.cat === c}" style="${catTone(c)}">${
        c === "전체" ? "" : '<span class="cm" aria-hidden="true"></span>'}${esc(c)}<b>${
        base.filter(r => c === "전체" || catOf(r) === c).reduce((s, r) => s + r.hours, 0)}</b></button>`).join("")}</div>`);
  }
  if(v === "calendar" || v === "plan"){
    const used = [...new Set(M.schedule.map(e => e.dept))].sort((a, b) => DEPT_NAMES.indexOf(a) - DEPT_NAMES.indexOf(b));
    if(used.length > 1) out.push(`<div class="opts hide-s" role="group" aria-label="부서 표시">${used.map(d =>
      `<button type="button" data-h="${esc(d)}" aria-pressed="${!off(d)}" style="${tone(d)}">${esc(d)}</button>`).join("")}</div>`);
  }
  out.push('<span class="grow"></span>');
  if(VIEWS[v].paper) out.push(`<button class="btn" data-a="open-print" type="button"${RT.loaded ? "" : " disabled"}>인쇄</button>`);
  out.push('<button class="btn btn-q btn-s" data-a="reload" type="button">새로고침</button>');

  $("#tools").innerHTML = out.join("");
  $("#tools").hidden = false;
}

/* ---- 전체 ---- */
export function draw({ keep = false } = {}){
  const top = window.scrollY;
  const act = document.activeElement, actId = act?.id, actC = act?.dataset?.c, actH = act?.dataset?.h;

  drawTabs();
  drawTools();
  drawNotice();
  drawSource();
  drawHits();

  const find = $("#find");
  find.hidden = S.view === "request";

  if(S.view === "request"){
    if(!$("#rf")) $("#view").innerHTML = drawRequest();
    syncRequest();
    $("#qn").textContent = "";
  }else{
    let r;
    if(!RT.loaded) r = { n:0, html:nothing(RT.loading ? "불러오는 중" : "불러온 자료 없음") };
    else if(S.view === "calendar") r = S.cal.year ? drawYear() : drawCalendar();
    else if(S.view === "plan" || S.view === "student") r = drawTable(S.view);
    else if(S.view === "dept") r = drawDept();
    else r = drawNuga();
    $("#view").innerHTML = r.html;
    $("#qn").textContent = terms().length ? `${r.n}` : "";
  }

  savePrefs();

  if(actC) $(`[data-c="${CSS.escape(actC)}"]`)?.focus({ preventScroll:true });
  else if(actH) $(`[data-h="${CSS.escape(actH)}"]`)?.focus({ preventScroll:true });
  else if(actId && ["mi", "ds"].includes(actId)) $("#" + actId)?.focus({ preventScroll:true });

  document.documentElement.style.setProperty("--top-h", $(".top").offsetHeight + "px");
  fitCalendar();

  if(RT.jumpToday){
    RT.jumpToday = false;
    const el = $(".now");
    if(el) el.scrollIntoView({ block:"center", behavior:"instant" });
    else if(keep) window.scrollTo({ top, behavior:"instant" });
  }else if(keep) window.scrollTo({ top, behavior:"instant" });
}

export function drawSource(){
  const box = $("#src");
  if(S.view === "request"){ box.hidden = true; return; }
  box.hidden = false;

  const list = tabsOf(activeYear(), TABS).map(x => SRC[x.key]);
  const have = list.filter(v => v.at).length;   /* 저장본이라도 내용이 있으면 있는 것 */
  const flags = list.flatMap(v => v.flags.map(t => [v.name, t]));
  const hhmm = ms => new Date(ms).toLocaleTimeString("ko-KR", { hour:"2-digit", minute:"2-digit", hour12:false });

  $("#srcSum").textContent = `자료 ${have}/${list.length}`
    + (RT.lastLoad ? ` · ${hhmm(RT.lastLoad)} 갱신` : RT.cachedAt ? " · 저장본" : "")
    + (flags.length ? ` · 확인할 행 ${flags.length}` : "");

  $("#srcBody").innerHTML = `<div class="src-body">${list.map(v => `
    <div class="src-row">
      <b>${esc(v.name)}</b>
      <span class="st${v.error ? " bad" : ""}">${
        v.error
          ? (v.at ? `${v.rows}행 저장본 · ` : "") + esc(v.error)
          : v.at ? `${v.rows}행 · ${hhmm(v.at)}` : "불러오는 중"}</span>
      <a href="${sheetLink(activeYear().sheetId, v.gid)}" target="_blank" rel="noopener">원자료</a>
    </div>`).join("")}
    ${flags.length ? `<div class="src-flags"><b>확인할 행 ${flags.length}개 — 시트를 고친 뒤 새로고침하세요</b>
      <ul>${flags.slice(0, 40).map(([name, t]) => `<li>${esc(name)} ${esc(t)}</li>`).join("")}
      ${flags.length > 40 ? `<li>… 외 ${flags.length - 40}개</li>` : ""}</ul></div>` : ""}
    <div class="src-foot">
      <span>${RT.cachedAt
        ? `이 기기에 사본 보관 중 (${new Date(RT.cachedAt).toLocaleString("ko-KR", { month:"numeric", day:"numeric", hour:"2-digit", minute:"2-digit", hour12:false })}) · 연결이 없을 때 이 사본을 보여 줍니다`
        : "이 기기에 보관된 사본이 없습니다"}</span>
      <button class="btn btn-s" data-a="clear" type="button"${RT.cachedAt ? "" : " disabled"}>사본 비우기</button>
    </div>
  </div>`;
}

export function drawNotice(){
  const list = notices();
  const bar = $("#notice");
  if(!list.length || S.view === "request"){ bar.hidden = true; return; }
  bar.hidden = false;
  $("#noticeText").textContent = list[0].text;
  $("#noticeMore").hidden = list.length < 2;
  $("#noticeMore").textContent = `${list.length}건 모두 보기`;
}

export function go(v){
  if(!Object.hasOwn(VIEWS, v) || v === S.view) return;
  saveDraft();
  S.view = v; S.q = ""; $("#q").value = "";
  RT.jumpToday = v === "dept" || (["calendar", "plan", "student"].includes(v) && !S.cal.year);
  draw();
  window.scrollTo({ top:0, behavior:"instant" });
}
export function step(n){
  const next = shiftMonth(S.month, n * (S.view === "calendar" && S.cal.year ? 12 : 1));
  if(+next.slice(0, 4) < 1900 || +next.slice(0, 4) > 9999) return;
  S.month = next;
  draw();
}
export function goToday(){ S.month = today().slice(0, 7); RT.jumpToday = true; draw(); }
