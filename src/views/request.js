/* 수정 요청 — 시트에 쓰는 유일한 길. 양식 · 임시 저장 · 보내기 · 보던 일정을 본문에 얹기 */
import { TIMING } from "../../config.js";
import { W, p2, toDate } from "../core/dates.js";
import { KEYS, read, write } from "../core/store.js";
import { esc } from "../core/text.js";
import { activeYear } from "../data.js";
import { S } from "../state.js";
import { $, $$ } from "../ui/dom.js";
import { go } from "../ui/shell.js";

let draft = read(KEYS.DRAFT, {}), sending = false, sendMsg = "", sendTone = "";
if(!draft || typeof draft !== "object") draft = {};
export const TYPES = { "일정수정":"일정 수정·추가", "프로그램 개선":"화면·기능 개선", "기타":"기타" };
/* 보내는 중에는 주기 갱신을 미룬다 — 바깥에서는 읽기만 */
export const isSending = () => sending;

export function drawRequest(){
  return `<form class="form" id="rf" novalidate>
    <div class="pair">
      <div class="f"><label for="rn">작성자</label>
        <input class="fld" id="rn" maxlength="60" autocomplete="name" value="${esc(draft.name || "")}"></div>
      <div class="f"><label for="rt">종류</label>
        <select class="fld" id="rt">${Object.entries(TYPES).map(([v, l]) =>
          `<option value="${v}"${draft.type === v ? " selected" : ""}>${esc(l)}</option>`).join("")}</select></div>
    </div>
    <div class="f"><label for="rc">내용</label>
      <textarea class="fld" id="rc" maxlength="10000">${esc(draft.content || "")}</textarea></div>
    <div class="meta"><span></span><span id="rcount">${String(draft.content || "").length}자</span></div>
    <div class="send">
      <p id="rmsg" class="${sendTone}" role="status">${esc(sendMsg)}</p>
      <button class="btn btn-key" type="submit"${sending ? " disabled" : ""}>${sending ? "보내는 중" : "보내기"}</button>
    </div>
  </form>`;
}

export function saveDraft(){
  if(!$("#rf")) return;
  draft = { name:$("#rn").value, type:$("#rt").value, content:$("#rc").value };
  write(KEYS.DRAFT, draft);
  $("#rcount").textContent = `${draft.content.length}자`;
}
export function syncRequest(){
  const f = $("#rf");
  if(!f) return;
  $$("input,textarea,select,button", f).forEach(el => { el.disabled = sending; });
  f.querySelector('button[type="submit"]').textContent = sending ? "보내는 중" : "보내기";
  const p = $("#rmsg");
  p.textContent = sendMsg;
  p.className = sendTone;
}
export async function send(ev){
  ev.preventDefault();
  if(sending) return;
  saveDraft();
  const body = { name:draft.name.trim(), type:draft.type, content:draft.content.trim() };
  if(!body.name || !body.content){ sendMsg = "작성자와 내용을 채워 주세요"; sendTone = "no"; syncRequest(); return; }
  sending = true; sendMsg = ""; sendTone = ""; syncRequest();

  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), TIMING.POST_MS);
  try{
    /* Apps Script는 CORS 응답을 주지 않아 결과를 읽을 수 없다. 성공을 단정하지 않는다. */
    await fetch(activeYear().postUrl, { method:"POST", mode:"no-cors",
      headers:{ "Content-Type":"text/plain;charset=UTF-8" }, body:JSON.stringify(body), signal:ac.signal });
    sendMsg = "보냈습니다. 반영은 담당자 확인 후."; sendTone = "ok";
    draft = { name:body.name, type:body.type, content:"" };
    write(KEYS.DRAFT, draft);
    $("#rc").value = "";
    $("#rcount").textContent = "0자";
  }catch{
    sendMsg = "보내지 못했습니다. 내용은 그대로 있습니다."; sendTone = "no";
  }finally{
    clearTimeout(t);
    sending = false;
    syncRequest();
  }
}

/* 시트에 쓸 수 있는 길은 요청 하나뿐이다. 보던 일정을 그 요청에 그대로 얹는다. */
export function askAbout(k, e){
  const d = toDate(k);
  const when = `${d.getFullYear()}.${p2(d.getMonth() + 1)}.${p2(d.getDate())} (${W[d.getDay()]})`;
  const head = e
    ? `[관련 일정: ${when}]\n${e.dept ? `[${e.dept}] ` : ""}${e.text}`
    : `[관련 날짜: ${when}]`;
  const before = String(draft.content || "").trim();
  draft.content = (before ? before + "\n\n" : "") + `${head}\n\n요청 내용: `;
  write(KEYS.DRAFT, draft);
  if($("#ddlg").open) $("#ddlg").close();
  if(S.view !== "request") go("request");
  const box = $("#rc");
  if(!box) return;
  box.value = draft.content;
  $("#rcount").textContent = `${box.value.length}자`;
  box.focus();
  box.setSelectionRange(box.value.length, box.value.length);
}
