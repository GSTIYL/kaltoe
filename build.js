// kaltoe-calculator.html(아티팩트 원본)을 감싸서 docs/ 아래에 PWA 버전을 만든다 (GitHub Pages가 /docs를 서빙).
// 사용법: node build.js
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');

const ROOT = __dirname;
const OUT = path.join(ROOT, 'docs');
const SRC = path.join(ROOT, 'kaltoe-calculator.html');

fs.mkdirSync(path.join(OUT, 'icons'), { recursive: true });

/* ---------- index.html ---------- */
const src = fs.readFileSync(SRC, 'utf8');
const cut = src.indexOf('<div class="wrap">');
if (cut < 0) throw new Error('본문 시작(<div class="wrap">)을 찾지 못했습니다');
const head = src.slice(0, cut).replace(/<meta name="claude:[^>]*>\s*/g, '').trim();
const body = src.slice(cut).trim();

const index = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="description" content="선택적 근로시간제(월 단위)에서 채운 시간을 기록하면 언제부터 18시 칼퇴가 가능한지 계산합니다.">
<meta name="theme-color" content="#ECEFF3" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#10141A" media="(prefers-color-scheme: dark)">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/png" sizes="32x32" href="icons/favicon-32.png">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="칼퇴">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>
${head}
</head>
<body>
${body}
<script>
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
</script>
</body>
</html>
`;
fs.writeFileSync(path.join(OUT, 'index.html'), index);

/* ---------- manifest ---------- */
const manifest = {
  name: '칼퇴 계산기',
  short_name: '칼퇴',
  description: '채운 시간을 기록하면 언제부터 18시 칼퇴가 가능한지 계산합니다.',
  lang: 'ko',
  start_url: './',
  scope: './',
  display: 'standalone',
  orientation: 'portrait',
  background_color: '#ECEFF3',
  theme_color: '#2E3DB8',
  icons: [
    { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
  ]
};
fs.writeFileSync(path.join(OUT, 'manifest.webmanifest'), JSON.stringify(manifest, null, 2));

/* ---------- 아이콘: 18:00을 가리키는 시계 ---------- */
const BG = [0x2e, 0x3d, 0xb8], WHITE = [255, 255, 255], YELLOW = [0xf2, 0xc9, 0x4c];
const segDist = (px, py, ax, ay, bx, by) => {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
};
// 좌표는 0~1. scale은 그림 크기(마스커블은 안전 영역에 맞춰 축소)
function shade(x, y, { rounded, scale }) {
  if (rounded) {
    const r = 0.22, qx = Math.max(Math.abs(x - 0.5) - (0.5 - r), 0), qy = Math.max(Math.abs(y - 0.5) - (0.5 - r), 0);
    if (Math.hypot(qx, qy) > r) return null;
  }
  const u = 0.5 + (x - 0.5) / scale, v = 0.5 + (y - 0.5) / scale;
  const d = Math.hypot(u - 0.5, v - 0.5);
  if (segDist(u, v, 0.5, 0.5, 0.5, 0.66) < 0.032) return YELLOW;          // 시침: 6시
  if (segDist(u, v, 0.5, 0.5, 0.5, 0.28) < 0.022) return WHITE;           // 분침: 12시
  if (d < 0.04) return WHITE;
  if (Math.abs(d - 0.31) < 0.026) return WHITE;                           // 테두리
  for (const [a, b] of [[0.75, 0.5], [0.25, 0.5]]) {                      // 3·9시 눈금
    if (Math.hypot(u - a, v - b) < 0.02) return WHITE;
  }
  return BG;
}
function png(size, opts) {
  const SS = 4, raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
        const c = shade((x + (sx + 0.5) / SS) / size, (y + (sy + 0.5) / SS) / size, opts);
        if (c) { r += c[0]; g += c[1]; b += c[2]; a++; }
      }
      const o = y * (size * 4 + 1) + 1 + x * 4;
      raw[o] = a ? r / a : 0; raw[o + 1] = a ? g / a : 0; raw[o + 2] = a ? b / a : 0; raw[o + 3] = Math.round(a / (SS * SS) * 255);
    }
  }
  const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = buf => { let c = 0xffffffff; for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, c]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
const icons = {
  'icon-192.png': [192, { rounded: true, scale: 1 }],
  'icon-512.png': [512, { rounded: true, scale: 1 }],
  'icon-maskable-512.png': [512, { rounded: false, scale: 0.8 }],
  'apple-touch-icon.png': [180, { rounded: false, scale: 0.9 }],
  'favicon-32.png': [32, { rounded: true, scale: 1.15 }]
};
const hash = crypto.createHash('sha1').update(index).update(JSON.stringify(manifest));
for (const [name, [size, opts]] of Object.entries(icons)) {
  const buf = png(size, opts);
  hash.update(buf);
  fs.writeFileSync(path.join(OUT, 'icons', name), buf);
}

/* ---------- 서비스 워커 ---------- */
const version = hash.digest('hex').slice(0, 10);
const sw = `// node build.js 가 생성. 직접 수정하지 마세요.
const CACHE = 'kaltoe-${version}';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/favicon-32.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('kaltoe-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // 글꼴: 캐시 우선
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(CACHE).then(c => c.match(req).then(hit => hit || fetch(req).then(res => { c.put(req, res.clone()); return res; }))));
    return;
  }
  if (url.origin !== location.origin) return;
  // 앱 파일: 네트워크 우선, 오프라인이면 캐시
  e.respondWith(fetch(req).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req).then(hit => hit || (req.mode === 'navigate' ? caches.match('index.html') : Response.error()))));
});
`;
fs.writeFileSync(path.join(OUT, 'sw.js'), sw);

console.log(`docs/ 빌드 완료 (캐시 버전 ${version})`);
