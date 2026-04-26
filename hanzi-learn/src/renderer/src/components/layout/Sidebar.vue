<template>
  <nav class="sidebar">
    <div class="nav-items">
      <router-link
        v-for="item in navItems"
        :key="item.path"
        :to="item.path"
        class="nav-item"
        :class="{ active: isActive(item.path) }"
      >
        <span class="nav-icon" v-html="item.icon"></span>
        <span class="nav-label">{{ item.label }}</span>
      </router-link>
    </div>

    <div class="sidebar-search">
      <el-input
        v-model="searchQuery"
        placeholder="搜索汉字..."
        size="small"
        :prefix-icon="SearchIcon"
        @keyup.enter="doSearch"
        clearable
      />
    </div>
  </nav>
</template>

<script setup lang="ts">
import { ref, markRaw } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Search } from '@element-plus/icons-vue'

const SearchIcon = markRaw(Search)
const route = useRoute()
const router = useRouter()
const searchQuery = ref('')

const navItems = [
  { path: '/', label: '首页', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>' },
  { path: '/collection', label: '收藏', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>' },
  { path: '/dictionary', label: '查字', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>' },
  { path: '/learn', label: '学习', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>' },
  { path: '/settings', label: '设置', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>' }
]

function isActive(path: string): boolean {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}

function doSearch(): void {
  if (searchQuery.value.trim()) {
    router.push({ path: '/collection', query: { q: searchQuery.value.trim() } })
    searchQuery.value = ''
  }
}
</script>

<style scoped>
.sidebar {
  width: 180px;
  background: var(--bg-sidebar);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}
.nav-items {
  flex: 1;
  padding: 12px 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 8px;
  color: #bdc3c7;
  text-decoration: none;
  font-size: 14px;
  transition: all 0.15s;
}
.nav-item:hover {
  background: rgba(255,255,255,0.08);
  color: #ecf0f1;
}
.nav-item.active {
  background: var(--primary);
  color: #fff;
}
.nav-icon {
  display: flex;
  align-items: center;
}
.sidebar-search {
  padding: 12px;
  border-top: 1px solid rgba(255,255,255,0.1);
}
.sidebar-search :deep(.el-input__wrapper) {
  background: rgba(255,255,255,0.1);
  border: none;
  box-shadow: none;
}
.sidebar-search :deep(.el-input__inner) {
  color: #ecf0f1;
}
.sidebar-search :deep(.el-input__inner::placeholder) {
  color: #7f8c8d;
}
</style>
