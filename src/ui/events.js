/* 조작 — 문서·창 전체의 이벤트를 한곳에서 연결한다 (클릭 · 입력 · 키 · 창 · 주기 갱신) */
import { TIMING } from "../../config.js";
import { m1 } from "../core/dates.js";
import { KEYS } from "../core/store.js";
import { esc } from "../core/text.js";
import { reload } from "../data.js";
import { IX, notices, off } from "../model.js";
import { hitMonths } from "../search.js";
import { RT, S, VIEWS, VK, applyPrefs, savePrefs } from "../state.js";
import { buildPaper, doPrint, openPrint, scaleView } from "../print/print.js";
import { fitCalendar } from "../views/calendar.js";
import { askAbout, isSending, saveDraft, send } from "../views/request.js";
import { $, $$, hideWarn, toast } from "./dom.js";
import { DAY, copyDay, moveDay, openDay } from "./day.js";
import { openSettings, info } from "./settings.js";
import { draw, drawSource, go, goToday, hitJump, hitsOn, step } from "./shell.js";

let qt = null, rt = null;
const applyQ = () => { S.q = $("#q").value; draw({ keep:true }); };

/* 엔터는 다음 일치 달로 (끝에서 처음으로). 한글 조합을 확정하는 엔터는 건드리지 않는다 —
   Safari 는 compositionend 뒤에 keyCode 229 로 보낸다. */
function onQEnter(ev){
  if(ev.key !== "Enter" || ev.isComposing || ev.keyCode === 229 || ev.target.dataset.ime) return;
  clearTimeout(qt);
  S.q = ev.target.value;
  const ms = hitsOn() ? hitMonths().map(([m]) => m) : [];
  const next = ms.find(m => m > S.month) || ms[0];
  if(next && next !== S.month) hitJump(next);
  else draw({ keep:true });
}

function onClick(ev){
  const t = ev.target.closest("button");
  if(!t){
    /* 달력 칸은 빈 곳을 눌러도 그날이 열린다. 폰에서는 칸 전체가 누르는 자리다. */
    const c = ev.target.closest(".cal .d[data-k]");
    if(c) openDay(c.dataset.k);
    return;
  }

  if(t.dataset.v){ go(t.dataset.v); return; }
  if(t.dataset.e){
    const e = IX.byId.get(t.dataset.e);
    if(e) openDay(e.k, e.id);
    return;
  }
  if(t.dataset.d){ openDay(t.dataset.d); return; }
  if(t.dataset.ym){ S.month = t.dataset.ym; S.cal.year = false; draw(); window.scrollTo({ top:0, behavior:"instant" }); return; }
  if(t.dataset.ask){ const e = IX.byId.get(t.dataset.ask); askAbout(e ? e.k : DAY.k, e); return; }
  if(t.dataset.dept){
    $("#ddlg").close();
    S.dept = t.dataset.dept; S.view = "dept"; S.q = ""; $("#q").value = "";
    draw();
    window.scrollTo({ top:0, behavior:"instant" });
    return;
  }
  if(t.dataset.h){
    const d = t.dataset.h;
    S.hidden = off(d) ? S.hidden.filter(x => x !== d) : [...S.hidden, d];
    draw({ keep:true });
    return;
  }
  if(t.dataset.c && t.tagName === "BUTTON"){
    const [g, k] = t.dataset.c.split(".");
    if(typeof S[g]?.[k] === "boolean"){ S[g][k] = !S[g][k]; draw({ keep:true }); }
    return;
  }
  if(t.dataset.g){ S.grade = +t.dataset.g; S.cat = "전체"; draw({ keep:true }); return; }
  if(t.dataset.cat){ S.cat = t.dataset.cat; draw({ keep:true }); return; }
  if(t.dataset.hm){ hitJump(t.dataset.hm); return; }
  if(t.dataset.th){ S.theme = t.dataset.th; applyPrefs(); savePrefs(); openSettings(); return; }
  if(t.dataset.fs){ S.fs = +t.dataset.fs; applyPrefs(); savePrefs(); openSettings(); return; }

  switch(t.dataset.a){
    case "prev": step(-1); break;
    case "next": step(1); break;
    case "today": goToday(); break;
    case "reload": reload(); break;
    case "alert-x": hideWarn(); break;
    case "close": t.closest("dialog")?.close(); break;
    case "open-print": openPrint(); break;
    case "print": doPrint(); break;
    case "notices": info("공지사항", notices().map(n =>
      `<p style="white-space:pre-wrap;margin-bottom:12px">${esc(n.text)}</p>`).join("")); break;
    case "d-prev": moveDay(-1); break;
    case "d-next": moveDay(1); break;
    case "d-copy": copyDay(); break;
    case "d-ask": askAbout(DAY.k, null); break;
    case "clear":
      try{ localStorage.removeItem(KEYS.CACHE); }catch{}
      RT.cachedAt = 0;
      drawSource();
      toast("이 기기에 보관하던 사본을 지웠습니다");
      break;
  }
}

function onChange(ev){
  const el = ev.target;
  if(el.dataset.c && el.type === "checkbox"){
    const [g, k] = el.dataset.c.split(".");
    if(typeof S[g]?.[k] === "boolean"){
      S[g][k] = el.checked;
      savePrefs();
      if(g === "print"){ buildPaper(); scaleView(); } else draw({ keep:true });
    }
    return;
  }
  if(el.id === "mi"){
    const v = el.type === "number" ? `${el.value}-01` : el.value;
    if(/^\d{4}-\d{2}$/.test(v) && m1(v)){ S.month = v; draw(); }
    else el.value = el.type === "number" ? S.month.slice(0, 4) : S.month;
    return;
  }
  if(el.id === "ds"){ S.dept = el.value; draw(); return; }
  if(el.closest("#rf")) saveDraft();
}

function onInput(ev){
  const el = ev.target;
  if(el.id === "q"){
    clearTimeout(qt);
    if(!el.dataset.ime) qt = setTimeout(applyQ, 140);
    return;
  }
  if(el.closest("#rf")) saveDraft();
}

function onKey(ev){
  if(ev.metaKey || ev.ctrlKey || ev.altKey) return;
  const a = document.activeElement;
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(a?.tagName || "") || a?.isContentEditable;
  const dlgOpen = $$("dialog[open]").length > 0;

  if(ev.key === "Escape" && !dlgOpen && S.q){ S.q = ""; $("#q").value = ""; draw({ keep:true }); return; }
  if(typing || dlgOpen) return;

  if(ev.key === "/"){ ev.preventDefault(); $("#q")?.focus(); return; }
  const n = Number(ev.key);
  if(Number.isInteger(n) && n >= 1 && n <= VK.length){ ev.preventDefault(); go(VK[n - 1]); return; }
  const k = ev.key.toLowerCase();
  if(k === "t"){ ev.preventDefault(); goToday(); return; }
  if(k === "r"){ ev.preventDefault(); reload(); return; }
  if(k === "p" && RT.loaded && VIEWS[S.view].paper){ ev.preventDefault(); openPrint(); return; }
  if(VIEWS[S.view].month){
    if(ev.key === "ArrowLeft"){ ev.preventDefault(); step(-1); }
    if(ev.key === "ArrowRight"){ ev.preventDefault(); step(1); }
  }
}

export function bindEvents(){
  $("#q").addEventListener("keydown", onQEnter);
  document.addEventListener("click", onClick);
  document.addEventListener("change", onChange);
  document.addEventListener("input", onInput);
  document.addEventListener("compositionstart", ev => { if(ev.target.id === "q") ev.target.dataset.ime = "1"; });
  document.addEventListener("compositionend", ev => {
    if(ev.target.id !== "q") return;
    delete ev.target.dataset.ime;
    clearTimeout(qt);
    applyQ();
  });
  document.addEventListener("submit", ev => { if(ev.target.id === "rf") send(ev); });

  for(const id of ["ddlg", "pdlg", "sdlg", "idlg"]){
    const dlg = $("#" + id);
    dlg.addEventListener("click", ev => {
      if(ev.target !== dlg) return;
      const r = dlg.getBoundingClientRect();
      if(ev.clientX < r.left || ev.clientX > r.right || ev.clientY < r.top || ev.clientY > r.bottom) dlg.close();
    });
  }
  $("#ddlg").addEventListener("close", () => { DAY.k = ""; DAY.id = ""; });
  $("#pdlg").addEventListener("close", () => {
    $("#proot").appendChild($("#stage"));
    $("#stage").style.transform = "none";
    $("#stage").style.marginLeft = "0";
  });
  $("#sdlg").addEventListener("close", () => draw({ keep:true }));
  $("#setBtn").addEventListener("click", openSettings);

  document.addEventListener("keydown", onKey);

  addEventListener("resize", () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      document.documentElement.style.setProperty("--top-h", $(".top").offsetHeight + "px");
      fitCalendar();
      if($("#pdlg").open) scaleView();
    }, 150);
  });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { if(S.theme === "system") applyPrefs(); });
  document.addEventListener("visibilitychange", () => {
    if(!document.hidden && Date.now() - RT.lastLoad > TIMING.POLL_MS && !isSending()) reload();
  });
  setInterval(() => { if(!document.hidden && !isSending() && !RT.printing) reload(); }, TIMING.POLL_MS);
}
