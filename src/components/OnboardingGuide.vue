<script setup lang="ts">
/**
 * 新手指南 / 功能引导。
 *
 * 首次访问自动弹出（localStorage 记忆「已看过」），也可通过 props
 * `forceOpen` 由设置面板手动触发。分步介绍核心功能。
 */
import { computed, ref, watch } from 'vue'
import { Dialog, Btn, AppIcon, type IconName } from '@/components/ui'

const props = defineProps<{ forceOpen?: boolean }>()
const emit = defineEmits<{ (e: 'close'): void }>()

const STORAGE_KEY = 'isekai-map-onboarding-done'
const SEEN = typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY) === '1'

const open = ref(!SEEN)
const step = ref(0)

// 手动触发（设置面板）
watch(
  () => props.forceOpen,
  (v) => {
    if (v) {
      step.value = 0
      open.value = true
    }
  },
)

interface GuideStep {
  icon: IconName
  title: string
  body: string
}

const steps: GuideStep[] = [
  {
    icon: 'filter',
    title: '筛选标记',
    body: '侧栏按分类（传送点 / 收集品 / 任务 / 景点 / 敌影清剿）勾选想看的类型。点分类标签可一键全选/取消该分类。顶部进度条实时显示已收集数量。',
  },
  {
    icon: 'search',
    title: '搜索定位',
    body: '点侧栏顶部搜索图标，输入关键词即可模糊搜索全部标记点。移动端点左上角放大镜展开搜索栏。',
  },
  {
    icon: 'check',
    title: '收集追踪',
    body: '点击地图上的标记，在弹窗里点「标记找到」记录进度。进度自动保存到浏览器，下次打开无需重标。工具栏的「未收集」可一键只看还没找的。',
  },
  {
    icon: 'route',
    title: '路线规划',
    body: '侧栏点路线图标（桌面端右上）进入路线视图。编辑模式下可创建路线、添加路段、拖拽排序。点「开刷」进入刷怪模式，按组快速导航。',
  },
  {
    icon: 'sun',
    title: '主题与设置',
    body: '右下角齿轮打开设置：切换浅色/深色/跟随系统主题，控制时间/天气/怪物数量显示，导出导入数据。以后想再看这份指南，也在设置里点「新手指南」。',
  },
]

const current = computed(() => steps[step.value])
const isFirst = computed(() => step.value === 0)
const isLast = computed(() => step.value === steps.length - 1)

function next() {
  if (isLast.value) finish()
  else step.value++
}
function prev() {
  if (!isFirst.value) step.value--
}
function finish() {
  open.value = false
  localStorage.setItem(STORAGE_KEY, '1')
  emit('close')
}
function skip() {
  open.value = false
  localStorage.setItem(STORAGE_KEY, '1')
  emit('close')
}
</script>

<template>
  <Dialog :open="open" :no-dismiss="true" width="400px" @close="skip">
    <!-- Step indicator dots -->
    <div class="flex items-center justify-center gap-1.5 mb-4">
      <button
        v-for="(s, i) in steps"
        :key="i"
        class="h-1.5 rounded-full transition-all"
        :class="i === step ? 'w-5 bg-primary-500' : 'w-1.5 bg-default hover:bg-border-strong'"
        :title="`第 ${i + 1} 步`"
        @click="step = i"
      />
    </div>

    <!-- Step content (fixed min-height so dialog doesn't jump between steps) -->
    <div class="flex flex-col items-center text-center pb-2">
      <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-500/10 text-primary-500 dark:text-primary-400 mb-3">
        <AppIcon :name="current.icon" class="h-7 w-7" />
      </div>
      <h3 class="text-base font-semibold text-base mb-2 flex items-center gap-1.5">
        {{ current.title }}
      </h3>
      <p class="flex min-h-[7.5rem] items-center text-sm leading-relaxed text-muted">{{ current.body }}</p>
    </div>

    <!-- Footer: prev / skip / next -->
    <template #footer>
      <Btn variant="ghost" size="sm" @click="skip">跳过</Btn>
      <div class="flex-1" />
      <Btn v-if="!isFirst" variant="secondary" size="sm" @click="prev">
        <AppIcon name="chevronLeft" class="h-3.5 w-3.5" />
        上一步
      </Btn>
      <Btn variant="primary" size="sm" @click="next">
        {{ isLast ? '开始探索' : '下一步' }}
        <AppIcon v-if="!isLast" name="chevronRight" class="h-3.5 w-3.5" />
      </Btn>
    </template>
  </Dialog>
</template>
