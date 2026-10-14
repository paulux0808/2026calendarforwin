/* core/dates.js — 시트가 주는 날짜 표기, 달·학년도 셈 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { W, ayOf, dayLabel, key, m1, mKey, mkDate, monthDays, p2, shiftMonth, toDate, today } from "../../src/core/dates.js";

const ymd = d => d && key(d);
const serial = (y, m, d) => Date.UTC(y, m - 1, d) / 86400000 + 25569;

test("toDate: gviz Date(y,m,d) 문자열은 월이 0부터", () => {
  assert.equal(ymd(toDate("Date(2026,9,13)")), "2026-10-13");
  assert.equal(ymd(toDate("Date(2026,0,1)")), "2026-01-01");
  assert.equal(ymd(toDate("Date(2026, 2, 2)")), "2026-03-02");
  assert.equal(ymd(toDate("Date(2026,9,13,0,0,0)")), "2026-10-13");
  assert.equal(toDate("Date(2026,1,30)"), null);   // 월이 0부터라 1=2월, 2월 30일은 없다
});

test("toDate: gviz 셀 객체 {v,f} — v 가 안 읽히면 f 로", () => {
  assert.equal(ymd(toDate({ v:"Date(2026,9,13)", f:"2026. 10. 13." })), "2026-10-13");
  assert.equal(ymd(toDate({ v:null, f:"2026. 10. 13." })), "2026-10-13");
  assert.equal(ymd(toDate({ v:"무슨 말", f:"2026-03-02" })), "2026-03-02");
  assert.equal(ymd(toDate({ v:serial(2026, 3, 2) })), "2026-03-02");
  assert.equal(toDate({ v:null, f:null }), null);
});

test("toDate: 일련번호(1899-12-30 기준)", () => {
  assert.equal(ymd(toDate(serial(2026, 10, 13))), "2026-10-13");
  assert.equal(ymd(toDate(serial(2026, 10, 13) + 0.75)), "2026-10-13");   // 시각이 붙어도 날짜만
  assert.equal(ymd(toDate(serial(2027, 2, 28))), "2027-02-28");
  assert.equal(toDate(0), null);   // 1899 년은 범위 밖
});

test("toDate: 사람이 쓴 표기", () => {
  assert.equal(ymd(toDate("2026. 10. 13.")), "2026-10-13");
  assert.equal(ymd(toDate("2026-10-13")), "2026-10-13");
  assert.equal(ymd(toDate("2026/3/2")), "2026-03-02");
  assert.equal(ymd(toDate("2026년 3월 2일 (월)")), "2026-03-02");
  assert.equal(ymd(toDate("  2026.03.02  ")), "2026-03-02");
});

test("toDate: Date 객체", () => {
  assert.equal(ymd(toDate(new Date(2026, 2, 2, 15, 30))), "2026-03-02");
  assert.equal(toDate(new Date("nope")), null);
});

test("toDate: 없는 날짜·못 읽는 값은 null", () => {
  for(const v of ["2026-02-30", "2026-13-01", "2026-00-10", "2026-04-31", "2026-10-00", "2027-02-29",
                  "", "  ", null, undefined, "날짜", "3/2", "20261013", "abc", {}])
    assert.equal(toDate(v), null, String(v));
  assert.equal(ymd(toDate("2028-02-29")), "2028-02-29");   // 윤년
});

test("mkDate: 범위·실존 확인", () => {
  assert.equal(ymd(mkDate(2026, 2, 28)), "2026-02-28");
  assert.equal(mkDate(2026, 2, 29), null);
  assert.equal(mkDate(1899, 12, 31), null);
  assert.equal(mkDate(2026.5, 1, 1), null);
  assert.equal(mkDate(2026, 0, 1), null);
});

test("key · p2 · today", () => {
  assert.equal(p2(5), "05");
  assert.equal(p2(12), "12");
  assert.equal(key(new Date(2026, 0, 9)), "2026-01-09");
  assert.match(today(), /^\d{4}-\d{2}-\d{2}$/);
});

test("ayOf: 학년도는 3월에 시작해 2월에 끝난다", () => {
  assert.equal(ayOf(new Date(2026, 1, 28)), 2025);   // 2월
  assert.equal(ayOf(new Date(2026, 2, 1)), 2026);    // 3월
  assert.equal(ayOf(new Date(2026, 0, 1)), 2025);    // 1월
  assert.equal(ayOf(new Date(2026, 11, 31)), 2026);
  assert.equal(ayOf(new Date(2027, 1, 1)), 2026);
});

test("월 키: mKey · m1 · shiftMonth", () => {
  assert.equal(mKey(new Date(2026, 9, 13)), "2026-10");
  assert.equal(key(m1("2026-10")), "2026-10-01");
  assert.equal(m1("2026-13"), null);
  assert.equal(shiftMonth("2026-12", 1), "2027-01");
  assert.equal(shiftMonth("2026-01", -1), "2025-12");
  assert.equal(shiftMonth("2026-03", 12), "2027-03");
  assert.equal(shiftMonth("2026-10", 0), "2026-10");
});

test("monthDays: 달의 날수, 주말 빼기", () => {
  assert.equal(monthDays("2026-02").length, 28);
  assert.equal(monthDays("2028-02").length, 29);
  assert.equal(monthDays("2026-10").length, 31);
  const wk = monthDays("2026-10", true);
  assert.equal(wk.length, 22);   // 2026-10: 31일 중 토·일 9일
  assert.ok(wk.every(d => d.getDay() !== 0 && d.getDay() !== 6));
});

test("dayLabel · W", () => {
  assert.equal(W.length, 7);
  assert.equal(dayLabel("2026-10-13"), "10월 13일 (화)");
  assert.equal(dayLabel("2026-03-01"), "3월 1일 (일)");
});
