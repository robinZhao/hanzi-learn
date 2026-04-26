/**
 * 更新数据库的 definition 字段（从 makemeahanzi 获取英文释义）
 *
 * 用法: node update-definitions.js [数据库路径]
 */

const initSqlJs = require('sql.js')
const fs = require('fs')

const MMAH_DICT = 'C:/Users/zhaoruibin/AppData/Local/Temp/makemeahanzi_dict.txt'

async function updateDefinitions(dbPath) {
  console.log('加载 makemeahanzi dictionary...')
  const lines = fs.readFileSync(MMAH_DICT, 'utf-8').trim().split('\n')
  const defMap = {}
  for (const line of lines) {
    const obj = JSON.parse(line)
    if (obj.definition) {
      defMap[obj.character] = obj.definition
    }
  }
  console.log(`共 ${Object.keys(defMap).length} 条释义`)

  console.log('加载数据库:', dbPath)
  const SQL = await initSqlJs()
  const db = new SQL.Database(fs.readFileSync(dbPath))

  const allChars = db.exec('SELECT id, character FROM characters')
  if (!allChars.length) { console.log('无数据'); return }

  let updated = 0
  let noDef = 0
  const updateStmt = db.prepare('UPDATE characters SET definition = ? WHERE id = ?')

  for (const row of allChars[0].values) {
    const [id, ch] = row
    const def = defMap[ch] || null
    updateStmt.run([def, id])
    if (def) updated++
    else noDef++
  }

  // 保存
  const buffer = db.export()
  fs.writeFileSync(dbPath, Buffer.from(buffer))

  const withDef = db.exec("SELECT count(*) FROM characters WHERE definition IS NOT NULL AND definition != ''")
  const total = db.exec('SELECT count(*) FROM characters')
  console.log('\n总计:', total[0].values[0][0], '汉字')
  console.log('有释义:', withDef[0].values[0][0], '/', total[0].values[0][0])
  console.log('已更新:', updated, '| 无释义:', noDef)

  // 验证
  const verify = db.exec("SELECT character, definition FROM characters WHERE character IN ('祺','好','国','字','人','水','火','明','说','那')")
  if (verify.length > 0) {
    console.log('\n验证:')
    for (const r of verify[0].values) console.log('  ' + r[0] + '\t' + r[1])
  }

  db.close()
  console.log('\n✅ 释义已更新:', dbPath)
}

const dbPath = process.argv[2] || 'C:/Users/zhaoruibin/AppData/Roaming/hanzi-learn/hanzi-learn.db'
updateDefinitions(dbPath).catch(err => { console.error(err); process.exit(1) })
