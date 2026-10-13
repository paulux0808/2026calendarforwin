// 서버 + 브라우저 컨텍스트 + 모의 바깥세계를 한 번에 세운다. shoot.mjs 와 E2E 테스트가 같이 쓴다.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer } from './server.mjs';
import { launchChromium } from './pw.mjs';
import { installMocks, CONTEXT_DEFAULTS } from './mock.mjs';

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 },
};

export { startServer, launchChromium, installMocks };

/**
 * 컨텍스트 하나와 페이지 하나, 그리고 모의 바깥세계를 만든다.
 * @param {import('playwright').Browser} browser
 * @param {object} o
 * @param {string} o.baseURL                    startServer() 가 돌려준 url
 * @param {'desktop'|'mobile'} [o.device='desktop']
 * @param {'light'|'dark'} [o.colorScheme='light']
 * @param {number} [o.dpr=1]
 * @param {boolean} [o.goto=true]               만들자마자 '/' 를 연다
 * @param {'loaded'|'failed'|'cached'|'none'} [o.wait='loaded'] 열고 나서 무엇을 기다릴지 (waitForApp)
 * @param {object} [o.mock]                     installMocks 옵션 (fixture, sheets, storage, clock, time, postBehavior …)
 * @param {(mock)=>void} [o.setup]              열기 전에 mock 을 만질 기회 (override 등)
 */
export async function openApp(browser, o) {
  const device = o.device || 'desktop';
  const mobile = device === 'mobile';
  const context = await browser.newContext({
    ...CONTEXT_DEFAULTS,
    baseURL: o.baseURL,
    viewport: VIEWPORTS[device],
    deviceScaleFactor: o.dpr || 1,
    isMobile: mobile,
    hasTouch: mobile,
    colorScheme: o.colorScheme || 'light',
    reducedMotion: 'reduce',
    serviceWorkers: 'block',
    permissions: ['clipboard-read', 'clipboard-write'],
    ...(o.context || {}),
  });
  const mock = await installMocks(context, o.mock || {});
  if (o.setup) await o.setup(mock);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e?.stack || e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(`console.error: ${m.text()}`); });
  const app = {
    context, page, mock, errors, device, mobile,
    async close() { await mock.dispose(); await context.close().catch(() => {}); },
  };
  if (o.goto !== false) {
    await page.goto(o.path || '/', { waitUntil: 'domcontentloaded' });
    if ((o.wait ?? 'loaded') !== 'none') await waitForApp(page, o.wait ?? 'loaded');
  }
  return app;
}

/**
 * 화면에 드러난 것만 보고 기다린다 (앱 내부 변수는 보지 않는다).
 *  loaded : 시트를 한 번 이상 받았다 (#srcSum 에 '갱신')
 *  failed : 알림 줄(#alert)이 떴다
 *  cached : 저장본으로 그렸다 (#srcSum 에 '저장본') — 그리고 연결 시도가 끝났다 (#alert 가 뜬다)
 */
export async function waitForApp(page, state = 'loaded', timeout = 15000) {
  if (state === 'loaded') {
    await page.waitForFunction(() => /갱신/.test(document.querySelector('#srcSum')?.textContent || ''), null, { timeout });
  } else if (state === 'failed' || state === 'cached') {
    await page.waitForFunction(() => document.querySelector('#alert') && !document.querySelector('#alert').hidden, null, { timeout });
  }
  await settle(page);
}

/** 글꼴과 그리기가 가라앉기를 기다린다 */
export async function settle(page) {
  await page.evaluate(async () => {
    await document.fonts?.ready;
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  });
}

export const readLocal = (page, key) => page.evaluate(k => localStorage.getItem(k), key);
export const readSession = (page, key) => page.evaluate(k => sessionStorage.getItem(k), key);
export const readJSON = async (page, key, store = 'local') => {
  const v = await (store === 'session' ? readSession(page, key) : readLocal(page, key));
  return v == null ? null : JSON.parse(v);
};
