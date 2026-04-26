import { getDb } from '../database'

export interface Radical {
  id: number
  radical: string
  name: string | null
  pinyin: string | null
  stroke_count: number | null
  meaning: string | null
  variants: string | null
  char_count?: number
}

export function listRadicals(): Radical[] {
  const db = getDb()
  return db
    .prepare(
      `SELECT r.*, COUNT(c.id) as char_count
       FROM radicals r
       LEFT JOIN characters c ON c.radical_id = r.id
       GROUP BY r.id
       ORDER BY r.stroke_count ASC, r.id ASC`
    )
    .all() as Radical[]
}

export function getRadicalById(id: number): Radical | undefined {
  const db = getDb()
  return db
    .prepare(
      `SELECT r.*, COUNT(c.id) as char_count
       FROM radicals r
       LEFT JOIN characters c ON c.radical_id = r.id
       WHERE r.id = ?
       GROUP BY r.id`
    )
    .get(id) as Radical | undefined
}

export function getRadicalCharacterCount(id: number): number {
  const db = getDb()
  const row = db
    .prepare('SELECT COUNT(*) as count FROM characters WHERE radical_id = ?')
    .get(id) as { count: number }
  return row.count
}
