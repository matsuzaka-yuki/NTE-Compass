<script setup lang="ts">
import { ref } from 'vue'
import { useMarkerStore } from '@/stores/markerStore'
import { MARKER_TYPE_CONFIG, MARKER_CATEGORIES } from '@/types'
import { resolveAssetUrl } from '@/config'

const store = useMarkerStore()
const expanded = ref(false)
</script>

<template>
  <div
    class="fixed bottom-6 right-6 z-20 select-none"
  >
    <!-- Toggle button -->
    <button
      @click="expanded = !expanded"
      class="w-10 h-10 rounded-xl bg-surface-800/90 backdrop-blur-md border border-white/10 shadow-lg flex items-center justify-center text-slate-300 hover:text-white hover:border-white/20 transition-all"
      :class="{ 'text-primary-400 border-primary-400/30 bg-primary-500/10': expanded }"
      title="设置"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <circle cx="12" cy="12" r="3" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" />
      </svg>
    </button>

    <!-- Settings panel -->
    <Transition name="legend">
      <div
        v-if="expanded"
        class="absolute bottom-12 right-0 mb-2 w-52 rounded-xl bg-surface-800/95 backdrop-blur-xl border border-white/10 shadow-2xl p-3 space-y-2.5"
      >
        <!-- ── Display settings ── -->
        <div class="text-xs font-medium text-slate-400 uppercase tracking-wider">显示设置</div>

        <div class="space-y-1.5">
          <!-- Time toggle -->
          <button
            @click="store.showMarkerTime = !store.showMarkerTime"
            class="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
          >
            <span class="text-xs text-slate-300">时间标记</span>
            <span
              class="inline-flex w-8 h-[18px] rounded-full transition-colors"
              :class="store.showMarkerTime ? 'bg-primary-500' : 'bg-slate-600'"
            >
              <span
                class="w-3.5 h-3.5 rounded-full bg-white shadow transition-transform mt-px ml-px"
                :class="store.showMarkerTime ? 'translate-x-3' : ''"
              />
            </span>
          </button>

          <!-- Weather toggle -->
          <button
            @click="store.showMarkerWeather = !store.showMarkerWeather"
            class="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
          >
            <span class="text-xs text-slate-300">天气标记</span>
            <span
              class="inline-flex w-8 h-[18px] rounded-full transition-colors"
              :class="store.showMarkerWeather ? 'bg-primary-500' : 'bg-slate-600'"
            >
              <span
                class="w-3.5 h-3.5 rounded-full bg-white shadow transition-transform mt-px ml-px"
                :class="store.showMarkerWeather ? 'translate-x-3' : ''"
              />
            </span>
          </button>

          <!-- Monster count toggle -->
          <button
            @click="store.showMarkerCount = !store.showMarkerCount"
            class="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
          >
            <span class="text-xs text-slate-300">怪物数量</span>
            <span
              class="inline-flex w-8 h-[18px] rounded-full transition-colors"
              :class="store.showMarkerCount ? 'bg-primary-500' : 'bg-slate-600'"
            >
              <span
                class="w-3.5 h-3.5 rounded-full bg-white shadow transition-transform mt-px ml-px"
                :class="store.showMarkerCount ? 'translate-x-3' : ''"
              />
            </span>
          </button>
        </div>

        <!-- Divider -->
        <div class="border-t border-white/10"></div>

        <!-- ── Legend ── -->
        <div class="text-xs font-medium text-slate-400 uppercase tracking-wider">图例</div>
        <template v-for="cat in MARKER_CATEGORIES" :key="cat.label">
          <div class="text-[10px] font-medium text-slate-500 uppercase tracking-wider pt-1 mb-0.5">{{ cat.label }}</div>
          <div
            v-for="type in cat.types"
            :key="type"
            @click="store.toggleType(type)"
            class="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-white/5 transition-colors"
            :class="{ 'opacity-50': !store.selectedTypes.has(type) }"
          >
            <img
              :src="resolveAssetUrl(MARKER_TYPE_CONFIG[type].iconUrl)"
              :alt="MARKER_TYPE_CONFIG[type].label"
              class="w-[18px] h-[18px] rounded-full object-cover"
            />
            <span class="text-xs text-slate-300 flex-1">{{ MARKER_TYPE_CONFIG[type].label }}</span>
          </div>
        </template>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.legend-enter-active,
.legend-leave-active {
  transition: all 0.2s ease;
}
.legend-enter-from,
.legend-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(0.95);
}
</style>
