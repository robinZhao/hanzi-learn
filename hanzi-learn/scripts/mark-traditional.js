const { app } = require('electron')
const Database = require('better-sqlite3')
const fs = require('fs')
const path = require('path')

const UNIHAN_VARIANTS = 'C:/Users/zhaoruibin/AppData/Local/Temp/unihan/Unihan_Variants.txt'

app.whenReady().then(async () => {
  const content = fs.readFileSync(UNIHAN_VARIANTS, 'utf-8')

  // Extract simplified -> traditional mappings
  const simpToTrad = {}
  const tradChars = new Set()

  for (const line of content.split('\n')) {
    if (!line || line.startsWith('#')) continue
    const parts = line.trim().split(/\s+/)
    if (parts.length < 3) continue

    const codePoint = parts[0]  // e.g. U+56FD
    const field = parts[1]

    if (field === 'kTraditionalVariant') {
      const tradCP = parts[2]  // e.g. U+570B
      const simpChar = String.fromCodePoint(parseInt(codePoint.slice(2), 16))
      const tradChar = String.fromCodePoint(parseInt(tradCP.slice(2), 16))
      simpToTrad[simpChar] = tradChar
      tradChars.add(tradChar)
    }
  }

  console.log('Total traditional characters:', tradChars.size)

  // Filter to common CJK range
  const commonTrad = [...tradChars].filter(c => {
    const code = c.codePointAt(0)
    return code >= 0x4E00 && code <= 0x9FFF
  })
  console.log('Traditional in CJK basic range:', commonTrad.length)

  // Show sample
  const sampleEntries = Object.entries(simpToTrad)
    .filter(([s]) => s.charCodeAt(0) >= 0x4E00 && s.charCodeAt(0) <= 0x9FFF)
  console.log('\nSample simplified → traditional:')
  for (const [s, t] of sampleEntries.slice(0, 30)) {
    console.log('  ' + s + ' → ' + t)
  }

  // Update database: add is_traditional column
  const dbPath = path.join(process.cwd(), 'resources', 'hanzi.db')
  console.log('\n加载数据库:', dbPath)
  const db = new Database(dbPath)
  db.pragma('journal_mode = WAL')

  try {
    db.exec('ALTER TABLE characters ADD COLUMN is_traditional INTEGER DEFAULT 0')
    console.log('已添加 is_traditional 列')
  } catch (e) {
    console.log('列已存在')
  }

  const updateStmt = db.prepare('UPDATE characters SET is_traditional = ? WHERE id = ?')

  const chars = db.prepare('SELECT id, character FROM characters').all()
  let tradCount = 0

  for (const c of chars) {
    const isTrad = tradChars.has(c.character) ? 1 : 0
    updateStmt.run([isTrad, c.id])
    if (isTrad) tradCount++
  }

  db.close()

  console.log('\n标记为繁体:', tradCount, '/', chars.length)

  // Verify
  const db2 = new Database(dbPath)
  const tradChars_in_db = db2.prepare("SELECT character, is_traditional FROM characters WHERE is_traditional = 1 ORDER BY character").all()
  console.log('\n数据库中的繁体字:')
  for (const r of tradChars_in_db) {
    console.log('  ' + r.character + ' (is_traditional=' + r.is_traditional + ')')
  }
  db2.close()

  console.log('\n✅ 繁体标记已完成:', dbPath)
  app.exit(0)
}).catch(err => {
  console.error(err)
  app.exit(1)
})
