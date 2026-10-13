import { test, expect, fx, tab, monthInput, prefs, press, cellOf } from './harness.mjs';
import { waitForApp, readSession } from '../lib/env.mjs';

const PREFS = 'hs-prefs-v2', MONTH = 'hs-month-v2';
const active = page => page.locator('#tabs [aria-current="page"]').getAttribute('data-v');

test.describe('단축키', () => {
  test('1–6 은 화면을 바꾼다', async ({ launch }) => {
    const { page } = await launch();
    const order = ['calendar', 'plan', 'student', 'dept', 'nuga', 'request'];
    for (const [i, v] of order.entries()) {
      await press(page, String(i + 1));
      await expect(tab(page, v)).toHaveAttribute('aria-current', 'page');
    }
    await press(page, '1');
    await expect(tab(page, 'calendar')).toHaveAttribute('aria-current', 'page');
  });

  test('← → 는 달, T 는 오늘 (월 단위 화면에서만)', async ({ launch }) => {
    const { page } = await launch();
    await press(page, 'ArrowRight'); await press(page, 'ArrowRight');
    await expect(monthInput(page)).toHaveValue('2026-12');
    await press(page, 'ArrowLeft');
    await expect(monthInput(page)).toHaveValue('2026-11');
    await press(page, 't');
    await expect(monthInput(page)).toHaveValue('2026-10');
    await press(page, 'T');
    await expect(monthInput(page)).toHaveValue('2026-10');

    // 월 단위가 아닌 화면(부서)에서는 달이 움직이지 않는다
    await press(page, '4');
    await press(page, 'ArrowRight');
    await press(page, '1');
    await expect(monthInput(page)).toHaveValue('2026-10');
  });

  test('/ 는 검색칸으로, 검색칸에 쓰는 동안 숫자·글자는 단축키가 아니다', async ({ launch }) => {
    const { page } = await launch();
    await press(page, '/');
    await expect(page.locator('#q')).toBeFocused();
    await page.keyboard.type('t2r');
    await expect(page.locator('#q')).toHaveValue('t2r');
    await expect(tab(page, 'calendar')).toHaveAttribute('aria-current', 'page');
    await expect(monthInput(page)).toHaveValue('2026-10');
  });

  test('요청 화면의 글상자에 쓰는 숫자도 화면을 바꾸지 않는다', async ({ launch }) => {
    const { page } = await launch();
    await press(page, '6');
    await page.locator('#rc').focus();
    await page.keyboard.type('1234 tpr');
    await expect(page.locator('#rc')).toHaveValue('1234 tpr');
    await expect(tab(page, 'request')).toHaveAttribute('aria-current', 'page');
  });

  test('P 는 인쇄 미리보기(월 단위 화면만), R 은 새로고침', async ({ launch }) => {
    const { page, mock } = await launch();
    await press(page, 'p');
    await expect(page.locator('#pdlg')).toHaveAttribute('open', '');
    await press(page, 'Escape');
    await expect(page.locator('#pdlg')).not.toHaveAttribute('open', '');
    await press(page, '4');
    await press(page, 'p');
    await expect(page.locator('#pdlg')).not.toHaveAttribute('open', '');

    const before = mock.requests.length;
    await press(page, 'r');
    await expect.poll(() => mock.requests.length).toBe(before + 6);
  });

  test('창이 열려 있는 동안에는 단축키를 받지 않는다', async ({ launch }) => {
    const { page } = await launch();
    await page.locator('#setBtn').click();
    await expect(page.locator('#sdlg')).toHaveAttribute('open', '');
    await press(page, '3');
    await expect(tab(page, 'calendar')).toHaveAttribute('aria-current', 'page');
    await press(page, 'Escape');
    await expect(page.locator('#sdlg')).not.toHaveAttribute('open', '');
    await press(page, '3');
    await expect(tab(page, 'student')).toHaveAttribute('aria-current', 'page');
  });
});

test.describe('설정과 저장', () => {
  test('테마: 고르면 바로 바뀌고 localStorage "hs-prefs-v2" 에 남고, 새로 열어도 유지된다', async ({ launch }) => {
    const { page } = await launch();
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'light');
    await page.locator('#setBtn').click();
    await page.locator('#sbody [data-th="dark"]').click();
    await expect(html).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('#sbody [data-th="dark"]')).toHaveAttribute('aria-pressed', 'true');
    expect((await prefs(page)).theme).toBe('dark');
    await page.locator('#sdlg [data-a="close"]').click();

    await page.reload();
    await expect(html).toHaveAttribute('data-theme', 'dark');
    await page.goto('/');
    await expect(html).toHaveAttribute('data-theme', 'dark');

    await page.locator('#setBtn').click();
    await page.locator('#sbody [data-th="light"]').click();
    await expect(html).toHaveAttribute('data-theme', 'light');
    expect((await prefs(page)).theme).toBe('light');
  });

  test('테마 "시스템": 운영체제 설정을 따라간다 (처음 열면 이 상태)', async ({ launch }) => {
    const { page } = await launch({ colorScheme: 'dark' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    expect((await prefs(page)).theme).toBe('system');
    await page.emulateMedia({ colorScheme: 'light' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });

  test('글자 크기: --fs 가 바뀌고 저장된다', async ({ launch }) => {
    const { page } = await launch();
    await page.locator('#setBtn').click();
    await page.locator('#sbody [data-fs="1.22"]').click();
    const fs = () => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--fs').trim());
    expect(await fs()).toBe('1.22');
    expect((await prefs(page)).fs).toBe(1.22);
    await page.locator('#sdlg [data-a="close"]').click();
    await page.reload();
    expect(await fs()).toBe('1.22');
  });

  test('설정 창: 단축키 안내가 있다', async ({ launch }) => {
    const { page } = await launch();
    await page.locator('#setBtn').click();
    await expect(page.locator('#sbody .keys kbd')).toHaveText(['1', '6', '/', '←', '→', 'T', 'P', 'R']);
  });

  test('화면 · 주말 접기 · 숨긴 부서는 저장되어 다시 열면 그대로', async ({ launch }) => {
    const { page } = await launch();
    await press(page, '2');
    await page.locator('#tools [data-c="plan.noWeekend"]').click();
    await page.locator('#tools [data-h="행정실"]').click();
    const p = await prefs(page);
    expect(p.view).toBe('plan');
    expect(p.plan.noWeekend).toBe(true);
    expect(p.hidden).toEqual(['행정실']);

    await page.goto('/');
    await expect(tab(page, 'plan')).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('#tools [data-c="plan.noWeekend"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#tools [data-h="행정실"]')).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('#view tbody tr')).toHaveCount(22);   // 2026년 10월 평일 수
  });

  test('저장소를 못 쓰는 환경(차단)에서도 앱이 뜬다', async ({ launch }) => {
    const { page } = await launch({ goto: false });
    await page.context().addInitScript(() => {
      const deny = () => { throw new DOMException('denied', 'SecurityError'); };
      Object.defineProperty(window, 'localStorage', { get: deny, configurable: true });
      Object.defineProperty(window, 'sessionStorage', { get: deny, configurable: true });
    });
    await page.goto('/');
    await waitForApp(page, 'loaded');
    await expect(page.locator('.cal .d[data-k]')).toHaveCount(31);
    await press(page, '2');
    await expect(tab(page, 'plan')).toHaveAttribute('aria-current', 'page');
  });
});

test.describe('달 기억: 새로 열면 이번 달, 같은 탭에서 새로고침하면 그 달', () => {
  test('localStorage 의 prefs 에 달이 적혀 있어도 새로 열면 이번 달 (2026-10)', async ({ launch }) => {
    const { page } = await launch({ mock: { storage: { local: { [PREFS]: { view: 'calendar', month: '2026-05', theme: 'light' } } } } });
    await expect(monthInput(page)).toHaveValue('2026-10');
    await expect(cellOf(page, '2026-10-13')).toHaveClass(/\bnow\b/);
    // 저장된 다른 설정은 쓰인다 (화면)
    const p = await prefs(page);
    expect(p.month).toBeUndefined();
  });

  test('저장된 화면은 되살리되 달은 이번 달', async ({ launch }) => {
    const { page } = await launch({ mock: { storage: { local: { [PREFS]: { view: 'plan', month: '2026-05' } } } } });
    await expect(tab(page, 'plan')).toHaveAttribute('aria-current', 'page');
    await expect(monthInput(page)).toHaveValue('2026-10');
  });

  test('같은 탭에서 새로고침하면 보던 달이 남는다 (sessionStorage "hs-month-v2")', async ({ launch }) => {
    const { page } = await launch();
    await press(page, 'ArrowRight'); await press(page, 'ArrowRight');
    await expect(monthInput(page)).toHaveValue('2026-12');
    expect(await readSession(page, MONTH)).toBe('2026-12');
    await page.reload();
    await expect(monthInput(page)).toHaveValue('2026-12');
    await expect(page.locator('#srcSum')).toContainText('갱신');
    await expect(monthInput(page)).toHaveValue('2026-12');       // 시트를 다시 받은 뒤에도
  });

  test('새 탭(새로 열기)은 이번 달로 시작한다', async ({ launch }) => {
    const { page, context } = await launch();
    await press(page, 'ArrowRight');
    await expect(monthInput(page)).toHaveValue('2026-11');
    const second = await context.newPage();
    await second.goto('/');
    await waitForApp(second, 'loaded');
    await expect(monthInput(second)).toHaveValue('2026-10');
    await expect(monthInput(page)).toHaveValue('2026-11');       // 원래 탭은 그대로
  });

  test('탭 저장소에 있는 달은 되살리고, 깨진 값은 무시한다', async ({ launch }) => {
    const a = await launch({ mock: { storage: { session: { [MONTH]: '2026-03' } } } });
    await expect(monthInput(a.page)).toHaveValue('2026-03');
    await expect(cellOf(a.page, '2026-03-03')).toContainText('입학식 및 시업식');
    const b = await launch({ mock: { storage: { session: { [MONTH]: '2026-13' } } } });
    await expect(monthInput(b.page)).toHaveValue('2026-10');
    const c = await launch({ mock: { storage: { session: { [MONTH]: 'garbage' } } } });
    await expect(monthInput(c.page)).toHaveValue('2026-10');
  });

  test('자료에 이번 달 일정이 하나도 없으면 가장 가까운 일정이 있는 달로 맞춘다', async ({ launch }) => {
    // 2025학년도 자료만 있는 시트: 2026-10 에는 일정이 없다 → 오늘 이후 첫 일정(없으면 마지막 일정)의 달
    const old = (await import('../fixtures/index.mjs')).buildFixture({ year: 2025, filler: false });
    const { page } = await launch({ mock: { fixture: old } });
    const last = old.meta.schedule.at(-1).date.slice(0, 7);
    await expect(monthInput(page)).toHaveValue(last);
  });
});
