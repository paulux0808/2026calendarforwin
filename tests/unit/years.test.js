/* core/years.js — 달에 맞는 학년도 시트 고르기 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { pickYear, sheetLink, tabsOf } from "../../src/core/years.js";

const Y26 = { year:2026, sheetId:"sheet-2026", postUrl:"post-2026" };
const Y27 = { year:2027, sheetId:"sheet-2027", postUrl:"post-2027" };
const Y28 = { year:2028, sheetId:"sheet-2028", postUrl:"post-2028" };

test("pickYear: 항목이 하나면 어느 달이든 그것", () => {
  for(const m of ["2020-01", "2025-12", "2026-03", "2026-10", "2027-02", "2027-03", "2040-07", "엉뚱"])
    assert.equal(pickYear([Y26], m), Y26, m);
});

test("pickYear: 학년도는 3월에 시작해 2월에 끝난다 (2월은 앞 학년도, 3월은 새 학년도)", () => {
  const ys = [Y26, Y27];
  assert.equal(pickYear(ys, "2027-02"), Y26);
  assert.equal(pickYear(ys, "2027-03"), Y27);
  assert.equal(pickYear(ys, "2026-03"), Y26);
  assert.equal(pickYear(ys, "2026-12"), Y26);
  assert.equal(pickYear(ys, "2027-01"), Y26);
  assert.equal(pickYear(ys, "2028-02"), Y27);
});

test("pickYear: 모든 항목보다 이른 달은 가장 이른 학년도", () => {
  assert.equal(pickYear([Y26, Y27], "2026-02"), Y26);   // 2026년 2월은 2025학년도 — 둘 다 이후
  assert.equal(pickYear([Y26, Y27], "2020-05"), Y26);
  assert.equal(pickYear([Y27, Y26], "2020-05"), Y26);   // 순서가 뒤섞여도
});

test("pickYear: 항목에 없는 늦은 달은 그 이전 중 가장 늦은 학년도", () => {
  assert.equal(pickYear([Y26, Y27], "2029-04"), Y27);
  assert.equal(pickYear([Y26, Y28], "2027-06"), Y26);   // 2027학년도 시트가 없으면 앞 학년도
  assert.equal(pickYear([Y28, Y26], "2028-03"), Y28);
});

test("pickYear: 못 읽는 달·빈 목록", () => {
  assert.equal(pickYear([Y26, Y27], "엉뚱"), Y27);
  assert.equal(pickYear([], "2026-10"), null);
  assert.equal(pickYear(undefined, "2026-10"), null);
});

test("pickYear: 받은 배열을 건드리지 않는다", () => {
  const ys = [Y27, Y26];
  pickYear(ys, "2026-10");
  assert.deepEqual(ys, [Y27, Y26]);
});

test("tabsOf: 항목이 탭을 따로 주면 그것, 아니면 기본", () => {
  const base = [{ key:"schedule", gid:"0", name:"연중행사계획" }];
  const own = [{ key:"schedule", gid:"99", name:"새 이름" }];
  assert.equal(tabsOf(Y26, base), base);
  assert.equal(tabsOf({ ...Y27, tabs:own }, base), own);
  assert.equal(tabsOf(null, base), base);
});

test("sheetLink: 원자료 주소", () => {
  assert.equal(sheetLink("abc", "123"), "https://docs.google.com/spreadsheets/d/abc/edit#gid=123");
  assert.equal(sheetLink("abc", "0"), "https://docs.google.com/spreadsheets/d/abc/edit#gid=0");
});
