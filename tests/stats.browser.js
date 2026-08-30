// ============================================================
// TIÊU CHÍ 9 — ĐO MẮT THẬT: mở pwa/index.html bằng Chromium, vẽ màn Thống kê bằng chính
// renderStats của production rồi ĐO DOM ở 3 bề rộng điện thoại. Test Node không thấy được
// những thứ này: CSS thật, chữ xuống dòng, thanh tràn thẻ, chú thích đè chữ.
//
// KHÔNG cài gói mới — dùng playwright + Chromium đã có sẵn trên máy qua NODE_PATH.
// Chạy (Git Bash), từ projects/app-chi-tieu:
//   NODE_PATH="$(dirname "$(ls -d "$LOCALAPPDATA"/npm-cache/_npx/*/node_modules/playwright | head -1)")" node tests/stats.browser.js
// Ảnh ra tests/anh-qa/ (không commit — xem tests/.gitignore).
// ============================================================
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT = path.join(__dirname, 'anh-qa');
fs.mkdirSync(OUT, { recursive: true });
const PAGE = 'file:///' + path.join(__dirname, '..', 'pwa', 'index.html').split(path.sep).join('/');
const WIDTHS = [320, 393, 412];

let pass = 0; const fails = [];
const check = (name, cond, got) => {
  if (cond) pass++;
  else fails.push(name + (got !== undefined ? `  → ${JSON.stringify(got)}` : ''));
};

// Fixture cố ý khắc nghiệt: tên hạng mục dài, một hạng mục VƯỢT thu nhập (120%), một dưới 1%.
const D = {
  success: true, total: 12550000, totalIncome: 10000000,
  byPerson: { Khoa: 12550000 }, byCategory: {}
};
const ROWS = [
  { date: '02/08/2026', name: 'Khoa', category: 'Cá nhân', subcategory: 'Học tập/ Phát triển bản thân', detail: 'khóa học dài ngoằng để ép chữ xuống dòng', amount: 12000000 },
  { date: '03/08/2026', name: 'Khoa', category: 'Cá nhân', subcategory: 'Tiền ăn', amount: 500000 },
  { date: '04/08/2026', name: 'Khoa', category: 'Cá nhân', subcategory: 'Gym, thể thao, TPBS', amount: 50000 },
  { date: '05/08/2026', name: 'A. Hải', category: 'Cho mượn/ Ứng', subcategory: 'Cty', amount: 1500000 },
  { date: '06/08/2026', name: 'A. Hải', category: 'Cho mượn/ Ứng', subcategory: 'Cty', amount: -500000 }
];
const DEBTS = [{ name: 'A. Hải', balance: 700000 }, { name: 'C. Kỳ', balance: 300000 }];

(async () => {
  const browser = await chromium.launch();
  for (const w of WIDTHS) {
    const page = await browser.newPage({ viewport: { width: w, height: 780 }, deviceScaleFactor: 2 });
    const loi = [];
    page.on('pageerror', e => loi.push('pageerror: ' + e.message));
    page.on('console', m => { if (m.type() === 'error') loi.push(m.text()); });
    // Thay Apps Script bằng fixture NGAY TRONG TRANG, rồi để app tự chạy loadStats như thật —
    // vẽ tay bằng renderStats thì màn thật vẫn bị loadStats chạy sau đè lên (đã vấp).
    await page.addInitScript(({ d, rows, debts }) => {
      window.fetch = async (u) => {
        const a = new URL(u, location.href).searchParams.get('action');
        const data = a === 'getStats' ? d : a === 'getRows' ? { rows } : a === 'getDebts' ? { debts } : {};
        return { ok: true, status: 200, json: async () => Object.assign({ success: true }, data) };
      };
    }, { d: D, rows: ROWS, debts: DEBTS });
    await page.goto(PAGE);

    const m = await page.evaluate(async () => {
      // Vào thẳng màn Thống kê như sau khi đăng nhập, KHÔNG gọi enterApp (nó nạp config/đổi UI).
      document.getElementById('splash').style.display = 'none';
      const setup = document.getElementById('s-setup');
      setup.classList.add('hidden'); setup.classList.remove('active');
      document.getElementById('nav').classList.remove('hidden');
      S.url = 'https://fixture.local/exec';
      initStatsSelectors();
      document.getElementById('stats-year').value  = '2026';
      document.getElementById('stats-month').value = '08';
      go('stats');
      await loadStats();
      await document.fonts.ready;   // chưa xong font thì mọi phép đo bề rộng đều sai
      const box = el => { const r = el.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, w: r.width }; };
      const wrap = document.getElementById('stats-content');
      const cats = [...wrap.querySelectorAll('.stat-cat')].map(c => {
        const badge = c.querySelector('span[style*="min-width:33px"]');
        const bg = c.querySelector('.prog-bg'), fill = c.querySelector('.prog-fill');
        return {
          ten: c.querySelector('.text-gray-200').textContent,
          badge: badge.textContent, badgeBox: box(badge),
          money: box(badge.parentElement),
          bg: box(bg).w, fill: box(fill).w
        };
      });
      const notes = [...wrap.querySelectorAll('p')].filter(p => p.textContent.includes('% trên thu nhập'));
      return {
        cats,
        chuThich: notes.map(p => ({ text: p.textContent, box: box(p),
          duoiHeader: box(p).t >= box(p.previousElementSibling).b - 0.5,
          trenItem: box(p).b <= box(p.nextElementSibling).t + 0.5 })),
        trai: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        vuotPhai: [...wrap.querySelectorAll('*')].filter(el => el.getBoundingClientRect().right > window.innerWidth + 0.5).length,
        html: wrap.innerHTML
      };
    });

    const nhan = `${w}px`;
    check(`${nhan}: không có lỗi console`, loi.length === 0, loi);
    check(`${nhan}: trang không trượt ngang`, m.trai);
    check(`${nhan}: không phần tử nào tràn khỏi màn`, m.vuotPhai === 0, m.vuotPhai);
    check(`${nhan}: đủ 2 chú thích "% trên thu nhập kỳ đang xem"`, m.chuThich.length === 2, m.chuThich.map(c => c.text));
    check(`${nhan}: chú thích không đè chữ trên/dưới`, m.chuThich.every(c => c.duoiHeader && c.trenItem), m.chuThich);
    check(`${nhan}: badge vượt 100% hiện đúng`, m.cats.some(c => c.badge.trim() === '120%'), m.cats.map(c => c.badge));
    check(`${nhan}: badge <1% hiện đúng`, m.cats.some(c => c.badge.trim() === '<1%'), m.cats.map(c => c.badge));
    check(`${nhan}: thanh không tràn khỏi rãnh`, m.cats.every(c => c.fill <= c.bg + 0.5), m.cats.map(c => [c.ten, c.fill, c.bg]));
    // cột tiền/% thẳng hàng: mọi badge trong màn phải cùng mép phải
    const meps = m.cats.map(c => Math.round(c.badgeBox.r * 10) / 10);
    check(`${nhan}: cột % thẳng hàng (cùng mép phải)`, new Set(meps).size === 1, meps);
    check(`${nhan}: HTML sạch NaN/Infinity`, !/NaN|Infinity/.test(m.html));

    // .screen là position:fixed + overflow-y:auto → fullPage KHÔNG với tới phần cuộn bên dưới
    // (đã vấp: ảnh chỉ ra tới khối Công nợ). Chụp 2 nhịp: đầu màn, rồi cuộn xuống hai khối hạng mục.
    await page.screenshot({ path: path.join(OUT, `stats-${w}-tren.png`) });
    await page.evaluate(() => { document.getElementById('s-stats').scrollTop = 99999; });
    await page.waitForTimeout(150);
    await page.screenshot({ path: path.join(OUT, `stats-${w}-duoi.png`) });
    await page.close();
  }
  await browser.close();

  console.log(`ĐẠT ${pass} · TRƯỢT ${fails.length}   (ảnh: tests/anh-qa/stats-320|393|412.png)`);
  if (fails.length) { console.log('\nTRƯỢT:'); fails.forEach(f => console.log(' ✗ ' + f)); process.exit(1); }
  console.log('TẤT CẢ ĐẠT');
})();
