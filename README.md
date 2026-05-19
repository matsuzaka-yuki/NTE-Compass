# 异环地图 (Isekai Map)

交互式游戏地图 Web 应用，展示游戏"异环"中的传送点、收集品、任务、景点等可交互元素。  

[在线地图](https://horizony14.github.io/map_NTE/)

## 技术栈

- **框架**: Vue 3 (Composition API + `<script setup>`)
- **构建**: Vite
- **状态管理**: Pinia
- **样式**: Tailwind CSS
- **地图渲染**: Leaflet + leaflet.markercluster
- **语言**: TypeScript

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览构建产物
npm run preview
```

## 目录结构

```
├── public/
│   ├── map-base.png          # 地图底图（可自行替换）
│   ├── icon.png              # 应用图标
│   └── images/               # 标记点图标
├── src/
│   ├── App.vue               # 主布局
│   ├── main.ts               # 入口
│   ├── components/
│   │   ├── MapView.vue       # 地图组件 (Leaflet)
│   │   ├── SideBar.vue       # 侧栏筛选与列表
│   │   ├── MarkerPopup.vue   # 标记详情弹窗
│   │   ├── LegendPanel.vue   # 图例面板
│   │   └── CreateMarkerForm.vue  # 标记点创建表单
│   ├── stores/
│   │   └── markerStore.ts    # Pinia 状态管理
│   ├── data/
│   │   └── markers.json      # 标记点数据
│   ├── types/
│   │   └── index.ts          # 类型定义
│   └── assets/
│       └── main.css          # Tailwind 样式入口
├── index.html
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json
└── package.json
```

## GitHub Pages 部署

1. 确保 `vite.config.ts` 中 `base` 设置为 `'./'`（已配置）。
2. 准备 `public/map-base.png` 地图底图。
3. 运行 `npm run build`。
4. 将 `dist/` 目录部署到 GitHub Pages。

### 部署方式 A：使用 gh-pages 分支

```bash
npm run build
# 将 dist/ 目录推送到 gh-pages 分支
npx gh-pages -d dist
```

### 部署方式 B：GitHub Actions

在仓库设置中启用 GitHub Pages，选择 GitHub Actions 作为来源，创建以下 workflow：

```yaml
name: Deploy to Pages
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pages: write
      id-token: write
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
      - uses: actions/configure-pages@v4
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
      - uses: actions/deploy-pages@v4
        id: deployment
```

## 功能

- 交互式地图：拖拽平移、滚轮缩放、标记点聚合
- 10 种标记类型，5 大分类：
  - 传送点：电话亭、维特海默塔
  - 收集品：谕石、21 的赠礼、避役的包裹
  - 任务：异象委托、支线任务
  - 景点：打卡点、圣地巡礼
  - 其他：车辆
- 分类筛选与模糊搜索
- 详情弹窗：名称、类型、坐标、描述、刷新时间、关联任务、多图轮播
- 本地进度保存（localStorage）：标记已找到/未找到
- 仅显示未收集模式
- 图例面板：各类型图层切换
- 编辑者模式：在地图上点击添加自定义标记点
- 响应式布局：桌面端侧栏 + 移动端底部抽屉

## 自定义

### 添加标记点

编辑 `src/data/markers.json`，按照以下格式添加：

```json
{
  "id": "unique_id",
  "name": "标记名称",
  "type": "phonebooth",
  "lat": 0.5,
  "lng": 0.5,
  "description": "描述文本",
  "image": "images/example.png",
  "images": ["images/example-1.png", "images/example-2.png"],
  "refreshTime": "每日刷新",
  "relatedQuest": "主线任务·第一章"
}
```

坐标 `lat` 和 `lng` 为 0~1 的相对坐标，对应地图图片的比例位置。`type` 可选值见 `src/types/index.ts` 中的 `MarkerType` 类型定义。
