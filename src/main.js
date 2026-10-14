/* 시작 — 설정을 읽고, 저장본으로 먼저 그린 다음, 시트를 받아 다시 그린다 */
import { bindPrint } from "./print/print.js";
import { loadCache } from "./model.js";
import { RT, S, applyPrefs, loadPrefs } from "./state.js";
import { reload } from "./data.js";
import { bindEvents } from "./ui/events.js";
import { draw } from "./ui/shell.js";

loadPrefs();
applyPrefs();
loadCache();
bindEvents();
bindPrint();
RT.loading = true;
RT.jumpToday = ["calendar", "plan", "student", "dept"].includes(S.view);
draw();
reload();
window.__hsBooted = true;   /* index.html 의 안내 줄이 이 깃발을 본다 */
