# App Chi Tiêu — PWA quản lý chi tiêu & công nợ cá nhân

## Cách làm việc

- Xưng hô: **ông** (Claude) / **tôi** (Khoa) — luôn luôn.
- Giải thích như báo cáo cho sếp không chuyên IT — tránh jargon kỹ thuật.
- Đưa khuyến nghị rõ ràng, không liệt kê options trung lập.
- **Quy tắc vàng:** chỉ thay GIAO DIỆN, **không phá logic JS / chức năng đã hoàn thiện**. Khi áp
  thiết kế từ ngoài (vd Claude Design): tách "visual thuần (an toàn)" vs "cấu trúc (phải kiểm)".

## Tài liệu

- **CLAUDE.md** (file này) = hiến pháp ngắn: cách làm việc + cấu trúc + con trỏ. Đọc mỗi phiên — giữ gọn.
- **[NHAT_KY.md](NHAT_KY.md)** = nhật ký phát triển: vì sao đằng sau mỗi quyết định + bài học. Mỗi
  thay đổi đáng kể → ghi 1 mục (Vấn đề → Quyết định → Vì sao → Bài học). Mục mới lên **trên cùng**.

## Mục đích

App PWA quản lý **chi tiêu cá nhân + công nợ** (ai nợ mình, mình nợ ai). Mỗi người dùng có **Google
Sheet + Google Apps Script riêng** → dữ liệu độc lập, cá nhân hóa qua Sheet (tên người, hạng mục).
Phạm vi đã chốt: **nhập liệu + theo dõi + công nợ**. Hoạch định/định mức → user tự làm bằng Sheet.

---

## Kiến trúc

```
app_chi_tieu/
├── CLAUDE.md
├── NHAT_KY.md
├── deploy.ps1            ← deploy: copy pwa/* → force-push nhánh gh-pages
├── pwa/
│   ├── index.html        ← TOÀN BỘ frontend (HTML + CSS + JS trong 1 file, vanilla, dark theme)
│   ├── Code.gs           ← backend Google Apps Script (mỗi user tự deploy bản riêng)
│   ├── sw.js             ← service worker, cache "chi-tieu-vNN"
│   ├── manifest.json     ← PWA manifest (icon, theme tối, maskable)
│   └── icon-192/512.png  ← logo (ví tím gradient, full-bleed maskable)
├── flutter_app/          ← DI SẢN, không dùng
└── apps_script/          ← DI SẢN bot Telegram cũ, không dùng
```

**Frontend** (`pwa/index.html`): JS render mọi thứ lúc chạy (đưa URL app cho công cụ không chạy JS
sẽ chỉ thấy vỏ trống). Font **Plus Jakarta Sans**. Hàm render then chốt ghi thẳng vào DOM cố định:
`renderBalance` (id `card-total`,`bar-avail`,`leg-*`...), `renderRows`, `renderDebts` (id `debt-net`
...), `renderStats` (id `stats-content`) → **xóa/đổi id các phần tử này = crash**.

**Backend** (`pwa/Code.gs`, API_VERSION 2): Web App, mỗi user tự deploy (Execute as Me, Anyone),
điền SHEET_ID. Token `chi_tieu_app_secret_2024`. Tự tạo + seed Sheet lần đầu (getConfig). Sheet 3 tab;
tab `to_nhap_lieu` cột: **Ngày | Tên | Phân loại | Hạng mục | Chi tiết | Số tiền | Đã thu | Ngày thu**.
**Dòng 2 của tab `danh_sach_ten` = chủ app (OWNER)**, app xoay theo.

---

## ⚠️ Hai cái bẫy phải nhớ

1. **CSS = bộ utility class TỰ VIẾT, KHÔNG phải Tailwind đầy đủ.** Chỉ một số class màu được định
   nghĩa (vd có `bg-emerald-600`, KHÔNG có `bg-emerald-500`). Class chưa định nghĩa = vô tác dụng,
   âm thầm hỏng (đã từng làm thanh tiết kiệm mất màu). → Grep kiểm tra class trước khi dùng, hoặc
   dùng `style` inline cho chắc.
2. **App đã cài KHÔNG tự cập nhật icon/splash.** Android chốt WebAPK (icon + splash) lúc CÀI. Đổi
   icon/splash → người dùng phải **gỡ app & cài lại** mới thấy. Và **mỗi lần đổi UI BẮT BUỘC bump
   `chi-tieu-vNN` trong `sw.js`**, không service worker phục vụ bản cũ.

---

## Nguồn / vị trí (source of truth)

- **GitHub `tankfire4-dot/app-chi-tieu` = nguồn chính của GIAO DIỆN.** `master` = source code;
  `gh-pages` = bản chạy live tại `https://tankfire4-dot.github.io/app-chi-tieu/`.
- **`C:\Users\tankf\Desktop\app_chi_tieu`** = bản làm việc trên máy. Sửa ở đây → commit master → deploy.
- **Google Sheet + Apps Script của mỗi user = DỮ LIỆU.** KHÔNG nằm ở GitHub. Mất GitHub → giao diện
  sập (khôi phục được vì code có ở local + master + gh-pages) nhưng **dữ liệu vẫn an toàn** ở Google.

## Quy trình đổi giao diện

1. Sửa `pwa/index.html` (và/hoặc CSS, JS) trên máy.
2. **Bump cache** `chi-tieu-vNN` trong `pwa/sw.js`.
3. `.\deploy.ps1` → đẩy `pwa/*` lên `gh-pages`.
4. `git add` + commit + push lên `master` (giữ source đồng bộ với bản chạy).
5. Người dùng đóng/mở lại app 1–2 lần để service worker nhận bản mới.
