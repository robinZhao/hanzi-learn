<template>
  <div class="learning-view">
    <!-- Start Screen -->
    <template v-if="!started">
      <div class="start-screen">
        <h1>开始学习</h1>

        <el-tabs v-model="sessionTab" class="session-tabs">
          <el-tab-pane label="待复习" name="due">
            <p class="tab-desc">复习到期和未学过的收藏汉字</p>
            <el-button type="primary" size="large" @click="start('due')" :loading="store.loading">
              开始复习 ({{ dueCount }})
            </el-button>
          </el-tab-pane>

          <el-tab-pane label="已学回顾" name="learned">
            <p class="tab-desc">浏览回顾已学过的汉字</p>
            <el-button type="primary" size="large" @click="start('learned')">
              浏览已学汉字
            </el-button>
          </el-tab-pane>

          <el-tab-pane label="随机测验" name="random">
            <p class="tab-desc">随机抽取汉字测验</p>
            <div class="random-options">
              <el-select v-model="randomSource" size="default" class="source-select">
                <el-option label="全库" value="all" />
                <el-option label="已收藏" value="collected" />
              </el-select>
              <el-select v-if="randomSource === 'all'" v-model="selectedLevel" size="default" class="level-select">
                <el-option label="初级" value="beginner" />
                <el-option label="中级" value="intermediate" />
                <el-option label="高级" value="advanced" />
              </el-select>
              <el-input-number v-model="randomCount" :min="10" :max="50" :step="5" size="default" />
              <el-button type="primary" size="large" @click="startRandom">开始测验</el-button>
            </div>
          </el-tab-pane>
        </el-tabs>

        <!-- Add new characters -->
        <div class="add-to-session">
          <h3>加入新字</h3>
          <el-input
            v-model="addQuery"
            placeholder="输入汉字或拼音搜索..."
            clearable
            @input="onAddSearch"
          />
          <div v-if="addResults.length" class="add-results">
            <div
              v-for="char in addResults"
              :key="char.id"
              class="add-item"
            >
              <span class="add-char">{{ char.character }}</span>
              <span class="add-pinyin">{{ char.pinyin }}</span>
              <el-button size="small" @click="addToSession(char.id)">加入</el-button>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Done Screen -->
    <template v-else-if="store.progress.done">
      <div class="done-screen">
        <h1>{{ sessionMode === 'random' ? '测验完成!' : '学习完成!' }}</h1>
        <div class="done-stats">
          <div class="done-stat">
            <div class="done-number">{{ store.sessionResults.length }}</div>
            <div class="done-label">已复习</div>
          </div>
          <div class="done-stat">
            <div class="done-number">{{ goodCount }}</div>
            <div class="done-label">掌握</div>
          </div>
          <div class="done-stat">
            <div class="done-number">{{ againCount }}</div>
            <div class="done-label">需再练</div>
          </div>
        </div>
        <div class="done-actions">
          <el-button type="primary" @click="restart">再来一轮</el-button>
          <el-button @click="$router.push('/')">返回首页</el-button>
        </div>
      </div>
    </template>

    <!-- Card View -->
    <template v-else-if="store.currentCard">
      <div class="progress-bar">
        <div class="progress-text">{{ store.progress.current }} / {{ store.progress.total }}</div>
        <el-progress
          :percentage="(store.progress.current / store.progress.total) * 100"
          :show-text="false"
          :stroke-width="6"
        />
      </div>

      <div class="card-container" @click="store.flipCard" @keyup.space="store.flipCard" tabindex="0">
        <div class="flash-card" :class="{ flipped: store.flipped }">
          <div class="card-front">
            <div class="front-char">{{ store.currentCard.character }}</div>
            <div class="front-hint">{{ store.currentCard.stroke_count }}画 / {{ store.currentCard.structure || '...' }}</div>
            <div class="front-tip">点击翻转 / 按空格键</div>
          </div>
          <div class="card-back">
            <div class="back-pinyin" :class="'tone-' + getTone(store.currentCard.pinyin)">
              {{ store.currentCard.pinyin }}
            </div>
            <div class="back-char">{{ store.currentCard.character }}</div>
            <div class="back-def">{{ store.currentCard.cn_definition || store.currentCard.definition || '' }}</div>
            <div class="back-words" v-if="currentWords.length">
              <span class="words-label">组词:</span>
              <span v-for="(w, i) in currentWords" :key="i" class="word-pill">{{ w.word }} ({{ w.pinyin }})</span>
            </div>
            <div class="back-system-sentences" v-if="systemSentences.length">
              <span class="sentences-label">例句:</span>
              <div v-for="(s, i) in systemSentences" :key="i" class="sentence-item">
                <span>{{ s.sentence }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- User sentence section -->
      <div class="user-sentence-section" v-if="store.flipped">
        <h4>造句练习</h4>
        <el-input
          v-model="newSentence"
          type="textarea"
          :rows="2"
          :placeholder="'用「' + store.currentCard.character + '」造句...'"
          @keydown.enter.ctrl="submitUserSentence"
        />
        <el-button
          type="primary"
          size="small"
          @click="submitUserSentence"
          :disabled="!newSentence.trim()"
          style="margin-top: 8px"
        >
          保存造句
        </el-button>

        <div v-if="userSentences.length" class="user-sentence-list">
          <div v-for="s in userSentences" :key="s.id" class="user-sentence-item">
            <span class="sentence-text">{{ s.sentence }}</span>
            <el-button size="small" text type="danger" @click.stop="deleteSentence(s.id)">删除</el-button>
          </div>
        </div>
      </div>

      <!-- Rating Buttons -->
      <div class="rating-buttons" v-if="store.flipped">
        <el-button type="success" size="large" @click="handleKnow">认识</el-button>
        <el-button :type="isCollected ? 'warning' : 'primary'" size="large" @click="handleCollect">
          {{ isCollected ? '已收藏' : '收藏' }}
        </el-button>
        <el-button type="danger" @click="rate(1)">再来<br/><small>1</small></el-button>
        <el-button type="warning" @click="rate(2)">困难<br/><small>2</small></el-button>
        <el-button type="primary" @click="rate(3)">一般<br/><small>3</small></el-button>
        <el-button type="info" @click="rate(4)">简单<br/><small>4</small></el-button>
      </div>
    </template>

    <!-- Empty State -->
    <template v-else>
      <div class="start-screen">
        <h1>没有待复习的汉字</h1>
        <p>去收藏更多汉字吧!</p>
        <el-button @click="$router.push('/dictionary')">查字</el-button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useLearningStore } from '@renderer/stores/learning'
import { useSettingsStore } from '@renderer/stores/settings'
import { ElMessage } from 'element-plus'

const store = useLearningStore()
const settingsStore = useSettingsStore()
const started = ref(false)
const sessionTab = ref('due')
const selectedLevel = ref('beginner')
const randomCount = ref(20)
const randomSource = ref('all')
const addQuery = ref('')
const addResults = ref<any[]>([])
const newSentence = ref('')
const currentWords = ref<any[]>([])
const systemSentences = ref<any[]>([])
const userSentences = ref<any[]>([])
const isCollected = ref(false)
let addSearchTimer: ReturnType<typeof setTimeout> | null = null

const dueCount = ref(0)

const goodCount = computed(() =>
  store.sessionResults.filter((r) => r.rating >= 3).length
)
const againCount = computed(() =>
  store.sessionResults.filter((r) => r.rating === 1).length
)
const sessionMode = computed(() => store.sessionMode)

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

async function fetchDueCount() {
  const stats = await window.api.collection.getStats()
  dueCount.value = stats.due_today
}

function onAddSearch() {
  if (addSearchTimer) clearTimeout(addSearchTimer)
  if (!addQuery.value.trim()) { addResults.value = []; return }
  addSearchTimer = setTimeout(async () => {
    addResults.value = await window.api.character.search(
      addQuery.value.trim(), 10,
      !settingsStore.showAllCharacters
    )
  }, 300)
}

async function addToSession(characterId: number) {
  await store.addToSessionQueue(characterId)
  ElMessage.success('已加入学习队列')
  addQuery.value = ''
  addResults.value = []
}

async function handleKnow() {
  await store.knowCard()
  await loadCardExtras()
}

async function handleCollect() {
  const added = await store.collectCurrentCard()
  if (added) {
    isCollected.value = true
    ElMessage.success('已添加到收藏')
  } else {
    ElMessage.info('已在收藏中')
  }
}

function start(mode: 'due' | 'learned') {
  store.startSession(mode)
  started.value = true
}

function startRandom() {
  const level = randomSource.value === 'collected' ? 'advanced' : selectedLevel.value
  store.startSession('random', { limit: randomCount.value, randomLevel: level, randomSource: randomSource.value })
  started.value = true
}

function restart() {
  started.value = false
  sessionTab.value = 'due'
}

async function rate(rating: number) {
  await store.submitRating(rating)
  await loadCardExtras()
}

async function loadCardExtras() {
  if (!store.currentCard) return
  const charId = store.currentCard.character_id
  const [w, allSentences] = await Promise.all([
    window.api.dictionary.getWords(charId),
    window.api.sentences.list(charId)
  ])
  currentWords.value = w.slice(0, 3)
  systemSentences.value = allSentences.filter((s: any) => !s.is_user).slice(0, 3)
  userSentences.value = allSentences.filter((s: any) => s.is_user)
}

async function submitUserSentence() {
  if (!newSentence.value.trim() || !store.currentCard) return
  await window.api.sentences.add(store.currentCard.character_id, newSentence.value.trim())
  newSentence.value = ''
  ElMessage.success('造句已保存')
  await loadCardExtras()
}

async function deleteSentence(sentenceId: number) {
  await window.api.sentences.delete(sentenceId)
  ElMessage.success('已删除')
  await loadCardExtras()
}

function onKeydown(e: KeyboardEvent) {
  if (e.code === 'Space') {
    e.preventDefault()
    store.flipCard()
  } else if (store.flipped && ['Digit1', 'Digit2', 'Digit3', 'Digit4'].includes(e.code)) {
    rate(Number(e.code.replace('Digit', '')))
  } else if (store.flipped && (e.code === 'Enter' || e.code === 'Digit5')) {
    e.preventDefault()
    handleKnow()
  }
}

onMounted(async () => {
  window.addEventListener('keydown', onKeydown)
  await fetchDueCount()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
})

watch(() => store.currentCard, async () => {
  if (store.currentCard) {
    await loadCardExtras()
    const charId = store.currentCard.character_id
    isCollected.value = await window.api.collection.isCollected(charId)
  }
})
</script>

<style scoped>
.learning-view {
  max-width: 700px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: calc(100vh - 120px);
}
.start-screen, .done-screen {
  text-align: center;
  padding-top: 40px;
  width: 100%;
  max-width: 500px;
}
.start-screen h1, .done-screen h1 {
  font-size: 28px;
  margin-bottom: 12px;
}
.start-screen p, .done-screen p {
  color: var(--text-secondary);
  margin-bottom: 24px;
}
.session-tabs {
  width: 100%;
  margin-bottom: 24px;
}
.session-tabs :deep(.el-tabs__content) {
  padding-top: 16px;
}
.tab-desc {
  color: var(--text-secondary);
  font-size: 13px;
  margin-bottom: 16px;
}
.random-options {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  justify-content: center;
}
.level-select {
  width: 100px;
}
.source-select {
  width: 90px;
}
.add-to-session {
  margin-top: 32px;
  width: 100%;
  text-align: left;
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: 20px;
  box-shadow: var(--shadow);
}
.add-to-session h3 {
  font-size: 16px;
  margin-bottom: 12px;
  color: var(--text-primary);
}
.add-results {
  margin-top: 12px;
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
.add-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  transition: background 0.15s;
}
.add-item:hover {
  background: #f0f5ff;
}
.add-item + .add-item {
  border-top: 1px solid var(--border);
}
.add-char {
  font-size: 20px;
  font-weight: 700;
  min-width: 32px;
}
.add-pinyin {
  color: var(--primary);
  font-size: 13px;
  min-width: 60px;
}
.done-stats {
  display: flex;
  gap: 32px;
  justify-content: center;
  margin: 32px 0;
}
.done-stat { text-align: center; }
.done-number {
  font-size: 36px;
  font-weight: 700;
  color: var(--primary);
}
.done-label {
  font-size: 14px;
  color: var(--text-secondary);
}
.done-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}
.progress-bar {
  width: 100%;
  margin-bottom: 24px;
}
.progress-text {
  text-align: right;
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}
.card-container {
  perspective: 1000px;
  width: 480px;
  height: 380px;
  cursor: pointer;
  outline: none;
  margin-bottom: 16px;
}
.flash-card {
  width: 100%;
  height: 100%;
  position: relative;
  transform-style: preserve-3d;
  transition: transform 0.5s ease;
}
.flash-card.flipped {
  transform: rotateY(180deg);
}
.card-front, .card-back {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.card-back {
  transform: rotateY(180deg);
  justify-content: flex-start;
  padding-top: 24px;
  overflow-y: auto;
}
.front-char {
  font-size: 140px;
  font-weight: 700;
  line-height: 1;
}
.front-hint {
  margin-top: 16px;
  color: var(--text-secondary);
  font-size: 14px;
}
.front-tip {
  margin-top: 24px;
  color: #c0c4cc;
  font-size: 12px;
}
.back-pinyin {
  font-size: 28px;
  font-weight: 600;
  margin-bottom: 2px;
}
.back-char {
  font-size: 48px;
  font-weight: 700;
  margin-bottom: 6px;
}
.back-def {
  color: var(--text-regular);
  font-size: 13px;
  margin-bottom: 10px;
  text-align: center;
  line-height: 1.5;
}
.back-words, .back-system-sentences {
  width: 100%;
  font-size: 13px;
  margin-top: 4px;
}
.words-label, .sentences-label {
  color: var(--text-secondary);
  margin-right: 8px;
  font-size: 12px;
}
.word-pill {
  display: inline-block;
  background: #f0f5ff;
  padding: 2px 8px;
  border-radius: 4px;
  margin: 2px 4px;
  font-size: 12px;
  color: var(--primary-dark);
}
.sentence-item {
  color: var(--text-regular);
  font-size: 12px;
  line-height: 1.5;
  margin-top: 2px;
}
.tone-1 { color: var(--tone1); }
.tone-2 { color: var(--tone2); }
.tone-3 { color: var(--tone3); }
.tone-4 { color: var(--tone4); }
.tone-5 { color: var(--tone5); }
.user-sentence-section {
  width: 100%;
  max-width: 480px;
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: 16px;
  box-shadow: var(--shadow);
  margin-bottom: 16px;
}
.user-sentence-section h4 {
  font-size: 14px;
  margin-bottom: 10px;
  color: var(--text-primary);
}
.user-sentence-list {
  margin-top: 12px;
  max-height: 120px;
  overflow-y: auto;
}
.user-sentence-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 0;
  font-size: 13px;
  color: var(--text-regular);
}
.user-sentence-item + .user-sentence-item {
  border-top: 1px solid var(--border);
}
.rating-buttons {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: center;
}
.rating-buttons .el-button {
  min-width: 72px;
  height: 50px;
}
.rating-buttons small {
  opacity: 0.7;
  font-size: 11px;
}
</style>
