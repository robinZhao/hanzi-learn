/**
 * 仅更新用户数据库的 structure 字段，保留所有用户数据
 *
 * 用法: node update-user-structure.js [数据库路径]
 */

const initSqlJs = require('sql.js')
const fs = require('fs')
const path = require('path')

const MMAH_DICT = path.join(
  process.env.TEMP || process.env.TMP || 'C:/Users/zhaoruibin/AppData/Local/Temp',
  'makemeahanzi_dict.txt'
)

const idsToStructure = {
  '⿰': '左右', '⿱': '上下', '⿲': '左中右', '⿳': '上中下',
  '⿴': '全包围', '⿵': '半包围', '⿶': '半包围', '⿷': '半包围',
  '⿸': '半包围', '⿹': '半包围', '⿺': '半包围', '⿻': '半包围'
}

const STRUCTURE_OVERRIDES = {
  '中': '独体', '坐': '独体', '爽': '独体', '北': '独体',
  '非': '独体', '秉': '独体', '乘': '独体', '重': '独体',
  '夹': '独体', '臾': '独体', '央': '独体', '串': '独体',
  '丰': '独体', '丫': '独体', '丼': '独体', '乑': '独体',
  '乒': '独体', '乓': '独体', '乖': '独体', '凸': '独体',
  '凹': '独体', '噩': '独体', '甪': '独体',
}

const PINZI_CHARS = new Set([
  '品', '晶', '森', '淼', '焱', '垚', '鑫', '磊',
  '轰', '矗', '犇', '羴', '骉', '鱻', '猋', '雥',
  '劦', '刕', '叒', '灥', '厵', '靐', '飍', '馫', '飝',
  '惢', '孨', '尛', '嚞', '雦', '雧', '舙', '譶', '贔', '轟',
])

function buildStructureMap() {
  const lines = fs.readFileSync(MMAH_DICT, 'utf-8').trim().split('\n')
  const map = {}
  for (const line of lines) {
    const obj = JSON.parse(line)
    const ch = obj.character
    if (STRUCTURE_OVERRIDES[ch]) { map[ch] = STRUCTURE_OVERRIDES[ch]; continue }
    if (PINZI_CHARS.has(ch)) { map[ch] = '品字'; continue }
    const decomp = obj.decomposition
    if (!decomp || decomp === '？' || decomp === '?') { map[ch] = '独体'; continue }
    const first = decomp.charAt(0)
    map[ch] = idsToStructure[first] || '独体'
  }
  return map
}

async function updateUserDb(dbPath) {
  console.log('构建结构映射...')
  const structureMap = buildStructureMap()
  console.log(`共 ${Object.keys(structureMap).length} 个字符`)

  console.log('加载用户数据库:', dbPath)
  const SQL = await initSqlJs()
  const db = new SQL.Database(fs.readFileSync(dbPath))

  // 获取所有汉字
  const allChars = db.exec('SELECT id, character FROM characters')
  if (!allChars.length) { console.log('无数据'); return }

  let updated = 0
  let notFound = 0
  const updateStmt = db.prepare('UPDATE characters SET structure = ? WHERE id = ?')

  for (const row of allChars[0].values) {
    const [id, ch] = row
    const structure = structureMap[ch] || null
    updateStmt.run([structure, id])
    updated++
    if (!structure) notFound++
  }

  // 保存
  const buffer = db.export()
  fs.writeFileSync(dbPath, Buffer.from(buffer))

  const dist = db.exec('SELECT structure, count(*) as c FROM characters GROUP BY structure ORDER BY c DESC')
  console.log('\n更新后结构分布:')
  if (dist.length > 0) {
    for (const r of dist[0].values) console.log('  ' + r[0] + ': ' + r[1])
  }

  const total = db.exec('SELECT count(*) FROM characters')
  console.log('\n总计:', total[0].values[0][0], '汉字')
  console.log('已更新:', updated, '| 无结构数据:', notFound)

  db.close()
  console.log('\n✅ 用户数据库 structure 字段已更新:', dbPath)
}

const dbPath = process.argv[2] || 'C:/Users/zhaoruibin/AppData/Roaming/hanzi-learn/hanzi-learn.db'
updateUserDb(dbPath).catch(err => { console.error(err); process.exit(1) })
