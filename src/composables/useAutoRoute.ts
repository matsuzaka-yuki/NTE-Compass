/**
 * 全怪路线自动生成。
 *
 * 算法：
 * 1. 收集所有筛选可见的敌人清剿标记
 * 2. 收集传送点（电话亭/维特海默塔/粉爪/魔女之家）
 * 3. 最近邻贪心 TSP：从起始点出发，每次找最近的下一个目标
 *    - 如果当前点到目标的距离 > 阈值，优先插入最近的传送点作为中转
 * 4. 生成分段路线，每段是一组相近的标记
 * 5. 起始点 = 第一个标记
 */
import type { MarkerData, MarkerType } from '@/types'
import { ENEMY_CLEARING_TYPES, MARKER_TYPE_CONFIG } from '@/types'

const TELEPORT_TYPES: MarkerType[] = ['phonebooth', 'tower', 'mnzj', 'fzyh']

interface Point {
  id: string
  lat: number
  lng: number
  name: string
}

function dist(a: Point, b: Point): number {
  const dy = a.lat - b.lat
  const dx = a.lng - b.lng
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * 找到离 from 最近的传送点
 */
function nearestTeleport(from: Point, teleports: Point[]): Point | null {
  if (teleports.length === 0) return null
  let best = teleports[0]
  let bestDist = dist(from, best)
  for (const tp of teleports) {
    const d = dist(from, tp)
    if (d < bestDist) {
      bestDist = d
      best = tp
    }
  }
  return best
}

/**
 * 生成最优全怪路线。
 *
 * @param markers 所有标记（从中筛选敌人和传送点）
 * @param selectedTypes 当前选中的类型（只考虑选中的敌人类型）
 * @param useTeleportStart 如果 true，起点选最近的4大传送点而非起始怪
 * @returns 排序后的标记 ID 列表 + 起始点 ID
 */
export function generateOptimalRoute(
  markers: MarkerData[],
  selectedTypes: Set<MarkerType>,
  useTeleportStart = false
): { orderedIds: string[]; startId: string | null } {
  // 收集敌人标记
  const enemies: Point[] = markers
    .filter(m =>
      m.types.some(t => ENEMY_CLEARING_TYPES.includes(t) && selectedTypes.has(t))
    )
    .map(m => ({ id: m.id, lat: m.lat, lng: m.lng, name: m.name }))

  if (enemies.length === 0) return { orderedIds: [], startId: null }

  // 收集传送点
  const teleports: Point[] = markers
    .filter(m =>
      m.types.some(t => TELEPORT_TYPES.includes(t) && selectedTypes.has(t))
    )
    .map(m => ({ id: m.id, lat: m.lat, lng: m.lng, name: m.name }))

  // 最近邻贪心 TSP
  const visited = new Set<string>()
  const result: string[] = []

  // 敌人重心
  const cx = enemies.reduce((s, p) => s + p.lng, 0) / enemies.length
  const cy = enemies.reduce((s, p) => s + p.lat, 0) / enemies.length
  const center: Point = { id: '', lat: cy, lng: cx, name: 'center' }

  let current: Point

  if (useTeleportStart && teleports.length > 0) {
    // 找离敌人重心最近的4大传送点作为起点
    // 按类型分组，每类取最近的
    const teleportByType = new Map<string, { point: Point; d: number }>()
    for (const tp of teleports) {
      const m = markers.find(mk => mk.id === tp.id)
      if (!m) continue
      for (const t of m.types) {
        if (!TELEPORT_TYPES.includes(t)) continue
        const d = dist(center, tp)
        const existing = teleportByType.get(t)
        if (!existing || d < existing.d) {
          teleportByType.set(t, { point: tp, d })
        }
      }
    }
    // 从各类型最近的传送点中，选离重心最近的，仅作贪心遍历的起始位置
    const candidates = [...teleportByType.values()].sort((a, b) => a.d - b.d)
    current = candidates[0]?.point ?? enemies[0]
    // 不将传送点加入 result/visited — 它不是清剿目标，只是位置参考
    // 从传送点出发，先找最近的敌人作为路线的第一个标记
    let firstEnemy: Point | null = null
    let firstDist = Infinity
    for (const e of enemies) {
      const d = dist(current, e)
      if (d < firstDist) { firstDist = d; firstEnemy = e }
    }
    if (firstEnemy) {
      current = firstEnemy
      visited.add(firstEnemy.id)
      result.push(firstEnemy.id)
    }
  } else {
    // 原逻辑：选离中心最近的敌人标记作为起点
    let startIdx = 0
    let startDist = Infinity
    enemies.forEach((p, i) => {
      const d = dist(center, p)
      if (d < startDist) {
        startDist = d
        startIdx = i
      }
    })
    current = enemies[startIdx]
    visited.add(current.id)
    result.push(current.id)
  }

  // 距离阈值：超过这个距离考虑传送
  const avgDist = enemies.length > 1
    ? enemies.reduce((s, p) => s + dist(current, p), 0) / enemies.length
    : 0
  const teleportThreshold = Math.max(0.05, avgDist * 1.8)

  // 逐步找最近未访问的敌人
  for (let i = 1; i < enemies.length; i++) {
    let nearest: Point | null = null
    let nearestDist = Infinity

    for (const p of enemies) {
      if (visited.has(p.id)) continue
      let d = dist(current, p)
      // 如果距离太远，考虑传送中转：找最近的传送点，计算传送后的距离
      if (d > teleportThreshold && teleports.length > 0) {
        const tp = nearestTeleport(current, teleports)
        if (tp) {
          // 假设传送后从传送点到目标的距离
          d = dist(tp, p) * 0.3 // 传送大幅缩短距离
        }
      }
      if (d < nearestDist) {
        nearestDist = d
        nearest = p
      }
    }

    if (nearest) {
      visited.add(nearest.id)
      result.push(nearest.id)
      current = nearest
    }
  }

  return { orderedIds: result, startId: result[0] ?? null }
}

/**
 * 将排序的标记 ID 列表分成路段（按地理位置聚类）。
 * 每段包含地理位置相近的标记。
 */
export function segmentRoute(
  orderedIds: string[],
  markers: MarkerData[]
): { name: string; markerIds: string[] }[] {
  if (orderedIds.length === 0) return []

  const idToMarker = new Map(markers.map(m => [m.id, m]))

  // 计算相邻标记间距离，距离突变处分段
  const segments: { name: string; markerIds: string[] }[] = []
  let currentSegment: string[] = [orderedIds[0]]
  let segIdx = 1

  const segmentDistance = 0.06 // 超过这个距离分新段

  for (let i = 1; i < orderedIds.length; i++) {
    const prev = idToMarker.get(orderedIds[i - 1])
    const curr = idToMarker.get(orderedIds[i])
    if (!prev || !curr) continue

    const d = dist(
      { id: prev.id, lat: prev.lat, lng: prev.lng, name: prev.name },
      { id: curr.id, lat: curr.lat, lng: curr.lng, name: curr.name }
    )

    if (d > segmentDistance && currentSegment.length >= 2) {
      // 分新段
      segments.push({
        name: `路线 ${segIdx}`,
        markerIds: [...currentSegment],
      })
      segIdx++
      currentSegment = [orderedIds[i]]
    } else {
      currentSegment.push(orderedIds[i])
    }
  }

  // 最后一段
  if (currentSegment.length > 0) {
    segments.push({
      name: `路线 ${segIdx}`,
      markerIds: currentSegment,
    })
  }

  return segments
}
