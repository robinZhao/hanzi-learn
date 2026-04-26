# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

**汉字学习** — 基于 Electron + Vue 3 的桌面端汉字学习应用，使用 electron-vite 构建。核心功能包括汉字查询、部首浏览、收藏管理、间隔重复闪卡复习（SM-2 算法简化版）、组词查询、例句查询和相似字符推荐。

## 关键命令

```bash
cd hanzi-learn

npm install            # 安装依赖（含 electron-builder install-app-deps）
npm run dev            # 开发模式 (electron-vite dev)
npm run build          # 生产构建 (electron-vite build)
npm run build:unpack   # 构建 + 解压版打包
npm run build:win      # 构建 + Windows NSIS 安装包
```

## 目录结构

```
hanzi-learn/
├── src/
│   ├── main/                  # Electron Main Process
│   │   ├── index.ts           # 入口: 创建窗口, 初始化 DB, 注册 IPC handlers
│   │   ├── database.ts        # SQLite 初始化: 复制 hanzi.db, 建表, WAL 模式
│   │   ├── ipc-handlers.ts    # 所有 IPC 频道注册 (character/radical/dictionary/collection/learning/window)
│   │   └── services/          # 服务层 (直接操作 SQLite)
│   │       ├── character.service.ts
│   │       ├── radical.service.ts
│   │       ├── dictionary.service.ts
│   │       └── user-collection.service.ts  # 含 SM-2 复习算法
│   ├── preload/               # Electron Preload (contextBridge 暴露 window.api)
│   └── renderer/              # Electron Renderer Process (Vue SPA)
│       └── src/
│           ├── App.vue        # 根组件: TitleBar + Sidebar + RouterView
│           ├── router/        # Vue Router (6 个路由: home/collection/character-detail/radicals/learn/settings)
│           ├── stores/        # Pinia Stores (app/collection/radical/learning)
│           ├── components/    # layout/TitleBar.vue, layout/Sidebar.vue
│           └── views/         # 6 个页面视图
├── resources/                  # 内置 hanzi.db (应用首开时复制到用户目录)
├── electron.vite.config.ts    # electron-vite 配置: main/preload/renderer 三入口
├── electron-builder.yml        # NSIS 打包配置
└── tsconfig.json               # 引用 tsconfig.node.json 和 tsconfig.web.json
```

## 架构要点

### IPC 通信
- Preload 通过 `contextBridge` 暴露 `window.api` 给渲染进程，方法名与 main 侧 handler 一一对应
- 频道命名约定: `模块:动作` (如 `character:search`, `collection:add`)
- 渲染侧 stores 通过 `window.api.*` 调用 main 侧服务

### 数据流
1. **主进程** `initDatabase()` — 首次启动时将 `resources/hanzi.db` 复制到用户 `userData` 目录，打开后启用 WAL 模式
2. **服务层** — 纯 Node.js 函数，通过 `getDb()` 获取数据库实例，返回纯数据
3. **渲染进程** — Pinia stores 封装 IPC 调用，Vue 组件通过 store 读写状态

### 复习算法 (SM-2 简化版)
- 熟悉度范围 0-5
- 评级映射: 1=Again(fam=0, 1min), 2=Hard(fam-1, 10min), 3=Good(fam+1, 2.5^fam * 60min), 4=Easy(fam+2, 4^fam * 60min)
- `user_characters.next_review` 决定卡片何时到期，`getDueCards()` 返回待复习队列
- 复习间隔公式与其他 SM-2 实现有差异: Good 用 `pow(2.5, familiarity)`，Easy 用 `pow(4, familiarity)`

### 数据库 (hanzi-learn.db 在用户目录)
| 表 | 用途 |
|---|---|
| `characters` | 汉字主表 (character/pinyin/stroke_count/structure/decomposition/stroke_data/frequency) |
| `radicals` | 部首表 |
| `words` + `character_words` | 组词 M2M |
| `sentences` + `character_sentences` | 例句 M2M |
| `user_characters` | 用户收藏 + 学习进度 |
| `review_history` | 复习记录 |
| `character_similarity` | 预计算相似字符关系 |

### 打包注意事项
- `better-sqlite3` 是 native addon，需通过 electron-builder install-app-deps 重建
- `hanzi-writer` 在生产构建时被标记为 external (在 electron.vite.config.ts 的 rollupOptions.external 中)，避免 native addon 问题
- 开发环境 `hanzi-writer` 从 node_modules 加载，生产环境从 `resources/` 目录加载笔顺数据

## 修改代码时的注意事项

- TypeScript 使用 `any` 作为 SQL 返回值的常见类型（如 `db.prepare(...).all() as any[]`），这是项目现有模式，不必过度类型化
- IPC 频道命名统一使用 `模块:动作` 格式，新增功能需同时更新 main 侧 handler、preload 侧方法和 store 调用
- 数据库表首次创建在 `database.ts:createTables()` 中，迁移已有数据的手动处理
- 自定义无边框窗口 (frame: false)，窗口控制通过 IPC (`window:minimize/maximize/close`) 实现
- 用electron来更新数据库
- 使用现代汉语词典和新化字典的数据库
