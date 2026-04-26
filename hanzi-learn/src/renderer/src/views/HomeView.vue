<template>
  <div class="home-view">
    <h1 class="page-title">汉字学习</h1>

    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-number">{{ stats.total }}</div>
        <div class="stat-label">已收藏</div>
      </div>
      <div class="stat-card warning">
        <div class="stat-number">{{ stats.due_today }}</div>
        <div class="stat-label">待复习</div>
      </div>
      <div class="stat-card success">
        <div class="stat-number">{{ stats.mastered }}</div>
        <div class="stat-label">已掌握</div>
      </div>
      <div class="stat-card info">
        <div class="stat-number">{{ stats.learning }}</div>
        <div class="stat-label">学习中</div>
      </div>
    </div>

    <div class="quick-add">
      <h2>快速添加</h2>
      <div class="quick-add-row">
        <el-input
          v-model="quickInput"
          placeholder="输入汉字或拼音搜索..."
          size="large"
          @input="onQuickSearch"
          clearable
        />
      </div>
      <div v-if="searchResults.length" class="search-results">
        <div
          v-for="char in searchResults"
          :key="char.id"
          class="search-item"
          @click="goToDetail(char.id)"
        >
          <span class="search-char">{{ char.character }}</span>
          <span class="search-pinyin">{{ char.pinyin }}</span>
          <span class="search-def">{{ char.definition }}</span>
          <el-button size="small" type="primary" @click.stop="addToCollection(char.id)">
            收藏
          </el-button>
        </div>
      </div>
    </div>

    <div class="actions-row">
      <el-button type="primary" size="large" @click="$router.push('/learn')" :disabled="stats.due_today === 0">
        开始复习 ({{ stats.due_today }})
      </el-button>
      <el-button size="large" @click="$router.push('/dictionary')">
        查字
      </el-button>
      <el-button size="large" @click="$router.push('/collection')">
        我的收藏
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCollectionStore } from '@renderer/stores/collection'
import { useSettingsStore } from '@renderer/stores/settings'
import { ElMessage } from 'element-plus'

const router = useRouter()
const collectionStore = useCollectionStore()
const settingsStore = useSettingsStore()
const stats = ref({ total: 0, new_count: 0, learning: 0, mastered: 0, due_today: 0 })
const quickInput = ref('')
const searchResults = ref<any[]>([])
let searchTimer: ReturnType<typeof setTimeout> | null = null

onMounted(async () => {
  stats.value = await window.api.collection.getStats()
})

function onQuickSearch() {
  if (searchTimer) clearTimeout(searchTimer)
  if (!quickInput.value.trim()) {
    searchResults.value = []
    return
  }
  searchTimer = setTimeout(async () => {
    searchResults.value = await window.api.character.search(
      quickInput.value.trim(), 10,
      !settingsStore.showAllCharacters
    )
  }, 300)
}

function goToDetail(id: number) {
  router.push(`/character/${id}`)
}

async function addToCollection(characterId: number) {
  await collectionStore.addCharacter(characterId)
  stats.value = await window.api.collection.getStats()
  ElMessage.success('已添加到收藏')
}
</script>

<style scoped>
.home-view {
  max-width: 900px;
  margin: 0 auto;
}
.page-title {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 24px;
  color: var(--text-primary);
}
.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 32px;
}
.stat-card {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: 20px;
  text-align: center;
  box-shadow: var(--shadow);
  border-left: 4px solid var(--primary);
}
.stat-card.warning { border-left-color: var(--warning); }
.stat-card.success { border-left-color: var(--success); }
.stat-card.info { border-left-color: var(--info); }
.stat-number {
  font-size: 36px;
  font-weight: 700;
  color: var(--text-primary);
}
.stat-label {
  font-size: 14px;
  color: var(--text-secondary);
  margin-top: 4px;
}
.quick-add {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: var(--shadow);
}
.quick-add h2 {
  font-size: 18px;
  margin-bottom: 12px;
}
.search-results {
  margin-top: 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  max-height: 300px;
  overflow-y: auto;
}
.search-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  cursor: pointer;
  transition: background 0.15s;
}
.search-item:hover {
  background: #f0f5ff;
}
.search-item + .search-item {
  border-top: 1px solid var(--border);
}
.search-char {
  font-size: 24px;
  font-weight: 700;
  min-width: 36px;
}
.search-pinyin {
  color: var(--primary);
  min-width: 60px;
}
.search-def {
  flex: 1;
  color: var(--text-secondary);
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.actions-row {
  display: flex;
  gap: 12px;
}
</style>
