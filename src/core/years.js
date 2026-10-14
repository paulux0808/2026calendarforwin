/* 학년도 시트 고르기 — 달에 맞는 YEARS 항목, 그 탭 구성, 원자료 주소 */
import { ayOf, m1 } from "./dates.js";

/* 그 달이 속한 학년도(3월~2월)의 항목. 없으면 그 이전 중 가장 늦은 해, 그것도 없으면 가장 이른 해 */
export function pickYear(years, monthKey){
  if(!years?.length) return null;
  if(years.length === 1) return years[0];
  const by = [...years].sort((a, b) => a.year - b.year);
  const d = m1(monthKey);
  if(!d) return by.at(-1);
  const ay = ayOf(d);
  return by.find(y => y.year === ay) || by.filter(y => y.year <= ay).at(-1) || by[0];
}
/* 학년도마다 탭 구성이 다르면 그 항목의 tabs, 아니면 기본 */
export const tabsOf = (entry, defaultTabs) => entry?.tabs || defaultTabs;
export const sheetLink = (sheetId, gid) => `https://docs.google.com/spreadsheets/d/${sheetId}/edit#gid=${gid}`;
