// ============================================================
// TEST MÀN THỐNG KÊ — Node built-in only (node:fs, node:vm, node:assert)
// Chạy:  node tests/stats.test.mjs
//
// NGUYÊN TẮC: KHÔNG chép công thức vào test. Test nạp và chạy CHÍNH code đang chạy thật:
//   • pwa/Code.gs      → chạy trong vm, Sheet giả là mảng trong RAM (không đụng Sheet thật)
//   • pwa/index.html   → lấy nguyên khối <script>, chạy trong vm với DOM giả
//   • fetch giả nối frontend → backend, nên đường đi y hệt app thật (kể cả cache localStorage).
// Sửa công thức trong production mà quên sửa ý nghĩa → test này phải đỏ.
// ============================================================
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const GAS_SRC  = readFileSync(join(ROOT, 'pwa', 'Code.gs'), 'utf8');
const HTML_SRC = readFileSync(join(ROOT, 'pwa', 'index.html'), 'utf8');
const APP_JS   = (() => {
  const m = HTML_SRC.match(/<script>([\s\S]*?)<\/script>/);
  if (!m) throw new Error('Không tìm thấy khối <script> chính trong index.html');
  return m[1];
})();

// ============ ĐẾM ĐIỂM ============
let pass = 0; const fails = [];
function check(name, cond, got) {
  if (cond) { pass++; return true; }
  fails.push(name + (got !== undefined ? `  → thực tế: ${JSON.stringify(got)}` : ''));
  return false;
}
function eq(name, actual, expect) { return check(name + ` = ${JSON.stringify(expect)}`, JSON.stringify(actual) === JSON.stringify(expect), actual); }

// ============ SHEET GIẢ + BACKEND THẬT ============
// row: [Ngày, Tên, Phân loại, Hạng mục, Chi tiết, Số tiền, Đã thu, Ngày thu]
const row = (date, cat, sub, amount, opt = {}) =>
  [date, opt.name || 'Khoa', cat, sub, opt.detail || '', amount, opt.collected === true, opt.collectedDate || ''];

function makeBackend(rows) {
  const sheet = {
    getLastRow: () => rows.length + 1,                     // +1 vì dòng 1 là header
    getRange: (r, c, nr, nc) => ({
      getValues: () => rows.slice(r - 2, r - 2 + nr).map(x => x.slice(c - 1, c - 1 + nc)),
      getValue:  () => rows[r - 2][c - 1]
    })
  };
  const out = (t) => ({ __text: t, setMimeType: () => out(t) });
  const ctx = vm.createContext({
    SpreadsheetApp: { openById: () => ({ getSheetByName: (n) => (n === 'to_nhap_lieu' ? sheet : null) }) },
    ContentService: { createTextOutput: out, MimeType: { JSON: 'application/json' } },
    Utilities:      { formatDate: (d) => d },
    LockService:    { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    console
  });
  vm.runInContext(GAS_SRC, ctx);
  return function call(params) {
    ctx.__e = { parameter: Object.assign({ token: 'chi_tieu_app_secret_2024' }, params) };
    return JSON.parse(vm.runInContext('doGet(__e)', ctx).__text);
  };
}

// ============ DOM GIẢ + FRONTEND THẬT ============
function makeApp(backend) {
  const els = new Map();
  const mkEl = (id) => ({
    id, innerHTML: '', textContent: '', value: '', className: '', disabled: false,
    style: {}, dataset: {}, children: [], _timer: null,
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    appendChild(c) { this.children.push(c); return c; },
    removeChild() {}, remove() {}, addEventListener() {}, removeEventListener() {},
    setAttribute() {}, getAttribute: () => null, insertAdjacentHTML() {},
    focus() {}, blur() {}, click() {}, scrollIntoView() {},
    querySelector: () => null, querySelectorAll: () => [], closest: () => null
  });
  const document = {
    getElementById(id) { if (!els.has(id)) els.set(id, mkEl(id)); return els.get(id); },
    createElement: (tag) => mkEl('<' + tag + '>'),
    querySelector: () => null, querySelectorAll: () => [], addEventListener() {},
    body: mkEl('body'), documentElement: mkEl('html'), fonts: { ready: Promise.resolve() }
  };
  const store = new Map();
  const localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear()
  };
  const net = { offline: false, calls: [] };
  const ctx = vm.createContext({
    document, localStorage, console, URL, setTimeout, clearTimeout, setInterval, clearInterval,
    navigator: {}, location: { href: 'https://app.local/' }, alert() {}, confirm: () => true,
    fetch: async (u) => {
      const url = new URL(u);
      const params = {}; url.searchParams.forEach((v, k) => (params[k] = v));
      net.calls.push(params);
      if (net.offline) throw new Error('offline');
      const json = backend(params);
      return { ok: true, status: 200, json: async () => json };
    }
  });
  ctx.window = ctx;
  vm.runInContext(APP_JS, ctx);
  vm.runInContext("S.url = 'https://fake.local/exec'", ctx);
  const run = (code, args) => { ctx.__in = args || {}; return vm.runInContext(code, ctx); };
  return {
    ctx, els, store, net, run,
    html: () => document.getElementById('stats-content').innerHTML,
    render(d, month, year, debts, prev, rows) {
      run('renderStats(__in.d, __in.m, __in.y, __in.debts, __in.prev, __in.rows)',
          { d, m: month, y: year, debts: debts || [], prev: prev || null, rows: rows || [] });
      return this.html();
    },
    async loadStats(year, month) {
      document.getElementById('stats-year').value  = year;
      document.getElementById('stats-month').value = month;
      try { await run('loadStats()'); } catch (e) { /* loadStats tự nuốt, giữ để test đọc màn */ }
      return this.html();
    }
  };
}

// ============ ĐỌC LẠI MÀN (parse HTML mà production vừa vẽ) ============
const num = (s) => parseInt(String(s).replace(/\./g, ''), 10);
function blocks(html) {
  const iDebt = html.indexOf('<p class="text-white font-semibold">Công nợ cần thu</p>');
  const iCa   = html.indexOf('<p class="text-white font-semibold">Chi tiêu cá nhân</p>');
  const iCm   = html.indexOf('<p class="text-white font-semibold">Cho mượn / Ứng</p>');
  const cut = (from, ...after) => {
    if (from < 0) return '';
    const next = after.filter(x => x > from).sort((a, b) => a - b)[0];
    return html.slice(from, next === undefined ? html.length : next);
  };
  return { debt: cut(iDebt, iCa, iCm), caNhan: cut(iCa, iCm), choMuon: cut(iCm) };
}
function cats(blockHtml) {
  return blockHtml.split('<div class="stat-cat">').slice(1).map(b => ({
    name:   (b.match(/class="text-gray-200 text-sm truncate">([^<]*)</) || [])[1],
    count:  Number((b.match(/font-size:11px">·(\d+)</) || [])[1]),
    money:  num((b.match(/flex-shrink-0">([^<]*?)<span class="text-gray-500"/) || [])[1] || '0'),
    badge:  (b.match(/<span class="text-gray-500" style="font-size:11px[^>]*>([^<]*)<\/span>/) || [])[1],
    width:  Number((b.match(/class="prog-fill[^"]*" style="width:([\d.]+)%/) || [])[1]),
    detail: (b.match(/<span style="color:#[0-9A-Fa-f]{6};font-weight:700;font-size:12px;flex-shrink:0">([^<]*)</g) || [])
              .map(s => { const m = s.match(/>([^<]*)<$/)[1]; return (m[0] === '−' ? -1 : 1) * num(m.replace(/^[+−]/, '')); })
  }));
}
const headerMoney = (blockHtml) => num((blockHtml.match(/font-bold text-sm">([\d.]+)<\/span>/) || [])[1] || '0');
const savePct = (html) => (html.match(/w-8 text-right">(\d+)%<\/span>/) || [])[1];

// ============ FIXTURE ============
const F_KY = [                                            // kỳ mẫu 08/2026 — dùng cho tiêu chí 1
  row('01/08/2026', 'Thu nhập', 'Lương',   10000000),
  row('02/08/2026', 'Cá nhân',  'Tiền ăn',  2000000),
  row('03/08/2026', 'Cá nhân',  'Nhà',      3000000),
  row('04/08/2026', 'Cho mượn/ Ứng', 'Cty',  1500000),
  row('05/08/2026', 'Cho mượn/ Ứng', 'Cty',  -500000),
  row('06/08/2026', 'Cho mượn/ Ứng', 'Marketing', 2000000, { collected: true })
];
const period = (be, month, year) => ({
  d: be({ action: 'getStats', month, year }),
  rows: be({ action: 'getRows', month, year }).rows
});
const allYears = (be) => ({
  d: be({ action: 'getStats', scope: 'all' }),
  rows: be({ action: 'getRows', scope: 'all' }).rows
});

console.log('=== TEST MÀN THỐNG KÊ (chạy logic production) ===\n');

// ============ 1. MẪU SỐ LÀ THU NHẬP ============
{
  const be = makeBackend(F_KY), app = makeApp(be);
  const { d, rows } = period(be, '08', '2026');
  const b = blocks(app.render(d, '08', '2026', [], null, rows));
  const ca = cats(b.caNhan), cm = cats(b.choMuon);
  eq('1. Tiền ăn',   ca.find(x => x.name === 'Tiền ăn').badge,   '20%');
  eq('1. Nhà',       ca.find(x => x.name === 'Nhà').badge,       '30%');
  eq('1. Cty',       cm.find(x => x.name === 'Cty').badge,       '10%');
  eq('1. Marketing', cm.find(x => x.name === 'Marketing').badge, '20%');
  eq('1. tiền Cty cộng có dấu (1.5tr − 0.5tr)', cm.find(x => x.name === 'Cty').money, 1000000);
  const badges = [...ca, ...cm].map(x => x.badge);
  check('1. cách cũ 40/60 và 33/67 KHÔNG còn', !badges.some(x => ['40%', '60%', '33%', '67%'].includes(x)), badges);

  // đổi riêng cờ Đã thu của Marketing → bốn số trên không đổi
  const F2 = F_KY.map(r => r.slice()); F2[5][6] = false;
  const be2 = makeBackend(F2), app2 = makeApp(be2);
  const p2 = period(be2, '08', '2026');
  const b2 = blocks(app2.render(p2.d, '08', '2026', [], null, p2.rows));
  eq('1. bỏ cờ Đã thu → 4 badge y nguyên',
     [...cats(b2.caNhan), ...cats(b2.choMuon)].map(x => x.name + ':' + x.badge),
     [...ca, ...cm].map(x => x.name + ':' + x.badge));
}

// ============ 2. DƯỚI 1% ============
{
  const be = makeBackend([
    row('01/08/2026', 'Thu nhập', 'Lương', 10000000),
    row('02/08/2026', 'Cá nhân',  'Tiền ăn',  50000)
  ]);
  const app = makeApp(be), { d, rows } = period(be, '08', '2026');
  const c = cats(blocks(app.render(d, '08', '2026', [], null, rows)).caNhan)[0];
  eq('2. 50.000/10.000.000 hiện <1% (không phải 1%)', c.badge, '&lt;1%');
}

// ============ 3. KHÔNG CÓ THU NHẬP ============
{
  const be = makeBackend([row('02/08/2026', 'Cá nhân', 'Tiền ăn', 100000)]);
  const app = makeApp(be), { d, rows } = period(be, '08', '2026');
  const html = app.render(d, '08', '2026', [], null, rows);
  const c = cats(blocks(html).caNhan)[0];
  eq('3. tiền hạng mục vẫn hiện', c.money, 100000);
  eq('3. badge', c.badge, '—');
  eq('3. thanh rộng', c.width, 0);
  check('3. HTML không có NaN', !html.includes('NaN'), html.match(/.{0,25}NaN.{0,25}/));
  check('3. HTML không có Infinity', !html.includes('Infinity'));
}

// ============ 4. VƯỢT THU NHẬP ============
{
  const be = makeBackend([
    row('01/08/2026', 'Thu nhập', 'Lương', 10000000),
    row('02/08/2026', 'Cá nhân',  'Tiền ăn', 12000000)
  ]);
  const app = makeApp(be), { d, rows } = period(be, '08', '2026');
  const c = cats(blocks(app.render(d, '08', '2026', [], null, rows)).caNhan)[0];
  eq('4. badge vượt 100%', c.badge, '120%');
  check('4. thanh kẹp ≤ 100%', c.width <= 100, c.width);
}

// ============ 5. CẢ NĂM CỤ THỂ TRÊN 500 DÒNG (đang đúng — chống hồi quy) ============
{
  const big = [row('01/01/2025', 'Thu nhập', 'Lương', 90000000)];
  for (let i = 0; i < 501; i++) big.push(row('02/03/2025', 'Cá nhân', 'Tiền ăn', 1000));
  const be = makeBackend(big), app = makeApp(be);
  const res = be({ action: 'getRows', month: '', year: '2025' });
  eq('5. getRows cả năm 2025 trả đủ', res.rows.length, 502);
  const c = cats(blocks(app.render(be({ action: 'getStats', month: '', year: '2025' }), '', '2025', [], null, res.rows)).caNhan)[0];
  eq('5. tiền = tổng 501 dòng', c.money, 501000);
  eq('5. đếm ·N', c.count, 501);
}

// ============ 6. TẤT CẢ NĂM ============
{
  const many = [
    row('05/02/2024', 'Cá nhân', 'Legacy', 700000),            // dòng CŨ NHẤT
    row('06/02/2024', 'Thu nhập', 'Lương', 1000000),
    row('07/03/2025', 'Thu nhập', 'Lương', 2000000),
    row('08/04/2026', 'Thu nhập', 'Lương', 7000000)
  ];
  for (let i = 0; i < 520; i++) many.push(row('09/05/2026', 'Cá nhân', 'Tiền ăn', 1000));
  const be = makeBackend(many), app = makeApp(be);
  const { d, rows } = allYears(be);
  eq('6. totalIncome = tổng thu nhập cả 3 năm', d.totalIncome, 10000000);
  eq('6. getRows scope=all trả toàn bộ lịch sử', rows.length, many.length);
  const ca = cats(blocks(app.render(d, '', '', [], null, rows)).caNhan);
  const legacy = ca.find(x => x.name === 'Legacy');
  check('6. hạng mục Legacy ở dòng cũ nhất vẫn hiện', !!legacy, ca.map(x => x.name));
  if (legacy) { eq('6. tiền Legacy', legacy.money, 700000); eq('6. ·N Legacy', legacy.count, 1); }
  eq('6. Legacy = 7% của 10tr', legacy && legacy.badge, '7%');

  // đối chứng: cách CŨ (limit=500, không cờ scope) đánh rơi đúng dòng cũ nhất
  const cu = be({ action: 'getRows', limit: '500' }).rows;
  eq('6. [đối chứng] cách cũ chỉ lấy 500 dòng', cu.length, 500);
  check('6. [đối chứng] cách cũ NUỐT MẤT Legacy', !cu.some(r => r.subcategory === 'Legacy'));
  // đối chứng: getStats không cờ → rơi về năm hiện tại (hợp đồng cũ, giữ cho caller cũ)
  const nay = be({ action: 'getStats', month: '', year: '' });
  check('6. [đối chứng] getStats không cờ vẫn mặc định năm hiện tại',
        nay.year === String(new Date().getFullYear()), nay.year);
}

// ============ 7. NHẤT QUÁN + CACHE ============
{
  const be = makeBackend(F_KY), app = makeApp(be);
  const { d, rows } = period(be, '08', '2026');
  const b = blocks(app.render(d, '08', '2026', [], null, rows));
  for (const [ten, blk] of [['Cá nhân', b.caNhan], ['Cho mượn', b.choMuon]]) {
    const list = cats(blk);
    list.forEach(c => eq(`7. ${ten}/${c.name}: tiền = tổng dòng detail`, c.money, c.detail.reduce((s, x) => s + x, 0)));
    eq(`7. ${ten}: header = tổng hạng mục đang hiện`, headerMoney(blk), list.reduce((s, c) => s + c.money, 0));
    list.forEach(c => eq(`7. ${ten}/${c.name}: ·N = số dòng detail`, c.count, c.detail.length));
  }

  // đi qua loadStats thật: lần 1 mạng sống (ghi cache) → lần 2 cắt mạng (đọc cache) → phải y hệt
  const app2 = makeApp(be);
  const fresh = await app2.loadStats('2026', '08');
  app2.net.offline = true;
  const cached = await app2.loadStats('2026', '08');
  eq('7. cached render == fresh render', cached === fresh, true);
  // (getStats 07/2026 là lệnh so-tháng-trước, đúng theo thiết kế — không tính vào kỳ đang xem)
  const kyCalls = app2.net.calls.filter(c => c.action === 'getRows' || (c.action === 'getStats' && c.month === '08'));
  check('7. loadStats gửi đúng kỳ cho CẢ getStats và getRows',
        kyCalls.length >= 2 && kyCalls.every(c => c.month === '08' && c.year === '2026' && !c.limit),
        app2.net.calls.map(c => c.action + ':' + c.month + '/' + c.year));

  // "Tất cả năm" phải xin cờ scope=all cho CẢ HAI lệnh, không dùng year='' để ngầm đoán
  const app3 = makeApp(be);
  await app3.loadStats('', '');
  const scoped = app3.net.calls.filter(c => ['getStats', 'getRows'].includes(c.action));
  check('7. Tất cả năm → cả getStats lẫn getRows đều mang scope=all',
        scoped.length >= 2 && scoped.every(c => c.scope === 'all' && !c.limit), scoped);

  // thiếu một vế trong cache (rows rớt vì hết quota) → KHÔNG được vẽ nửa đúng nửa thiếu
  const app4 = makeApp(be);
  await app4.loadStats('2026', '08');
  [...app4.store.keys()].filter(k => k.includes('getRows')).forEach(k => app4.store.delete(k));
  app4.net.offline = true;
  const half = await app4.loadStats('2026', '08');
  check('7. mất rows → báo lỗi, KHÔNG vẽ thẻ tổng trơ trọi',
        half.includes('Không tải được thống kê') && !half.includes('Chi tiêu cá nhân'), half.slice(0, 120));
}

// ============ 8. KHÔNG HỒI QUY: CÔNG NỢ + TIẾT KIỆM ============
{
  const be = makeBackend(F_KY), app = makeApp(be);
  const { d, rows } = period(be, '08', '2026');
  const debts = [{ name: 'A. Hải', balance: 700000 }, { name: 'C. Kỳ', balance: 300000 }];
  const html = app.render(d, '08', '2026', debts, null, rows);
  const badgesNo = (html.match(/\+([\d.]+)<span class="text-gray-500"[^>]*>(\d+%)</g) || [])
                     .map(s => s.match(/>(\d+%)<$/)[1]);
  eq('8. công nợ vẫn 70% / 30% (chia trên tổng nợ)', badgesNo, ['70%', '30%']);
  // Tiết kiệm giữ NGUYÊN công thức cũ: chi = byPerson[OWNER] = mọi dòng của chủ app trừ Thu nhập,
  // tức gồm cả tiền cho mượn (5tr cá nhân + 3tr cho mượn = 8tr) → (10tr − 8tr)/10tr = 20%.
  eq('8. Tiết kiệm không đổi công thức', savePct(html), '20');
  // so tháng trước giữ nguyên công thức: thu nhập 10tr vs 8tr = ↑25%
  const prev = { totalIncome: 8000000, byPerson: { Khoa: 4000000 } };
  const h2 = app.render(d, '08', '2026', debts, prev, rows);
  check('8. so tháng trước: thu nhập ↑25%', h2.includes('↑25% so tháng trước'),
        (h2.match(/[↑↓]\d+% so tháng trước/g) || []));
}

// ============ KẾT ============
console.log(`ĐẠT ${pass} · TRƯỢT ${fails.length}`);
if (fails.length) { console.log('\nTRƯỢT:'); fails.forEach(f => console.log(' ✗ ' + f)); process.exit(1); }
console.log('TẤT CẢ ĐẠT');
