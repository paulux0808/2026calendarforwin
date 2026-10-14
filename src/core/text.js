/* 글 도구 — HTML 에 넣기 전 이스케이프 */
export const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
