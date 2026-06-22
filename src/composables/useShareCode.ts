/**
 * 收集进度 + 收藏夹分享码：把 foundIds 和 bookmarkedIds 编码成短字符串。
 *
 * v1 格式 (向后兼容): v1:<count>:<found-bitmap>
 * v2 格式 (当前):      v2:<count>:<found-bitmap>:<bookmark-bitmap>
 *
 * 原理：按 markers 数组顺序生成位图（找到/收藏=1），每 8 位一个字节，
 * 转 base64-url（无 +/= 方便复制）。427 个标记 ≈ 72 字符/段。
 */
import type { MarkerData } from '@/types'

export interface ProgressData {
  foundIds: Set<string>
  bookmarkedIds: Set<string>
}

/** 将 foundIds + bookmarkedIds 编码成分享码 (v2) */
export function encodeProgress(foundIds: Set<string>, bookmarkedIds: Set<string>, markers: MarkerData[]): string {
  const count = markers.length
  const foundBmp = bitmapFromSet(foundIds, markers)
  const bmkBmp = bitmapFromSet(bookmarkedIds, markers)
  return `v2:${count}:${foundBmp}:${bmkBmp}`
}

/** 将分享码解码。返回 { foundIds, bookmarkedIds } 或 null。 */
export function decodeProgress(code: string, markers: MarkerData[]): ProgressData | null {
  try {
    const parts = code.trim().split(':')
    const version = parts[0]

    if (version === 'v1' && parts.length === 3) {
      // 向后兼容: v1 只有 foundIds
      const count = parseInt(parts[1], 10)
      if (count > markers.length) return null
      const found = setFromBitmap(parts[2], count, markers)
      if (!found) return null
      return { foundIds: found, bookmarkedIds: new Set() }
    }

    if (version === 'v2' && parts.length === 4) {
      const count = parseInt(parts[1], 10)
      if (count > markers.length) return null
      const found = setFromBitmap(parts[2], count, markers)
      const bmk = setFromBitmap(parts[3], count, markers)
      if (!found || !bmk) return null
      return { foundIds: found, bookmarkedIds: bmk }
    }

    return null
  } catch {
    return null
  }
}

// ── bitmap helpers ──

function bitmapFromSet(ids: Set<string>, markers: MarkerData[]): string {
  const count = markers.length
  const byteCount = Math.ceil(count / 8)
  const bytes = new Uint8Array(byteCount)
  const idToIndex = new Map<string, number>()
  markers.forEach((m, i) => idToIndex.set(m.id, i))

  for (const id of ids) {
    const idx = idToIndex.get(id)
    if (idx !== undefined) {
      bytes[Math.floor(idx / 8)] |= (1 << (idx % 8))
    }
  }
  return bytesToBase64Url(bytes)
}

function setFromBitmap(b64: string, count: number, markers: MarkerData[]): Set<string> | null {
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
    let b64 = str.replace(/-/g, '+').replace(/_/g, '/')
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
