import { ref } from 'vue'

/**
 * Tiny shared trigger for re-opening the onboarding guide from anywhere
 * (e.g. SettingsPanel). App.vue watches `requestId` and passes the latest
 * value to <OnboardingGuide :force-open>. Using an incrementing id avoids
 * the "same value twice → watcher doesn't fire" problem.
 */
const requestId = ref(0)

export function useGuide() {
  function openGuide() {
    requestId.value++
  }
  return { requestId, openGuide }
}
