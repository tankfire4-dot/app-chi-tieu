// ============================================================
//  gen-snapshot.mjs — sinh pwa/snapshot.html (HTML tĩnh, đã render)
//  để Claude Design xem được giao diện mới nhất mà không cần chạy JS.
//
//  CHẠY:  node tools/gen-snapshot.mjs
//  (cần: npm install --no-save puppeteer-core  — chỉ 1 lần)
//
//  Cơ chế: mở Chrome headless → nạp index.html thật → render với
//  dữ liệu mẫu (logic trong pwa/_gen-snapshot.js) → đông cứng DOM.
// ============================================================
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import puppeteer from 'puppeteer-core';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PWA = join(ROOT, 'pwa');

const CHROME_CANDIDATES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
];
const chrome = CHROME_CANDIDATES.find(existsSync);
if (!chrome) { console.error('✗ Không tìm thấy Chrome/Edge'); process.exit(1); }

const genCode = readFileSync(join(PWA, '_gen-snapshot.js'), 'utf8');
const indexUrl = pathToFileURL(join(PWA, 'index.html')).href;

const browser = await puppeteer.launch({ executablePath: chrome, headless: 'new', args: ['--no-sandbox'] });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  // nuốt lỗi fetch backend (file:// không có mạng) — không sao, ta tự bơm data
  page.on('pageerror', () => {});
  await page.goto(indexUrl, { waitUntil: 'load' });
  await new Promise(r => setTimeout(r, 800));
  // populate dropdown thống kê cho đẹp (không bắt buộc)
  await page.evaluate(() => { try { if (typeof initStatsSelectors === 'function' && document.getElementById('stats-month')?.options.length === 0) initStatsSelectors(); } catch (e) {} });
  await page.addScriptTag({ content: genCode });
  const html = await page.evaluate(() => window.__buildSnapshot());
  writeFileSync(join(PWA, 'snapshot.html'), html, 'utf8');
  console.log('✓ Đã ghi pwa/snapshot.html (' + Math.round(html.length / 1024) + ' KB)');

  // Ảnh preview để xem nhanh (không commit, chỉ để xem)
  const shot = await browser.newPage();
  await shot.setViewport({ width: 1740, height: 980, deviceScaleFactor: 1 });
  await shot.goto(pathToFileURL(join(PWA, 'snapshot.html')).href, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 500));
  await shot.screenshot({ path: join(ROOT, 'snapshot-preview.png') });
  console.log('✓ Đã ghi snapshot-preview.png (xem nhanh)');
} finally {
  await browser.close();
}
