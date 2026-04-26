import { getDb } from '../database'
import { pinyin } from 'pinyin-pro'
import { MULTI_PINYIN_CHARS } from './multi-pinyin-chars'

export interface CharacterSummary {
  id: number
  character: string
  pinyin: string
  stroke_count: number
  radical_id: number | null
  structure: string | null
  frequency: number | null
  definition: string | null
  cn_definition: string | null
}

export interface CharacterDetail extends CharacterSummary {
  unicode_hex: string
  pinyin_num: string | null
  decomposition: string | null
  stroke_data: string | null
  radical_name: string | null
  radical_char: string | null
}

export function searchByPinyin(pinyinInput: string, tone?: number, gb2312Only = true): CharacterSummary[] {
  const db = getDb()
  if (!pinyinInput) return []

  const gbFilter = gb2312Only ? ' WHERE is_gb2312 = 1' : ''

  // Support multiple syllables separated by space: "zhong guo" -> ["zhong", "guo"]
  const syllables = pinyinInput.toLowerCase().trim().split(/[\s,]+/).filter(Boolean)

  // Fetch all characters and filter in JS using pinyin-pro
  const allChars = db
    .prepare(
      `SELECT id, character, pinyin, stroke_count, radical_id, structure, frequency, definition, cn_definition
       FROM characters${gbFilter}
       ORDER BY frequency ASC NULLS LAST`
    )
    .all() as CharacterSummary[]

  const results: CharacterSummary[] = []

  for (const c of allChars) {
    if (!c.pinyin) continue

    // Get ALL pronunciations without tone marks (for plain text matching)
    const allPinyinsPlain = pinyin(c.character, { toneType: 'none', multiple: true, type: 'array' })

    // Get ALL pronunciations with tone marks (for display and tone filtering)
    const allPinyinsMarked = pinyin(c.character, { toneType: 'symbol', multiple: true, type: 'array' })

    // Exact match: every input syllable must exactly match one of the character's pronunciations
    const matched = syllables.every((s) =>
      allPinyinsPlain.some((p: string) => p.toLowerCase() === s)
    )
    if (!matched) continue

    // If tone specified, check the tone of the specific pronunciation that matches the input
    if (tone && tone >= 1 && tone <= 4) {
      // Check: does any marked pinyin match the input syllable AND have the correct tone?
      const toneMatched = allPinyinsMarked.some((mp: string) => {
        const plainStripped = stripToneMarks(mp).toLowerCase()
        return plainStripped === syllables[0] && getToneFromMarkedPinyin(mp) === tone
      })
      if (!toneMatched) continue
    }

    // Enrich pinyin for multi-pronunciation characters
    if (allPinyinsMarked.length > 1) {
      c.pinyin = allPinyinsMarked.join(' / ')
      c.cn_definition = buildCnDefForMultiPinyin(c.character, c.cn_definition || '', allPinyinsMarked)
    }

    results.push(c)
    if (results.length >= 200) break
  }

  // Sort by dictionary order: pinyin alphabetical, then stroke count
  return sortDictionaryOrder(results)
}

// Export the full set of multi-pronunciation characters for use by other modules
export { MULTI_PINYIN_CHARS }

/**
 * Check if a character is a multi-pronunciation character.
 * Uses a pre-computed set for O(1) lookup instead of calling pinyin-pro.
 */
export function isMultiPinyin(char: string): boolean {
  return MULTI_PINYIN_CHARS.has(char)
}

// Multi-pronunciation character definitions from 《现代汉语词典》
// Only characters with curated definitions are listed here.
// Characters not in this map will auto-generate a basic pronunciation list
// via enrichDefinition() using pinyin-pro data.
// Total multi-pinyin characters in the database: 1510
// Curated definitions below: 40
const MULTI_PINYIN_DEFS: Record<string, { pinyin: string; def: string }[]> = {
  '长': [
    { pinyin: 'cháng', def: '两点之间的距离大；长度；长处；对某事做得特别好' },
    { pinyin: 'zhǎng', def: '生长，成长；增加；年纪大；排行第一；负责人' }
  ],
  '重': [
    { pinyin: 'zhòng', def: '分量大；程度深；重要；重视；不轻率' },
    { pinyin: 'chóng', def: '重复；再；层' }
  ],
  '行': [
    { pinyin: 'xíng', def: '走；流通，传递；做，办；可以；胜任' },
    { pinyin: 'háng', def: '行列；行业；某些营业机构；量词' },
    { pinyin: 'héng', def: '用于"道行"，指僧道修行的功夫' }
  ],
  '乐': [
    { pinyin: 'lè', def: '欢喜，快活；使人快乐；安乐；笑' },
    { pinyin: 'yuè', def: '声音，和谐成调的；姓' }
  ],
  '和': [
    { pinyin: 'hé', def: '相安，谐调；平静；平息争端；连带；连词' },
    { pinyin: 'hè', def: '和谐地跟着唱；依照别人的诗词题材和体裁作诗词' },
    { pinyin: 'huó', def: '在粉状物中搅拌或揉弄使粘在一起' },
    { pinyin: 'huò', def: '粉状或粒状物搀和在一起；量词' },
    { pinyin: 'hú', def: '打麻将或斗纸牌时某一家的牌合乎规定的要求' }
  ],
  '着': [
    { pinyin: 'zhe', def: '助词，表示动作正在进行或状态的持续；表示程度深' },
    { pinyin: 'zhuó', def: '穿；接触，挨上；使接触别的事物；着落' },
    { pinyin: 'zháo', def: '接触，挨上；感受，受到；燃烧；入睡' },
    { pinyin: 'zhāo', def: '下棋时下一子或走一步叫一着；计策，办法' }
  ],
  '差': [
    { pinyin: 'chà', def: '不好，不够标准；错误；缺欠' },
    { pinyin: 'chā', def: '不同，不同之点；大致还；数学上指减法运算的得数' },
    { pinyin: 'chāi', def: '派遣去做事；旧时供使唤的人；被派遣去做的事' },
    { pinyin: 'cī', def: '用于"参差"，长短不齐' }
  ],
  '了': [
    { pinyin: 'le', def: '助词，表示动作或变化已经完成；用在动词或形容词后' },
    { pinyin: 'liǎo', def: '完结，结束；明白，懂得；完全；不费力' }
  ],
  '中': [
    { pinyin: 'zhōng', def: '和四方、上下或两端距离同等的地位；内，里；性质或等级在两端之间的' },
    { pinyin: 'zhòng', def: '恰好合上；受到，遭受；科举时代考试及第' }
  ],
  '得': [
    { pinyin: 'dé', def: '获取，接受；适合；满意；完成' },
    { pinyin: 'de', def: '助词，用在动词后表示可能；用在动词后表结果或程度' },
    { pinyin: 'děi', def: '必须，须要；极舒服，极适意' }
  ],
  '数': [
    { pinyin: 'shù', def: '表示、划分或计算出来的量；技艺；几个，几' },
    { pinyin: 'shǔ', def: '一个一个地计算；比较起来突出；列举，责备' },
    { pinyin: 'shuò', def: '屡次，多次' }
  ],
  '好': [
    { pinyin: 'hǎo', def: '优点多或使人满意的；身体康健；友爱；容易' },
    { pinyin: 'hào', def: '喜爱，喜欢；容易发生的事；常常' }
  ],
  '相': [
    { pinyin: 'xiāng', def: '交互，行为动作由双方来；动作由一方来而有一定对象；亲自看' },
    { pinyin: 'xiàng', def: '容貌，样子；物体的外观；察看，判断；辅助' }
  ],
  '倒': [
    { pinyin: 'dǎo', def: '竖立的东西躺下来；对调，转移，更换' },
    { pinyin: 'dào', def: '位置上下前后翻转；反过来，相反地；向后，往后退；却' }
  ],
  '都': [
    { pinyin: 'dōu', def: '全，完全；表示语气的加重' },
    { pinyin: 'dū', def: '大都市；一国的最高行政机关所在地；美好' }
  ],
  '没': [
    { pinyin: 'méi', def: '无；不曾，未；不够，不如' },
    { pinyin: 'mò', def: '隐在水中；隐藏，隐没；漫过，高过；财物收归公有' }
  ],
  '还': [
    { pinyin: 'hái', def: '依然，仍然；更加；再，又；尚且' },
    { pinyin: 'huán', def: '回到原处或恢复原状；回报；回报别人对自己的行动' }
  ],
  '发': [
    { pinyin: 'fā', def: '送出，交付；射出；产生，出现；表达；扩大，开展' },
    { pinyin: 'fà', def: '人的前额、双耳和头颈部以上生长的毛' }
  ],
  '当': [
    { pinyin: 'dāng', def: '充任，担任；应该；介词；正在那时候或那地方' },
    { pinyin: 'dàng', def: '合宜；抵得上，等于；当作；抵押物' }
  ],
  '降': [
    { pinyin: 'jiàng', def: '下落，落下；降低，使下降' },
    { pinyin: 'xiáng', def: '投降，归顺；降伏，使驯服' }
  ],
  '率': [
    { pinyin: 'lǜ', def: '比值，两数之比；模范' },
    { pinyin: 'shuài', def: '带领；轻易地，不细想；爽直坦白；大概，大略' }
  ],
  '传': [
    { pinyin: 'chuán', def: '递，转授；表达；命令人来；发出声音' },
    { pinyin: 'zhuàn', def: '解说经义的文字；记载某人一生事迹的文字' }
  ],
  '参': [
    { pinyin: 'cān', def: '加入，在内；相间，夹杂；检验，用其他有关材料来研究' },
    { pinyin: 'shēn', def: '星名；中药名，如人参、丹参' },
    { pinyin: 'cēn', def: '用于"参差"，长短、高低、大小不齐' }
  ],
  '角': [
    { pinyin: 'jiǎo', def: '牛、羊、鹿等头上长出的坚硬的东西；形状像角的；突入海中的尖形陆地' },
    { pinyin: 'jué', def: '古代酒器；演员，或指演员演出的戏剧；竞赛' }
  ],
  '解': [
    { pinyin: 'jiě', def: '剖开，分开；把束缚着、系着的东西松开；分析，说明；理解，懂得' },
    { pinyin: 'jiè', def: '发送；押送财物或犯人' },
    { pinyin: 'xiè', def: '用于姓氏；古同"懈"' }
  ],
  '强': [
    { pinyin: 'qiáng', def: '健壮，有力；程度高；超过' },
    { pinyin: 'qiǎng', def: '硬要，迫使，尽力' },
    { pinyin: 'jiàng', def: '固执，强硬不屈' }
  ],
  '将': [
    { pinyin: 'jiāng', def: '扶助，扶持；支持；就要，快要；介词，把' },
    { pinyin: 'jiàng', def: '将领，高级的军士；带，率领' }
  ],
  '朝': [
    { pinyin: 'zhāo', def: '早晨；日，天' },
    { pinyin: 'cháo', def: '向着，对着；封建时代臣见君；宗教徒的参拜；称一姓帝王世代相继的统治时代' }
  ],
  '量': [
    { pinyin: 'liáng', def: '确定、计测东西的多少、长短、高低' },
    { pinyin: 'liàng', def: '古代指斗、升一类测定物体体积的器具；数目，数量；限度，限额' }
  ],
  '空': [
    { pinyin: 'kōng', def: '不包含什么，没有内容；没有结果的，白白地；离开地面的，在地上面的地方' },
    { pinyin: 'kòng', def: '使空，腾出来；闲着，没被利用的；亏欠' }
  ],
  '难': [
    { pinyin: 'nán', def: '不容易，做起来费事；不大可能办到，使人感到困难；不好' },
    { pinyin: 'nàn', def: '灾祸，困苦；仇怨；诘责，质问' }
  ],
  '调': [
    { pinyin: 'diào', def: '乐曲，乐谱；语音上的声调；说话的腔调；选调，提拨' },
    { pinyin: 'tiáo', def: '搭配均匀，配合适当；使搭配均匀，使协调；调理，使康复' }
  ],
  '分': [
    { pinyin: 'fēn', def: '区划开；由整体中取出或产生出一部分；散，离；辨别' },
    { pinyin: 'fèn', def: '名位、职责、权利的限度；构成事物的不同的物质或因素；料想' }
  ],
  '模': [
    { pinyin: 'mó', def: '法式，规范，标准；仿效；特指"模范"' },
    { pinyin: 'mú', def: '模子；形状，样子' }
  ],
  '宿': [
    { pinyin: 'sù', def: '住，过夜，夜里睡觉；旧有的，一向有的；年老的，久于其事的' },
    { pinyin: 'xiǔ', def: '夜，用于计算夜' },
    { pinyin: 'xiù', def: '星座' }
  ],
  '藏': [
    { pinyin: 'cáng', def: '隐避起来；收存起来' },
    { pinyin: 'zàng', def: '储放东西的地方；中国少数民族' }
  ],
  '校': [
    { pinyin: 'xiào', def: '学堂，专门进行教育的机构；军衔名；将军的' },
    { pinyin: 'jiào', def: '比较；查对，订正；古同"较"' }
  ],
  '假': [
    { pinyin: 'jiǎ', def: '不真实的，不是本来的；借用，利用；据理推断，有待验证的' },
    { pinyin: 'jià', def: '照规定或经请求批准暂时离开工作或学习场所' }
  ],
  '舍': [
    { pinyin: 'shě', def: '放弃，不要了；施舍' },
    { pinyin: 'shè', def: '居住的房子；居住，休息；谦辞，多指亲属中比自己年纪小或辈分低的' }
  ]
}

/**
 * Build Chinese definition string for multi-pronunciation characters.
 * Uses database cn_definition or MULTI_PINYIN_DEFS as source.
 */
function buildCnDefForMultiPinyin(character: string, baseCnDef: string, allPinyins: string[]): string {
  // If database already has cn_definition, keep it
  if (baseCnDef) return baseCnDef

  const entry = MULTI_PINYIN_DEFS[character]
  if (entry && entry.length > 0) {
    return entry.map(e => `${e.pinyin}  ${e.def}`).join('\n')
  }

  // Fallback: just show the pinyin list
  return allPinyins.join(' / ')
}

function getToneFromMarkedPinyin(pinyin: string): number {
  const toneMap: Record<string, number> = {
    'ā': 1, 'á': 2, 'ǎ': 3, 'à': 4,
    'ē': 1, 'é': 2, 'ě': 3, 'è': 4,
    'ī': 1, 'í': 2, 'ǐ': 3, 'ì': 4,
    'ō': 1, 'ó': 2, 'ǒ': 3, 'ò': 4,
    'ū': 1, 'ú': 2, 'ǔ': 3, 'ù': 4,
    'ǖ': 1, 'ǘ': 2, 'ǚ': 3, 'ǜ': 4
  }
  for (const ch of pinyin) {
    if (toneMap[ch]) return toneMap[ch]
  }
  return 5
}

/** Convert tone-marked pinyin back to plain pinyin (e.g. 'zhōng' -> 'zhong') */
function stripToneMarks(marked: string): string {
  return marked.replace(/[āáǎà]/g, 'a').replace(/[ēéěè]/g, 'e')
    .replace(/[īíǐì]/g, 'i').replace(/[ōóǒò]/g, 'o')
    .replace(/[ūúǔù]/g, 'u').replace(/[ǖǘǚǜ]/g, 'ü')
}

export function searchCharacters(query: string, limit = 50, gb2312Only = true): CharacterSummary[] {
  const db = getDb()
  const gbFilter = gb2312Only ? ' AND is_gb2312 = 1' : ''
  let results: CharacterSummary[]

  if (query.length === 1 && /[\u4e00-\u9fff]/.test(query)) {
    results = db
      .prepare(
        `SELECT id, character, pinyin, stroke_count, radical_id, structure, frequency, definition, cn_definition
         FROM characters WHERE character = ?${gbFilter} LIMIT ?`
      )
      .all(query, limit) as CharacterSummary[]
  } else {
    results = db
      .prepare(
        `SELECT id, character, pinyin, stroke_count, radical_id, structure, frequency, definition, cn_definition
         FROM characters
         WHERE (character LIKE ? OR pinyin LIKE ? OR definition LIKE ?)${gbFilter}
         ORDER BY frequency ASC NULLS LAST
         LIMIT ?`
      )
      .all(`%${query}%`, `%${query}%`, `%${query}%`, limit) as CharacterSummary[]
  }

  // Enrich multi-pronunciation pinyins
  return enrichPinyins(results)
}

function enrichPinyins(chars: CharacterSummary[]): CharacterSummary[] {
  for (const c of chars) {
    const allPinyins = pinyin(c.character, { toneType: 'symbol', multiple: true, type: 'array' })
    if (allPinyins.length > 1) {
      c.pinyin = allPinyins.join(' / ')
      c.cn_definition = buildCnDefForMultiPinyin(c.character, c.cn_definition || '', allPinyins)
    }
  }
  return chars
}

function enrichMultiPinyin(char: CharacterSummary | CharacterDetail) {
  const allPinyins = pinyin(char.character, { toneType: 'symbol', multiple: true, type: 'array' })
  if (allPinyins.length > 1) {
    char.pinyin = allPinyins.join(' / ')
    char.cn_definition = buildCnDefForMultiPinyin(char.character, (char as any).cn_definition || '', allPinyins)
  }
}

/**
 * Sort characters by dictionary order: pinyin alphabetical (A-Z), then stroke count ascending.
 */
function sortDictionaryOrder(chars: CharacterSummary[]): CharacterSummary[] {
  return chars.sort((a, b) => {
    const pinyinA = pinyin(a.character, { toneType: 'symbol' }).toLowerCase()
    const pinyinB = pinyin(b.character, { toneType: 'symbol' }).toLowerCase()

    // Compare pinyin alphabetically
    if (pinyinA < pinyinB) return -1
    if (pinyinA > pinyinB) return 1

    // Same pinyin -> sort by stroke count
    const strokeA = a.stroke_count || 99
    const strokeB = b.stroke_count || 99
    return strokeA - strokeB
  })
}

export function getCharacterDetail(id: number): CharacterDetail | undefined {
  const db = getDb()
  const result = db
    .prepare(
      `SELECT c.*, r.name as radical_name, r.radical as radical_char
       FROM characters c
       LEFT JOIN radicals r ON c.radical_id = r.id
       WHERE c.id = ?`
    )
    .get(id) as CharacterDetail | undefined

  if (result) enrichMultiPinyin(result)
  return result
}

export function getCharacterByChar(char: string): CharacterDetail | undefined {
  const db = getDb()
  const result = db
    .prepare(
      `SELECT c.*, r.name as radical_name, r.radical as radical_char
       FROM characters c
       LEFT JOIN radicals r ON c.radical_id = r.id
       WHERE c.character = ?`
    )
    .get(char) as CharacterDetail | undefined

  if (result) enrichMultiPinyin(result)
  return result
}

export function getCharactersByRadical(
  radicalId: number,
  limit = 200,
  offset = 0,
  gb2312Only = true
): CharacterSummary[] {
  const db = getDb()
  const gbFilter = gb2312Only ? ' AND is_gb2312 = 1' : ''
  const results = db
    .prepare(
      `SELECT id, character, pinyin, stroke_count, radical_id, structure, frequency, definition, cn_definition
       FROM characters
       WHERE radical_id = ?${gbFilter}
       LIMIT 2000 OFFSET 0`
    )
    .all(radicalId) as CharacterSummary[]

  // Enrich multi-pinyin and sort by dictionary order
  enrichPinyins(results)
  const sorted = sortDictionaryOrder(results)
  return sorted.slice(offset, offset + limit)
}

export function getCharactersByComponent(
  component: string,
  limit = 200,
  offset = 0,
  gb2312Only = true
): CharacterSummary[] {
  const db = getDb()
  const gbFilter = gb2312Only ? ' AND is_gb2312 = 1' : ''
  return db
    .prepare(
      `SELECT id, character, pinyin, stroke_count, radical_id, structure, frequency, definition, cn_definition
       FROM characters
       WHERE decomposition LIKE ?${gbFilter}
       ORDER BY frequency ASC NULLS LAST
       LIMIT ? OFFSET ?`
    )
    .all(`%${component}%`, limit, offset) as CharacterSummary[]
}

export function getSimilarCharacters(id: number, limit = 20): CharacterSummary[] {
  const db = getDb()
  const rows = db
    .prepare(
      `SELECT c.id, c.character, c.pinyin, c.stroke_count, c.radical_id, c.structure, c.frequency, c.definition
       FROM character_similarity cs
       JOIN characters c ON cs.similar_id = c.id
       WHERE cs.character_id = ?
       ORDER BY cs.score DESC
       LIMIT ?`
    )
    .all(id, limit) as CharacterSummary[]

  if (rows.length > 0) return rows

  // Fallback: compute similarity on the fly
  const source = db.prepare('SELECT * FROM characters WHERE id = ?').get(id) as any
  if (!source) return []

  const candidates = db
    .prepare(
      `SELECT id, character, pinyin, stroke_count, radical_id, structure, frequency, definition, cn_definition, decomposition
       FROM characters
       WHERE id != ? AND (radical_id = ? OR structure = ?)
       LIMIT 500`
    )
    .all(id, source.radical_id, source.structure) as any[]

  const scored = candidates.map((c) => {
    let score = 0
    if (c.radical_id === source.radical_id) score += 0.35
    const strokeDiff = Math.abs(c.stroke_count - source.stroke_count)
    const maxStrokes = Math.max(c.stroke_count, source.stroke_count, 1)
    score += 0.15 * (1 - strokeDiff / maxStrokes)
    if (c.structure === source.structure) score += 0.25
    if (source.decomposition && c.decomposition) {
      const partsA = new Set(source.decomposition.split(''))
      const partsB = new Set(c.decomposition.split(''))
      const intersection = [...partsA].filter((x) => partsB.has(x)).length
      const union = new Set([...partsA, ...partsB]).size
      if (union > 0) score += 0.25 * (intersection / union)
    }
    return { ...c, _score: score }
  })

  scored.sort((a, b) => b._score - a._score)
  return scored.slice(0, limit).map(({ _score, decomposition, ...rest }) => rest)
}
