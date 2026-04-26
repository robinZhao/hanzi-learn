import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useSettingsStore } from './settings'

export const useRadicalStore = defineStore('radical', () => {
  const radicals = ref<any[]>([])
  const selectedRadical = ref<any>(null)
  const radicalCharacters = ref<any[]>([])
  const loading = ref(false)

  async function fetchRadicals() {
    if (radicals.value.length > 0) return
    radicals.value = await window.api.radical.list()
  }

  async function selectRadical(radicalId: number) {
    loading.value = true
    try {
      selectedRadical.value = await window.api.radical.getById(radicalId)
      const settings = useSettingsStore()
      radicalCharacters.value = await window.api.character.getByRadical(
        radicalId, 200, 0, !settings.showAllCharacters
      )
    } finally {
      loading.value = false
    }
  }

  return { radicals, selectedRadical, radicalCharacters, loading, fetchRadicals, selectRadical }
})
