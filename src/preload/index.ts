import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  character: {
    search: (query: string, limit?: number, gb2312Only?: boolean) =>
      ipcRenderer.invoke('character:search', query, limit, gb2312Only),
    getDetail: (id: number) => ipcRenderer.invoke('character:getDetail', id),
    getByChar: (char: string) => ipcRenderer.invoke('character:getByChar', char),
    getByRadical: (radicalId: number, limit?: number, offset?: number, gb2312Only?: boolean) =>
      ipcRenderer.invoke('character:getByRadical', radicalId, limit, offset, gb2312Only),
    getByComponent: (component: string, limit?: number, offset?: number, gb2312Only?: boolean) =>
      ipcRenderer.invoke('character:getByComponent', component, limit, offset, gb2312Only),
    getSimilar: (id: number, limit?: number) => ipcRenderer.invoke('character:getSimilar', id, limit),
    searchByPinyin: (pinyin: string, tone?: number, gb2312Only?: boolean) =>
      ipcRenderer.invoke('character:searchByPinyin', pinyin, tone, gb2312Only)
  },
  radical: {
    list: () => ipcRenderer.invoke('radical:list'),
    getById: (id: number) => ipcRenderer.invoke('radical:getById', id)
  },
  dictionary: {
    getWords: (characterId: number) => ipcRenderer.invoke('dictionary:getWords', characterId),
    getSentences: (characterId: number) =>
      ipcRenderer.invoke('dictionary:getSentences', characterId),
    searchWords: (query: string) => ipcRenderer.invoke('dictionary:searchWords', query)
  },
  collection: {
    add: (characterId: number) => ipcRenderer.invoke('collection:add', characterId),
    remove: (characterId: number) => ipcRenderer.invoke('collection:remove', characterId),
    isCollected: (characterId: number) => ipcRenderer.invoke('collection:isCollected', characterId),
    list: (sortBy?: string, sortDir?: string, radicalId?: number, familiarity?: number, limit?: number, offset?: number) =>
      ipcRenderer.invoke('collection:list', sortBy, sortDir, radicalId, familiarity, limit, offset),
    getStats: () => ipcRenderer.invoke('collection:getStats'),
    updateNotes: (characterId: number, notes: string) =>
      ipcRenderer.invoke('collection:updateNotes', characterId, notes),
    listByStatus: (status: string, sortBy?: string, sortDir?: string, limit?: number, offset?: number) =>
      ipcRenderer.invoke('collection:listByStatus', status, sortBy, sortDir, limit, offset),
    export: () => ipcRenderer.invoke('collection:export'),
    import: (data: any, mode: 'merge' | 'replace') =>
      ipcRenderer.invoke('collection:import', data, mode),
    importXlsx: (filePath: string) => ipcRenderer.invoke('collection:importXlsx', filePath),
    exportXlsx: () => ipcRenderer.invoke('collection:exportXlsx'),
    setTags: (characterId: number, tags: string[]) =>
      ipcRenderer.invoke('collection:setTags', characterId, tags),
    toggleBacking: (characterId: number) =>
      ipcRenderer.invoke('collection:toggleBacking', characterId),
    listByTag: (tag: string, sortBy?: string, sortDir?: string, limit?: number, offset?: number) =>
      ipcRenderer.invoke('collection:listByTag', tag, sortBy, sortDir, limit, offset)
  },
  learning: {
    getDueCards: (limit?: number) => ipcRenderer.invoke('learning:getDueCards', limit),
    getBackingCards: (limit?: number) => ipcRenderer.invoke('learning:getBackingCards', limit),
    submitReview: (userCharId: number, rating: number) =>
      ipcRenderer.invoke('learning:submitReview', userCharId, rating),
    markAsKnown: (userCharId: number) =>
      ipcRenderer.invoke('learning:markAsKnown', userCharId),
    getAllLearned: (limit?: number) =>
      ipcRenderer.invoke('learning:getAllLearned', limit),
    getRandomCharacters: (level: string, limit?: number, source?: string, gb2312Only?: boolean) =>
      ipcRenderer.invoke('learning:getRandomCharacters', level, limit, source, gb2312Only)
  },
  sentences: {
    add: (characterId: number, sentence: string, pinyin?: string) =>
      ipcRenderer.invoke('sentences:add', characterId, sentence, pinyin),
    list: (characterId: number) =>
      ipcRenderer.invoke('sentences:list', characterId),
    delete: (sentenceId: number) =>
      ipcRenderer.invoke('sentences:delete', sentenceId)
  },
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close')
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.electron = electronAPI
  // @ts-ignore
  window.api = api
}
