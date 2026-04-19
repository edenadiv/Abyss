#!/usr/bin/env node
/* Generate procedural placeholder icons so electron-builder has something
   to reference. Replace with real 1024² art before shipping. */

import fs from 'node:fs';
import zlib from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BUILD = path.join(ROOT, 'build');

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crc ^ buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
    crc = c;
  }
  return crc ^ 0xffffffff;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const t = Buffer.from(type, 'ascii');
  const body = Buffer.concat([t, data]);
  const crc = Buffer.alloc(4); crc.writeInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function makePng(size) {
  const w = size, h = size;
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const rows = [];
  for (let y = 0; y < h; y++) {
    const row = Buffer.alloc(1 + w * 4);
    row[0] = 0;
    for (let x = 0; x < w; x++) {
      const cx = x - w / 2, cy = y - h / 2;
      const d = Math.sqrt(cx * cx + cy * cy) / (w / 2);
      const t = Math.max(0, Math.min(1, d));
      const inner = Math.max(0, 1 - t * 1.4);
      const ring = Math.abs(t - 0.72) < 0.02 ? 1 : 0;
      const r = Math.round(5 + inner * 10 + ring * 180);
      const g = Math.round(3 + inner * 8  + ring * 130);
      const b = Math.round(8 + inner * 16 + ring * 60);
      const a = t > 0.98 ? 0 : 255;
      const i = 1 + x * 4;
      row[i] = r; row[i + 1] = g; row[i + 2] = b; row[i + 3] = a;
    }
    // Blackletter-inspired "A" mark
    const mid = Math.floor(h / 2);
    if (y >= mid - 60 && y <= mid + 60) {
      const spread = 60 - Math.abs(y - mid);
      const cxPx = Math.floor(w / 2);
      for (let x = cxPx - spread / 2; x < cxPx + spread / 2; x++) {
        if (x < 0 || x >= w) continue;
        const onLeftEdge  = Math.abs((x - (cxPx - spread / 2))) < 4;
        const onRightEdge = Math.abs((x - (cxPx + spread / 2))) < 4;
        const onCrossbar  = Math.abs(y - mid - 10) < 4;
        if (onLeftEdge || onRightEdge || onCrossbar) {
          const i = 1 + Math.round(x) * 4;
          row[i] = 232; row[i + 1] = 221; row[i + 2] = 188; row[i + 3] = 255;
        }
      }
    }
    rows.push(row);
  }
  const raw = Buffer.concat(rows);
  const deflated = zlib.deflateSync(raw);
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', deflated), chunk('IEND', Buffer.alloc(0))]);
}

function main() {
  if (!fs.existsSync(BUILD)) fs.mkdirSync(BUILD, { recursive: true });
  const png512 = makePng(512);
  const icon = path.join(BUILD, 'icon.png');
  if (!fs.existsSync(icon) || process.argv.includes('--force')) {
    fs.writeFileSync(icon, png512); console.log('✓ icon.png');
  }
  const icns = path.join(BUILD, 'icon.icns');
  if (!fs.existsSync(icns)) {
    try {
      const iconset = path.join(BUILD, 'icon.iconset');
      if (!fs.existsSync(iconset)) fs.mkdirSync(iconset);
      for (const sz of [16, 32, 64, 128, 256, 512]) {
        fs.writeFileSync(path.join(iconset, `icon_${sz}x${sz}.png`), makePng(sz));
        fs.writeFileSync(path.join(iconset, `icon_${sz}x${sz}@2x.png`), makePng(sz * 2));
      }
      execSync(`iconutil -c icns "${iconset}" -o "${icns}"`, { stdio: 'inherit' });
      fs.rmSync(iconset, { recursive: true, force: true });
      console.log('✓ icon.icns');
    } catch (err) { console.log(`· skipping icon.icns (${err.message})`); }
  }
  const ico = path.join(BUILD, 'icon.ico');
  if (!fs.existsSync(ico)) {
    const png256 = makePng(256);
    const header = Buffer.alloc(6);
    header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(1, 4);
    const entry = Buffer.alloc(16);
    entry.writeUInt16LE(1, 4); entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(png256.length, 8);
    entry.writeUInt32LE(22, 12);
    fs.writeFileSync(ico, Buffer.concat([header, entry, png256]));
    console.log('✓ icon.ico');
  }
}
main();
