// Playwright 를 불러온다: tests/node_modules 의 것을 먼저, 없으면 전역 설치본.
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

let cached;
export async function loadPlaywright() {
  if (cached) return cached;
  try { cached = await import('playwright'); return cached; } catch { /* 전역으로 */ }
  const root = execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim();
  const req = createRequire(path.join(root, 'noop.js'));
  cached = req('playwright');
  return cached;
}

export async function launchChromium(opts = {}) {
  const { chromium } = await loadPlaywright();
  return chromium.launch({ headless: true, ...opts });
}
