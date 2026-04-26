import { ipcMain, BrowserWindow } from 'electron'
import {
  searchCharacters,
  getCharacterDetail,
  getCharacterByChar,
  getCharactersByRadical,
  getCharactersByComponent,
  getSimilarCharacters,
  searchByPinyin
} from './services/character.service'
import { listRadicals, getRadicalById } from './services/radical.service'
import {
  getWordsForCharacter,
  getSentencesForCharacter,
  searchWords
} from './services/dictionary.service'
import {
  addToCollection,
  removeFromCollection,
  isCollected,
  listCollection,
  getCollectionStats,
  updateNotes,
  getDueCards,
  submitReview,
  markAsKnown,
  listCollectionByStatus,
  getAllLearnedCards,
  getRandomCharacters,
  addUserSentence,
  getUserSentences,
  deleteUserSentence,
  exportCollection,
  importCollection
} from './services/user-collection.service'

export function registerIpcHandlers(): void {
  // Character
  ipcMain.handle('character:search', (_, query: string, limit?: number, gb2312Only?: boolean) =>
    searchCharacters(query, limit, gb2312Only !== false)
  )
  ipcMain.handle('character:getDetail', (_, id: number) => getCharacterDetail(id))
  ipcMain.handle('character:getByChar', (_, char: string) => getCharacterByChar(char))
  ipcMain.handle('character:getByRadical', (_, radicalId: number, limit?: number, offset?: number, gb2312Only?: boolean) =>
    getCharactersByRadical(radicalId, limit, offset, gb2312Only !== false)
  )
  ipcMain.handle('character:getByComponent', (_, component: string, limit?: number, offset?: number, gb2312Only?: boolean) =>
    getCharactersByComponent(component, limit, offset, gb2312Only !== false)
  )
  ipcMain.handle('character:getSimilar', (_, id: number, limit?: number) =>
    getSimilarCharacters(id, limit)
  )
  ipcMain.handle('character:searchByPinyin', (_, pinyin: string, tone?: number, gb2312Only?: boolean) =>
    searchByPinyin(pinyin, tone, gb2312Only !== false)
  )

  // Radical
  ipcMain.handle('radical:list', () => listRadicals())
  ipcMain.handle('radical:getById', (_, id: number) => getRadicalById(id))

  // Dictionary
  ipcMain.handle('dictionary:getWords', (_, characterId: number) =>
    getWordsForCharacter(characterId)
  )
  ipcMain.handle('dictionary:getSentences', (_, characterId: number) =>
    getSentencesForCharacter(characterId)
  )
  ipcMain.handle('dictionary:searchWords', (_, query: string) => searchWords(query))

  // Collection
  ipcMain.handle('collection:add', (_, characterId: number) => addToCollection(characterId))
  ipcMain.handle('collection:remove', (_, characterId: number) =>
    removeFromCollection(characterId)
  )
  ipcMain.handle('collection:isCollected', (_, characterId: number) => isCollected(characterId))
  ipcMain.handle(
    'collection:list',
    (_, sortBy?: string, sortDir?: string, radicalId?: number, familiarity?: number, limit?: number, offset?: number) =>
      listCollection(sortBy, sortDir, radicalId, familiarity, limit, offset)
  )
  ipcMain.handle('collection:getStats', () => getCollectionStats())
  ipcMain.handle('collection:updateNotes', (_, characterId: number, notes: string) =>
    updateNotes(characterId, notes)
  )

  // Learning
  ipcMain.handle('learning:getDueCards', (_, limit?: number) => getDueCards(limit))
  ipcMain.handle('learning:submitReview', (_, userCharId: number, rating: number) =>
    submitReview(userCharId, rating)
  )
  ipcMain.handle('learning:markAsKnown', (_, userCharId: number) => markAsKnown(userCharId))
  ipcMain.handle('learning:getAllLearned', (_, limit?: number) => getAllLearnedCards(limit))
  ipcMain.handle('learning:getRandomCharacters', (_, level: string, limit?: number, source?: string, gb2312Only?: boolean) =>
    getRandomCharacters(level as any, limit, source, gb2312Only !== false)
  )

  // Sentences
  ipcMain.handle('sentences:add', (_, characterId: number, sentence: string, pinyin?: string) =>
    addUserSentence(characterId, sentence, pinyin)
  )
  ipcMain.handle('sentences:list', (_, characterId: number) => getUserSentences(characterId))
  ipcMain.handle('sentences:delete', (_, sentenceId: number) => deleteUserSentence(sentenceId))

  // Collection by status
  ipcMain.handle(
    'collection:listByStatus',
    (_, status: string, sortBy?: string, sortDir?: string, limit?: number, offset?: number) =>
      listCollectionByStatus(status as any, sortBy, sortDir, limit, offset)
  )

  // Collection import/export
  ipcMain.handle('collection:export', () => exportCollection())
  ipcMain.handle('collection:import', (_, data: any, mode: 'merge' | 'replace') =>
    importCollection(data, mode)
  )

  // Window controls
  ipcMain.handle('window:minimize', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize()
  })
  ipcMain.handle('window:maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win?.isMaximized()) {
      win.unmaximize()
    } else {
      win?.maximize()
    }
  })
  ipcMain.handle('window:close', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close()
  })
}
