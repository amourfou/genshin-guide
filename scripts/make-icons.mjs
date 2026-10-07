import fs from "fs";
import path from "path";
import zlib from "zlib";

function crc32(buffer) {
  let crc = ~0;
  for (let i = 0; i < buffer.length; i += 1) {
    crc ^= buffer[i];
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return ~crc >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([length, body, crc]);
}

function png(size, paint) {
  const stride = size * 4 + 1;
  const raw = Buffer.alloc(stride * size);
  for (let y = 0; y < size; y += 1) {
    raw[y * stride] = 0;
    for (let x = 0; x < size; x += 1) {
      const [r, g, b, a] = paint(x, y, size);
      const index = y * stride + 1 + x * 4;
      raw[index] = r;
      raw[index + 1] = g;
      raw[index + 2] = b;
      raw[index + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function paint(x, y, size, inset) {
  const cx = (x + 0.5) / size - 0.5;
  const cy = (y + 0.5) / size - 0.5;
  const radius = Math.hypot(cx, cy);
  const diamond = Math.abs(cx) + Math.abs(cy);
  let color = [16, 20, 32, 255];
  if (radius < 0.46) color = [22, 28, 46, 255];
  if (radius > 0.36 && radius < 0.4) color = [79, 168, 156, 255];
  if (diamond < 0.28 * inset) color = [232, 188, 96, 255];
  if (diamond < 0.13 * inset) color = [18, 24, 40, 255];
  if (Math.abs(cx) < 0.015 && Math.abs(cy) < 0.22 * inset) color = [244, 220, 160, 255];
  if (Math.abs(cy) < 0.015 && Math.abs(cx) < 0.22 * inset) color = [244, 220, 160, 255];
  return color;
}

const dir = path.resolve("public/icons");
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, "icon-192.png"), png(192, (x, y, size) => paint(x, y, size, 1)));
fs.writeFileSync(path.join(dir, "icon-512.png"), png(512, (x, y, size) => paint(x, y, size, 1)));
fs.writeFileSync(path.join(dir, "apple-touch-icon.png"), png(180, (x, y, size) => paint(x, y, size, 1)));
fs.writeFileSync(path.join(dir, "icon-512-maskable.png"), png(512, (x, y, size) => paint(x, y, size, 0.72)));
console.log("icons written");
