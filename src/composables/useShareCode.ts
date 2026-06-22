/**
 * 收集进度分享码：把 foundIds 编码成短字符串，方便跨设备迁移。
 *
 * 原理：按 markers 数组顺序生成位图（找到=1/没找到=0），
 * 每 8 位组成一个字节，转成 base64-url（无 +/= 方便复制）。
 * 427 个标记 ≈ 72 字符的分享码。
 *
 * 编码格式: v1:<count>:<base64url-bitmap>
 * - v1: 版本号，未来格式变化时兼容
 * - count: 标记总数（用于校验导入时的数据是否匹配）
 * - bitmap: 位图的 base64url 编码
 */
import type { MarkerData } from '@/types'

/** 将 foundIds 编码成分享码 */
export function encodeProgress(foundIds: Set<string>, markers: MarkerData[]): string {
  const count = markers.length
  const byteCount = Math.ceil(count / 8)
  const bytes = new Uint8Array(byteCount)

  // 构建 marker id → index 的映射
  const idToIndex = new Map<string, number>()
  markers.forEach((m, i) => idToIndex.set(m.id, i))

  // 设置位图
  for (const id of foundIds) {
    const idx = idToIndex.get(id)
    if (idx !== undefined) {
      bytes[Math.floor(idx / 8)] |= (1 << (idx % 8))
    }
  }

  // Uint8Array → base64url
  const b64 = bytesToBase64Url(bytes)
  return `v1:${count}:${b64}`
}

/** 将分享码解码成 foundIds Set。返回 null 表示格式无效或数据不匹配。 */
export function decodeProgress(code: string, markers: MarkerData[]): Set<string> | null {
  try {
    const parts = code.trim().split(':')
    if (parts.length !== 3 || parts[0] !== 'v1') return null

    const count = parseInt(parts[1], 10)
    const b64 = parts[2]

    // 校验标记数量是否匹配（允许目标数据更多——新增标记后旧码仍可用）
    if (count > markers.length) return null

    const bytes = base64UrlToBytes(b64)
    if (!bytes) return null

    const result = new Set<string>()
    const maxBits = Math.min(count, markers.length)
    for (let i = 0; i < maxBits; i++) {
      if (bytes[Math.floor(i / 8)] & (1 << (i % 8))) {
        result.add(markers[i].id)
      }
    }
    return result
  } catch {
    return null
  }
}

// ── base64url helpers (no +/= or padding, URL-safe for copying) ──

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function base64UrlToBytes(str: string): Uint8Array | null {
  try {
    // 恢复标准 base64
    let b64 = str.replace(/-/g, '+').replace(/_/g, '/')
    // 补齐 padding
    const pad = b64.length % 4
    if (pad) b64 += '='.repeat(4 - pad)
    const binary = atob(b64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return bytes
  } catch {
    return null
  }
}
