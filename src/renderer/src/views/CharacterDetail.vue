<template>
  <div class="character-detail" v-if="char">
    <div class="back-bar">
      <el-button text @click="goBack">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
        返回
      </el-button>
    </div>
    <div class="detail-header">
      <div class="hero-section">
        <div class="hero-char">{{ char.character }}</div>
        <div ref="strokeEl" class="stroke-player"></div>
        <div class="stroke-controls">
          <el-button size="small" @click="animateStroke">播放笔顺</el-button>
          <el-button size="small" @click="quizStroke">练习写字</el-button>
        </div>
      </div>

      <div class="meta-section">
        <div class="pinyin-display" v-show="isLoaded">
          <span v-if="isMultiPinyin" class="multi-pinyin" v-html="formatPinyin(char.pinyin)"></span>
          <span v-else :class="'tone-' + getTone(char.pinyin)">{{ char.pinyin }}</span>
        </div>
        <div class="meta-grid">
          <div class="meta-item"><span class="meta-label">部首</span><span>{{ char.radical_char || '-' }} {{ char.radical_name || '' }}</span></div>
          <div class="meta-item"><span class="meta-label">笔画</span><span>{{ char.stroke_count }}</span></div>
          <div class="meta-item"><span class="meta-label">结构</span><span>{{ char.structure || '-' }}</span></div>
          <div class="meta-item"><span class="meta-label">频率</span><span>{{ char.frequency ? '#' + char.frequency : '-' }}</span></div>
          <div class="meta-item"><span class="meta-label">拆解</span><span>{{ char.decomposition || '-' }}</span></div>
        </div>
        <div class="meta-def-cn" v-if="char.cn_definition">{{ formatCnDefinition(char.cn_definition) }}</div>
        <div class="meta-def" v-if="char.definition" v-html="formatDefinition(char.definition)"></div>
        <el-button
          :type="collected ? 'danger' : 'primary'"
          @click="toggleCollection"
          style="margin-top: 16px"
        >
          {{ collected ? '取消收藏' : '添加收藏' }}
        </el-button>
        <el-button
          v-if="collected"
          :type="isYiCuo ? 'warning' : 'default'"
          @click="toggleYiCuo"
          style="margin-top: 16px"
        >
          {{ isYiCuo ? '取消易错' : '标记易错' }}
        </el-button>
      </div>
    </div>

    <div class="detail-sections">
      <div class="section" v-if="words.length">
        <h3>组词</h3>
        <div class="word-list">
          <div v-for="w in words" :key="w.id" class="word-item">
            <span class="word-text">{{ w.word }}</span>
            <span class="word-pinyin">{{ w.pinyin }}</span>
            <span class="word-def">{{ w.definition }}</span>
          </div>
        </div>
      </div>

      <div class="section" v-if="sentences.length">
        <h3>造句</h3>
        <div class="sentence-list">
          <div v-for="s in sentences" :key="s.id" class="sentence-item">
            <div class="sentence-text">{{ s.sentence }}</div>
            <div class="sentence-pinyin" v-if="s.pinyin">{{ s.pinyin }}</div>
            <div class="sentence-trans" v-if="s.translation">{{ s.translation }}</div>
          </div>
        </div>
      </div>

      <div class="section" v-if="similarChars.length">
        <h3>相似汉字</h3>
        <div class="similar-grid">
          <div
            v-for="sc in similarChars"
            :key="sc.id"
            class="similar-card"
            @click="$router.push(`/character/${sc.id}`)"
          >
            <span class="similar-char">{{ sc.character }}</span>
            <span class="similar-pinyin">{{ sc.pinyin }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div v-else class="loading-state">
    <el-skeleton :rows="5" animated />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onBeforeUnmount, nextTick, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import HanziWriter from 'hanzi-writer'

import { ElMessage } from 'element-plus'

const route = useRoute()
const router = useRouter()
const props = defineProps<{ id?: string }>()

const char = ref<any>(null)
const words = ref<any[]>([])
const sentences = ref<any[]>([])
const similarChars = ref<any[]>([])
const collected = ref(false)
const isYiCuo = ref(false)
const strokeEl = ref<HTMLElement | null>(null)
const isLoaded = ref(false)
let writer: any = null

const isMultiPinyin = computed(() => {
  if (!char.value?.pinyin) return false
  return char.value.pinyin.includes(' / ')
})

function formatPinyin(pinyin: string): string {
  if (!pinyin) return ''
  if (pinyin.includes(' / ')) {
    return pinyin.split(' / ').map(p => `<span class="pinyin-tag">${p}</span>`).join('')
  }
  return pinyin
}

function formatDefinition(def: string): string {
  if (!def) return ''
  if (def.includes('\n')) {
    return def.split('\n').map(line => {
      const match = line.match(/^([a-zü]+[0-9]*)\s+(.+)$/)
      if (match) {
        return `<div class="multi-def-line"><span class="def-pinyin">${match[1]}</span> ${match[2]}</div>`
      }
      return `<div class="multi-def-line">${line}</div>`
    }).join('')
  }
  return def
}

function formatCnDefinition(def: string): string {
  if (!def) return ''
  // 现代汉语词典格式：拼音 + 释义，拼音后直接是释义
  // 移除页码引用如 "另见1页" 以简化显示
  return def
}

function getTone(pinyin: string): number {
  if (!pinyin) return 5
  const toneMap: Record<string, number> = {
    'ā': 1, 'á': 2, 'ǎ': 3, 'à': 4,
    'ē': 1, 'é': 2, 'ě': 3, 'è': 4,
    'ī': 1, 'í': 2, 'ǐ': 3, 'ì': 4,
    'ō': 1, 'ó': 2, 'ǒ': 3, 'ò': 4,
    'ū': 1, 'ú': 2, 'ǔ': 3, 'ù': 4,
    'ǖ': 1, 'ǘ': 2, 'ǚ': 3, 'ǜ': 4
  }
  for (const ch of pinyin) {
    if (toneMap[ch]) return toneMap[ch]
  }
  return 5
}

function goBack() {
  router.back()
}

async function loadCharacter(id: number) {
  isLoaded.value = false
  char.value = await window.api.character.getDetail(id)
  if (!char.value) return

  const [w, s, sc, c] = await Promise.all([
    window.api.dictionary.getWords(id),
    window.api.dictionary.getSentences(id),
    window.api.character.getSimilar(id, 12),
    window.api.collection.isCollected(id)
  ])
  words.value = w
  sentences.value = s
  similarChars.value = sc
  collected.value = c

  // Check if marked as 易错
  if (c) {
    const list = await window.api.collection.list('added_at', 'DESC', undefined, undefined, 10000, 0)
    const uc = list.find((item: any) => item.character_id === id)
    isYiCuo.value = uc?.tags ? JSON.parse(uc.tags).includes('易错') : false
  }

  await nextTick()
  initStrokeWriter()
  isLoaded.value = true
}

function initStrokeWriter() {
  if (!strokeEl.value || !char.value) return
  if (writer) {
    writer = null
    strokeEl.value.innerHTML = ''
  }
  try {
    writer = HanziWriter.create(strokeEl.value, char.value.character, {
      width: 200,
      height: 200,
      padding: 10,
      strokeAnimationSpeed: 1,
      delayBetweenStrokes: 200,
      strokeColor: '#333',
      radicalColor: '#4a90d9'
    })
  } catch {
    // failed to create HanziWriter
  }
}

function animateStroke() {
  writer?.animateCharacter()
}

function quizStroke() {
  writer?.quiz()
}

async function toggleCollection() {
  if (!char.value) return
  if (collected.value) {
    await window.api.collection.remove(char.value.id)
    collected.value = false
    isYiCuo.value = false
  } else {
    await window.api.collection.add(char.value.id)
    collected.value = true
  }
}

async function toggleYiCuo() {
  if (!char.value || !collected.value) return
  if (isYiCuo.value) {
    await window.api.collection.setTags(char.value.id, [])
    isYiCuo.value = false
    ElMessage.info('已取消易错标记')
  } else {
    await window.api.collection.setTags(char.value.id, ['易错'])
    isYiCuo.value = true
    ElMessage.success('已标记为易错')
  }
}

onMounted(() => {
  const id = Number(props.id || route.params.id)
  if (id) loadCharacter(id)
})

watch(() => route.params.id, (val) => {
  if (val) loadCharacter(Number(val))
})

onBeforeUnmount(() => {
  writer = null
})
</script>

<style scoped>
.back-bar {
  margin-bottom: 8px;
}
.detail-header {
  display: flex;
  gap: 32px;
  margin-bottom: 32px;
}
.hero-section {
  text-align: center;
}
.hero-char {
  font-size: 120px;
  font-weight: 700;
  line-height: 1.1;
  color: var(--text-primary);
}
.stroke-player {
  width: 200px;
  height: 200px;
  margin: 8px auto;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: #fafafa;
}
.stroke-controls {
  display: flex;
  gap: 8px;
  justify-content: center;
  margin-top: 8px;
}
.meta-section {
  flex: 1;
}
.pinyin-display {
  font-size: 32px;
  font-weight: 600;
  margin-bottom: 16px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.multi-pinyin {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.pinyin-tag {
  background: #f0f5ff;
  padding: 2px 10px;
  border-radius: 4px;
  font-size: 24px;
  color: var(--primary);
  font-weight: 600;
}
.tone-1 { color: var(--tone1); }
.tone-2 { color: var(--tone2); }
.tone-3 { color: var(--tone3); }
.tone-4 { color: var(--tone4); }
.tone-5 { color: var(--tone5); }
.meta-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}
.meta-item {
  display: flex;
  gap: 8px;
  font-size: 14px;
}
.meta-label {
  color: var(--text-secondary);
  min-width: 40px;
}
.meta-def {
  margin-top: 12px;
  color: var(--text-regular);
  font-size: 14px;
  line-height: 1.8;
}
.meta-def-cn {
  margin-top: 12px;
  color: var(--text-primary);
  font-size: 15px;
  line-height: 1.8;
  font-weight: 500;
}
.multi-def-line {
  margin-bottom: 6px;
}
.multi-def-line:last-child {
  margin-bottom: 0;
}
.def-pinyin {
  font-weight: 600;
  color: var(--primary);
  margin-right: 8px;
  font-size: 14px;
}
.section {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: 20px;
  margin-bottom: 16px;
  box-shadow: var(--shadow);
}
.section h3 {
  font-size: 16px;
  margin-bottom: 12px;
  color: var(--text-primary);
}
.word-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.word-item {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 6px 0;
}
.word-text {
  font-size: 18px;
  font-weight: 600;
  min-width: 80px;
}
.word-pinyin {
  color: var(--primary);
  min-width: 80px;
  font-size: 14px;
}
.word-def {
  color: var(--text-secondary);
  font-size: 13px;
}
.sentence-item {
  padding: 8px 0;
}
.sentence-item + .sentence-item {
  border-top: 1px solid var(--border);
}
.sentence-text {
  font-size: 16px;
  line-height: 1.6;
}
.sentence-pinyin {
  color: var(--text-secondary);
  font-size: 13px;
  margin-top: 2px;
}
.sentence-trans {
  color: var(--text-secondary);
  font-size: 13px;
  font-style: italic;
}
.similar-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.similar-card {
  width: 72px;
  padding: 10px 0;
  text-align: center;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  cursor: pointer;
  transition: all 0.15s;
}
.similar-card:hover {
  border-color: var(--primary);
  background: #f0f5ff;
}
.similar-char {
  display: block;
  font-size: 28px;
  font-weight: 700;
}
.similar-pinyin {
  font-size: 12px;
  color: var(--primary);
}
.loading-state { padding: 24px; }
</style>
