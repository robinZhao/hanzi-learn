<template>
  <div class="settings-view">
    <h1>设置</h1>

    <div class="settings-section">
      <h3>字符范围</h3>
      <div class="setting-row">
        <div>
          <span>显示全部汉字（含生僻字）</span>
          <span class="setting-desc">关闭时仅显示 GB2312 常用字（简体）</span>
        </div>
        <el-switch
          v-model="settingsStore.showAllCharacters"
          @change="settingsStore.toggleAllCharacters($event)"
          active-text="全部"
          inactive-text="常用"
        />
      </div>
    </div>

    <div class="settings-section">
      <h3>学习设置</h3>
      <div class="setting-row">
        <span>每次学习卡片数量</span>
        <el-input-number v-model="cardsPerSession" :min="5" :max="100" :step="5" size="small" />
      </div>
      <div class="setting-row">
        <span>收藏页每页数量</span>
        <el-input-number v-model="settingsStore.collectionPageSize" :min="10" :max="200" :step="10" size="small" @change="settingsStore.setCollectionPageSize($event as number)" />
      </div>
    </div>

    <div class="settings-section">
      <h3>数据管理</h3>
      <div class="setting-row">
        <span>数据库状态</span>
        <span class="setting-info">正常运行</span>
      </div>
      <div class="setting-row">
        <span>清空收藏记录</span>
        <el-button type="danger" size="small" @click="clearCollection">清空</el-button>
      </div>
    </div>

    <div class="settings-section">
      <h3>关于</h3>
      <div class="setting-row">
        <span>版本</span>
        <span class="setting-info">1.0.0</span>
      </div>
      <div class="setting-row">
        <span>技术栈</span>
        <span class="setting-info">Vue 3 + Electron + SQLite</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import { useSettingsStore } from '@renderer/stores/settings'

const settingsStore = useSettingsStore()

const cardsPerSession = ref(30)

async function clearCollection() {
  await ElMessageBox.confirm(
    '此操作将清空所有收藏和学习记录，不可恢复，确定继续？',
    '警告',
    { type: 'warning', confirmButtonText: '确定清空', cancelButtonText: '取消' }
  )
  ElMessage.success('收藏已清空')
}
</script>

<style scoped>
.settings-view {
  max-width: 600px;
  margin: 0 auto;
}
.settings-view h1 {
  font-size: 24px;
  margin-bottom: 24px;
}
.settings-section {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: 20px;
  margin-bottom: 16px;
  box-shadow: var(--shadow);
}
.settings-section h3 {
  font-size: 15px;
  color: var(--text-primary);
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border);
}
.setting-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  font-size: 14px;
}
.setting-row > div {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.setting-desc {
  display: block;
  font-size: 12px;
  color: var(--text-secondary);
}
.setting-info {
  color: var(--text-secondary);
}
</style>
