// One-shot token migration for SideBar.vue (and later, other components).
// Maps the old dark-only Tailwind v3 classes onto the new semantic tokens
// defined in main.css @theme. Run with: node scripts/migrate-tokens.cjs
//
// Rules are applied as literal substring replacements, longest-first within
// each group to avoid partial overlaps (e.g. border-white/10 before border-white/1).
const fs = require('fs')
const path = require('path')

const target = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.resolve(__dirname, '..', 'src', 'components', 'SideBar.vue')

let src = fs.readFileSync(target, 'utf8')
const before = src

// Order matters: longer / more-specific patterns first.
const rules = [
  // ---- borders ----
  ['border-white/20', 'border-border-strong'],
  ['border-white/15', 'border-border-strong'],
  ['border-white/10', 'border-default'],
  ['border-white/5', 'border-default'],
  // ---- backgrounds: surfaces ----
  ['bg-surface-900/95', 'bg-surface/95'],
  ['bg-surface-900/98', 'bg-surface/98'],
  ['bg-surface-900/90', 'bg-surface/90'],
  ['bg-surface-900', 'bg-surface'],
  ['bg-surface-800/95', 'bg-overlay/95'],
  ['bg-surface-800/90', 'bg-overlay/90'],
  ['bg-surface-800/80', 'bg-overlay/80'],
  ['bg-surface-800', 'bg-elevated'],
  ['bg-surface-700/80', 'bg-elevated/80'],
  ['bg-surface-700', 'bg-elevated'],
  // ---- hover backgrounds (whitespace/hover variants) ----
  ['hover:bg-white/10', 'hover:bg-elevated'],
  ['hover:bg-white/5', 'hover:bg-elevated'],
  ['bg-white/10', 'bg-elevated'],
  ['bg-white/5', 'bg-elevated/60'],
  ['bg-white/[0.02]', 'bg-elevated/40'],
  ['bg-white/[0.04]', 'bg-elevated/60'],
  // ---- text colors ----
  ['hover:text-white', 'hover:text-base'],
  ['text-slate-200', 'text-base'],
  ['text-slate-300', 'text-muted'],
  ['text-slate-400', 'text-muted'],
  ['text-slate-500', 'text-faint'],
  ['text-slate-600', 'text-faint'],
  ['placeholder-slate-500', 'placeholder:text-faint'],
]

let total = 0
for (const [from, to] of rules) {
  // Count occurrences (global, split-join to avoid regex escaping pitfalls)
  const parts = src.split(from)
  const count = parts.length - 1
  if (count > 0) {
    src = parts.join(to)
    total += count
    console.log(`${String(count).padStart(3)}  ${from}  ->  ${to}`)
  }
}

console.log(`\nTotal replacements: ${total}`)
console.log(`File changed: ${src !== before}`)

fs.writeFileSync(target, src, 'utf8')
console.log(`Wrote: ${target}`)
