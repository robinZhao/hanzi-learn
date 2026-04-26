const { app } = require('electron')
const Database = require('better-sqlite3')
const fs = require('fs')
const path = require('path')

const XDHYCD_PATH = 'C:/Users/zhaoruibin/AppData/Local/Temp/XDHYCD7th/XDHYCD7th.txt'

function parseDefinitions(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')
  const charPinyinMap = {}

  for (const line of lines) {
    if (!line.startsWith('【')) continue
    const endIdx = line.indexOf('】')
    if (endIdx <= 1) continue

    const word = line.substring(1, endIdx)
    if (word.length !== 1) continue

    const rest = line.substring(endIdx + 1).trim()
    if (rest.length < 2) continue

    // Strip leading superscript numbers
    let stripped = rest.replace(/^[⁰¹²³⁴⁵⁶⁷⁸⁹]+/, '').trim()

    // Extract parenthesized traditional variant(s) like （丟）or（說）
    const variantMatch = stripped.match(/^（([^）]+)）/)
    const variants = []
    if (variantMatch) {
      // Each character in the parens is a variant
      for (const ch of variantMatch[1]) {
        if (/[一-鿿]/.test(ch)) variants.push(ch)
      }
    }

    stripped = stripped.replace(/^（[^）]*）\s*/, '')

    // Extract pinyin - may start with ·• for toneless particles
    const pinyinMatch = stripped.match(/^([·•]?[a-züāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜê̄ếê̌ềḿm̀ńňǹẑĉŝŋɡɑ]+)\s?/)
    if (!pinyinMatch) continue

    const hasAlpha = /[a-züāéěèīóǒòūǖǘǚǜ]/i.test(pinyinMatch[1])
    if (!hasAlpha) continue

    let pinyin = pinyinMatch[1].trim()
      .replace(/^[·•]/, '')
      .replace(/​/g, '')
      .replace(/ɡ/g, 'g')
      .replace(/ɑ/g, 'a')
    if (!pinyin) continue

    let definition = stripped.substring(pinyinMatch[0].length).trim()
    // Remove "另见" page references
    definition = definition.replace(/。另见.*$/, '').replace(/，另见.*$/, '')

    // Map to main character
    if (!charPinyinMap[word]) charPinyinMap[word] = {}
    if (!charPinyinMap[word][pinyin]) charPinyinMap[word][pinyin] = []
    charPinyinMap[word][pinyin].push(definition)

    // Also map to traditional/simple variants found in parentheses
    for (const v of variants) {
      if (v !== word) {
        if (!charPinyinMap[v]) charPinyinMap[v] = {}
        if (!charPinyinMap[v][pinyin]) charPinyinMap[v][pinyin] = []
        charPinyinMap[v][pinyin].push(definition)
      }
    }
  }

  return charPinyinMap
}

app.whenReady().then(async () => {
  console.log('解析《现代汉语词典》第7版...')
  const defMap = parseDefinitions(XDHYCD_PATH)

  const multiPinyinCount = Object.entries(defMap).filter(([_, v]) => {
    return Object.keys(v).length > 1
  }).length
  console.log(`共 ${Object.keys(defMap).length} 个单字条目，其中 ${multiPinyinCount} 个多音字`)

  // Build merged definition strings
  const mergedMap = {}
  for (const [char, pinyinDefs] of Object.entries(defMap)) {
    const entries = []
    const sortedPinyins = Object.entries(pinyinDefs).sort((a, b) => a[0].localeCompare(b[0]))
    for (const [py, defs] of sortedPinyins) {
      entries.push(py + '  ' + defs.join(' | '))
    }
    if (entries.length > 0) mergedMap[char] = entries.join('\n')
  }

  console.log('合并后：' + Object.keys(mergedMap).length + ' 个汉字有中文释义')

  // Update database
  const dbPath = path.join(process.cwd(), 'resources', 'hanzi.db')
  console.log('加载数据库:', dbPath)
  const db = new Database(dbPath)
  db.pragma('journal_mode = WAL')

  try { db.exec('ALTER TABLE characters ADD COLUMN cn_definition TEXT') } catch (e) {}

  const updateStmt = db.prepare('UPDATE characters SET cn_definition = ? WHERE id = ?')
  const chars = db.prepare('SELECT id, character FROM characters').all()

  let updated = 0
  for (const c of chars) {
    const def = mergedMap[c.character] || null
    updateStmt.run([def, c.id])
    if (def) updated++
  }

  db.close()
  console.log(`已更新 ${updated}/${chars.length} 个汉字的中文释义`)

  // Verify
  const db2 = new Database(dbPath)
  const verify = db2.prepare("SELECT character, cn_definition FROM characters WHERE character IN ('一','下','也','了','云','五','交','中','长','重','和','行','得','乐','好','国','祺','人','明','说','那')").all()
  console.log('\n验证:')
  for (const r of verify) {
    const short = r.cn_definition ? r.cn_definition.substring(0, 60) + '...' : '无释义'
    console.log(`  ${r.character}: ${short}`)
  }
  db2.close()

  console.log('\n✅ 中文释义已更新:', dbPath)
  app.exit(0)
}).catch(err => {
  console.error(err)
  app.exit(1)
})
