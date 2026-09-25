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

function makeBackend(rows, cfg = []) {
  const sheet = {
    getLastRow: () => rows.length + 1,                     // +1 vì dòng 1 là header
    getRange: (r, c, nr, nc) => ({
      getValues: () => rows.slice(r - 2, r - 2 + nr).map(x => x.slice(c - 1, c - 1 + nc)),
      getValue:  () => (r === 1 ? 'tiêu đề' : rows[r - 2][c - 1])   // dòng 1 = header (ensureSetup đọc)
    })
  };
  // Các tab phụ (tên người, hạng mục, cấu hình) có sẵn nhưng trống → ensureSetup không phải tạo mới
  const emptyTab = { getLastRow: () => 1, getRange: () => ({ getValues: () => [], getValue: () => 'tiêu đề' }) };
  // Tab cau_hinh: cfg = [[khóa, giá trị], ...] (số dư ban đầu, ngày bắt đầu)
  const cfgTab = { getLastRow: () => cfg.length + 1,
                   getRange: (r, c, nr, nc) => ({ getValues: () => cfg.slice(r - 2, r - 2 + nr).map(x => x.slice(c - 1, c - 1 + nc)) }) };
  const out = (t) => ({ __text: t, setMimeType: () => out(t) });
  const ctx = vm.createContext({
    SpreadsheetApp: { openById: () => ({ getSheetByName: (n) => (n === 'to_nhap_lieu' ? sheet : n === 'cau_hinh' ? cfgTab : emptyTab) }) },
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
      run("S.screen = 'stats'");   // như go('stats') — đồng bộ xong mới biết vẽ lại màn nào
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

// ============ 7. NHẤT QUÁN + SỔ TRÊN MÁY ============
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

  // Màn Thống kê vẽ từ sổ trên máy phải Y HỆT màn vẽ từ số Google tính (cùng kỳ, cùng dữ liệu)
  const many = F_KY.concat([row('10/07/2026', 'Thu nhập', 'Lương', 8000000), row('11/07/2026', 'Cá nhân', 'Tiền ăn', 900000),
                            row('05/02/2024', 'Cá nhân', 'Legacy', 700000)]);
  const be2 = makeBackend(many);
  for (const [y, m] of [['2026', '08'], ['2026', ''], ['', '']]) {
    const a = makeApp(be2);
    const local = await a.loadStats(y, m);
    const all = !y;
    const ref = a.render(be2(all ? { action: 'getStats', scope: 'all' } : { action: 'getStats', month: m, year: y }), m, y,
                         be2({ action: 'getDebts' }).debts,
                         m ? be2({ action: 'getStats', month: '07', year: '2026' }) : null,
                         be2(all ? { action: 'getRows', scope: 'all' } : { action: 'getRows', month: m, year: y }).rows);
    eq(`7. màn Thống kê ${m || '--'}/${y || 'tất cả'}: sổ trên máy == số Google`, local === ref, true);
    eq(`7. ${m || '--'}/${y || 'tất cả'}: chỉ 1 lệnh đọc cả sổ (getRows scope=all)`,
       a.net.calls.map(c => c.action + ':' + (c.scope || '')), ['getRows:all']);
  }

  // Mở lại app KHÔNG có mạng: sổ đã lưu trên máy vẽ ra y hệt, không phải đợi Google
  const app2 = makeApp(be2);
  const fresh = await app2.loadStats('2026', '08');
  const app3 = makeApp(be2);
  app2.store.forEach((v, k) => app3.store.set(k, v));
  app3.run('S.book = bookLoad()');
  app3.net.offline = true;
  eq('7. mở lại offline: vẽ từ sổ đã lưu == bản vừa tải', await app3.loadStats('2026', '08'), fresh);
  eq('7. vừa đồng bộ < 30s: chuyển màn KHÔNG hỏi lại Google', app3.net.calls.length, 0);

  // Sổ lưu từ lâu + mất mạng → vẫn vẽ số cũ, và dòng "cập nhật" nói thật là chưa đồng bộ được
  app3.run('S.book.at = Date.now() - 3600e3');
  const stale = await app3.loadStats('2026', '08');
  eq('7. sổ cũ + mất mạng: vẫn vẽ đủ màn', stale, fresh);
  check('7. sổ cũ + mất mạng: báo "Chưa đồng bộ được"', app3.els.get('debt-updated').textContent.includes('Chưa đồng bộ'),
        app3.els.get('debt-updated').textContent);

  // Chưa từng có sổ + mất mạng → báo lỗi, KHÔNG vẽ thẻ tổng trơ trọi
  const app4 = makeApp(be2);
  app4.net.offline = true;
  const none = await app4.loadStats('2026', '08');
  check('7. chưa có sổ + mất mạng → báo lỗi, không vẽ nửa vời',
        none.includes('Không tải được thống kê') && !none.includes('Chi tiêu cá nhân'), none.slice(0, 120));
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

// ============ 9. LỆNH GỘP = ĐÚNG Y CÁC LỆNH LẺ ============
{
  const many = F_KY.concat([
    row('10/07/2026', 'Thu nhập', 'Lương', 8000000),
    row('11/07/2026', 'Cá nhân',  'Tiền ăn', 900000),
    row('12/12/2025', 'Cá nhân',  'Nhà', 3000000),
    row('03/01/2026', 'Cho mượn/ Ứng', 'Cty', 400000, { name: 'A. Hải', collected: true, collectedDate: '05/01/2026' })
  ]);
  const be = makeBackend(many);
  const strip = (o) => { const x = Object.assign({}, o); delete x.success; return x; };

  const h = be({ action: 'getHome', month: '08', year: '2026' });
  eq('9. getHome.rows == getRows(08/2026)', h.rows, be({ action: 'getRows', month: '08', year: '2026' }).rows);
  eq('9. getHome.balance == getBalance', h.balance, strip(be({ action: 'getBalance' })));

  const b = be({ action: 'getStatsBundle', month: '08', year: '2026' });
  eq('9. bundle.stats == getStats(08/2026)', b.stats, strip(be({ action: 'getStats', month: '08', year: '2026' })));
  const pv = strip(be({ action: 'getStats', month: '07', year: '2026' })); delete pv.scope;
  eq('9. bundle.prev == getStats tháng trước (07/2026)', b.prev, pv);
  eq('9. bundle.rows == getRows(08/2026)', b.rows, be({ action: 'getRows', month: '08', year: '2026' }).rows);
  eq('9. bundle.debts == getDebts', b.debts, strip(be({ action: 'getDebts' })));

  const j = be({ action: 'getStatsBundle', month: '01', year: '2026' });
  eq('9. tháng 01 → tháng trước là 12/2025', [j.prev.month, j.prev.year, j.prev.byCategory], ['12', '2025', { 'Nhà': 3000000 }]);

  const a = be({ action: 'getStatsBundle', scope: 'all' });
  eq('9. bundle scope=all.stats == getStats scope=all', a.stats, strip(be({ action: 'getStats', scope: 'all' })));
  eq('9. bundle scope=all.rows == getRows scope=all', a.rows, be({ action: 'getRows', scope: 'all' }).rows);
  eq('9. bundle scope=all không có tháng trước', a.prev, null);
}

// ============ 10. TRANG CHỦ VẼ TỪ SỔ TRÊN MÁY ============
{
  const now = new Date(), mm = String(now.getMonth() + 1).padStart(2, '0'), yy = String(now.getFullYear());
  const today = String(now.getDate()).padStart(2, '0') + '/' + mm + '/' + yy;
  const cfg = [['so_du_ban_dau', 2000000], ['tu_ngay', '01/01/2020']];
  const be = makeBackend([row('01/01/2019', 'Cá nhân', 'Cũ', 999999),   // trước ngày bắt đầu → không tính
                          row(today, 'Thu nhập', 'Lương', 5000000),
                          row(today, 'Cá nhân', 'Tiền ăn', 45000, { detail: 'phở' }),
                          row(today, 'Cho mượn/ Ứng', 'Cty', 300000, { name: 'A. Hải' })], cfg);

  const app = makeApp(be);
  app.run('initMonthTabs(); S.screen = "home"; applyConfig(__in)', be({ action: 'getConfig' }));
  await app.run('loadHome()');
  eq('10. trang chủ: 1 lệnh đọc cả sổ', app.net.calls.map(c => c.action + ':' + (c.scope || '')), ['getRows:all']);
  check('10. danh sách có khoản phở', app.els.get('tx-list').innerHTML.includes('phở'));
  const bal = be({ action: 'getBalance' }).balance;
  eq('10. số dư tính trên máy == getBalance của Google', app.els.get('card-total').textContent, (bal < 0 ? '-' : '') + app.run('fmt(__in)', bal));
  check('10. có dòng "Cập nhật HH:MM"', /Cập nhật \d{2}:\d{2}/.test(app.els.get('home-updated').textContent), app.els.get('home-updated').textContent);

  app.net.calls.length = 0;
  await app.run('loadHome()'); await app.run('loadDebts()');
  eq('10. qua lại màn trong 30s: không hỏi Google thêm lần nào', app.net.calls.length, 0);

  // Xóa trên máy phải y như Sheet: dòng bị xóa biến mất, các dòng dưới lùi số dòng
  const idx = app.run('S.book.rows.map(r => r.rowIndex)');
  app.run('bookDeleteRows(3, 1)');
  eq('10. bookDeleteRows(3,1): còn 3 dòng, số dòng dồn lên như Sheet',
     app.run('S.book.rows.map(r => r.rowIndex + ":" + r.subcategory)'), ['4:Cty', '3:Tiền ăn', '2:Cũ']);
  eq('10. [đối chứng] trước khi xóa có 4 dòng 5..2', idx, [5, 4, 3, 2]);
}

// ============ 11. LƯU NỀN: FORM ĐÓNG NGAY, LỖI THÌ BÁO RÕ, KHÔNG GHI TRÙNG ============
{
  const rows = [];
  const be = makeBackend(rows);
  const now = new Date();
  const today = String(now.getDate()).padStart(2, '0') + '/' + String(now.getMonth() + 1).padStart(2, '0') + '/' + now.getFullYear();
  // backend giả giữ lệnh ghi lại cho tới khi test thả ra → thấy được khoảnh khắc "đang lưu"
  let release, fail = false, writes = 0;
  const slow = (params) => {
    if (params.action !== 'addRow') return be(params);
    writes++;
    return new Promise((res) => { release = () => {
      if (fail) return res({ success: false, error: 'Mất mạng' });
      rows.push(row(today, 'Cá nhân', '', Number(params.amount), { detail: params.detail }));
      res({ success: true, rowIndex: rows.length + 1, subcategory: '' });
    }; });
  };
  const app = makeApp(be);
  // fetch giả mặc định gọi backend đồng bộ; thay bằng bản chờ được backend chậm
  app.ctx.fetch = async (u) => {
    const url = new URL(u); const params = {}; url.searchParams.forEach((v, k) => (params[k] = v));
    app.net.calls.push(params);
    const json = await slow(params);
    return { ok: true, status: 200, json: async () => json };
  };
  app.run("initMonthTabs(); OWNER='Khoa'; S.selectedPerson0='Khoa'; S.kind0='chi'; S.amts[0]='45000'; document.getElementById('dt0').value='bún bò'");
  const done = app.run('submit0()');
  await new Promise(r => setTimeout(r, 0));
  const list = () => app.els.get('tx-list').innerHTML;
  check('11. chưa đợi backend: khoản mới đã hiện "Đang lưu…"', list().includes('bún bò') && list().includes('Đang lưu'), list().slice(0, 200));
  eq('11. form đã reset ngay (số tiền về 0)', app.run('S.amts[0]'), '0');
  release(); await done; await new Promise(r => setTimeout(r, 0));
  check('11. xong: hết chữ "Đang lưu", khoản thật từ Sheet hiện ra', !list().includes('Đang lưu') && list().includes('bún bò'), list().slice(0, 200));
  eq('11. xong: Sheet có đúng 1 dòng', rows.length, 1);
  eq('11. xong: nút Hoàn tác biết dòng vừa ghi', app.run('S.lastRowIndex'), 2);

  fail = true;
  app.run("S.selectedPerson0='Khoa'; S.amts[0]='30000'; document.getElementById('dt0').value='trà đá'");
  const done2 = app.run('submit0()');
  await new Promise(r => setTimeout(r, 0));
  release(); await done2;
  eq('11. lỗi: lệnh ghi KHÔNG tự thử lại (chống ghi trùng)', writes, 2);
  const toast = app.els.get('toast').textContent;
  check('11. lỗi: báo rõ khoản nào chưa lưu', toast.includes('trà đá') && toast.includes('30.000') && toast.includes('Mất mạng'), toast);
  await new Promise(r => setTimeout(r, 0));
  check('11. lỗi: dòng "Đang lưu" biến mất, không để khoản ma', !list().includes('trà đá'), list().slice(0, 200));
}

// ============ 12. TÍNH TRÊN MÁY == GOOGLE TÍNH (lệch 1 đồng là đỏ) ============
{
  const strip = (o) => { const x = Object.assign({}, o); ['success', 'month', 'year', 'scope'].forEach(k => delete x[k]); return x; };
  const soSanh = (ten, data, cfg) => {
    const be = makeBackend(data, cfg), app = makeApp(be);
    const book = be({ action: 'getRows', scope: 'all' }).rows;
    const conf = be({ action: 'getConfig' });
    let lech = 0; const lan = [];
    const ky = [['', '']];
    new Set(data.map(r => r[0].slice(6, 10))).forEach(y => { ky.push(['', y]); for (let m = 1; m <= 12; m++) ky.push([String(m).padStart(2, '0'), y]); });
    for (const [m, y] of ky) {
      const scope = !y ? { scope: 'all' } : { month: m, year: y };
      const b = be(Object.assign({ action: 'getStatsBundle' }, scope));
      const L = (code) => app.run(code, { rows: book, m, y });
      if (JSON.stringify(L('localStats(__in.rows, __in.m, __in.y)')) !== JSON.stringify(strip(b.stats))) { lech++; lan.push('stats ' + m + '/' + y); }
      if (JSON.stringify(L('localRows(__in.rows, __in.m, __in.y)')) !== JSON.stringify(b.rows)) { lech++; lan.push('rows ' + m + '/' + y); }
    }
    eq(`12. ${ten}: thống kê + dòng mọi kỳ (${ky.length} kỳ) khớp Google`, lan, []);
    eq(`12. ${ten}: công nợ khớp getDebts`, app.run('localDebts(__in)', book), strip(be({ action: 'getDebts' })));
    eq(`12. ${ten}: số dư khớp getBalance`,
       app.run('localBalance(__in.rows, {startBalance: Number(__in.c.startBalance)||0, startDate: String(__in.c.startDate||"")})', { rows: book, c: conf }),
       strip(be({ action: 'getBalance' })));
  };

  soSanh('sổ mẫu', F_KY.concat([
    row('10/07/2026', 'Thu nhập', 'Lương', 8000000),
    row('12/12/2025', 'Cá nhân', 'Nhà', 3000000),
    row('03/01/2026', 'Cho mượn/ Ứng', 'Cty', 400000, { name: 'A. Hải', collected: true, collectedDate: '05/01/2026' }),
    row('04/01/2026', 'Cho mượn/ Ứng', '', -250000, { name: 'C. Kỳ' })
  ]), [['so_du_ban_dau', 1500000], ['tu_ngay', '01/01/2026']]);

  // Sổ ngẫu nhiên (hạt giống cố định → lần nào chạy cũng cùng dữ liệu): nhiều người, số âm, đã thu/chưa,
  // ngày thu trùng nhau, hạng mục rỗng — những chỗ dễ lệch thứ tự/dấu nhất.
  let seed = 20260925; const rnd = (n) => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; };
  const NGUOI = ['Khoa', 'A. Hải', 'C. Kỳ', 'Quan', 'Phi'], LOAI = ['Cá nhân', 'Cho mượn/ Ứng', 'Thu nhập'], HM = ['Tiền ăn', 'Nhà', 'Cty', '', 'Lương'];
  const rand = [];
  for (let i = 0; i < 400; i++) {
    const d = String(1 + rnd(28)).padStart(2, '0') + '/' + String(1 + rnd(12)).padStart(2, '0') + '/' + (2024 + rnd(3));
    const loai = LOAI[rnd(3)], thu = rnd(2) === 1;
    rand.push(row(d, loai, HM[rnd(5)], (rnd(5) === 0 ? -1 : 1) * 1000 * (1 + rnd(900)),
                  { name: NGUOI[rnd(5)], detail: 'k' + i, collected: thu, collectedDate: thu && rnd(3) ? '0' + (1 + rnd(9)) + '/0' + (1 + rnd(9)) + '/2026' : '' }));
  }
  soSanh('400 dòng ngẫu nhiên', rand, [['so_du_ban_dau', 777000], ['tu_ngay', '15/06/2025']]);
  soSanh('không cấu hình số dư', rand.slice(0, 50));
}

// ============ 13. ĐỒNG BỘ CŨ VỀ MUỘN KHÔNG ĐƯỢC ĐÈ BẢN MỚI ============
// Mở màn → lượt đồng bộ A chạy (chậm, mang sổ TRƯỚC khi ghi). Ghi xong → lượt B ép buộc, về nhanh với
// sổ SAU khi ghi. A về muộn nhất → nếu không chặn, khoản vừa ghi biến mất khỏi màn.
{
  const now = new Date();
  const today = String(now.getDate()).padStart(2, '0') + '/' + String(now.getMonth() + 1).padStart(2, '0') + '/' + now.getFullYear();
  const cu  = makeBackend([row(today, 'Cá nhân', 'Tiền ăn', 10000, { detail: 'cũ' })]);
  const moi = makeBackend([row(today, 'Cá nhân', 'Tiền ăn', 10000, { detail: 'cũ' }), row(today, 'Cá nhân', 'Tiền ăn', 20000, { detail: 'mới ghi' })]);
  const app = makeApp(cu);
  let thaA;
  let lan = 0;
  app.ctx.fetch = async (u) => {
    const url = new URL(u); const params = {}; url.searchParams.forEach((v, k) => (params[k] = v));
    lan++;
    const json = lan === 1 ? await new Promise(r => { thaA = () => r(cu(params)); }) : moi(params);
    return { ok: true, status: 200, json: async () => json };
  };
  app.run('initMonthTabs(); S.screen = "home"');
  const A = app.run('syncBook()');
  await new Promise(r => setTimeout(r, 0));
  await app.run('syncBook(true)');
  thaA(); await A;
  check('13. lượt cũ về muộn KHÔNG đè: sổ vẫn có khoản "mới ghi"',
        app.run('S.book.rows.some(r => r.detail === "mới ghi")') && app.els.get('tx-list').innerHTML.includes('mới ghi'),
        app.run('S.book.rows.map(r => r.detail)'));
}

// ============ KẾT ============
console.log(`ĐẠT ${pass} · TRƯỢT ${fails.length}`);
if (fails.length) { console.log('\nTRƯỢT:'); fails.forEach(f => console.log(' ✗ ' + f)); process.exit(1); }
console.log('TẤT CẢ ĐẠT');
