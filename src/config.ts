// 拉到本地后改为 true 即可开启编辑功能
export const EDITOR_ENABLED = false

// jsDelivr CDN 加速（GitHub Pages 部署时使用，本地开发可关闭）
export const JSDELIVR_CDN_ENABLED = true
const GITHUB_USER = 'Horizony14'
const GITHUB_REPO = 'map_NTE'
const GITHUB_BRANCH = 'main'

/** 将相对路径转换为 jsDelivr CDN 地址（关闭 CDN 时原样返回） */
export function resolveAssetUrl(relativePath: string): string {
  if (!JSDELIVR_CDN_ENABLED) return relativePath
  const cleanPath = relativePath.startsWith('./') ? relativePath.slice(2) : relativePath
  return `https://cdn.jsdmirror.com/gh/${GITHUB_USER}/${GITHUB_REPO}@${GITHUB_BRANCH}/public/${cleanPath}`
}
