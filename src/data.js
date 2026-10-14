/* 자료 받기 — 사용할 학년도 시트 고르기, gviz JSONP 요청, 새로 받아 화면에 반영 */
import { TABS, TIMING, YEARS } from "../config.js";
import { ayOf, m1, today } from "./core/dates.js";
import { decode, validate } from "./core/sheet.js";
import { pickYear, tabsOf } from "./core/years.js";
import { M, SRC, reindex, saveCache } from "./model.js";
import { DEPT_NAMES, RT, S } from "./state.js";
import { $, $$, hideWarn, warn } from "./ui/dom.js";
import { DAY, fillDay } from "./ui/day.js";
import { draw } from "./ui/shell.js";

/* 지금 읽는 학년도 항목 — 처음 불러올 때의 달로 한 번 정한다. 시트를 읽는 곳은 모두 여기를 거친다 */
let active = null;
export const activeYear = () => active || (active = pickYear(YEARS, S.month));

/* gviz는 JSONP만 준다 */
export function fetchSheet(sheet){
  return new Promise((res, rej) => {
    const cb = `hs_${sheet.key}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const el = document.createElement("script");
    let done = false;
    const end = (err, raw) => {
      if(done) return;
      done = true;
      clearTimeout(t); el.remove(); window[cb] = () => {};
      setTimeout(() => { delete window[cb]; }, 60000);
      err ? rej(err) : res(raw);
    };
    const t = setTimeout(() => end(new Error("응답 시간 초과")), TIMING.LOAD_MS);
    window[cb] = raw => { try{ end(null, validate(raw)); }catch(err){ end(err); } };
    el.onerror = () => end(new Error("연결하지 못했습니다"));
    el.src = `https://docs.google.com/spreadsheets/d/${activeYear().sheetId}/gviz/tq`
      + `?gid=${sheet.gid}&tqx=out:json;responseHandler:${cb}&_=${Date.now()}`;
    document.body.appendChild(el);
  });
}

export async function reload(){
  if(RT.job) return RT.job;
  if(RT.printing) return Promise.resolve();
  RT.loading = true;
  $$('[data-a="reload"]').forEach(b => { b.disabled = true; });

  RT.job = (async () => {
    const tabs = tabsOf(activeYear(), TABS);
    const out = await Promise.allSettled(tabs.map(fetchSheet));
    const bad = [];
    const stamp = Date.now();
    let ok = 0;
    out.forEach((r, i) => {
      const sheet = tabs[i];
      const slot = SRC[sheet.key];
      slot.name = sheet.name; slot.gid = sheet.gid;   /* 학년도 항목이 탭을 따로 줬을 수 있다 */
      try{
        if(r.status !== "fulfilled") throw r.reason;
        const table = r.value;
        const res = decode(sheet.key, table, { deptNames:DEPT_NAMES, baseYear:ayOf(M.schedule[0]?.d || m1(S.month)) });
        M[sheet.key === "notice" ? "notices" : sheet.key === "supervisor" ? "super" : sheet.key] = res.items;
        slot.rows = table.rows.length;
        slot.at = stamp;
        slot.error = "";
        slot.flags = res.flags;
        ok++;
      }catch(err){
        slot.error = String(err?.message || err || "실패").slice(0, 160);
        bad.push(sheet.name);
      }
    });
    reindex();
    RT.loaded = RT.loaded || ok > 0;
    if(ok){ RT.lastLoad = Date.now(); saveCache(); }
    if(RT.first && !RT.hadMonth) alignMonth();
    RT.first = false;

    if(!ok) warn(RT.cachedAt ? "연결되지 않아 저장본을 보여 줍니다." : "불러오지 못했습니다.");
    else if(bad.length) warn(`${bad.join(", ")} 실패`);
    else hideWarn();
  })().finally(() => {
    RT.loading = false; RT.job = null;
    $$('[data-a="reload"]').forEach(b => { b.disabled = false; });
    draw({ keep:true });
    if(DAY.k && $("#ddlg").open) fillDay(DAY.k, DAY.id);
  });
  return RT.job;
}
export function alignMonth(){
  const src = M.schedule.length ? M.schedule : M.student;
  if(!src.length || src.some(e => e.k.startsWith(S.month))) return;
  S.month = (src.find(e => e.k >= today()) || src.at(-1)).k.slice(0, 7);
}
