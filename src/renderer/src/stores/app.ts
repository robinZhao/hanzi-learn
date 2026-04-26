import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore('app', () => {
  const loading = ref(false)

  function setLoading(val: boolean) {
    loading.value = val
  }

  return { loading, setLoading }
})
