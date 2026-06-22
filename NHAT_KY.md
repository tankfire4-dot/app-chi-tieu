# Nhật Ký Phát Triển — App Chi Tiêu

Sổ ghi **vì sao** — không phải lý do kỹ thuật khô khan mà là lý do thật đằng sau mỗi quyết định —
để sau này bất kỳ ai (kể cả một AI khác, hoặc chính Khoa) cầm repo lên đều hiểu được mạch suy nghĩ,
không phải đoán mò.

- **CLAUDE.md** = hiến pháp ngắn: cách làm việc + cấu trúc + nguồn (đọc mỗi phiên).
- **NHAT_KY.md** (file này) = sổ công trình: kể lại từng quyết định + vì sao + bài học (tra khi cần).
- Mục mới thêm lên **trên cùng** (mới nhất trước).

Mỗi mục theo khung: **Vấn đề → Quyết định → Vì sao → Bài học/Rủi ro.**

---

## 2026-06-22 — Lập mô hình "sếp–nhân viên" & dọn di sản khỏi repo

**Vấn đề:** Khoa giải thích lý do sâu xa của việc viết CLAUDE.md/NHAT_KY.md: Khoa học kinh tế, không
biết code, nhưng muốn *hiểu cái mình làm ra* và *nắm cốt lõi cách Claude hoạt động* — như một người
sếp biết năng lực nhân viên. Đồng thời nhờ kiểm tra & dọn các repo trên máy.

**Quyết định:**
1. Chốt **nguyên tắc làm việc** vào CLAUDE.md: việc dọn dẹp/sửa lỗi hợp lý thì Claude cứ chủ động làm,
   không hỏi vặt, ĐỔI LẠI phải ghi "làm gì + vì sao" vào NHAT_KY.md. Repo chưa đủ context thì chỉ
   kiểm tra + báo cáo, không tự sửa.
2. **Khảo sát 4 repo trên máy:** `app_chi_tieu` (đang làm), `lehai-tools`, `Company_OS`,
   `fb-auto-post`. Ba repo sau đều sạch & đã push, RIÊNG `fb-auto-post` đang sửa dở 1 file
   (`src/main.action.js`) → **không đụng** (việc dở của dự án khác).
3. **Dọn `app_chi_tieu`:** gỡ `demo_ui.html`, `apps_script/` (bot Telegram cũ), `flutter_app/` (12
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
