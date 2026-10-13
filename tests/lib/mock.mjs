// 바깥 세계를 흉내 낸다. 앱은 구글 시트(gviz JSONP)와 Apps Script(POST)와 웹폰트 CSS 에만 손을 뻗는다.
//
//   const mock = await installMocks(context, { storage: { local: {...} }, clock: 'fixed' });
//   mock.override('schedule', { error: { reason:'access_denied', detailed_message:'…' } });
//   mock.override('*', 'abort');            // 모든 시트 연결 끊기
//   mock.setSheet('OTHER_ID', buildFixture({ year: 2025 }));
//   mock.posts                              // [{ url, method, headers, body, json }]
//
// target 은 Playwright 의 BrowserContext 또는 Page.
import { buildFixture, SHEET_ID, GID_KEY, GIDS, gvizOk, gvizErr, jsonp } from '../fixtures/index.mjs';

export const DEFAULT_TIME = '2026-10-13T09:00:00+09:00';
/** 새 컨텍스트에 넘길 기본 옵션: 서울 시간대, 한국어 */
export const CONTEXT_DEFAULTS = Object.freeze({ locale: 'ko-KR', timezoneId: 'Asia/Seoul' });

const isLocalHost = h => h === '127.0.0.1' || h === 'localhost' || h === '[::1]' || h === '::1';
const GVIZ_PATH = /\/spreadsheets\/d\/([^/]+)\/gviz\/tq\/?$/;

function parseTqx(tqx) {
  const o = {};
  for (const part of String(tqx || '').split(';')) {
    const i = part.indexOf(':');
    if (i > 0) o[part.slice(0, i)] = part.slice(i + 1);
  }
  return o;
}

/**
 * @param {import('playwright').BrowserContext | import('playwright').Page} target
 * @param {object} [opts]
 * @param {object} [opts.fixture]            기본 시트 ID 에 줄 자료 (기본: buildFixture())
 * @param {string} [opts.sheetId]            기본 시트 ID (기본: 앱의 CONFIG.SHEET_ID)
 * @param {Record<string, object>} [opts.sheets] 시트 ID → fixture. 다른 시트/학년도를 흉내 낼 때
 * @param {'denied'|'empty'} [opts.unknownSheet='denied'] 모르는 시트 ID 에 대한 응답
 * @param {'fixed'|'install'|'none'} [opts.clock='fixed'] fixed: Date 만 고정 · install: 가짜 타이머(clock.runFor 로 감기 가능)
 * @param {string|Date} [opts.time=DEFAULT_TIME]
 * @param {{local?:object, session?:object}} [opts.storage] 처음 방문 전에 미리 넣어 둘 저장소 (객체는 JSON 으로)
 * @param {'ok'|'abort'|'hang'|number} [opts.postBehavior='ok'] Apps Script POST 응답
 * @param {boolean} [opts.blockExternal=true] 그 밖의 바깥 요청은 막고 mock.blocked 에 적는다
 */
export async function installMocks(target, opts = {}) {
  const sheetId = opts.sheetId || SHEET_ID;
  const sheets = new Map(Object.entries(opts.sheets || {}));
  if (!sheets.has(sheetId)) sheets.set(sheetId, opts.fixture || buildFixture());

  const overrides = []; // 나중에 넣은 것이 먼저 맞는다
  const hanging = new Set();
  let nextId = 1;

  const mock = {
    sheetId,
    sheets,
    /** 받은 gviz 요청: { sheetId, gid, key, cb, url, behavior } */
    requests: [],
    /** 받은 POST: { url, method, headers, body, json } */
    posts: [],
    /** 막은 바깥 요청 URL */
    blocked: [],
    postBehavior: opts.postBehavior ?? 'ok',

    setSheet(id, fixture) { sheets.set(id, fixture); return mock; },
    setFixture(fixture) { sheets.set(sheetId, fixture); return mock; },
    /**
     * 시트별 예외 응답. match: gid | 시트 키(schedule…) | '*' | { sheetId, gid, key }
     * behavior:
     *   { error:{reason,message,detailed_message} } | { status:'error', errors:[…] } | { json:{…} } | { table:{…} }
     *   'abort' (연결 실패) · 'hang' (영원히 대기) · { http: 500 } · { html:'<html>…' } · { raw:'…' } · { delay: ms, then: behavior }
     *   또는 (req) => behavior
     * opts.times: 이 횟수만 적용하고 사라진다.
     * @returns {number} id (mock.removeOverride 로 지운다)
     */
    override(match, behavior, { times = Infinity } = {}) {
      const m = typeof match === 'object' && match ? match : match === '*' ? {} : GID_KEY[match] ? { gid: match } : { key: match };
      const id = nextId++;
      overrides.unshift({ id, m, behavior, times });
      return id;
    },
    removeOverride(id) { const i = overrides.findIndex(x => x.id === id); if (i >= 0) overrides.splice(i, 1); },
    clearOverrides() { overrides.length = 0; },
    count(key) { return mock.requests.filter(r => r.key === key || r.gid === key).length; },
    clearLog() { mock.requests.length = 0; mock.posts.length = 0; mock.blocked.length = 0; },
    /** 걸어 둔 채 응답 없는 요청을 정리한다 */
    async dispose() { for (const r of hanging) await r.abort().catch(() => {}); hanging.clear(); },
  };

  function pick(info) {
    for (const o of overrides) {
      const { m } = o;
      if (m.sheetId && m.sheetId !== info.sheetId) continue;
      if (m.gid && m.gid !== info.gid) continue;
      if (m.key && m.key !== info.key) continue;
      if (o.times <= 0) continue;
      o.times--;
      return typeof o.behavior === 'function' ? o.behavior(info) : o.behavior;
    }
    return null;
  }

  async function respond(route, info, behavior) {
    const js = body => route.fulfill({ status: 200, contentType: 'application/javascript; charset=utf-8', body });
    if (behavior === 'abort') return route.abort('failed');
    if (behavior === 'hang') { hanging.add(route); return; }
    if (behavior && typeof behavior === 'object') {
      if (behavior.delay) { await new Promise(r => setTimeout(r, behavior.delay)); return respond(route, info, behavior.then ?? null); }
      if (behavior.http) return route.fulfill({ status: behavior.http, contentType: 'text/plain', body: behavior.body ?? 'error' });
      if (behavior.html != null) return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: behavior.html });
      if (behavior.raw != null) return js(behavior.raw);
      if (behavior.json) return js(jsonp(info.cb, behavior.json));
      if (behavior.table) return js(jsonp(info.cb, gvizOk(behavior.table)));
      if (behavior.error) return js(jsonp(info.cb, gvizErr(behavior.error.reason, behavior.error.message, behavior.error.detailed_message)));
      if (behavior.status) return js(jsonp(info.cb, { version: '0.6', reqId: '0', status: behavior.status, errors: behavior.errors }));
    }
    // 기본: 시트 ID 별 fixture
    const fx = sheets.get(info.sheetId);
    if (!fx) {
      return js(jsonp(info.cb, opts.unknownSheet === 'empty'
        ? gvizOk({ cols: [], rows: [] })
        : gvizErr('access_denied', '권한 없음', '이 문서에 접근할 권한이 없습니다.')));
    }
    const payload = fx.payload(info.gid);
    return js(jsonp(info.cb, payload || gvizErr('invalid_query', 'INVALID_QUERY', `Invalid sheet gid ${info.gid}`)));
  }

  // ---- 라우트: 나중에 등록한 것이 먼저 맞는다. 맨 아래(가장 먼저 등록)가 마지막 보루.
  if (opts.blockExternal !== false) {
    await target.route(u => /^https?:$/.test(u.protocol) && !isLocalHost(u.hostname), route => {
      mock.blocked.push(route.request().url());
      return route.abort('blockedbyclient');
    });
  }
  // 웹폰트 CSS(Pretendard @ jsDelivr): 빈 CSS
  await target.route(u => u.hostname.endsWith('jsdelivr.net'), route =>
    route.fulfill({ status: 200, contentType: 'text/css; charset=utf-8', body: '/* mocked: pretendard */' }));
  // Apps Script 웹앱: 수정 요청 POST
  await target.route(u => u.hostname === 'script.google.com' || u.hostname.endsWith('.googleusercontent.com'), async route => {
    const req = route.request();
    const body = req.postData() ?? '';
    let json = null;
    try { json = JSON.parse(body); } catch { /* 본문이 JSON 이 아님 */ }
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' } });
    mock.posts.push({ url: req.url(), method: req.method(), headers: req.headers(), body, json });
    const b = mock.postBehavior;
    if (b === 'abort') return route.abort('failed');
    if (b === 'hang') { hanging.add(route); return; }
    if (typeof b === 'number') return route.fulfill({ status: b, contentType: 'text/plain', body: 'error' });
    return route.fulfill({ status: 200, contentType: 'application/json; charset=utf-8', headers: { 'access-control-allow-origin': '*' }, body: '{"ok":true}' });
  });
  // gviz JSONP
  await target.route(u => GVIZ_PATH.test(u.pathname), async route => {
    const url = new URL(route.request().url());
    const id = url.pathname.match(GVIZ_PATH)[1];
    const gid = url.searchParams.get('gid') ?? '0';
    const tqx = parseTqx(url.searchParams.get('tqx'));
    const info = { sheetId: id, gid, key: GID_KEY[gid] || '', cb: tqx.responseHandler || 'google.visualization.Query.setResponse', url: url.href };
    const behavior = pick(info);
    mock.requests.push({ ...info, behavior });
    await respond(route, info, behavior);
  });

  // ---- 시계 · 저장소 · 모션
  const clock = opts.clock ?? 'fixed';
  const time = new Date(opts.time ?? DEFAULT_TIME);
  if (clock === 'fixed') await target.clock.setFixedTime(time);
  else if (clock === 'install') await target.clock.install({ time });

  const storage = opts.storage || {};
  await target.addInitScript(({ local, session }) => {
    const MARK = '__hs_test_seeded__';
    const put = (store, seed) => {
      try {
        if (store.getItem(MARK)) return;
        for (const [k, v] of Object.entries(seed || {})) store.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
        store.setItem(MARK, '1');
      } catch { /* 저장소를 못 쓰는 환경 */ }
    };
    if (Object.keys(local || {}).length) put(localStorage, local);
    if (Object.keys(session || {}).length) put(sessionStorage, session);
  }, { local: storage.local || {}, session: storage.session || {} });

  mock.GIDS = GIDS;
  return mock;
}
