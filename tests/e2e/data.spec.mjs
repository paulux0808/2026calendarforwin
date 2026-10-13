import { test, expect, fx, GIDS, SHEET_ID, cellOf, openSource } from './harness.mjs';
import { buildFixture, gvizErr } from '../fixtures/index.mjs';

const CACHE = 'hs-cache-v2';
const ALERT = '#alert';

test.describe('저장본 (사본)', () => {
  test('한 번 받은 뒤 연결이 끊기면 저장본을 보여 주고 그렇게 말한다', async ({ launch }) => {
    const app = await launch();
    const { page, mock } = app;
    await expect(page.locator('#srcSum')).toContainText('갱신');
    expect(await page.evaluate(k => !!localStorage.getItem(k), CACHE)).toBe(true);

    mock.override('*', 'abort');                         // 이제 시트에 닿지 않는다
    await page.reload();
    await expect(page.locator(ALERT)).toBeVisible();
    await expect(page.locator('#alertText')).toHaveText('연결되지 않아 저장본을 보여 줍니다.');
    // 저장본으로 그려져 있다
    await expect(page.locator('.cal .d[data-k]')).toHaveCount(31);
    await expect(cellOf(page, '2026-10-13')).toContainText(fx.meta.day('2026-10-13').staff[0].text);
    await expect(page.locator('#noticeText')).toHaveText(fx.meta.notices[0].text);   // 공지도 저장본에서
    await expect(page.locator('#srcSum')).toHaveText(/^자료 6\/6 · 저장본/);

    // 자료 출처: "<행수>행 저장본 · <사유>"
    await openSource(page);
    const rows = page.locator('#srcBody .src-row .st.bad');
    await expect(rows).toHaveCount(6);
    await expect(rows.first()).toHaveText(`${fx.meta.rowCounts.schedule}행 저장본 · 연결하지 못했습니다`);
    await expect(page.locator('#srcBody .src-foot span')).toContainText('이 기기에 사본 보관 중');
  });

  test('연결이 느려도(응답 없음) 저장본이 먼저 그려진다', async ({ launch }) => {
    const { page, mock } = await launch();
    mock.override('*', 'hang');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('.cal .d[data-k]')).toHaveCount(31);
    await expect(page.locator('#srcSum')).toContainText('저장본');
    await expect(page.locator(ALERT)).toBeHidden();       // 아직 실패로 보지 않는다
  });

  test('사본 비우기: 저장본을 지우고 단추는 잠긴다', async ({ launch }) => {
    const { page } = await launch();
    await openSource(page);
    await page.locator('#srcBody [data-a="clear"]').click();
    await expect(page.locator('#toast')).toHaveText('이 기기에 보관하던 사본을 지웠습니다');
    expect(await page.evaluate(k => localStorage.getItem(k), CACHE)).toBeNull();
    await expect(page.locator('#srcBody [data-a="clear"]')).toBeDisabled();
    await expect(page.locator('#srcBody .src-foot span')).toHaveText('이 기기에 보관된 사본이 없습니다');
  });

  test('다른 시트에서 받은 사본은 쓰지 않는다', async ({ launch }) => {
    const { page, mock } = await launch();
    await page.evaluate(k => {
      const c = JSON.parse(localStorage.getItem(k));
      c.sheet = 'ANOTHER_SHEET_ID';
      localStorage.setItem(k, JSON.stringify(c));
    }, CACHE);
    mock.override('*', 'abort');
    await page.reload();
    await expect(page.locator('#alertText')).toHaveText('불러오지 못했습니다.');
    await expect(page.locator('#view')).toContainText('불러온 자료 없음');
    await expect(page.locator('.cal')).toHaveCount(0);
  });

  test('저장본이 없고 연결도 안 되면 빈 화면 대신 안내', async ({ launch }) => {
    const { page } = await launch({ wait: 'failed', setup: m => m.override('*', 'abort') });
    await expect(page.locator('#alertText')).toHaveText('불러오지 못했습니다.');
    await expect(page.locator('#view')).toContainText('불러온 자료 없음');
    await expect(page.locator('#tools [data-a="open-print"]')).toBeDisabled();   // 자료가 없으면 인쇄도 못 한다
    await expect(page.locator('#alert [data-a="reload"]')).toBeVisible();
  });

  test('"다시 시도": 연결이 돌아오면 저장본 대신 새 자료로 바뀐다', async ({ launch }) => {
    const { page, mock } = await launch({ wait: 'failed', setup: m => m.override('*', 'abort') });
    mock.clearOverrides();
    await page.locator('#alert [data-a="reload"]').click();
    await expect(page.locator('#srcSum')).toContainText('갱신');
    await expect(page.locator(ALERT)).toBeHidden();
    await expect(page.locator('.cal .d[data-k]')).toHaveCount(31);
  });
});

test.describe('gviz 응답 검증', () => {
  test('status:"error" 는 시트가 돌려준 사유(detailed_message)를 자료 출처에 그대로 보인다', async ({ launch }) => {
    const detailed = '이 문서에 접근할 권한이 없습니다.';
    const { page } = await launch({ setup: m => m.override('schedule', { error: { reason: 'access_denied', message: '권한 없음', detailed_message: detailed } }) });
    await expect(page.locator('#alertText')).toHaveText('연중행사계획 실패');
    await openSource(page);
    const row = page.locator('#srcBody .src-row', { hasText: '연중행사계획' }).first();
    await expect(row.locator('.st')).toHaveText(detailed);
    await expect(row.locator('.st')).toHaveClass(/\bbad\b/);
    await expect(page.locator('#srcSum')).toContainText('자료 5/6');
    // 나머지 시트는 멀쩡하다 — 달력은 비고 학생일정은 나온다
    await expect(page.locator('.cal .d[data-k]')).toHaveCount(31);
    await expect(page.locator('.cal .ev')).toHaveCount(0);
  });

  test('detailed_message 가 없으면 message 를, 둘 다 없으면 안내 문구', async ({ launch }) => {
    const { page } = await launch({ setup: m => {
      m.override('student', { json: { version: '0.6', status: 'error', errors: [{ reason: 'x', message: 'Only message' }] } });
      m.override('supervisor', { json: { version: '0.6', status: 'error' } });
    } });
    await openSource(page);
    await expect(page.locator('#srcBody .src-row', { hasText: '(학생용)연중행사계획' }).locator('.st')).toHaveText('Only message');
    await expect(page.locator('#srcBody .src-row', { hasText: '자습감독' }).locator('.st')).toHaveText('시트 응답이 아닙니다 (접근 권한을 확인해 주세요)');
  });

  test('표 구조가 깨진 응답은 읽지 않는다', async ({ launch }) => {
    const { page } = await launch({ setup: m => m.override('prayer', { json: { version: '0.6', status: 'ok', table: { cols: [], rows: [{ nope: 1 }] } } }) });
    await openSource(page);
    await expect(page.locator('#srcBody .src-row', { hasText: '기도순서' }).locator('.st')).toHaveText('시트 구조를 읽을 수 없습니다');
  });

  test('HTTP 오류 · 연결 실패는 "연결하지 못했습니다", 여럿이 실패하면 이름을 모두 댄다', async ({ launch }) => {
    const { page } = await launch({ setup: m => { m.override('notice', { http: 500 }); m.override('nuga', 'abort'); } });
    await expect(page.locator('#alertText')).toHaveText('공지사항, 창체누가기록 실패');
    await openSource(page);
    await expect(page.locator('#srcBody .st.bad')).toHaveText(['연결하지 못했습니다', '연결하지 못했습니다']);
    await expect(page.locator('#notice')).toBeHidden();
  });

  test('응답이 없으면 12초 뒤 "응답 시간 초과"', async ({ launch }) => {
    const { page } = await launch({ mock: { clock: 'install' }, wait: 'none', setup: m => m.override('student', 'hang') });
    await expect(page.locator('#srcSum')).toBeVisible();
    await page.clock.runFor(13_000);
    await expect(page.locator('#alertText')).toHaveText('(학생용)연중행사계획 실패');
    await openSource(page);
    await expect(page.locator('#srcBody .src-row', { hasText: '(학생용)연중행사계획' }).locator('.st')).toHaveText('응답 시간 초과');
  });

  test('다른 학년도 자료도 서빙할 수 있다 (mock 의 시트 ID 별 자료)', async ({ launch }) => {
    // 앱은 CONFIG 의 시트 ID 로 묻는다. 그 ID 를 다른 자료로 바꿔 서빙할 수 있어야 다른 학년도 시험이 가능하다.
    const other = buildFixture({ year: 2025, filler: false });
    const { page, mock } = await launch({ mock: { fixture: other } });
    expect(mock.requests.every(r => r.sheetId === SHEET_ID)).toBe(true);
    await expect(page.locator('#srcSum')).toContainText('갱신');
    // 2025학년도 자료는 이 앱의 10월(2026)과 상관없이 읽힌다: 달 이동으로 2025-10 을 본다
    await page.locator('#mi').fill('2025-10');
    await expect(cellOf(page, '2025-10-13')).toContainText(other.meta.day('2025-10-13').all[0].text);
  });
});

test.describe('확인할 행', () => {
  test('깨진 행은 사유와 함께 짚어 주고, 읽을 수 있는 행은 그대로 쓴다', async ({ launch }) => {
    const { page } = await launch();
    const total = fx.meta.expectedFlags.total;
    await expect(page.locator('#srcSum')).toContainText(`확인할 행 ${total}`);
    await openSource(page);
    const box = page.locator('#srcBody .src-flags');
    await expect(box.locator('b')).toHaveText(`확인할 행 ${total}개 — 시트를 고친 뒤 새로고침하세요`);
    const items = await box.locator('li').allTextContents();
    expect(items).toHaveLength(total);
    const has = re => expect(items.some(t => re.test(t)), String(re)).toBe(true);
    has(/^연중행사계획 \d+행 · 모르는 부서 이름: 체육부$/);
    has(/^연중행사계획 \d+행 · 날짜를 읽을 수 없습니다$/);
    has(/^\(학생용\)연중행사계획 \d+행 · 날짜를 읽을 수 없습니다$/);
    has(/^자습감독 \d+행 · 날짜를 읽을 수 없습니다$/);
    has(/^기도순서 \d+행 · 날짜를 읽을 수 없습니다$/);
    has(/^공지사항 \d+행 · 게시 기간을 읽을 수 없습니다: 다음 주부터 ~ 2026\. 10\. 31$/);
    has(/^창체누가기록 \d+행 · 교시를 읽을 수 없습니다: 오후$/);
    has(/^창체누가기록 \d+행 · 날짜를 읽을 수 없습니다$/);
    has(/^창체누가기록 \d+행 · 영역이 비어 있습니다$/);
    // 머리 줄("날짜 / 요일 / …", "영역 / 일자 / …")은 지적하지 않는다
    expect(items.some(t => /머리|날짜 ·|영역 ·/.test(t))).toBe(false);
  });

  test('각 시트의 행 수와 원자료 링크', async ({ launch }) => {
    const { page } = await launch();
    await openSource(page);
    const rows = page.locator('#srcBody .src-row');
    await expect(rows).toHaveCount(6);
    for (const [i, key] of ['schedule', 'student', 'supervisor', 'prayer', 'notice', 'nuga'].entries()) {
      await expect(rows.nth(i).locator('.st')).toHaveText(`${fx.meta.rowCounts[key]}행 · 09:00`);
      await expect(rows.nth(i).locator('a')).toHaveAttribute('href', `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit#gid=${GIDS[key]}`);
    }
  });

  test('깨끗한 자료(clean)에는 확인할 행이 없다', async ({ launch }) => {
    const clean = buildFixture({ clean: true });
    const { page } = await launch({ mock: { fixture: clean } });
    await expect(page.locator('#srcSum')).toHaveText('자료 6/6 · 09:00 갱신');
    await openSource(page);
    await expect(page.locator('#srcBody .src-flags')).toHaveCount(0);
  });
});

test.describe('공지', () => {
  test('오늘 걸린 공지만 보이고, 지난 공지 · 날짜가 깨진 공지는 숨는다', async ({ launch }) => {
    const { page } = await launch();
    await expect(page.locator('#noticeText')).toHaveText(fx.meta.notices[0].text);
    await expect(page.locator('#notice')).not.toContainText('지난 공지');
    await expect(page.locator('#notice')).not.toContainText('날짜가 깨진 공지');
  });

  test('둘 이상 걸려 있으면 "N건 모두 보기"', async ({ launch }) => {
    const two = buildFixture({ extraNotices: [{ from: '2026-10-12', to: '2026-10-14', text: '둘째 공지: 이번 주 목요일 단축 수업' }] });
    const { page } = await launch({ mock: { fixture: two } });
    const more = page.locator('#noticeMore');
    await expect(more).toHaveText('2건 모두 보기');
    await more.click();
    await expect(page.locator('#idlg')).toHaveAttribute('open', '');
    await expect(page.locator('#ititle')).toHaveText('공지사항');
    await expect(page.locator('#ibody p')).toHaveText([two.meta.notices[0].text, '둘째 공지: 이번 주 목요일 단축 수업']);
  });
});
