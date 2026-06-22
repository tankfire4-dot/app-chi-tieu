/* ============================================================
   MỘT-LẦN: CHUẨN HÓA TÊN HẠNG MỤC trong `to_nhap_lieu`
   cho khớp danh sách chuẩn ở `hang_muc`.

   CÁCH DÙNG (dán CẢ KHỐI này xuống CUỐI Code.gs — cùng project nên
   dùng chung SHEET_ID / TAB_DATA / TAB_CATS đã có sẵn):
     1) Chạy hàm  xemTruocChuanHoa()  → ghi đề xuất đổi tên vào một tab
        mới tên "_xem_truoc_chuan_hoa" để DUYỆT (chưa đụng dữ liệu thật).
     2) Ưng rồi thì chạy  apDungChuanHoa()  → áp dụng (chỉ đổi cột Hạng mục).
     3) Xong có thể chạy  xoaTabXemTruoc()  để xóa tab tạm, và xóa khối này.

   AN TOÀN: chỉ sửa cột "Hạng mục"; KHÔNG đụng số tiền / phân loại / công nợ.
   Google Sheet có "Tệp > Lịch sử phiên bản" để hoàn tác nếu cần.

   NGUYÊN TẮC KHỚP: với mỗi tên hạng mục trong dữ liệu, tìm hạng mục chuẩn
   (cùng Phân loại) TRÙNG NHIỀU TỪ nhất; chỉ đổi khi đủ chắc (trùng ≥ nửa số
   từ của tên chuẩn). Tên lạ không có hạng mục chuẩn nào hợp → GIỮ NGUYÊN.
   ============================================================ */

function _ch_toks(s) {
  return String(s == null ? '' : s).toLowerCase()
    .split(/[^0-9a-zà-ỹ]+/).filter(function (w) { return w.length > 1; });
}

// Đọc danh sách chuẩn từ hang_muc, gom theo Loại (Phân loại)
function _ch_canonical() {
  var sh = SpreadsheetApp.openById(SHEET_ID).getSheetByName(TAB_CATS);
  var last = sh.getLastRow();
  var byType = {};
  if (last < 2) return byType;
  sh.getRange(2, 1, last - 1, 3).getValues().forEach(function (r) {  // A=Emoji B=Tên C=Loại
    var name = String(r[1] || '').trim();
    var type = String(r[2] || '').trim();
    if (!name) return;
    (byType[type] = byType[type] || []).push({ name: name, toks: _ch_toks(name) });
  });
  return byType;
}

function _ch_best(name, cands) {
  var target = _ch_toks(name);
  if (!target.length || !cands) return null;
  var set = {}; target.forEach(function (w) { set[w] = true; });
  var best = null, score = 0;
  cands.forEach(function (c) {
    var s = 0; c.toks.forEach(function (w) { if (set[w]) s++; });
    if (s > score) { score = s; best = c; }
  });
  if (best && score >= 1 && score >= Math.ceil(best.toks.length / 2)) return best.name;
  return null;
}

// Tính danh sách thay đổi (KHÔNG ghi gì)
function _ch_plan() {
  var byType = _ch_canonical();
  var sh = SpreadsheetApp.openById(SHEET_ID).getSheetByName(TAB_DATA);
  var last = sh.getLastRow();
  var out = [];
  if (last < 2) return out;
  // A=Ngày B=Tên C=Phân loại D=Hạng mục
  sh.getRange(2, 1, last - 1, 4).getValues().forEach(function (r, i) {
    var type = String(r[2] || '').trim();
    var hm = String(r[3] || '').trim();
    if (!hm) return;
    var to = _ch_best(hm, byType[type]);
    if (to && to !== hm) out.push({ row: i + 2, type: type, from: hm, to: to });
  });
  return out;
}

// BƯỚC 1 — xem trước
function xemTruocChuanHoa() {
  var plan = _ch_plan();
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var nm = '_xem_truoc_chuan_hoa';
  var sh = ss.getSheetByName(nm);
  if (sh) ss.deleteSheet(sh);
  sh = ss.insertSheet(nm);
  sh.getRange(1, 1, 1, 4).setValues([['Dòng', 'Phân loại', 'Tên CŨ', 'Tên MỚI (chuẩn)']]).setFontWeight('bold');
  if (!plan.length) { sh.getRange(2, 1).setValue('✓ Không có gì cần đổi — dữ liệu đã khớp danh sách chuẩn.'); return; }
  sh.getRange(2, 1, plan.length, 4).setValues(plan.map(function (c) { return [c.row, c.type, c.from, c.to]; }));
  sh.autoResizeColumns(1, 4);
  Logger.log('Đã ghi ' + plan.length + ' đề xuất vào tab "' + nm + '". Mở tab đó để duyệt. Ưng thì chạy apDungChuanHoa().');
}

// BƯỚC 2 — áp dụng
function apDungChuanHoa() {
  var plan = _ch_plan();
  if (!plan.length) { Logger.log('✓ Không có gì cần đổi.'); return; }
  var sh = SpreadsheetApp.openById(SHEET_ID).getSheetByName(TAB_DATA);
  plan.forEach(function (c) { sh.getRange(c.row, 4).setValue(c.to); });
  Logger.log('✓ Đã chuẩn hóa ' + plan.length + ' dòng. Mở app, kéo refresh để thấy.');
}

// Dọn tab tạm (tùy chọn)
function xoaTabXemTruoc() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sh = ss.getSheetByName('_xem_truoc_chuan_hoa');
  if (sh) ss.deleteSheet(sh);
}
