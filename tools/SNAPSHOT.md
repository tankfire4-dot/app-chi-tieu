# Snapshot giao diện cho Claude Design

Claude Design **không chạy JavaScript**, nên nếu đưa nó URL app thật (PWA) nó chỉ
thấy vỏ HTML trống rồi tự bịa ra giao diện. Giải pháp: sinh một bản **HTML tĩnh đã
render sẵn** — số liệu nằm thẳng trong markup, không còn JS phải chạy — để Claude
Design hiển thị đúng app mới nhất.

## Cách sinh lại (mỗi khi sửa giao diện xong)

```bash
# lần đầu: cài headless browser runner (không kèm Chromium, dùng Chrome có sẵn)
npm install --no-save puppeteer-core

# mỗi lần sửa xong:
node tools/gen-snapshot.mjs
```

Kết quả:
- `pwa/snapshot.html` — file tĩnh, đưa cho Claude Design (commit + deploy → có URL).
- `snapshot-preview.png` — ảnh 4 màn để xem nhanh (không commit).

Sau khi sinh, deploy như thường (`deploy.ps1`). Claude Design mở:
**https://tankfire4-dot.github.io/app-chi-tieu/snapshot.html**

## Các file liên quan

| File | Vai trò |
|---|---|
| `tools/gen-snapshot.mjs` | Mở Chrome headless, nạp app thật, render với data mẫu, đông cứng DOM |
| `pwa/_gen-snapshot.js` | Dữ liệu mẫu + logic dựng khung 4 màn (sửa data mẫu ở đây) |
| `pwa/snapshot.html` | Kết quả tĩnh (tự sinh — đừng sửa tay) |

## Khi nào cần sửa `_gen-snapshot.js`

Chỉ khi cấu trúc dữ liệu của các hàm render thay đổi (vd thêm field mới vào `S.rows`,
`S.debts`, hay tham số `renderStats`). Khung 4 màn và CSS override hiếm khi phải đụng.
