// Compress marker icons: PNG → WebP at 96px (2x the 36px render size for retina).
// Run with: node scripts/compress-icons.mjs
//
// Generates .webp alongside each .png, then prints a size report.
// After running, update iconUrl references (.png → .webp) in src/types/index.ts
// and delete the old .png files once verified.
import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'

const ICONS_DIR = path.resolve(import.meta.dirname, '..', 'public', 'images', 'icons')
const TARGET_SIZE = 96
const QUALITY = 85

const files = fs.readdirSync(ICONS_DIR).filter(f => f.endsWith('.png'))

let totalBefore = 0
let totalAfter = 0
const report = []

for (const f of files) {
  const src = path.join(ICONS_DIR, f)
  const out = path.join(ICONS_DIR, f.replace(/\.png$/, '.webp'))
  const before = fs.statSync(src).size
  await sharp(src)
    .resize(TARGET_SIZE, TARGET_SIZE, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: QUALITY })
    .toFile(out)
  const after = fs.statSync(out).size
  totalBefore += before
  totalAfter += after
  report.push({ f, before, after })
}

report.sort((a, b) => b.before - a.before)
console.log('icon'.padEnd(24), 'before'.padStart(10), 'after'.padStart(10), 'saved')
console.log('-'.repeat(58))
for (const r of report) {
  console.log(
    r.f.padEnd(24),
    formatKB(r.before).padStart(10),
    formatKB(r.after).padStart(10),
    `${(((r.before - r.after) / r.before) * 100).toFixed(0)}%`.padStart(6),
  )
}
console.log('-'.repeat(58))
console.log(
  'TOTAL'.padEnd(24),
  formatKB(totalBefore).padStart(10),
  formatKB(totalAfter).padStart(10),
  `${(((totalBefore - totalAfter) / totalBefore) * 100).toFixed(0)}%`.padStart(6),
)

function formatKB(bytes) {
  return bytes > 1024 * 1024
    ? (bytes / 1024 / 1024).toFixed(2) + 'M'
    : (bytes / 1024).toFixed(0) + 'K'
}
