const CACHE = 'chi-tieu-v64';
const ASSETS = ['./', './index.html'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

// Vỏ app = trang + font Google. Font là stylesheet chặn vẽ: mạng ì thì cả trang đứng chờ.
const isShell = req => req.mode === 'navigate' ||
  /(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(new URL(req.url).hostname);

self.addEventListener('fetch', e => {
  // Không cache API calls (Apps Script)
  if (e.request.url.includes('script.google.com')) return;
  if (e.request.method !== 'GET') return;
  if (isShell(e.request)) {
    // Vỏ app (29/09): có bản trên máy thì trả NGAY, tải bản mới ở nền cho lần mở sau. Trước đây đợi
    // mạng trước, chỉ khi mạng BÁO LỖI mới dùng bản lưu — mạng chập chờn không báo lỗi mà cứ treo,
    // nên app đã cài vẫn đứng màn chờ. Bản mới (deploy) hiện ở lần mở kế tiếp.
    const moi = fetch(e.request).then(res => {
      if (res.ok) { const copy = res.clone(); return caches.open(CACHE).then(c => c.put(e.request, copy)).then(() => res); }
      return res;
    });
    e.waitUntil(moi.catch(() => {}));
    // Trang mở từ biểu tượng có thể kèm ?… → so khớp bỏ phần đó
    e.respondWith(caches.match(e.request, { ignoreSearch: e.request.mode === 'navigate' })
      .then(hit => hit || moi));
    return;
  }
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
