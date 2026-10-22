import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const sharp = require(process.env.MIRROR_SHARP || 'sharp');

const jobs = [
  { source: 'deepseek-blue.png', target: 'deepseek-blue.webp', quality: 88 },
  { source: 'deepseek-night.png', target: 'deepseek-night.webp', quality: 88 },
  { source: 'longmarch-black.png', target: 'longmarch-black.webp', quality: 88 },
  { source: 'transition-day-original.png', target: 'transition-day-original.webp', quality: 84 },
  { source: 'transition-night-original.png', target: 'transition-night-original.webp', quality: 84 },
];

for (const job of jobs) {
  const source = path.join(root, 'assets', job.source);
  const target = path.join(root, 'assets', job.target);
  const before = (await fs.stat(target)).size;
  const image = sharp(source);
  const meta = await image.metadata();
  const buffer = await image
    .webp({ quality: job.quality, effort: 6, smartSubsample: true, alphaQuality: 100 })
    .toBuffer();
  await fs.writeFile(target, buffer);
  console.log(JSON.stringify({ target: job.target, width: meta.width, height: meta.height, before, after: buffer.length, saved: before - buffer.length, percent: Number((100 - buffer.length / before * 100).toFixed(1)) }));
}
