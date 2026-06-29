import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const UPLOADS_DIR = path.resolve(__dirname, '../public/images/uploads')
const JSON_FILES = [
  path.resolve(__dirname, '../markers-data.json'),
  path.resolve(__dirname, '../src/data/markers.json'),
]
const MAX_PX = 1920
const QUALITY = 80

async function convertAll() {
  const files = fs.readdirSync(UPLOADS_DIR)
  const images = files.filter((f) => /\.(png|jpe?g)$/i.test(f))

  console.log(`Found ${images.length} images to convert\n`)

  let converted = 0
  let skipped = 0
  let totalBefore = 0
  let totalAfter = 0

  for (const file of images) {
    const srcPath = path.join(UPLOADS_DIR, file)
    const webpFile = file.replace(/\.(png|jpe?g)$/i, '.webp')
    const destPath = path.join(UPLOADS_DIR, webpFile)

    const statBefore = fs.statSync(srcPath)
    totalBefore += statBefore.size

    // Step 1: convert to WebP
    try {
      await sharp(srcPath)
        .resize(MAX_PX, MAX_PX, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: QUALITY })
        .toFile(destPath)
    } catch (err) {
      console.error(`  CONVERT FAILED: ${file} — ${err.message}`)
      if (fs.existsSync(destPath)) fs.unlinkSync(destPath)
      skipped++
      continue
    }

    const statAfter = fs.statSync(destPath)
    totalAfter += statAfter.size

    const ratio = ((1 - statAfter.size / statBefore.size) * 100).toFixed(1)
    const beforeKB = (statBefore.size / 1024).toFixed(0)
    const afterKB = (statAfter.size / 1024).toFixed(0)
    console.log(`${file} -> ${webpFile}  [${beforeKB}KB → ${afterKB}KB, ${ratio}% smaller]`)

    // Step 2: delete original (separate from conversion so EPERM doesn't undo the work)
    try {
      fs.unlinkSync(srcPath)
    } catch (err) {
      console.error(`  DELETE WARNING: ${file} — ${err.message} (WebP saved, original left behind)`)
    }
    converted++
  }

  console.log(`\n--- Conversion summary ---`)
  console.log(`Converted: ${converted}, Skipped: ${skipped}`)
  if (converted > 0) {
    console.log(
      `Total: ${(totalBefore / 1024 / 1024).toFixed(1)}MB → ${(totalAfter / 1024 / 1024).toFixed(1)}MB (${((1 - totalAfter / totalBefore) * 100).toFixed(1)}% smaller)`,
    )
  }

  // Update JSON reference files
  for (const jsonPath of JSON_FILES) {
    if (!fs.existsSync(jsonPath)) {
      console.log(`\nSkipping ${path.basename(jsonPath)} (not found)`)
      continue
    }
    let raw = fs.readFileSync(jsonPath, 'utf-8')
    const before = raw
    raw = raw.replace(/"images\/uploads\/(.+)\.(png|jpe?g)"/gi, '"images/uploads/$1.webp"')
    if (raw !== before) {
      fs.writeFileSync(jsonPath, raw, 'utf-8')
      console.log(`Updated ${path.basename(jsonPath)}`)
    } else {
      console.log(`No changes in ${path.basename(jsonPath)}`)
    }
  }

  console.log('\nDone.')
}

convertAll().catch((err) => {
  console.error(err)
  process.exit(1)
})
