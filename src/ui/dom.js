/* 화면 도구 — 요소 찾기, 알림 줄·토스트, 여러 화면이 같이 쓰는 조각 HTML */
import { key } from "../core/dates.js";
import { esc } from "../core/text.js";
import { hl } from "../search.js";
import { S, tone } from "../state.js";

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];

export const evHTML = (e, showDept = true, stu = false) => `
  <button type="button" class="ev${stu ? " ev-u" : ""}" data-e="${e.id}" style="${stu ? tone("기타") : tone(e.dept)}">
    ${showDept && e.dept ? `<span class="tag">${hl(e.dept)}</span>` : ""}${hl(e.text)}</button>`;

export const dnum = d => `<button type="button" class="dnum" data-d="${key(d)}">${d.getDate()}</button>`;
export const nothing = t => `<p class="none">${esc(t)}</p>`;
export const chk = (label, g, k) => `<label class="chk"><input type="checkbox" data-c="${g}.${k}"${S[g][k] ? " checked" : ""}>${esc(label)}</label>`;
export const opt = (label, g, k) => `<button type="button" data-c="${g}.${k}" aria-pressed="${S[g][k]}">${esc(label)}</button>`;

export const warn = t => { $("#alertText").textContent = t; $("#alert").hidden = false; };
export const hideWarn = () => { $("#alert").hidden = true; };
let tt = null;
export function toast(t){
  const el = $("#toast");
  el.textContent = t; el.hidden = false;
  clearTimeout(tt);
  tt = setTimeout(() => { el.hidden = true; }, 3800);
}
