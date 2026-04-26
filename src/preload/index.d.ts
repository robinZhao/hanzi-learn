import { ElectronAPI } from '@electron-toolkit/preload'

interface CharacterAPI {
  search(query: string, limit?: number): Promise<any[]>
  getDetail(id: number): Promise<any>
  getByChar(char: string): Promise<any>
  getByRadical(radicalId: number, limit?: number, offset?: number): Promise<any[]>
  getByComponent(component: string, limit?: number, offset?: number): Promise<any[]>
  getSimilar(id: number, limit?: number): Promise<any[]>
  searchByPinyin(pinyin: string, tone?: number): Promise<any[]>
}

interface RadicalAPI {
  list(): Promise<any[]>
  getById(id: number): Promise<any>
}

interface DictionaryAPI {
  getWords(characterId: number): Promise<any[]>
  getSentences(characterId: number): Promise<any[]>
  searchWords(query: string): Promise<any[]>
}

interface CollectionAPI {
  add(characterId: number): Promise<void>
  remove(characterId: number): Promise<void>
  isCollected(characterId: number): Promise<boolean>
  list(sortBy?: string, sortDir?: string, radicalId?: number, familiarity?: number, limit?: number, offset?: number): Promise<any[]>
  getStats(): Promise<any>
  updateNotes(characterId: number, notes: string): Promise<void>
  listByStatus(status: string, sortBy?: string, sortDir?: string, limit?: number, offset?: number): Promise<any[]>
}

interface LearningAPI {
  getDueCards(limit?: number): Promise<any[]>
  submitReview(userCharId: number, rating: number): Promise<any>
  markAsKnown(userCharId: number): Promise<any>
  getAllLearned(limit?: number): Promise<any[]>
  getRandomCharacters(level: string, limit?: number, source?: string): Promise<any[]>
}

interface SentenceAPI {
  add(characterId: number, sentence: string, pinyin?: string): Promise<number>
  list(characterId: number): Promise<any[]>
  delete(sentenceId: number): Promise<void>
}

interface WindowAPI {
  minimize(): Promise<void>
  maximize(): Promise<void>
  close(): Promise<void>
}

interface API {
  character: CharacterAPI
  radical: RadicalAPI
  dictionary: DictionaryAPI
  collection: CollectionAPI
  learning: LearningAPI
  window: WindowAPI
  sentences: SentenceAPI
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
  }
}
