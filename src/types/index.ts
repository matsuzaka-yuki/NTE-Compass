export type MarkerType =
  | 'phonebooth'
  | 'tower'
  | 'checkin'
  | 'oraclestone'
  | 'gift21'
  | 'package'
  | 'anomaly'
  | 'sidequest'
  | 'pilgrimage'
  | 'qj'
  | 'car'
  | 'pyz'
  | 'msz'
  | 'fdz'
  | 'dyz'
  | 'tcs'
  | 'lmz'
  | 'sxyx'
  | 'sqn'
  | 'kkj'
  | 'yo'
  | 'yxxl'
  | 'yxjy'
  | 'yxqd'
  | 'mnzj'
  | 'fzyh'
  | 'gmz'
  | 'cpjfdl'
  | 'nns'
  | 'zyzd'
  | 'bbt'
  | 'cmd'
  | 'fsjfdl'
  | 'fjz'
  | 'wz'
  | 'mrr'
  | 'wlcb'
  | 'dht'
  | 'htyf'
  | 'yr'
  | 'yd'

/** 全景图之间的连接（热点） */
export interface PanoramaLink {
  /** 目标标记的 ID */
  targetMarkerId: string
  /** 热点在全景图中的水平角度 (0-360) */
  yaw: number
  /** 热点在全景图中的垂直角度 (-90 ~ 90) */
  pitch: number
  /** 热点标签文字 */
  label?: string
}

export type TimeOfDay = 'day' | 'night'
export type Weather = 'sunny' | 'rainy' | 'snowy'

export const TIME_OPTIONS: { value: TimeOfDay; label: string; icon: string }[] = [
  { value: 'day', label: '白天', icon: '☀️' },
  { value: 'night', label: '夜晚', icon: '🌙' },
]

export const WEATHER_OPTIONS: { value: Weather; label: string; icon: string }[] = [
  { value: 'sunny', label: '晴天', icon: '☀️' },
  { value: 'rainy', label: '雨天', icon: '🌧️' },
  { value: 'snowy', label: '雪天', icon: '❄️' },
]

export interface MarkerData {
  id: string
  name: string
  types: MarkerType[]
  lat: number
  lng: number
  description?: string
  image?: string
  images?: string[]
  refreshTime?: string
  relatedQuest?: string
  relatedItems?: string[]
  counts?: Record<string, number>
  isUserCreated?: boolean
  panoramaImage?: string
  audioFile?: string
  /** 全景图之间的连接热点 */
  panoramaLinks?: PanoramaLink[]
  /** 时间：白天/夜晚 */
  time?: TimeOfDay
  /** 天气：晴天/雨天/雪天 */
  weather?: Weather
}

/** Legacy single-type format for migration */
export interface LegacyMarkerData {
  id: string
  name: string
  type: MarkerType
  lat: number
  lng: number
  description?: string
  image?: string
  images?: string[]
  refreshTime?: string
  relatedQuest?: string
  relatedItems?: string[]
  count?: number
  isUserCreated?: boolean
  counts?: Record<string, number>
  types?: MarkerType[]
  panoramaImage?: string
  audioFile?: string
  panoramaLinks?: PanoramaLink[]
  time?: TimeOfDay
  weather?: Weather
}

export function migrateMarker(raw: LegacyMarkerData): MarkerData {
  const types: MarkerType[] = raw.types ?? (raw.type ? [raw.type] : ['phonebooth'])
  let counts: Record<string, number> | undefined = raw.counts
  if (!counts && raw.count !== undefined && raw.count > 0) {
    const ec = types.find(t => ENEMY_CLEARING_TYPES.includes(t))
    if (ec) counts = { [ec]: raw.count }
  }
  return {
    id: raw.id,
    name: raw.name,
    types,
    lat: raw.lat,
    lng: raw.lng,
    description: raw.description,
    image: raw.image,
    images: raw.images,
    refreshTime: raw.refreshTime,
    relatedQuest: raw.relatedQuest,
    relatedItems: raw.relatedItems,
    counts,
    isUserCreated: raw.isUserCreated,
    panoramaImage: raw.panoramaImage,
    audioFile: raw.audioFile,
    panoramaLinks: raw.panoramaLinks,
    time: raw.time,
    weather: raw.weather,
  }
}

export interface RouteSegment {
  id: string
  name: string
  markerIds: string[]
}

export interface RouteData {
  id: string
  name: string
  image?: string
  segments: RouteSegment[]
}

export interface ItemData {
  id: string
  name: string
  image?: string
}

export const ALL_ITEMS: ItemData[] = [
  { id: 'xy', name: '絮语', image: './images/objects/xy.png' },
  { id: 'hw', name: '幻妄', image: './images/objects/hw.png' },
  { id: 'sf', name: '数符', image: './images/objects/sf.png' },
  { id: 'ly', name: '掠影', image: './images/objects/ly.png' },
]

export function getItemById(id: string): ItemData | undefined {
  return ALL_ITEMS.find((item) => item.id === id)
}

export type FilterMode = 'all' | 'unfound'

export const ALL_MARKER_TYPES: MarkerType[] = [
  'phonebooth',
  'tower',
  'checkin',
  'oraclestone',
  'gift21',
  'package',
  'anomaly',
  'sidequest',
  'pilgrimage',
  'qj',
  'car',
  'pyz',
  'msz',
  'fdz',
  'dyz',
  'tcs',
  'lmz',
  'sxyx',
  'sqn',
  'kkj',
  'yo',
  'yxxl',
  'yxjy',
  'yxqd',
  'mnzj',
  'fzyh',
  'gmz',
  'cpjfdl',
  'nns',
  'zyzd',
  'bbt',
  'cmd',
  'fsjfdl',
  'fjz',
  'wz',
  'mrr',
  'wlcb',
  'dht',
  'htyf',
  'yr',
  'yd',
]

export interface CategoryDef {
  label: string
  types: MarkerType[]
}

export const ENEMY_CLEARING_TYPES: MarkerType[] = ['pyz', 'msz', 'fdz', 'dyz', 'tcs', 'lmz', 'sxyx', 'sqn', 'kkj', 'yo', 'gmz', 'cpjfdl', 'nns', 'zyzd', 'bbt', 'cmd', 'fsjfdl', 'fjz', 'wz', 'mrr', 'wlcb', 'dht', 'htyf', 'yr', 'yd']

/** 传送点中折叠为一组的子类型（异象巡礼/界域/追猎/魔女之家/粉爪总行） */
export const TELEPORT_SUB_TYPES: MarkerType[] = ['yxxl', 'yxjy', 'yxqd', 'mnzj', 'fzyh']

/** 传送点中直接展示的基础类型（电话亭/维特海默塔） */
export const TELEPORT_BASIC_TYPES: MarkerType[] = ['phonebooth', 'tower']

export function isEnemyClearingType(type: MarkerType): boolean {
  return (ENEMY_CLEARING_TYPES as MarkerType[]).includes(type)
}

export function getEnemyClearingTypes(types: MarkerType[]): MarkerType[] {
  return types.filter(t => isEnemyClearingType(t))
}

export function getPrimaryType(types: MarkerType[], selectedTypes: Set<MarkerType>): MarkerType {
  return types.find(t => selectedTypes.has(t)) || types[0]
}

export function getOverlayTypes(types: MarkerType[], selectedTypes: Set<MarkerType>): MarkerType[] {
  const allMatching = types.filter(t => selectedTypes.has(t))
  if (allMatching.length <= 1) return []
  return allMatching.slice(1)
}

export const MARKER_CATEGORIES: CategoryDef[] = [
  { label: '传送点', types: ['phonebooth', 'tower', 'yxxl', 'yxjy', 'yxqd', 'mnzj', 'fzyh'] },
  { label: '收集品', types: ['oraclestone', 'gift21', 'package'] },
  { label: '任务', types: ['anomaly', 'sidequest'] },
  { label: '景点', types: ['checkin', 'pilgrimage', 'qj'] },
  { label: '敌影清剿', types: ['pyz', 'msz', 'fdz', 'dyz', 'tcs', 'lmz', 'sxyx', 'sqn', 'kkj', 'yo', 'gmz', 'cpjfdl', 'nns', 'zyzd', 'bbt', 'cmd', 'fsjfdl', 'fjz', 'wz', 'mrr', 'wlcb', 'dht', 'htyf', 'yr', 'yd'] },
  { label: '其他', types: ['car'] },
]


import { resolveAssetUrl } from '@/config'

export function getIconUrl(type: MarkerType): string {
  return resolveAssetUrl(`./images/icons/${type}.png`)
}

export const MARKER_TYPE_CONFIG: Record<
  MarkerType,
  { label: string; color: string; bgColor: string; icon: string; iconUrl: string }
> = {
  phonebooth: {
    label: '电话亭',
    color: '#3b82f6',
    bgColor: '#dbeafe',
    icon: 'M17 2H7C5.9 2 5 2.9 5 4v16c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V6h-2v3h-3l4 4 4-4h-3z',
    iconUrl: './images/icons/phonebooth.png',
  },
  tower: {
    label: '维特海默塔',
    color: '#8b5cf6',
    bgColor: '#ede9fe',
    icon: 'M12 2L4 7v2h2v11H4v2h16v-2h-2V9h2V7l-8-5zm-2 7h4v2h-4V9zm0 4h4v2h-4v-2zm0 4h4v2h-4v-2z',
    iconUrl: './images/icons/tower.png',
  },
  checkin: {
    label: '打卡点',
    color: '#22c55e',
    bgColor: '#dcfce7',
    icon: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm-1.5 9l-2-2L7 10.5 10.5 14 17 7.5 15.5 6l-5 5z',
    iconUrl: './images/icons/checkin.png',
  },
  oraclestone: {
    label: '谕石',
    color: '#f59e0b',
    bgColor: '#fef3c7',
    icon: 'M12 2l4 5h-3l2 6H9l2-6H8l4-5zm6 9l-3 1 5 6-4 2 1-4-1-1 2-4zm-12 0l-2 4-1 1 1 4-4-2 5-6-3-1z',
    iconUrl: './images/icons/oraclestone.png',
  },
  gift21: {
    label: '21的赠礼',
    color: '#ec4899',
    bgColor: '#fce7f3',
    icon: 'M20 12v6H4v-6M20 6H4v6h16V6zM12 6v12M12 2c-1.1 0-2 .9-2 2 0 .74.4 1.38 1 1.72V6h2V5.72c.6-.34 1-.98 1-1.72 0-1.1-.9-2-2-2zm-6 4h2v2H6v-2zm10 0h2v2h-2v-2z',
    iconUrl: './images/icons/gift21.png',
  },
  package: {
    label: '避役的包裹',
    color: '#14b8a6',
    bgColor: '#ccfbf1',
    icon: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5M6 9.5V16l6 3V12.5l-6-3zm12 0l-6 3V19l6-3V9.5z',
    iconUrl: './images/icons/package.png',
  },
  anomaly: {
    label: '异象委托',
    color: '#ef4444',
    bgColor: '#fee2e2',
    icon: 'M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z',
    iconUrl: './images/icons/anomaly.png',
  },
  sidequest: {
    label: '支线任务',
    color: '#f97316',
    bgColor: '#ffedd5',
    icon: 'M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 7V3.5L18.5 9H13zM6 20V4h5v7h7v9H6zm2-6h2v-2H8v2zm0 4h8v-2H8v2z',
    iconUrl: './images/icons/sidequest.png',
  },
  pilgrimage: {
    label: '圣地巡礼',
    color: '#6366f1',
    bgColor: '#e0e7ff',
    icon: 'M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6h-5.6zM18 14h-3l-.4-2H7V6h5l.4 2H18v6z',
    iconUrl: './images/icons/pilgrimage.png',
  },
  qj: {
    label: '街景',
    color: '#06b6d4',
    bgColor: '#cffafe',
    icon: 'M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z',
    iconUrl: './images/icons/qj.png',
  },
  car: {
    label: '车辆',
    color: '#78716c',
    bgColor: '#f5f5f4',
    icon: 'M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.22.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.85 7h10.29l1.08 3.11H5.77L6.85 7zM19 17H5v-5h14v5zM7.5 16c-.83 0-1.5-.67-1.5-1.5S6.67 13 7.5 13s1.5.67 1.5 1.5S8.33 16 7.5 16zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z',
    iconUrl: './images/icons/car.png',
  },
  pyz: {
    label: '凭依种',
    color: '#c084fc',
    bgColor: '#f3e8ff',
    icon: 'M12 2l4 6-4 6-4-6 4-6zm0 4.5L10.5 9 12 11.25 13.5 9 12 6.5z',
    iconUrl: './images/icons/pyz.png',
  },
  msz: {
    label: '迷失种',
    color: '#60a5fa',
    bgColor: '#e0f2fe',
    icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z',
    iconUrl: './images/icons/msz.png',
  },
  fdz: {
    label: '风洞种',
    color: '#34d399',
    bgColor: '#d1fae5',
    icon: 'M4 18h8c1.1 0 2-.9 2-2s-.9-2-2-2H4v-2h8c2.21 0 4 1.79 4 4s-1.79 4-4 4H4v-2zm0-8h11c1.1 0 2-.9 2-2s-.9-2-2-2H4v2h11v2H4z',
    iconUrl: './images/icons/fdz.png',
  },
  dyz: {
    label: '低语种',
    color: '#f472b6',
    bgColor: '#fce7f3',
    icon: 'M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z',
    iconUrl: './images/icons/dyz.png',
  },
  tcs: {
    label: '拖车艄',
    color: '#fb923c',
    bgColor: '#fff7ed',
    icon: 'M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.22.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.85 7h10.29l1.08 3.11H5.77L6.85 7zM19 17H5v-5h14v5z',
    iconUrl: './images/icons/tcs.png',
  },
  lmz: {
    label: '流梦种',
    color: '#a78bfa',
    bgColor: '#ede9fe',
    icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z',
    iconUrl: './images/icons/lmz.png',
  },
  sxyx: {
    label: '伤心英熊',
    color: '#f87171',
    bgColor: '#fef2f2',
    icon: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z',
    iconUrl: './images/icons/sxyx.png',
  },
  sqn: {
    label: '扫晴娘',
    color: '#fbbf24',
    bgColor: '#fffbeb',
    icon: 'M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9zm0 16c-3.86 0-7-3.14-7-7s3.14-7 7-7 7 3.14 7 7-3.14 7-7 7zm1-11h-2v3H8v2h3v3h2v-3h3v-2h-3V8z',
    iconUrl: './images/icons/sqn.png',
  },
  kkj: {
    label: '空铠甲',
    color: '#94a3b8',
    bgColor: '#f1f5f9',
    icon: 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 12h2v5H7v-5zm4-4h2v9h-2V8zm4 3h2v6h-2v-6z',
    iconUrl: './images/icons/kkj.png',
  },
  yo: {
    label: '羽偶',
    color: '#2dd4bf',
    bgColor: '#ccfbf1',
    icon: 'M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z',
    iconUrl: './images/icons/yo.png',
  },
  yxxl: {
    label: '异象巡礼',
    color: '#e11d48',
    bgColor: '#ffe4e6',
    icon: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
    iconUrl: './images/icons/yxxl.png',
  },
  yxjy: {
    label: '异象界域',
    color: '#7c3aed',
    bgColor: '#ede9fe',
    icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z',
    iconUrl: './images/icons/yxjy.png',
  },
  yxqd: {
    label: '异象追猎',
    color: '#dc2626',
    bgColor: '#fecaca',
    icon: 'M15 3H9v3H3v2h2v12h14V8h2V6h-6V3zm-4 2h2v2h-2V5zM7 8h10v12H7V8zm5 5l-4 4h8l-4-4z',
    iconUrl: './images/icons/yxqd.png',
  },
  mnzj: {
    label: '魔女之家',
    color: '#a855f7',
    bgColor: '#f3e8ff',
    icon: 'M12 2L4 7v2h2v11H4v2h16v-2h-2V9h2V7l-8-5zm-2 7h4v2h-4V9zm0 4h4v2h-4v-2zm0 4h4v2h-4v-2z',
    iconUrl: './images/icons/mnzj.png',
  },
  fzyh: {
    label: '粉爪总行',
    color: '#fb7185',
    bgColor: '#ffe4e6',
    icon: 'M12 2L4 7v2h2v11H4v2h16v-2h-2V9h2V7l-8-5zm-2 7h4v2h-4V9zm0 4h4v2h-4v-2zm0 4h4v2h-4v-2z',
    iconUrl: './images/icons/fzyh.png',
  },
  gmz: {
    label: '诡面筝',
    color: '#f43f5e',
    bgColor: '#ffe4e6',
    icon: 'M12 2l4 6-4 6-4-6 4-6zm0 4.5L10.5 9 12 11.25 13.5 9 12 6.5z',
    iconUrl: './images/icons/gmz.png',
  },
  cpjfdl: {
    label: '唱片机附电灵',
    color: '#06b6d4',
    bgColor: '#cffafe',
    icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z',
    iconUrl: './images/icons/cpjfdl.png',
  },
  nns: {
    label: '诺诺斯',
    color: '#84cc16',
    bgColor: '#ecfccb',
    icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z',
    iconUrl: './images/icons/nns.png',
  },
  zyzd: {
    label: '纸翼战队',
    color: '#e879f9',
    bgColor: '#f5d0fe',
    icon: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z',
    iconUrl: './images/icons/zyzd.png',
  },
  bbt: {
    label: '抱抱藤',
    color: '#22d3ee',
    bgColor: '#cffafe',
    icon: 'M12 2L4 7v2h2v11H4v2h16v-2h-2V9h2V7l-8-5zm-2 7h4v2h-4V9zm0 4h4v2h-4v-2zm0 4h4v2h-4v-2z',
    iconUrl: './images/icons/bbt.png',
  },
  cmd: {
    label: '长明灯',
    color: '#fbbf24',
    bgColor: '#fffbeb',
    icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z',
    iconUrl: './images/icons/cmd.png',
  },
  fsjfdl: {
    label: '贩售机附电灵',
    color: '#10b981',
    bgColor: '#d1fae5',
    icon: 'M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V6h16v12zM6 10h12v2H6v-2zm0 4h8v2H6v-2z',
    iconUrl: './images/icons/fsjfdl.png',
  },
  fjz: {
    label: '分解者',
    color: '#ef4444',
    bgColor: '#fee2e2',
    icon: 'M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z',
    iconUrl: './images/icons/fjz.png',
  },
  wz: {
    label: '蚊子',
    color: '#475569',
    bgColor: '#f1f5f9',
    icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-2h2v2zm0-4h-2V7h2v6z',
    iconUrl: './images/icons/wz.png',
  },
  mrr: {
    label: '棉绒绒',
    color: '#f59e0b',
    bgColor: '#fef3c7',
    icon: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z',
    iconUrl: './images/icons/mrr.png',
  },
  wlcb: {
    label: '瓦楞城堡',
    color: '#d946ef',
    bgColor: '#fae8ff',
    icon: 'M12 2L4 7v2h2v11H4v2h16v-2h-2V9h2V7l-8-5zm-2 7h4v2h-4V9zm0 4h4v2h-4v-2zm0 4h4v2h-4v-2z',
    iconUrl: './images/icons/wlcb.png',
  },
  dht: {
    label: 'ReroRero电话亭',
    color: '#0ea5e9',
    bgColor: '#e0f7fe',
    icon: 'M17 2H7C5.9 2 5 2.9 5 4v16c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V6h-2v3h-3l4 4 4-4h-3z',
    iconUrl: './images/icons/dht.png',
  },
  htyf: {
    label: '洄天鱼幡',
    color: '#65a30d',
    bgColor: '#f3fae3',
    icon: 'M12 2l4 6-4 6-4-6 4-6zm0 4.5L10.5 9 12 11.25 13.5 9 12 6.5z',
    iconUrl: './images/icons/htyf.png',
  },
  yr: {
    label: '雨人',
    color: '#64748b',
    bgColor: '#f8fafc',
    icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z',
    iconUrl: './images/icons/yr.png',
  },
  yd: {
    label: '妖刀',
    color: '#ea580c',
    bgColor: '#fff3e0',
    icon: 'M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6h-5.6zM18 14h-3l-.4-2H7V6h5l.4 2H18v6z',
    iconUrl: './images/icons/yd.png',
  },
}
