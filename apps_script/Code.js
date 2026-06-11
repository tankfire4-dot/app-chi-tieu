/* ============================================================
   BOT CHI TIÊU TELEGRAM — GHI CHÚ CẤU TRÚC
   ------------------------------------------------------------
   Bot này nhận tin nhắn từ Telegram (doPost) VÀ nhận request
   từ Flutter app mobile (doGet).

   LUỒNG TELEGRAM (doPost): /t /chia /dctra /undo /help /tentat
   LUỒNG FLUTTER APP (doGet): action=getRows/addRow/addSplit/addPaidBy/deleteRow/getStats

   danhSachTen, keywordCaNhan, keywordChoMuon, doHangMuc
   được đặt ở GLOBAL SCOPE để cả doPost lẫn doGet dùng chung.
   ============================================================ */

// --- CẤU HÌNH ---
var token = "8616417347:AAGDP0dRdaE9ycygRU4FgHYD2aCkfpJoDFI";
var sheetId = "15VIBhTbIMYaFyzR-J8t1GCHHL6xWM3TpEmlUX7cDY2o";
var apiToken = "chi_tieu_app_secret_2024"; // token bí mật cho Flutter app — đổi tùy ý

// ==============================================
// DANH SÁCH TÊN — GLOBAL (dùng chung cho cả Telegram lẫn App)
// ==============================================
var danhSachTen = [
  { tuKhoa: ["khoa"], tenHienThi: "Khoa" },
  { tuKhoa: ["a hải", "a hai", "anh hải", "anh hai","hải"], tenHienThi: "A. Hải" },
  { tuKhoa: ["c kỳ", "c ky", "chị kỳ", "chi ky","kỳ","ky"], tenHienThi: "C. Kỳ" },
  { tuKhoa: ["quan"], tenHienThi: "Quan" },
  { tuKhoa: ["a huy", "anh huy"], tenHienThi: "A. Huy" },
  { tuKhoa: ["c lan", "chị lan", "chi lan","lan"], tenHienThi: "C. Lan" },
  { tuKhoa: ["c đức", "c duc", "chị đức", "chi duc","đức"], tenHienThi: "C. Đức" },
  { tuKhoa: ["phi"], tenHienThi: "Phi" },
  { tuKhoa: ["tri","trí"], tenHienThi: "Trí" },
  { tuKhoa: ["luc","lực"], tenHienThi: "Lực" },
  { tuKhoa: ["minh"], tenHienThi: "Minh" },
  { tuKhoa: ["khoabeo","béo"], tenHienThi: "Khoa béo" },
  { tuKhoa: ["phuc","phúc"], tenHienThi: "Phúc" },
  { tuKhoa: ["a thuận","a thuan","thuan","thuận"], tenHienThi: "A. Thuận" },
  { tuKhoa: ["đạt","dat"], tenHienThi: "Đạt" },
  { tuKhoa: ["a phúc","a phuc"], tenHienThi: "A. Phúc" },
  { tuKhoa: ["a phước", "a phuoc", "anh phước", "anh phuoc"], tenHienThi: "A. Phước" },
  { tuKhoa: ["a tài", "a tai", "anh tài", "anh tai"], tenHienThi: "A. Tài" },
  { tuKhoa: ["khánh hí", "khanh hi", "khánh", "khanh","a khánh","a khanh"], tenHienThi: "A. Khánh Hí" },
  { tuKhoa: ["việt", "viet"], tenHienThi: "Việt" },
  { tuKhoa: ["hân", "han"], tenHienThi: "Hân" },
];

// ==============================================
// BỘ TỪ KHÓA HẠNG MỤC — GLOBAL
// ==============================================
var keywordCaNhan = [
  { tuKhoa: ["trọ","tro","tiền trọ","tien tro","tiền nhà","tien nha","tiền điện","tien dien","đóng điện","dong dien","wifi","mạng","mang","internet","giặt đồ","giat do"], hangMuc: "Tiền trọ/ điện nước sinh hoạt" },
  { tuKhoa: ["ăn","an","cơm","com","bún","bun","pho","phở","bánh canh","banh canh","bánh mì","banh mi","hủ tiếu","hủ tíu","bánh","hu tieu","mì","mi","cháo","chao","lẩu","lau","nướng","nuong","buffet","bữa","bua","nước","nuoc","bhx","bách hóa","bach hoa","chợ","rau","thịt","thit","trứng","trung","đồ ăn","do an"], hangMuc: "Tiền ăn" },
  { tuKhoa: ["xăng","xang","gửi xe","gui xe","bãi xe","bai xe","taxi","grab","gojek","rửa xe","rua xe","bus","xe buýt","xe buyt"], hangMuc: "Đi lại, đổ xăng cơ bản" },
  { tuKhoa: ["cf","cafe","cà phê","ca phe","trà sữa","tra sua","nhậu","nhau","xem phim","xem film","karaoke","hát","hat"], hangMuc: "Giải trí, cf, ăn uống bạn bè" },
  { tuKhoa: ["áo","ao","quần","quan","giày","giay","dép","dep","shopee","lazada","cắt tóc","cat toc","sữa tắm","sua tam","mỹ phẩm","my pham"], hangMuc: "Tiền mua sắm, đồ dùng cá nhân" },
  { tuKhoa: ["thuốc","thuoc","khám bệnh","kham benh","nha khoa","bệnh viện","benh vien","y tế","y te","bác sĩ","bac si"], hangMuc: "Ốm đau, y tế" },
  { tuKhoa: ["gym","whey","bơi","boi","cầu lông","cau long","sân bóng","san bong","thể thao","the thao"], hangMuc: "Tiền gym, thể thao, TPBS" },
  { tuKhoa: ["cưới","cuoi","sinh nhật","sinh nhat","thôi nôi","thoi noi","ma chay","phúng điếu","phung dieu","đám","dam","lì xì","li xi"], hangMuc: "Quan hệ xã hội, văn hóa" },
  { tuKhoa: ["học phí","hoc phi","sách","sach","khóa học","khoa hoc","domain","hosting"], hangMuc: "Học tập/Phát triển bản thân" },
  { tuKhoa: ["trả nợ","tra no","tín dụng","tin dung","trả góp","tra gop","thẻ credit","the credit"], hangMuc: "Trả nợ" },
  { tuKhoa: ["gửi mẹ","gui me","gửi về","gui ve","gửi ba","gui ba","gửi nhà","gui nha","cho nhà","cho nha"], hangMuc: "Gửi về" },
  { tuKhoa: ["đầu tư","dau tu","cổ phiếu","co phieu","chứng khoán","chung khoan","coin"], hangMuc: "Dòng tiền đầu tư" }
];

var keywordChoMuon = [
  { tuKhoa: ["cty","công ty","cong ty","văn phòng","van phong"], hangMuc: "Cty" },
  { tuKhoa: ["ads","marketing","quảng cáo","quang cao","qc"], hangMuc: "Marketing" },
  { tuKhoa: ["thể thao","the thao","đá bóng","da bong","cầu lông","cau long","bơi","boi"], hangMuc: "Thể thao" },
  { tuKhoa: ["cơm","com","ăn","an","bún","bun","phở","pho","bánh canh","banh canh","bánh mì","banh mi","hủ tiếu","hu tieu","hủ tíu","bánh","mì","mi","cháo","chao","lẩu","lau","nướng","nuong","buffet","bữa","bua","nước","nuoc","thịt","thit","bhx","bách hóa","bach hoa","chợ","rau","trứng","trung","đồ ăn","do an"], hangMuc: "Cơm nước" },
  { tuKhoa: ["taxi","grab","gojek","xăng","xang","bus","xe buýt","xe buyt","gửi xe","gui xe","khác","khac"], hangMuc: "Khác" }
];

// ==============================================
// HÀM PHỤ — DÒ HẠNG MỤC (GLOBAL)
// ==============================================
function doHangMuc(chuoi, boKeyword) {
  var chuoiTim = chuoi.replace(/^[-\s]+|[-\s]+$/g, "").toLowerCase();
  for (var a = 0; a < boKeyword.length; a++) {
    for (var b = 0; b < boKeyword[a].tuKhoa.length; b++) {
      var regex = new RegExp('(^|\\s)' + boKeyword[a].tuKhoa[b] + '(\\s|$)', 'i');
      if (regex.test(chuoiTim)) {
        return boKeyword[a].hangMuc;
      }
    }
  }
  return "";
}

/* ============================================================
   doGet — REST API CHO FLUTTER APP
   Flutter app gọi GET với param: token + action + ...
   ============================================================ */
function doGet(e) {
  var params = e.parameter;

  if (!params.token || params.token !== apiToken) {
    return makeJsonResponse({ success: false, error: "Unauthorized" });
  }

  var action = params.action || "";

  try {

    // --- getPeople: danh sách tên ---
    if (action === "getPeople") {
      var people = danhSachTen.map(function(p) {
        return { name: p.tenHienThi };
      });
      return makeJsonResponse({ success: true, people: people });
    }

    // --- getRows: lấy danh sách giao dịch gần đây ---
    if (action === "getRows") {
      var sheet = SpreadsheetApp.openById(sheetId).getSheetByName("to_nhap_lieu");
      var lastRow = sheet.getLastRow();
      var limit = parseInt(params.limit || "80");

      if (lastRow < 2) {
        return makeJsonResponse({ success: true, rows: [], total: 0 });
      }

      var startRow = Math.max(2, lastRow - limit + 1);
      var numRows = lastRow - startRow + 1;
      var data = sheet.getRange(startRow, 1, numRows, 7).getValues();

      var rows = data.map(function(row, idx) {
        var dateVal = row[0];
        var dateStr = dateVal instanceof Date
          ? Utilities.formatDate(dateVal, "GMT+7", "dd/MM/yyyy")
          : String(dateVal);
        return {
          rowIndex: startRow + idx,
          date: dateStr,
          name: String(row[1] || ""),
          category: String(row[2] || ""),
          subcategory: String(row[3] || ""),
          detail: String(row[4] || ""),
          amount: Number(row[5]) || 0,
          collected: row[6] === true
        };
      }).reverse();

      return makeJsonResponse({ success: true, rows: rows, total: lastRow - 1 });
    }

    // --- addRow: ghi 1 dòng chi tiêu ---
    if (action === "addRow") {
      var name = params.name || "";
      var detail = params.detail || "Chi tiêu không tên";
      var amount = parseInt(params.amount || "0");
      var subcategoryOverride = params.subcategory || "";

      var category = "";
      var subcategory = "";
      if (name === "Khoa") {
        category = "Cá nhân";
        subcategory = subcategoryOverride || doHangMuc(detail.toLowerCase(), keywordCaNhan);
      } else if (name !== "") {
        category = "Cho mượn/ Ứng";
        subcategory = subcategoryOverride || doHangMuc(detail.toLowerCase(), keywordChoMuon);
      }

      var sheet = SpreadsheetApp.openById(sheetId).getSheetByName("to_nhap_lieu");
      var formattedDate = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy");
      var newRowIndex = sheet.getLastRow() + 1;
      var dasThu = (name === "Khoa"); // Cá nhân tự động tick
      sheet.appendRow([formattedDate, name, category, subcategory, detail, amount, dasThu]);

      return makeJsonResponse({
        success: true,
        rowIndex: newRowIndex,
        subcategory: subcategory,
        message: "Đã ghi thành công"
      });
    }

    // --- addSplit: chia bill ---
    if (action === "addSplit") {
      var detail = params.detail || "Chi tiêu không tên";
      var amount = parseInt(params.amount || "0");
      var people = (params.people || "").split("|").filter(function(p) { return p.trim() !== ""; });
      var subcategoryOverride = params.subcategory || "";

      if (people.length === 0) {
        return makeJsonResponse({ success: false, error: "Không có người nào" });
      }

      var perPerson = Math.round(amount / people.length);
      var remainder = amount - perPerson * people.length;

      var hangMucCaNhan = subcategoryOverride || doHangMuc(detail.toLowerCase(), keywordCaNhan);
      var hangMucChoMuon = doHangMuc(detail.toLowerCase(), keywordChoMuon);

      var sheet = SpreadsheetApp.openById(sheetId).getSheetByName("to_nhap_lieu");
      var formattedDate = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy");
      var firstRow = sheet.getLastRow() + 1;

      var chiTiet = detail.charAt(0).toUpperCase() + detail.slice(1) +
        " (tổng " + amount + "đ / chia " + people.length + ")";

      people.forEach(function(name, idx) {
        var isKhoa = name === "Khoa";
        var phanLoai = isKhoa ? "Cá nhân" : "Cho mượn/ Ứng";
        var hangMuc = isKhoa ? hangMucCaNhan : hangMucChoMuon;
        var soTien = (idx === 0) ? perPerson + remainder : perPerson;
        var dasThu = isKhoa; // Cá nhân tự động tick
        sheet.appendRow([formattedDate, name, phanLoai, hangMuc, chiTiet, soTien, dasThu]);
      });

      return makeJsonResponse({
        success: true,
        firstRow: firstRow,
        rowsAdded: people.length,
        perPerson: perPerson,
        remainder: remainder
      });
    }

    // --- addPaidBy: được người khác trả hộ ---
    if (action === "addPaidBy") {
      var payer = params.payer || "";
      var detail = params.detail || "Chi tiêu không tên";
      var amount = parseInt(params.amount || "0");
      var subcategoryOverride = params.subcategory || "";

      if (!payer || payer === "Khoa") {
        return makeJsonResponse({ success: false, error: "Tên người trả không hợp lệ" });
      }

      var phanKhoa = Math.round(amount / 2);
      var phanNguoiTra = amount - phanKhoa;

      var hangMucKhoa = subcategoryOverride || doHangMuc(detail.toLowerCase(), keywordCaNhan);
      var hangMucNguoi = doHangMuc(detail.toLowerCase(), keywordChoMuon);

      var sheet = SpreadsheetApp.openById(sheetId).getSheetByName("to_nhap_lieu");
      var formattedDate = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy");
      var firstRow = sheet.getLastRow() + 1;

      var chiTiet = detail.charAt(0).toUpperCase() + detail.slice(1) +
        " (tổng " + amount + "đ / được " + payer + " trả)";

      sheet.appendRow([formattedDate, "Khoa", "Cá nhân", hangMucKhoa, chiTiet, phanKhoa, true]);   // Cá nhân → dasThu = true
      sheet.appendRow([formattedDate, payer, "Cho mượn/ Ứng", hangMucNguoi, chiTiet, -phanNguoiTra, false]);

      return makeJsonResponse({
        success: true,
        firstRow: firstRow,
        rowsAdded: 2,
        phanKhoa: phanKhoa,
        phanNguoiTra: phanNguoiTra
      });
    }

    // --- deleteRow: xóa dòng (undo) ---
    if (action === "deleteRow") {
      var rowIndex = parseInt(params.rowIndex || "0");
      var count = parseInt(params.count || "1");

      if (rowIndex < 2) {
        return makeJsonResponse({ success: false, error: "Dòng không hợp lệ" });
      }

      var sheet = SpreadsheetApp.openById(sheetId).getSheetByName("to_nhap_lieu");
      sheet.deleteRows(rowIndex, count);

      return makeJsonResponse({ success: true, message: "Đã xóa " + count + " dòng" });
    }

    // --- getStats: thống kê theo tháng ---
    if (action === "getStats") {
      var month = params.month || "";
      var year = params.year || String(new Date().getFullYear());

      var sheet = SpreadsheetApp.openById(sheetId).getSheetByName("to_nhap_lieu");
      var lastRow = sheet.getLastRow();

      if (lastRow < 2) {
        return makeJsonResponse({ success: true, total: 0, byPerson: {}, byCategory: {} });
      }

      var data = sheet.getRange(2, 1, lastRow - 1, 7).getValues();
      var total = 0;
      var byPerson = {};
      var byCategory = {};

      data.forEach(function(row) {
        var dateVal = row[0];
        var dateStr = dateVal instanceof Date
          ? Utilities.formatDate(dateVal, "GMT+7", "dd/MM/yyyy")
          : String(dateVal);
        var rowMonth = dateStr.substring(3, 5);
        var rowYear = dateStr.substring(6, 10);

        if (month && rowMonth !== month) return;
        if (year && rowYear !== year) return;

        var name = String(row[1] || "");
        var subcategory = String(row[3] || "");
        var amount = Number(row[5]) || 0;

        total += amount;
        byPerson[name] = (byPerson[name] || 0) + amount;
        if (subcategory) {
          byCategory[subcategory] = (byCategory[subcategory] || 0) + amount;
        }
      });

      return makeJsonResponse({
        success: true,
        total: total,
        byPerson: byPerson,
        byCategory: byCategory,
        month: month,
        year: year
      });
    }

    // --- getDebts: tính công nợ theo từng người ---
    if (action === "getDebts") {
      var sheet = SpreadsheetApp.openById(sheetId).getSheetByName("to_nhap_lieu");
      var lastRow = sheet.getLastRow();
      if (lastRow < 2) return makeJsonResponse({ success: true, debts: [] });

      var data = sheet.getRange(2, 1, lastRow - 1, 7).getValues();
      var debtMap = {};

      data.forEach(function(row, idx) {
        if (String(row[2]) !== "Cho mượn/ Ứng") return;
        if (row[6] === true) return; // đã thu rồi, bỏ qua

        var name = String(row[1] || "");
        var amount = Number(row[5]) || 0;
        var dateVal = row[0];
        var dateStr = dateVal instanceof Date
          ? Utilities.formatDate(dateVal, "GMT+7", "dd/MM/yyyy")
          : String(dateVal);

        if (!debtMap[name]) debtMap[name] = { balance: 0, rows: [] };
        debtMap[name].balance += amount;
        debtMap[name].rows.push({
          rowIndex: idx + 2,
          date: dateStr,
          detail: String(row[4] || ""),
          amount: amount
        });
      });

      var debts = Object.keys(debtMap).map(function(name) {
        return { name: name, balance: debtMap[name].balance, rows: debtMap[name].rows };
      }).sort(function(a, b) { return b.balance - a.balance; });

      return makeJsonResponse({ success: true, debts: debts });
    }

    // --- markCollected: đánh dấu đã thu ---
    if (action === "markCollected") {
      var rowsParam = params.rows || "";
      var rowIndexes = rowsParam.split(",").map(Number).filter(function(n) { return n >= 2; });
      if (rowIndexes.length === 0) return makeJsonResponse({ success: false, error: "No rows" });

      var sheet = SpreadsheetApp.openById(sheetId).getSheetByName("to_nhap_lieu");
      rowIndexes.forEach(function(rowIndex) {
        sheet.getRange(rowIndex, 7).setValue(true);
      });

      return makeJsonResponse({ success: true, marked: rowIndexes.length });
    }

    return makeJsonResponse({ success: false, error: "Unknown action: " + action });

  } catch (err) {
    return makeJsonResponse({ success: false, error: err.toString() });
  }
}

function makeJsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ============================================================
   doPost — TELEGRAM BOT (giữ nguyên như cũ)
   ============================================================ */
function doPost(e) {
  var contents = JSON.parse(e.postData.contents);

  if (!contents.message || !contents.message.text) return;

  var text = contents.message.text.toLowerCase().trim();
  var chatId = contents.message.chat.id;
  var scriptProperties = PropertiesService.getScriptProperties();

  var allowedChatId = "8764547523";
  if (String(chatId) !== allowedChatId) return;

  var messageId = String(contents.message.message_id);
  var lastMsgId = scriptProperties.getProperty('lastMessageId');
  if (lastMsgId === messageId) return;
  scriptProperties.setProperty('lastMessageId', messageId);

  // KHỐI 1 — UNDO
  if (text === "/undo") {
    var lastEntryTime = scriptProperties.getProperty('lastEntryTime');
    var rowsAdded = parseInt(scriptProperties.getProperty('rowsAdded') || "1");
    var lastRowStart = parseInt(scriptProperties.getProperty('lastRowStart') || "0");
    var currentTime = new Date().getTime();

    if (lastEntryTime && (currentTime - parseInt(lastEntryTime)) <= 60000) {
      var sheet = SpreadsheetApp.openById(sheetId).getSheetByName("to_nhap_lieu");
      var lastRow = sheet.getLastRow();
      if (lastRowStart > 1 && lastRow >= lastRowStart) {
        sheet.deleteRows(lastRowStart, rowsAdded);
        scriptProperties.deleteProperty('lastEntryTime');
        scriptProperties.deleteProperty('lastRowStart');
        scriptProperties.deleteProperty('rowsAdded');
        sendMessage(chatId, "⚠️ Đã phi tang " + rowsAdded + " dòng thành công!");
      } else {
        sendMessage(chatId, "❌ Bảng đang trống, không có gì để xóa!");
      }
    } else {
      sendMessage(chatId, "⏳ Quá 1 phút rồi ông ơi! Tự mở file Sheet lên xóa tay đi =))");
    }
    return;
  }

  // KHỐI 2 — HELP
  if (text === "/help" || text === "/start") {
    var helpText =
      "🤖 BOT CHI TIÊU - HƯỚNG DẪN SỬ DỤNG\n" +
      "━━━━━━━━━━━━━━━━━━━━\n\n" +
      "📌 GHI CHI TIÊU THƯỜNG\n" +
      "Cú pháp: /t [tên] [chi tiêu gì] [số tiền]\n" +
      "• /t khoa ăn cơm 30k\n" +
      "• /t quan taxi 45\n" +
      "• /t a hải cơm tấm 55k\n" +
      "_(Bỏ tên = hàng trống, tự điền sau)_\n\n" +
      "📌 GHI SỐ ÂM (thu lại / được trả)\n" +
      "• /t quan trả cơm -50k\n" +
      "• /t a hải hoàn tiền -100\n\n" +
      "📌 CHIA BILL\n" +
      "Cú pháp: /chia [mô tả] [số tiền] [tên 1] [tên 2]...\n" +
      "• /chia buffet 145k quan việt khoa\n" +
      "• /chia tiền grab 60 khoa quan\n" +
      "_(Luôn chia đều, lẻ tính vào Khoa)_\n\n" +
      "📌 ĐƯỢC TRẢ HỘ\n" +
      "Cú pháp: /dctra [tên] [mô tả] [số tiền]\n" +
      "• /dctra việt tiền nước 26k\n" +
      "_(Chia đôi, ghi nhận cả chi tiêu lẫn công nợ)_\n\n" +
      "📌 XÓA DÒNG VỪA GHI\n" +
      "• /undo _(Chỉ được trong vòng 1 phút)_\n\n" +
      "📌 XEM DANH SÁCH TÊN TẮT\n" +
      "• /tentat  (hoặc /ten)\n\n" +
      "━━━━━━━━━━━━━━━━━━━━\n" +
      "💡 Số tiền: ghi 30k hoặc 30 đều được\n" +
      "💡 Quên lệnh: nhắn /help bất cứ lúc nào";
    sendMessage(chatId, helpText);
    return;
  }

  // KHỐI 2.5 — TENTAT
  if (text === "/tentat" || text === "/ten") {
    var dsText = "👥 DANH SÁCH TÊN TẮT\n";
    dsText += "━━━━━━━━━━━━━━━━━━━━\n";
    dsText += "(Gõ chữ bên trái → bot hiểu là người bên phải)\n\n";
    for (var i = 0; i < danhSachTen.length; i++) {
      var cacCachGo = danhSachTen[i].tuKhoa.join(" / ");
      dsText += "• " + cacCachGo + "  →  " + danhSachTen[i].tenHienThi + "\n";
    }
    dsText += "\n💡 Mỗi tên có thể gõ nhiều kiểu khác nhau,\ngõ kiểu nào tiện là được.";
    sendMessage(chatId, dsText);
    return;
  }

  // KHỐI 3 — CHIA BILL
  if (text.startsWith("/chia ")) {
    var billText = text.substring(6).trim();
    var billMoneyMatch = billText.match(/(-?\s*\d+)\s*k(?=\s|$)/i) || billText.match(/(-?\s*\d+)(?=\s|$)/);
    if (!billMoneyMatch) {
      sendMessage(chatId, "❌ Không tìm thấy số tiền!\nVD: /chia buffet 145k quan việt khoa");
      return;
    }

    var rawAmount = parseInt(billMoneyMatch[1].replace(/\s/g, ''));
    var tongTien = (billMoneyMatch[0].toLowerCase().indexOf('k') !== -1 || Math.abs(rawAmount) < 10000)
      ? rawAmount * 1000 : rawAmount;

    var amountIdx = billText.indexOf(billMoneyMatch[0]);
    var moTaBill = billText.substring(0, amountIdx).trim();
    var tenTextBill = " " + billText.substring(amountIdx + billMoneyMatch[0].length).trim().toLowerCase() + " ";

    var nguoiTrongBill = [];
    for (var i = 0; i < danhSachTen.length; i++) {
      for (var j = 0; j < danhSachTen[i].tuKhoa.length; j++) {
        var tuKhoa = danhSachTen[i].tuKhoa[j];
        if (tenTextBill.indexOf(" " + tuKhoa + " ") !== -1) {
          nguoiTrongBill.push(danhSachTen[i].tenHienThi);
          break;
        }
      }
    }

    if (nguoiTrongBill.length === 0) {
      sendMessage(chatId, "❌ Không nhận diện được tên nào!\nNhắn /tentat để xem danh sách đầy đủ.");
      return;
    }
    if (nguoiTrongBill.indexOf("Khoa") === -1) {
      sendMessage(chatId, "⚠️ Chưa thấy 'khoa' trong danh sách!\nNếu ông có chia phần thì thêm 'khoa' vào nhé.");
      return;
    }

    var soNguoi = nguoiTrongBill.length;
    var phanGoc = Math.round(tongTien / soNguoi);
    var phanDu = 0;

    var hangMucCaNhan = doHangMuc(moTaBill, keywordCaNhan);
    var hangMucChoMuon = doHangMuc(moTaBill, keywordChoMuon);

    var sheetChia = SpreadsheetApp.openById(sheetId).getSheetByName("to_nhap_lieu");
    var formattedDateChia = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy");
    var firstNewRow = sheetChia.getLastRow() + 1;
    var chiTietBill = moTaBill.charAt(0).toUpperCase() + moTaBill.slice(1) + " (tổng " + tongTien.toLocaleString('vi-VN') + "đ / chia " + soNguoi + ")";

    for (var i = 0; i < nguoiTrongBill.length; i++) {
      var nguoi = nguoiTrongBill[i];
      var phanLoaiBill = (nguoi === "Khoa") ? "Cá nhân" : "Cho mượn/ Ứng";
      var hangMucNguoi = (nguoi === "Khoa") ? hangMucCaNhan : hangMucChoMuon;
      var soTienNguoi = (nguoi === "Khoa") ? phanGoc + phanDu : phanGoc;
      sheetChia.appendRow([formattedDateChia, nguoi, phanLoaiBill, hangMucNguoi, chiTietBill, soTienNguoi, (nguoi === "Khoa")]);
    }

    scriptProperties.setProperty('lastEntryTime', new Date().getTime().toString());
    scriptProperties.setProperty('lastRowStart', firstNewRow.toString());
    scriptProperties.setProperty('rowsAdded', soNguoi.toString());

    var baoCaoBill = "✅ Đã chia bill: " + (moTaBill || "không tên") + "\n";
    baoCaoBill += "💰 Tổng: " + tongTien.toLocaleString('vi-VN') + "đ / " + soNguoi + " người\n";
    baoCaoBill += "━━━━━━━━━━━━━━\n";
    for (var i = 0; i < nguoiTrongBill.length; i++) {
      var n = nguoiTrongBill[i];
      var st = (n === "Khoa") ? phanGoc + phanDu : phanGoc;
      baoCaoBill += (n === "Khoa" ? "👤 " : "💳 ") + n + ": " + st.toLocaleString('vi-VN') + "đ\n";
    }
    sendMessage(chatId, baoCaoBill);
    return;
  }

  // KHỐI 3.5 — ĐƯỢC CHI TRẢ HỘ
  if (text.startsWith("/dctra ")) {
    var dctraText = text.substring(7).trim();
    var nguoiTra = "";
    var dctraNoiDung = dctraText;

    for (var i = 0; i < danhSachTen.length; i++) {
      var foundTen = false;
      for (var j = 0; j < danhSachTen[i].tuKhoa.length; j++) {
        var tuKhoaDctra = danhSachTen[i].tuKhoa[j];
        var afterTen = dctraText.substring(tuKhoaDctra.length);
        if (dctraText.startsWith(tuKhoaDctra) && (afterTen === "" || afterTen.startsWith(" "))) {
          nguoiTra = danhSachTen[i].tenHienThi;
          dctraNoiDung = afterTen.trim();
          foundTen = true;
          break;
        }
      }
      if (foundTen) break;
    }

    if (nguoiTra === "") {
      sendMessage(chatId, "❌ Không nhận diện được tên người trả!\nVD: /dctra việt tiền nước 26k");
      return;
    }
    if (nguoiTra === "Khoa") {
      sendMessage(chatId, "❌ Khoa không thể tự trả cho Khoa!");
      return;
    }

    var dctraMoneyMatch = dctraNoiDung.match(/(-?\s*\d+)\s*k(?=\s|$)/i) || dctraNoiDung.match(/(-?\s*\d+)(?=\s|$)/);
    if (!dctraMoneyMatch) {
      sendMessage(chatId, "❌ Không tìm thấy số tiền!\nVD: /dctra việt tiền nước 26k");
      return;
    }

    var dctraRaw = parseInt(dctraMoneyMatch[1].replace(/\s/g, ''));
    var dctraTong = (dctraMoneyMatch[0].toLowerCase().indexOf('k') !== -1 || Math.abs(dctraRaw) < 10000)
      ? dctraRaw * 1000 : dctraRaw;

    var dctraMoTa = dctraNoiDung.replace(dctraMoneyMatch[0], "").trim();
    dctraMoTa = dctraMoTa.replace(/^[-\s]+|[-\s]+$/g, "").trim();
    if (!dctraMoTa) dctraMoTa = "chi tiêu không tên";

    var dctraPhanKhoa = Math.round(dctraTong / 2);
    var dctraPhanNguoiTra = dctraTong - dctraPhanKhoa;

    var dctraHangMucKhoa = doHangMuc(dctraMoTa, keywordCaNhan);
    var dctraHangMucNguoi = doHangMuc(dctraMoTa, keywordChoMuon);

    var sheetDctra = SpreadsheetApp.openById(sheetId).getSheetByName("to_nhap_lieu");
    var formattedDateDctra = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy");
    var firstNewRowDctra = sheetDctra.getLastRow() + 1;
    var dctraChiTiet = dctraMoTa.charAt(0).toUpperCase() + dctraMoTa.slice(1) +
      " (tổng " + dctraTong.toLocaleString('vi-VN') + "đ / được " + nguoiTra + " trả)";

    sheetDctra.appendRow([formattedDateDctra, "Khoa", "Cá nhân", dctraHangMucKhoa, dctraChiTiet, dctraPhanKhoa, true]); // Cá nhân → dasThu = true
    sheetDctra.appendRow([formattedDateDctra, nguoiTra, "Cho mượn/ Ứng", dctraHangMucNguoi, dctraChiTiet, -dctraPhanNguoiTra, false]);

    scriptProperties.setProperty('lastEntryTime', new Date().getTime().toString());
    scriptProperties.setProperty('lastRowStart', firstNewRowDctra.toString());
    scriptProperties.setProperty('rowsAdded', "2");

    var dctraBaoCao = "✅ Đã ghi: " + dctraMoTa + " (được " + nguoiTra + " trả hộ)\n";
    dctraBaoCao += "💰 Tổng: " + dctraTong.toLocaleString('vi-VN') + "đ / 2 người\n";
    dctraBaoCao += "━━━━━━━━━━━━━━\n";
    dctraBaoCao += "👤 Khoa: +" + dctraPhanKhoa.toLocaleString('vi-VN') + "đ (chi tiêu cá nhân)\n";
    dctraBaoCao += "💳 " + nguoiTra + ": -" + dctraPhanNguoiTra.toLocaleString('vi-VN') + "đ (đã trả hộ)\n";
    sendMessage(chatId, dctraBaoCao);
    return;
  }

  // KHỐI 4 — GHI CHI TIÊU THƯỜNG (/t)
  if (!text.startsWith("/t ")) {
    sendMessage(chatId, "❓ Không hiểu lệnh này. Nhắn /help để xem hướng dẫn.");
    return;
  }
  text = text.substring(3).trim();

  var soTien = 0;
  var moneyMatch = text.match(/(-?\s*\d+)\s*k$/);
  if (moneyMatch) {
    soTien = parseInt(moneyMatch[1].replace(/\s/g, '')) * 1000;
    text = text.replace(moneyMatch[0], "").trim();
  } else {
    var numMatch = text.match(/(-?\s*\d+)$/);
    if (numMatch) {
      soTien = parseInt(numMatch[1].replace(/\s/g, ''));
      text = text.replace(numMatch[0], "").trim();
      if (Math.abs(soTien) < 10000) soTien = soTien * 1000;
    } else {
      sendMessage(chatId, "❌ Không tìm thấy số tiền!\n(VD: /t khoa ăn cơm 25, /t a hải taxi 50k)");
      return;
    }
  }

  var ten = "";
  for (var i = 0; i < danhSachTen.length; i++) {
    var matched = false;
    for (var j = 0; j < danhSachTen[i].tuKhoa.length; j++) {
      var tu = danhSachTen[i].tuKhoa[j];
      var afterKeyword = text.substring(tu.length);
      if (text.startsWith(tu) && (afterKeyword === "" || afterKeyword.startsWith(" "))) {
        ten = danhSachTen[i].tenHienThi;
        text = afterKeyword.trim();
        matched = true;
        break;
      }
    }
    if (matched) break;
  }

  var phanLoai = "";
  if (ten === "Khoa") phanLoai = "Cá nhân";
  else if (ten !== "") phanLoai = "Cho mượn/ Ứng";

  var hangMuc = "";
  if (phanLoai === "Cá nhân") hangMuc = doHangMuc(text, keywordCaNhan);
  else if (phanLoai === "Cho mượn/ Ứng") hangMuc = doHangMuc(text, keywordChoMuon);

  text = text.replace(/^[-\s]+|[-\s]+$/g, "").trim();
  var chiTiet = text.length > 0
    ? text.charAt(0).toUpperCase() + text.slice(1)
    : "Chi tiêu không tên";

  var date = new Date();
  var formattedDate = Utilities.formatDate(date, "GMT+7", "dd/MM/yyyy");
  var sheet = SpreadsheetApp.openById(sheetId).getSheetByName("to_nhap_lieu");
  var newRowIndex = sheet.getLastRow() + 1;
  sheet.appendRow([formattedDate, ten, phanLoai, hangMuc, chiTiet, soTien, (ten === "Khoa")]);

  scriptProperties.setProperty('lastEntryTime', new Date().getTime().toString());
  scriptProperties.setProperty('lastRowStart', newRowIndex.toString());
  scriptProperties.setProperty('rowsAdded', "1");

  var baoCaoTen = ten ? " [" + ten + "]" : "";
  var textBaoCao = "✅ Đã chốt" + baoCaoTen + ": " + chiTiet + " - " + soTien.toLocaleString('vi-VN') + "đ";

  if (phanLoai !== "") {
    if (hangMuc !== "") {
      textBaoCao += "\n🏷️ Phân loại: " + phanLoai + " ➡️ " + hangMuc;
    } else {
      textBaoCao += "\n⚠️ Phân loại: " + phanLoai + " (Chưa dò được Hạng mục, vui lòng tự điền!)";
    }
  } else {
    textBaoCao += "\n⚠️ Chưa phân loại (Không phát hiện tên người, vui lòng điền tay!)";
  }

  sendMessage(chatId, textBaoCao);
}

/* ============================================================
   HÀM sendMessage
   ============================================================ */
function sendMessage(chatId, text) {
  var url = "https://api.telegram.org/bot" + token + "/sendMessage";
  var payload = { "chat_id": String(chatId), "text": text };
  var options = {
    "method": "post",
    "contentType": "application/json",
    "payload": JSON.stringify(payload)
  };
  UrlFetchApp.fetch(url, options);
}

/* ============================================================
   NHẮC NHỞ HÀNG NGÀY 21H
   ============================================================ */
function sendDailyReminder() {
  var myChatId = "8764547523";
  sendMessage(myChatId, "Ei, nhớ nhanh lại hôm nay có chi tiền hay mua gì thì nhắn đê💸💸");
}

function setupDailyTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'sendDailyReminder') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  ScriptApp.newTrigger('sendDailyReminder')
    .timeBased().everyDays(1).atHour(21).nearMinute(0).create();
}
