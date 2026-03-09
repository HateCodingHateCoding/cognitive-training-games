/**
 * generate-icons.js — 生成 PWA 图标
 * 使用纯 JS + Node 内置模块，无需额外依赖
 * 生成简洁的渐变背景 + 文字图标
 */
const fs = require('fs');
const path = require('path');

// 生成简单的 BMP-style PNG 替代方案
// 由于纯 Node 没有 Canvas，使用生成 SVG→内嵌到 HTML 的方式
// 或者直接用极简 PNG 编码

// --- 极简 PNG 编码器（无依赖）---
function createPNG(width, height, rgbaData) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c ^= buf[i];
      for (let j = 0; j < 8; j++) {
        c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
      }
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  function chunk(type, data) {
    const typeBuf = Buffer.from(type, 'ascii');
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const combined = Buffer.concat([typeBuf, data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(combined));
    return Buffer.concat([len, combined, crc]);
  }

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type (RGBA)
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // IDAT — raw pixel data with filter byte per row
  const rawRows = [];
  for (let y = 0; y < height; y++) {
    rawRows.push(Buffer.from([0])); // filter: None
    const rowStart = y * width * 4;
    rawRows.push(rgbaData.subarray(rowStart, rowStart + width * 4));
  }
  const rawData = Buffer.concat(rawRows);

  const { deflateSync } = require('zlib');
  const compressed = deflateSync(rawData);

  // IEND
  const iend = chunk('IEND', Buffer.alloc(0));

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    iend
  ]);
}

function generateIcon(size, maskable) {
  const data = Buffer.alloc(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const t = (x + y) / (2 * size); // gradient factor 0→1

      // Gradient: #4A90D9 → #6DB3E8
      const r = Math.round(74 + t * (109 - 74));
      const g = Math.round(144 + t * (179 - 144));
      const b = Math.round(217 + t * (232 - 217));

      if (maskable) {
        // Full square
        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;
        data[i + 3] = 255;
      } else {
        // Rounded corners
        const radius = size * 0.18;
        const inRoundedRect = isInRoundedRect(x, y, size, size, radius);
        if (inRoundedRect) {
          data[i] = r;
          data[i + 1] = g;
          data[i + 2] = b;
          data[i + 3] = 255;
        } else {
          data[i] = 0;
          data[i + 1] = 0;
          data[i + 2] = 0;
          data[i + 3] = 0;
        }
      }
    }
  }

  // Draw a simple white brain/puzzle symbol in center
  drawPuzzleSymbol(data, size);
  // Draw "认知" text-like pattern at bottom
  drawBottomLabel(data, size);

  return createPNG(size, size, data);
}

function isInRoundedRect(x, y, w, h, r) {
  if (x >= r && x < w - r) return y >= 0 && y < h;
  if (y >= r && y < h - r) return x >= 0 && x < w;
  // corners
  const corners = [
    [r, r],
    [w - r, r],
    [r, h - r],
    [w - r, h - r]
  ];
  for (const [cx, cy] of corners) {
    const dx = x - cx;
    const dy = y - cy;
    if (dx * dx + dy * dy <= r * r) return true;
  }
  if (x < r && y < r) return false;
  if (x >= w - r && y < r) return false;
  if (x < r && y >= h - r) return false;
  if (x >= w - r && y >= h - r) return false;
  return true;
}

function drawPuzzleSymbol(data, size) {
  // Draw a simple puzzle piece icon (4 circles arranged as a cross)
  const cx = size / 2;
  const cy = size * 0.42;
  const mainR = size * 0.18;
  const knobR = size * 0.06;

  // Main body - white circle
  drawCircle(data, size, cx, cy, mainR, 255, 255, 255, 230);

  // Puzzle knobs (small circles extending from main)
  drawCircle(data, size, cx, cy - mainR, knobR, 255, 255, 255, 230); // top
  drawCircle(data, size, cx + mainR, cy, knobR, 255, 255, 255, 230); // right
  drawCircle(data, size, cx, cy + mainR, knobR, 255, 255, 255, 230); // bottom
  drawCircle(data, size, cx - mainR, cy, knobR, 255, 255, 255, 230); // left

  // Inner detail - smaller circle
  drawCircle(data, size, cx, cy, mainR * 0.5, 74, 144, 217, 180);
}

function drawCircle(data, size, cx, cy, r, cr, cg, cb, ca) {
  const r2 = r * r;
  const x0 = Math.max(0, Math.floor(cx - r - 1));
  const x1 = Math.min(size - 1, Math.ceil(cx + r + 1));
  const y0 = Math.max(0, Math.floor(cy - r - 1));
  const y1 = Math.min(size - 1, Math.ceil(cy + r + 1));

  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist2 = dx * dx + dy * dy;
      if (dist2 <= r2) {
        const i = (y * size + x) * 4;
        // Alpha blend
        const srcA = ca / 255;
        const dstA = data[i + 3] / 255;
        const outA = srcA + dstA * (1 - srcA);
        if (outA > 0) {
          data[i]     = Math.round((cr * srcA + data[i] * dstA * (1 - srcA)) / outA);
          data[i + 1] = Math.round((cg * srcA + data[i + 1] * dstA * (1 - srcA)) / outA);
          data[i + 2] = Math.round((cb * srcA + data[i + 2] * dstA * (1 - srcA)) / outA);
          data[i + 3] = Math.round(outA * 255);
        }
      }
    }
  }
}

function drawBottomLabel(data, size) {
  // Draw a simple white bar at bottom for label area
  const barY = Math.floor(size * 0.75);
  const barH = Math.floor(size * 0.1);
  const barW = Math.floor(size * 0.5);
  const barX = Math.floor((size - barW) / 2);

  for (let y = barY; y < barY + barH && y < size; y++) {
    for (let x = barX; x < barX + barW && x < size; x++) {
      const i = (y * size + x) * 4;
      if (data[i + 3] > 0) { // Only draw where there's already content
        // Lighten slightly
        data[i]     = Math.min(255, data[i] + 40);
        data[i + 1] = Math.min(255, data[i + 1] + 40);
        data[i + 2] = Math.min(255, data[i + 2] + 40);
      }
    }
  }
}

// --- Generate all icons ---
const outDir = path.join(__dirname, 'icons');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

const configs = [
  { name: 'icon-192.png', size: 192, maskable: false },
  { name: 'icon-512.png', size: 512, maskable: false },
  { name: 'icon-maskable-192.png', size: 192, maskable: true },
  { name: 'icon-maskable-512.png', size: 512, maskable: true },
];

configs.forEach(({ name, size, maskable }) => {
  const png = generateIcon(size, maskable);
  fs.writeFileSync(path.join(outDir, name), png);
  console.log(`✅ 已生成 icons/${name} (${size}×${size})`);
});

console.log('\n🎉 所有图标已生成完毕！');
