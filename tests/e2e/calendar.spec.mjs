import { test, expect, fx, cellOf, monthInput, readDay } from './harness.mjs';

test.describe('달력 월 보기', () => {
  test('주말 접기: 토·일 일정이 금요일 칸 아래로 모인다', async ({ launch }) => {
    const { page } = await launch();
    await page.locator('#tools [data-c="cal.weekend"]').click();
    await expect(page.locator('.cal .cal-h')).toHaveText(['월', '화', '수', '목', '금']);
    // 토·일 칸은 없다
    await expect(cellOf(page, '2026-10-03')).toHaveCount(0);
    await expect(cellOf(page, '2026-10-04')).toHaveCount(0);

    // 10/2(금): 토 10/3 · 일 10/4 의 일정이 '주말' 묶음으로
    const fri = cellOf(page, '2026-10-02');
    const own = fx.meta.day('2026-10-02').all.length;
    const sat = fx.meta.day('2026-10-03').all, sun = fx.meta.day('2026-10-04').all;
    const fold = fri.locator('.fold');
    await expect(fold.locator('.fold-h')).toHaveText('주말');
    await expect(fold.locator('.ev')).toHaveCount(sat.length + sun.length);
    await expect(fold.locator('.ev .tag').first()).toHaveText('토 3');
    await expect(fold.locator('.ev .tag').last()).toHaveText('일 4');
    await expect(fold).toContainText(sat[0].text);
    await expect(fold).toContainText(sun[0].text);
    await expect(fri).toHaveAttribute('aria-label', `10월 2일 금요일, 일정 ${own + sat.length + sun.length}건`);

    // 일정이 많은 금요일(10/16): 토 2건 · 일 1건
    const fri16 = cellOf(page, '2026-10-16');
    const w = ['2026-10-17', '2026-10-18'].flatMap(d => fx.meta.day(d).all);
    expect(w.length).toBe(3);
    await expect(fri16.locator('.fold .ev')).toHaveCount(3);

    // 켜면 다시 일곱 칸
    await page.locator('#tools [data-c="cal.weekend"]').click();
    await expect(page.locator('.cal .cal-h')).toHaveCount(7);
    await expect(cellOf(page, '2026-10-03')).toHaveCount(1);
    await expect(page.locator('.fold')).toHaveCount(0);
  });

  // 앱 결함 후보 — drawCalendar(): 주말 접기에서 토·일 일정은 '같은 달 안의 금요일' 칸에만 모인다.
  // 달이 토·일로 시작하면(2026-03 일 · 2026-08 토 · 2026-11 일) 그 달 첫 주말에는 금요일 칸이 없어 일정이 어디에도 안 나온다.
  // README: "주말 접기 … 일정이 사라지지 않게". 재현: 주말 끔 → 2026-11 → 11/1(일) "종교개혁 주일 예배" 없음.
  test.fixme('주말 접기: 어느 달에서도 일정이 사라지지 않는다', async ({ launch }) => {
    const { page } = await launch();
    await page.locator('#tools [data-c="cal.weekend"]').click();
    const lost = [];
    for (const mk of ['2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12', '2027-01', '2027-02']) {
      await monthInput(page).fill(mk);
      await expect(page.locator('.cal')).toBeVisible();
      const shown = await page.locator('.cal .ev').count();      // 넘쳐서 감춘 것도 DOM 에는 있다
      const want = fx.meta.eventsInMonth(mk).length;
      if (shown !== want) lost.push(`${mk}: 자료 ${want}건 / 화면 ${shown}건`);
    }
    expect(lost, '토·일로 시작하는 달의 첫 주말 일정이 빠진다').toEqual([]);
  });

  test('일정이 칸을 넘치면 +N 단추가 남고, 누르면 그날이 열린다', async ({ launch }) => {
    const { page } = await launch();                       // 데스크톱 1440×900
    const date = '2026-10-14';                              // 10건 — 가장 많은 날
    const total = fx.meta.day(date).all.length;
    expect(total).toBe(10);
    const cell = cellOf(page, date);
    const more = cell.locator('.more');
    await expect(more).toBeVisible();
    await expect(more).toHaveText(/^\+\d+$/);
    await expect(more).toHaveAttribute('data-d', date);
    const n = Number((await more.textContent()).slice(1));
    await expect(more).toHaveAttribute('aria-label', `${n}건 더 보기`);
    // 보이는 일정 + N = 전체
    await expect(cell.locator('.ev:visible')).toHaveCount(total - n);
    // 넘치지 않는 칸에는 +N 이 없다
    await expect(cellOf(page, '2026-10-09').locator('.more')).toHaveCount(0);

    await more.click();
    const d = await readDay(page);
    expect(d.title).toBe('2026년 10월 14일 (수)');
  });

  test('칸의 빈 곳을 눌러도 그날이 열린다 (일정 없는 날 포함)', async ({ launch }) => {
    const { page } = await launch();
    const cell = cellOf(page, '2026-10-09');                // 일정 하나 — 아래쪽은 비어 있다
    const box = await cell.boundingBox();
    await cell.click({ position: { x: box.width - 10, y: box.height - 10 } });
    expect((await readDay(page)).title).toBe('2026년 10월 9일 (금)');
    await page.keyboard.press('Escape');
    await expect(page.locator('#ddlg')).not.toHaveAttribute('open', '');

    await cellOf(page, '2026-10-11').click();               // 일정이 하나도 없는 일요일
    const d = await readDay(page);
    expect(d.title).toBe('2026년 10월 11일 (일)');
    expect(d.empty).toEqual(['교직원 일정', '학생 일정']);
  });

  test('날짜 숫자와 일정 단추도 그날을 연다', async ({ launch }) => {
    const { page } = await launch();
    await cellOf(page, '2026-10-21').locator('.dnum').click();
    expect((await readDay(page)).title).toBe('2026년 10월 21일 (수)');
  });

  test('부서 칩을 끄면 그 부서 일정이 사라지고 건수도 줄어든다', async ({ launch }) => {
    const { page } = await launch();
    const dept = '교무부';
    const on = fx.meta.day('2026-10-13').all.length;
    const mine = fx.meta.day('2026-10-13').all.filter(e => e.dept === dept).length;
    await page.locator(`#tools [data-h="${dept}"]`).click();
    await expect(page.locator(`#tools [data-h="${dept}"]`)).toHaveAttribute('aria-pressed', 'false');
    await expect(cellOf(page, '2026-10-13')).toHaveAttribute('aria-label', `10월 13일 화요일, 일정 ${on - mine}건`);
    await expect(page.locator('.cal .ev .tag', { hasText: dept })).toHaveCount(0);
  });

  test('‹ › 오늘: 달 이동', async ({ launch }) => {
    const { page } = await launch();
    await page.locator('#tools [data-a="next"]').click();
    await expect(monthInput(page)).toHaveValue('2026-11');
    await expect(page.locator('.cal .d[data-k]')).toHaveCount(30);
    await page.locator('#tools [data-a="prev"]').click();
    await page.locator('#tools [data-a="prev"]').click();
    await expect(monthInput(page)).toHaveValue('2026-09');
    await page.locator('#tools [data-a="today"]').click();
    await expect(monthInput(page)).toHaveValue('2026-10');
    await expect(cellOf(page, '2026-10-13')).toHaveClass(/\bnow\b/);
  });

  test('휴대폰 폭: 칸 전체를 누르면 아래에서 올라오는 판이 열린다', async ({ launch }) => {
    const { page } = await launch({ device: 'mobile' });
    await expect(page.locator('.cal .d[data-k]')).toHaveCount(31);
    // 좁은 화면에서는 일정에 부서 태그를 감춘다
    await expect(page.locator('.cal .d ul .ev .tag').first()).toBeHidden();
    await cellOf(page, '2026-10-13').tap({ position: { x: 20, y: 60 } });
    const d = await readDay(page);
    expect(d.title).toBe('2026년 10월 13일 (화)');
    const box = await page.locator('#ddlg').boundingBox();
    const vp = page.viewportSize();
    expect(Math.round(box.width)).toBe(vp.width);          // 가로 가득
    expect(box.y + box.height).toBeGreaterThan(vp.height - 2); // 바닥에 붙는다
  });
});

test.describe('달력 연간 보기', () => {
  test('열두 달 미니 달력: 날짜별 건수 · 달별 합계', async ({ launch }) => {
    const { page } = await launch();
    await page.locator('#tools [data-c="cal.year"]').click();
    await expect(page.locator('.years .mini')).toHaveCount(12);
    await expect(monthInput(page)).toHaveValue('2026');
    await expect(page.locator('#mi')).toHaveAttribute('type', 'number');

    for (const mk of ['2026-03', '2026-10', '2026-12']) {
      const want = fx.meta.eventsInMonth(mk).length;
      const head = page.locator('.mini-h', { has: page.locator(`[data-ym="${mk}"]`) });
      await expect(head.locator('span'), mk).toHaveText(`${want}건`);
    }
    // 날짜 칸: 건수 배지와 접근 가능한 이름
    const cell = page.locator('.mini-g button[data-d="2026-10-13"]');
    await expect(cell.locator('.n')).toHaveText(String(fx.meta.countOn('2026-10-13')));
    await expect(cell).toHaveAttribute('aria-label', `10월 13일 일정 ${fx.meta.countOn('2026-10-13')}건`);
    await expect(cell).toHaveClass(/\bnow\b/);
    // 일정 없는 날은 배지가 없다
    await expect(page.locator('.mini-g button[data-d="2026-10-11"] .n')).toHaveCount(0);
  });

  test('달 이름을 누르면 그 달의 월 보기로 나온다', async ({ launch }) => {
    const { page } = await launch();
    await page.locator('#tools [data-c="cal.year"]').click();
    await page.locator('.mini-h [data-ym="2026-05"]').click();
    await expect(page.locator('.years')).toHaveCount(0);
    await expect(monthInput(page)).toHaveValue('2026-05');
    await expect(page.locator('.cal .d[data-k]')).toHaveCount(31);
    await expect(cellOf(page, '2026-05-14')).toContainText('교내 체육대회');
  });

  test('연간에서 날짜를 누르면 하루 상세, ‹ › 는 한 해씩', async ({ launch }) => {
    const { page } = await launch();
    await page.locator('#tools [data-c="cal.year"]').click();
    await page.locator('.mini-g button[data-d="2026-10-14"]').click();
    expect((await readDay(page)).title).toBe('2026년 10월 14일 (수)');
    await page.locator('#ddlg [data-a="close"]').click();

    await page.locator('#tools [data-a="next"]').click();
    await expect(monthInput(page)).toHaveValue('2027');
    const jan = fx.meta.eventsInMonth('2027-01').length;
    await expect(page.locator('.mini-h', { has: page.locator('[data-ym="2027-01"]') }).locator('span')).toHaveText(jan ? `${jan}건` : '');
    await page.locator('#tools [data-a="prev"]').click();
    await page.locator('#tools [data-a="prev"]').click();
    await expect(monthInput(page)).toHaveValue('2025');
    await expect(page.locator('.mini-h span:not(:empty)')).toHaveCount(0);   // 2025 에는 자료가 없다
  });
});
