/* 브라우저 저장소 — localStorage(JSON)·sessionStorage(문자열)와 저장 키. 막혀 있어도 던지지 않는다 */
export const KEYS = { PREFS:"hs-prefs-v2", CACHE:"hs-cache-v2", DRAFT:"hs-draft-v2", MONTH:"hs-month-v2" };

export const read = (k, f) => { try{ const r = localStorage.getItem(k); return r == null ? f : (JSON.parse(r) ?? f); }catch{ return f; } };
export const write = (k, v) => { try{ localStorage.setItem(k, JSON.stringify(v)); return true; }catch{ return false; } };

/* 세션 저장소는 문자열 그대로 — 달 키 같은 짧은 값을 이 탭이 열려 있는 동안만 둔다 */
export const sread = (k, f = null) => { try{ const r = sessionStorage.getItem(k); return r == null ? f : r; }catch{ return f; } };
export const swrite = (k, v) => { try{ sessionStorage.setItem(k, v); return true; }catch{ return false; } };
