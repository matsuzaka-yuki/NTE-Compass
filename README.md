<p align="center">
  <img src="./public/logo.png" alt="NTE · 夜巡" width="200" />
</p>
<h1 align="center">NTE · 夜巡</h1>
<p align="center">
  <strong>NTE Compass</strong> &mdash; 游戏《异环》交互式在线地图
</p>


<p align="center">
  <img src="https://img.shields.io/badge/免费-无付费内容-22c55e?style=flat-square" />
  <img src="https://img.shields.io/badge/无广-清爽体验-3b82f6?style=flat-square" />
  <img src="https://img.shields.io/badge/开源-MIT-green?style=flat-square&logo=github" />
  <img src="https://img.shields.io/badge/免登录-即开即用-8b5cf6?style=flat-square" />
</p>
<p align="center">
  <a href="https://nte.mysqil.com"><img src="https://img.shields.io/badge/在线地图-立即访问-3b82f6?style=for-the-badge" alt="在线地图" /></a>
</p>


---

## 项目简介

NTE · 夜巡（NTE Compass）是一个为游戏《异环》设计的交互式 Web 地图，帮助玩家快速定位游戏中的各类可交互元素 &mdash; 传送点、收集品、任务、打卡点等。同时添加了原游戏之外的标点类型 &mdash; 圣地巡礼、车辆等

---

## 核心功能

由于异环中很多彩蛋和有趣的地方在地图中没有标记，受动画巡礼网站的启发，我们设计了这个交互式地图，帮助玩家发现并分享游戏中的隐藏地点与趣味内容。

<table>
  <tr>
    <td valign="top" width="50%">

### 发现与分享
- **彩蛋 & 隐藏地点** &mdash; 收录游戏内未标注的彩蛋、打卡点和趣味位置
- **圣地巡礼** &mdash; 标记动画取景地或现实对应场景，探索游戏世界的另一面
- **详情预览** &mdash; 点击标记查看截图、描述、关联信息

### 社区共建
- **地图补点** &mdash; 发现遗漏标记？直接在地图上点击添加，上传截图即可贡献
- **数据开放** &mdash; 所有标记数据随仓库开源，支持 PR 协作维护

    </td>
    <td valign="top" width="50%">

### 快速查找
- **分类筛选** &mdash; 按传送点 / 收集品 / 任务 / 景点 / 车辆分类查看
- **模糊搜索** &mdash; 输入关键词直接定位目标
- **图例切换** &mdash; 按需显示或隐藏某类标记

### 收集追踪
- **状态标记** &mdash; 点击切换已找 / 未找状态，随时掌握进度
- **仅看未收集** &mdash; 一键过滤已完成标记
- **自动保存** &mdash; 进度保存到浏览器，下次打开无需重新标记

    </td>
  </tr>
</table>

---

## 标记类型一览

| 分类 | 类型 | 说明 |
|------|------|------|
| 传送点 | 电话亭、维特海默塔 | 快速传送节点 |
| 收集品 | 谕石、21 的赠礼、避役的包裹 | 可收集道具 |
| 任务 | 异象委托、支线任务 | 剧情 / 委托触发点 |
| 景点 | 打卡点、圣地巡礼 | 风景及纪念地点 |
| 其他 | 车辆 | 载具刷新位置 |

---

## 技术栈

| 类别 | 技术 |
|------|------|
| 前端框架 | Vue 3 (Composition API + `<script setup>`) |
| 构建工具 | Vite 5 |
| 状态管理 | Pinia |
| 样式方案 | Tailwind CSS 4（CSS-first 配置 + 语义化 token） |
| 主题系统 | 亮 / 暗 / 跟随系统，基于 CSS 变量 + `.dark` 类切换 |
| 设计系统 | `src/components/ui/`（Btn / IconButton / Panel / Dialog / Toggle 等） |
| 地图引擎 | Leaflet + leaflet.markercluster |
| 编程语言 | TypeScript |
| 代码托管 | GitHub Pages |

---

## 目录结构

```
├── public/
│   ├── icon.png               # 网站图标
│   ├── map-base.png           # 地图底图（可替换）
│   └── images/                # 标记点图标资源
├── src/
│   ├── App.vue                # 根布局
│   ├── main.ts                # 应用入口（挂载前应用主题）
│   ├── components/
│   │   ├── MapView.vue        # 地图渲染 (Leaflet)
│   │   ├── SideBar.vue        # 侧栏筛选与搜索
│   │   ├── MarkerPopup.vue    # 标记详情弹窗
│   │   ├── LegendPanel.vue    # 图例面板
│   │   ├── SettingsPanel.vue  # 设置面板（含主题切换）
│   │   ├── CreateMarkerForm.vue  # 用户创建标记表单
│   │   └── ui/                # 设计系统基础组件
│   │       ├── Btn.vue / IconButton.vue / Panel.vue / Dialog.vue
│   │       ├── Toggle.vue / TextInput.vue / EmptyState.vue
│   │       ├── TypePill.vue / SubHeader.vue / AppIcon.vue
│   │       ├── ConfirmHost.vue  # 全局确认对话框
│   │       └── icons.ts        # 命名 SVG 图标注册表
│   ├── composables/
│   │   ├── useTheme.ts        # 主题状态（亮/暗/系统，持久化）
│   │   ├── useMediaQuery.ts   # 响应式断点
│   │   └── useConfirm.ts      # Promise 化确认对话框
│   ├── stores/
│   │   └── markerStore.ts     # Pinia 状态管理
│   ├── data/
│   │   └── markers.json       # 标记点数据源
│   ├── types/
│   │   └── index.ts           # TypeScript 类型定义
│   └── assets/
│       └── main.css           # Tailwind v4 入口 + 设计 token（@theme）
├── markers-data.json          # 外部标记数据文件
├── index.html                 # HTML 入口
└── vite.config.ts             # Vite 配置
```

---

## 本地开发

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

开发服务器默认监听 `http://0.0.0.0:5173`，支持局域网内其他设备访问。

### 配置开关

`src/config.ts` 中有两个布尔类型开关，按需修改：

| 开关 | 默认值 | 作用 | 建议 |
|------|--------|------|------|
| `EDITOR_ENABLED` | `false` | 控制编辑者模式的显示。开启后侧栏出现编辑按钮，可在地图上添加/编辑/删除标记点，支持导入导出标记数据 | 本地开发时设为 `true`，提交到 GitHub Pages 时保持 `false` |
| `JSDELIVR_CDN_ENABLED` | `true` | 控制静态资源（图标、图片）是否通过 jsDelivr CDN 加载 | 本地开发时建议设为 `false` 使用本地资源，部署时保持 `true` 以加速访问

### 主题与设计系统

UI 采用中性灰阶（zinc 色阶）配色，支持**亮色 / 暗色 / 跟随系统**三种主题，在设置面板（右下角齿轮）切换，选择会持久化到浏览器。框架严格中性，**选中态和标记类型图标保留各自的彩色**。

维护 UI 时遵循以下约定：

- **改配色 / 加主题**：只改 `src/assets/main.css` 顶部的 `:root` / `.dark` token 表，全局自动生效，无需逐文件改。
- **改按钮 / 面板等基础样式**：只改 `src/components/ui/` 下对应组件，所有调用处自动同步。
- **新增 UI 元素**：直接用语义化 class（`bg-surface` / `bg-elevated` / `bg-bg` / `text-base` / `text-muted` / `text-faint` / `border-default`），自动跟随主题反色，**不需要手写 `dark:` 前缀**。
- **新增图标**：在 `src/components/ui/icons.ts` 注册 path，然后用 `<AppIcon name="..." />`。

---

## 使用条款

1. **版权声明**：原创内容（包括但不限于文字、图片、代码、设计和排版）受版权法保护。异环游戏相关的所有素材（包括但不限于角色名称、图像、标志和游戏数据）均为 Perfect World / Hotta Studio 所有。合理使用这些素材仅为提供信息目的，不主张对其拥有权利。
2. **用途声明**：本工具仅为《异环》玩家提供游戏辅助信息参考，与游戏官方无关，不代表任何官方立场。
3. **数据准确性**：标记点数据由社区贡献维护，坐标与信息可能存在偏差，请以游戏内实际情况为准。
4. **用户生成内容**：通过编辑者模式上传的图片和标记内容应遵守法律法规，不得包含违法、侵权或不适宜信息。上传者对其内容负责。
5. **本地存储**：本应用仅使用浏览器 localStorage 保存您的收集进度，不会将您的个人数据上传至任何服务器。
6. **免责声明**：使用本工具所产生的任何游戏体验或数据损失，开发者不承担相关责任。
7. **开放许可**：本项目代码基于 MIT 协议开源，详见 [LICENSE](LICENSE) 文件。标记点数据随项目一同开放，欢迎贡献。但请不要直接用于商业用途，谢谢喵

---

## 贡献指南

欢迎通过以下方式参与贡献：

### 方式一：Issue / PR

在 [GitHub Issues](https://github.com/matsuzaka-yuki/NTE-Compass/issues) 提交地点信息（截图 + 描述 + 坐标），或直接发 PR。

- 描述中请注明地点名称、分类（传送点 / 收集品 / 任务 / 景点 / 车辆 / 或许新分类？）及坐标说明
- 截图需清晰展示目标环境，圣地巡礼类最好加上致敬场景的原图，方便对照

### 方式二：本地开发 + PR

1. `Fork` 本仓库并 `git clone` 到本地
2. 在编辑者模式下添加标记点
3. 提交变更文件（`markers-data.json` 及截图资源）至 PR

### 其他贡献

- **功能改进** &mdash; 打开 Issue 讨论设计方案后再进行开发
- **Bug 报告** &mdash; 请附上复现步骤、浏览器版本与截图

---

## 致谢

本项目基于 [Horizony14/map_NTE](https://github.com/Horizony14/map_NTE)（MIT 协议）开发，感谢原作者的贡献。

---

<p align="center">
  <sub>Made with Vue.js & Leaflet | &copy; 2026 matsuzaka-yuki</sub>
</p>
