import { test, expect, fx, GIDS, FOCUS_DATE, goView, cellOf, rowOf, tab } from './harness.mjs';

const day = fx.meta.day(FOCUS_DATE);

test.describe('화면마다 가짜 자료가 그려진다', () => {
  test('달력: 10월 격자와 오늘 칸, 공지 줄, 자료 출처 요약', async ({ launch }) => {
    const { page, mock } = await launch();
    await expect(tab(page, 'calendar')).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('#mi')).toHaveValue('2026-10');
    await expect(page.locator('.cal .cal-h')).toHaveText(['일', '월', '화', '수', '목', '금', '토']);
    await expect(page.locator('.cal .d[data-k]')).toHaveCount(31);

    const today = cellOf(page, FOCUS_DATE);
    await expect(today).toHaveClass(/\bnow\b/);
    await expect(today).toHaveAttribute('aria-label', `10월 13일 화요일, 일정 ${day.all.length}건`);
    await expect(today).toContainText(day.staff[0].text);
    // 모르는 부서 · 태그 없는 줄은 '기타' 로 떨어진다
    await expect(cellOf(page, '2026-10-20')).toContainText('[체육부] 가을 체육 행사 계획 협의');

    await expect(page.locator('#notice')).toBeVisible();
    await expect(page.locator('#noticeText')).toHaveText(fx.meta.notices[0].text);
    await expect(page.locator('#noticeMore')).toBeHidden(); // 오늘 걸린 공지는 하나

    const flags = fx.meta.expectedFlags.total;
    await expect(page.locator('#srcSum')).toHaveText(`자료 6/6 · 09:00 갱신 · 확인할 행 ${flags}`);
    // 앱은 시트 여섯 개를 모두 읽는다
    expect(new Set(mock.requests.map(r => r.gid))).toEqual(new Set(Object.values(GIDS)));
    expect(new Set(mock.requests.map(r => r.sheetId))).toEqual(new Set([mock.sheetId]));
  });

  test('월중 계획: 한 달 표, 경건회 · 자습감독 열', async ({ launch }) => {
    const { page } = await launch();
    await goView(page, 'plan');
    await expect(page.locator('#view thead th')).toHaveText(['날짜', '요일', '주요 행사', '경건회', '자습감독']);
    await expect(page.locator('#view tbody tr')).toHaveCount(31);
    const row = rowOf(page, FOCUS_DATE);
    await expect(row).toHaveClass(/\bnow\b/);
    await expect(row.locator('.ev')).toHaveCount(day.all.length);
    await expect(row.locator('td.c-n[data-l="경건회"]')).toHaveText(day.prayer.name);
    await expect(row.locator('td.c-n[data-l="자습감독"]')).toHaveText(day.supervisor);
    // 주말 행에는 토·일 색 클래스
    await expect(rowOf(page, '2026-10-17')).toHaveClass(/\bs6\b/);
    await expect(rowOf(page, '2026-10-18')).toHaveClass(/\bs0\b/);
    await expect(rowOf(page, '2026-10-17')).toContainText('학부모 설명회 (토)');
  });

  test('학생일정: 날짜 칸이 Date · "10-13" · "3/2" · "2026.10.16" · 글 한 칸 모두 읽힌다', async ({ launch }) => {
    const { page } = await launch();
    await goView(page, 'student');
    await expect(page.locator('#view thead th')).toHaveText(['날짜', '요일', '학생일정']);
    // 10월: 날짜마다 학생 일정 줄 수가 자료와 같다 (Date 셀 · "10-13" · "2026.10.16" · "10/20 글…" 형식이 섞여 있다)
    for (let d = 1; d <= 31; d++) {
      const date = `2026-10-${String(d).padStart(2, '0')}`;
      const want = fx.meta.day(date).student;
      const row = rowOf(page, date);
      await expect(row.locator('.ev-u'), date).toHaveCount(want.length);
      for (const e of want) await expect(row, `${date} ${e.text}`).toContainText(e.text);
    }
    // 학생 일정에는 부서 태그가 없다
    await expect(page.locator('#view .ev-u .tag')).toHaveCount(0);
    // 3월의 "3/2" 형식
    await page.locator('#mi').fill('2026-03');
    await expect(rowOf(page, '2026-03-02')).toContainText('삼일절 대체공휴일: 등교하지 않습니다');
    // 5월: Date 셀이고 글이 D열에 있는 행
    await page.locator('#mi').fill('2026-05');
    await expect(rowOf(page, '2026-05-14')).toContainText('체육복과 운동화 지참');
  });

  test('부서: 선택한 부서의 일정이 달별로, 부서 옆에 건수', async ({ launch }) => {
    const { page } = await launch();
    await goView(page, 'dept');
    const dept = '교무부';
    await page.selectOption('#ds', dept);
    const mine = fx.meta.schedule.filter(e => e.dept === dept);
    await expect(page.locator('#ds option:checked')).toHaveText(`${dept} ${mine.length}`);
    await expect(page.locator('#view .grp')).toHaveCount(mine.length);
    const oct = mine.filter(e => e.date.startsWith('2026-10')).length;
    await expect(page.locator('#view h2.cap', { hasText: '2026년 10월' })).toHaveText(`2026년 10월 · ${oct}건`);
    // 부서 칩은 부서 이름이 들어 있는 줄이므로 태그 칸은 비어 있다 (줄마다 .ev 하나)
    await expect(page.locator('#view .grp .ev').first()).toBeVisible();
  });

  test('누가기록: 학년별 표, 영역 칩 시간, 합계, 읽을 수 없는 교시', async ({ launch }) => {
    const { page } = await launch();
    await goView(page, 'nuga');
    for (const g of [1, 2, 3]) {
      await page.locator(`#tools [data-g="${g}"]`).click();
      const rows = fx.meta.nugaFor(g);
      await expect(page.locator('#view .frame.hide-s tbody tr'), `${g}학년`).toHaveCount(rows.length);
      const total = rows.reduce((s, r) => s + r.hours, 0);
      await expect(page.locator('#view tfoot td.num'), `${g}학년 합계`).toHaveText(String(total));
      // 교시를 읽을 수 없는 행은 '확인 필요' 이고 합계에서 빠진다
      await expect(page.locator('#view .frame.hide-s tbody .dash', { hasText: '확인 필요' })).toHaveCount(rows.filter(r => !r.ok).length);
    }
    await expect(page.locator('#view .strip-w')).toContainText('교시를 읽을 수 없는 기록은 합계에서 뺐습니다.');
    // 3학년: 자율·봉사가 따로 칩. 영역 칩의 시간 = 그 영역 행의 시간 합
    const chips = () => page.locator('#tools [data-cat]').evaluateAll(els => els.map(e => e.dataset.cat));
    expect(await chips()).toEqual(['전체', '자율', '봉사', '동아리', '진로']);
    const g3 = fx.meta.nugaFor(3);
    for (const cat of ['자율', '봉사', '동아리', '진로']) {
      const hrs = g3.filter(r => r.cat === cat).reduce((s, r) => s + r.hours, 0);
      await expect(page.locator(`#tools [data-cat="${cat}"] b`), cat).toHaveText(String(hrs));
    }
    // 칩을 누르면 그 영역만
    await page.locator('#tools [data-cat="진로"]').click();
    await expect(page.locator('#view .frame.hide-s tbody tr')).toHaveCount(g3.filter(r => r.cat === '진로').length);
    // 1·2학년은 자율+봉사가 '자율자치' 칩 하나
    await page.locator('#tools [data-g="1"]').click();
    expect(await chips()).toEqual(['전체', '자율자치', '동아리', '진로']);
  });

  test('수정 요청: 폼만 있고 검색 · 공지 · 자료 출처는 숨는다', async ({ launch }) => {
    const { page } = await launch();
    await goView(page, 'request');
    await expect(page.locator('#rf')).toBeVisible();
    await expect(page.locator('#rn')).toBeVisible();
    await expect(page.locator('#rt option')).toHaveCount(3);
    await expect(page.locator('#rc')).toHaveValue('');
    await expect(page.locator('#find')).toBeHidden();
    await expect(page.locator('#notice')).toBeHidden();
    await expect(page.locator('#src')).toBeHidden();
  });
});
