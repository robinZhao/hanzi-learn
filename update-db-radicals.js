/**
 * 更新用户数据库的 radical_id 和 structure 字段
 * 使用 makemeahanzi dictionary.txt 的 radical 和 decomposition 字段
 *
 * 用法: node update-db-radicals.js [数据库路径]
 */

const initSqlJs = require('sql.js')
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

// 部首字符到部首ID的映射（从 radicals 表读取）
const RADICALS_214 = [
  '一','丨','丶','丿','乙','亅','二','亠','人','儿','入','八',
  '冂','冖','冫','几','凵','刀','力','勹','匕','匚','匸','十',
  '卜','卩','厂','厶','又','口','囗','土','士','夂','夊','夕',
  '大','女','子','宀','寸','小','尢','尸','屮','山','巛','工',
  '己','巾','干','幺','广','廴','廾','弋','弓','彐','彡','彳',
  '心','戈','户','手','支','攴','文','斗','斤','方','无','日',
  '曰','月','木','欠','止','歹','殳','毋','比','毛','氏','气',
  '水','火','爪','父','爻','爿','片','牙','牛','犬','玄','玉',
  '瓜','瓦','甘','生','用','田','疋','疒','癶','白','皮','皿',
  '目','矛','矢','石','示','禸','禾','穴','立','竹','米','糸',
  '缶','网','羊','羽','老','而','耒','耳','聿','肉','臣','自',
  '至','臼','舌','舛','舟','艮','色','艸','虍','虫','血','行',
  '衣','襾','见','角','言','谷','豆','豕','豸','贝','赤','走',
  '足','身','车','辛','辰','辶','邑','酉','釆','里','金','长',
  '门','阜','隶','隹','雨','青','非','面','革','韦','韭','音',
  '页','风','飞','食','首','香','马','骨','高','髟','鬯','鬲',
  '鬼','鱼','鸟','卤','鹿','麦','麻','黄','黍','黑','黹','黾',
  '鼎','鼓','鼠','鼻','齐','齿','龙','龟','龠',
]

// 部首变体映射（makemeahanzi 使用的部首字符 -> 标准部首）
const RADICAL_VARIANTS = {
  '亻': '人', '⺮': '竹', '⺼': '肉', '⺗': '心', '⺌': '小',
  '⺀': '丶', '⺈': '刀', '⺊': '卜', '⺍': '小', '⺳': '网',
  '氵': '水', '灬': '火', '扌': '手', '艹': '艸', '讠': '言',
  '饣': '食', '纟': '糸', '钅': '金', '马': '马', '鸟': '鸟',
  '鱼': '鱼', '虫': '虫', '疒': '疒', '衤': '衣', '礻': '示',
  '忄': '心', '彳': '彳', '辶': '辵', '阝': '邑', '门': '门',
  '广': '广', '廴': '廴', '弋': '弋', '弓': '弓', '彡': '彡',
  '夕': '夕', '匚': '匚', '匸': '匸', '殳': '殳', '耂': '老',
  '丷': '八', '⺁': '厂', '⿸': '广', '⿹': '勹',
  // makemeahanzi 使用的其他变体
  '⺕': '臼', '⺖': '阜', '⺘': '手', '⺙': '羊', '⺚': '羽',
  '⺛': '艸', '⺜': '行', '⺝': '月', '⺞': '女', '⺟': '毋',
  '⺠': '氏', '⺡': '水', '⺢': '火', '⺣': '火', '⺤': '爪',
  '⺥': '玉', '⺦': '目', '⺧': '牛', '⺨': '犬', '⺩': '玉',
  '⺪': '竹', '⺫': '糸', '⺬': '示', '⺭': '禾', '⺯': '羊',
  '⺰': '羽', '⺱': '老', '⺲': '而', '⺷': '羊', '⺸': '竹',
  '⺹': '艸', '⺺': '虍', '⻊': '足', '⻌': '辵', '⻍': '辵',
  '⻎': '辵', '⻏': '邑', '⻖': '阜', '⻗': '雨', '⻘': '青',
  '⻙': '页', '⻚': '风', '⻛': '风', '⻜': '飞', '⻝': '食',
  '⻞': '食', '⻟': '首', '⻠': '香', '⻡': '马', '⻢': '马',
  '⻣': '骨', '⻤': '高', '⻥': '鱼', '⻦': '鸟', '⻧': '卤',
  '⻨': '鹿', '⻩': '黄', '⻪': '黍', '⻫': '黑', '⻬': '黹',
  '⻭': '齿', '⻮': '齿', '⻯': '黾', '⻰': '龙', '⻱': '龟',
  '⻲': '龠', '⻳': '鼎', '⻴': '鼓', '⻵': '鼠', '⻶': '鼻',
  '⻷': '齐', '⻸': '龠',
  // 更多变体
  '⺮': '竹', '⺳': '网', '⺱': '网', '⺧': '牛', '⺣': '火',
}

function buildRadicalIdMap(db) {
  // 从数据库读取 radicals 表建立字符->ID映射
  const rows = db.exec('SELECT id, radical FROM radicals')
  const map = {}
  if (rows.length > 0) {
    for (const r of rows[0].values) {
      map[r[1]] = r[0]
    }
  }
  // 添加标准部首变体
  for (const [variant, standard] of Object.entries(RADICAL_VARIANTS)) {
    if (map[standard] && !map[variant]) {
      map[variant] = map[standard]
    }
  }
  return map
}

async function updateDatabase(dbPath) {
  console.log('加载 makemeahanzi dictionary...')
  const lines = fs.readFileSync(MMAH_DICT, 'utf-8').trim().split('\n')
  const mmaData = {}
  for (const line of lines) {
    const obj = JSON.parse(line)
    mmaData[obj.character] = obj
  }
  console.log(`共 ${Object.keys(mmaData).length} 个字符`)

  console.log('加载数据库:', dbPath)
  const SQL = await initSqlJs()
  const db = new SQL.Database(fs.readFileSync(dbPath))

  // 建立 radical -> id 映射
  const radicalMap = buildRadicalIdMap(db)
  console.log(`部首映射: ${Object.keys(radicalMap).length} 个部首字符`)

  // 获取所有汉字
  const allChars = db.exec('SELECT id, character FROM characters')
  if (!allChars.length) { console.log('无数据'); return }

  let updatedRadical = 0
  let updatedStructure = 0
  let noRadical = 0
  const updateStmt = db.prepare('UPDATE characters SET radical_id = ?, structure = ? WHERE id = ?')

  for (const row of allChars[0].values) {
    const [id, ch] = row
    const info = mmaData[ch]

    // 更新 radical_id
    let radicalId = null
    if (info && info.radical && radicalMap[info.radical]) {
      radicalId = radicalMap[info.radical]
      updatedRadical++
    } else {
      noRadical++
    }

    // 更新 structure
    let structure = null
    if (STRUCTURE_OVERRIDES[ch]) {
      structure = STRUCTURE_OVERRIDES[ch]
    } else if (PINZI_CHARS.has(ch)) {
      structure = '品字'
    } else if (info && info.decomposition && info.decomposition !== '？' && info.decomposition !== '?') {
      const first = info.decomposition.charAt(0)
      structure = idsToStructure[first] || '独体'
    } else {
      structure = '独体'
    }
    updatedStructure++

    updateStmt.run([radicalId, structure, id])
  }

  // 保存
  const buffer = db.export()
  fs.writeFileSync(dbPath, Buffer.from(buffer))

  const dist = db.exec('SELECT structure, count(*) as c FROM characters GROUP BY structure ORDER BY c DESC')
  console.log('\n更新后结构分布:')
  if (dist.length > 0) {
    for (const r of dist[0].values) console.log('  ' + r[0] + ': ' + r[1])
  }

  const withRadical = db.exec('SELECT count(*) FROM characters WHERE radical_id IS NOT NULL')
  const total = db.exec('SELECT count(*) FROM characters')
  console.log('\n总计:', total[0].values[0][0], '汉字')
  console.log('有部首:', withRadical[0].values[0][0], '/', total[0].values[0][0])
  console.log('已更新 radical:', updatedRadical, '| 无部首:', noRadical)

  // 验证几个字
  const verify = db.exec("SELECT character, radical_id, structure FROM characters WHERE character IN ('祺','好','国','字','人','水','火','明','说','那')")
  if (verify.length > 0) {
    console.log('\n验证:')
    for (const r of verify[0].values) console.log('  ' + r[0] + '\tradical_id=' + r[1] + '\t' + r[2])
  }

  db.close()
  console.log('\n✅ 数据库已更新:', dbPath)
}

const dbPath = process.argv[2] || 'C:/Users/zhaoruibin/AppData/Roaming/hanzi-learn/hanzi-learn.db'
updateDatabase(dbPath).catch(err => { console.error(err); process.exit(1) })
