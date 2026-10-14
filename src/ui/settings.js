/* 설정 창과 안내 창 — 테마 · 글자 크기 · 단축키 목록, 공지 같은 글 보여 주기 */
import { S } from "../state.js";
import { $ } from "./dom.js";

export function openSettings(){
  $("#sbody").innerHTML = `
    <div class="set"><span>테마</span><div class="seg">${
      [["light","밝게"],["dark","어둡게"],["system","시스템"]].map(([v, l]) =>
        `<button type="button" data-th="${v}" aria-pressed="${S.theme === v}">${l}</button>`).join("")}</div></div>
    <div class="set"><span>글자</span><div class="seg">${
      [[0.92,"작게"],[1,"보통"],[1.1,"크게"],[1.22,"아주 크게"]].map(([v, l]) =>
        `<button type="button" data-fs="${v}" aria-pressed="${S.fs === v}">${l}</button>`).join("")}</div></div>
    <h3>단축키</h3>
    <div class="keys">
      <div><kbd>1</kbd>–<kbd>6</kbd><span>화면</span></div>
      <div><kbd>/</kbd><span>검색</span></div>
      <div><kbd>←</kbd><kbd>→</kbd><span>이전·다음 달</span></div>
      <div><kbd>T</kbd><span>오늘</span></div>
      <div><kbd>P</kbd><span>인쇄</span></div>
      <div><kbd>R</kbd><span>새로고침</span></div>
    </div>`;
  if(!$("#sdlg").open) $("#sdlg").showModal();
}
export function info(title, html){
  $("#ititle").textContent = title;
  $("#ibody").innerHTML = html;
  if(!$("#idlg").open) $("#idlg").showModal();
}
