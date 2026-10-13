import { defineConfig } from '@playwright/test';

// 앱 폴더는 HS_ROOT (기본: 저장소 루트). 정적 서버는 워커마다 e2e/harness.mjs 가 띄운다.
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.mjs',
  timeout: 30_000,
  expect: { timeout: 7_000 },
  fullyParallel: true,
  workers: Number(process.env.PW_WORKERS) || 4,
  retries: 0,
  reporter: [['list']],
  outputDir: './out/test-results',
  use: { browserName: 'chromium', headless: true },
});
