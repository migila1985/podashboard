// Generates the temporary PNG app icons (no dependencies). Replace the files in public/icons later.
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
  return Buffer.concat([len, td, c]);
};

function png(size, { maskable = false, rounded = true } = {}) {
  const px = Buffer.alloc(size * size * 4);
  const radius = rounded && !maskable ? size * 0.22 : 0;
  const pad = maskable ? size * 0.18 : 0;
  const inner = size - pad * 2;
  const bars = [[0.2, 0.52, 0.125, 0.18], [0.4, 0.38, 0.125, 0.32], [0.6, 0.23, 0.125, 0.47]];
  const alpha = [0.7, 0.85, 1];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      let inside = true;
      if (radius) {
        const cx = Math.min(Math.max(x, radius), size - radius);
        const cy = Math.min(Math.max(y, radius), size - radius);
        inside = (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2;
      }
      if (!inside) continue;
      let [r, g, b] = [0x2d, 0x7f, 0xf9];
      bars.forEach(([bx, by, bw, bh], k) => {
        const x0 = pad + bx * inner, y0 = pad + by * inner;
        if (x >= x0 && x < x0 + bw * inner && y >= y0 && y < pad + 0.77 * inner) {
          const a = alpha[k];
          r = Math.round(r + (255 - r) * a); g = Math.round(g + (255 - g) * a); b = Math.round(b + (255 - b) * a);
        }
      });
      px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = 255;
    }
  }
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) px.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

mkdirSync("public/icons", { recursive: true });
writeFileSync("public/icons/icon-192.png", png(192));
writeFileSync("public/icons/icon-512.png", png(512));
writeFileSync("public/icons/icon-maskable-512.png", png(512, { maskable: true }));
// iOS applies its own rounding, so the touch icon is a full-bleed square.
writeFileSync("public/icons/apple-touch-icon.png", png(180, { rounded: false }));
console.log("icons written");
