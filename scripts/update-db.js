const { app } = require('electron')
const Database = require('better-sqlite3')
const fs = require('fs')
const path = require('path')

const MMAH_DICT = 'C:/Users/zhaoruibin/AppData/Local/Temp/makemeahanzi_dict.txt'

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

const RADICAL_VARIANTS = {
  '亻': '人', '⺮': '竹', '⺼': '肉', '⺗': '心', '⺌': '小',
  '⺀': '丶', '⺈': '刀', '⺊': '卜', '⺍': '小', '⺳': '网',
  '氵': '水', '灬': '火', '扌': '手', '艹': '艸', '讠': '言',
  '饣': '食', '纟': '糸', '钅': '金', '马': '马', '鸟': '鸟',
  '鱼': '鱼', '虫': '虫', '疒': '疒', '衤': '衣', '礻': '示',
  '忄': '心', '彳': '彳', '辶': '辵', '阝': '邑', '门': '门',
  '广': '广', '廴': '廴', '弋': '弋', '弓': '弓', '彡': '彡',
  '夕': '夕', '匚': '匚', '匸': '匸', '殳': '殳', '耂': '老',
  '丷': '八', '⺁': '厂', '⺕': '臼', '⺖': '阜', '⺘': '手',
  '⺙': '羊', '⺚': '羽', '⺛': '艸', '⺜': '行', '⺝': '月',
  '⺞': '女', '⺟': '毋', '⺠': '氏', '⺡': '水', '⺢': '火',
  '⺣': '火', '⺤': '爪', '⺥': '玉', '⺦': '目', '⺧': '牛',
  '⺨': '犬', '⺩': '玉', '⺪': '竹', '⺫': '糸', '⺬': '示',
  '⺭': '禾', '⺯': '羊', '⺰': '羽', '⺱': '老', '⺲': '而',
  '⺷': '羊', '⺸': '竹', '⺹': '艸', '⺺': '虍', '⻊': '足',
  '⻌': '辵', '⻍': '辵', '⻎': '辵', '⻏': '邑', '⻖': '阜',
  '⻗': '雨', '⻘': '青', '⻙': '页', '⻚': '风', '⻛': '风',
  '⻜': '飞', '⻝': '食', '⻞': '食', '⻟': '首', '⻠': '香',
  '⻡': '马', '⻢': '马', '⻣': '骨', '⻤': '高', '⻥': '鱼',
  '⻦': '鸟', '⻧': '卤', '⻨': '鹿', '⻩': '黄', '⻪': '黍',
  '⻫': '黑', '⻬': '黹', '⻭': '齿', '⻮': '齿', '⻯': '黾',
  '⻰': '龙', '⻱': '龟', '⻲': '龠', '⻳': '鼎', '⻴': '鼓',
  '⻵': '鼠', '⻶': '鼻', '⻷': '齐', '⻸': '龠',
}

function buildData() {
  const lines = fs.readFileSync(MMAH_DICT, 'utf-8').trim().split('\n')
  const map = {}
  for (const line of lines) {
    const obj = JSON.parse(line)
    map[obj.character] = {
      radical: obj.radical || null,
      decomposition: obj.decomposition || null,
      definition: obj.definition || null,
      pinyin: obj.pinyin || [],
    }
  }
  return map
}

function buildRadicalMap(db) {
  const radicals = db.prepare('SELECT id, radical FROM radicals').all()
  const map = {}
  for (const r of radicals) {
    map[r.radical] = r.id
  }
  for (const [variant, standard] of Object.entries(RADICAL_VARIANTS)) {
    if (map[standard] && !map[variant]) {
      map[variant] = map[standard]
    }
  }
  return map
}

app.whenReady().then(async () => {
  console.log('加载 makemeahanzi dictionary...')
  const dataMap = buildData()
  console.log(`共 ${Object.keys(dataMap).length} 个字符`)

  const dbPath = path.join(process.cwd(), 'resources', 'hanzi.db')
  console.log('加载数据库:', dbPath)
  const db = new Database(dbPath)
  db.pragma('journal_mode = WAL')

  const radicalMap = buildRadicalMap(db)
  console.log(`部首映射: ${Object.keys(radicalMap).length} 个部首字符`)

  const updateStmt = db.prepare(
    'UPDATE characters SET radical_id = @radical_id, structure = @structure, definition = @definition WHERE id = @id'
  )
  const updateTx = db.transaction(update => update.run(update))

  let updatedRadical = 0
  let updatedStructure = 0
  let updatedDef = 0
  let noRadical = 0

  const chars = db.prepare('SELECT id, character FROM characters').all()

  for (const c of chars) {
    const info = dataMap[c.character] || {}

    // radical_id
    let radicalId = null
    if (info.radical && radicalMap[info.radical]) {
      radicalId = radicalMap[info.radical]
      updatedRadical++
    } else {
      noRadical++
    }

    // structure
    let structure = null
    if (STRUCTURE_OVERRIDES[c.character]) {
      structure = STRUCTURE_OVERRIDES[c.character]
    } else if (PINZI_CHARS.has(c.character)) {
      structure = '品字'
    } else if (info.decomposition && info.decomposition !== '？' && info.decomposition !== '?') {
      const first = info.decomposition.charAt(0)
      structure = idsToStructure[first] || '独体'
    } else {
      structure = '独体'
    }
    updatedStructure++

    // definition
    let definition = info.definition || null
    if (definition) updatedDef++

    updateStmt.run({ radical_id: radicalId, structure, definition, id: c.id })
  }

  db.close()

  console.log('\n总计:', chars.length, '汉字')
  console.log('已更新 radical:', updatedRadical, '| 无部首:', noRadical)
  console.log('已更新 structure:', updatedStructure)
  console.log('已更新 definition:', updatedDef)

  // 验证
  const db2 = new Database(dbPath)
  const verify = db2.prepare("SELECT character, radical_id, structure, definition FROM characters WHERE character IN ('祺','好','国','字','人','水','火','明','说','那')").all()
  console.log('\n验证:')
  for (const r of verify) {
    console.log(`  ${r.character}\tradical=${r.radical_id}\tstructure=${r.structure}\tdef=${r.definition}`)
  }
  db2.close()

  console.log('\n✅ 数据库已更新:', dbPath)
  app.exit(0)
}).catch(err => {
  console.error(err)
  app.exit(1)
})
