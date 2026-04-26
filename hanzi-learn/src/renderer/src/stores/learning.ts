import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useSettingsStore } from './settings'

export const useLearningStore = defineStore('learning', () => {
  const cards = ref<any[]>([])
  const currentIndex = ref(0)
  const flipped = ref(false)
  const sessionResults = ref<{ rating: number }[]>([])
  const loading = ref(false)
  const sessionMode = ref<'due' | 'learned' | 'random'>('due')

  const currentCard = computed(() => cards.value[currentIndex.value] || null)
  const progress = computed(() => ({
    current: currentIndex.value + 1,
    total: cards.value.length,
    done: currentIndex.value >= cards.value.length
  }))

  async function startSession(
    mode: 'due' | 'learned' | 'random' = 'due',
    options?: { limit?: number; randomLevel?: string; randomSource?: string }
  ) {
    loading.value = true
    sessionMode.value = mode
    try {
      if (mode === 'due') {
        cards.value = await window.api.learning.getDueCards(options?.limit)
      } else if (mode === 'learned') {
        cards.value = await window.api.learning.getAllLearned(options?.limit)
      } else if (mode === 'random') {
        const settings = useSettingsStore()
        const chars = await window.api.learning.getRandomCharacters(
          (options?.randomLevel as any) || 'beginner',
          options?.limit,
          options?.randomSource,
          !settings.showAllCharacters
        )
        cards.value = chars.map((c: any) => ({
          id: null,
          character_id: c.id,
          character: c.character,
          pinyin: c.pinyin,
          stroke_count: c.stroke_count,
          structure: c.structure,
          frequency: c.frequency,
          definition: c.definition,
          familiarity: 0,
          review_count: 0,
          notes: null,
          added_at: null,
          next_review: null,
          _isRandom: true
        }))
      }
      currentIndex.value = 0
      flipped.value = false
      sessionResults.value = []
    } finally {
      loading.value = false
    }
  }

  function flipCard() {
    flipped.value = !flipped.value
  }

  async function submitRating(rating: number) {
    const card = currentCard.value
    if (!card) return

    if (!card._isRandom) {
      await window.api.learning.submitReview(card.id, rating)
    }
    sessionResults.value.push({ rating })
    flipped.value = false
    currentIndex.value++
  }

  async function knowCard() {
    const card = currentCard.value
    if (!card) return
    if (!card._isRandom) {
      await window.api.learning.markAsKnown(card.id)
    }
    sessionResults.value.push({ rating: 5 })
    flipped.value = false
    currentIndex.value++
  }

  // Mark all random characters as learned after session
  async function finalizeRandomSession() {
    for (const card of cards.value) {
      if (card._isRandom) {
        const isCollected = await window.api.collection.isCollected(card.character_id)
        if (!isCollected) {
          await window.api.collection.add(card.character_id)
        }
      }
    }
  }

  // Collect the current card character
  async function collectCurrentCard() {
    const card = currentCard.value
    if (!card) return false
    const charId = card.character_id
    const isCollected = await window.api.collection.isCollected(charId)
    if (!isCollected) {
      await window.api.collection.add(charId)
      return true
    }
    return false
  }

  async function addToSessionQueue(characterId: number) {
    // Check if already in queue
    if (cards.value.find((c) => c.character_id === characterId)) return

    // Add to collection if not already
    const isCollected = await window.api.collection.isCollected(characterId)
    if (!isCollected) {
      await window.api.collection.add(characterId)
    }

    // Re-fetch to get the user_characters row
    const list = await window.api.collection.list('added_at', 'DESC')
    const uc = list.find((c: any) => c.character_id === characterId)
    if (uc && !cards.value.find((c: any) => c.character_id === characterId)) {
      cards.value.push({ ...uc, _justAdded: true })
    }
  }

  return {
    cards,
    currentIndex,
    flipped,
    sessionResults,
    loading,
    sessionMode,
    currentCard,
    progress,
    startSession,
    flipCard,
    submitRating,
    knowCard,
    addToSessionQueue,
    finalizeRandomSession,
    collectCurrentCard
  }
})
