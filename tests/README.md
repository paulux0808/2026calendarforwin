# tests — 화면 캡처 · 비교 · E2E

앱(`index.html`, 나중에 `index.html + config.js + src/**`)을 **HTTP 로 띄워 화면(DOM)으로만** 만진다.
단일 파일이든 ES 모듈이든 같은 도구가 돈다. 구글 시트·Apps Script·웹폰트는 전부 가짜로 대신하고,
시각은 2026-10-13 09:00 (Asia/Seoul)에 고정한다. 앱 코드는 건드리지 않는다.

## 준비 (한 번)

```bash
cd tests && npm install        # @playwright/test 1.56.1 고정. 브라우저는 PLAYWRIGHT_BROWSERS_PATH(/opt/pw-browsers) 것을 쓴다
```

`playwright install` 은 하지 않는다. `npm install` 을 안 해도 `shoot.mjs`·`diff.mjs` 는 전역 playwright 로 돈다 (E2E 만 설치가 필요).

## 화면 캡처

```bash
node tests/shoot.mjs [--root <앱 폴더>] [--out <폴더>] [--only a,b] [--mobile|--desktop] [--theme light|dark] [--dpr 2]
```

- 기본: `--root` 저장소 루트, `--out` `tests/out`. 13장면 × {데스크톱 1440×900, 모바일 390×844} × {light, dark} = 52장, 약 20초.
- 이름: `<장면>.<desktop|mobile>.<light|dark>.png`. 장면: `cal-month cal-year plan student dept nuga request day print settings search` (+ `print-plan cal-noweekend`). `--list` 로 목록.
- 같은 입력이면 픽셀까지 같다 (마우스·초점을 치우고 찍는다).

## 비교 (리팩터링 증명)

```bash
node tests/shoot.mjs --root . --out /tmp/before        # 고치기 전
node tests/shoot.mjs --root <새 폴더> --out /tmp/after # 고친 뒤
node tests/diff.mjs /tmp/before /tmp/after [--threshold 0.01] [--tolerance 0] [--out <diff 폴더>]
```

파일마다 다른 픽셀 %를 찍고, 다르면 `<이름>.diff.png`(A 를 흐리게 깔고 다른 곳을 빨갛게)와 다른 영역 좌표를 쓴다.
한 픽셀이라도 다르거나(`--threshold` 로 허용 % 지정) 크기·파일이 다르면 종료 코드 1. 외부 의존성 없음(PNG 를 직접 읽는다).

## E2E

```bash
cd tests
npx playwright test                       # 전부 (현재 index.html 에서 91 통과 · 2 fixme)
npx playwright test search day -g "Enter" # 파일/이름으로 일부만
HS_ROOT=/path/to/새폴더 npx playwright test   # 다른 앱 폴더에 대고
PW_WORKERS=2 npx playwright test          # 병렬 수 (기본 4)
```

테스트마다 새 브라우저 컨텍스트라 서로 독립이다. 선택자는 id·`data-*`·`aria-*` 만 쓴다.
`test.fixme` 두 개는 **앱 결함 후보**다 (고쳐지면 `fixme` 를 떼면 된다):

| 위치 | 증상 |
| --- | --- |
| `calendar.spec.mjs` 주말 접기 | `drawCalendar()`: 토·일로 시작하는 달(2026-03 · 08 · 11)의 첫 주말 일정이 금요일 칸이 없어 어디에도 안 나온다 |
| `dept.spec.mjs` 탭으로 들어오기 | `go()`: `draw()` 가 오늘 줄로 스크롤한 직후 `scrollTo(0,0)` 이 되돌린다 |

## 구성

| 경로 | 내용 |
| --- | --- |
| `fixtures/index.mjs` | `buildFixture({year, seed, filler, junk, clean, extraNotices})` — gviz 모양 가짜 시트 6개 + 기대값 `meta` |
| `fixtures/core-events.mjs` | 손으로 쓴 핵심 일정 (10월이 가장 빽빽: 10/14 10건, 10/13 8건) |
| `lib/server.mjs` | 의존성 없는 정적 서버 (MIME: html js mjs css json png svg …) |
| `lib/mock.mjs` | `installMocks(context, opts)` — gviz/Apps Script/웹폰트 가짜, 시계 고정, 저장소 미리 채우기 |
| `lib/env.mjs` | `openApp(browser, {device, colorScheme, mock})`, `waitForApp`, 서버+브라우저 묶음 |
| `lib/shots.mjs` · `shoot.mjs` · `diff.mjs` · `lib/png.mjs` | 캡처 · 비교 도구 |
| `e2e/*.spec.mjs` · `e2e/harness.mjs` | 테스트와 공용 도우미 (`launch()`, `readDay()` …) |

가짜 시트 쓰는 법:

```js
const app = await launch({ device: 'mobile', mock: { storage: { local: { 'hs-prefs-v2': { view: 'plan' } } } },
  setup: m => m.override('schedule', { error: { detailed_message: '이 문서에 접근할 권한이 없습니다.' } }) });
// m.override('*', 'abort' | 'hang' | { http: 500 } | { table } | { json }) · m.setSheet(시트ID, buildFixture({ year: 2025 }))
// app.mock.requests (gviz 요청) · app.mock.posts (수정 요청 POST 본문) · clock: 'install' 이면 page.clock.runFor() 로 시간 감기
```

참고: 웹폰트(Pretendard)는 막아 두므로 글자는 시스템 한글 글꼴로 나온다. 같은 기계에서는 항상 같지만 다른 기계와는 픽셀이 다를 수 있다.
