<template>
  <div class="collection-view">
    <div class="page-header">
      <h1>我的收藏</h1>
      <div class="filters">
        <el-button size="small" type="primary" @click="triggerXlsxImport">
          Excel导入
        </el-button>
        <el-button size="small" type="primary" @click="exportXlsx">
          Excel导出
        </el-button>
        <el-button size="small" @click="exportCollection">
          JSON导出
        </el-button>
        <el-button size="small" @click="triggerImport">
          JSON导入
        </el-button>
        <el-select v-model="sortBy" placeholder="排序" size="small" @change="reload">
          <el-option label="添加时间" value="added_at" />
          <el-option label="拼音" value="pinyin" />
          <el-option label="笔画数" value="stroke_count" />
          <el-option label="使用频率" value="frequency" />
        </el-select>
        <el-button size="small" @click="toggleSortDir">
          {{ sortDir === 'ASC' ? '升序' : '降序' }}
        </el-button>
        <input
          ref="fileInput"
          type="file"
          accept=".json"
          style="display: none"
          @change="handleImport"
        />
        <input
          ref="xlsxFileInput"
          type="file"
          accept=".xlsx,.xls"
          style="display: none"
          @change="handleXlsxImport"
        />
      </div>
    </div>

    <!-- Tag filter buttons -->
    <div class="tag-filter">
      <el-button
        :type="activeTag === 'all' ? 'primary' : ''"
        size="small"
        @click="setTagFilter('all')"
      >
        全部
      </el-button>
      <el-button
        :type="activeTag === '易错' ? 'warning' : ''"
        size="small"
        @click="setTagFilter('易错')"
      >
        易错
      </el-button>
    </div>

    <!-- Learning status tabs -->
    <el-tabs v-model="activeStatus" class="status-tabs" @tab-click="onStatusChange">
      <el-tab-pane :label="'全部 (' + stats.all + ')'" name="all" />
      <el-tab-pane :label="'学习中 (' + stats.learning + ')'" name="unknown" />
      <el-tab-pane :label="'已掌握 (' + stats.mastered + ')'" name="known" />
      <el-tab-pane :label="'备用 (' + stats.standby + ')'" name="standby" />
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
        :class="{ 'is-backing': char.is_backing }"
        @click="handleCardClick(char)"
      >
        <div class="card-top">
          <div class="tag-badges">
            <el-tag
              v-if="char.tags && char.tags.includes('易错')"
              size="small"
              type="warning"
              class="tag-badge"
              @click.stop="editTag(char)"
            >
              易错
            </el-tag>
            <el-tag
              v-if="char.is_backing"
              size="small"
              type="info"
              class="backing-badge"
            >
              备用
            </el-tag>
          </div>
          <div class="card-buttons">
            <el-button
              v-if="char.is_backing"
              class="action-btn"
              size="small"
              type="success"
              @click.stop="addToStudy(char.character_id)"
            >
              加入学习
            </el-button>
            <el-button
              class="action-btn"
              size="small"
              type="danger"
              @click.stop="removeChar(char.character_id)"
            >
              移除
            </el-button>
          </div>
        </div>
        <div class="card-char">{{ char.character }}</div>
        <div class="card-pinyin">{{ char.pinyin }}</div>
        <div class="card-meta">
          <span>{{ char.stroke_count }}画</span>
        </div>
      </div>
    </div>

    <div v-if="characters.length > 0" class="pagination-wrap">
      <el-pagination
        v-model:current-page="currentPage"
        :page-size="pageSize"
        :total="total"
        layout="prev, pager, next"
        @current-change="onPageChange"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useCollectionStore } from '@renderer/stores/collection'
import { useSettingsStore } from '@renderer/stores/settings'
import { ElMessageBox, ElMessage } from 'element-plus'

const router = useRouter()
const store = useCollectionStore()
const settingsStore = useSettingsStore()
const sortBy = ref('added_at')
const sortDir = ref('DESC')
const loading = ref(false)
const characters = ref<any[]>([])
const activeStatus = ref('all')
const activeTag = ref('all')
const currentPage = ref(1)
const total = ref(0)
const tabStats = ref({ all: 0, learning: 0, mastered: 0, standby: 0 })
const fileInput = ref<HTMLInputElement | null>(null)
const xlsxFileInput = ref<HTMLInputElement | null>(null)

const pageSize = computed(() => settingsStore.collectionPageSize)

onMounted(async () => {
  await fetchStats()
  await Promise.all([fetchTotal(), reload()])
})

async function fetchStats() {
  const s = await window.api.collection.getStats()
  const allBacking = await window.api.learning.getBackingCards(99999)
  tabStats.value = { all: s.total, learning: s.learning, mastered: s.mastered, standby: allBacking.length }
}

const stats = computed(() => tabStats.value)

async function reload() {
  loading.value = true
  const ps = pageSize.value
  const offset = (currentPage.value - 1) * ps
  try {
    let list: any[]
    if (activeTag.value !== 'all') {
      list = await window.api.collection.listByTag(activeTag.value, sortBy.value, sortDir.value, ps, offset)
      if (activeStatus.value !== 'all') {
        list = list.filter((c: any) => {
          if (activeStatus.value === 'unknown') return !c.is_known || c.is_known === 0
          if (activeStatus.value === 'known') return c.is_known === 1 || c.familiarity >= 4
          if (activeStatus.value === 'standby') return c.is_backing === 1
          return true
        })
      }
    } else if (activeStatus.value === 'all') {
      list = await window.api.collection.list(sortBy.value, sortDir.value, undefined, undefined, ps, offset)
    } else {
      list = await window.api.collection.listByStatus(activeStatus.value as any, sortBy.value, sortDir.value, ps, offset)
    }
    characters.value = list
  } finally {
    loading.value = false
  }
}

async function fetchTotal() {
  const allBacking = await window.api.learning.getBackingCards(99999)
  const standby = allBacking.length
  const s = await window.api.collection.getStats()
  if (activeTag.value !== 'all') {
    const all = await window.api.collection.listByTag(activeTag.value, 'added_at', 'DESC', 1, 0)
    // listByTag doesn't return total, so we fetch all and count
    // For now, use a large fetch
    const full = await window.api.collection.listByTag(activeTag.value, 'added_at', 'DESC', 99999)
    let filtered = full
    if (activeStatus.value !== 'all') {
      filtered = full.filter((c: any) => {
        if (activeStatus.value === 'unknown') return !c.is_known || c.is_known === 0
        if (activeStatus.value === 'known') return c.is_known === 1 || c.familiarity >= 4
        if (activeStatus.value === 'standby') return c.is_backing === 1
        return true
      })
    }
    total.value = filtered.length
  } else if (activeStatus.value === 'all') {
    total.value = s.total
  } else if (activeStatus.value === 'known') {
    total.value = s.mastered
  } else if (activeStatus.value === 'standby') {
    total.value = standby
  } else {
    total.value = s.learning
  }
}

async function onStatusChange(pane: any) {
  const status = pane.paneName as string
  activeStatus.value = status
  currentPage.value = 1
  await Promise.all([fetchTotal(), reload()])
}

function setTagFilter(tag: string) {
  activeTag.value = tag
  currentPage.value = 1
  fetchTotal()
  reload()
}

function onPageChange() {
  reload()
}

function toggleSortDir() {
  sortDir.value = sortDir.value === 'ASC' ? 'DESC' : 'ASC'
  onStatusChange({ paneName: activeStatus.value })
}

function handleCardClick(char: any) {
  router.push(`/character/${char.character_id}`)
}

async function removeChar(characterId: number) {
  await ElMessageBox.confirm('确定要移除这个汉字吗？', '提示', { type: 'warning' })
  await store.removeCharacter(characterId)
  await fetchStats()
  await fetchTotal()
  await reload()
}

async function editTag(char: any) {
  const hasYiCuo = char.tags && char.tags.includes('易错')
  const { value: newTag } = await ElMessageBox.prompt(
    '选择标签：',
    '编辑标签',
    {
      inputType: 'select',
      inputOptions: {
        '': '无标签',
        '易错': '易错'
      },
      inputValue: hasYiCuo ? '易错' : ''
    }
  )
  const tags = newTag === '易错' ? ['易错'] : []
  await store.setTags(char.character_id, tags)
  await fetchTotal()
  await reload()
}

async function addToStudy(characterId: number) {
  await store.toggleBacking(characterId)
  ElMessage.success('已加入学习队列')
  await fetchStats()
  await fetchTotal()
  await reload()
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
    await fetchTotal()
    await reload()
  } catch (e: any) {
    if (e !== 'cancel') {
      ElMessage.error('导入失败: ' + e.message)
    }
  }

  target.value = ''
}

function triggerXlsxImport() {
  xlsxFileInput.value?.click()
}

async function handleXlsxImport(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  try {
    loading.value = true
    const result = await window.api.collection.importXlsx(file.path)

    let msg = `导入完成：新增 ${result.added}，更新 ${result.updated}`
    if (result.skipped > 0) msg += `，跳过 ${result.skipped}`
    if (result.similarAdded > 0) msg += `，形近字 ${result.similarAdded}`
    if (result.errors.length > 0) {
      msg += `\n错误：${result.errors.slice(0, 5).join('；')}`
    }
    ElMessage({ message: msg, type: result.errors.length > 0 ? 'warning' : 'success', duration: 5000 })

    await fetchStats()
    await fetchTotal()
    await reload()
  } catch (e: any) {
    if (e !== 'cancel') {
      ElMessage.error('导入失败: ' + e.message)
    }
  }

  target.value = ''
  loading.value = false
}

async function exportXlsx() {
  try {
    const outPath = await window.api.collection.exportXlsx()
    ElMessage.success(`已导出到桌面: ${outPath}`)
  } catch (e: any) {
    ElMessage.error('导出失败: ' + e.message)
  }
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
  flex-wrap: wrap;
}
.tag-filter {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
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
.card-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 4px;
  min-height: 28px;
}
.tag-badges {
  display: flex;
  gap: 4px;
}
.tag-badge {
  cursor: pointer;
  font-size: 11px;
}
.backing-badge {
  font-size: 11px;
}
.card-buttons {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.15s;
}
.char-card:hover .card-buttons { opacity: 1; }
.card-buttons .action-btn {
  padding: 4px 8px;
  font-size: 11px;
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
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-secondary);
}
.char-card:hover .remove-btn { opacity: 1; }
.empty-state {
  text-align: center;
  padding: 60px 0;
  color: var(--text-secondary);
}
.empty-state p { margin-bottom: 16px; font-size: 16px; }
.loading-state { padding: 24px; }
.pagination-wrap {
  display: flex;
  justify-content: center;
  margin-top: 24px;
  margin-bottom: 16px;
}
</style>
