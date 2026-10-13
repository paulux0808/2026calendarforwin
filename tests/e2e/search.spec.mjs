import { test, expect, fx, goView, cellOf, monthInput } from './harness.mjs';

const Q = '고사';
const hits = fx.meta.monthsMatching(Q);                 // [['2026-03', 3], …]
const total = hits.reduce((s, [, n]) => s + n, 0);
const monthCount = mk => hits.find(([m]) => m === mk)?.[1] ?? 0;

test.describe('검색', () => {
  test('달력: 걸리는 일정만 남고 #qn 은 이 달 건수, 강조 표시', async ({ launch }) => {
    const { page } = await launch();
    await page.fill('#q', Q);
    await expect(page.locator('#qn')).toHaveText(String(monthCount('2026-10')));
    // 남은 일정은 모두 검색어를 강조해 보여 준다
    const evs = page.locator('.cal .ev');
    expect(await evs.count()).toBeGreaterThan(0);
    for (const e of await evs.all()) await expect(e.locator('mark')).not.toHaveCount(0);
    await expect(cellOf(page, '2026-10-21')).toContainText('2학기 중간고사 1일차');
    await expect(cellOf(page, '2026-10-13')).toContainText('중간고사 시험 감독 배정표 확정');
    await expect(cellOf(page, '2026-10-13')).not.toContainText('수능 원서 접수');
    // 검색을 지우면 배지도 사라진다
    await page.fill('#q', '');
    await expect(page.locator('#qn')).toHaveText('');
  });

  test('달 건너 찾기 줄: 칩마다 달과 건수, 지금 달은 현재 표시', async ({ launch }) => {
    const { page } = await launch();
    await expect(page.locator('#hits')).toBeHidden();
    await page.fill('#q', Q);
    const box = page.locator('#hits');
    await expect(box).toBeVisible();
    await expect(box.locator('.hits-t')).toHaveText(`검색 ${total}건`);
    const chips = box.locator('.hm');
    await expect(chips).toHaveCount(hits.length);
    for (const [m, n] of hits) {
      const chip = box.locator(`.hm[data-hm="${m}"]`);
      await expect(chip).toHaveAttribute('aria-label', `${+m.slice(5)}월 ${n}건`);
      await expect(chip.locator('b')).toHaveText(String(n));
    }
    await expect(box.locator('.hm[aria-current="true"]')).toHaveAttribute('data-hm', '2026-10');
    // 2027 의 달은 '27년' 표시를 붙이지 않는다 (이 자료에는 없음) / 같은 해라 연도 생략
    await expect(box.locator('.hm[data-hm="2026-04"]')).toContainText('4월');
  });

  test('칩을 누르면 그 달로 간다', async ({ launch }) => {
    const { page } = await launch();
    await page.fill('#q', Q);
    await page.locator('#hits .hm[data-hm="2026-04"]').click();
    await expect(monthInput(page)).toHaveValue('2026-04');
    await expect(page.locator('#hits .hm[aria-current="true"]')).toHaveAttribute('data-hm', '2026-04');
    await expect(page.locator('#qn')).toHaveText(String(monthCount('2026-04')));
    await expect(cellOf(page, '2026-04-22')).toContainText('1학기 중간고사 1일차');
  });

  test('Enter: 다음 일치 달로, 끝에서는 처음으로', async ({ launch }) => {
    const { page } = await launch();
    await page.fill('#q', Q);
    const months = hits.map(([m]) => m);
    const after = months.filter(m => m > '2026-10');
    await page.press('#q', 'Enter');
    await expect(monthInput(page)).toHaveValue(after[0]);
    for (const m of after.slice(1)) {
      await page.press('#q', 'Enter');
      await expect(monthInput(page)).toHaveValue(m);
    }
    await page.press('#q', 'Enter');               // 마지막 달 → 처음 달
    await expect(monthInput(page)).toHaveValue(months[0]);
    await expect(page.locator('#hits .hm[aria-current="true"]')).toHaveAttribute('data-hm', months[0]);
  });

  test('연간 보기에서 칩을 누르면 월 보기로 나와 그 달을 보여 준다', async ({ launch }) => {
    const { page } = await launch();
    await page.locator('#tools [data-c="cal.year"]').click();
    await page.fill('#q', Q);
    await expect(page.locator('.years')).toBeVisible();
    await page.locator('#hits .hm[data-hm="2026-07"]').click();
    await expect(page.locator('.years')).toHaveCount(0);
    await expect(monthInput(page)).toHaveValue('2026-07');
    await expect(cellOf(page, '2026-07-07')).toContainText('1학기 기말고사 1일차');
  });

  test('일치하는 일정이 없으면 그렇게 말한다', async ({ launch }) => {
    const { page } = await launch();
    await page.fill('#q', '없는말없는말');
    await expect(page.locator('#hits')).toHaveText('일치하는 일정 없음');
    await expect(page.locator('#qn')).toHaveText('0');
  });

  test('월중 계획 · 학생일정에도 걸리고, 부서 · 누가기록에는 달 건너 줄이 없다', async ({ launch }) => {
    const { page } = await launch();
    await goView(page, 'plan');
    await page.fill('#q', Q);
    await expect(page.locator('#qn')).toHaveText(String(monthCount('2026-10')));
    await expect(page.locator('#hits .hm')).toHaveCount(hits.length);

    await goView(page, 'student');                  // 화면을 바꾸면 검색은 비워진다
    await expect(page.locator('#q')).toHaveValue('');
    await page.fill('#q', Q);
    const stu = fx.meta.monthsMatching(Q, { sheet: 'student' });
    await expect(page.locator('#qn')).toHaveText(String(stu.find(([m]) => m === '2026-10')?.[1] ?? 0));
    await expect(page.locator('#hits .hm')).toHaveCount(stu.length);

    await goView(page, 'dept');
    await page.fill('#q', Q);
    await expect(page.locator('#hits')).toBeHidden();
    await expect(page.locator('#qn')).not.toHaveText('');
  });

  test('Esc 는 검색어를 지우고, 공백으로 나눈 말은 모두 들어 있어야 한다', async ({ launch }) => {
    const { page } = await launch();
    await page.fill('#q', '중간고사 감독');
    const want = fx.meta.eventsInMonth('2026-10').filter(e => `${e.dept} ${e.text}`.includes('중간고사') && `${e.dept} ${e.text}`.includes('감독')).length;
    await expect(page.locator('#qn')).toHaveText(String(want));
    await page.keyboard.press('Escape');
    await expect(page.locator('#q')).toHaveValue('');
    await expect(page.locator('#qn')).toHaveText('');
  });
});
