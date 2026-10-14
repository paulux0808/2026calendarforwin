/* core/sheet.js — 셀·교시 해석, 응답 검증, 시트별 decode */
import { test } from "node:test";
import assert from "node:assert/strict";
import { HEADER, cell, decode, periods, validate } from "../../src/core/sheet.js";

const DEPT_NAMES = ["교목부", "교무부", "1학년부", "기타"];
const ctx = { deptNames:DEPT_NAMES, baseYear:2026 };
/* 표 한 장 — 셀은 문자열, {v,f}, null 아무거나 */
const table = (rows, cols = []) => ({ cols, rows:rows.map(c => ({ c })) });
const dateCell = (y, m, d) => ({ v:`Date(${y},${m - 1},${d})`, f:`${y}. ${m}. ${d}.` });

test("cell: 서식된 값(f)을 먼저, 없으면 v", () => {
  assert.equal(cell(null), "");
  assert.equal(cell("  글  "), "글");
  assert.equal(cell(12), "12");
  assert.equal(cell({ v:1, f:"1회" }), "1회");
  assert.equal(cell({ v:" 값 ", f:null }), "값");
  assert.equal(cell({ v:null, f:"" }), "");
});

test("periods: 범위·단일·목록·섞은 꼴", () => {
  assert.deepEqual(periods("5~7교시"), { label:"5~7", hours:3, ok:true });
  assert.deepEqual(periods("6"), { label:"6", hours:1, ok:true });
  assert.deepEqual(periods("2,4"), { label:"2,4", hours:2, ok:true });
  assert.deepEqual(periods("1~3, 5"), { label:"1~3, 5", hours:4, ok:true });
  assert.deepEqual(periods("[3교시]"), { label:"3", hours:1, ok:true });
  assert.equal(periods("1~3,2~4").hours, 4);   // 겹치면 한 번만 센다
  assert.equal(periods({ v:null, f:"2～3교시" }).hours, 2);   // 전각 물결, 서식값
});

test("periods: 못 읽으면 ok:false, 시간 0", () => {
  for(const v of ["", null, "  ", "가나다", "abc", "3~1", "0", "25", "1~30", "5교시 이후", "3~"]){
    const p = periods(v);
    assert.equal(p.ok, false, String(v));
    assert.equal(p.hours, 0, String(v));
  }
  assert.equal(periods("가나다").label, "가나다");
  assert.equal(periods("").label, "");
});

test("validate: ok·warning 은 표를 돌려준다", () => {
  const t = { cols:[], rows:[{ c:[] }] };
  assert.equal(validate({ status:"ok", table:t }), t);
  assert.equal(validate({ status:"warning", table:t }), t);
});

test("validate: 권한 오류 등은 시트가 한 말을 그대로", () => {
  assert.throws(() => validate({ status:"error", errors:[{ detailed_message:"이 문서에 접근할 권한이 없습니다" }] }),
    /이 문서에 접근할 권한이 없습니다/);
  assert.throws(() => validate({ status:"error", errors:[{ message:"A" }, { message:"B" }] }), /A \/ B/);
  assert.throws(() => validate(null), /시트 응답이 아닙니다/);
  assert.throws(() => validate("<html>"), /시트 응답이 아닙니다/);
  assert.throws(() => validate({ status:"ok" }), /시트 구조를 읽을 수 없습니다/);
  assert.throws(() => validate({ status:"ok", table:{ cols:[], rows:[{ c:null }] } }), /시트 구조를 읽을 수 없습니다/);
});

test("HEADER: 머리글 낱말", () => {
  for(const w of ["날짜", "일자", "일시", "시작일", "게시일", "번호", "연번"]) assert.ok(HEADER.test(w), w);
  assert.ok(!HEADER.test("개학식"));
});

test("decode schedule: 부서 태그를 떼고, 모르는 부서는 기타로 두며 짚는다", () => {
  const res = decode("schedule", table([
    ["날짜", "요일", "내용"],                                              // 머리글: 짚지 않는다
    [dateCell(2026, 3, 3), "화", "[교무부] 입학식\n[모름부] 대청소\n그냥 한 줄"],
    [dateCell(2026, 3, 2), "월", "[1학년부]   개학식"],
    [dateCell(2026, 3, 4), "수", "null"],                                  // 내용 없음
    [dateCell(2026, 3, 5), "목", null],
    ["대충 쓴 날", "", "무슨 행사"],                                        // 날짜 못 읽음
  ]), ctx);
  assert.deepEqual(res.items.map(e => [e.k, e.dept, e.text, e.id]), [
    ["2026-03-02", "1학년부", "개학식", "s2-0"],     // 날짜 순으로 정렬된다
    ["2026-03-03", "교무부", "입학식", "s1-0"],
    ["2026-03-03", "기타", "[모름부] 대청소", "s1-1"],
    ["2026-03-03", "기타", "그냥 한 줄", "s1-2"],
  ]);
  assert.ok(res.items.every(e => e.src === "schedule" && e.d instanceof Date));
  assert.deepEqual(res.flags, ["2행 · 모르는 부서 이름: 모름부", "6행 · 날짜를 읽을 수 없습니다"]);
});

test("decode schedule: 알려 줄 부서 목록은 ctx 로 받는다", () => {
  const rows = [[dateCell(2026, 3, 2), "", "[교무부] 가"]];
  assert.equal(decode("schedule", table(rows), { deptNames:["교무부"] }).items[0].dept, "교무부");
  const other = decode("schedule", table(rows), { deptNames:["연구부"] });
  assert.equal(other.items[0].dept, "기타");
  assert.equal(other.flags.length, 1);
});

test("decode schedule: 짚는 줄은 60개까지만", () => {
  const rows = Array.from({ length:80 }, () => ["엉뚱", "", "행사"]);
  assert.equal(decode("schedule", table(rows), ctx).flags.length, 60);
});

test("decode student: 날짜 열이 연도 없는 '3/2' 꼴이면 학년도로 연도를 정한다 (3월 이후는 baseYear)", () => {
  const res = decode("student", table([
    ["3/2", "월", "개학식"],
    ["12/25", "금", "성탄"],
  ]), { deptNames:DEPT_NAMES, baseYear:2026 });
  assert.deepEqual(res.items.map(e => [e.k, e.text]), [["2026-03-02", "개학식"], ["2026-12-25", "성탄"]]);
  assert.deepEqual(res.flags, []);
});

test("decode student: 1·2월은 다음 해 (학년도 끝자락)", () => {
  const res = decode("student", table([
    ["1/5", "화", "겨울방학"],
    ["2/10", "수", "졸업식"],
    ["2.28", "일", "종업식"],
    ["3/1", "월", "삼일절"],
  ]), { deptNames:DEPT_NAMES, baseYear:2026 });
  assert.deepEqual(res.items.map(e => e.k), ["2026-03-01", "2027-01-05", "2027-02-10", "2027-02-28"]);
  // 학년도가 달라지면 연도도 따라간다
  const next = decode("student", table([["1/5", "", "x"], ["4/1", "", "y"]]), { deptNames:DEPT_NAMES, baseYear:2027 });
  assert.deepEqual(next.items.map(e => e.k), ["2027-04-01", "2028-01-05"]);
});

test("decode student: 4자리 연도가 있으면 그대로, 없는 날짜는 짚는다", () => {
  const res = decode("student", table([
    ["2026-10-13", "화", "중간고사"],
    ["2/30", "", "없는 날"],
    ["날짜", "요일", "내용"],                  // 머리글
  ]), ctx);
  assert.deepEqual(res.items.map(e => [e.k, e.text]), [["2026-10-13", "중간고사"]]);
  assert.deepEqual(res.flags, ["2행 · 날짜를 읽을 수 없습니다"]);
});

test("decode student: 내용 자리 대체, 글머리·부서 태그 제거, 날짜 칸 꼬리글", () => {
  const res = decode("student", table([
    ["2026-05-01", "금", "- 체육대회\n• [교무부] 응원전"],       // 여러 줄, 글머리·태그 제거
    ["2026-05-03", "어린이날 대체"],                                 // 내용 칸(3번째)이 비면 둘째 칸을 쓴다
    ["2026-05-04", "월", ""],                                      // 요일뿐: 일정 아님
    ["3/2(월) 개학식", null, null],                                // 날짜 칸 꼬리글
  ]), ctx);
  assert.deepEqual(res.items.map(e => [e.k, e.text, e.id]), [
    ["2026-03-02", "개학식", "u3-0"], ["2026-05-01", "체육대회", "u0-0"],
    ["2026-05-01", "응원전", "u0-1"], ["2026-05-03", "어린이날 대체", "u1-0"],
  ]);
  assert.ok(res.items.every(e => e.dept === "" && e.src === "student"));
  assert.deepEqual(res.flags, []);
});

test("decode prayer · supervisor: 날짜 → 담당", () => {
  const rows = [
    ["날짜", "요일", "이름"],
    [dateCell(2026, 3, 2), "월", "김교목", "요 3:16", "찬 1"],
    [dateCell(2026, 3, 3), "화", "null", "", ""],
    [dateCell(2026, 3, 4), "수", "이교목", null, null],
    ["엉뚱", "", "누구"],
  ];
  const p = decode("prayer", table(rows), ctx);
  assert.ok(p.items instanceof Map);
  assert.deepEqual([...p.items], [
    ["2026-03-02", { name:"김교목", bible:"요 3:16", hymn:"찬 1" }],
    ["2026-03-04", { name:"이교목", bible:"", hymn:"" }],
  ]);
  assert.deepEqual(p.flags, ["5행 · 날짜를 읽을 수 없습니다"]);
  const s = decode("supervisor", table(rows), ctx);
  assert.deepEqual([...s.items], [["2026-03-02", "김교목"], ["2026-03-04", "이교목"]]);
});

test("decode notice: 게시 기간·본문, 이상한 기간은 짚고 뺀다", () => {
  const res = decode("notice", table([
    ["시작일", "종료일", "내용"],
    [dateCell(2026, 3, 1), dateCell(2026, 3, 31), "봄 공지"],
    [null, null, "상시 공지"],
    [dateCell(2026, 4, 1), null, "열린 공지"],
    [dateCell(2026, 5, 10), dateCell(2026, 5, 1), "거꾸로"],
    ["다음 주", "", "못 읽는 기간"],
    [dateCell(2026, 6, 1), dateCell(2026, 6, 2), "null"],
  ]), ctx);
  assert.deepEqual(res.items.map(n => [n.from && n.from.getMonth() + 1, n.to && n.to.getMonth() + 1, n.text]),
    [[3, 3, "봄 공지"], [null, null, "상시 공지"], [4, null, "열린 공지"]]);
  assert.deepEqual(res.flags, ["5행 · 게시 시작일이 종료일보다 늦습니다", "6행 · 게시 기간을 읽을 수 없습니다: 다음 주 ~ -"]);
});

test("decode nuga: 머리글 이름으로 열을 찾는다", () => {
  const cols = ["영역", "일자", "교시텍스트", "1학년", "2학년", "3학년", "활동내용", "비고"].map(label => ({ label, id:"" }));
  const res = decode("nuga", table([
    ["자율자치(월)", dateCell(2026, 3, 9), "1~3교시", "○", "", "v", "학급회의", "메모"],
    ["동아리", dateCell(2026, 3, 2), "2,4", "1", "true", "", "동아리 활동", ""],
    ["영역", "일자", "교시텍스트", "", "", "", "활동내용", ""],           // 머리글 행: 짚지 않는다
    ["", dateCell(2026, 3, 3), "1", "", "", "", "영역 빠짐", ""],
    ["진로", "날짜 아님", "1", "", "", "", "내용", ""],
    ["봉사", dateCell(2026, 3, 4), "가나다", "", "", "", "시간 이상", ""],
  ], cols), ctx);
  assert.deepEqual(res.items.map(r => [r.k, r.cat, r.hours, r.ok, r.grades, r.text, r.note]), [
    ["2026-03-02", "동아리", 2, true, [true, true, false], "동아리 활동", ""],
    ["2026-03-09", "자율자치", 3, true, [true, false, true], "학급회의", "메모"],
    ["2026-03-04", "봉사", 0, false, [false, false, false], "시간 이상", ""],
  ].sort((a, b) => a[0] < b[0] ? -1 : 1));
  assert.deepEqual(res.flags, ["4행 · 영역이 비어 있습니다", "5행 · 날짜를 읽을 수 없습니다", "6행 · 교시를 읽을 수 없습니다: 가나다"]);
  assert.ok(res.items.every(r => typeof r.label === "string" && r.id.startsWith("n")));
});

test("decode nuga: 열 순서가 달라도 머리글(label/id)로 찾고, 없으면 기본 위치", () => {
  const cols = [{ label:"비고" }, { id:"활동 내용" }, { label:"학년 1", id:"1학년" }, { label:"교시" }, { label:"날짜" }, { label:"영역" }];
  // 비고, 활동 내용, 1학년, 교시, 날짜, 영역 순
  const res = decode("nuga", table([
    ["참고", "청소", "o", "5교시", dateCell(2026, 4, 6), "자율"],
  ], cols), ctx);
  assert.equal(res.items.length, 1);
  assert.deepEqual([res.items[0].cat, res.items[0].text, res.items[0].note, res.items[0].hours, res.items[0].grades, res.items[0].k],
    ["자율", "청소", "참고", 1, [true, false, false], "2026-04-06"]);
  // 머리글이 없으면 영역·일자·교시·1~3학년·내용·비고 가 2~9번째 칸
  const fb = decode("nuga", table([[null, "봉사", dateCell(2026, 4, 7), "2", "", "o", "", "활동", "비"]]), ctx);
  assert.equal(fb.items.length, 1);
  assert.deepEqual([fb.items[0].cat, fb.items[0].k, fb.items[0].hours, fb.items[0].grades, fb.items[0].text, fb.items[0].note],
    ["봉사", "2026-04-07", 1, [false, true, false], "활동", "비"]);
});
