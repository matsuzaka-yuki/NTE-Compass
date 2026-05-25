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
  | 'car'
  | 'pyz'
  | 'msz'
  | 'fdz'
  | 'dyz'

export interface MarkerData {
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
}

export interface ItemData {
  id: string
  name: string
  image?: string
}

export const ALL_ITEMS: ItemData[] = [
  { id: 'xy', name: '絮语', image: './images/objects/xy.png' },
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
  'car',
  'pyz',
  'msz',
  'fdz',
  'dyz',
]

export interface CategoryDef {
  label: string
  types: MarkerType[]
}

export const MARKER_CATEGORIES: CategoryDef[] = [
  { label: '传送点', types: ['phonebooth', 'tower'] },
  { label: '收集品', types: ['oraclestone', 'gift21', 'package'] },
  { label: '任务', types: ['anomaly', 'sidequest'] },
  { label: '景点', types: ['checkin', 'pilgrimage'] },
  { label: '敌影清剿', types: ['pyz', 'msz', 'fdz', 'dyz'] },
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
}
