import { getDb } from '../database'

export interface Word {
  id: number
  word: string
  pinyin: string
  definition: string
  frequency: number | null
}

export interface Sentence {
  id: number
  sentence: string
  pinyin: string | null
  translation: string | null
}

export function getWordsForCharacter(characterId: number): Word[] {
  const db = getDb()
  return db
    .prepare(
      `SELECT w.*
       FROM words w
       JOIN character_words cw ON cw.word_id = w.id
       WHERE cw.character_id = ?
       ORDER BY w.frequency ASC NULLS LAST
       LIMIT 20`
    )
    .all(characterId) as Word[]
}

export function getSentencesForCharacter(characterId: number): Sentence[] {
  const db = getDb()
  return db
    .prepare(
      `SELECT s.*
       FROM sentences s
       JOIN character_sentences cs ON cs.sentence_id = s.id
       WHERE cs.character_id = ?
       LIMIT 10`
    )
    .all(characterId) as Sentence[]
}

export function searchWords(query: string, limit = 30): Word[] {
  const db = getDb()
  return db
    .prepare(
      `SELECT * FROM words
       WHERE word LIKE ? OR pinyin LIKE ? OR definition LIKE ?
       ORDER BY frequency ASC NULLS LAST
       LIMIT ?`
    )
    .all(`%${query}%`, `%${query}%`, `%${query}%`, limit) as Word[]
}
