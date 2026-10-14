/* search.js(검색어 → 일치·강조·달별 건수)와 core/text.js(esc) */
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { esc } from "../../src/core/text.js";
import { hit, hitMonths, hl, terms } from "../../src/search.js";
import { M } from "../../src/model.js";
import { S } from "../../src/state.js";

beforeEach(() => { S.q = ""; S.view = "calendar"; S.hidden = []; M.schedule = []; M.student = []; });

test("esc: HTML 특수문자를 막는다", () => {
  assert.equal(esc(`<a href="x">'&'</a>`), "&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;");
  assert.equal(esc(null), "");
  assert.equal(esc(undefined), "");
  assert.equal(esc(0), "0");
});

test("terms: 공백으로 쪼개고 소문자로", () => {
  assert.deepEqual(terms(), []);
  S.q = "  봄   소풍  ABC ";
  assert.deepEqual(terms(), ["봄", "소풍", "abc"]);
});

test("hit: 검색어가 없으면 모두 일치, 있으면 모든 낱말이 들어 있어야", () => {
  assert.equal(hit("아무거나"), true);
  S.q = "소풍 교무";
  assert.equal(hit("교무부", "봄 소풍"), true);
  assert.equal(hit("연구부", "봄 소풍"), false);
  S.q = "ABC";
  assert.equal(hit("xxabcxx"), true);
});

test("hl: 검색어가 없으면 이스케이프만", () => {
  assert.equal(hl(`<b>"A" & 'B'</b>`), "&lt;b&gt;&quot;A&quot; &amp; &#39;B&#39;&lt;/b&gt;");
  assert.equal(hl(null), "");
});

test("hl: 일치한 글자만 <mark> 로, 나머지는 이스케이프", () => {
  S.q = "소풍";
  assert.equal(hl("봄 소풍 <가기>"), "봄 <mark>소풍</mark> &lt;가기&gt;");
  S.q = "abc";
  assert.equal(hl("xABCx abc"), "x<mark>ABC</mark>x <mark>abc</mark>");
  S.q = "봄 소풍";
  assert.equal(hl("봄 소풍 봄"), "<mark>봄</mark> <mark>소풍</mark> <mark>봄</mark>");
});

test("hl: 검색어 안의 HTML·정규식 기호는 글자 그대로", () => {
  S.q = "<b>";
  assert.equal(hl("a <b> c"), "a <mark>&lt;b&gt;</mark> c");
  S.q = "a.c";
  assert.equal(hl("abc a.c"), "abc <mark>a.c</mark>");
  S.q = "(1)";
  assert.equal(hl("1반 (1) x"), "1반 <mark>(1)</mark> x");
  S.q = "a&b";
  assert.equal(hl("a&b"), "<mark>a&amp;b</mark>");
  S.q = "[";
  assert.equal(hl("a[b"), "a<mark>[</mark>b");
});

test("hl: 긴 낱말을 먼저 맞춘다", () => {
  S.q = "소 소풍";
  assert.equal(hl("소풍"), "<mark>소풍</mark>");
});

test("hitMonths: 달별 일치 건수를 시간순으로", () => {
  const mk = (k, dept, text) => ({ k, dept, text });
  M.schedule = [mk("2026-05-05", "교무부", "소풍"), mk("2026-03-02", "교무부", "소풍 준비"),
                mk("2026-03-03", "연구부", "회의"), mk("2026-05-20", "연구부", "소풍 정산")];
  M.student = [mk("2026-04-10", "", "소풍")];
  S.q = "소풍";
  assert.deepEqual(hitMonths(), [["2026-03", 1], ["2026-05", 2]]);
  S.hidden = ["연구부"];   // 꺼 둔 부서는 세지 않는다
  assert.deepEqual(hitMonths(), [["2026-03", 1], ["2026-05", 1]]);
  S.view = "student";      // 학생일정은 학생 시트만
  assert.deepEqual(hitMonths(), [["2026-04", 1]]);
});
