import { test, expect, fx, goView, monthInput } from './harness.mjs';

const openPrint = async page => {
  await page.locator('#tools [data-a="open-print"]').click();
  await expect(page.locator('#pdlg')).toHaveAttribute('open', '');
  await expect(page.locator('#fit')).not.toHaveText('');
};
const pt = async page => Number((await page.locator('#fit').textContent()).match(/([\d.]+)pt/)[1]);

test.describe('인쇄 미리보기', () => {
  test('학생일정(10월): A4 세로 한 장, 글자 크기까지 알려 준다', async ({ launch }) => {
    const { page } = await launch();
    await goView(page, 'student');
    await openPrint(page);
    await expect(page.locator('#stage .paper h1')).toHaveText('2026학년도 10월 학생일정');
    await expect(page.locator('#fit')).toHaveText(/^A4 세로 한 장 · \d+\.\dpt$/);
    await expect(page.locator('#fit')).not.toHaveClass(/\btight\b/);
    await expect(page.locator('#stage .paper tbody tr')).toHaveCount(31);
    // 오늘 줄은 표시된다
    await expect(page.locator('#stage .paper tbody tr.nw')).toHaveCount(1);
    await page.locator('#pdlg [data-a="close"]').click();
    await expect(page.locator('#pdlg')).not.toHaveAttribute('open', '');
  });

  test('달력(7월, 일정이 적은 달): A4 가로 한 장', async ({ launch }) => {
    const { page } = await launch();
    await monthInput(page).fill('2026-07');
    await openPrint(page);
    await expect(page.locator('#stage .paper h1')).toHaveText('2026학년도 7월 학사일정');
    await expect(page.locator('#fit')).toHaveText(/^A4 가로 한 장 · \d+\.\dpt$/);
    await expect(page.locator('#stage .pcal .h')).toHaveText(['일', '월', '화', '수', '목', '금', '토']);
    await expect(page.locator('#stage .pcal .c:has(b)')).toHaveCount(31);
    // 주말을 끄면 다섯 칸
    await page.locator('#pset [data-c="print.weekend"]').uncheck();
    await expect(page.locator('#stage .pcal .h')).toHaveText(['월', '화', '수', '목', '금']);
    await expect(page.locator('#fit')).toHaveText(/^A4 가로 한 장/);
  });

  test('월중 계획(10월, 빽빽): 작아지면 어떤 항목을 끄면 커지는지 알려 준다', async ({ launch }) => {
    const { page } = await launch();
    await goView(page, 'plan');
    await openPrint(page);
    await expect(page.locator('#stage .paper h1')).toHaveText('2026학년도 10월 학사운영 계획');
    const fit = page.locator('#fit');
    await expect(fit).toHaveClass(/\btight\b/);
    await expect(fit).toContainText('한 줄');
    await expect(fit).toContainText('경건회·자습감독 끄기');
    await expect(fit).toContainText('주말 빼기');
    const before = await pt(page);
    expect(before).toBeLessThan(7.4);

    // 한 줄: 한 칸에 이어 붙여 더 크게
    await page.locator('#pset [data-c="print.flat"]').check();
    await expect(page.locator('#stage .paper')).toHaveClass(/\bflat\b/);
    await expect.poll(() => pt(page)).toBeGreaterThan(before);
    await expect(fit).not.toContainText('한 줄');
    // 경건회 · 자습감독 열 끄기
    await expect(page.locator('#stage .paper th.p3')).toHaveCount(2);
    await page.locator('#pset [data-c="print.prayer"]').uncheck();
    await page.locator('#pset [data-c="print.super"]').uncheck();
    await expect(page.locator('#stage .paper th.p3')).toHaveCount(0);
  });

  test('꺼 둔 부서는 종이 아래쪽에 "숨김: …" 으로 남는다', async ({ launch }) => {
    const { page } = await launch();
    await goView(page, 'plan');
    await page.locator('#tools [data-h="교무부"]').click();
    await openPrint(page);
    await expect(page.locator('#stage .pf')).toContainText('숨김: 교무부');
    await expect(page.locator('#stage .paper .pd', { hasText: '[교무부]' })).toHaveCount(0);
  });

  test('Ctrl+P 길: beforeprint 에 종이만 남고 afterprint 에 되돌아온다', async ({ launch }) => {
    const { page } = await launch();
    await goView(page, 'student');
    await page.emulateMedia({ media: 'print' });
    await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
    await expect(page.locator('body')).toHaveClass(/\bpr\b/);
    await expect(page.locator('#proot .stage .paper h1')).toHaveText('2026학년도 10월 학생일정');
    await expect(page.locator('.top')).toBeHidden();
    await expect(page.locator('#proot .paper')).toBeVisible();
    await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
    await expect(page.locator('body')).not.toHaveClass(/\bpr\b/);
    await page.emulateMedia({ media: 'screen' });
    await expect(page.locator('.top')).toBeVisible();
  });

  test('인쇄 단추는 월 단위 화면에만 있다', async ({ launch }) => {
    const { page } = await launch();
    for (const v of ['calendar', 'plan', 'student']) {
      await goView(page, v);
      await expect(page.locator('#tools [data-a="open-print"]')).toBeEnabled();
    }
    for (const v of ['dept', 'nuga']) {
      await goView(page, v);
      await expect(page.locator('#tools [data-a="open-print"]')).toHaveCount(0);
    }
  });
});
