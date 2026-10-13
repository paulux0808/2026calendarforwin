import { test, expect, fx, buildFixture, FOCUS_DATE, goView } from './harness.mjs';

const mineOf = dept => fx.meta.schedule.filter(e => e.dept === dept);

test.describe('부서 화면', () => {
  for (const dept of ['교무부', '3학년부', '교목부']) {
    test(`${dept}: 오늘 줄은 한 번, 지난 일정 위 / 앞으로의 일정 아래`, async ({ launch }) => {
      const { page } = await launch();
      await goView(page, 'dept');
      await page.selectOption('#ds', dept);
      const mine = mineOf(dept);
      const past = mine.filter(e => e.date < FOCUS_DATE).length;

      const divider = page.locator('#view .grp-now');
      await expect(divider).toHaveCount(1);
      await expect(divider).toHaveText('오늘 · 10월 13일 (화)');
      await expect(divider).toHaveAttribute('aria-current', 'date');
      await expect(page.locator('#view .grp')).toHaveCount(mine.length);
      await expect(page.locator('#view .grp.past')).toHaveCount(past);

      // 오늘 줄보다 위에 있는 .grp 는 전부 past, 아래는 전부 past 가 아니다 (달을 가로질러도)
      const split = await page.evaluate(() => {
        const all = [...document.querySelectorAll('#view .grp, #view .grp-now')];
        const i = all.findIndex(x => x.classList.contains('grp-now'));
        return { above: all.slice(0, i).every(x => x.classList.contains('past')), below: all.slice(i + 1).every(x => !x.classList.contains('past')),
          aboveN: i, belowN: all.length - i - 1 };
      });
      expect(split.above).toBe(true);
      expect(split.below).toBe(true);
      expect(split.aboveN).toBe(past);
      expect(split.belowN).toBe(mine.length - past);
    });
  }

  test('지난 일정은 흐리게(회색), 앞으로의 일정은 본래 색', async ({ launch }) => {
    const { page } = await launch();
    await goView(page, 'dept');
    await page.selectOption('#ds', '교무부');
    const color = loc => loc.first().evaluate(el => getComputedStyle(el).color);
    const rgb = c => c.match(/\d+/g).slice(0, 3).map(Number);
    const past = rgb(await color(page.locator('#view .grp.past .ev')));
    const next = rgb(await color(page.locator('#view .grp:not(.past) .ev')));
    expect(past).not.toEqual(next);
    expect(past.reduce((a, b) => a + b)).toBeGreaterThan(next.reduce((a, b) => a + b));   // 라이트 테마: 회색이 더 밝다
    // 날짜 칸도 같이 흐려진다
    const pastDate = rgb(await color(page.locator('#view .grp.past span')));
    const nextDate = rgb(await color(page.locator('#view .grp:not(.past) span')));
    expect(pastDate.reduce((a, b) => a + b)).toBeGreaterThan(nextDate.reduce((a, b) => a + b));
  });

  test('저장본이 있는 상태로 다시 열면 오늘 줄이 보이는 자리에서 시작한다', async ({ launch }) => {
    const { page } = await launch();
    await goView(page, 'dept');
    await page.selectOption('#ds', '교무부');
    await page.goto('/');                                    // 새로 열기 (reload 는 브라우저가 스크롤 위치를 되살린다)
    await expect(page.locator('#srcSum')).toContainText('갱신');
    await expect(page.locator('#tabs [data-v="dept"]')).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('#view .grp-now')).toBeInViewport();
  });

  test('T 키는 오늘 줄로 되돌아온다', async ({ launch }) => {
    const { page } = await launch();
    await goView(page, 'dept');
    await page.selectOption('#ds', '교무부');
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(page.locator('#view .grp-now')).not.toBeInViewport();     // 10월은 한참 아래
    await page.keyboard.press('t');
    await expect(page.locator('#view .grp-now')).toBeInViewport();
  });

  // 앱 결함 후보 — go(): draw() 안에서 jumpToday 로 .now 를 가운데로 스크롤한 직후
  // 같은 go() 가 window.scrollTo({top:0}) 을 불러 되돌린다. 탭·단축키로 부서 화면에 들어가면 항상 맨 위.
  // (커밋 "부서 화면은 오늘부터" 의 취지: "오늘 줄을 넣고 그 자리로 연다")
  test.fixme('탭으로 부서 화면에 들어오면 오늘 줄이 보이는 자리로 열린다', async ({ launch }) => {
    const { page } = await launch();
    await goView(page, 'dept');
    await page.selectOption('#ds', '교무부');
    await page.keyboard.press('1');
    await page.keyboard.press('4');
    await expect(page.locator('#view .grp-now')).toBeInViewport();
  });

  test('일정이 없는 부서는 "일정 없음"', async ({ launch }) => {
    const { page } = await launch({ mock: { fixture: buildFixture({ filler: false }) } });
    await goView(page, 'dept');
    await page.selectOption('#ds', '외국어과');
    await expect(page.locator('#view')).toContainText('일정 없음');
    await expect(page.locator('#view .grp-now')).toHaveCount(0);
    await expect(page.locator('#ds option:checked')).toHaveText('외국어과 0');
  });

  test('검색은 그 부서 안에서만 걸러 준다', async ({ launch }) => {
    const { page } = await launch();
    await goView(page, 'dept');
    await page.selectOption('#ds', '교무부');
    await page.fill('#q', '고사');
    const want = mineOf('교무부').filter(e => e.text.includes('고사') || e.dept.includes('고사')).length;
    await expect(page.locator('#qn')).toHaveText(String(want));
    await expect(page.locator('#view .grp')).toHaveCount(want);
  });
});
