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
  is_known?: number
  tags?: string | null
  is_backing?: number
}

export interface CollectionStats {
  total: number
  learning: number
  mastered: number
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
              uc.familiarity, uc.next_review, uc.review_count, uc.notes, uc.added_at,
              uc.tags, uc.is_backing
       FROM user_characters uc
       JOIN characters c ON uc.character_id = c.id
       WHERE 1=1 ${where}
       ORDER BY ${orderField} ${dir} NULLS LAST
       LIMIT ? OFFSET ?`
    )
    .all(...params) as CollectedCharacter[]
}

// 简化：学习中 = 全部收藏，已掌握 = 已标记认识
export function getCollectionStats(): CollectionStats {
  const db = getDb()
  const total = (db.prepare('SELECT COUNT(*) as c FROM user_characters').get() as any).c
  const mastered = (
    db.prepare('SELECT COUNT(*) as c FROM user_characters WHERE is_known = 1 OR familiarity >= 4').get() as any
  ).c
  const backing = (db.prepare('SELECT COUNT(*) as c FROM user_characters WHERE is_backing = 1').get() as any).c
  return { total, learning: total - mastered - backing, mastered }
}

export function updateNotes(characterId: number, notes: string): void {
  const db = getDb()
  db.prepare('UPDATE user_characters SET notes = ? WHERE character_id = ?').run(notes, characterId)
}

// 简化：返回所有待学习卡片，排除备用字
export function getDueCards(limit = 30): CollectedCharacter[] {
  const db = getDb()
  return db
    .prepare(
      `SELECT uc.id, uc.character_id, c.character, c.pinyin, c.stroke_count,
              c.radical_id, c.structure, c.frequency, c.definition, c.cn_definition,
              uc.familiarity, uc.next_review, uc.review_count, uc.notes, uc.added_at,
              uc.tags, uc.is_backing
       FROM user_characters uc
       JOIN characters c ON uc.character_id = c.id
       WHERE (uc.is_known IS NULL OR uc.is_known != 1) AND uc.is_backing = 0
       ORDER BY uc.added_at ASC
       LIMIT ?`
    )
    .all(limit) as CollectedCharacter[]
}

// 简化：认识/不认识都只增加 review_count，不计算间隔
export function submitReview(
  userCharId: number,
  rating: number
): { familiarity: number; next_review: string } {
  const db = getDb()
  const uc = db.prepare('SELECT * FROM user_characters WHERE id = ?').get(userCharId) as any
  if (!uc) throw new Error('Card not found')

  // 标记认识
  const isKnown = rating >= 4 ? 1 : (uc.is_known || 0)
  const familiarity = isKnown ? 5 : Math.min(uc.familiarity + (rating >= 3 ? 1 : 0), 4)

  db.prepare(
    `UPDATE user_characters SET familiarity = ?, is_known = ?, review_count = review_count + 1
     WHERE id = ?`
  ).run(familiarity, isKnown, userCharId)

  db.prepare(
    'INSERT INTO review_history (user_char_id, rating) VALUES (?, ?)'
  ).run(userCharId, rating)

  return { familiarity, next_review: uc.next_review }
}

export function markAsKnown(userCharId: number): { familiarity: number; next_review: string } {
  const db = getDb()
  db.prepare(
    'UPDATE user_characters SET familiarity = 5, is_known = 1, review_count = review_count + 1 WHERE id = ?'
  ).run(userCharId)
  db.prepare('INSERT INTO review_history (user_char_id, rating) VALUES (?, 4)').run(userCharId)
  return { familiarity: 5, next_review: '' }
}

// 简化：学习中 = review_count = 0（没学过），已掌握 = is_known = 1
export function listCollectionByStatus(
  status: 'learned' | 'known' | 'unknown' | 'standby',
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
      where = 'AND uc.is_known = 1 OR uc.familiarity >= 4'
      break
    case 'unknown':
      where = 'AND (uc.is_known IS NULL OR uc.is_known != 1) AND uc.is_backing = 0'
      break
    case 'standby':
      where = 'AND uc.is_backing = 1'
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
              uc.familiarity, uc.next_review, uc.review_count, uc.notes, uc.added_at,
              uc.tags, uc.is_backing
       FROM user_characters uc
       JOIN characters c ON uc.character_id = c.id
       WHERE 1=1 ${where}
       ORDER BY ${orderField} ${dir} NULLS LAST
       LIMIT ? OFFSET ?`
    )
    .all(limit, offset) as CollectedCharacter[]
}

export function setTags(characterId: number, tags: string[]): void {
  const db = getDb()
  const tagsJson = tags.length > 0 ? JSON.stringify(tags) : null
  db.prepare('UPDATE user_characters SET tags = ? WHERE character_id = ?').run(tagsJson, characterId)
}

export function toggleBacking(characterId: number): void {
  const db = getDb()
  db.prepare(
    'UPDATE user_characters SET is_backing = 1 - COALESCE(is_backing, 0) WHERE character_id = ?'
  ).run(characterId)
}

export function listByTag(tag: string, sortBy = 'added_at', sortDir = 'DESC', limit = 100, offset = 0): CollectedCharacter[] {
  const db = getDb()
  const allowedSort = ['added_at', 'pinyin', 'stroke_count', 'frequency', 'familiarity']
  const col = allowedSort.includes(sortBy) ? sortBy : 'added_at'
  const dir = sortDir === 'ASC' ? 'ASC' : 'DESC'
  const orderField = ['pinyin', 'stroke_count', 'frequency'].includes(col) ? `c.${col}` : `uc.${col}`

  return db
    .prepare(
      `SELECT uc.id, uc.character_id, c.character, c.pinyin, c.stroke_count,
              c.radical_id, c.structure, c.frequency, c.definition, c.cn_definition,
              uc.familiarity, uc.next_review, uc.review_count, uc.notes, uc.added_at,
              uc.tags, uc.is_backing
       FROM user_characters uc
       JOIN characters c ON uc.character_id = c.id
       WHERE uc.tags LIKE ?
       ORDER BY ${orderField} ${dir} NULLS LAST
       LIMIT ? OFFSET ?`
    )
    .all(`%"${tag}"%`, limit, offset) as CollectedCharacter[]
}

export function getBackingCards(limit = 30): CollectedCharacter[] {
  const db = getDb()
  return db
    .prepare(
      `SELECT uc.id, uc.character_id, c.character, c.pinyin, c.stroke_count,
              c.radical_id, c.structure, c.frequency, c.definition, c.cn_definition,
              uc.familiarity, uc.next_review, uc.review_count, uc.notes, uc.added_at,
              uc.tags, uc.is_backing
       FROM user_characters uc
       JOIN characters c ON uc.character_id = c.id
       WHERE uc.is_backing = 1
       ORDER BY uc.added_at ASC
       LIMIT ?`
    )
    .all(limit) as CollectedCharacter[]
}

export function getAllLearnedCards(limit = 50): CollectedCharacter[] {
  const db = getDb()
  return db
    .prepare(
      `SELECT uc.id, uc.character_id, c.character, c.pinyin, c.stroke_count,
              c.radical_id, c.structure, c.frequency, c.definition, c.cn_definition,
              uc.familiarity, uc.next_review, uc.review_count, uc.notes, uc.added_at,
              uc.tags, uc.is_backing
       FROM user_characters uc
       JOIN characters c ON uc.character_id = c.id
       WHERE uc.review_count > 0
       ORDER BY uc.added_at DESC
       LIMIT ?`
    )
    .all(limit) as CollectedCharacter[]
}

export function getRandomCharacters(
  level: 'beginner' | 'intermediate' | 'advanced',
  limit = 20,
  source = 'all',
  gb2312Only = true
): any[] {
  const db = getDb()
  const gbFilter = gb2312Only ? ' AND c.is_gb2312 = 1' : ''
  let freqFilter: string

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

  const joinClause = source === 'collected'
    ? 'INNER JOIN user_characters uc ON uc.character_id = c.id'
    : ''

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
    tags: string[] | null
    is_backing: number
  }>
}

export function exportCollection(): ExportData {
  const db = getDb()
  const rows = db
    .prepare(
      `SELECT c.character, c.pinyin, c.stroke_count, c.radical_id, c.structure,
              c.frequency, c.definition,
              uc.familiarity, uc.is_known, uc.next_review, uc.review_count, uc.notes,
              uc.tags, uc.is_backing
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
      tags: r.tags ? JSON.parse(r.tags) : null,
      is_backing: r.is_backing ?? 0,
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
    `INSERT INTO user_characters (character_id, familiarity, is_known, next_review, review_count, notes, tags, is_backing)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  )
  const updateChar = db.prepare(
    `UPDATE user_characters SET familiarity = ?, is_known = ?, next_review = ?, review_count = ?, notes = ?, tags = ?, is_backing = ?
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
            item.tags ? JSON.stringify(item.tags) : null,
            item.is_backing ?? 0,
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
            item.notes,
            item.tags ? JSON.stringify(item.tags) : null,
            item.is_backing ?? 0
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
