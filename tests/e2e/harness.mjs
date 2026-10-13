// E2E 공용: 정적 서버(워커당 하나) + launch() + 화면 읽기 도우미.
// 앱은 화면(DOM)으로만 만진다. 앱 폴더는 HS_ROOT (기본: 저장소 루트).
import { test as base, expect } from '@playwright/test';
import path from 'node:path';
import { REPO_ROOT, startServer, openApp } from '../lib/env.mjs';
import { buildFixture, SHEET_ID, GIDS, FOCUS_DATE, WD } from '../fixtures/index.mjs';

export { expect, buildFixture, SHEET_ID, GIDS, FOCUS_DATE, WD };
export const ROOT = process.env.HS_ROOT ? path.resolve(process.env.HS_ROOT) : REPO_ROOT;
export const fx = buildFixture();

export const test = base.extend({
  server: [async ({}, use) => {
    const s = await startServer({ root: ROOT });
    await use(s);
    await s.close();
  }, { scope: 'worker' }],

  /** const app = await launch({ device:'mobile', mock:{ storage:{…} }, wait:'loaded' }) → { page, context, mock, errors } */
  launch: async ({ browser, server }, use) => {
    const apps = [];
    await use(async (opts = {}) => {
      const app = await openApp(browser, { baseURL: server.url, ...opts });
      apps.push(app);
      return app;
    });
    for (const app of apps) {
      const errs = app.errors.slice();
      await app.close();
      expect(errs, '잡히지 않은 페이지 오류가 없어야 한다').toEqual([]);
    }
  },
});

// ---------- 화면 읽기 도우미
export const tab = (page, v) => page.locator(`#tabs [data-v="${v}"]`);
export const goView = async (page, v) => { await tab(page, v).click(); await expect(tab(page, v)).toHaveAttribute('aria-current', 'page'); };
export const monthInput = page => page.locator('#mi');
export const cellOf = (page, date) => page.locator(`.cal .d[data-k="${date}"]`);
export const rowOf = (page, date) => page.locator('#view tbody tr', { has: page.locator(`.dnum[data-d="${date}"]`) });

/** 하루 상세 창을 읽는다: { title, sections:{'교직원 일정':[{dept,text}],'학생 일정':[…]}, empty:['없음인 구역'], duty:{경건회:…}, onIds:[강조된 일정 id] } */
export async function readDay(page) {
  await expect(page.locator('#ddlg')).toHaveAttribute('open', '');
  return page.evaluate(() => {
    const out = { title: document.querySelector('#dtitle').textContent, sections: {}, empty: [], duty: {}, onIds: [] };
    let cur = null;
    for (const el of document.querySelector('#dbody').children) {
      if (el.tagName === 'H3') { cur = el.textContent.trim(); if (cur !== '담당') out.sections[cur] = []; }
      else if (el.classList.contains('item')) {
        out.sections[cur].push({ dept: el.querySelector('.tag')?.textContent.trim() || '', text: el.querySelector('p').textContent.trim() });
        if (el.classList.contains('on')) out.onIds.push(el.querySelector('[data-ask]').dataset.ask);
      } else if (el.tagName === 'P') out.empty.push(cur);
      else if (el.classList.contains('duty')) {
        const k = [...el.querySelectorAll('dt')].map(x => x.textContent.trim()), v = [...el.querySelectorAll('dd')].map(x => x.textContent.trim());
        k.forEach((x, i) => { out.duty[x] = v[i]; });
      }
    }
    return out;
  });
}

export const openSource = async page => {
  const d = page.locator('#src');
  if (!(await d.evaluate(e => e.open))) await page.locator('#srcSum').click();
  return d;
};
export const prefs = page => page.evaluate(() => JSON.parse(localStorage.getItem('hs-prefs-v2') || 'null'));
export const press = (page, key) => page.keyboard.press(key);
