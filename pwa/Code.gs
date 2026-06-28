/* ============================================================
   APP CHI TIÊU — GOOGLE APPS SCRIPT (v2)
   Chỉ phục vụ PWA app, không có bot Telegram.

   CẤU TRÚC SHEET (tự tạo khi chạy lần đầu):
   ├── to_nhap_lieu    : dữ liệu chi tiêu (7 cột)
   ├── danh_sach_ten   : A=Tên | B=Từ khóa tắt (phẩy)   ← dòng 2 = CHỦ SỞ HỮU
   └── hang_muc        : A=Emoji | B=Tên | C=Loại | D=Từ khóa

   Muốn thêm tên/hạng mục: thêm trong app HOẶC gõ thẳng vào Sheet.
   KHÔNG cần sửa code này nữa.

   Deploy: Web App | Execute as: Me | Anyone can access
   ============================================================ */

// ============ CẤU HÌNH ============
var SHEET_ID    = "PASTE_SHEET_ID_HERE";   // ← thay bằng ID Google Sheet của ông
var API_TOKEN   = "chi_tieu_app_secret_2024";
var API_VERSION = 2;

var TAB_DATA   = "to_nhap_lieu";
var TAB_PEOPLE = "danh_sach_ten";
var TAB_CATS   = "hang_muc";
var TAB_CFG    = "cau_hinh";

// ============ DỮ LIỆU MẪU (chỉ dùng seed lần đầu) ============
var SEED_PEOPLE = [
  ["Khoa",        "khoa"],
  ["A. Hải",      "a hải, a hai, anh hải, hải"],
  ["C. Kỳ",       "c kỳ, c ky, chị kỳ, kỳ, ky"],
  ["Quan",        "quan"],
  ["A. Huy",      "a huy, anh huy"],
  ["C. Lan",      "c lan, chị lan, lan"],
  ["C. Đức",      "c đức, c duc, chị đức, đức"],
  ["Phi",         "phi"],
  ["Trí",         "trí, tri"],
  ["Lực",         "lực, luc"],
  ["Minh",        "minh"],
  ["Khoa béo",    "khoa béo, khoabeo, béo"],
  ["Phúc",        "phúc, phuc"],
  ["A. Thuận",    "a thuận, a thuan, thuận, thuan"],
  ["Đạt",         "đạt, dat"],
  ["A. Phúc",     "a phúc, a phuc"],
  ["A. Phước",    "a phước, a phuoc, anh phước"],
  ["A. Tài",      "a tài, a tai, anh tài"],
  ["A. Khánh Hí", "a khánh hí, khánh hí, khanh hi, khánh"],
  ["Việt",        "việt, viet"],
  ["Hân",         "hân, han"]
];

var SEED_CATS = [
  ["🍜", "Tiền ăn",                      "Cá nhân",       "ăn, an, cơm, com, bún, phở, pho, bánh, hủ tiếu, mì, cháo, lẩu, nướng, buffet, bữa, bhx, bách hóa, chợ, rau, thịt, trứng, đồ ăn"],
  ["🏠", "Tiền trọ/ điện nước",          "Cá nhân",       "trọ, tro, tiền nhà, tiền điện, wifi, mạng, internet, giặt đồ"],
  ["⛽", "Đi lại, đổ xăng",              "Cá nhân",       "xăng, xang, gửi xe, taxi, grab, gojek, rửa xe, bus, xe buýt"],
  ["☕", "Giải trí, cf, bạn bè",         "Cá nhân",       "cf, cafe, cà phê, trà sữa, nhậu, xem phim, karaoke, hát"],
  ["🛍️", "Mua sắm, đồ dùng",            "Cá nhân",       "áo, quần, giày, dép, shopee, lazada, cắt tóc, sữa tắm, mỹ phẩm"],
  ["💊", "Ốm đau, y tế",                 "Cá nhân",       "thuốc, khám bệnh, nha khoa, bệnh viện, y tế, bác sĩ"],
  ["💪", "Gym, thể thao, TPBS",          "Cá nhân",       "gym, whey, bơi, cầu lông, sân bóng, thể thao"],
  ["🎊", "Quan hệ xã hội, văn hóa",      "Cá nhân",       "cưới, sinh nhật, thôi nôi, ma chay, đám, lì xì"],
  ["📚", "Học tập/ Phát triển bản thân", "Cá nhân",       "học phí, sách, khóa học, domain, hosting"],
  ["💳", "Trả nợ",                       "Cá nhân",       "trả nợ, tín dụng, trả góp, thẻ credit"],
  ["🏡", "Gửi về",                       "Cá nhân",       "gửi mẹ, gửi về, gửi ba, gửi nhà, cho nhà"],
  ["📈", "Dòng tiền đầu tư",             "Cá nhân",       "đầu tư, cổ phiếu, chứng khoán, coin"],
  ["❓", "Không xác định",               "Cá nhân",       ""],
  ["🍚", "Cơm nước",                     "Cho mượn/ Ứng", "cơm, com, ăn, an, bún, phở, pho, bánh, hủ tiếu, mì, cháo, lẩu, nướng, buffet, bữa, thịt, bhx, bách hóa, chợ, rau, trứng, đồ ăn"],
  ["🏢", "Cty",                          "Cho mượn/ Ứng", "cty, công ty, văn phòng"],
  ["📢", "Marketing",                    "Cho mượn/ Ứng", "ads, marketing, quảng cáo, qc"],
  ["⚽", "Thể thao",                     "Cho mượn/ Ứng", "thể thao, đá bóng, cầu lông, bơi"],
  ["📦", "Khác",                         "Cho mượn/ Ứng", "taxi, grab, xăng, bus, khác, khac"],
  ["💵", "Lương",                        "Thu nhập",      "lương, luong"],
  ["🎁", "Thưởng",                       "Thu nhập",      "thưởng, thuong, bonus"],
  ["📦", "Thu nhập khác",                "Thu nhập",      "bán, ban, hoàn, hoan"]
];

// ============ HÀM PHỤ — SHEET ============
function getSS() { return SpreadsheetApp.openById(SHEET_ID); }
function getSheet() { return getSS().getSheetByName(TAB_DATA); }

// Tự tạo các tab + seed dữ liệu mẫu nếu chưa có (chạy lần đầu)
function ensureSetup() {
  var ss = getSS();

  if (!ss.getSheetByName(TAB_DATA)) {
    var s = ss.insertSheet(TAB_DATA);
    s.appendRow(["Ngày", "Tên", "Phân loại", "Hạng mục", "Chi tiết", "Số tiền", "Đã thu", "Ngày thu"]);
    s.getRange(1, 1, 1, 8).setFontWeight("bold");
  } else {
    // Migration: thêm cột "Ngày thu" cho sheet cũ (chỉ chạy 1 lần)
    var ds = ss.getSheetByName(TAB_DATA);
    if (String(ds.getRange(1, 8).getValue()).trim() === "") {
      ds.getRange(1, 8).setValue("Ngày thu").setFontWeight("bold");
    }
  }

  if (!ss.getSheetByName(TAB_PEOPLE)) {
    var s = ss.insertSheet(TAB_PEOPLE);
    s.appendRow(["Tên", "Từ khóa tắt (phẩy)"]);
    s.getRange(1, 1, 1, 2).setFontWeight("bold");
    SEED_PEOPLE.forEach(function(r) { s.appendRow(r); });
  }

  if (!ss.getSheetByName(TAB_CATS)) {
    var s = ss.insertSheet(TAB_CATS);
    s.appendRow(["Emoji", "Tên hạng mục", "Loại", "Từ khóa (phẩy)"]);
    s.getRange(1, 1, 1, 4).setFontWeight("bold");
    SEED_CATS.forEach(function(r) { s.appendRow(r); });
  }

  if (!ss.getSheetByName(TAB_CFG)) {
    var s = ss.insertSheet(TAB_CFG);
    s.appendRow(["Khóa", "Giá trị"]);
    s.getRange(1, 1, 1, 2).setFontWeight("bold");
    s.appendRow(["so_du_ban_dau", 0]);
    s.appendRow(["tu_ngay", today()]);
  }
}

// Đọc / ghi cấu hình theo khóa
function readCfg(key) {
  var s = getSS().getSheetByName(TAB_CFG);
  if (!s || s.getLastRow() < 2) return "";
  var data = s.getRange(2, 1, s.getLastRow() - 1, 2).getValues();
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][0]).trim() === key) return data[i][1];
  }
  return "";
}

function writeCfg(key, value) {
  var s = getSS().getSheetByName(TAB_CFG);
  var data = s.getRange(2, 1, Math.max(s.getLastRow() - 1, 1), 2).getValues();
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][0]).trim() === key) {
      s.getRange(i + 2, 2).setValue(value);
      return;
    }
  }
  s.appendRow([key, value]);
}

// dd/MM/yyyy → "yyyyMMdd" để so sánh
function dateKey(d) {
  return d.length >= 10 ? d.slice(6, 10) + d.slice(3, 5) + d.slice(0, 2) : "";
}

// Đọc danh sách tên từ Sheet → [{name, keys[]}]; dòng 2 = chủ sở hữu
function loadPeople() {
  var s = getSS().getSheetByName(TAB_PEOPLE);
  if (!s || s.getLastRow() < 2) return [];
  return s.getRange(2, 1, s.getLastRow() - 1, 2).getValues()
    .filter(function(r) { return String(r[0]).trim() !== ""; })
    .map(function(r) {
      return {
        name: String(r[0]).trim(),
        keys: String(r[1] || "").toLowerCase().split(",").map(function(k) { return k.trim(); }).filter(Boolean)
      };
    });
}

// Đọc hạng mục từ Sheet → [{emoji, name, type, keys[]}]
function loadCats() {
  var s = getSS().getSheetByName(TAB_CATS);
  if (!s || s.getLastRow() < 2) return [];
  return s.getRange(2, 1, s.getLastRow() - 1, 4).getValues()
    .filter(function(r) { return String(r[1]).trim() !== ""; })
    .map(function(r) {
      return {
        emoji: String(r[0] || "").trim(),
        name:  String(r[1]).trim(),
        type:  String(r[2] || "Cá nhân").trim(),
        keys:  String(r[3] || "").toLowerCase().split(",").map(function(k) { return k.trim(); }).filter(Boolean)
      };
    });
}

function getOwner() {
  var people = loadPeople();
  return people.length ? people[0].name : "Khoa";
}

// Dò hạng mục theo từ khóa (đọc từ Sheet, không hardcode)
function autoHM(text, type) {
  var t = " " + text.toLowerCase() + " ";
  var cats = loadCats().filter(function(c) { return c.type === type; });
  for (var i = 0; i < cats.length; i++) {
    for (var j = 0; j < cats[i].keys.length; j++) {
      if (t.indexOf(cats[i].keys[j]) !== -1) return cats[i].name;
    }
  }
  return "";
}

function today() { return Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy"); }

function dateStr(val) {
  return val instanceof Date
    ? Utilities.formatDate(val, "GMT+7", "dd/MM/yyyy")
    : String(val);
}

function ok(data) {
  return ContentService
    .createTextOutput(JSON.stringify(Object.assign({ success: true }, data)))
    .setMimeType(ContentService.MimeType.JSON);
}

function err(msg) {
  return ContentService
    .createTextOutput(JSON.stringify({ success: false, error: msg }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============ MAIN ============
function doGet(e) {
  var p = e.parameter;

  if (!p.token || p.token !== API_TOKEN) return err("Unauthorized");

  try {
    switch (p.action) {

      // ── Cấu hình: app gọi 1 lần lúc mở ─────────────────────
      case "getConfig": {
        ensureSetup();
        var people = loadPeople();
        return ok({
          version:      API_VERSION,
          owner:        people.length ? people[0].name : "Khoa",
          people:       people,
          categories:   loadCats(),
          startBalance: Number(readCfg("so_du_ban_dau")) || 0,
          startDate:    String(readCfg("tu_ngay") instanceof Date ? dateStr(readCfg("tu_ngay")) : readCfg("tu_ngay"))
        });
      }

      // ── (giữ tương thích cũ) ───────────────────────────────
      case "getPeople": {
        ensureSetup();
        return ok({ people: loadPeople().map(function(x) { return x.name; }) });
      }

      // ── Thêm người mới ─────────────────────────────────────
      case "addPerson": {
        var name = (p.name || "").trim();
        if (!name) return err("Thiếu tên");

        var exists = loadPeople().some(function(x) { return x.name.toLowerCase() === name.toLowerCase(); });
        if (exists) return err("Tên này đã có rồi");

        // Chỉ ghi cột Tên. Cột "Từ khóa tắt" (B) đã bỏ cùng chức năng nhập nhanh.
        getSS().getSheetByName(TAB_PEOPLE).appendRow([name]);
        return ok({ name: name });
      }

      // ── Thêm hạng mục mới ──────────────────────────────────
      case "addCategory": {
        var name  = (p.name  || "").trim();
        var emoji = (p.emoji || "").trim();
        var type  = (p.type  || "Cá nhân").trim();
        var keys  = (p.keys  || "").trim();
        if (!name) return err("Thiếu tên hạng mục");

        var exists = loadCats().some(function(c) { return c.name.toLowerCase() === name.toLowerCase() && c.type === type; });
        if (exists) return err("Hạng mục này đã có rồi");

        getSS().getSheetByName(TAB_CATS).appendRow([emoji, name, type, keys]);
        return ok({ name: name });
      }

      // ── Lấy giao dịch (lọc theo tháng nếu có month/year) ───
      case "getRows": {
        var sheet = getSheet();
        var last  = sheet.getLastRow();
        if (last < 2) return ok({ rows: [] });

        var month = p.month || "";
        var year  = p.year  || "";

        if (month || year) {
          var data = sheet.getRange(2, 1, last - 1, 8).getValues();
          var rows = [];
          data.forEach(function(row, i) {
            var d = dateStr(row[0]);
            if (month && d.slice(3, 5) !== month) return;
            if (year  && d.slice(6, 10) !== year)  return;
            rows.push({
              rowIndex:      i + 2,
              date:          d,
              name:          String(row[1] || ""),
              category:      String(row[2] || ""),
              subcategory:   String(row[3] || ""),
              detail:        String(row[4] || ""),
              amount:        Number(row[5]) || 0,
              collected:     row[6] === true,
              collectedDate: row[7] ? dateStr(row[7]) : ""
            });
          });
          return ok({ rows: rows.reverse() });
        }

        var limit = Math.min(parseInt(p.limit || "100"), 500);
        var start = Math.max(2, last - limit + 1);
        var data  = sheet.getRange(start, 1, last - start + 1, 8).getValues();

        var rows = data.map(function(row, i) {
          return {
            rowIndex:      start + i,
            date:          dateStr(row[0]),
            name:          String(row[1] || ""),
            category:      String(row[2] || ""),
            subcategory:   String(row[3] || ""),
            detail:        String(row[4] || ""),
            amount:        Number(row[5]) || 0,
            collected:     row[6] === true,
            collectedDate: row[7] ? dateStr(row[7]) : ""
          };
        }).reverse();

        return ok({ rows: rows });
      }

      // ── Ghi 1 dòng (chi tiêu hoặc thu nhập) ────────────────
      case "addRow": {
        var name   = p.name   || "";
        var detail = p.detail || "Chi tiêu";
        var amount = parseInt(p.amount || "0");
        var subOvr = p.subcategory || "";

        var cat, sub, daThu;
        if (p.kind === "income") {
          // Thu nhập: luôn ghi tên chủ app, Đã thu = TRUE
          name  = getOwner();
          cat   = "Thu nhập";
          sub   = subOvr || autoHM(detail, "Thu nhập");
          daThu = true;
        } else {
          var isOwner = name === getOwner();
          cat   = isOwner ? "Cá nhân" : "Cho mượn/ Ứng";
          sub   = subOvr || autoHM(detail, cat);
          daThu = isOwner;
        }

        var sheet  = getSheet();
        var newRow = sheet.getLastRow() + 1;
        sheet.appendRow([today(), name, cat, sub, detail, amount, daThu]);

        return ok({ rowIndex: newRow, subcategory: sub });
      }

      // ── Chia bill ──────────────────────────────────────────
      case "addSplit": {
        var detail = p.detail || "Chia bill";
        var amount = parseInt(p.amount || "0");
        var people = (p.people || "").split("|").filter(Boolean);
        var subOvr = p.subcategory || "";

        if (!people.length) return err("Không có người nào");

        var owner = getOwner();
        var per   = Math.round(amount / people.length);
        var rem   = amount - per * people.length;
        var hmCN  = subOvr || autoHM(detail, "Cá nhân");
        var hmCM  = autoHM(detail, "Cho mượn/ Ứng");

        var sheet    = getSheet();
        var firstRow = sheet.getLastRow() + 1;
        var chiTiet  = detail + " (tổng " + String(amount).replace(/\B(?=(\d{3})+(?!\d))/g,'.') + " / " + people.length + " người)";

        people.forEach(function(name, i) {
          var isOwner = name === owner;
          sheet.appendRow([
            today(), name,
            isOwner ? "Cá nhân" : "Cho mượn/ Ứng",
            isOwner ? hmCN : hmCM,
            chiTiet,
            i === 0 ? per + rem : per,
            isOwner   // Đã thu
          ]);
        });

        return ok({ firstRow: firstRow, rowsAdded: people.length, perPerson: per });
      }

      // ── Được trả hộ ────────────────────────────────────────
      case "addPaidBy": {
        var payer  = p.payer  || "";
        var detail = p.detail || "Được trả hộ";
        var amount = parseInt(p.amount || "0");
        var subOvr = p.subcategory || "";

        var owner = getOwner();
        if (!payer || payer === owner) return err("Tên người trả không hợp lệ");

        var halfOwner = Math.round(amount / 2);
        var halfPayer = amount - halfOwner;
        var hmCN = subOvr || autoHM(detail, "Cá nhân");
        var hmCM = autoHM(detail, "Cho mượn/ Ứng");

        var sheet    = getSheet();
        var firstRow = sheet.getLastRow() + 1;
        var chiTiet  = detail + " (tổng " + String(amount).replace(/\B(?=(\d{3})+(?!\d))/g,'.') + " / " + payer + " trả hộ)";

        sheet.appendRow([today(), owner, "Cá nhân",       hmCN, chiTiet,  halfOwner, true]);
        sheet.appendRow([today(), payer, "Cho mượn/ Ứng", hmCM, chiTiet, -halfPayer, false]);

        return ok({ firstRow: firstRow, rowsAdded: 2, halfOwner: halfOwner, halfPayer: halfPayer });
      }

      // ── Sửa giao dịch đã ghi ───────────────────────────────
      case "editRow": {
        var rowIndex = parseInt(p.rowIndex || "0");
        if (rowIndex < 2) return err("Dòng không hợp lệ");

        var sheet = getSheet();
        if (rowIndex > sheet.getLastRow()) return err("Dòng không tồn tại");

        // Chỉ cập nhật field nào được gửi lên
        // Dòng Thu nhập giữ nguyên phân loại, không đổi người
        var curCat  = String(sheet.getRange(rowIndex, 3).getValue());
        var curName = String(sheet.getRange(rowIndex, 2).getValue());
        if (p.name !== undefined && p.name !== "" && curCat !== "Thu nhập") {
          var isOwner = p.name === getOwner();
          var wasOwner = curName === getOwner();
          sheet.getRange(rowIndex, 2).setValue(p.name);
          sheet.getRange(rowIndex, 3).setValue(isOwner ? "Cá nhân" : "Cho mượn/ Ứng");
          // Chỉ reset "Đã thu" khi đổi bản chất khoản (chủ app ↔ người khác),
          // tránh hồi sinh khoản nợ đã tất toán khi chỉ sửa số tiền/chi tiết
          if (isOwner !== wasOwner) sheet.getRange(rowIndex, 7).setValue(isOwner);
        }
        if (p.subcategory !== undefined) sheet.getRange(rowIndex, 4).setValue(p.subcategory);
        if (p.detail      !== undefined) sheet.getRange(rowIndex, 5).setValue(p.detail);
        if (p.amount      !== undefined) sheet.getRange(rowIndex, 6).setValue(parseInt(p.amount));

        return ok({ rowIndex: rowIndex });
      }

      // ── Xóa dòng ───────────────────────────────────────────
      case "deleteRow": {
        var rowIndex = parseInt(p.rowIndex || "0");
        var count    = parseInt(p.count    || "1");
        if (rowIndex < 2) return err("Dòng không hợp lệ");

        getSheet().deleteRows(rowIndex, count);
        return ok({ deleted: count });
      }

      // ── Thống kê theo tháng ────────────────────────────────
      case "getStats": {
        var month = p.month || "";
        var year  = p.year  || String(new Date().getFullYear());
        var sheet = getSheet();
        var last  = sheet.getLastRow();
        if (last < 2) return ok({ total: 0, byPerson: {}, byCategory: {} });

        var data        = sheet.getRange(2, 1, last - 1, 7).getValues();
        var total       = 0;
        var totalIncome = 0;
        var byPerson    = {};
        var byCat       = {};

        data.forEach(function(row) {
          var d = dateStr(row[0]);
          if (month && d.slice(3, 5) !== month) return;
          if (year  && d.slice(6, 10) !== year)  return;

          var name = String(row[1] || "");
          var sub  = String(row[3] || "");
          var amt  = Number(row[5]) || 0;

          // Thu nhập tách riêng, không lẫn vào thống kê chi tiêu
          if (String(row[2]) === "Thu nhập") { totalIncome += amt; return; }

          total += amt;
          byPerson[name] = (byPerson[name] || 0) + amt;
          if (sub) byCat[sub] = (byCat[sub] || 0) + amt;
        });

        return ok({ total: total, totalIncome: totalIncome, byPerson: byPerson, byCategory: byCat, month: month, year: year });
      }

      // ── Công nợ ────────────────────────────────────────────
      case "getDebts": {
        var sheet = getSheet();
        var last  = sheet.getLastRow();
        if (last < 2) return ok({ debts: [] });

        var data      = sheet.getRange(2, 1, last - 1, 8).getValues();
        var debtMap   = {};
        var collected = [];

        data.forEach(function(row, i) {
          if (String(row[2]) !== "Cho mượn/ Ứng") return;

          var name = String(row[1] || "");
          var amt  = Number(row[5]) || 0;

          if (row[6] === true) {
            // đã thu/đã trả → vào lịch sử (chỉ tính khoản có ngày thu)
            if (row[7]) {
              collected.push({
                rowIndex:      i + 2,
                name:          name,
                detail:        String(row[4] || ""),
                amount:        amt,
                date:          dateStr(row[0]),
                collectedDate: dateStr(row[7])
              });
            }
            return;
          }

          if (!debtMap[name]) debtMap[name] = { balance: 0, rows: [] };
          debtMap[name].balance += amt;
          debtMap[name].rows.push({
            rowIndex: i + 2,
            date:     dateStr(row[0]),
            detail:   String(row[4] || ""),
            amount:   amt
          });
        });

        var debts = Object.keys(debtMap).map(function(name) {
          return { name: name, balance: debtMap[name].balance, rows: debtMap[name].rows };
        }).sort(function(a, b) { return b.balance - a.balance; });

        // Lịch sử đã thu: mới nhất trước, lấy tối đa 20 khoản
        collected.sort(function(a, b) { return dateKey(b.collectedDate) < dateKey(a.collectedDate) ? -1 : 1; });
        var recentCollected = collected.slice(0, 20);

        return ok({ debts: debts, recentCollected: recentCollected });
      }

      // ── Số dư dòng tiền ────────────────────────────────────
      // Số dư = ban đầu + thu nhập − chi cá nhân − cho mượn CHƯA thu
      // (cho mượn đã thu = tiền ra rồi quay về → triệt tiêu)
      case "getBalance": {
        ensureSetup();
        var startBalance = Number(readCfg("so_du_ban_dau")) || 0;
        var startRaw     = readCfg("tu_ngay");
        var startDate    = startRaw instanceof Date ? dateStr(startRaw) : String(startRaw || "");
        var startKey     = dateKey(startDate);

        var sheet = getSheet();
        var last  = sheet.getLastRow();
        var income = 0, spent = 0, pending = 0;

        if (last >= 2) {
          var data = sheet.getRange(2, 1, last - 1, 7).getValues();
          data.forEach(function(row) {
            var d = dateStr(row[0]);
            if (startKey && dateKey(d) < startKey) return; // trước ngày bắt đầu, bỏ qua

            var cat = String(row[2] || "");
            var amt = Number(row[5]) || 0;

            if (cat === "Thu nhập")      income += amt;
            else if (cat === "Cá nhân")  spent  += amt;
            else if (cat === "Cho mượn/ Ứng" && row[6] !== true) pending += amt;
          });
        }

        return ok({
          balance:      startBalance + income - spent - pending,
          income:       income,
          spent:        spent,
          pending:      pending,        // dương = đang cho mượn, âm = đang nợ
          startBalance: startBalance,
          startDate:    startDate
        });
      }

      // ── Cài số dư ban đầu ──────────────────────────────────
      case "setBalance": {
        ensureSetup();
        var bal  = parseInt(p.balance || "0");
        var date = (p.date || "").trim() || today();
        writeCfg("so_du_ban_dau", bal);
        writeCfg("tu_ngay", date);
        return ok({ startBalance: bal, startDate: date });
      }

      // ── Đánh dấu đã thu ────────────────────────────────────
      case "markCollected": {
        var indexes = (p.rows || "").split(",").map(Number).filter(function(n) { return n >= 2; });
        if (!indexes.length) return err("Không có dòng nào");

        var sheet = getSheet();
        var nowStr = today();
        indexes.forEach(function(r) {
          sheet.getRange(r, 7).setValue(true);
          sheet.getRange(r, 8).setValue(nowStr);   // ghi ngày hoàn tất công nợ
        });
        return ok({ marked: indexes.length, collectedDate: nowStr });
      }

      default:
        return err("Unknown action: " + p.action);
    }

  } catch (e) {
    return err(e.toString());
  }
}

// ============ WARMUP (giảm cold start) ============
function warmup() {}

function setupWarmupTrigger() {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'warmup') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('warmup').timeBased().everyMinutes(20).create();
}
