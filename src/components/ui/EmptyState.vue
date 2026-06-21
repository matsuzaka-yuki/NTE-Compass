<script setup lang="ts">
/**
 * Empty-state placeholder — icon + message. Replaces the 5 repeated
 * "无匹配 / 无" empty rows across the sidebar.
 */
import AppIcon from './AppIcon.vue'
import type { IconName } from './icons'

withDefaults(
  defineProps<{
    text?: string
    icon?: IconName
  }>(),
  { text: '无数据', icon: 'info' },
)
</script>

<template>
  <div class="flex items-center justify-center gap-2 py-6 text-faint">
    <AppIcon :name="icon" class="h-4 w-4 opacity-50" />
    <span class="text-xs">{{ text }}</span>
  </div>
</template>
