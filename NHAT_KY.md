# Nhật Ký Phát Triển — App Chi Tiêu

Sổ ghi **vì sao** — không phải lý do kỹ thuật khô khan mà là lý do thật đằng sau mỗi quyết định —
để sau này bất kỳ ai (kể cả một AI khác, hoặc chính Khoa) cầm repo lên đều hiểu được mạch suy nghĩ,
không phải đoán mò.

- **CLAUDE.md** = hiến pháp ngắn: cách làm việc + cấu trúc + nguồn (đọc mỗi phiên).
- **NHAT_KY.md** (file này) = sổ công trình: kể lại từng quyết định + vì sao + bài học (tra khi cần).
- Mục mới thêm lên **trên cùng** (mới nhất trước).

Mỗi mục theo khung: **Vấn đề → Quyết định → Vì sao → Bài học/Rủi ro.**

---

## 2026-08-30 — Thống kê: % phải trên THU NHẬP, và "Tất cả năm" phải đọc đủ sổ

**Vấn đề (Khoa nêu, Codex chẩn, Claude soát lại tận dòng — cả 3 đúng):**

1. **% trả lời sai câu hỏi.** Khoa hỏi "ăn uống chiếm mấy phần lương tôi?", app lại trả lời "ăn
   uống chiếm mấy phần tiền tôi đã tiêu" — mỗi khối chia cho tổng của chính nó (`totalCaNhan` /
   `totalChoMuon`). Thu 10tr, tiêu 5tr (ăn 2, nhà 3) → app ghi ăn **40%**, nhà **60%**, cộng luôn
   tròn 100%. Chính cái 100% tròn trịa đó là dấu hiệu chia sai.
2. **"Tất cả năm" chỉ xem được 500 giao dịch.** Frontend xin `getRows limit=500`, backend còn chốt
   cứng `Math.min(limit, 500)` và lấy từ `last - limit + 1` — tức 500 dòng **mới nhất**, nên cắt
   đúng phần **cũ nhất**, im lặng không báo.
3. **Nửa trên và nửa dưới màn đọc hai quyển sổ khác nhau.** Cùng lúc đó `getStats` nhận `year=''`
   rồi backend tự đoán `p.year || năm hiện tại` → thẻ tổng chỉ cộng năm nay, trong khi khối hạng
   mục lấy 500 dòng vắt qua nhiều năm. Tử số một kỳ, mẫu số một kỳ.

**Quyết định:**

- Hai khối hạng mục chia cho `d.totalIncome` của **đúng kỳ đang xem**. Badge được phép vượt 100%
  (đó là cảnh báo thật: tiêu quá thu), nhưng bề rộng thanh kẹp `0..100%` để không tràn thẻ.
  Thu nhập `<= 0` → badge `—`, thanh `0%` (cấm NaN/Infinity). Thêm chú thích nhìn thấy được
  **"% trên thu nhập kỳ đang xem"** ở cả hai khối.
- Thêm **hợp đồng phạm vi `scope=all`** cho cả `getRows` và `getStats`. "Tất cả năm" phải nói rõ
  bằng cờ, KHÔNG dùng `year=''` để backend đoán. Caller cũ không truyền cờ thì hành vi y như trước
  (getRows giữ limit mặc định, getStats vẫn mặc định năm hiện tại) — không biến mọi màn thành tải
  toàn Sheet.
- `loadStats` chỉ vẽ từ cache khi **có đủ cặp** (tổng + rows), và không nuốt lỗi của `getRows` nữa.
- Công nợ vẫn chia trên tổng nợ; Tiết kiệm và "so tháng trước" giữ nguyên công thức. Bump `v58`.

**Vì sao làm vậy:**

- Chia trên tổng khối thì các % luôn cộng thành 100% — nó chỉ mô tả cơ cấu chi, không bao giờ trả
  lời được câu hỏi Khoa thật sự hỏi. Đổi **mẫu số**, giữ nguyên tử số và cách gom, nên không phải
  thiết kế lại công nợ.
- Cờ `scope=all` tường minh chặn được cả một lớp lỗi: hễ frontend im lặng thì backend đoán, mà mỗi
  API đoán một kiểu là hai nửa màn hình lệch nhau. Không đoán nữa thì không lệch được.
- Cache nửa vời rất dễ xảy ra: `cacheSet` nuốt lỗi hết quota localStorage im lặng, mà bộ all-years
  thì to. Thiếu rows mà vẫn vẽ = màn có thẻ tổng còn hạng mục trống trơn, nhìn như kỳ đó không tiêu
  gì — sai nguy hiểm hơn là báo lỗi.

**Bằng chứng:** `tests/stats.test.mjs` **44/44** (Node built-in, nạp và chạy chính `Code.gs` +
khối `<script>` của `index.html` trong `node:vm`, Sheet giả và DOM giả, `fetch` giả nối hai đầu —
không chép công thức vào test). Đã **thử phá 3 lần để chứng minh test không phải bù nhìn**: trả mẫu
số về tổng khối → đỏ 8 chỗ và tái hiện đúng con số 40%/60% cũ; trả frontend về `limit:'500'` → đỏ;
tắt `scope` ở backend → đỏ 4 chỗ, `Legacy` biến mất y như bệnh cũ.
`tests/stats.browser.js` **30/30** ở 320/393/412px bằng Chromium có sẵn (ảnh `tests/anh-qa/`).

**Bài học / Rủi ro:**

- **Đo DOM đạt không có nghĩa là mắt thấy đúng.** Lần chụp đầu ra nguyên màn splash mà 30 phép đo
  vẫn xanh: `go('stats')` tự gọi `loadStats()`, nó chạy sau và đè lên màn vẽ tay. Phải cắm fixture
  vào `window.fetch` rồi để app tự chạy đường thật, và luôn MỞ ẢNH RA NHÌN.
- `.screen` là `position:fixed; overflow-y:auto` → `fullPage: true` **không** với tới phần cuộn bên
  dưới; phải cuộn `#s-stats` rồi chụp nhịp hai.
- **Lỗi có sẵn, CHƯA sửa (ngoài phạm vi mẻ này):** ở 320px, số trong hai thẻ tổng bị cắt cụt khi
  tiền từ 8 chữ số trở lên (`numSize` chỉ hạ cỡ khi chuỗi ≥ 11 ký tự). Khối "Chi tiêu 7 ngày qua"
  đọc `S.rows` = rows **tháng hiện tại**, nên mấy ngày đầu tháng nó mất phần cuối tháng trước.
- **`pwa/Code.gs` trong repo ≠ bản đang chạy** (bẫy #4, `CLAUDE.md`): sửa xong phải dán tay vào
  Apps Script rồi sửa deployment CŨ → Phiên bản mới, nếu không thì "Tất cả năm" vẫn hỏng như cũ.

---

## 2026-07-26 — Thống kê: cột % lệch ra ngoài ở dòng có tên hạng mục dài

**Vấn đề:** Khoa chụp màn Thống kê trên điện thoại: dòng "Học tập/ Phát triển bản thân" có
`1.090.000 13%` **thò ra bên phải**, không thẳng hàng với cột % của 8 dòng còn lại (thanh tiến độ
của dòng đó cũng dài hơn). Chỉ lỗi thẩm mỹ, nhưng nhìn là thấy gợn.

**Nguyên nhân (đã đo, không đoán):** khối bọc mỗi dòng hạng mục là `<div class="flex-1">` — thiếu
`min-w-0`. Trong flexbox, một ô con mặc định **không được co nhỏ hơn nội dung tối thiểu của nó**
(`min-width:auto`). Tên hạng mục dài → ô đó tự nống rộng ra khỏi thẻ thay vì để tên bị cắt bớt →
số tiền + % bị đẩy lệch sang phải. Số đo ở bề rộng 380px: 8 dòng kết thúc tại x=343, riêng dòng
"Học tập" tại x=356,3 (thò 13,3px). Ở 320px thì 5/9 dòng lệch — càng màn hẹp càng loạn.

**Quyết định:** thêm `min-w-0` vào 3 chỗ trong `renderStats`/khối công nợ (Chi tiêu cá nhân, Cho
mượn/Ứng, dòng "Công nợ cần thu"). Ô co lại đúng phần được chia → tên dài bị cắt gọn bằng "…" như
thiết kế vốn định, cột % thẳng hàng tuyệt đối. Bump cache `chi-tieu-v56`. Không đụng logic JS.

**Kiểm:** dựng lại harness (đúng khối `<style>` + markup y hệt, 9 hạng mục thật trong ảnh Khoa gửi),
đo mép phải cột % ở 5 bề rộng 320/360/380/393/412px — trước: nhiều mốc khác nhau; sau: **9/9 dòng
cùng một mốc ở mọi bề rộng**. Chụp ảnh trước/sau đối chiếu.

**Bài học:** mục 16/07 cũng "kiểm mắt bằng harness" và kết luận *"cột %/số tiền thẳng hàng. Đạt"* —
nhưng harness hồi đó chạy ở cửa sổ rộng ~500px, chỗ mà lỗi **không xuất hiện**. Harness phải chạy ở
đúng bề rộng điện thoại (320–412px) và **đo bằng số**, chứ nhìn ảnh ở màn rộng thì lỗi ẩn kỹ.
Kèm theo: hễ dùng `flex-1` mà bên trong có chữ `truncate` thì **phải có `min-w-0`**, nếu không
`truncate` chỉ là trang trí.

---

## 2026-07-16 — Thống kê: bấm hạng mục để xổ chi tiết giao dịch + vá deploy.ps1 báo nhầm

**Vấn đề:** Màn Thống kê chỉ hiện tổng mỗi hạng mục; Khoa dùng thấy "thiếu thiếu" — muốn bấm vào
một mục (vd Tiền ăn) là xổ ra các giao dịch trong mục đó, giống dòng ở "Giao dịch gần đây".

**Quyết định (thuần frontend, không đụng Code.gs):**
- `renderStats` gom thêm `caRows`/`cmRows` = mảng giao dịch theo hạng mục (song song với map tổng đã
  có). Mỗi dòng hạng mục ở 2 khối (Chi tiêu cá nhân, Cho mượn/Ứng) thành **accordion**: bấm head →
  toggle class `open` trên `.stat-cat` (thuần CSS, `onclick="this.parentElement.classList.toggle('open')"`).
- Detail dùng `statRows` (cùng nguồn `getRows` với danh sách giao dịch) → nội dung khớp tổng, không
  gọi thêm API. Sắp mới→cũ. Cho mượn: khoản dương xanh, khoản trả (âm) đỏ → tổng detail = tổng mục.
- Thêm caret ▾ (xoay), số lượng giao dịch "·N" cạnh tên. Bump cache `chi-tieu-v55`.
- **Bẫy #1 đã kiểm:** mọi class mới (`gap-1`, `min-w-0`, `flex-shrink-0`, `text-gray-300/600`,
  `font-normal`) đều CÓ trong bộ utility tự viết — grep xác nhận từng cái, không có class chết.
- **Kiểm mắt:** dựng harness dùng đúng khối `<style>` + markup y hệt, chụp Chrome headless →
  accordion mở/đóng, caret xoay, tên dài truncate gọn, cột %/số tiền thẳng hàng. Đạt.

**Vá kèm — `deploy.ps1` báo "thành công" kể cả khi push HỎNG:** hôm nay deploy lần 1 im lặng thất
bại (máy sau reset chưa có danh tính git → bản tạm không commit được) nhưng script vẫn in "Deploy
thanh cong!". Đã thêm: (a) chặn sớm nếu repo chưa có `user.name/email` (in hướng dẫn set); (b)
`try/catch` + kiểm `$LASTEXITCODE` sau commit/push, hỏng thì báo đỏ + `exit 1`, không báo nhầm nữa.

**Bài học:** Dữ liệu để drill-down vốn đã có sẵn trong `statRows` — chỉ là chưa hiện ra. Accordion
thuần CSS (toggle class) an toàn hơn nhồi handler JS. Script deploy PHẢI kiểm mã lỗi, không thì một
lần push hỏng sẽ khiến người ta tưởng bản mới đã lên (đúng cái vừa suýt xảy ra).

---

## 2026-07-16 — Thống kê: thêm % tỷ trọng sau số tiền (Khoa yêu cầu)

**Vấn đề:** Màn Thống kê chỉ hiện số tuyệt đối; Khoa muốn biết mỗi hạng mục/mỗi người chiếm bao
nhiêu phần tổng để có góc nhìn tổng thể (thanh ngang có sẵn nhưng mắt không đọc ra con số).

**Quyết định:** Thêm nhãn % xám nhỏ ngay SAU số tiền ở 3 khối: Công nợ cần thu (% trên tổng nợ),
Chi tiêu cá nhân và Cho mượn/Ứng (% trên tổng khối). Nhãn bề rộng cố định 33px, canh phải → cột %
thẳng hàng giữa các dòng, cột số tiền không bị xô lệch. Dưới 1% hiện `<1%` thay vì `0%`.
Helper `pctBadge` nằm trong `renderStats`. Bump cache `chi-tieu-v54`.

**Vì sao đặt sau số tiền chứ không sau tên:** % là thuộc tính của con số, để cạnh số dễ so;
đặt sau tên sẽ vướng `truncate` khi tên dài. Dùng class `text-gray-500` CÓ SẴN + style inline
(tránh bẫy số 1: utility class tự viết, class lạ âm thầm vô tác dụng).

**Bài học:** % tỷ trọng vốn đã tính cho width thanh ngang (`pct`) — chỉ là chưa hiện ra chữ.
Thay đổi thuần frontend, không đụng Code.gs. (Kiểm bằng node: cú pháp cả khối script + thử
pctBadge với số thật từ màn hình Khoa chụp: 1.423.000/2.078.000 → 68%.)

---

## 2026-07-04 — Tổng kiểm tra an toàn dữ liệu (Khoa lo sau sự cố 404) → vá 2 lỗ hổng lõi

**Vấn đề:** Sau ~1 tháng chạy ổn rồi dính liền 2 sự cố (404 chập chờn, nửa giao dịch), Khoa lo ngại
độ tin cậy — app tài chính, sai âm thầm là mất tiền oan. Yêu cầu: rà toàn bộ.

**Kết quả rà (xếp theo độ nguy hiểm):**
1. **Sửa/Xóa/Tick-đã-thu tin mù quáng vào SỐ THỨ TỰ DÒNG** (`editRow`/`deleteRow`/`markCollected`
   nhận `rowIndex` và làm ngay). Nếu Sheet bị chèn/xóa dòng tay (Khoa hay thao tác trên PC) mà app
   đang cầm bản cũ → sửa/xóa/tick **NHẦM giao dịch khác**, không ai hay. Loại lỗi tệ nhất: sai âm thầm.
2. **Không có khóa chống ghi chồng**: `addSplit`/`addFronted` tính `firstRow = getLastRow()+1` rồi
   append nhiều dòng — 2 lệnh ghi đồng thời có thể chen dòng → `firstRow` sai → **Undo xóa nhầm dòng**.
3. (Đã vá v52) fronted 2 lệnh rời → nửa giao dịch. 4. (Đã vá v51) 404 → retry lệnh đọc.
5. (Ghi nhận, chưa sửa) Undo (`deleteRow` count>1) không xác minh nội dung — cửa sổ 60s, rủi ro thấp.
6. (Ghi nhận) Token cố định trong URL — ai có URL là đọc/ghi được dữ liệu → URL phải giữ kín như
   mật khẩu, không đăng ảnh chụp có URL đầy đủ.

**Quyết định (vá 1+2, cùng lần dán Code.gs với addFronted):**
- **Chốt xác minh nội dung:** app gửi kèm `verifyName`/`verifyAmount(s)` = tên + số tiền nó ĐANG
  thấy; backend so lại từng dòng TRƯỚC khi sửa/xóa/tick, lệch → từ chối toàn bộ + báo "đóng mở lại
  app". Fail-safe: thà bắt làm mới còn hơn sai âm thầm. Tương thích 2 chiều (backend cũ bỏ qua param
  lạ; frontend cũ không gửi thì backend mới bỏ qua kiểm).
- **LockService** cho mọi action ghi (`waitLock 15s`, release trong `finally`) → lệnh ghi xếp hàng,
  hết cảnh chen dòng.
- Đã mô phỏng logic chốt bằng node: từ chối đúng ca "Sheet dịch dòng", cho qua ca khớp + số âm.

**Bài học:** App tài chính phải thiết kế theo nguyên tắc "**xác minh trước khi phá hủy**" — định danh
bằng nội dung, đừng chỉ bằng vị trí. Hai sự cố tuần này đều chung một gốc: tin vào trạng thái cũ
(row index cũ, lệnh ghi tách đôi). Backend là bản dán tay → mọi vá backend chỉ có hiệu lực sau khi
DÁN LẠI `pwa/Code.gs` + Triển khai bản mới.

---

## 2026-07-04 — "Họ trả giúp" bị nửa giao dịch: gộp 2 dòng thành 1 lệnh atomic (addFronted)

**Vấn đề:** Ghi kiểu "Bạn nợ họ → Họ trả giúp" (móc treo 40k, Việt trả hộ) → hiện khoản CHI của Khoa
nhưng KHÔNG có khoản NỢ Việt. Nguyên nhân: đường `submit0` fronted gọi **2 lệnh addRow rời** (dòng 1
= Khoa chi Cá nhân; dòng 2 = Việt −40k Cho mượn). Lệnh 2 vấp 404 (xem mục trên) → chỉ ghi được dòng
1 → **nửa giao dịch**. Đã xác nhận `getDebts`/`renderDebts` cộng đúng khoản âm (mình nợ) → không phải
lỗi hiển thị, mà là dòng nợ chưa vào Sheet.

**Quyết định:** Thêm action backend **`addFronted`** ghi CẢ 2 dòng trong 1 lần chạy Apps Script →
atomic (một execution: hoặc cả hai `appendRow` chạy, hoặc không; kể cả khi phản hồi 404 thì 2 dòng
ĐÃ vào Sheet, dữ liệu vẫn nhất quán). Frontend gọi `addFronted`; nếu backend cũ trả `"Unknown action"`
thì fallback về 2 lệnh rời (giữ tương thích, KHÔNG vỡ máy chưa dán lại Code.gs). **Chỉ fallback khi
lỗi là "Unknown action"** — lỗi 404 KHÔNG fallback, tránh ghi trùng.

**Vì sao atomic ở backend chứ không retry ở frontend:** không thể retry an toàn lệnh ghi (đã vào Sheet
dù phản hồi lỗi → retry = trùng). Gộp vào 1 execution là cách duy nhất đảm bảo "cả hai hoặc không".
addSplit/addPaidBy vốn đã 1-lệnh nên an toàn; chỉ đường fronted trước đây lỡ tách 2 lệnh.

**Bài học:** Nhiều thao tác ghi phải-đi-cùng-nhau thì DỒN vào 1 lệnh backend, đừng chuỗi nhiều lệnh
từ client (mỗi lệnh là một lần phơi ra lỗi mạng, lại không atomic). Vận hành: **phải DÁN LẠI
`pwa/Code.gs`** vào Apps Script thì addFronted mới có tác dụng; chưa dán thì vẫn chạy kiểu cũ. Dữ liệu
"móc treo" nửa vời hiện tại: Khoa cần dọn tay (xóa khoản chi mồ côi rồi ghi lại, hoặc thêm khoản nợ Việt).

---

## 2026-07-04 — HTTP 404 chập chờn khi mở app: thêm thử-lại cho lệnh ĐỌC

**Vấn đề:** App báo "HTTP 404" khi ghi/đọc. Triệu chứng: 1 giao dịch ("móc treo") bị ghi TRÙNG 3 lần +
thẻ số dư hiện "---". Tức là lệnh GHI đã vào Sheet nhưng phản hồi 404 làm app tưởng lỗi → Khoa bấm Ghi
lại nhiều lần → trùng; và `getBalance` (lệnh đọc) cũng 404.

**Chẩn đoán:** Cùng một URL mà lúc được lúc 404 → KHÔNG phải URL sai (URL sai thì hỏng sạch). Đây là
404/302 chập chờn của Apps Script — hạ tầng Google hay lỗi tạm khi bị bắn nhiều request gần như đồng
thời lúc mở app (getConfig×2 + getRows + getBalance…). Lỗi phía server, không phải bug giao diện.

**Quyết định:** Thêm cơ chế thử-lại trong `api()` CHỈ cho lệnh ĐỌC (getConfig/getRows/getBalance/
getStats/getDebts/getPeople) — idempotent nên thử lại an toàn (2 lần, giãn 500ms/1s). Lệnh GHI GIỮ
nguyên 1 lần, KHÔNG tự thử lại (lệnh có thể đã vào Sheet dù phản hồi lỗi → thử lại sẽ ghi trùng, đúng
cái vừa xảy ra). Muốn ép thử lại thủ công thì truyền `{retry:n}`.

**Vì sao không tự thử lại lệnh GHI:** an toàn dữ liệu > tiện lợi. Ghi trùng khó dọn hơn là hiện lỗi để
người dùng tự bấm lại. Khoa cần xóa 2 dòng "móc treo" thừa.

**Bài học:** Web app Apps Script không chịu tải tốt khi nhiều request song song; client nên (a) thử
lại lệnh đọc, (b) TUYỆT ĐỐI không tự thử lại lệnh ghi không-idempotent. Về sau nếu vẫn trùng, cân
nhắc chống double-submit ở nút Ghi (khóa nút tới khi có phản hồi — hiện đã có setLoading nhưng lỗi
mạng vẫn mở lại nút).

---

## 2026-06-23 — Thêm nút Đăng xuất / Đổi URL (kèm xóa cache theo URL)

**Vấn đề:** Cài đặt chưa có chỗ thoát — URL Apps Script lưu trong localStorage, muốn đổi sang URL người
khác (xem dữ liệu họ) thì không có nút nào.

**Quyết định:** Thêm nút "Đăng xuất / Đổi URL kết nối" ở cuối sheet Cài đặt (bấm 2 lần, tự reset sau 3s).
`doLogout` xóa `apiUrl` + **toàn bộ key cache `ct_*`** rồi `location.reload()` → về màn nhập URL.

**Vì sao XÓA CẢ CACHE:** `cacheKey = 'ct_' + JSON.stringify(params)` — KHÔNG kèm URL. Nếu chỉ xóa
`apiUrl` rồi nhập URL người khác, các key cache trùng nhau → app **hiện nhầm dữ liệu người trước** cho
tới khi cache hết hạn (getRows 60s, getStats 5 phút…). Đây là lỗi rò rỉ dữ liệu chéo tài khoản, nên
logout phải dọn sạch cache. Dùng `location.reload()` cho chắc (init không thấy `apiUrl` → tự hiện màn
setup), tránh tự bật/tắt từng màn dễ sót trạng thái.

**Bài học:** Cache key nên gắn danh tính nguồn (URL/tài khoản) nếu app có thể đổi nguồn. Ở đây chọn
cách đơn giản & an toàn hơn: đổi nguồn = xóa sạch cache. (Chưa kiểm thử click được vì preview cần URL
Apps Script thật để vào app; đã kiểm cú pháp JS.)

---

## 2026-06-23 — Gỡ di sản "nhập nhanh" (quickAdd) + bỏ cột Từ khóa của danh_sach_ten

**Vấn đề:** Khoa đã bỏ chức năng "điền tên nhanh" (nhập kiểu bot "khoa ăn cơm 35") khỏi giao diện, muốn
xóa cột B "Từ khóa tắt" của tab `danh_sach_ten` cho gọn. Kiểm tra: cột B CHỈ phục vụ `quickAdd`; ô
input `quick-inp` đã không còn trong HTML (UI đã gỡ), nhưng CODE còn rác: `doQuickAdd` (frontend chết,
trỏ tới phần tử không tồn tại), case `quickAdd` (backend không ai gọi), và `addPerson` vẫn ghi 1 từ
khóa vào cột B mỗi lần thêm người → xóa cột xong vẫn "mọc lại".

**Quyết định:** (1) Xóa `doQuickAdd` (index.html). (2) Xóa case `quickAdd` (Code.gs). (3) `addPerson`
chỉ `appendRow([name])`, không ghi cột B nữa. Giữ `loadPeople`/`autoHM` (autoHM vẫn dùng cho
addSplit/addPaidBy; loadPeople đọc 2 cột vẫn an toàn — cột B rỗng → keys=[], không ai đọc keys nữa).

**Vì sao:** Frontend chỉ lấy TÊN người (cột A); cột B (keys người) chỉ quickAdd đọc → quickAdd chết thì
cột B = dữ liệu chết. Phải dọn `addPerson` nếu không cột B tái sinh. Không xóa nhầm `autoHM` (đó là dò
từ khóa HẠNG MỤC, khác keys NGƯỜI).

**Bài học:** Gỡ một tính năng phải truy ĐỦ chuỗi phụ thuộc: UI (đã gỡ) → handler JS (doQuickAdd) →
action backend (quickAdd) → cột dữ liệu (B) → nơi GHI vào cột đó (addPerson). Bỏ sót `addPerson` thì
cột rác cứ quay lại. Lưu ý vận hành: backend `Code.gs` chạy bản dán tay → muốn `addPerson` thôi ghi
cột B trong app THẬT thì phải DÁN LẠI `pwa/Code.gs`; chưa dán lại thì cứ thêm người bằng cách gõ thẳng
cột A trong Sheet (cũng giữ cột B sạch).

---

## 2026-06-23 — Sửa auto-chọn hạng mục: lệch tên trường keys ↔ keywords + chuẩn hóa Unicode

**Vấn đề:** Gõ "lẩu" trong màn Ghi chi tiêu (mà "lẩu" có trong từ khóa "Tiền ăn" ở Sheet) nhưng chip
hạng mục KHÔNG tự sáng. Lỗi với MỌI từ khóa, không riêng "lẩu".

**Quyết định:** (1) Frontend `applyConfig` đọc từ khóa sai trường: backend `getConfig` trả mỗi hạng
mục có `keys` (MẢNG) nhưng `mk` lại đọc `c.keywords` → luôn rỗng → `autoHM` không có gì để dò, rớt về
so theo TÊN hạng mục (gõ "lẩu" không khớp "Tiền ăn"). Sửa `mk` đọc `c.keys` (join thành chuỗi). (2)
Thêm `.normalize('NFC')` cho cả từ khóa lẫn chữ người dùng gõ — bàn phím tiếng Việt trên điện thoại
hay xuất ký tự tổ hợp (NFD) lệch mã với chữ dựng sẵn (NFC) lưu trong Sheet, khiến `includes` trượt dù
nhìn giống hệt.

**Vì sao:** Đây là lỗi "âm thầm" kinh điển do hai đầu (Apps Script ↔ JS) đặt tên trường khác nhau —
`undefined` không báo lỗi, chỉ lặng lẽ thành rỗng. Backend `quickAdd` vẫn tự phân loại đúng vì nó
dùng `keys` server-side; chỉ chip auto-sáng ở client hỏng → đúng triệu chứng Khoa thấy.

**Bài học:** Khi frontend đọc dữ liệu từ backend, phải khớp ĐÚNG tên trường (ở đây `keys`, không phải
`keywords`). Và mọi so khớp chuỗi tiếng Việt nên `normalize('NFC')` hai phía. Đã test mô phỏng 6 input
(lẩu/cơm/phở/bún bò/wifi nhà/trọ tháng 6) → khớp đúng hạng mục.

---

## 2026-06-23 — Chuẩn hóa tên hạng mục trong dữ liệu cũ (script chạy một lần)

**Vấn đề:** Gốc của loạt lỗi xếp-ô/icon hôm trước là tên hạng mục trong DỮ LIỆU (`to_nhap_lieu`) lệch
danh sách chuẩn (`hang_muc`) — vd dữ liệu "Tiền mua sắm, đồ dùng cá nhân" vs chuẩn "Mua sắm, đồ dùng";
còn có 2 tên cho cùng 1 thứ ("Gym, thể thao, TPBS" và "Tiền gym, thể thao, TPBS"). App đã được làm
"chịu lệch" (tách theo cột Phân loại + tra icon theo độ trùng từ), nhưng Khoa muốn dọn DỮ LIỆU cho
sạch hẳn — cần cho dài hạn.

**Quyết định:** Viết `tools/chuan-hoa-hang-muc.gs` — script Apps Script chạy MỘT LẦN, hướng chuẩn hóa
= **sửa dữ liệu cũ cho khớp `hang_muc`** (vì `hang_muc` là danh sách app dùng tạo chip nhập; dữ liệu
mới đã tự khớp). Quy trình AN TOÀN 2 bước: `xemTruocChuanHoa()` ghi đề xuất "tên cũ → tên mới" vào
tab tạm `_xem_truoc_chuan_hoa` để Khoa DUYỆT; ưng mới chạy `apDungChuanHoa()`. Khớp bằng độ-trùng-từ
TRONG CÙNG phân loại, chỉ đổi khi trùng ≥ nửa số từ của tên chuẩn; tên lạ không hợp → giữ nguyên.
Chỉ đụng cột Hạng mục, không đụng số tiền/phân loại/công nợ.

**Vì sao:** Sửa dữ liệu thật là việc khó lùi → bắt buộc có bước xem-trước + nhắc Khoa rằng Google
Sheet có "Lịch sử phiên bản" để hoàn tác. Hướng dữ-liệu→chuẩn là điểm hội tụ tự nhiên (gộp luôn tên
trùng). Script chạy bằng SHEET_ID/TAB_* sẵn có trong Code.gs nên chỉ cần dán vào cùng project.

**Bài học:** Đây là hệ quả của việc data lưu hạng mục bằng CHUỖI (không phải ID) → đổi tên ở config
là lệch ngay. App đã "chịu lệch" để luôn hiển thị đúng, nhưng muốn data sạch thì thi thoảng chạy lại
script chuẩn hóa này sau khi đổi tên hạng mục. File để trong `tools/` (thư mục này tái xuất hiện chỉ
để chứa công cụ ops chạy tay, KHÔNG deploy lên app).

---

## 2026-06-22 — Thống kê: tách Cá nhân/Cho mượn theo CỘT PHÂN LOẠI (sửa tận gốc) + bật lại biểu đồ 7 ngày

**Vấn đề:** Sau bản v43, mấy hạng mục cá nhân của Khoa (Tiền trọ/điện nước sinh hoạt, Đi lại đổ xăng
cơ bản, Học tập, Tiền mua sắm, Tiền gym, Giải trí…) lại "nhảy" sang ô **Cho mượn/Ứng** — sai ô.
Gốc: TÊN hạng mục trong dữ liệu lệch danh sách config (thêm chữ "Tiền…", "…sinh hoạt", thiếu khoảng
trắng) nên mọi cách so-theo-tên đều xếp nhầm.

**Quyết định:**
1. **Bỏ hẳn việc đoán theo tên.** Màn Thống kê lấy thêm các DÒNG đúng kỳ đang xem (`getRows` theo
   tháng/năm; "Tất cả năm" → xin tối đa 500 dòng gần nhất), rồi tách 2 nhóm theo **cột Phân loại
   thật** (`r.category`: "Cá nhân" vs "Cho mượn/ Ứng"), gom theo hạng mục. Không phụ thuộc danh sách
   config nữa → không thể xếp nhầm/rơi mất.
2. **Bật lại biểu đồ "Chi tiêu 7 ngày qua".** Điều kiện cũ `caSet.has(r.category)` so Phân loại với
   tên hạng mục → LUÔN sai → biểu đồ chưa từng hiện. Sửa thành `r.category === 'Cá nhân'`.
3. Bỏ `byCat`/`caNhanNames`/`caSet` (không còn dùng).

**Vì sao:** Cột Phân loại là NGUỒN SỰ THẬT do chính app ghi lúc nhập (chủ app→Cá nhân, người khác→Cho
mượn). Tên hạng mục thì người dùng tự đặt, hay lệch — lấy nó làm khóa phân loại là sai về bản chất.
Cách mới chạy NGAY, **không cần dán lại Code.gs** (backend `getStats`/`getRows` giữ nguyên). Lưu ý:
"Tất cả năm" với >500 giao dịch thì phần bóc tách lấy 500 dòng gần nhất (tổng dòng tiền vẫn đủ vì lấy
từ `getStats`).

**Bài học:** Phân loại dữ liệu phải dựa trên TRƯỜNG dữ liệu có cấu trúc (cột Phân loại), KHÔNG suy ra
từ chuỗi người dùng tự gõ. Bản v43 ("không-phải-cá-nhân") chỉ chữa phần ngọn và bị thay bởi bản này.

**Nối tiếp (v45 — icon hạng mục):** Sau khi tách đúng ô, icon hạng mục lại toàn hiện 📌 (gim). Lý do
y hệt gốc trên: tên hạng mục trong DỮ LIỆU lệch tên trong CONFIG (vd config "Mua sắm, đồ dùng" / dữ
liệu "Tiền mua sắm, đồ dùng cá nhân"; config "Đi lại, đổ xăng" / dữ liệu "…cơ bản") nên tra emoji
đòi-khớp-đúng-tên bị trượt. Sửa: hàm `statEmoji(tên, danh_sách_nhóm)` chọn hạng mục config **trùng
NHIỀU TỪ nhất** trong đúng nhóm (Cá nhân/Cho mượn) → chịu được thừa/thiếu chữ. Đã test 9 tên thật:
tra đúng 100% (kể cả "Giải trí, cf, ăn uống bạn bè" → ☕). Bài học: khi đối chiếu tên do người dùng
tự gõ, dùng **so trùng từ** thay vì so bằng tuyệt đối.

---

## 2026-06-22 — 3 sửa nhỏ phần Công nợ & Thống kê (tick từng khoản, format số, chống rơi hạng mục)

**Vấn đề:** (1) Bấm "Đã thu rồi" đánh dấu CẢ CỤM khoản — nhưng thực tế người ta hay trả trước một
phần (nợ 30 khoản, mới trả 15). (2) Chuỗi mô tả khoản chia bill ghi số liền `108000đ` thay vì
`108.000`. (3) Khoa nghi biểu đồ Thống kê "thiếu hạng mục".

**Quyết định:**
1. **Tick từng dòng:** mỗi khoản trong sheet chi tiết công nợ có checkbox (mặc định tick hết); chỉ
   khoản được tick mới `markCollected`. Không tick gì → báo lỗi.
2. **Format số trong detail:** `Code.gs` thêm dấu chấm + bỏ "đ" khi sinh chuỗi (`addSplit`,
   `addPaidBy`). Thêm `fmtDetail()` ở frontend áp vào 4 chỗ HIỂN THỊ → fix luôn dữ liệu CŨ đã lưu
   trong Sheet (không sửa được từng dòng trong Sheet, nên fix lúc render).
3. **Chống rơi hạng mục ở Thống kê:** nhóm "Cho mượn/Ứng" đổi từ "khớp đúng `HM_CHO_MUON`" sang
   "mọi hạng mục KHÔNG phải cá nhân". Bỏ biến thừa `choMuonNames`.

**Vì sao:** (3) là lỗi tiềm ẩn thật: biểu đồ tách Cá nhân/Cho mượn bằng cách so tên hạng mục với
DANH SÁCH CONFIG. Hạng mục bị đổi tên / xóa khỏi tab `hang_muc` / lệch khoảng trắng sẽ khớp KHÔNG
nhóm nào → âm thầm biến mất khỏi biểu đồ dù tiền vẫn cộng vào tổng. Lấy "phần bù của Cá nhân" làm
nhóm Cho mượn → partition đầy đủ, không khoản nào rơi mất. Lưu ý: nếu config sạch thì hiển thị Y HỆT
trước — đây là lưới an toàn, không phải thứ "thêm hạng mục"; nghĩa là nếu Khoa thấy ít hạng mục thì
đúng là tháng đó chỉ chi vào bấy nhiêu hạng mục thật.

**Bài học:** Biểu đồ chỉ liệt kê hạng mục CÓ chi tiêu trong tháng, sắp xếp giảm dần, KHÔNG cap số
lượng (khác với block "Công nợ cần thu" cố tình `slice(0,4)`). `Code.gs` trong repo đã sửa nhưng
Apps Script chạy bản dán tay → lần mở Apps Script tiếp theo phải dán lại `pwa/Code.gs` mới có format
số cho dữ liệu MỚI (dữ liệu cũ đã được `fmtDetail` lo khi hiển thị).

---

## 2026-06-22 — Lập mô hình "sếp–nhân viên" & dọn di sản khỏi repo

**Vấn đề:** Khoa giải thích lý do sâu xa của việc viết CLAUDE.md/NHAT_KY.md: Khoa học kinh tế, không
biết code, nhưng muốn *hiểu cái mình làm ra* và *nắm cốt lõi cách Claude hoạt động* — như một người
sếp biết năng lực nhân viên. Đồng thời nhờ kiểm tra & dọn các repo trên máy.

**Quyết định:**
1. Chốt **nguyên tắc làm việc** vào CLAUDE.md: việc dọn dẹp/sửa lỗi hợp lý thì Claude cứ chủ động làm,
   không hỏi vặt, ĐỔI LẠI phải ghi "làm gì + vì sao" vào NHAT_KY.md. Repo chưa đủ context thì chỉ
   kiểm tra + báo cáo, không tự sửa.
2. **Khảo sát 4 repo trên máy:** `app-chi-tieu` (đang làm), `lehai-tools`, `company-os`,
   `fb-auto-post`. Ba repo sau đều sạch & đã push, RIÊNG `fb-auto-post` đang sửa dở 1 file
   (`src/main.action.js`) → **không đụng** (việc dở của dự án khác).
3. **Dọn `app-chi-tieu`:** gỡ `demo_ui.html`, `apps_script/` (bot Telegram cũ), `flutter_app/` (12
   file Flutter bỏ dở) — đã grep xác nhận `pwa/` không tham chiếu gì tới chúng.

**Vì sao:** Repo này giờ thuần PWA; giữ đám di sản chỉ làm rối người đọc (nhất là người không rành
code muốn nắm cốt lõi). Git history vẫn lưu vĩnh viễn nên gỡ là **không mất gì** — khôi phục bằng
`git log`/`git checkout` bất cứ lúc nào. Không tự sửa repo khác vì sửa ẩu khi thiếu context dễ làm
hỏng dự án của Khoa — rủi ro lớn hơn lợi ích của việc "dọn cho gọn".

**Bài học:** Tài liệu md không phải thủ tục hành chính mà là **giao diện để sếp giám sát & học** —
nên ưu tiên kể "vì sao" dễ hiểu hơn là liệt kê kỹ thuật. Mỗi việc tự quyết → 1 dòng mạch lạc ở đây.

---

## 2026-06-22 — Dọn Netlify, chốt GitHub Pages là nguồn duy nhất, lập tài liệu

**Vấn đề:** Repo còn dấu vết Netlify (`netlify.toml`, folder `.netlify`) dù app đã chuyển sang GitHub
Pages từ lâu. Khoa lo "mất repo này là app chết?" và chưa có tài liệu kiến trúc để đọng lại.

**Quyết định:** Gỡ sạch Netlify; gỡ luôn bộ công cụ snapshot cũ (`snapshot.html`, `_gen-snapshot.js`,
`tools/*`) đã ngưng dùng; viết `CLAUDE.md` + `NHAT_KY.md` theo mẫu repo `lehai-tools`.

**Vì sao:** Phải tách bạch rõ **CODE (GitHub)** vs **DỮ LIỆU (Google Sheet mỗi người)**. Mất GitHub
thì *giao diện* sập (dùng chung 1 link nên ảnh hưởng mọi user) nhưng *dữ liệu* an toàn ở Google và
code khôi phục được (có 3 bản: local + master + gh-pages). Một nguồn deploy duy nhất (gh-pages) tránh
lẫn lộn như thời còn cả Netlify lẫn Pages.

**Bài học:** GitHub = điểm chết của GIAO DIỆN, KHÔNG phải của dữ liệu. Backup dữ liệu thật = export
Google Sheet / bật version history. Mỗi user nên 1 Sheet riêng để độc lập.

---

## 2026-06-22 — Loạt lỗi do CSS utility tự viết & nút không kế thừa font

**Vấn đề:** (1) Thanh "Tiết kiệm" khi ≥20% hiện trắng/trống. (2) Chữ trên nút ("Ghi chi tiêu", nhãn
nav) nhìn khác font phần còn lại.

**Quyết định:** (1) Thanh tiết kiệm dùng màu **inline** (`#2FD49B`/`#fbbf24`) thay class. (2) Thêm
rule toàn cục `button,input,select,textarea{font-family:inherit}`.

**Vì sao:** (1) App KHÔNG dùng Tailwind CDN mà là **bộ utility class tự viết** — `bg-emerald-500`
chưa được định nghĩa (chỉ có `-600`) nên fill mất màu, âm thầm hỏng MỌI tháng tiết kiệm ≥20%. (2)
Thẻ `<button>` mặc định của trình duyệt KHÔNG kế thừa `font-family` → mọi nút render bằng Arial.

**Bài học:** Đây là 2 cái bẫy đặc trưng của repo (đã đưa vào CLAUDE.md). Sửa UI app này: đừng tin
class kiểu Tailwind nào cũng có — grep kiểm tra, hoặc dùng `style` inline. Việc nhỏ (1 dòng CSS) mà
làm cả app sạch hơn — Khoa tinh mắt phát hiện font sai.

---

## 2026-06-21..22 — Áp ngôn ngữ thiết kế mới (lọc từ bản Claude Design)

**Vấn đề:** Giao diện cần hiện đại/premium hơn. Claude Design gửi mockup đẹp nhưng **lẫn nhiều chức
năng CŨ đã bỏ** (3 nút thao tác, thẻ số dư kiểu mini-card). Có lần áp nguyên si → "hồi sinh" tính
năng đã gỡ, Khoa phải báo sửa lại.

**Quyết định:** Chỉ lấy phần **VISUAL thuần**: font Plus Jakarta Sans, hệ màu tím/mint/coral, 2 thẻ
tổng ở Thống kê, Dòng tiền dạng danh sách dọc, biểu đồ "Chi tiêu 7 ngày qua" (tính client-side từ
`S.rows`), blob glow tạo chiều sâu cho thẻ Công nợ, icon hạng mục cho avatar giao dịch, **bỏ hết
đơn vị "đ"**, thiết kế lại splash + nút "Ghi chi tiêu" + logo (ví tím). KHÔNG bê lại cấu trúc cũ.

**Vì sao:** Quy tắc vàng — chức năng đã hoàn thiện, chỉ đổi giao diện. Mockup dựng trên bản app cũ
nên dễ kéo theo tính năng đã gỡ.

**Bài học:** Khi áp design ngoài, phân loại "visual thuần (an toàn)" vs "cấu trúc (phải kiểm)". Các
hàm `renderBalance/renderRows/renderDebts/renderStats` ghi thẳng vào DOM có id cố định → đổi cấu trúc
HTML dễ làm `getElementById` trả null → crash. Biểu đồ 7 ngày tự tính từ `S.rows` nên KHÔNG cần đụng
backend Apps Script.

---

## 2026-06-22 — Splash xám & icon cũ dù đã deploy (WebAPK không tự cập nhật)

**Vấn đề:** Đổi splash sang nền tối + đổi logo, deploy xong nhưng điện thoại Khoa vẫn màn xám/icon cũ.

**Quyết định:** Manifest để `background_color` tối + icon full-bleed maskable; báo Khoa phải **gỡ app
& cài lại**. Mỗi đổi UI đều bump `chi-tieu-vNN` trong `sw.js`.

**Vì sao:** Android sinh **WebAPK** (icon + splash) tại thời điểm CÀI, không tự đổi theo manifest mới.
Service worker cũng cache bản cũ. → Người dùng đã cài phải cài lại mới thấy icon/splash mới.

**Bài học:** Ghi cứng vào CLAUDE.md (mục "Hai cái bẫy"): đổi UI → bump cache; đổi icon/splash → cài
lại. Splash trong app (`#splash` HTML) thì cập nhật ngay theo deploy, nhưng splash *native* của
Android thì không.

---

## (Các phiên trước) — Vì sao PWA, vì sao tách khỏi bot Telegram

**Vấn đề:** Có sẵn bot Telegram quản lý chi tiêu nhưng muốn một app riêng, đẹp, dễ dùng trên điện thoại.

**Quyết định:** Tách hẳn thành dự án độc lập (bot Telegram cũ vẫn chạy riêng). Bỏ hướng Flutter, chọn
**PWA**. Mỗi người dùng tự deploy 1 Google Apps Script + 1 Google Sheet riêng.

**Vì sao:** PWA deploy bằng cách đẩy file tĩnh, auto-update cho mọi người qua service worker, không
cần lên store. Sheet/Apps Script riêng từng người = dữ liệu độc lập, cá nhân hóa (tên người, hạng
mục) mà không phải sửa code. Backend tự tạo + seed Sheet lần đầu để onboard nhẹ.

**Bài học / nợ kỹ thuật:** `flutter_app/` và `apps_script/` (bot cũ) là di sản — giữ trong repo nhưng
KHÔNG dùng cho PWA. Backend chạy bằng bản dán tay vào Apps Script IDE → không tự sync với `Code.gs`
trong repo; onboard người mới phải dán đúng `pwa/Code.gs` rồi deploy.
