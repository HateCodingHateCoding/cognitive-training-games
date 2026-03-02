/* =====================================================================
   app.js — 认知训练游戏平台 Shell 逻辑
   功能：Service Worker 注册、游戏清单加载、按需加载、离线缓存、版本更新
   ===================================================================== */

// ── 卡片颜色主题 ────────────────────────────────────────────────────────
const CARD_ACCENTS = ['#4A90D9','#E67E22','#38A169','#9B59B6','#E74C3C','#1ABC9C'];

// ── 状态 ────────────────────────────────────────────────────────────────
let manifest = null;
let swReg    = null;
let cachedUrls = new Set();
let pendingSW  = null;

// ── DOM refs ────────────────────────────────────────────────────────────
const grid        = document.getElementById('game-grid');
const overlay     = document.getElementById('game-overlay');
const iframe      = document.getElementById('game-iframe');
const loader      = document.getElementById('loader');
const overlayTitle= document.getElementById('overlay-title');
const overlayScore= document.getElementById('overlay-score');
const prefetchBtn = document.getElementById('prefetch-btn');
const closeBtn    = document.getElementById('close-btn');
const updateBanner= document.getElementById('update-banner');
const updateBtn   = document.getElementById('update-btn');
const dismissBtn  = document.getElementById('dismiss-btn');
const statusDot   = document.getElementById('status-dot');
const onlineLabel = document.getElementById('online-label');
const versionLabel= document.getElementById('version-label');
const updateTime  = document.getElementById('update-time');
const toast       = document.getElementById('toast');

// ── 初始化 ──────────────────────────────────────────────────────────────
(async function init() {
  registerSW();
  updateNetworkStatus();
  window.addEventListener('online',  updateNetworkStatus);
  window.addEventListener('offline', updateNetworkStatus);

  try {
    const res = await fetch('./games-manifest.json');
    manifest = await res.json();
    renderGrid(manifest.games);
    versionLabel.textContent = `版本 ${manifest.version}`;
    updateTime.textContent   = `更新于 ${manifest.updated}`;
  } catch {
    grid.innerHTML = '<p style="padding:28px;color:#718096">⚠️ 无法加载游戏列表，请检查网络或刷新页面</p>';
  }
})();

// ── Service Worker ──────────────────────────────────────────────────────
function registerSW() {
  if (!('serviceWorker' in navigator)) return;

  navigator.serviceWorker.register('./sw.js').then((reg) => {
    swReg = reg;

    // 检测到等待中的新 SW → 显示更新横幅
    if (reg.waiting) showUpdateBanner(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const newSW = reg.installing;
      newSW.addEventListener('statechange', () => {
        if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
          showUpdateBanner(newSW);
        }
      });
    });
  });

  // SW 控制权转移后自动刷新
  navigator.serviceWorker.addEventListener('controllerchange', () => location.reload());

  // 接收 SW 消息
  navigator.serviceWorker.addEventListener('message', ({ data }) => {
    if (data.type === 'GAME_CACHED') {
      cachedUrls.add(data.url);
      refreshCacheBadges();
      showToast('✅ 游戏已缓存，可离线游玩');
    }
    if (data.type === 'CACHED_LIST') {
      data.urls.forEach((u) => cachedUrls.add(u));
      refreshCacheBadges();
    }
    if (data.type === 'CACHE_ERROR') {
      showToast('❌ 缓存失败，请检查网络');
    }
  });

  // 查询已缓存列表
  navigator.serviceWorker.ready.then((reg) => {
    reg.active?.postMessage({ type: 'LIST_CACHED' });
  });
}

function showUpdateBanner(sw) {
  pendingSW = sw;
  updateBanner.classList.add('visible');
}

updateBtn.addEventListener('click', () => {
  pendingSW?.postMessage({ type: 'SKIP_WAITING' });
  updateBanner.classList.remove('visible');
});
dismissBtn.addEventListener('click', () => updateBanner.classList.remove('visible'));

// ── 渲染游戏卡片 ────────────────────────────────────────────────────────
function renderGrid(games) {
  grid.innerHTML = '';
  games.forEach((game, i) => {
    const accent = CARD_ACCENTS[i % CARD_ACCENTS.length];
    const card = document.createElement('div');
    card.className = 'game-card';
    card.dataset.id = game.id;
    card.innerHTML = `
      <div class="card-strip" style="background:${accent}"></div>
      <div class="card-body">
        <div class="card-icon">${game.icon}</div>
        <div class="card-name">${game.name}</div>
        <div class="card-desc">${game.desc}</div>
      </div>
      <div class="card-tags">
        ${game.tags.map((t) => `<span class="tag">${t}</span>`).join('')}
      </div>
      <div class="card-footer">
        <span class="card-author">👤 ${game.author}</span>
        <span class="cache-badge" id="badge-${game.id}">📦 已缓存</span>
        <button class="play-btn" style="background:${accent}" data-id="${game.id}">开始训练</button>
      </div>`;
    grid.appendChild(card);
  });

  // 事件委托
  grid.addEventListener('click', (e) => {
    const btn = e.target.closest('.play-btn');
    if (btn) openGame(btn.dataset.id);
  });

  refreshCacheBadges();
}

// ── 打开游戏（按需加载）────────────────────────────────────────────────
function openGame(id) {
  const game = manifest?.games.find((g) => g.id === id);
  if (!game) return;

  overlayTitle.textContent = `${game.icon} ${game.name}`;
  overlayScore.textContent = '';
  overlay.classList.add('visible');
  loader.classList.add('visible');
  iframe.src = '';

  // 注入 microApp 通信桥（同源 iframe 加载后注入）
  iframe.onload = () => {
    loader.classList.remove('visible');
    injectMicroAppBridge(game);
  };

  iframe.src = `./${game.entry}`;

  // 更新缓存按钮状态
  const entryUrl = new URL(`./${game.entry}`, location.href).href;
  prefetchBtn.disabled = cachedUrls.has(entryUrl);
  prefetchBtn.onclick = () => precacheGame(game, entryUrl);
}

// ── microApp 通信桥 ─────────────────────────────────────────────────────
function injectMicroAppBridge(game) {
  try {
    const win = iframe.contentWindow;
    if (!win) return;

    // 提供 window.microApp shim，让游戏可以 dispatch 数据给 shell
    win.microApp = {
      dispatch(data) {
        handleGameEvent(game.id, data);
      },
      addDataListener(cb) {
        // 保存回调，供 shell 向游戏发送配置
        win.__microAppListener = cb;
      },
      removeDataListener() {
        win.__microAppListener = null;
      },
    };
  } catch {
    // 跨域时无法注入，忽略
  }
}

function handleGameEvent(gameId, data) {
  if (data?.score !== undefined) {
    overlayScore.textContent = `得分：${data.score}`;
  }
  if (data?.status === 'finished') {
    showToast(`🎉 游戏结束！得分 ${data.score ?? '-'}`);
  }
}

// ── 关闭游戏 ────────────────────────────────────────────────────────────
closeBtn.addEventListener('click', () => {
  overlay.classList.remove('visible');
  iframe.src = '';
  loader.classList.remove('visible');
});

// ── 预缓存游戏 ──────────────────────────────────────────────────────────
function precacheGame(game, entryUrl) {
  if (!navigator.serviceWorker.controller) {
    showToast('⚠️ Service Worker 未就绪，请稍后重试');
    return;
  }
  prefetchBtn.disabled = true;
  prefetchBtn.textContent = '⬇ 缓存中…';
  navigator.serviceWorker.controller.postMessage({
    type: 'PRECACHE_GAME',
    payload: { url: entryUrl },
  });
  // 按钮文字在收到 GAME_CACHED 消息后由 toast 反馈，此处仅重置文字
  setTimeout(() => { prefetchBtn.textContent = '⬇ 缓存'; }, 3000);
}

// ── 刷新缓存徽章 ────────────────────────────────────────────────────────
function refreshCacheBadges() {
  if (!manifest) return;
  manifest.games.forEach((game) => {
    const entryUrl = new URL(`./${game.entry}`, location.href).href;
    const badge = document.getElementById(`badge-${game.id}`);
    if (badge) badge.classList.toggle('visible', cachedUrls.has(entryUrl));
  });
}

// ── 网络状态 ────────────────────────────────────────────────────────────
function updateNetworkStatus() {
  const online = navigator.onLine;
  statusDot.className = `status-dot${online ? '' : ' offline'}`;
  onlineLabel.textContent = online ? '在线' : '离线';
}

// ── Toast ────────────────────────────────────────────────────────────────
let toastTimer = null;
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
}
