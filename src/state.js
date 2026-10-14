/* 상태 — 사용자 설정 S, 실행 중 깃발 RT, 화면 목록, 부서·영역 색, 설정 저장·불러오기 */
import { CAT_TONE, DEPTS } from "../config.js";
import { m1, mKey } from "./core/dates.js";
import { KEYS, read, sread, swrite, write } from "./core/store.js";

export const DEPT_NAMES = DEPTS.map(d => d[0]);
export const TONE = new Map(DEPTS.map(([n, h, s]) => [n, `--dh:${h};--ds:${s}%`]));
export const tone = d => TONE.get(d) || TONE.get("기타");
export const catTone = c => CAT_TONE[c] || "--dh:212;--ds:7%";

export const VIEWS = {
  calendar:{ label:"달력",    month:true,  paper:true  },
  plan:    { label:"월중 계획", month:true,  paper:true  },
  student: { label:"학생일정",  month:true,  paper:true  },
  dept:    { label:"부서",     month:false, paper:false },
  nuga:    { label:"누가기록",  month:false, paper:false },
  request: { label:"수정 요청", month:false, paper:false }
};
export const VK = Object.keys(VIEWS);

export const S = {
  view:"calendar", month:mKey(new Date()), q:"",
  theme:"system", fs:1,
  dept:DEPT_NAMES[0], hidden:[], grade:1, cat:"전체",
  cal:{ weekend:true, year:false },
  plan:{ dept:true, prayer:true, super:true, noWeekend:false, hideEmpty:false, flat:false },
  stu:{ noWeekend:false, hideEmpty:false, flat:false },
  print:{ weekend:true, dept:true, prayer:true, super:true, flat:false }
};

/* 모듈이 함께 쓰고 바꾸는 실행 중 깃발 — import 한 let 은 읽기 전용이라 한 객체에 모은다 */
export const RT = {
  loading:false, loaded:false, job:null, lastLoad:0, first:true, cachedAt:0,
  printing:false, printTimer:null, jumpToday:false, hadMonth:false
};

/* 달은 이 탭이 열려 있는 동안만 기억한다. 새로 열면 이번 달에서 시작 */
const readMonth = () => sread(KEYS.MONTH);
const writeMonth = v => swrite(KEYS.MONTH, v);

export function loadPrefs(){
  const p = read(KEYS.PREFS, {}) || {};
  if(Object.hasOwn(VIEWS, p.view)) S.view = p.view;
  const mo = readMonth();
  if(typeof mo === "string" && /^\d{4}-\d{2}$/.test(mo) && m1(mo)){ S.month = mo; RT.hadMonth = true; }
  for(const g of ["cal", "plan", "stu", "print"])
    for(const k of Object.keys(S[g])) if(typeof p[g]?.[k] === "boolean") S[g][k] = p[g][k];
  if(["light","dark","system"].includes(p.theme)) S.theme = p.theme;
  if([0.92,1,1.1,1.22].includes(p.fs)) S.fs = p.fs;
  if(DEPT_NAMES.includes(p.dept)) S.dept = p.dept;
  if(Array.isArray(p.hidden)) S.hidden = p.hidden.filter(d => DEPT_NAMES.includes(d));
  if([1,2,3].includes(p.grade)) S.grade = p.grade;
  if(typeof p.cat === "string") S.cat = p.cat;
}
export const savePrefs = () => {
  writeMonth(S.month);
  return write(KEYS.PREFS, {
    view:S.view, theme:S.theme, fs:S.fs, dept:S.dept, hidden:S.hidden,
    grade:S.grade, cat:S.cat, cal:S.cal, plan:S.plan, stu:S.stu, print:S.print
  });
};
export function applyPrefs(){
  const dark = S.theme === "dark" || (S.theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  document.documentElement.style.setProperty("--fs", String(S.fs));
}
