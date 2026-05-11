import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useCollectionStore = defineStore('collection', () => {
  const characters = ref<any[]>([])
  const stats = ref({ total: 0, learning: 0, mastered: 0 })
  const loading = ref(false)

  async function fetchList(
    sortBy = 'added_at',
    sortDir = 'DESC',
    radicalId?: number,
    familiarity?: number
  ) {
    loading.value = true
    try {
      characters.value = await window.api.collection.list(sortBy, sortDir, radicalId, familiarity)
    } finally {
      loading.value = false
    }
  }

  async function fetchStats() {
    stats.value = await window.api.collection.getStats()
  }

  async function addCharacter(characterId: number) {
    await window.api.collection.add(characterId)
    await fetchStats()
  }

  async function removeCharacter(characterId: number) {
    await window.api.collection.remove(characterId)
    characters.value = characters.value.filter((c) => c.character_id !== characterId)
    await fetchStats()
  }

  async function fetchByStatus(status: string) {
    loading.value = true
    try {
      if (status === 'all') {
        characters.value = await window.api.collection.list('added_at', 'DESC')
      } else {
        characters.value = await window.api.collection.listByStatus(status as any, 'added_at', 'DESC')
      }
    } finally {
      loading.value = false
    }
  }

  async function setTags(characterId: number, tags: string[]) {
    await window.api.collection.setTags(characterId, tags)
  }

  async function toggleBacking(characterId: number) {
    await window.api.collection.toggleBacking(characterId)
  }

  return { characters, stats, loading, fetchList, fetchStats, addCharacter, removeCharacter, fetchByStatus, setTags, toggleBacking }
})
