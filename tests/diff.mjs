#!/usr/bin/env node
// 캡처 폴더 두 개를 픽셀 단위로 비교한다. 의존성 없음.
//
//   node tests/diff.mjs <폴더A> <폴더B> [--out <폴더>] [--threshold <퍼센트>] [--tolerance <0-255>]
//                       [--only a,b] [--allow-missing] [--json]
//   node tests/diff.mjs a.png b.png            (파일 하나씩)
//
//   --out        diff 이미지를 쓸 폴더 (기본: tests/out/diff). 다른 점이 있는 파일만 <이름>.diff.png 로 쓴다
//   --threshold  이 퍼센트를 넘게 다르면 종료 코드 1 (기본 0 = 한 픽셀이라도 다르면 실패)
//   --tolerance  채널 하나가 이만큼까지 다른 건 같은 것으로 본다 (기본 0)
//   --only       파일 이름에 이 문자열이 들어 있는 것만 (쉼표로 여러 개)
// 크기가 다르거나 한쪽에만 있는 파일은 실패로 센다 (--allow-missing 이면 한쪽에만 있는 것은 넘어간다).
import path from 'node:path';
import { readdir, readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { decodePNG, encodePNG } from './lib/png.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const pos = [];
const o = { out: path.join(HERE, 'out', 'diff'), threshold: 0, tolerance: 0, only: null, allowMissing: false, json: false };
for (let i = 0; i < argv.length; i++) {
  const k = argv[i];
  const val = () => { if (argv[i + 1] == null) { console.error(`${k} 값이 없습니다`); process.exit(2); } return argv[++i]; };
  if (k === '--out') o.out = path.resolve(val());
  else if (k === '--threshold') o.threshold = Number(val());
  else if (k === '--tolerance') o.tolerance = Number(val());
  else if (k === '--only') o.only = val().split(',').map(s => s.trim()).filter(Boolean);
  else if (k === '--allow-missing') o.allowMissing = true;
  else if (k === '--json') o.json = true;
  else if (k === '-h' || k === '--help') { console.log('머리말의 주석을 보세요'); process.exit(0); }
  else if (k.startsWith('--')) { console.error(`모르는 옵션: ${k}`); process.exit(2); }
  else pos.push(k);
}
if (pos.length !== 2 || !(o.threshold >= 0) || !(o.tolerance >= 0)) { console.error('사용법: node tests/diff.mjs <폴더A> <폴더B> [--threshold 0.01] [--tolerance 0] [--out dir]'); process.exit(2); }

const [A, B] = pos.map(p => path.resolve(p));
const isDir = async p => (await stat(p).catch(() => null))?.isDirectory();
const single = !(await isDir(A)) && !(await isDir(B));
const listPng = async d => (await readdir(d)).filter(f => f.toLowerCase().endsWith('.png')).sort();

let names;
let dirA = A, dirB = B;
if (single) { dirA = path.dirname(A); dirB = path.dirname(B); names = [[path.basename(A), path.basename(B)]]; }
else {
  const [la, lb] = await Promise.all([listPng(A), listPng(B)]);
  names = [...new Set([...la, ...lb])].sort().map(n => [n, n]);
}
if (o.only) names = names.filter(([n]) => o.only.some(s => n.includes(s)));
if (!names.length) { console.error('비교할 PNG 가 없습니다'); process.exit(2); }

function compare(a, b) {
  const w = Math.min(a.width, b.width), h = Math.min(a.height, b.height);
  const W = Math.max(a.width, b.width), H = Math.max(a.height, b.height);
  const diff = new Uint8Array(W * H * 4);
  let n = 0, x0 = W, y0 = H, x1 = -1, y1 = -1;
  const tol = o.tolerance;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    const inA = x < a.width && y < a.height, inB = x < b.width && y < b.height;
    let same = false;
    if (inA && inB) {
      const ia = (y * a.width + x) * 4, ib = (y * b.width + x) * 4;
      same = Math.abs(a.data[ia] - b.data[ib]) <= tol && Math.abs(a.data[ia + 1] - b.data[ib + 1]) <= tol
        && Math.abs(a.data[ia + 2] - b.data[ib + 2]) <= tol && Math.abs(a.data[ia + 3] - b.data[ib + 3]) <= tol;
      // 같은 자리는 A 를 흐리게 깔아 위치를 알아보게 한다
      const g = Math.round((a.data[ia] * 0.3 + a.data[ia + 1] * 0.59 + a.data[ia + 2] * 0.11) * 0.25 + 191);
      diff[i] = diff[i + 1] = diff[i + 2] = g; diff[i + 3] = 255;
    }
    if (!same) {
      n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      diff[i] = 255; diff[i + 1] = inA && inB ? 0 : 160; diff[i + 2] = inA && inB ? 60 : 0; diff[i + 3] = 255;
    }
  }
  return { n, total: W * H, pct: (n / (W * H)) * 100, bbox: n ? { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 } : null, diff, W, H, sizeA: `${a.width}x${a.height}`, sizeB: `${b.width}x${b.height}` };
}

const rows = [];
for (const [na, nb] of names) {
  const pa = path.join(dirA, na), pb = path.join(dirB, nb);
  const [ba, bb] = await Promise.all([readFile(pa).catch(() => null), readFile(pb).catch(() => null)]);
  const row = { file: na === nb ? na : `${na} ~ ${nb}`, status: 'ok', pct: 0 };
  if (!ba || !bb) {
    row.status = o.allowMissing ? 'skip' : 'missing';
    row.note = !ba ? 'A 에 없음' : 'B 에 없음';
  } else {
    try {
      const r = compare(decodePNG(ba), decodePNG(bb));
      row.pct = r.pct; row.px = r.n; row.bbox = r.bbox;
      if (r.sizeA !== r.sizeB) { row.status = 'size'; row.note = `크기 ${r.sizeA} ≠ ${r.sizeB}`; }
      else if (r.pct > o.threshold) row.status = 'diff';
      else if (r.n) row.status = 'under'; // 있지만 허용 범위
      if (r.n) {
        await mkdir(o.out, { recursive: true });
        row.image = path.join(o.out, `${na.replace(/\.png$/i, '')}.diff.png`);
        await writeFile(row.image, encodePNG({ width: r.W, height: r.H, data: r.diff }));
      }
    } catch (err) { row.status = 'error'; row.note = String(err?.message || err); }
  }
  rows.push(row);
}

const failing = rows.filter(r => ['diff', 'size', 'missing', 'error'].includes(r.status));
if (o.json) console.log(JSON.stringify({ threshold: o.threshold, tolerance: o.tolerance, failing: failing.length, rows }, null, 2));
else {
  const w = Math.max(...rows.map(r => r.file.length));
  for (const r of rows) {
    const mark = { ok: 'OK   ', under: 'ok~  ', skip: 'skip ', diff: 'DIFF ', size: 'SIZE ', missing: 'MISS ', error: 'ERR  ' }[r.status];
    const extra = r.note ? `  ${r.note}` : r.bbox ? `  ${r.px}px  영역 x${r.bbox.x} y${r.bbox.y} ${r.bbox.w}x${r.bbox.h}  → ${path.relative(process.cwd(), r.image)}` : '';
    console.log(`${mark}${r.file.padEnd(w)}  ${r.pct.toFixed(4).padStart(8)}%${extra}`);
  }
  const max = Math.max(0, ...rows.map(r => r.pct));
  console.log(`\n${rows.length}개 비교 · 다름 ${rows.filter(r => r.px).length} · 실패 ${failing.length} · 최대 ${max.toFixed(4)}% (허용 ${o.threshold}%, 채널 오차 ${o.tolerance})`);
}
process.exit(failing.length ? 1 : 0);
