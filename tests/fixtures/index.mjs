// gviz 가 실제로 돌려주는 모양 그대로의 가짜 시트 6개를 만든다.
// 시트(구글)는 바꿀 수 없으니, 앱이 읽는 모양(decode() 가 기대하는 열 배치)을 이 파일이 흉내 낸다.
//
//   import { buildFixture } from './fixtures/index.mjs';
//   const fx = buildFixture();               // 2026학년도 기본
//   const fx2 = buildFixture({ year: 2025 }) // 다른 학년도 (같은 틀, 다른 날짜)
//   fx.payload('0')                           // gid 0 의 gviz 응답 객체 ({status:'ok', table:{cols,rows}})
//   fx.meta.day('2026-10-13')                 // 그 날의 기대값 (교직원/학생/중복)
//
// 날짜 칸: {"v":"Date(2026,9,13)","f":"2026. 10. 13"}  (달은 0부터)
import { CORE, STUDENT_ONLY, STUDENT_STYLE, HOLIDAYS, NOTICES, NOTICE_BROKEN, NUGA } from './core-events.mjs';

export const SHEET_ID = '1qg5vX4KlrI3hwn1XLiLIupkO74zxleqV6Imk1y5YQIE';
export const GIDS = {
  schedule: '0', student: '1112677469', supervisor: '1459415616',
  prayer: '1697887995', notice: '1487091944', nuga: '2041576858',
};
export const GID_KEY = Object.fromEntries(Object.entries(GIDS).map(([k, v]) => [v, k]));
export const SHEET_NAMES = {
  schedule: '연중행사계획', student: '(학생용)연중행사계획', supervisor: '자습감독',
  prayer: '기도순서', notice: '공지사항', nuga: '창체누가기록',
};
export const DEPT_NAMES = ['교목부', '교무부', '연구부', '상담부', '정보부', '1학년부', '2학년부', '3학년부', '기획위원', '행정실',
  '국어과', '영어과', '수학과', '사회과', '과학과', '예체능과', '정보과', '외국어과', '기타'];
export const FOCUS_DATE = '2026-10-13';
export const WD = ['일', '월', '화', '수', '목', '금', '토'];

// ---------- 작은 도구
const pad = n => String(n).padStart(2, '0');
export const ymd = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
const weekday = (y, m, d) => new Date(Date.UTC(y, m - 1, d)).getUTCDay();
const dateCell = (y, m, d) => ({ v: `Date(${y},${m - 1},${d})`, f: `${y}. ${m}. ${d}` });
const str = s => (s == null || s === '' ? null : { v: String(s) });
const num = n => ({ v: n, f: String(n) });
const colDef = (i, label, type, pattern) => ({ id: String.fromCharCode(65 + i), label: label || '', type, ...(pattern ? { pattern } : {}) });
const table = (cols, rows) => ({ cols, rows: rows.map(c => ({ c })), parsedNumHeaders: 0 });

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const gvizOk = (tbl, reqId = '0') => ({ version: '0.6', reqId: String(reqId), status: 'ok', sig: '1234567890', table: tbl });
export const gvizErr = (reason = 'access_denied', message = '권한 없음', detailed = '이 문서에 접근할 권한이 없습니다.') =>
  ({ version: '0.6', reqId: '0', status: 'error', errors: [{ reason, message, detailed_message: detailed }] });
/** gviz 의 responseHandler 응답: `/*O_o*​/\n<cb>(<json>);` */
export const jsonp = (cb, obj) => `/*O_o*/\n${cb}(${JSON.stringify(obj)});`;

// ---------- 학년도 날짜 범위
function* academicDays(year) {
  for (let t = Date.UTC(year, 2, 1); t <= Date.UTC(year + 1, 1, 28); t += 86400000) {
    const x = new Date(t);
    yield { y: x.getUTCFullYear(), m: x.getUTCMonth() + 1, d: x.getUTCDate(), w: x.getUTCDay() };
  }
}
const dayOf = (year, mmdd) => {
  const [m, d] = mmdd.split('-').map(Number);
  return { y: m >= 3 ? year : year + 1, m, d };
};

const FILLER = [
  ['교무부', '교직원 회의'], ['교무부', '학급 임원 협의회'], ['연구부', '교과 협의회'], ['연구부', '수업 나눔 주간 운영'],
  ['상담부', '또래 상담 활동'], ['상담부', '학부모 상담 주간'], ['정보부', '정보 보안 점검'], ['정보부', '교내 와이파이 점검'],
  ['1학년부', '1학년 학급 임원 회의'], ['2학년부', '2학년 진로 활동'], ['3학년부', '3학년 진학 상담'], ['기획위원', '기획위원회 협의'],
  ['행정실', '시설 점검'], ['행정실', '급식 위생 점검'], ['국어과', '독서 토론 모임'], ['영어과', '영어 듣기 평가 안내'],
  ['수학과', '수학 문제 해결 동아리'], ['사회과', '시사 토론 활동'], ['과학과', '과학 실험실 안전 교육'], ['예체능과', '음악 실기 수업'],
  ['정보과', '정보 교과 수행평가'], ['외국어과', '외국어 회화 수업 공개'], ['교목부', '수요 경건회 준비'], ['교목부', '학생 신앙 동아리 모임'],
  ['기타', '외부 강사 특강'],
];
const STUDENT_FILLER = ['학급 회의', '청소 구역 조정', '조회 시간 변경 안내', '체육복 지참', '급식 메뉴 안내', '동아리 활동 (5~6교시)', '방과후학교 수강 확인', '교복 점검'];
const TEACHERS = ['김정훈', '이수진', '박민석', '최은영', '정다은', '한상우', '오지현', '윤재호'];
const LEADERS = ['2-3 박서연', '1-5 이하은', '3-2 김지우', '2-1 최수아', '1-2 정예린', '3-4 한유나', '2-6 오서윤', '1-1 윤채원'];
const VERSES = ['시편 23:1-6', '잠언 3:5-6', '이사야 41:10', '요한복음 3:16', '로마서 8:28', '빌립보서 4:6-7', '마태복음 5:14-16', '고린도전서 13:4-7'];
const HYMNS = [305, 288, 363, 429, 546, 370, 217, 341];

// 줄 앞 표시("=", "~")를 떼어 낸다
function parseLine(raw) {
  let mark = '';
  let line = raw;
  if (line[0] === '=' || line[0] === '~') { mark = line[0]; line = line.slice(1); }
  const t = line.match(/^\[([^\]]+)\]\s*(.*)$/);
  const known = !!t && DEPT_NAMES.includes(t[1].trim());
  return {
    raw: line,
    dept: known ? t[1].trim() : t ? t[1].trim() : '',
    text: t ? t[2] : line,
    known, tagged: !!t,
    shared: mark === '=', fuzzy: mark === '~',
    // 앱이 보여 줄 때의 부서/글 (모르는 부서·태그 없음은 '기타' + 줄 전체)
    appDept: known ? t[1].trim() : '기타',
    appText: known ? t[2] : line,
  };
}

/**
 * @param {object} [o]
 * @param {number} [o.year=2026]   학년도 시작 연도 (3월 ~ 이듬해 2월)
 * @param {number} [o.seed=7]      채움 일정(PRNG) 씨앗
 * @param {boolean} [o.filler=true] 평일에 채움 일정을 깐다 (끄면 핵심 일정만)
 * @param {Array}  [o.extraNotices] 공지 추가 [{from,to,text}] (문자열 YYYY-MM-DD)
 * @param {boolean} [o.junk=true]  '확인할 행'용 깨진 행을 넣는다
 */
export function buildFixture(o = {}) {
  const year = o.year ?? 2026;
  const rand = rng(o.seed ?? 7);
  const withFiller = o.filler !== false;
  const withJunk = o.junk !== false;
  const flags = { schedule: 0, student: 0, supervisor: 0, prayer: 0, notice: 0, nuga: 0 };

  const holiday = new Set(HOLIDAYS);
  const vacation = (m, d) => (m === 7 && d >= 20) || (m === 8 && d <= 17) || m === 1 || (m === 12 && d >= 29) || m === 2;

  // ===== 연중행사계획 (gid 0): 날짜 / 요일 / 여러 줄 "[부서] 내용"
  const sched = []; // meta
  const schedRows = [];
  if (withJunk) schedRows.push([str('날짜'), str('요일'), str('주요 행사')]); // 머리 줄 (HEADER 로 걸러져 flag 없음)
  for (const { y, m, d, w } of academicDays(year)) {
    const mmdd = `${pad(m)}-${pad(d)}`;
    let lines = (CORE[mmdd] || []).slice();
    if (withFiller && !lines.length && w !== 0 && w !== 6 && !holiday.has(mmdd)) {
      const dense = m === 10 ? 0.9 : vacation(m, d) ? 0.08 : 0.38;
      if (rand() < dense) {
        const n = m === 10 ? 1 + Math.floor(rand() * 3) : 1 + Math.floor(rand() * 2);
        for (let i = 0; i < n; i++) { const [dp, tx] = FILLER[Math.floor(rand() * FILLER.length)]; lines.push(`[${dp}] ${tx}`); }
      }
    }
    const parsed = lines.map(parseLine);
    parsed.forEach(p => {
      if (p.tagged && !p.known) flags.schedule++;
      sched.push({ date: ymd(y, m, d), weekday: WD[w], dept: p.appDept, text: p.appText, rawTag: p.dept, shared: p.shared, fuzzy: p.fuzzy, untagged: !p.tagged, known: p.known || !p.tagged });
    });
    schedRows.push([dateCell(y, m, d), str(WD[w]), parsed.length ? str(parsed.map(p => p.raw).join('\n')) : null]);
  }
  if (withJunk) {
    schedRows.push([str('미정'), null, str('[교무부] 학부모 공개수업 (일자 미정)')]);
    schedRows.push([str('3월 중'), null, str('[연구부] 교육과정 협의회 (일자 미정)')]);
    schedRows.push([dateCell(year, 3, 5), str('목'), str('null')]);   // "null" 글자만 있는 칸: 조용히 건너뛴다
    flags.schedule += 2;
  }
  const scheduleTable = table(
    [colDef(0, '', 'date', 'yyyy. m. d'), colDef(1, '', 'string'), colDef(2, '', 'string'), colDef(3, '', 'string')],
    schedRows.map(r => [...r, null]),
  );

  // ===== (학생용)연중행사계획 (gid 1112677469)
  const stu = []; // meta
  const stuRows = [];
  if (withJunk) stuRows.push([str('날짜'), str('요일'), str('학생 일정')]);
  const byDate = new Map();
  for (const e of sched) {
    if (!(e.shared || e.fuzzy)) continue;
    const txt = e.fuzzy ? e.text.replace(/ /g, '') + '!' : e.text; // norm() 이 같은 행사로 보는 변형
    (byDate.get(e.date) || byDate.set(e.date, []).get(e.date)).push({ text: txt, shared: true, of: e });
  }
  for (const { y, m, d, w } of academicDays(year)) {
    const date = ymd(y, m, d), mmdd = `${pad(m)}-${pad(d)}`;
    const own = (y === (m >= 3 ? year : year + 1) ? STUDENT_ONLY[mmdd] || [] : []).map(text => ({ text, shared: false }));
    const list = [...(byDate.get(date) || []), ...own];
    if (withFiller && !list.length && w !== 0 && w !== 6 && !holiday.has(mmdd) && !vacation(m, d)) {
      if (rand() < (m === 10 ? 0.7 : 0.25)) list.push({ text: STUDENT_FILLER[Math.floor(rand() * STUDENT_FILLER.length)], shared: false });
    }
    if (!list.length) continue;
    const style = STUDENT_STYLE[mmdd] || 'date';
    const mark = list.length > 1 ? ['', '- ', '• ', ''][(y + m + d) % 4] : '';
    const body = list.map(x => mark + x.text).join('\n');
    const wd = str(WD[w]);
    let row;
    if (style === 'md-slash') row = [str(`${m}/${d}`), wd, str(body)];
    else if (style === 'md-dash') row = [str(`${m}-${d}`), wd, str(body)];
    else if (style === 'ymd-dot') row = [str(`${y}.${m}.${d}`), wd, str(body)];
    else if (style === 'date-col3') row = [dateCell(y, m, d), wd, null, str(body)];
    else if (style === 'tail') row = [str(`${m}/${d} ${list.map(x => x.text).join(' / ')}`), null, null];
    else row = [dateCell(y, m, d), wd, str(body)];
    stuRows.push(row);
    for (const x of list) stu.push({ date, text: style === 'tail' ? x.text : x.text, shared: x.shared, style, ...(x.of ? { schedText: x.of.text, dept: x.of.dept } : {}) });
  }
  if (withJunk) { stuRows.push([str('미정'), null, str('학부모 공개수업 안내 (일정 미정)')]); flags.student++; }
  const studentTable = table(
    [colDef(0, '', 'date', 'yyyy. m. d'), colDef(1, '', 'string'), colDef(2, '', 'string'), colDef(3, '', 'string')],
    stuRows.map(r => { const c = r.slice(); while (c.length < 4) c.push(null); return c; }),
  );

  // ===== 자습감독 (gid 1459415616): 날짜 / 요일 / 이름
  const sup = [];
  const supRows = [];
  if (withJunk) supRows.push([str('날짜'), str('요일'), str('감독교사')]);
  let ti = 0;
  for (const { y, m, d, w } of academicDays(year)) {
    const mmdd = `${pad(m)}-${pad(d)}`;
    if (w === 0 || w === 6 || holiday.has(mmdd) || vacation(m, d)) continue;
    const name = TEACHERS[ti++ % TEACHERS.length];
    sup.push({ date: ymd(y, m, d), name });
    supRows.push([dateCell(y, m, d), str(WD[w]), str(name)]);
  }
  if (withJunk) { supRows.push([str('10/15'), str('목'), str('미정')]); flags.supervisor++; }
  const supervisorTable = table([colDef(0, '', 'date', 'yyyy. m. d'), colDef(1, '', 'string'), colDef(2, '', 'string')], supRows);

  // ===== 기도순서 (gid 1697887995): 날짜 / 요일 / 담당 / 말씀 / 찬송 — 화·목 경건회
  const pr = [];
  const prRows = [];
  if (withJunk) prRows.push([str('날짜'), str('요일'), str('담당'), str('말씀'), str('찬송')]);
  let pi = 0;
  for (const { y, m, d, w } of academicDays(year)) {
    const mmdd = `${pad(m)}-${pad(d)}`;
    if ((w !== 2 && w !== 4) || holiday.has(mmdd) || vacation(m, d)) continue;
    const k = pi++;
    const row = { date: ymd(y, m, d), name: LEADERS[k % LEADERS.length], bible: VERSES[k % VERSES.length], hymn: `찬송가 ${HYMNS[k % HYMNS.length]}장` };
    pr.push(row);
    prRows.push([dateCell(y, m, d), str(WD[w]), str(row.name), str(row.bible), str(row.hymn)]);
  }
  if (withJunk) { prRows.push([str('추후 공지'), null, str('외부 강사 초청'), str('요한일서 4:7'), null]); flags.prayer++; }
  const prayerTable = table([colDef(0, '', 'date', 'yyyy. m. d'), colDef(1, '', 'string'), colDef(2, '', 'string'), colDef(3, '', 'string'), colDef(4, '', 'string')], prRows);

  // ===== 공지사항 (gid 1487091944): 게시 시작 / 게시 끝 / 내용
  const nts = [];
  const ntRows = [];
  const dt = s => { const [y, m, d] = s.split('-').map(Number); return dateCell(y, m, d); };
  const shiftYear = s => { const [y, ...r] = s.split('-'); return [+y - 2026 + year, ...r].join('-'); };
  if (withJunk) ntRows.push([str('게시일'), str('종료일'), str('내용')]);
  for (const n of [...NOTICES, ...(o.extraNotices || [])]) {
    const from = o.extraNotices?.includes(n) ? n.from : shiftYear(n.from), to = o.extraNotices?.includes(n) ? n.to : shiftYear(n.to);
    nts.push({ from, to, text: n.text });
    ntRows.push([dt(from), dt(to), str(n.text)]);
  }
  if (withJunk) { ntRows.push([str(NOTICE_BROKEN.from), dt(shiftYear(NOTICE_BROKEN.to)), str(NOTICE_BROKEN.text)]); flags.notice++; }
  ntRows.push([null, null, null]); // 빈 행
  const noticeTable = table([colDef(0, '', 'date', 'yyyy. m. d'), colDef(1, '', 'date', 'yyyy. m. d'), colDef(2, '', 'string')], ntRows);

  // ===== 창체누가기록 (gid 2041576858): cols 라벨 영역/일자/교시/1학년/2학년/3학년/활동내용/비고
  const nuga = [];
  const nuRows = [];
  const marks = ['1', '○', 'O'];
  NUGA.forEach(([cat, mmdd, per, gr, text, note], i) => {
    const { y, m, d } = dayOf(year, mmdd);
    nuRows.push([num(i + 1), str(cat), dateCell(y, m, d), str(per),
      ...[0, 1, 2].map(g => (gr.includes(String(g + 1)) ? str(marks[(i + g) % 3]) : null)), str(text), str(note)]);
    nuga.push({ date: ymd(y, m, d), cat: cat.replace(/\(.*$/, ''), per, grades: [0, 1, 2].map(g => gr.includes(String(g + 1))), text, note });
  });
  if (withJunk) {
    nuRows.splice(10, 0, [null, str('영역'), str('일자'), str('교시'), str('1학년'), str('2학년'), str('3학년'), str('활동내용'), str('비고')]); // 반복된 머리 줄
    nuRows.push([null, str('봉사'), str('미정'), str('3교시'), null, null, str('1'), str('봉사 일정 조율 중'), null]);
    const y1 = dayOf(year, '10-22');
    nuRows.push([null, null, dateCell(y1.y, y1.m, y1.d), str('6'), str('1'), str('1'), null, str('영역이 비어 있는 행'), null]);
    flags.nuga += 2;
  }
  flags.nuga += NUGA.filter(r => !/^[\d~,\s]+(교시)?$/.test(r[2])).length; // 교시를 읽을 수 없는 행
  const nugaTable = table(
    [colDef(0, '연번', 'number'), colDef(1, '영역', 'string'), colDef(2, '일자', 'date', 'yyyy. m. d'), colDef(3, '교시', 'string'),
      colDef(4, '1학년', 'string'), colDef(5, '2학년', 'string'), colDef(6, '3학년', 'string'), colDef(7, '활동내용', 'string'), colDef(8, '비고', 'string')],
    nuRows,
  );

  const tables = {
    [GIDS.schedule]: scheduleTable, [GIDS.student]: studentTable, [GIDS.supervisor]: supervisorTable,
    [GIDS.prayer]: prayerTable, [GIDS.notice]: noticeTable, [GIDS.nuga]: nugaTable,
  };

  // ===== 기대값 도우미 (테스트가 화면과 맞춰 본다)
  const meta = {
    year, schedule: sched, student: stu, supervisor: sup, prayer: pr, notices: nts, nuga,
    expectedFlags: { ...flags, total: Object.values(flags).reduce((a, b) => a + b, 0) },
    rowCounts: Object.fromEntries(Object.entries(GIDS).map(([k, g]) => [k, tables[g].rows.length])),
    /** 그 날의 기대값: staff(교직원 일정, 학생 시트와 겹치는 것 뺀 것), student(학생 일정), shared(겹치는 것) */
    day(date) {
      const all = sched.filter(e => e.date === date);
      const st = stu.filter(e => e.date === date);
      const shared = all.filter(e => e.shared || e.fuzzy);
      return {
        date, all, student: st, shared,
        staff: all.filter(e => !(e.shared || e.fuzzy)),
        prayer: pr.find(p => p.date === date) || null,
        supervisor: sup.find(p => p.date === date)?.name || '',
      };
    },
    /** 일정 개수가 많은 날부터 */
    densest(n = 5, prefix = '') {
      const c = new Map();
      for (const e of sched) if (e.date.startsWith(prefix)) c.set(e.date, (c.get(e.date) || 0) + 1);
      return [...c].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, n).map(([date, count]) => ({ date, count }));
    },
    countOn: date => sched.filter(e => e.date === date).length,
    /** 검색어(공백 AND, 대소문자 무시)에 걸리는 달 [YYYY-MM, 건수] — 교직원 일정은 '부서 글' 에 대해 */
    monthsMatching(q, { sheet = 'schedule', hiddenDepts = [] } = {}) {
      const terms = q.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
      const by = new Map();
      for (const e of sheet === 'student' ? stu : sched) {
        if (sheet !== 'student' && hiddenDepts.includes(e.dept)) continue;
        const hay = (sheet === 'student' ? e.text : `${e.dept} ${e.text}`).toLocaleLowerCase();
        if (terms.every(t => hay.includes(t))) { const mk = e.date.slice(0, 7); by.set(mk, (by.get(mk) || 0) + 1); }
      }
      return [...by].sort(([a], [b]) => (a < b ? -1 : 1));
    },
    eventsInMonth: mk => sched.filter(e => e.date.startsWith(mk)),
    weekendEvents: mk => sched.filter(e => e.date.startsWith(mk) && (e.weekday === '토' || e.weekday === '일')),
  };

  return {
    year, tables, meta,
    /** gid → gviz 응답 객체 (status ok) */
    payload(gid) { const t = tables[String(gid)]; return t ? gvizOk(t) : null; },
    /** 테이블을 고쳐 쓴 새 fixture (원본은 그대로) */
    withTable(gid, fn) {
      const next = { ...this, tables: { ...tables } };
      next.tables[String(gid)] = fn(structuredClone(tables[String(gid)]));
      return next;
    },
  };
}

export { dateCell, str as textCell };
