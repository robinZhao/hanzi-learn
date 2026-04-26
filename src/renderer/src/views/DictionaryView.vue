<template>
  <div class="dictionary-view">
    <div class="page-header">
      <h1>查字</h1>
    </div>

    <el-tabs v-model="activeTab" class="dict-tabs" @tab-click="onTabChange">
      <!-- 部首查字 -->
      <el-tab-pane label="部首查字" name="radical">
        <div class="radical-panel">
          <div class="radical-grid">
            <div v-for="group in groupedRadicals" :key="group.strokes" class="stroke-group">
              <div class="stroke-label">{{ group.strokes }}画</div>
              <div class="radical-tiles">
                <div
                  v-for="r in group.radicals"
                  :key="r.id"
                  class="radical-tile"
                  :class="{ selected: selectedRadicalId === r.id }"
                  @click="selectRadical(r.id)"
                >
                  <span class="radical-char">{{ r.radical }}</span>
                  <span class="radical-count">{{ r.char_count }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Selected radical characters -->
          <div v-if="selectedRadical" class="char-result-panel">
            <div class="panel-header">
              <span class="sel-radical">{{ selectedRadical.radical }}</span>
              <span class="sel-name">{{ selectedRadical.name || '' }}</span>
              <span class="sel-info">{{ selectedRadical.pinyin || '' }} / {{ radicalChars.length }} 字</span>
            </div>
            <div class="char-grid">
              <div
                v-for="c in radicalChars"
                :key="c.id"
                class="char-item"
                @click="$router.push(`/character/${c.id}`)"
              >
                <span class="ci-char">{{ c.character }}</span>
                <span class="ci-pinyin">{{ c.pinyin }}</span>
                <span class="ci-strokes">{{ c.stroke_count }}画</span>
                <span class="ci-def">{{ c.definition || '' }}</span>
              </div>
            </div>
          </div>
          <div v-else class="char-result-panel placeholder">
            <p>选择上方的部首查看相关汉字</p>
          </div>
        </div>
      </el-tab-pane>

      <!-- 拼音查字 -->
      <el-tab-pane label="拼音查字" name="pinyin">
        <div class="pinyin-panel">
          <div class="pinyin-input-row">
            <el-input
              v-model="pinyinInput"
              placeholder="输入拼音 (如: zhong, hua)..."
              size="large"
              clearable
              @keyup.enter="doPinyinSearch"
              @input="onPinyinInput"
              class="pinyin-input"
            >
              <template #append>
                <el-select v-model="toneFilter" style="width: 80px" size="large" @change="doPinyinSearch">
                  <el-option label="不限" :value="0" />
                  <el-option label="一声" :value="1" />
                  <el-option label="二声" :value="2" />
                  <el-option label="三声" :value="3" />
                  <el-option label="四声" :value="4" />
                </el-select>
              </template>
            </el-input>
            <el-button type="primary" size="large" @click="doPinyinSearch">查字</el-button>
          </div>

          <div v-if="pinyinResults.length" class="char-grid pinyin-results">
            <div
              v-for="c in pinyinResults"
              :key="c.id"
              class="char-item"
              @click="$router.push(`/character/${c.id}`)"
            >
              <span class="ci-char">{{ c.character }}</span>
              <span class="ci-pinyin" v-html="formatPinyin(c.pinyin)"></span>
              <span class="ci-strokes">{{ c.stroke_count }}画</span>
              <span class="ci-def" v-html="formatDefinition(c.definition)"></span>
            </div>
          </div>
          <div v-else-if="pinyinSearched" class="empty-state">
            <p>没有找到匹配的汉字</p>
          </div>
          <div v-else class="empty-state">
            <p>输入拼音和声调进行搜索</p>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRadicalStore } from '@renderer/stores/radical'
import { useSettingsStore } from '@renderer/stores/settings'
import { storeToRefs } from 'pinia'

const activeTab = ref('radical')
const selectedRadicalId = ref<number | null>(null)

// Radical tab state
const radicalStore = useRadicalStore()
const { radicals, selectedRadical, radicalCharacters } = storeToRefs(radicalStore)

interface RadicalGroup {
  strokes: number
  radicals: any[]
}

const groupedRadicals = computed<RadicalGroup[]>(() => {
  const groups: Record<number, any[]> = {}
  for (const r of radicals.value) {
    const s = r.stroke_count || 1
    if (!groups[s]) groups[s] = []
    groups[s].push(r)
  }
  return Object.entries(groups)
    .map(([k, v]) => ({ strokes: Number(k), radicals: v }))
    .sort((a, b) => a.strokes - b.strokes)
})

const radicalChars = computed(() => radicalCharacters.value)

async function selectRadical(id: number) {
  selectedRadicalId.value = id
  await radicalStore.selectRadical(id)
}

// Pinyin tab state
const pinyinInput = ref('')
const toneFilter = ref(0)
const pinyinResults = ref<any[]>([])
const pinyinSearched = ref(false)
let pinyinTimer: ReturnType<typeof setTimeout> | null = null

function onPinyinInput() {
  if (!pinyinInput.value.trim()) {
    pinyinResults.value = []
    pinyinSearched.value = false
    return
  }
  if (pinyinTimer) clearTimeout(pinyinTimer)
  pinyinTimer = setTimeout(() => {
    doPinyinSearch()
  }, 300)
}

async function doPinyinSearch() {
  const q = pinyinInput.value.trim()
  if (!q) return
  const tone = toneFilter.value || undefined
  const settingsStore = useSettingsStore()
  pinyinResults.value = await window.api.character.searchByPinyin(
    q, tone, !settingsStore.showAllCharacters
  )
  pinyinSearched.value = true
}

function onTabChange() {
  // Load radicals when switching to that tab if not loaded
  if (activeTab.value === 'radical' && radicals.value.length === 0) {
    radicalStore.fetchRadicals()
  }
}

function formatPinyin(pinyin: string): string {
  if (!pinyin) return ''
  // If multi-pronunciation (contains ' / '), show with separators
  if (pinyin.includes(' / ')) {
    return pinyin.split(' / ').map(p => `<span class="pinyin-tag">${p}</span>`).join('')
  }
  return pinyin
}

function formatDefinition(def: string): string {
  if (!def) return ''
  // Multi-line definitions from multi-pronunciation characters
  if (def.includes('\n')) {
    return def.split('\n').map(line => {
      const match = line.match(/^([a-z]+[0-9]*)\s+(.+)$/)
      if (match) {
        return `<div class="multi-def-line"><span class="def-pinyin">${match[1]}</span> ${match[2]}</div>`
      }
      return `<div class="multi-def-line">${line}</div>`
    }).join('')
  }
  return def
}

onMounted(() => {
  if (activeTab.value === 'radical') {
    radicalStore.fetchRadicals()
  }
})
</script>

<style scoped>
.dictionary-view {
  max-width: 1000px;
  margin: 0 auto;
}
.page-header {
  margin-bottom: 16px;
}
.page-header h1 {
  font-size: 24px;
  margin: 0;
}
.dict-tabs :deep(.el-tabs__content) {
  padding-top: 8px;
}

/* Radical panel */
.radical-panel {
  display: flex;
  gap: 20px;
  height: calc(100vh - 220px);
}
.radical-grid {
  width: 340px;
  flex-shrink: 0;
  overflow-y: auto;
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: 16px;
  box-shadow: var(--shadow);
}
.stroke-group {
  margin-bottom: 12px;
}
.stroke-label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 6px;
  font-weight: 600;
}
.radical-tiles {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.radical-tile {
  width: 48px;
  height: 48px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
}
.radical-tile:hover {
  border-color: var(--primary);
  background: #f0f5ff;
}
.radical-tile.selected {
  background: var(--primary);
  border-color: var(--primary);
  color: #fff;
}
.radical-char {
  font-size: 18px;
  font-weight: 600;
  line-height: 1;
}
.radical-count {
  font-size: 10px;
  color: var(--text-secondary);
  margin-top: 2px;
}
.radical-tile.selected .radical-count {
  color: rgba(255,255,255,0.8);
}

/* Character result panel */
.char-result-panel {
  flex: 1;
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: 20px;
  box-shadow: var(--shadow);
  overflow-y: auto;
}
.char-result-panel.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  font-size: 16px;
}
.panel-header {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
}
.sel-radical {
  font-size: 36px;
  font-weight: 700;
}
.sel-name {
  font-size: 16px;
  color: var(--text-primary);
}
.sel-info {
  font-size: 13px;
  color: var(--text-secondary);
}

/* Pinyin panel */
.pinyin-panel {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: 24px;
  box-shadow: var(--shadow);
  min-height: calc(100vh - 220px);
}
.pinyin-input-row {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  align-items: center;
}
.pinyin-input {
  flex: 1;
}

/* Character grid (shared) */
.char-grid {
  display: flex;
  flex-direction: column;
  gap: 0;
  max-height: calc(100vh - 300px);
  overflow-y: auto;
}
.char-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
  min-height: 48px;
}
.char-item:hover {
  background: #f0f5ff;
}
.char-item + .char-item {
  border-top: 1px solid var(--border);
}
.ci-char {
  font-size: 28px;
  font-weight: 700;
  min-width: 40px;
  text-align: center;
}
.ci-pinyin {
  color: var(--primary);
  min-width: 60px;
  font-size: 14px;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.pinyin-tag {
  background: #f0f5ff;
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 12px;
  color: var(--primary-dark);
  white-space: nowrap;
}
.ci-strokes {
  color: var(--text-secondary);
  font-size: 12px;
  min-width: 40px;
}
.ci-def {
  flex: 1;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.6;
  white-space: normal;
  word-break: break-word;
}
.multi-def-line {
  margin-bottom: 4px;
}
.multi-def-line:last-child {
  margin-bottom: 0;
}
.def-pinyin {
  font-weight: 600;
  color: var(--primary);
  margin-right: 6px;
  font-size: 12px;
}
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: var(--text-secondary);
  font-size: 16px;
}
</style>
