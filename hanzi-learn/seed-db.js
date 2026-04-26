/**
 * 种子脚本：使用 hanzi-writer-data 和 pinyin-pro 扩充汉字数据库
 * 遍历 CJK 基本区 (0x4E00-0x9FA5)
 */

const fs = require('fs')
const path = require('path')
const Database = require('better-sqlite3')
const { pinyin } = require('pinyin-pro')

const SOURCE_DB = path.join(__dirname, 'resources', 'hanzi.db')
const HW_DATA_DIR = path.join(__dirname, 'node_modules', 'hanzi-writer-data')
const CJK_START = 0x4E00
const CJK_END = 0x9FA5

// ========== 1. hanzi-writer-data 字符映射 ======

function loadHanziWriterKeys() {
  const keys = new Set()
  for (const file of fs.readdirSync(HW_DATA_DIR)) {
    if (!file.endsWith('.json')) continue
    const code = file.slice(0, -5).codePointAt(0)
    if (code >= CJK_START && code <= CJK_END) keys.add(code)
  }
  return keys
}

// ========== 2. 部首查找 ======

const RADICALS = [
  '一', '丨', '丶', '丿', '乙', '亅', '二', '亠', '人', '儿', '入', '八',
  '冂', '冖', '冫', '几', '凵', '刀', '力', '勹', '匕', '匚', '匸', '十',
  '卜', '卩', '厂', '厶', '又', '口', '囗', '土', '士', '夂', '夊', '夕',
  '大', '女', '子', '宀', '寸', '小', '尢', '尸', '屮', '山', '巛', '工',
  '己', '巾', '干', '幺', '广', '廴', '廾', '弋', '弓', '彐', '彡', '彳',
  '心', '戈', '户', '手', '支', '攴', '文', '斗', '斤', '方', '无', '日',
  '曰', '月', '木', '欠', '止', '歹', '殳', '毋', '比', '毛', '氏', '气',
  '水', '火', '爪', '父', '爻', '爿', '片', '牙', '牛', '犬', '玄', '玉',
  '瓜', '瓦', '甘', '生', '用', '田', '疋', '疒', '癶', '白', '皮', '皿',
  '目', '矛', '矢', '石', '示', '禸', '禾', '穴', '立', '竹', '米', '糸',
  '缶', '网', '羊', '羽', '老', '而', '耒', '耳', '聿', '肉', '臣', '自',
  '至', '臼', '舌', '舛', '舟', '艮', '色', '艸', '虍', '虫', '血', '行',
  '衣', '襾', '见', '角', '言', '谷', '豆', '豕', '豸', '贝', '赤', '走',
  '足', '身', '车', '辛', '辰', '辶', '邑', '酉', '釆', '里', '金', '长',
  '门', '阜', '隶', '隹', '雨', '青', '非', '面', '革', '韦', '韭', '音',
  '页', '风', '飞', '食', '首', '香', '马', '骨', '高', '髟', '鬯', '鬲',
  '鬼', '鱼', '鸟', '卤', '鹿', '麦', '麻', '黄', '黍', '黑', '黹', '黾',
  '鼎', '鼓', '鼠', '鼻', '齐', '齿', '龙', '龟', '龠',
]

const RADICAL_LOOKUP = new Map()
for (const [i, ch] of RADICALS.entries()) RADICAL_LOOKUP.set(ch, i + 1)

const COMPONENTS = {
  '亻': 9, '亠': 8, '宀': 40, '辶': 162, '氵': 85, '扌': 64,
  '艹': 140, '口': 30, '日': 72, '月': 74, '木': 75, '火': 86,
  '灬': 86, '钅': 167, '石': 112, '竹': 118, '米': 119, '禾': 115,
  '纟': 120, '疒': 104, '衤': 145, '礻': 113, '土': 32, '女': 38,
  '心': 61, '忄': 61, '彳': 60, '讠': 149, '饣': 184, '马': 187,
  '虫': 142, '鸟': 196, '鱼': 195, '雨': 173, '页': 181, '革': 177,
  '韭': 179, '音': 180, '骨': 188, '髟': 190, '鬼': 194, '龟': 213,
  '龠': 214, '广': 53, '虎': 141, '豸': 153, '豕': 152, '酉': 164,
  '釆': 165, '辛': 160, '辰': 161, '门': 169, '阜': 170, '隶': 171,
  '隹': 172, '非': 175, '面': 176, '鹿': 198, '黾': 205, '鼎': 206,
  '鼓': 207, '鼠': 208, '鼻': 209, '齿': 211, '匚': 22, '匸': 23,
  '殳': 79, '耂': 127, '丷': 8, '⺁': 27,
}

function findRadical(char) {
  if (RADICAL_LOOKUP.has(char)) return RADICAL_LOOKUP.get(char)
  for (const [comp, radId] of Object.entries(COMPONENTS)) {
    if (char.includes(comp)) return radId
  }
  return null
}

// ========== 3. 结构识别 ======

function guessStructure(char) {
  // 常见全包围结构
  const FULL_SURROUND = { '国': 1, '围': 1, '园': 1, '图': 1, '圆': 1, '圈': 1, '固': 1, '因': 1, '困': 1, '囚': 1, '四': 1, '回': 1, '田': 1, '由': 1, '甲': 1, '申': 1, '白': 1, '皿': 1, '目': 1, '自': 1 }
  if (FULL_SURROUND[char]) return '全包围'

  // 常见上下结构
  const TOP_BOTTOM_CHARS = { '字': 1, '学': 1, '宝': 1, '家': 1, '室': 1, '宫': 1, '安': 1, '定': 1, '宁': 1, '宿': 1, '寒': 1, '富': 1, '赛': 1, '实': 1, '宁': 1 }
  if (TOP_BOTTOM_CHARS[char]) return '上下'

  // 常见左右结构
  const LEFT_RIGHT_CHARS = { '好': 1, '明': 1, '林': 1, '森': 1, '树': 1, '村': 1, '李': 1, '张': 1, '王': 1, '华': 1, '何': 1, '徐': 1, '宋': 1, '马': 1, '陈': 1 }
  if (LEFT_RIGHT_CHARS[char]) return '左右'

  // 常见半包围
  const HALF_SURROUND = { '这': 1, '边': 1, '进': 1, '远': 1, '近': 1, '过': 1, '连': 1, '达': 1, '运': 1, '道': 1, '建': 1, '运': 1 }
  if (HALF_SURROUND[char]) return '半包围'

  // 默认独体
  return '独体'
}

// ========== 4. 频率分布（1-100 常用度） ======

// 常用汉字频率表（GB2312/GBK 分级）
const FREQUENCY_TABLE = {
  // 一级常用字 (GB2312 1-16 区)
  '一': 100, '二': 95, '三': 90, '四': 85, '五': 80, '六': 75, '七': 70, '八': 65, '九': 60, '十': 92,
  '人': 88, '口': 82, '日': 78, '月': 72, '山': 68, '水': 70, '火': 65, '木': 62, '金': 58, '土': 60,
  '中': 98, '国': 96, '学': 94, '大': 93, '小': 86, '上': 76, '下': 74, '不': 84, '分': 55, '为': 82,
  '主': 66, '要': 72, '子': 80, '的': 100, '了': 99, '能': 64, '会': 58, '我': 90, '你': 88, '他': 76,
  '她': 70, '们': 85, '这': 80, '那': 68, '也': 82, '就': 78, '都': 74, '到': 66, '过': 62, '说': 56,
  '们': 85, '什么': 60, '里': 68, '后': 64, '有': 78, '没': 56, '都': 74, '还': 70, '很': 72, '得': 68,
  '也': 82, '要': 72, '里': 68, '年': 76, '着': 64, '对': 60, '面': 52, '子': 80, '中': 98, '后': 64,
  '会': 58, '也': 82, '里': 68, '就': 78, '个': 90, '的': 100, '了': 99, '不': 84, '在': 76, '是': 95,
  '可': 56, '以': 60, '及': 44, '时': 62, '为': 82, '之': 58, '与': 54, '或': 48, '则': 42, '如': 50,
}

function getFrequency(code) {
  const char = String.fromCodePoint(code)
  if (FREQUENCY_TABLE[char] !== undefined) return FREQUENCY_TABLE[char]
  if (code <= 0x5FFF) return 100  // GB2312 一级字
  if (code <= 0x6FFF) return 50  // GB2312 二级字
  if (code <= 0x8000) return 25  // 扩展区
  return 1
}

// ========== 5. 种子流程 ==========

async function seed() {
  console.log('加载 hanzi-writer-data 字符映射...')
  const hwKeys = loadHanziWriterKeys()
  console.log(`找到 ${hwKeys.size} 个字符`)

  const db = new Database(SOURCE_DB)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = OFF')

  const before = db.prepare('SELECT count(*) as c FROM characters').get()
  console.log(`数据库当前汉字数: ${before.c}`)

  // 使用 INSERT OR REPLACE 确保覆盖已有数据
  const insertStmt = db.prepare(`
    INSERT OR REPLACE INTO characters (character, unicode_hex, pinyin, radical_id, stroke_count, structure, frequency)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)

  let batch = []
  let inserted = 0
  let scanned = 0
  let startTime = Date.now()

  console.log('开始扫描 CJK 区块...')

  for (let code = CJK_START; code <= CJK_END; code++) {
    const char = String.fromCodePoint(code)
    if (!isHanzi(code)) continue
    if (!hwKeys.has(code)) continue

    const jsonPath = path.join(HW_DATA_DIR, char + '.json')
    if (!fs.existsSync(jsonPath)) continue
    const charData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'))

    const hex = '0x' + code.toString(16).toUpperCase()
    const strokeCount = charData.strokes.length
    const pinyinStr = pinyin(char)
    const frequency = getFrequency(code)
    const radicalId = findRadical(char)
    const structure = guessStructure(char)

    batch.push([char, hex, pinyinStr, radicalId, strokeCount, structure, frequency])
    inserted++

    if (batch.length >= 1000) {
      insertMany(db, insertStmt, batch)
      const pct = (scanned / (CJK_END - CJK_START) * 100).toFixed(1)
      const speed = (inserted / (Date.now() - startTime) * 1000).toFixed(1)
      console.log(`进度 ${pct}% 已插入 ${inserted} (${speed} 字/秒)`)
      batch = []
    }
    scanned++
  }

  if (batch.length > 0) {
    insertMany(db, insertStmt, batch)
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1)
  const after = db.prepare('SELECT count(*) as c FROM characters').get()

  console.log(`\n✅ 种子完成！`)
  console.log(`   耗时: ${totalTime}s, 扫描: ${scanned}, 新增: ${inserted}`)
  console.log(`   数据库总计: ${after.c} 个汉字`)

  const stats = db.prepare(`
    SELECT
      avg(stroke_count) as avg_strokes,
      min(stroke_count) as min_strokes,
      max(stroke_count) as max_strokes,
      count(*) FILTER (where radical_id IS NOT NULL) as with_radical,
      count(*) FILTER (where structure IS NOT NULL) as with_structure
    FROM characters
  `).get()
  console.log(`   平均笔画数: ${stats.avg_strokes.toFixed(1)}`)
  console.log(`   笔画范围: ${stats.min_strokes} - ${stats.max_strokes}`)
  console.log(`   有部首: ${stats.with_radical}, 有结构: ${stats.with_structure}`)

  // 频率分布
  const freqDist = db.prepare(`
    SELECT
      case
        when frequency = 100 then '常用字(100)'
        when frequency >= 50 then '次常用(50-99)'
        when frequency >= 25 then '扩展(25-49)'
        else '其他(1-24)'
      end as range, count(*) as c
    FROM characters GROUP BY range ORDER BY c DESC
  `).all()
  console.log('   频率分布:')
  freqDist.forEach(r => console.log(`     ${r.range}: ${r.c}`))

  db.close()
}

function isHanzi(code) {
  return code >= 0x4E00 && code <= 0x9FA5 && !(code >= 0x3001 && code <= 0x3003)
}

function insertMany(db, stmt, rows) {
  const transaction = db.transaction((rows) => {
    for (const row of rows) stmt.run(...row)
  })
  transaction(rows)
}

seed().catch(err => { console.error('种子失败:', err); process.exit(1) })
