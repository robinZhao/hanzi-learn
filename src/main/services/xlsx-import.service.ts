import { getDb } from '../database'
import * as XLSX from 'xlsx'

export interface XlsxImportResult {
  added: number
  updated: number
  skipped: number
  similarAdded: number
  errors: string[]
}

/**
 * Extract base character and similar characters from cell content.
 * e.g. "镇(填)" → { chars: ["镇"], similar: ["填"] }
 *      "增(僧赠曾)" → { chars: ["增"], similar: ["僧","赠","曾"] }
 *      "稚zhi" → { chars: ["稚"], similar: [] }
 *      "扮盼" → { chars: ["扮","盼"], similar: [] }
 *      "堪kan慎" → { chars: ["堪","慎"], similar: [] }
 */
function parseCell(content: string): { chars: string[]; similar: string[] } {
  const str = String(content).trim()
  if (!str) return { chars: [], similar: [] }

  const similar: string[] = []
  const similarMatch = str.match(/\(([^)]+)\)/)
  if (similarMatch) {
    for (const ch of similarMatch[1]) {
      if (/[一-鿿]/.test(ch)) similar.push(ch)
    }
  }

  // Remove parentheses content and pinyin (a-z) to get base characters
  const cleaned = str.replace(/\([^)]*\)/g, '').replace(/[a-zA-Z]/g, '')
  const chars: string[] = []
  for (const ch of cleaned) {
    if (/[一-鿿]/.test(ch) && !chars.includes(ch)) chars.push(ch)
  }

  return { chars, similar }
}

export function importFromXlsx(filePath: string): XlsxImportResult {
  const db = getDb()
  const result: XlsxImportResult = {
    added: 0,
    updated: 0,
    skipped: 0,
    similarAdded: 0,
    errors: [],
  }

  const wb = XLSX.readFile(filePath)
  const configs: Record<string, { isKnown: number | null; familiarity: number; tags: string | null; isBacking: number }> = {
    '认识的字': { isKnown: 1, familiarity: 5, tags: null, isBacking: 0 },
    '不认识的字': { isKnown: 0, familiarity: 0, tags: null, isBacking: 0 },
    '易错字': { isKnown: 0, familiarity: 1, tags: '["易错"]', isBacking: 0 },
    '备用': { isKnown: 0, familiarity: 0, tags: null, isBacking: 1 },
  }

  const insertChar = db.prepare(
    `INSERT INTO user_characters (character_id, familiarity, is_known, tags, is_backing)
     VALUES (?, ?, ?, ?, ?)`
  )
  const updateChar = db.prepare(
    `UPDATE user_characters SET familiarity = ?, is_known = ?, tags = ?, is_backing = ?
     WHERE character_id = ?`
  )
  const findCharId = db.prepare('SELECT id FROM characters WHERE character = ?')
  const findSimilar = db.prepare(
    'SELECT 1 FROM character_similarity WHERE character_id = ? AND similar_id = ?'
  )
  const insertSimilar = db.prepare(
    'INSERT OR IGNORE INTO character_similarity (character_id, similar_id, score) VALUES (?, ?, 1.0)'
  )

  for (const [sheetName, config] of Object.entries(configs)) {
    if (!wb.SheetNames.includes(sheetName)) continue
    const ws = wb.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][]

    const txn = db.transaction((chars: Array<{ charId: number; similar: string[] }>) => {
      for (const { charId, similar } of chars) {
        const existing = db
          .prepare('SELECT id FROM user_characters WHERE character_id = ?')
          .get(charId) as any

        if (existing) {
          updateChar.run(config.familiarity, config.isKnown, config.tags, config.isBacking, charId)
          result.updated++
        } else {
          insertChar.run(charId, config.familiarity, config.isKnown, config.tags, config.isBacking)
          result.added++
        }

        for (const simChar of similar) {
          const simRow = findCharId.get(simChar) as any
          if (simRow) {
            const exists = findSimilar.get(charId, simRow.id)
            if (!exists) {
              insertSimilar.run(charId, simRow.id)
              result.similarAdded++
            }
          }
        }
      }
    })

    const charsToInsert: Array<{ charId: number; similar: string[] }> = []
    for (const row of rows) {
      if (!Array.isArray(row)) continue
      for (const cell of row) {
        if (!cell || typeof cell !== 'string') continue
        const { chars, similar } = parseCell(cell)
        for (const ch of chars) {
          const charRow = findCharId.get(ch) as any
          if (charRow) {
            charsToInsert.push({ charId: charRow.id, similar })
          } else {
            result.skipped++
            result.errors.push(`未找到汉字: ${ch}`)
          }
        }
      }
    }

    if (charsToInsert.length > 0) txn(charsToInsert)
  }

  return result
}

export function exportToXlsx(filePath: string): void {
  const db = getDb()

  const rows = db.prepare(
    `SELECT c.character, uc.is_known, uc.tags, uc.is_backing
     FROM user_characters uc
     JOIN characters c ON uc.character_id = c.id
     ORDER BY uc.added_at ASC`
  ).all() as any[]

  const sheets: Record<string, string[]> = {
    '认识的字': [],
    '不认识的字': [],
    '易错字': [],
    '备用': [],
  }

  for (const row of rows) {
    if (row.is_backing === 1) {
      sheets['备用'].push(row.character)
    } else if (row.tags && row.tags.includes('易错')) {
      sheets['易错字'].push(row.character)
    } else if (row.is_known === 1) {
      sheets['认识的字'].push(row.character)
    } else {
      sheets['不认识的字'].push(row.character)
    }
  }

  const wb = XLSX.utils.book_new()

  for (const [name, chars] of Object.entries(sheets)) {
    // Arrange in 10-column grid like original format
    const gridRows: string[][] = []
    for (let i = 0; i < chars.length; i += 10) {
      gridRows.push(chars.slice(i, i + 10))
    }
    const ws = XLSX.utils.aoa_to_sheet(gridRows)
    XLSX.utils.book_append_sheet(wb, ws, name)
  }

  XLSX.writeFile(wb, filePath)
}
