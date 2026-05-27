import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import fs from 'node:fs'
import path from 'node:path'

const MARKERS_FILE = fileURLToPath(new URL('./markers-data.json', import.meta.url))
const SRC_MARKERS_FILE = fileURLToPath(new URL('./src/data/markers.json', import.meta.url))
const ROUTES_FILE = fileURLToPath(new URL('./routes-data.json', import.meta.url))
const UPLOADS_DIR = fileURLToPath(new URL('./public/images/uploads', import.meta.url))

function markersApiPlugin() {
  return {
    name: 'markers-api',
    configureServer(server: any) {
      // GET /api/markers — return current markers.json
      server.middlewares.use('/api/markers', (req: any, res: any) => {
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

        if (req.method === 'OPTIONS') {
          res.statusCode = 204
          res.end()
          return
        }

        if (req.method === 'GET') {
          try {
            // Read from external file (outside src/watch scope), fallback to src
            const filePath = fs.existsSync(MARKERS_FILE) ? MARKERS_FILE : SRC_MARKERS_FILE
            const data = fs.readFileSync(filePath, 'utf-8')
            res.setHeader('Content-Type', 'application/json')
            res.end(data)
          } catch {
            res.statusCode = 500
            res.end(JSON.stringify({ error: '读取标记文件失败' }))
          }
          return
        }

        if (req.method === 'POST') {
          let body = ''
          req.on('data', (chunk: string) => { body += chunk })
          req.on('end', () => {
            try {
              const markers = JSON.parse(body)
              if (!Array.isArray(markers)) {
                res.statusCode = 400
                res.end(JSON.stringify({ error: '数据格式应为数组' }))
                return
              }
              fs.mkdirSync(path.dirname(MARKERS_FILE), { recursive: true })
              fs.writeFileSync(MARKERS_FILE, JSON.stringify(markers, null, 2), 'utf-8')
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ ok: true, count: markers.length }))
            } catch (e: any) {
              res.statusCode = 500
              res.end(JSON.stringify({ error: e.message || '保存失败' }))
            }
          })
          return
        }

        res.statusCode = 405
        res.end('Method Not Allowed')
      })

      // POST /api/upload-image — save base64 image to public/images/uploads/
      server.middlewares.use('/api/upload-image', (req: any, res: any) => {
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

        if (req.method === 'OPTIONS') {
          res.statusCode = 204
          res.end()
          return
        }

        if (req.method === 'POST') {
          let body = ''
          req.on('data', (chunk: string) => { body += chunk })
          req.on('end', () => {
            try {
              const { data, type, ext } = JSON.parse(body)
              if (!data || !type) {
                res.statusCode = 400
                res.end(JSON.stringify({ error: '缺少 data 或 type' }))
                return
              }
              // Strip the data URL prefix to get raw base64
              const base64 = data.replace(/^data:image\/\w+;base64,/, '')
              const buffer = Buffer.from(base64, 'base64')

              // Auto-increment index per marker type to avoid overwrites
              fs.mkdirSync(UPLOADS_DIR, { recursive: true })
              let maxIdx = 0
              const prefix = type + '_'
              const existing = fs.readdirSync(UPLOADS_DIR)
              for (const f of existing) {
                if (f.startsWith(prefix)) {
                  const m = f.match(new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\d+)\\.`))
                  if (m) {
                    maxIdx = Math.max(maxIdx, parseInt(m[1], 10))
                  }
                }
              }
              const destName = `${type}_${maxIdx + 1}.${ext || 'png'}`

              const destPath = path.join(UPLOADS_DIR, destName)
              fs.writeFileSync(destPath, buffer)

              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ ok: true, path: `images/uploads/${destName}` }))
            } catch (e: any) {
              res.statusCode = 500
              res.end(JSON.stringify({ error: e.message || '图片保存失败' }))
            }
          })
          return
        }

        res.statusCode = 405
        res.end('Method Not Allowed')
      })

      // GET /api/uploads — list all uploaded images
      server.middlewares.use('/api/uploads', (req: any, res: any) => {
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

        if (req.method === 'OPTIONS') {
          res.statusCode = 204
          res.end()
          return
        }

        if (req.method === 'GET') {
          try {
            fs.mkdirSync(UPLOADS_DIR, { recursive: true })
            const files = fs.readdirSync(UPLOADS_DIR)
            const images = files
              .filter(f => /\.(png|jpe?g|webp|gif|svg)$/i.test(f))
              .map(f => ({
                name: f,
                path: `images/uploads/${f}`,
              }))
              .sort((a, b) => a.name.localeCompare(b.name))
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(images))
          } catch (e: any) {
            res.statusCode = 500
            res.end(JSON.stringify({ error: e.message || '读取图片列表失败' }))
          }
          return
        }

        res.statusCode = 405
        res.end('Method Not Allowed')
      })

      // DELETE /api/image — delete an uploaded image
      server.middlewares.use('/api/image', (req: any, res: any) => {
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

        if (req.method === 'OPTIONS') {
          res.statusCode = 204
          res.end()
          return
        }

        if (req.method === 'DELETE') {
          const url = new URL(req.url, 'http://localhost')
          const imgPath = url.searchParams.get('path')
          if (!imgPath) {
            res.statusCode = 400
            res.end(JSON.stringify({ error: '缺少 path 参数' }))
            return
          }
          const fullPath = fileURLToPath(new URL(`./public/${imgPath}`, import.meta.url))
          try {
            if (fs.existsSync(fullPath)) {
              fs.unlinkSync(fullPath)
            }
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: true }))
          } catch (e: any) {
            res.statusCode = 500
            res.end(JSON.stringify({ error: e.message || '删除失败' }))
          }
          return
        }

        res.statusCode = 405
        res.end('Method Not Allowed')
      })

      // GET / POST /api/routes — manage routes file
      server.middlewares.use('/api/routes', (req: any, res: any) => {
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

        if (req.method === 'OPTIONS') {
          res.statusCode = 204
          res.end()
          return
        }

        if (req.method === 'GET') {
          try {
            if (!fs.existsSync(ROUTES_FILE)) {
              fs.writeFileSync(ROUTES_FILE, '[]', 'utf-8')
            }
            const data = fs.readFileSync(ROUTES_FILE, 'utf-8')
            res.setHeader('Content-Type', 'application/json')
            res.end(data)
          } catch {
            res.statusCode = 500
            res.end(JSON.stringify({ error: '读取路线文件失败' }))
          }
          return
        }

        if (req.method === 'POST') {
          let body = ''
          req.on('data', (chunk: string) => { body += chunk })
          req.on('end', () => {
            try {
              const routes = JSON.parse(body)
              if (!Array.isArray(routes)) {
                res.statusCode = 400
                res.end(JSON.stringify({ error: '数据格式应为数组' }))
                return
              }
              fs.mkdirSync(path.dirname(ROUTES_FILE), { recursive: true })
              fs.writeFileSync(ROUTES_FILE, JSON.stringify(routes, null, 2), 'utf-8')
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ ok: true, count: routes.length }))
            } catch (e: any) {
              res.statusCode = 500
              res.end(JSON.stringify({ error: e.message || '保存失败' }))
            }
          })
          return
        }

        res.statusCode = 405
        res.end('Method Not Allowed')
      })
    },
  }
}

export default defineConfig({
  base: './',
  server: {
    host: '0.0.0.0',
  },
  plugins: [vue(), markersApiPlugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
