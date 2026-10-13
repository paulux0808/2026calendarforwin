import { test, expect, fx, FOCUS_DATE, cellOf, readDay, goView, rowOf } from './harness.mjs';

const day = fx.meta.day(FOCUS_DATE);
const sharedTexts = day.shared.map(e => e.text);

test.describe('하루 상세', () => {
  test('일정 단추를 누르면 그날이 열리고 누른 일정이 강조된다', async ({ launch }) => {
    const { page } = await launch();
    const first = day.staff[0];
    await cellOf(page, FOCUS_DATE).locator('.ev', { hasText: first.text }).click();
    const d = await readDay(page);
    expect(d.title).toBe('2026년 10월 13일 (화)');
    expect(d.sections['교직원 일정'].map(e => e.text)).toEqual(day.staff.map(e => e.text));
    expect(d.onIds.length).toBe(1);
    await expect(page.locator('#dbody .item.on p')).toHaveText(first.text);
    // 부서 칩과 담당(경건회·말씀·찬송·자습감독)
    expect(d.sections['교직원 일정'][0]).toEqual({ dept: first.dept, text: first.text });
    expect(d.duty).toEqual({
      경건회: day.prayer.name, 말씀: day.prayer.bible, 찬송: day.prayer.hymn, 자습감독: day.supervisor,
    });
  });

  test('두 시트에 같이 적힌 행사는 한 번만: 교직원 일정에서는 빠지고 학생 일정에 부서 칩과 함께 남는다', async ({ launch }) => {
    const { page } = await launch();
    await cellOf(page, FOCUS_DATE).locator('.dnum').click();
    const d = await readDay(page);
    expect(sharedTexts.length).toBeGreaterThan(0);

    const staff = d.sections['교직원 일정'].map(e => e.text);
    const stu = d.sections['학생 일정'];
    for (const t of sharedTexts) {
      expect(staff, `교직원 일정에 중복이 남음: ${t}`).not.toContain(t);
      expect(stu.filter(e => e.text === t), `학생 일정에 한 번 있어야 함: ${t}`).toHaveLength(1);
    }
    // 겹친 행사는 학생 일정에서 부서 칩을 단다 (원래 부서를 알려 주기 위해), 학생에게만 있는 행사는 칩이 없다
    for (const e of day.shared) expect(stu.find(x => x.text === e.text).dept).toBe(e.dept);
    for (const e of day.student.filter(x => !x.shared)) expect(stu.find(x => x.text === e.text).dept).toBe('');
    // 전체 줄 수: 교직원 = 전체 - 겹침, 학생 = 학생 시트 전부
    expect(staff).toHaveLength(day.all.length - day.shared.length);
    expect(stu).toHaveLength(day.student.length);
  });

  test('띄어쓰기·느낌표만 다른 같은 행사도 중복으로 본다 (10/8, 10/16)', async ({ launch }) => {
    const { page } = await launch();
    for (const date of ['2026-10-08', '2026-10-16']) {
      const want = fx.meta.day(date);
      expect(want.shared.length, date).toBe(1);
      await cellOf(page, date).locator('.dnum').click();
      const d = await readDay(page);
      expect(d.sections['교직원 일정'], date).toHaveLength(want.all.length - 1);
      expect(d.sections['학생 일정'].some(e => e.dept === want.shared[0].dept), date).toBe(true);
      await page.keyboard.press('Escape');
    }
  });

  test('‹ › 로 하루씩 옮긴다 (달 경계도 넘는다)', async ({ launch }) => {
    const { page } = await launch();
    await cellOf(page, FOCUS_DATE).locator('.dnum').click();
    const next = page.locator('#ddlg [data-a="d-next"]'), prev = page.locator('#ddlg [data-a="d-prev"]');
    await next.click();
    let d = await readDay(page);
    const d14 = fx.meta.day('2026-10-14');
    expect(d.title).toBe('2026년 10월 14일 (수)');
    expect(d.sections['교직원 일정']).toHaveLength(d14.staff.length);
    expect(d.sections['학생 일정']).toHaveLength(d14.student.length);
    expect(d.onIds).toEqual([]);                            // 옮기면 강조는 없다
    await prev.click(); await prev.click();
    expect((await readDay(page)).title).toBe('2026년 10월 12일 (월)');
    for (let i = 0; i < 19; i++) await next.click();        // 10/31
    expect((await readDay(page)).title).toBe('2026년 10월 31일 (토)');
    await next.click();
    d = await readDay(page);
    expect(d.title).toBe('2026년 11월 1일 (일)');
    expect(d.sections['교직원 일정'].map(e => e.text)).toEqual(fx.meta.day('2026-11-01').staff.map(e => e.text));
    expect(d.empty).toEqual(['학생 일정']);
  });

  test('닫기 · Esc · 바깥(배경) 누르기로 닫힌다', async ({ launch }) => {
    const { page } = await launch();
    const open = () => cellOf(page, '2026-10-12').locator('.dnum').click();
    const dlg = page.locator('#ddlg');
    await open();
    await expect(dlg).toHaveAttribute('open', '');
    await dlg.locator('[data-a="close"]').click();
    await expect(dlg).not.toHaveAttribute('open', '');
    await open();
    await page.keyboard.press('Escape');
    await expect(dlg).not.toHaveAttribute('open', '');
    await open();
    await page.mouse.click(8, 450);                         // 창 바깥 = 배경
    await expect(dlg).not.toHaveAttribute('open', '');
  });

  test('복사: 그날 일정이 글로 클립보드에 담긴다', async ({ launch }) => {
    const { page } = await launch();
    await cellOf(page, FOCUS_DATE).locator('.dnum').click();
    await page.locator('#ddlg [data-a="d-copy"]').click();
    await expect(page.locator('#toast')).toHaveText('복사했습니다');
    const text = await page.evaluate(() => navigator.clipboard.readText());
    const lines = text.split('\n');
    expect(lines[0]).toBe('2026년 10월 13일 (화)');
    expect(lines).toContain(`[${day.staff[0].dept}] ${day.staff[0].text}`);
    expect(lines).toContain(`[학생] ${day.student[0].text}`);
    expect(lines).toContain(`경건회 ${day.prayer.name} / ${day.prayer.bible} / ${day.prayer.hymn}`);
    expect(lines).toContain(`자습감독 ${day.supervisor}`);
  });

  test('부서 칩을 누르면 그 부서 화면으로 간다', async ({ launch }) => {
    const { page } = await launch();
    await cellOf(page, FOCUS_DATE).locator('.dnum').click();
    await page.locator('#dbody .tag[data-dept="연구부"]').click();
    await expect(page.locator('#ddlg')).not.toHaveAttribute('open', '');
    await expect(page.locator('#tabs [data-v="dept"]')).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('#ds')).toHaveValue('연구부');
  });

  test('월중 계획 · 학생일정 표에서도 같은 상세가 열린다', async ({ launch }) => {
    const { page } = await launch();
    await goView(page, 'plan');
    await rowOf(page, FOCUS_DATE).locator('.ev', { hasText: day.staff[1].text }).click();
    const d = await readDay(page);
    expect(d.title).toBe('2026년 10월 13일 (화)');
    await expect(page.locator('#dbody .item.on p')).toHaveText(day.staff[1].text);
  });
});

test.describe('하루 상세에서 수정 요청', () => {
  test('일정 옆 "수정 요청": 요청 화면으로 가서 그 일정이 본문에 얹힌다', async ({ launch }) => {
    const { page } = await launch();
    const e = day.staff[0];
    await cellOf(page, FOCUS_DATE).locator('.dnum').click();
    await page.locator('#dbody .item', { hasText: e.text }).locator('[data-ask]').click();
    await expect(page.locator('#ddlg')).not.toHaveAttribute('open', '');
    await expect(page.locator('#tabs [data-v="request"]')).toHaveAttribute('aria-current', 'page');
    const box = page.locator('#rc');
    await expect(box).toHaveValue(`[관련 일정: 2026.10.13 (화)]\n[${e.dept}] ${e.text}\n\n요청 내용: `);
    await expect(box).toBeFocused();
    await expect(page.locator('#rcount')).toHaveText(`${(await box.inputValue()).length}자`);
  });

  test('"이 날짜로 수정 요청": 날짜만 얹힌다', async ({ launch }) => {
    const { page } = await launch();
    await cellOf(page, FOCUS_DATE).locator('.dnum').click();
    await page.locator('#ddlg [data-a="d-ask"]').click();
    await expect(page.locator('#rc')).toHaveValue('[관련 날짜: 2026.10.13 (화)]\n\n요청 내용: ');
  });

  test('이미 쓰던 내용이 있으면 그 뒤에 이어 붙는다', async ({ launch }) => {
    const { page } = await launch();
    await goView(page, 'request');
    await page.fill('#rc', '먼저 쓴 말');
    await goView(page, 'calendar');
    await cellOf(page, FOCUS_DATE).locator('.dnum').click();
    await page.locator('#ddlg [data-a="d-ask"]').click();
    await expect(page.locator('#rc')).toHaveValue('먼저 쓴 말\n\n[관련 날짜: 2026.10.13 (화)]\n\n요청 내용: ');
  });
});
