/**
 * Generates crisp valid PNG icons for VoxNav in 16x16, 32x32, 48x48, and 128x128
 * Pure Node.js with zlib - zero external dependencies.
 */

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

function createPng(size) {
  // RGBA buffer: size * size * 4 bytes + 1 filter byte per scanline
  const scanlineLength = size * 4 + 1;
  const rawData = Buffer.alloc(scanlineLength * size);

  const radius = size / 2;
  const center = size / 2;

  for (let y = 0; y < size; y++) {
    const rowOffset = y * scanlineLength;
    rawData[rowOffset] = 0; // Filter type 0 (None)

    for (let x = 0; x < size; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      const dx = x - center;
      const dy = y - center;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Background rounded circle
      if (dist <= radius - 1) {
        // Microphone shape approximation in center
        const mx = Math.abs(dx);
        const isMicBody = mx <= size * 0.18 && dy >= -size * 0.3 && dy <= size * 0.1;
        const isMicStand = mx <= size * 0.06 && dy > size * 0.1 && dy <= size * 0.35;
        const isMicBase = mx <= size * 0.22 && dy > size * 0.3 && dy <= size * 0.38;
        const isMicArc = dist >= size * 0.22 && dist <= size * 0.28 && dy >= -size * 0.05 && dy <= size * 0.2;

        if (isMicBody || isMicStand || isMicBase || isMicArc) {
          // White mic
          rawData[pixelOffset] = 255;
          rawData[pixelOffset + 1] = 255;
          rawData[pixelOffset + 2] = 255;
          rawData[pixelOffset + 3] = 255;
        } else {
          // Vibrant Blue #2563EB
          rawData[pixelOffset] = 37;
          rawData[pixelOffset + 1] = 99;
          rawData[pixelOffset + 2] = 235;
          rawData[pixelOffset + 3] = 255;
        }
      } else {
        // Transparent
        rawData[pixelOffset] = 0;
        rawData[pixelOffset + 1] = 0;
        rawData[pixelOffset + 2] = 0;
        rawData[pixelOffset + 3] = 0;
      }
    }
  }

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR Chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr.writeUInt8(8, 8); // 8-bit depth
  ihdr.writeUInt8(6, 9); // RGBA color type
  ihdr.writeUInt8(0, 10); // compression
  ihdr.writeUInt8(0, 11); // filter
  ihdr.writeUInt8(0, 12); // interlace

  const ihdrChunk = createChunk("IHDR", ihdr);

  // IDAT Chunk (compressed image data)
  const compressed = zlib.deflateSync(rawData);
  const idatChunk = createChunk("IDAT", compressed);

  // IEND Chunk
  const iendChunk = createChunk("IEND", Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const length = data.length;
  const chunk = Buffer.alloc(12 + length);
  chunk.writeUInt32BE(length, 0);
  chunk.write(type, 4, 4, "ascii");
  data.copy(chunk, 8);

  const crc = crc32(Buffer.concat([Buffer.from(type, "ascii"), data]));
  chunk.writeUInt32BE(crc, 8 + length);
  return chunk;
}

// CRC32 calculation for PNG chunks
function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

const table = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  table[i] = c;
}

// Write icons
const iconsDir = path.join(__dirname, "icons");
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

[16, 32, 48, 128].forEach((size) => {
  const iconBuffer = createPng(size);
  const filePath = path.join(iconsDir, `icon${size}.png`);
  fs.writeFileSync(filePath, iconBuffer);
  console.log(`Generated: ${filePath}`);
});
