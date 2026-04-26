<template>
  <div class="radical-explorer">
    <div class="page-header">
      <h1>部首探索</h1>
      <span class="subtitle">214 个康熙部首</span>
    </div>

    <div class="explorer-layout">
      <div class="radical-panel">
        <div v-for="group in groupedRadicals" :key="group.strokes" class="stroke-group">
          <div class="stroke-label">{{ group.strokes }}画</div>
          <div class="radical-tiles">
            <div
              v-for="r in group.radicals"
              :key="r.id"
              class="radical-tile"
              :class="{ selected: selectedId === r.id }"
              @click="selectRadical(r.id)"
            >
              <span class="radical-char">{{ r.radical }}</span>
              <span class="radical-count">{{ r.char_count }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="character-panel">
        <template v-if="selectedRadical">
          <div class="panel-header">
            <span class="selected-radical">{{ selectedRadical.radical }}</span>
            <span class="radical-name">{{ selectedRadical.name || '' }}</span>
            <span class="radical-info">{{ selectedRadical.pinyin || '' }} / {{ radicalCharacters.length }} 字</span>
          </div>
          <div class="char-list">
            <div
              v-for="c in radicalCharacters"
              :key="c.id"
              class="char-item"
              @click="$router.push(`/character/${c.id}`)"
            >
              <span class="item-char">{{ c.character }}</span>
              <span class="item-pinyin">{{ c.pinyin }}</span>
              <span class="item-strokes">{{ c.stroke_count }}画</span>
              <span class="item-def">{{ c.definition || '' }}</span>
            </div>
          </div>
        </template>
        <div v-else class="panel-placeholder">
          <p>选择左侧的部首查看相关汉字</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useRadicalStore } from '@renderer/stores/radical'
import { storeToRefs } from 'pinia'

const props = defineProps<{ radicalId?: string }>()
const route = useRoute()
const store = useRadicalStore()
const { radicals, selectedRadical, radicalCharacters } = storeToRefs(store)
const selectedId = ref<number | null>(null)

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

onMounted(async () => {
  await store.fetchRadicals()
  const id = props.radicalId || route.params.radicalId
  if (id) selectRadical(Number(id))
})

watch(() => route.params.radicalId, (val) => {
  if (val) selectRadical(Number(val))
})

async function selectRadical(id: number) {
  selectedId.value = id
  await store.selectRadical(id)
}
</script>

<style scoped>
.page-header {
  margin-bottom: 20px;
}
.page-header h1 {
  font-size: 24px;
  display: inline;
}
.subtitle {
  color: var(--text-secondary);
  margin-left: 12px;
  font-size: 14px;
}
.explorer-layout {
  display: flex;
  gap: 20px;
  height: calc(100vh - 180px);
}
.radical-panel {
  width: 360px;
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
.character-panel {
  flex: 1;
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: 20px;
  box-shadow: var(--shadow);
  overflow-y: auto;
}
.panel-header {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
}
.selected-radical {
  font-size: 36px;
  font-weight: 700;
}
.radical-name {
  font-size: 16px;
  color: var(--text-primary);
}
.radical-info {
  font-size: 13px;
  color: var(--text-secondary);
}
.char-list {
  display: flex;
  flex-direction: column;
}
.char-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
}
.char-item:hover {
  background: #f0f5ff;
}
.item-char {
  font-size: 28px;
  font-weight: 700;
  min-width: 40px;
  text-align: center;
}
.item-pinyin {
  color: var(--primary);
  min-width: 60px;
  font-size: 14px;
}
.item-strokes {
  color: var(--text-secondary);
  font-size: 12px;
  min-width: 40px;
}
.item-def {
  flex: 1;
  color: var(--text-secondary);
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.panel-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 300px;
  color: var(--text-secondary);
  font-size: 16px;
}
</style>
