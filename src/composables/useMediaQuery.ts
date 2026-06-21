/**
 * Reactive media-query hook. Fixes the stale-`isMobile` bug in the original
 * SideBar.vue (which only refreshed `isMobile` inside a ResizeObserver on the
 * detail panel — so it went stale when that panel wasn't mounted).
 *
 * Uses matchMedia so it tracks real viewport changes without manual resize
 * listeners.
 */
import { onScopeDispose, readonly, ref } from 'vue'

export function useMediaQuery(query: string) {
  const matches = ref(false)

  if (typeof window !== 'undefined') {
    const mql = window.matchMedia(query)
    matches.value = mql.matches
    const onChange = (e: MediaQueryListEvent) => {
      matches.value = e.matches
    }
    mql.addEventListener('change', onChange)
    onScopeDispose(() => mql.removeEventListener('change', onChange))
  }

  return readonly(matches)
}

/** Convenience: true below the md breakpoint (768px). */
export function useIsMobile() {
  return useMediaQuery('(max-width: 767px)')
}
