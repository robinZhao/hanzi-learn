# 汉字学习 - Hanzi Learn

基于 Electron + Vue 3 的桌面端汉字学习应用。

## 功能特性

- **汉字查询** — 拼音、笔画、部首、结构检索
- **部首浏览** — 按部首分类浏览汉字
- **收藏管理** — 添加/移除收藏，自定义标签
- **闪卡复习** — 基于 SM-2 间隔重复算法，智能安排复习计划
- **组词查询** — 汉字组词列表
- **例句查询** — 常用例句展示
- **相似字符** — 推荐形近字、相似字
- **字典查询** — 现代汉语词典 & 新华字典

## 技术栈

- **Electron** — 跨平台桌面应用
- **Vue 3 + TypeScript** — 前端框架
- **electron-vite** — 构建工具
- **Pinia** — 状态管理
- **Element Plus** — UI 组件库
- **better-sqlite3** — 本地 SQLite 数据库
- **hanzi-writer** — 汉字笔顺动画

## 快速开始

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 生产构建
npm run build

# 构建 Windows 安装包
npm run build:win
```

## 项目结构

```
hanzi-learn/
├── src/
│   ├── main/                 # Electron 主进程
│   │   ├── index.ts          # 入口文件
│   │   ├── database.ts       # 数据库初始化
│   │   ├── ipc-handlers.ts   # IPC 通信
│   │   └── services/         # 数据服务层
│   ├── preload/              # Preload 脚本 (contextBridge)
│   └── renderer/             # 渲染进程 (Vue SPA)
│       ├── src/
│       │   ├── stores/       # Pinia 状态管理
│       │   ├── views/        # 页面组件
│       │   ├── components/   # 公共组件
│       │   └── router/       # 路由配置
│       └── index.html
├── resources/                # 内置资源 (hanzi.db)
├── scripts/                  # 数据脚本
└── electron-builder.yml      # 打包配置
```

## 复习算法 (SM-2 简化版)

| 评级 | 熟悉度变化 | 下次复习间隔 |
|------|-----------|-------------|
| Again | 归零 | 1 分钟 |
| Hard | -1 | 10 分钟 |
| Good | +1 | 2.5^熟悉度 分钟 |
| Easy | +2 | 4^熟悉度 分钟 |

## 许可证

MIT
