import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const STORAGE_KEY = 'hanzi-learn-settings'

interface Settings {
  showAllCharacters: boolean  // false = only GB2312 (simplified), true = all chars
}

const defaultSettings: Settings = {
  showAllCharacters: false  // default: only GB2312
}

function loadSettings(): Settings {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return { ...defaultSettings, ...JSON.parse(saved) }
  } catch (e) {}
  return { ...defaultSettings }
}

function saveSettings(settings: Settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch (e) {}
}

export const useSettingsStore = defineStore('settings', () => {
  const showAllCharacters = ref(loadSettings().showAllCharacters)

  function toggleAllCharacters(value: boolean) {
    showAllCharacters.value = value
    saveSettings({ showAllCharacters: value })
  }

  return {
    showAllCharacters,
    toggleAllCharacters,
    getFilterClause: computed(() => showAllCharacters.value ? '' : ' AND is_gb2312 = 1')
  }
})
