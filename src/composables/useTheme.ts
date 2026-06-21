import { computed, onScopeDispose, readonly, ref } from 'vue'

export type ThemeMode = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'isekai-map-theme'

const mode = ref<ThemeMode>(loadMode())
const systemDark = ref(matchesSystemDark())

let initialized = false
const listeners = new Set<(dark: boolean) => void>()

function loadMode(): ThemeMode {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  return 'system'
}

function matchesSystemDark(): boolean {
  return typeof window !== 'undefined'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
    : true
}

/** True when the *effective* theme is dark. */
export const isDark = computed(() =>
  mode.value === 'system' ? systemDark.value : mode.value === 'dark',
)

export const themeMode = readonly(mode)

/** Apply the current mode to <html>. Call once before mount to avoid FOUC. */
function apply() {
  const root = document.documentElement
  if (isDark.value) {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}

export function setThemeMode(next: ThemeMode) {
  mode.value = next
  localStorage.setItem(STORAGE_KEY, next)
  apply()
  listeners.forEach((fn) => fn(isDark.value))
}

/**
 * Wire up system-theme tracking. Safe to call multiple times; only the first
 * call attaches listeners. Must run in the browser.
 */
export function initTheme() {
  if (initialized || typeof window === 'undefined') return
  initialized = true

  const mql = window.matchMedia('(prefers-color-scheme: dark)')
  const onSystem = (e: MediaQueryListEvent) => {
    systemDark.value = e.matches
    if (mode.value === 'system') apply()
  }
  mql.addEventListener('change', onSystem)
}

// Apply immediately on module load (before Vue mounts) to prevent flash.
if (typeof window !== 'undefined') {
  apply()
}

/**
 * Reactive theme access for components. Also keeps listeners alive for the
 * lifetime of the calling component (auto-disposes via onScopeDispose).
 */
export function useTheme() {
  initTheme()
  onScopeDispose(() => {
    // listeners are global; nothing to remove per-component
  })
  return { mode: themeMode, isDark, setThemeMode }
}
