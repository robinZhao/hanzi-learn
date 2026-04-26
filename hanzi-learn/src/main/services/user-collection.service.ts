import { getDb } from '../database'

export interface CollectedCharacter {
  id: number
  character_id: number
  character: string
  pinyin: string
  stroke_count: number
  radical_id: number | null
  structure: string | null
  frequency: number | null
  definition: string | null
  familiarity: number
  next_review: string
  review_count: number
  notes: string | null
  added_at: string
}

export interface CollectionStats {
  total: number
  new_count: number
  learning: number
  mastered: number
  due_today: number
}

export function addToCollection(characterId: number): void {
  const db = getDb()
  db.prepare(
    `INSERT OR IGNORE INTO user_characters (character_id, familiarity, next_review)
     VALUES (?, 0, datetime('now'))`
  ).run(characterId)
}

export function removeFromCollection(characterId: number): void {
  const db = getDb()
  db.prepare('DELETE FROM user_characters WHERE character_id = ?').run(characterId)
}

export function isCollected(characterId: number): boolean {
  const db = getDb()
  const row = db
    .prepare('SELECT 1 FROM user_characters WHERE character_id = ?')
    .get(characterId)
  return !!row
}

export function listCollection(
  sortBy = 'added_at',
  sortDir = 'DESC',
  radicalId?: number,
  familiarity?: number,
  limit = 100,
  offset = 0
): CollectedCharacter[] {
  const db = getDb()
  const conditions: string[] = []
  const params: any[] = []

  if (radicalId !== undefined) {
    conditions.push('c.radical_id = ?')
    params.push(radicalId)
  }
  if (familiarity !== undefined) {
    conditions.push('uc.familiarity = ?')
    params.push(familiarity)
  }

  const where = conditions.length > 0 ? 'AND ' + conditions.join(' AND ') : ''
  const allowedSort = ['added_at', 'pinyin', 'stroke_count', 'frequency', 'familiarity']
  const col = allowedSort.includes(sortBy) ? sortBy : 'added_at'
  const dir = sortDir === 'ASC' ? 'ASC' : 'DESC'
  const orderField = ['pinyin', 'stroke_count', 'frequency'].includes(col) ? `c.${col}` : `uc.${col}`

  params.push(limit, offset)

  return db
    .prepare(
      `SELECT uc.id, uc.character_id, c.character, c.pinyin, c.stroke_count,
              c.radical_id, c.structure, c.frequency, c.definition, c.cn_definition,
              uc.familiarity, uc.next_review, uc.review_count, uc.notes, uc.added_at
       FROM user_characters uc
       JOIN characters c ON uc.character_id = c.id
       WHERE 1=1 ${where}
       ORDER BY ${orderField} ${dir} NULLS LAST
       LIMIT ? OFFSET ?`
    )
    .all(...params) as CollectedCharacter[]
}

export function getCollectionStats(): CollectionStats {
  const db = getDb()
  const total = (db.prepare('SELECT COUNT(*) as c FROM user_characters').get() as any).c
  const new_count = (
    db.prepare('SELECT COUNT(*) as c FROM user_characters WHERE familiarity = 0').get() as any
  ).c
  const learning = (
    db
      .prepare('SELECT COUNT(*) as c FROM user_characters WHERE familiarity BETWEEN 1 AND 3')
      .get() as any
  ).c
  const mastered = (
    db.prepare('SELECT COUNT(*) as c FROM user_characters WHERE familiarity >= 4').get() as any
  ).c
  const due_today = (
    db
      .prepare(
        "SELECT COUNT(*) as c FROM user_characters WHERE next_review <= datetime('now')"
      )
      .get() as any
  ).c

  return { total, new_count, learning, mastered, due_today }
}

export function updateNotes(characterId: number, notes: string): void {
  const db = getDb()
  db.prepare('UPDATE user_characters SET notes = ? WHERE character_id = ?').run(notes, characterId)
}

export function getDueCards(limit = 30): CollectedCharacter[] {
  const db = getDb()
  return db
    .prepare(
      `SELECT uc.id, uc.character_id, c.character, c.pinyin, c.stroke_count,
              c.radical_id, c.structure, c.frequency, c.definition, c.cn_definition,
              uc.familiarity, uc.next_review, uc.review_count, uc.notes, uc.added_at
       FROM user_characters uc
       JOIN characters c ON uc.character_id = c.id
       WHERE uc.next_review <= datetime('now') OR uc.familiarity = 0
       ORDER BY uc.familiarity ASC, uc.next_review ASC
       LIMIT ?`
    )
    .all(limit) as CollectedCharacter[]
}

export function submitReview(
  userCharId: number,
  rating: number
): { familiarity: number; next_review: string } {
  const db = getDb()
  const uc = db.prepare('SELECT * FROM user_characters WHERE id = ?').get(userCharId) as any
  if (!uc) throw new Error('Card not found')

  let familiarity = uc.familiarity
  let intervalMinutes: number

  switch (rating) {
    case 1: // Again
      familiarity = 0
      intervalMinutes = 1
      break
    case 2: // Hard
      familiarity = Math.max(0, familiarity - 1)
      intervalMinutes = 10
      break
    case 3: // Good
      familiarity = Math.min(5, familiarity + 1)
      intervalMinutes = Math.pow(2.5, familiarity) * 60
      break
    case 4: // Easy
      familiarity = Math.min(5, familiarity + 2)
      intervalMinutes = Math.pow(4, familiarity) * 60
      break
    default:
      familiarity = uc.familiarity
      intervalMinutes = 60
  }

  const nextReview = new Date(Date.now() + intervalMinutes * 60000).toISOString()

  db.prepare(
    `UPDATE user_characters SET familiarity = ?, next_review = ?, review_count = review_count + 1
     WHERE id = ?`
  ).run(familiarity, nextReview, userCharId)

  db.prepare(
    'INSERT INTO review_history (user_char_id, rating) VALUES (?, ?)'
  ).run(userCharId, rating)

  return { familiarity, next_review: nextReview }
}

export function markAsKnown(userCharId: number): { familiarity: number; next_review: string } {
  const db = getDb()
  const now = new Date(Date.now() + 365 * 24 * 60 * 60000).toISOString()
  db.prepare(
    'UPDATE user_characters SET familiarity = 5, is_known = 1, next_review = ?, review_count = review_count + 1 WHERE id = ?'
  ).run(now, userCharId)
  db.prepare('INSERT INTO review_history (user_char_id, rating) VALUES (?, 4)').run(userCharId)
  return { familiarity: 5, next_review: now }
}

export function listCollectionByStatus(
  status: 'learned' | 'known' | 'unknown',
  sortBy = 'added_at',
  sortDir = 'DESC',
  limit = 100,
  offset = 0
): CollectedCharacter[] {
  const db = getDb()
  let where = ''
  switch (status) {
    case 'learned':
      where = 'AND uc.review_count > 0'
      break
    case 'known':
      where = 'AND (uc.is_known = 1 OR uc.familiarity >= 4)'
      break
    case 'unknown':
      where = 'AND uc.familiarity <= 1 AND uc.review_count = 0'
      break
  }

  const allowedSort = ['added_at', 'pinyin', 'stroke_count', 'frequency', 'familiarity']
  const col = allowedSort.includes(sortBy) ? sortBy : 'added_at'
  const dir = sortDir === 'ASC' ? 'ASC' : 'DESC'
  const orderField = ['pinyin', 'stroke_count', 'frequency'].includes(col) ? `c.${col}` : `uc.${col}`

  return db
    .prepare(
      `SELECT uc.id, uc.character_id, c.character, c.pinyin, c.stroke_count,
              c.radical_id, c.structure, c.frequency, c.definition, c.cn_definition,
              uc.familiarity, uc.next_review, uc.review_count, uc.notes, uc.added_at
       FROM user_characters uc
       JOIN characters c ON uc.character_id = c.id
       WHERE 1=1 ${where}
       ORDER BY ${orderField} ${dir} NULLS LAST
       LIMIT ? OFFSET ?`
    )
    .all(limit, offset) as CollectedCharacter[]
}

export function getAllLearnedCards(limit = 50): CollectedCharacter[] {
  const db = getDb()
  return db
    .prepare(
      `SELECT uc.id, uc.character_id, c.character, c.pinyin, c.stroke_count,
              c.radical_id, c.structure, c.frequency, c.definition, c.cn_definition,
              uc.familiarity, uc.next_review, uc.review_count, uc.notes, uc.added_at
       FROM user_characters uc
       JOIN characters c ON uc.character_id = c.id
       WHERE uc.review_count > 0 OR uc.familiarity > 0
       ORDER BY uc.familiarity ASC, uc.next_review ASC
       LIMIT ?`
    )
    .all(limit) as CollectedCharacter[]
}

export function getRandomCharacters(
  level: 'beginner' | 'intermediate' | 'advanced',
  limit = 20,
  source = 'all',
  gb2312Only = true
): CharacterSummary[] {
  const db = getDb()
  const gbFilter = gb2312Only ? ' AND c.is_gb2312 = 1' : ''
  let freqFilter: string

  // When source is 'collected', ignore difficulty filter and use all collected chars
  if (source === 'collected') {
    freqFilter = '1=1'
  } else {
    switch (level) {
      case 'beginner':
        freqFilter = 'c.frequency IS NOT NULL AND c.frequency <= 100'
        break
      case 'intermediate':
        freqFilter = 'c.frequency BETWEEN 101 AND 1000'
        break
      case 'advanced':
        freqFilter = '(c.frequency > 1000 OR c.frequency IS NULL)'
        break
      default:
        freqFilter = '1=1'
    }
  }

  // If source is 'collected', only pick from user's collected characters
  const joinClause = source === 'collected'
    ? 'INNER JOIN user_characters uc ON uc.character_id = c.id'
    : ''

  // Use subquery to avoid slow ORDER BY RANDOM() on large table
  const candidates = db
    .prepare(
      `SELECT c.id, c.character, c.pinyin, c.stroke_count, c.radical_id,
              c.structure, c.frequency, c.definition, c.cn_definition
       FROM characters c
       ${joinClause}
       WHERE ${freqFilter}${gbFilter}
       ORDER BY c.frequency ASC NULLS LAST
       LIMIT 2000`
    )
    .all() as any[]

  // Shuffle in JS
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[candidates[i], candidates[j]] = [candidates[j], candidates[i]]
  }

  return candidates.slice(0, limit)
}

export interface UserSentence {
  id: number
  character_id: number
  sentence: string
  pinyin: string | null
  created_at: string
}

export function addUserSentence(
  characterId: number,
  sentence: string,
  pinyin?: string
): number {
  const db = getDb()
  const result = db.prepare(
    'INSERT INTO user_sentences (character_id, sentence, pinyin) VALUES (?, ?, ?)'
  ).run(characterId, sentence, pinyin || null)
  return result.lastInsertRowid as number
}

export function getUserSentences(characterId: number): any[] {
  const db = getDb()
  const systemSentences = db
    .prepare(
      `SELECT s.id, s.sentence, s.pinyin, s.translation, 0 as is_user
       FROM sentences s
       JOIN character_sentences cs ON cs.sentence_id = s.id
       WHERE cs.character_id = ?
       LIMIT 10`
    )
    .all(characterId) as any[]

  const userSentences = db
    .prepare(
      `SELECT id, sentence, pinyin, null as translation, 1 as is_user
       FROM user_sentences
       WHERE character_id = ?
       ORDER BY created_at DESC`
    )
    .all(characterId) as any[]

  return [...systemSentences, ...userSentences]
}

export function deleteUserSentence(sentenceId: number): void {
  const db = getDb()
  db.prepare('DELETE FROM user_sentences WHERE id = ?').run(sentenceId)
}

export interface ExportData {
  version: string
  export_date: string
  characters: Array<{
    character: string
    pinyin: string
    stroke_count: number
    radical_id: number | null
    structure: string | null
    frequency: number | null
    definition: string | null
    familiarity: number
    is_known: number
    next_review: string
    review_count: number
    notes: string | null
  }>
}

export function exportCollection(): ExportData {
  const db = getDb()
  const rows = db
    .prepare(
      `SELECT c.character, c.pinyin, c.stroke_count, c.radical_id, c.structure,
              c.frequency, c.definition,
              uc.familiarity, uc.is_known, uc.next_review, uc.review_count, uc.notes
       FROM user_characters uc
       JOIN characters c ON uc.character_id = c.id
       ORDER BY uc.added_at ASC`
    )
    .all() as any[]

  return {
    version: '1.0',
    export_date: new Date().toISOString(),
    characters: rows.map((r: any) => ({
      character: r.character,
      pinyin: r.pinyin,
      stroke_count: r.stroke_count,
      radical_id: r.radical_id,
      structure: r.structure,
      frequency: r.frequency,
      definition: r.definition,
      familiarity: r.familiarity,
      is_known: r.is_known ?? 0,
      next_review: r.next_review,
      review_count: r.review_count,
      notes: r.notes,
    })),
  }
}

export interface ImportResult {
  added: number
  updated: number
  skipped: number
  errors: string[]
}

export function importCollection(
  data: ExportData,
  mode: 'merge' | 'replace' = 'merge'
): ImportResult {
  const db = getDb()
  const result: ImportResult = { added: 0, updated: 0, skipped: 0, errors: [] }

  if (!data || !data.characters || data.characters.length === 0) {
    result.errors.push('导入数据为空')
    return result
  }

  if (mode === 'replace') {
    db.prepare('DELETE FROM review_history WHERE user_char_id IN (SELECT id FROM user_characters)').run()
    db.prepare('DELETE FROM user_characters').run()
  }

  const insertChar = db.prepare(
    `INSERT INTO user_characters (character_id, familiarity, is_known, next_review, review_count, notes)
     VALUES (?, ?, ?, ?, ?, ?)`
  )
  const updateChar = db.prepare(
    `UPDATE user_characters SET familiarity = ?, is_known = ?, next_review = ?, review_count = ?, notes = ?
     WHERE character_id = ?`
  )
  const findCharId = db.prepare('SELECT id FROM characters WHERE character = ?')

  const txn = db.transaction((items: typeof data.characters) => {
    for (const item of items) {
      try {
        const charRow = findCharId.get(item.character) as any
        if (!charRow) {
          result.skipped++
          result.errors.push(`未找到汉字: ${item.character}`)
          continue
        }
        const characterId = charRow.id as number

        const existing = db
          .prepare('SELECT id FROM user_characters WHERE character_id = ?')
          .get(characterId) as any

        if (existing) {
          updateChar.run(
            item.familiarity,
            item.is_known ?? 0,
            item.next_review,
            item.review_count,
            item.notes,
            characterId
          )
          result.updated++
        } else {
          insertChar.run(
            characterId,
            item.familiarity,
            item.is_known ?? 0,
            item.next_review,
            item.review_count,
            item.notes
          )
          result.added++
        }
      } catch (e: any) {
        result.errors.push(`导入汉字 ${item.character} 失败: ${e.message}`)
      }
    }
  })

  txn(data.characters)
  return result
}
