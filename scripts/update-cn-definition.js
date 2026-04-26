const { app } = require('electron')
const Database = require('better-sqlite3')
const fs = require('fs')
const path = require('path')

const XDHYCD_PATH = 'C:/Users/zhaoruibin/AppData/Local/Temp/XDHYCD7th/XDHYCD7th.txt'

/**
 * 解析《现代汉语词典》第7版 TXT 文件
 * 提取单字条目（如 【吖】ā见下。）的中文释义
 */
function parseSingleCharDefinitions(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')
  const defMap = {}

  for (const line of lines) {
    if (!line.startsWith('【')) continue

    const endIdx = line.indexOf('】')
    if (endIdx <= 1) continue

    const word = line.substring(1, endIdx)
    if (word.length !== 1) continue

    const rest = line.substring(endIdx + 1).trim()
    if (rest.length > 2) {
      defMap[word] = rest
    }
  }

  return defMap
}

app.whenReady().then(async () => {
  console.log('解析《现代汉语词典》第7版...')
  const defMap = parseSingleCharDefinitions(XDHYCD_PATH)
  console.log(`共 ${Object.keys(defMap).length} 个单字条目`)

  // 显示样例
  const samples = Object.entries(defMap).slice(0, 15)
  console.log('\n样例：')
  for (const [ch, def] of samples) {
    console.log(`  ${ch}: ${def.substring(0, 50)}${def.length > 50 ? '...' : ''}`)
  }

  // 更新数据库
  const dbPath = path.join(process.cwd(), 'resources', 'hanzi.db')
  console.log('\n加载数据库:', dbPath)
  const db = new Database(dbPath)
  db.pragma('journal_mode = WAL')

  // 先添加 cn_definition 列（如果不存在）
  try {
    db.exec('ALTER TABLE characters ADD COLUMN cn_definition TEXT')
    console.log('已添加 cn_definition 列')
  } catch (e) {
    // 列已存在
  }

  const updateStmt = db.prepare(
    'UPDATE characters SET cn_definition = ? WHERE id = ?'
  )

  let updated = 0
  let noDef = 0

  const chars = db.prepare('SELECT id, character FROM characters').all()

  for (const c of chars) {
    const def = defMap[c.character] || null
    updateStmt.run([def, c.id])
    if (def) updated++
    else noDef++
  }

  db.close()

  console.log('\n总计:', chars.length, '汉字')
  console.log('有中文释义:', updated, '/', chars.length)
  console.log('无中文释义:', noDef)

  // 验证
  const db2 = new Database(dbPath)
  const verify = db2.prepare("SELECT character, cn_definition FROM characters WHERE character IN ('吖','阿','好','国','字','人','祺','明','说','那')").all()
  console.log('\n验证:')
  for (const r of verify) {
    const short = r.cn_definition ? r.cn_definition.substring(0, 40) : '无'
    console.log(`  ${r.character}\t${short}`)
  }
  db2.close()

  console.log('\n✅ 中文释义已更新:', dbPath)
  app.exit(0)
}).catch(err => {
  console.error(err)
  app.exit(1)
})
