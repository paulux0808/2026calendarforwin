// 캡처 목록. 화면(DOM)만 건드린다: id · data-* · 접근 가능한 이름. 앱이 모듈로 쪼개져도 그대로 쓴다.
import { settle } from './env.mjs';

const TODAY = '2026-10-13';

async function view(page, v) {
  await page.click(`#tabs [data-v="${v}"]`);
  await settle(page);
}
async function dialog(page, id) {
  await page.waitForSelector(`#${id}[open]`);
  await settle(page);
  await page.evaluate(() => document.activeElement?.blur?.());
}

/**
 * name   파일 이름에 들어간다 (--only 에 쓰는 이름)
 * full   true 면 fullPage 캡처 (긴 표 · 연간)
 * run    캡처 직전까지 화면을 만든다
 */
export const SHOTS = [
  { name: 'cal-month', label: '달력 월', full: false, run: async () => {} },
  { name: 'cal-year', label: '달력 연간', full: true, run: async page => {
    await page.click('#tools [data-c="cal.year"]');
    await page.waitForSelector('.years .mini');
    await settle(page);
  } },
  { name: 'plan', label: '월중 계획', full: true, run: page => view(page, 'plan') },
  { name: 'student', label: '학생일정', full: true, run: page => view(page, 'student') },
  { name: 'dept', label: '부서', full: true, run: async page => {
    await view(page, 'dept');
    await page.selectOption('#ds', '교무부');
    await settle(page);
    await page.evaluate(() => window.scrollTo(0, 0));
  } },
  { name: 'nuga', label: '누가기록', full: true, run: async page => {
    await view(page, 'nuga');
    await page.click('#tools [data-g="3"]');
    await settle(page);
  } },
  { name: 'request', label: '수정 요청', full: false, run: page => view(page, 'request') },
  { name: 'day', label: '하루 상세 (2026-10-13)', full: false, run: async page => {
    await page.locator(`.cal .dnum[data-d="${TODAY}"]`).click();
    await dialog(page, 'ddlg');
  } },
  { name: 'print', label: '인쇄 미리보기', full: false, run: async page => {
    await page.click('#tools [data-a="open-print"]');
    await dialog(page, 'pdlg');
    await page.waitForFunction(() => document.querySelector('#fit')?.textContent.trim());
  } },
  { name: 'print-plan', label: '인쇄 미리보기 (월중 계획, 세로)', full: false, run: async page => {
    await view(page, 'plan');
    await page.click('#tools [data-a="open-print"]');
    await dialog(page, 'pdlg');
    await page.waitForFunction(() => document.querySelector('#fit')?.textContent.trim());
  } },
  { name: 'cal-noweekend', label: '달력 월 · 주말 접기', full: false, run: async page => {
    await page.click('#tools [data-c="cal.weekend"]');
    await settle(page);
  } },
  { name: 'settings', label: '설정', full: false, run: async page => {
    await page.click('#setBtn');
    await dialog(page, 'sdlg');
  } },
  { name: 'search', label: '검색 "고사"', full: false, run: async page => {
    await page.fill('#q', '고사');
    await page.waitForFunction(() => document.querySelector('#qn')?.textContent.trim());
    await page.waitForSelector('#hits:not([hidden]) .hm');
    await settle(page);
  } },
];

export const SHOT_NAMES = SHOTS.map(s => s.name);
