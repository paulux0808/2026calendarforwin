#!/usr/bin/env node
// 화면 캡처: 2026-10-13 09:00 (Asia/Seoul) 에 고정한 가짜 자료로 앱 화면을 찍는다.
//
//   node tests/shoot.mjs [--root <dir>] [--out <dir>] [--only a,b] [--mobile|--desktop]
//                        [--theme light|dark] [--dpr 1] [--jobs 4] [--list]
//
//   --root   앱이 들어 있는 폴더 (기본: 저장소 루트). index.html 이 여기 있어야 한다
//   --out    PNG 를 쓸 폴더 (기본: tests/out)
//   --only   일부만 (쉼표로): cal-month,cal-year,plan,student,dept,nuga,request,day,print,settings,search (+ print-plan,cal-noweekend)
// 파일 이름: <shot>.<desktop|mobile>.<light|dark>.png
import path from 'node:path';
import { mkdir, readdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { REPO_ROOT, startServer, launchChromium, openApp, neutralize } from './lib/env.mjs';
import { SHOTS, SHOT_NAMES } from './lib/shots.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const a = { root: REPO_ROOT, out: path.join(HERE, 'out'), only: null, devices: ['desktop', 'mobile'], themes: ['light', 'dark'], dpr: 1, jobs: 4, list: false, clean: true };
  const need = (i, n) => { if (argv[i + 1] == null) { console.error(`${n} 값이 없습니다`); process.exit(2); } return argv[i + 1]; };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === '--root') a.root = path.resolve(need(i++, k));
    else if (k === '--out') a.out = path.resolve(need(i++, k));
    else if (k === '--only') a.only = need(i++, k).split(',').map(s => s.trim()).filter(Boolean);
    else if (k === '--mobile') a.devices = ['mobile'];
    else if (k === '--desktop') a.devices = ['desktop'];
    else if (k === '--theme') { a.themes = [need(i++, k)]; if (!['light', 'dark'].includes(a.themes[0])) { console.error('--theme 은 light 또는 dark'); process.exit(2); } }
    else if (k === '--dpr') a.dpr = Number(need(i++, k)) || 1;
    else if (k === '--jobs') a.jobs = Math.max(1, Number(need(i++, k)) || 1);
    else if (k === '--keep') a.clean = false;
    else if (k === '--list') a.list = true;
    else if (k === '-h' || k === '--help') { console.log(process.argv[1] + ': 머리말의 주석을 보세요'); process.exit(0); }
    else { console.error(`모르는 옵션: ${k}`); process.exit(2); }
  }
  return a;
}

const args = parseArgs(process.argv.slice(2));
if (args.list) { console.log(SHOT_NAMES.join('\n')); process.exit(0); }
if (!existsSync(path.join(args.root, 'index.html'))) { console.error(`index.html 이 없습니다: ${args.root}`); process.exit(2); }
const shots = args.only ? args.only.map(n => SHOTS.find(s => s.name === n) || (console.error(`모르는 캡처: ${n} (목록: ${SHOT_NAMES.join(', ')})`), process.exit(2))) : SHOTS;

await mkdir(args.out, { recursive: true });
if (args.clean) { // 이전 결과가 섞여 diff 를 흐리지 않게, 이번에 찍을 이름만 지운다
  for (const f of await readdir(args.out)) if (f.endsWith('.png') && SHOT_NAMES.includes(f.split('.')[0])) await rm(path.join(args.out, f));
}

const server = await startServer({ root: args.root });
const browser = await launchChromium();
const jobs = [];
for (const device of args.devices) for (const theme of args.themes) for (const s of shots) jobs.push({ device, theme, shot: s });

const results = [];
let next = 0;
async function worker() {
  while (next < jobs.length) {
    const { device, theme, shot } = jobs[next++];
    const file = `${shot.name}.${device}.${theme}.png`;
    const t0 = Date.now();
    let app;
    try {
      app = await openApp(browser, { baseURL: server.url, device, colorScheme: theme, dpr: args.dpr });
      await shot.run(app.page, app);
      await neutralize(app.page);
      await app.page.screenshot({ path: path.join(args.out, file), fullPage: shot.full, animations: 'disabled', caret: 'hide' });
      results.push({ file, ok: true, ms: Date.now() - t0, errors: app.errors, blocked: app.mock.blocked });
      console.log(`ok   ${file}${app.errors.length ? `  (페이지 오류 ${app.errors.length})` : ''}`);
    } catch (err) {
      results.push({ file, ok: false, error: String(err?.message || err).split('\n')[0] });
      console.error(`FAIL ${file}: ${String(err?.message || err).split('\n').slice(0, 3).join(' | ')}`);
    } finally {
      await app?.close();
    }
  }
}
await Promise.all(Array.from({ length: Math.min(args.jobs, jobs.length) }, worker));
await browser.close();
await server.close();

const bad = results.filter(r => !r.ok);
const pageErrors = results.filter(r => r.ok && r.errors.length);
console.log(`\n${results.length - bad.length}/${results.length} 장 → ${args.out}`);
if (pageErrors.length) { console.log('페이지 오류가 있었습니다:'); for (const r of pageErrors) console.log(` ${r.file}\n   ${r.errors[0].split('\n')[0]}`); }
const leaked = [...new Set(results.flatMap(r => r.blocked || []))];
if (leaked.length) console.log(`막은 바깥 요청: ${leaked.join(', ')}`);
process.exit(bad.length ? 1 : 0);
