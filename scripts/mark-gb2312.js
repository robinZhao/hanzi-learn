const { app } = require('electron')
const Database = require('better-sqlite3')
const iconv = require('iconv-lite')
const fs = require('fs')
const path = require('path')

app.whenReady().then(async () => {
  // Generate GB2312 set
  const gb2312Set = new Set()
  for (let row = 0x10; row <= 0x57; row++) {
    for (let col = 0x01; col <= 0x5E; col++) {
      const buf = Buffer.from([row + 0xA0, col + 0xA0])
      try {
        const ch = iconv.decode(buf, 'gb2312')
        if (ch && ch.length === 1 && /[一-鿿]/.test(ch)) {
          gb2312Set.add(ch)
        }
      } catch (e) {}
    }
  }
  console.log('GB2312 characters:', gb2312Set.size)

  const dbPath = path.join(process.cwd(), 'resources', 'hanzi.db')
  const db = new Database(dbPath)
  db.pragma('journal_mode = WAL')

  try {
    db.exec('ALTER TABLE characters ADD COLUMN is_gb2312 INTEGER DEFAULT 0')
    console.log('已添加 is_gb2312 列')
  } catch (e) {
    console.log('列已存在')
  }

  const updateStmt = db.prepare('UPDATE characters SET is_gb2312 = ? WHERE id = ?')
  const chars = db.prepare('SELECT id, character FROM characters').all()

  let gbCount = 0
  for (const c of chars) {
    const isGB = gb2312Set.has(c.character) ? 1 : 0
    updateStmt.run([isGB, c.id])
    if (isGB) gbCount++
  }

  db.close()
  console.log(`已标记 ${gbCount}/${chars.length} 个汉字为 GB2312`)

  // Verify
  const db2 = new Database(dbPath)
  const sample = db2.prepare("SELECT character, is_gb2312 FROM characters WHERE character IN ('啊','丟','国','學','祺','说','體')").all()
  console.log('\n验证:')
  for (const r of sample) console.log('  ' + r.character + '\tGB2312=' + r.is_gb2312)

  const counts = db2.prepare("SELECT is_gb2312, count(*) as c FROM characters GROUP BY is_gb2312").all()
  console.log('\n分布:')
  for (const r of counts) console.log('  is_gb2312=' + r.is_gb2312 + ': ' + r.c)
  db2.close()

  console.log('\n✅ 完成')
  app.exit(0)
}).catch(err => {
  console.error(err)
  app.exit(1)
})
