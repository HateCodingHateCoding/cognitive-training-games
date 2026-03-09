/**
 * sync-www.js — 将前端文件同步到 www/ 目录供 Capacitor 打包
 * 用法: node scripts/sync-www.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const WWW = path.join(ROOT, 'www');

// 需要复制的文件和目录（相对于项目根目录）
const COPY_LIST = [
  'index.html',
  'app.js',
  'sw.js',
  'games-manifest.json',
  'manifest.webmanifest',
  'icons',
  '路径回溯游戏——胡一凡',
  '颜色匹配大师游戏——胡一凡',
  '记忆翻牌配对游戏——杨健舒',
  '干扰词辨识游戏——杨健舒',
  '节奏跟随游戏——王淞鹤',
  '空间定位记忆游戏——王淞鹤',
];

// 递归复制
function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const child of fs.readdirSync(src)) {
      copyRecursive(path.join(src, child), path.join(dest, child));
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

// 清理并重建 www/
if (fs.existsSync(WWW)) {
  fs.rmSync(WWW, { recursive: true });
}
fs.mkdirSync(WWW, { recursive: true });

let count = 0;
for (const item of COPY_LIST) {
  const src = path.join(ROOT, item);
  const dest = path.join(WWW, item);
  if (fs.existsSync(src)) {
    copyRecursive(src, dest);
    count++;
    console.log(`  📁 ${item}`);
  } else {
    console.warn(`  ⚠️  跳过不存在的: ${item}`);
  }
}

console.log(`\n✅ 已同步 ${count} 个文件/目录到 www/`);
