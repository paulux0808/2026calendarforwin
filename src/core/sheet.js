/* 시트 읽기 — gviz 응답 검증, 셀·교시 해석, 시트별 행 → 일정 변환 (DOM·상태 없음) */
import { key, mkDate, toDate } from "./dates.js";

export function cell(c){
  if(c == null) return "";
  if(typeof c !== "object") return String(c).trim();
  const f = c.f != null ? String(c.f).trim() : "";
  return f !== "" ? f : String(c.v ?? "").trim();
}
/* "1~3교시", "2,4" → 시간 수. 못 읽으면 ok:false */
export function periods(c){
  const label = cell(c).normalize("NFKC").replace(/[[\]]/g, "").replace(/교시/g, "").trim();
  if(!label) return { label, hours:0, ok:false };
  const set = new Set();
  for(const part of label.replace(/\s*([~〜～–—-])\s*/g, "$1").replace(/[，、/|.\s]+/g, ",").split(",").filter(Boolean)){
    const m = part.match(/^(\d+)(?:[~〜～–—-](\d+))?$/);
    if(!m) return { label, hours:0, ok:false };
    const a = +m[1], b = +(m[2] ?? m[1]);
    if(a < 1 || a > b || b > 24) return { label, hours:0, ok:false };
    for(let i = a; i <= b; i++) set.add(i);
  }
  return { label, hours:set.size, ok:set.size > 0 };
}

/* gviz 는 오류도 200 으로 준다. 모양을 직접 확인해야 한다. */
export function validate(raw){
  if(!raw || !["ok", "warning"].includes(raw.status)){
    const said = (raw?.errors || [])
      .map(e => String(e?.detailed_message || e?.message || "").trim()).filter(Boolean).join(" / ");
    throw new Error(said || "시트 응답이 아닙니다 (접근 권한을 확인해 주세요)");
  }
  const t = raw.table;
  if(!t || !Array.isArray(t.cols) || !Array.isArray(t.rows) || !t.rows.every(r => r && Array.isArray(r.c)))
    throw new Error("시트 구조를 읽을 수 없습니다");
  return t;
}
export const HEADER = /^(날짜|일자|일시|시작일|게시일|번호|연번)$/;

/* ctx — 전역 대신 받는 것: deptNames(알려진 부서 이름), baseYear(학생일정 "3/2" 꼴의 연도를 정할 학년도) */
export function decode(k, table, ctx = {}){
  const { deptNames = [], baseYear } = ctx;
  const rows = table.rows.map(r => r.c || []);
  const flags = [];
  const flag = (n, m) => { if(flags.length < 60) flags.push(`${n + 1}행 · ${m}`); };
  const done = items => ({ items, flags });

  if(k === "schedule"){
    return done(rows.flatMap((r, n) => {
      const d = toDate(r[0]), body = cell(r[2]);
      if(!d){
        if(body && body !== "null" && !HEADER.test(cell(r[0]))) flag(n, "날짜를 읽을 수 없습니다");
        return [];
      }
      if(!body || body === "null") return [];
      return body.split(/\r?\n/).map(x => x.trim()).filter(x => x && x !== "null").map((line, i) => {
        const t = line.match(/^\[([^\]]+)\]\s*/);
        const known = t && deptNames.includes(t[1].trim());
        if(t && !known) flag(n, `모르는 부서 이름: ${t[1].trim()}`);
        return { id:`s${n}-${i}`, k:key(d), d, dept:known ? t[1].trim() : "기타",
                 text:known ? line.slice(t[0].length) : line, src:"schedule" };
      });
    }).sort((a, b) => a.d - b.d));
  }

  if(k === "student"){
    const base = baseYear;
    return done(rows.flatMap((r, n) => {
      let d = toDate(r[0]);
      const raw0 = cell(r[0]);
      if(!d && !/^\d{4}/.test(raw0)){
        const md = raw0.match(/^(\d{1,2})\s*[-./]\s*(\d{1,2})(?!\d)/);
        if(md) d = mkDate(base + (+md[1] < 3 ? 1 : 0), +md[1], +md[2]);
      }
      let text0 = r.slice(2).map(cell).filter(v => v && v !== "null").join("\n");
      if(!d){
        if((text0 || cell(r[0])) && !HEADER.test(cell(r[0]))) flag(n, "날짜를 읽을 수 없습니다");
        return [];
      }
      let text = r.slice(2).map(cell).filter(v => v && v !== "null").join("\n")
        || r.slice(1).map(cell).filter(v => v && v !== "null" && !/^[월화수목금토일]$/.test(v)).join("\n");
      if(!text){
        const tail = raw0.match(/^\s*(?:\d{4}\D+)?\d{1,2}\s*[-./월]\s*\d{1,2}\s*일?\s*\(?[월화수목금토일]?\)?\s*(.*)$/);
        text = tail?.[1] || "";
      }
      return text.split(/\r?\n/)
        .map(x => x.replace(/^\s*[-•]\s*/, "").replace(/^\s*\[[^\]]+\]\s*/, "").trim()).filter(Boolean)
        .map((line, i) => ({ id:`u${n}-${i}`, k:key(d), d, text:line, dept:"", src:"student" }));
    }).sort((a, b) => a.d - b.d));
  }

  if(k === "prayer" || k === "supervisor"){
    const map = new Map();
    rows.forEach((r, n) => {
      const d = toDate(r[0]), name = cell(r[2]);
      const has = name && name !== "null";
      if(!d){
        if(has && !HEADER.test(cell(r[0]))) flag(n, "날짜를 읽을 수 없습니다");
        return;
      }
      if(!has) return;
      map.set(key(d), k === "prayer" ? { name, bible:cell(r[3]), hymn:cell(r[4]) } : name);
    });
    return done(map);
  }

  if(k === "notice"){
    const out = [];
    rows.forEach((r, n) => {
      const text = cell(r[2]);
      if(!text || text === "null") return;
      const from = toDate(r[0]), to = toDate(r[1]);
      const rawFrom = cell(r[0]), rawTo = cell(r[1]);
      if((rawFrom && !from) || (rawTo && !to)){
        if(!HEADER.test(rawFrom)) flag(n, `게시 기간을 읽을 수 없습니다: ${rawFrom || "-"} ~ ${rawTo || "-"}`);
        return;
      }
      if(from && to && from > to){ flag(n, "게시 시작일이 종료일보다 늦습니다"); return; }
      out.push({ from, to, text });
    });
    return done(out);
  }

  const flat = v => String(v ?? "").replace(/\s/g, "");
  const head = new Map();
  (table.cols || []).forEach((c, i) => { for(const l of [c.label, c.id]) if(l) head.set(flat(l), i); });
  const pick = (names, fb) => names.map(flat).map(n => head.get(n)).find(i => i != null) ?? fb;
  const at = {
    cat:pick(["영역"], 1), date:pick(["일자","날짜"], 2), per:pick(["교시텍스트","교시"], 3),
    grades:[pick(["1학년","1"], 4), pick(["2학년","2"], 5), pick(["3학년","3"], 6)],
    body:pick(["활동내용","내용"], 7), note:pick(["비고"], 8)
  };
  return done(rows.flatMap((r, n) => {
    const d = toDate(r[at.date]);
    const cat = cell(r[at.cat]).replace(/\(.*$/, "").trim();
    if(!d || !cat){
      const any = cat || cell(r[at.date]) || cell(r[at.body]);
      if(any && !HEADER.test(cell(r[at.date])) && cell(r[at.cat]) !== "영역")
        flag(n, !d ? "날짜를 읽을 수 없습니다" : "영역이 비어 있습니다");
      return [];
    }
    const p = periods(r[at.per]);
    if(!p.ok) flag(n, `교시를 읽을 수 없습니다: ${p.label || "빈 값"}`);
    return [{ id:`n${n}`, k:key(d), d, cat, ...p,
      grades:at.grades.map(i => /^(1|o|○|◯|v|✓|✔|true|y)$/i.test(cell(r[i]))),
      text:cell(r[at.body]), note:cell(r[at.note]) }];
  }).sort((a, b) => a.d - b.d));
}
