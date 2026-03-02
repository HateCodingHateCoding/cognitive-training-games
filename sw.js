/* =====================================================================
   Service Worker — 认知训练游戏平台
   策略：
     - games-manifest.json → Network-First（版本检测）
     - 游戏 HTML 文件    → Cache-First（离线优先）
     - 其余 Shell 资源   → Stale-While-Revalidate
   ===================================================================== */

const CACHE_VERSION = '1.0.0';
const CACHE_NAME = `cognitive-games-${CACHE_VERSION}`;

// Shell 核心资源（安装时预缓存）
const PRECACHE_URLS = [
  './',
  './index.html',
  './app.js',
  './games-manifest.json',
];

// ── Install：预缓存 Shell ──────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate：清理旧版本缓存 ──────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith('cognitive-games-') && k !== CACHE_NAME)
          .map((k) => {
            console.log('[SW] 删除旧缓存:', k);
            return caches.delete(k);
          })
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch：按资源类型分策略 ───────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 只处理同源 GET 请求
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // games-manifest.json → Network-First（优先获取最新版本信息）
  if (url.pathname.endsWith('games-manifest.json')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // 游戏 HTML → Cache-First（支持离线游戏）
  if (isGameEntry(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Shell 及其他 → Stale-While-Revalidate
  event.respondWith(staleWhileRevalidate(request));
});

// ── 策略实现 ──────────────────────────────────────────────────────────

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || offlineFallback();
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
    return response;
  } catch {
    return offlineFallback();
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  const networkFetch = fetch(request)
    .then((response) => {
      cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);

  return cached || (await networkFetch) || offlineFallback();
}

function offlineFallback() {
  return new Response(
    `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8">
    <title>离线</title><style>body{font-family:'Microsoft YaHei',sans-serif;
    display:flex;align-items:center;justify-content:center;min-height:100vh;
    background:#f0f4f8;margin:0}div{text-align:center;color:#4a5568}
    h2{font-size:2rem;margin-bottom:1rem}p{font-size:1.1rem;color:#718096}
    </style></head><body><div><h2>📶 暂时离线</h2>
    <p>请检查网络连接后重试</p></div></body></html>`,
    { headers: { 'Content-Type': 'text/html;charset=utf-8' } }
  );
}

function isGameEntry(pathname) {
  const gameFiles = [
    '路径回溯游戏本体.html',
    '颜色匹配大师游戏本体.html',
    'matching-game.html',
    'stroop-game.html',
    'rhythm-game.html',
    'memory-game.html',
  ];
  return gameFiles.some((f) => pathname.endsWith(f));
}

// ── 消息通道（主线程 → SW）────────────────────────────────────────────
self.addEventListener('message', async (event) => {
  const { type, payload } = event.data || {};

  // 主动预缓存指定游戏
  if (type === 'PRECACHE_GAME') {
    const { url } = payload;
    try {
      const cache = await caches.open(CACHE_NAME);
      const response = await fetch(url);
      await cache.put(url, response);
      notifyClients({ type: 'GAME_CACHED', url });
    } catch (err) {
      notifyClients({ type: 'CACHE_ERROR', url, message: err.message });
    }
  }

  // 列出已缓存的游戏入口
  if (type === 'LIST_CACHED') {
    const cache = await caches.open(CACHE_NAME);
    const keys = await cache.keys();
    const urls = keys.map((r) => r.url).filter(isGameEntry);
    event.source.postMessage({ type: 'CACHED_LIST', urls });
  }

  // 强制激活新 SW（用于版本更新流程）
  if (type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

async function notifyClients(data) {
  const clients = await self.clients.matchAll({ includeUncontrolled: true });
  clients.forEach((c) => c.postMessage(data));
}
