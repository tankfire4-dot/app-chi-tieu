// ============================================================
//  SNAPSHOT GENERATOR — đông cứng app thật thành HTML tĩnh
//  để Claude Design (không chạy JS) xem được giao diện mới nhất.
//
//  CÁCH DÙNG (Claude Code):
//   1. preview_start, mở index.html
//   2. preview_eval:  fetch('/_gen-snapshot.js').then(r=>r.text()).then(eval); '__loaded'
//   3. preview_eval:  __buildSnapshot()      → trả về chuỗi HTML
//   4. Ghi chuỗi đó vào pwa/snapshot.html, rồi deploy
//
//  File này KHÔNG được index.html nạp → không bao giờ chạy ở production.
// ============================================================
window.__buildSnapshot = function () {
  // ---- Dữ liệu mẫu (deterministic, không gọi backend) ----
  try { renderBalance({ balance: 4520000, pending: 870000 }); } catch (e) {}

  try {
    S.curMonth = 6; S.curYear = 2026;
    S.rows = [
      { date: '19/06/2026', name: 'Khoa',  category: 'Tiền ăn',           subcategory: 'Cơm trưa',  detail: 'Ăn trưa văn phòng', amount: 75000,   collected: false },
      { date: '19/06/2026', name: 'Khoa',  category: 'Thu nhập',          subcategory: 'Lương',     detail: 'Lương tháng 6',     amount: 15000000, collected: false },
      { date: '19/06/2026', name: 'Quan',  category: 'Cho mượn/ Ứng',     subcategory: 'Cơm nước',  detail: 'Ứng cơm nhóm',      amount: 450000,  collected: false },
      { date: '18/06/2026', name: 'Khoa',  category: 'Đi lại, đổ xăng',   subcategory: '',          detail: 'Đổ xăng',           amount: 90000,   collected: false },
      { date: '18/06/2026', name: 'Khoa',  category: 'Giải trí, cf, bạn bè', subcategory: '',       detail: 'Cà phê cuối tuần',  amount: 120000,  collected: false }
    ];
    renderRows();
  } catch (e) {}

  try {
    S.debts = [
      { name: 'Quan',   balance: 450000,  rows: [{ amount: 450000 }] },
      { name: 'Minh',   balance: 320000,  rows: [{ amount: 500000 }, { amount: -180000 }] },
      { name: 'A. Hải', balance: -200000, rows: [{ amount: -200000 }] }
    ];
    S.recentCollected = [
      { name: 'Phi', detail: 'Cà phê', date: '12/06', amount: 80000, collectedDate: '18/06' }
    ];
    renderDebts();
  } catch (e) {}

  try {
    renderStats(
      {
        byPerson:   { 'Khoa': 6230000 },
        byCategory: {
          'Tiền ăn': 2100000, 'Đi lại, đổ xăng': 850000,
          'Giải trí, cf, bạn bè': 1200000, 'Mua sắm, đồ dùng': 980000,
          'Cơm nước': 600000, 'Cty': 400000
        },
        totalIncome: 15000000
      },
      '06', '2026',
      S.debts,
      { totalIncome: 14000000, byPerson: { 'Khoa': 5800000 } }
    );
  } catch (e) {}

  try { switchTab(0); } catch (e) {}

  // ---- Dựng khung HTML tĩnh ----
  const FRAMES = [
    ['s-home',  '🏠 Trang chủ'],
    ['s-debts', '💰 Công nợ'],
    ['s-stats', '📊 Thống kê'],
    ['s-add',   '✏️ Ghi chi tiêu']
  ];

  const navEl = document.getElementById('nav');
  const frames = FRAMES.map(([id, label]) => {
    const src = document.getElementById(id);
    if (!src) return '';
    const clone = src.cloneNode(true);
    clone.classList.remove('hidden', 'active');
    clone.classList.add('snap-screen');
    let inner = clone.outerHTML;
    // gắn bản sao thanh nav vào cuối mỗi khung (nav thật là fixed, nằm ngoài screen)
    if (navEl && id !== 's-add') {
      const navClone = navEl.cloneNode(true);
      navClone.classList.add('snap-nav');
      inner += navClone.outerHTML;
    }
    return `<div class="snap-frame">
      <div class="snap-label">${label}</div>
      <div class="snap-phone">${inner}</div>
    </div>`;
  }).join('');

  const headHTML = document.head.innerHTML;
  const override = `<style>
    body{overflow:auto!important;height:auto!important;background:#07080F!important;padding:32px 24px 64px}
    .snap-wrap{display:flex;flex-wrap:wrap;gap:32px;justify-content:center;align-items:flex-start}
    .snap-frame{display:flex;flex-direction:column;gap:12px}
    .snap-label{color:#cbd5e1;font-size:14px;font-weight:700;text-align:center;letter-spacing:.02em}
    .snap-phone{position:relative;width:390px;height:780px;overflow:hidden;border-radius:36px;
      background:#0B0D17;border:1px solid rgba(255,255,255,0.10);box-shadow:0 30px 80px -20px rgba(0,0,0,0.7)}
    .snap-screen{position:absolute!important;inset:0!important;display:block!important;
      height:100%!important;min-height:100%!important;width:100%!important;overflow-y:auto!important}
    .snap-nav{position:absolute!important;left:0;right:0;bottom:0}
  </style>`;

  const doc = `<!DOCTYPE html>
<html lang="vi"><head>${headHTML}${override}</head>
<body>
  <h1 style="color:#fff;font-size:20px;font-weight:800;text-align:center;margin-bottom:28px">
    App Chi Tiêu — Snapshot giao diện (bản mới nhất)
  </h1>
  <div class="snap-wrap">${frames}</div>
</body></html>`;

  // bỏ mọi <script> để file hoàn toàn tĩnh
  return doc.replace(/<script[\s\S]*?<\/script>/gi, '');
};
'__gen_snapshot_ready';
