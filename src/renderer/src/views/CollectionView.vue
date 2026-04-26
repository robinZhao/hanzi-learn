<template>
  <div class="collection-view">
    <div class="page-header">
      <h1>我的收藏</h1>
      <div class="filters">
        <el-select v-model="sortBy" placeholder="排序" size="small" @change="reload">
          <el-option label="添加时间" value="added_at" />
          <el-option label="拼音" value="pinyin" />
          <el-option label="笔画数" value="stroke_count" />
          <el-option label="使用频率" value="frequency" />
          <el-option label="熟悉度" value="familiarity" />
        </el-select>
        <el-button size="small" @click="toggleSortDir">
          {{ sortDir === 'ASC' ? '升序' : '降序' }}
        </el-button>
        <el-button size="small" @click="exportCollection">
          导出
        </el-button>
        <el-button size="small" @click="triggerImport">
          导入
        </el-button>
        <input
          ref="fileInput"
          type="file"
          accept=".json"
          style="display: none"
          @change="handleImport"
        />
      </div>
    </div>

    <!-- Learning status tabs -->
    <el-tabs v-model="activeStatus" class="status-tabs" @tab-click="onStatusChange">
      <el-tab-pane :label="'全部 (' + stats.all + ')'" name="all" />
      <el-tab-pane :label="'已学 (' + stats.learned + ')'" name="learned" />
      <el-tab-pane :label="'认识 (' + stats.known + ')'" name="known" />
      <el-tab-pane :label="'不认识 (' + stats.unknown + ')'" name="unknown" />
    </el-tabs>

    <div v-if="loading" class="loading-state">
      <el-skeleton :rows="3" animated />
    </div>

    <div v-else-if="characters.length === 0" class="empty-state">
      <p>还没有收藏任何汉字</p>
      <el-button type="primary" @click="$router.push('/dictionary')">去查字</el-button>
    </div>

    <div v-else class="char-grid">
      <div
        v-for="char in characters"
        :key="char.character_id"
        class="char-card"
        @click="$router.push(`/character/${char.character_id}`)"
      >
        <div class="card-char">{{ char.character }}</div>
        <div class="card-pinyin">{{ char.pinyin }}</div>
        <div class="card-meta">
          <span class="familiarity-dot" :class="'level-' + char.familiarity"></span>
          <span>{{ char.stroke_count }}画</span>
        </div>
        <el-button
          class="remove-btn"
          size="small"
          type="danger"
          text
          @click.stop="removeChar(char.character_id)"
        >
          移除
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useCollectionStore } from '@renderer/stores/collection'
import { ElMessageBox, ElMessage, ElMessageBoxInputData } from 'element-plus'

const store = useCollectionStore()
const sortBy = ref('added_at')
const sortDir = ref('DESC')
const loading = ref(false)
const characters = ref<any[]>([])
const activeStatus = ref('all')
const fileInput = ref<HTMLInputElement | null>(null)

onMounted(async () => {
  await fetchStats()
  await reload()
})

async function fetchStats() {
  const s = await window.api.collection.getStats()
  const allChars = await window.api.collection.list('added_at', 'DESC', undefined, undefined, 5000, 0)
  const learned = allChars.filter((c: any) => c.review_count > 0).length
  const known = allChars.filter((c: any) => c.is_known === 1 || c.familiarity >= 4).length
  const unknown = allChars.filter((c: any) => c.familiarity <= 1 && c.review_count === 0).length
  store.stats = { ...s }
  // Store category stats separately
  ;(store as any).categoryStats = { all: s.total, learned, known, unknown }
}

const stats = computed(() =>
  (store as any).categoryStats || { all: 0, learned: 0, known: 0, unknown: 0 }
)

async function reload() {
  loading.value = true
  try {
    characters.value = await window.api.collection.list(sortBy.value, sortDir.value)
  } finally {
    loading.value = false
  }
}

async function onStatusChange() {
  loading.value = true
  try {
    if (activeStatus.value === 'all') {
      characters.value = await window.api.collection.list(sortBy.value, sortDir.value)
    } else {
      characters.value = await window.api.collection.listByStatus(
        activeStatus.value as any, sortBy.value, sortDir.value
      )
    }
  } finally {
    loading.value = false
  }
}

function toggleSortDir() {
  sortDir.value = sortDir.value === 'ASC' ? 'DESC' : 'ASC'
  onStatusChange()
}

async function removeChar(characterId: number) {
  await ElMessageBox.confirm('确定要移除这个汉字吗？', '提示', { type: 'warning' })
  await store.removeCharacter(characterId)
  await fetchStats()
  await onStatusChange()
}

async function exportCollection() {
  try {
    const data = await window.api.collection.export()
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `hanzi-collection-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    ElMessage.success(`已导出 ${data.characters.length} 个汉字`)
  } catch (e: any) {
    ElMessage.error('导出失败: ' + e.message)
  }
}

function triggerImport() {
  fileInput.value?.click()
}

async function handleImport(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  try {
    const text = await file.text()
    const data = JSON.parse(text)

    if (!data.characters || !Array.isArray(data.characters)) {
      ElMessage.error('无效的导入文件格式')
      return
    }

    const { value: mode } = await ElMessageBox.prompt(
      '选择导入模式：\n合并 — 保留现有数据，新增/更新导入的汉字\n替换 — 清除现有数据，完全替换为导入的内容',
      '导入模式',
      {
        inputType: 'select',
        inputOptions: {
          merge: '合并（保留现有数据）',
          replace: '替换（清除现有数据）'
        },
        inputValue: 'merge',
        confirmButtonText: '导入',
        cancelButtonText: '取消'
      }
    )

    const result = await window.api.collection.import(data, mode as any)

    let msg = `导入完成：新增 ${result.added}，更新 ${result.updated}`
    if (result.skipped > 0) msg += `，跳过 ${result.skipped}`
    if (result.errors.length > 0) {
      msg += `\n错误：${result.errors.slice(0, 5).join('；')}`
    }
    ElMessage({ message: msg, type: result.errors.length > 0 ? 'warning' : 'success', duration: 5000 })

    await fetchStats()
    await onStatusChange()
  } catch (e: any) {
    if (e !== 'cancel') {
      ElMessage.error('导入失败: ' + e.message)
    }
  }

  target.value = ''
}
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.page-header h1 { font-size: 24px; }
.filters {
  display: flex;
  gap: 8px;
  align-items: center;
}
.status-tabs {
  margin-bottom: 16px;
}
.char-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 16px;
}
.char-card {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: 16px;
  text-align: center;
  cursor: pointer;
  box-shadow: var(--shadow);
  transition: transform 0.15s, box-shadow 0.15s;
  position: relative;
}
.char-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}
.card-char {
  font-size: 48px;
  font-weight: 700;
  line-height: 1.2;
}
.card-pinyin {
  color: var(--primary);
  font-size: 14px;
  margin-top: 4px;
}
.card-meta {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 8px;
  font-size: 12px;
  color: var(--text-secondary);
}
.familiarity-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--info);
}
.familiarity-dot.level-0 { background: #dcdfe6; }
.familiarity-dot.level-1 { background: var(--danger); }
.familiarity-dot.level-2 { background: var(--warning); }
.familiarity-dot.level-3 { background: #e6a23c; }
.familiarity-dot.level-4 { background: var(--success); }
.familiarity-dot.level-5 { background: #27ae60; }
.remove-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  opacity: 0;
  transition: opacity 0.15s;
}
.char-card:hover .remove-btn { opacity: 1; }
.empty-state {
  text-align: center;
  padding: 60px 0;
  color: var(--text-secondary);
}
.empty-state p { margin-bottom: 16px; font-size: 16px; }
.loading-state { padding: 24px; }
</style>
