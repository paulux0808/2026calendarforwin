/* 자료 모델 — 받아 온 일정 M, 날짜 색인 IX, 시트별 상태 SRC, 사본 보관, 하루 조회 */
import { TABS } from "../config.js";
import { key, toDate, today } from "./core/dates.js";
import { KEYS, read, write } from "./core/store.js";
import { activeYear } from "./data.js";
import { hit } from "./search.js";
import { RT, S } from "./state.js";

export const M = { schedule:[], student:[], prayer:new Map(), super:new Map(), notices:[], nuga:[] };
export const IX = { byId:new Map(), day:new Map(), stuDay:new Map() };
/* 시트별 상태 — 무엇이 들어왔고 어느 행이 이상한지 화면에 그대로 내보인다 */
export const SRC = Object.fromEntries(TABS.map(x =>
  [x.key, { name:x.name, gid:x.gid, rows:0, at:0, error:"", flags:[] }]));

export function reindex(){
  IX.byId = new Map(); IX.day = new Map(); IX.stuDay = new Map();
  for(const [rows, map] of [[M.schedule, IX.day], [M.student, IX.stuDay]])
    for(const e of rows){
      IX.byId.set(e.id, e);
      if(!map.has(e.k)) map.set(e.k, []);
      map.get(e.k).push(e);
    }
}

/* 마지막으로 받은 내용을 남겨 둔다. 연결이 없어도 화면이 비지 않게.
   어느 시트에서 받았는지(sheet)도 적어, 시트를 바꾸면 옛 시트의 사본은 쓰지 않는다. */
export function saveCache(){
  if(write(KEYS.CACHE, {
    sheet:activeYear().sheetId,
    at:Date.now(),
    schedule:M.schedule.map(e => [e.k, e.dept, e.text]),
    student:M.student.map(e => [e.k, e.text]),
    prayer:[...M.prayer], super:[...M.super],
    notices:M.notices.map(n => [n.from ? key(n.from) : "", n.to ? key(n.to) : "", n.text]),
    nuga:M.nuga.map(r => [r.k, r.cat, r.label, r.hours, r.ok, r.grades, r.text, r.note]),
    src:Object.fromEntries(Object.entries(SRC).map(([k, v]) => [k, { rows:v.rows, at:v.at, flags:v.flags }]))
  })) RT.cachedAt = Date.now();
}
export function loadCache(){
  const c = read(KEYS.CACHE, null);
  if(!c || c.sheet !== activeYear().sheetId || !Array.isArray(c.schedule)) return false;
  try{
    M.schedule = c.schedule.map(([k, dept, text], i) => ({ id:`s c${i}`, k, d:toDate(k), dept, text, src:"schedule" })).filter(e => e.d);
    M.student = c.student.map(([k, text], i) => ({ id:`u c${i}`, k, d:toDate(k), text, dept:"", src:"student" })).filter(e => e.d);
    M.prayer = new Map(c.prayer); M.super = new Map(c.super);
    M.notices = c.notices.map(([f, t, text]) => ({ from:f ? toDate(f) : null, to:t ? toDate(t) : null, text }));
    M.nuga = c.nuga.map(([k, cat, label, hours, ok, grades, text, note], i) =>
      ({ id:`n c${i}`, k, d:toDate(k), cat, label, hours, ok, grades, text, note })).filter(r => r.d);
    RT.cachedAt = c.at || 0;
    for(const [k, v] of Object.entries(c.src || {})){
      if(!SRC[k]) continue;
      SRC[k].rows = v.rows || 0;
      SRC[k].at = v.at || 0;
      SRC[k].flags = Array.isArray(v.flags) ? v.flags : [];
    }
    reindex();
    RT.loaded = M.schedule.length > 0 || M.student.length > 0;
    return RT.loaded;
  }catch{ return false; }
}

export const off = d => S.hidden.includes(d);
export const onDay = k => (IX.day.get(k) || []).filter(e => !off(e.dept) && hit(e.dept, e.text));
export const stuOn = k => (IX.stuDay.get(k) || []).filter(e => hit(e.text));

/* 같은 행사가 두 시트에 다 적힌 경우 한 번만 보여 준다 */
export const norm = t => String(t || "").toLowerCase().replace(/[!！·•ㆍ]/g, "").replace(/[\s ]+/g, "").trim();
export function dayRows(k){
  const stu = (IX.stuDay.get(k) || []).slice();
  const q = new Map();
  for(const e of stu){
    const n = norm(e.text);
    if(!n) continue;
    if(!q.has(n)) q.set(n, []);
    q.get(n).push(e);
  }
  const staff = [], deptOf = new Map();
  for(const e of IX.day.get(k) || []){
    const list = q.get(norm(e.text));
    if(list?.length) deptOf.set(list.shift().id, e.dept);
    else staff.push(e);
  }
  return { staff, stu, deptOf };
}
export function notices(){
  const t = toDate(today());
  return M.notices.filter(n => (!n.from || t >= n.from) && (!n.to || t <= n.to));
}
