/**
 * 字典数据构建脚本
 * 用于生成预构建的 hanzi.db 数据库
 * 运行方式: npx tsx scripts/build-dictionary.ts
 *
 * 本脚本内置了基础汉字数据（常用字 + 214 部首 + 基础词语 + 例句）
 * 完整版本需要接入 makemeahanzi / Unihan / CC-CEDICT 数据源
 */

import Database from 'better-sqlite3'
import { join } from 'path'

const DB_PATH = join(__dirname, '..', 'resources', 'hanzi.db')

// 214 康熙部首
const KANGXI_RADICALS: [number, string, string, string, number][] = [
  [1, '一', '横', 'yī', 1],
  [2, '丨', '竖', 'gǔn', 1],
  [3, '丶', '点', 'zhǔ', 1],
  [4, '丿', '撇', 'piě', 1],
  [5, '乙', '乙', 'yǐ', 1],
  [6, '亅', '竖钩', 'jué', 1],
  [7, '二', '二', 'èr', 2],
  [8, '亠', '头', 'tóu', 2],
  [9, '人', '人', 'rén', 2],
  [10, '儿', '儿', 'ér', 2],
  [11, '入', '入', 'rù', 2],
  [12, '八', '八', 'bā', 2],
  [13, '冂', '同字框', 'jiōng', 2],
  [14, '冖', '秃宝盖', 'mì', 2],
  [15, '冫', '两点水', 'bīng', 2],
  [16, '几', '几', 'jī', 2],
  [17, '凵', '凵', 'kǎn', 2],
  [18, '刀', '刀', 'dāo', 2],
  [19, '力', '力', 'lì', 2],
  [20, '勹', '包字头', 'bāo', 2],
  [21, '匕', '匕', 'bǐ', 2],
  [22, '匚', '三框', 'fāng', 2],
  [23, '匸', '匸', 'xǐ', 2],
  [24, '十', '十', 'shí', 2],
  [25, '卜', '卜', 'bǔ', 2],
  [26, '卩', '卩', 'jié', 2],
  [27, '厂', '厂', 'hàn', 2],
  [28, '厶', '私字旁', 'sī', 2],
  [29, '又', '又', 'yòu', 2],
  [30, '口', '口', 'kǒu', 3],
  [31, '囗', '围字框', 'wéi', 3],
  [32, '土', '土', 'tǔ', 3],
  [33, '士', '士', 'shì', 3],
  [34, '夂', '折文', 'zhǐ', 3],
  [35, '夊', '夊', 'suī', 3],
  [36, '夕', '夕', 'xī', 3],
  [37, '大', '大', 'dà', 3],
  [38, '女', '女', 'nǚ', 3],
  [39, '子', '子', 'zǐ', 3],
  [40, '宀', '宝盖头', 'mián', 3],
  [41, '寸', '寸', 'cùn', 3],
  [42, '小', '小', 'xiǎo', 3],
  [43, '尢', '尢', 'wāng', 3],
  [44, '尸', '尸', 'shī', 3],
  [45, '屮', '屮', 'chè', 3],
  [46, '山', '山', 'shān', 3],
  [47, '巛', '巛', 'chuān', 3],
  [48, '工', '工', 'gōng', 3],
  [49, '己', '己', 'jǐ', 3],
  [50, '巾', '巾', 'jīn', 3],
  [51, '干', '干', 'gān', 3],
  [52, '幺', '幺', 'yāo', 3],
  [53, '广', '广', 'guǎng', 3],
  [54, '廴', '建之旁', 'yǐn', 3],
  [55, '廾', '廾', 'gǒng', 3],
  [56, '弋', '弋', 'yì', 3],
  [57, '弓', '弓', 'gōng', 3],
  [58, '彐', '彐', 'jì', 3],
  [59, '彡', '三撇', 'shān', 3],
  [60, '彳', '双人旁', 'chì', 3],
  [61, '心', '心', 'xīn', 4],
  [62, '戈', '戈', 'gē', 4],
  [63, '户', '户', 'hù', 4],
  [64, '手', '手', 'shǒu', 4],
  [65, '支', '支', 'zhī', 4],
  [66, '攴', '攴', 'pū', 4],
  [67, '文', '文', 'wén', 4],
  [68, '斗', '斗', 'dǒu', 4],
  [69, '斤', '斤', 'jīn', 4],
  [70, '方', '方', 'fāng', 4],
  [71, '无', '无', 'wú', 4],
  [72, '日', '日', 'rì', 4],
  [73, '曰', '曰', 'yuē', 4],
  [74, '月', '月', 'yuè', 4],
  [75, '木', '木', 'mù', 4],
  [76, '欠', '欠', 'qiàn', 4],
  [77, '止', '止', 'zhǐ', 4],
  [78, '歹', '歹', 'dǎi', 4],
  [79, '殳', '殳', 'shū', 4],
  [80, '毋', '毋', 'wú', 4],
  [81, '比', '比', 'bǐ', 4],
  [82, '毛', '毛', 'máo', 4],
  [83, '氏', '氏', 'shì', 4],
  [84, '气', '气', 'qì', 4],
  [85, '水', '三点水', 'shuǐ', 4],
  [86, '火', '火', 'huǒ', 4],
  [87, '爪', '爪', 'zhǎo', 4],
  [88, '父', '父', 'fù', 4],
  [89, '爻', '爻', 'yáo', 4],
  [90, '爿', '爿', 'pán', 4],
  [91, '片', '片', 'piàn', 4],
  [92, '牙', '牙', 'yá', 4],
  [93, '牛', '牛', 'niú', 4],
  [94, '犬', '犬', 'quǎn', 4],
  [95, '玄', '玄', 'xuán', 5],
  [96, '玉', '玉', 'yù', 5],
  [97, '瓜', '瓜', 'guā', 5],
  [98, '瓦', '瓦', 'wǎ', 5],
  [99, '甘', '甘', 'gān', 5],
  [100, '生', '生', 'shēng', 5],
  [101, '用', '用', 'yòng', 5],
  [102, '田', '田', 'tián', 5],
  [103, '疋', '疋', 'pǐ', 5],
  [104, '疒', '病字旁', 'nè', 5],
  [105, '癶', '癶', 'bō', 5],
  [106, '白', '白', 'bái', 5],
  [107, '皮', '皮', 'pí', 5],
  [108, '皿', '皿', 'mǐn', 5],
  [109, '目', '目', 'mù', 5],
  [110, '矛', '矛', 'máo', 5],
  [111, '矢', '矢', 'shǐ', 5],
  [112, '石', '石', 'shí', 5],
  [113, '示', '示', 'shì', 5],
  [114, '禸', '禸', 'róu', 5],
  [115, '禾', '禾', 'hé', 5],
  [116, '穴', '穴', 'xué', 5],
  [117, '立', '立', 'lì', 5],
  [118, '竹', '竹', 'zhú', 6],
  [119, '米', '米', 'mǐ', 6],
  [120, '糸', '绞丝旁', 'mì', 6],
  [121, '缶', '缶', 'fǒu', 6],
  [122, '网', '网', 'wǎng', 6],
  [123, '羊', '羊', 'yáng', 6],
  [124, '羽', '羽', 'yǔ', 6],
  [125, '老', '老', 'lǎo', 6],
  [126, '而', '而', 'ér', 6],
  [127, '耒', '耒', 'lěi', 6],
  [128, '耳', '耳', 'ěr', 6],
  [129, '聿', '聿', 'yù', 6],
  [130, '肉', '月字旁', 'ròu', 6],
  [131, '臣', '臣', 'chén', 6],
  [132, '自', '自', 'zì', 6],
  [133, '至', '至', 'zhì', 6],
  [134, '臼', '臼', 'jiù', 6],
  [135, '舌', '舌', 'shé', 6],
  [136, '舛', '舛', 'chuǎn', 6],
  [137, '舟', '舟', 'zhōu', 6],
  [138, '艮', '艮', 'gèn', 6],
  [139, '色', '色', 'sè', 6],
  [140, '艸', '草字头', 'cǎo', 6],
  [141, '虍', '虎字头', 'hū', 6],
  [142, '虫', '虫', 'chóng', 6],
  [143, '血', '血', 'xuè', 6],
  [144, '行', '行', 'xíng', 6],
  [145, '衣', '衣', 'yī', 6],
  [146, '襾', '西字头', 'yà', 6],
  [147, '见', '见', 'jiàn', 7],
  [148, '角', '角', 'jiǎo', 7],
  [149, '言', '言', 'yán', 7],
  [150, '谷', '谷', 'gǔ', 7],
  [151, '豆', '豆', 'dòu', 7],
  [152, '豕', '豕', 'shǐ', 7],
  [153, '豸', '豸', 'zhì', 7],
  [154, '贝', '贝', 'bèi', 7],
  [155, '赤', '赤', 'chì', 7],
  [156, '走', '走', 'zǒu', 7],
  [157, '足', '足', 'zú', 7],
  [158, '身', '身', 'shēn', 7],
  [159, '车', '车', 'chē', 7],
  [160, '辛', '辛', 'xīn', 7],
  [161, '辰', '辰', 'chén', 7],
  [162, '辶', '走之底', 'chuò', 7],
  [163, '邑', '右耳旁', 'yì', 7],
  [164, '酉', '酉', 'yǒu', 7],
  [165, '釆', '釆', 'biàn', 7],
  [166, '里', '里', 'lǐ', 7],
  [167, '金', '金', 'jīn', 8],
  [168, '长', '长', 'cháng', 8],
  [169, '门', '门', 'mén', 8],
  [170, '阜', '左耳旁', 'fù', 8],
  [171, '隶', '隶', 'lì', 8],
  [172, '隹', '隹', 'zhuī', 8],
  [173, '雨', '雨', 'yǔ', 8],
  [174, '青', '青', 'qīng', 8],
  [175, '非', '非', 'fēi', 8],
  [176, '面', '面', 'miàn', 9],
  [177, '革', '革', 'gé', 9],
  [178, '韦', '韦', 'wéi', 9],
  [179, '韭', '韭', 'jiǔ', 9],
  [180, '音', '音', 'yīn', 9],
  [181, '页', '页', 'yè', 9],
  [182, '风', '风', 'fēng', 9],
  [183, '飞', '飞', 'fēi', 9],
  [184, '食', '食', 'shí', 9],
  [185, '首', '首', 'shǒu', 9],
  [186, '香', '香', 'xiāng', 9],
  [187, '马', '马', 'mǎ', 10],
  [188, '骨', '骨', 'gǔ', 10],
  [189, '高', '高', 'gāo', 10],
  [190, '髟', '髟', 'biāo', 10],
  [191, '斗', '斗', 'dòu', 10],
  [192, '鬯', '鬯', 'chàng', 10],
  [193, '鬲', '鬲', 'lì', 10],
  [194, '鬼', '鬼', 'guǐ', 10],
  [195, '鱼', '鱼', 'yú', 11],
  [196, '鸟', '鸟', 'niǎo', 11],
  [197, '卤', '卤', 'lǔ', 11],
  [198, '鹿', '鹿', 'lù', 11],
  [199, '麦', '麦', 'mài', 11],
  [200, '麻', '麻', 'má', 11],
  [201, '黄', '黄', 'huáng', 12],
  [202, '黍', '黍', 'shǔ', 12],
  [203, '黑', '黑', 'hēi', 12],
  [204, '黹', '黹', 'zhǐ', 12],
  [205, '黾', '黾', 'mǐn', 13],
  [206, '鼎', '鼎', 'dǐng', 13],
  [207, '鼓', '鼓', 'gǔ', 13],
  [208, '鼠', '鼠', 'shǔ', 13],
  [209, '鼻', '鼻', 'bí', 14],
  [210, '齐', '齐', 'qí', 14],
  [211, '齿', '齿', 'chǐ', 15],
  [212, '龙', '龙', 'lóng', 16],
  [213, '龟', '龟', 'guī', 16],
  [214, '龠', '龠', 'yuè', 17]
]

// 基础汉字数据: [字, 拼音, 部首ID, 笔画, 结构, 频率, 释义, 拆解]
const CHARACTERS: [string, string, number, number, string, number, string, string][] = [
  ['一', 'yī', 1, 1, '独体', 1, 'one', '一'],
  ['二', 'èr', 7, 2, '独体', 10, 'two', '二'],
  ['三', 'sān', 1, 3, '独体', 15, 'three', '三'],
  ['十', 'shí', 24, 2, '独体', 12, 'ten', '十'],
  ['人', 'rén', 9, 2, '独体', 2, 'person; people', '人'],
  ['大', 'dà', 37, 3, '独体', 3, 'big; large', '大'],
  ['中', 'zhōng', 2, 4, '独体', 4, 'middle; center', '⿻口丨'],
  ['国', 'guó', 31, 8, '包围', 5, 'country; nation', '⿴囗玉'],
  ['学', 'xué', 39, 8, '上下', 20, 'study; learn', '⿱⿻⿰⿱丷八子'],
  ['上', 'shàng', 1, 3, '独体', 6, 'up; above', '上'],
  ['下', 'xià', 1, 3, '独体', 7, 'down; below', '下'],
  ['不', 'bù', 1, 4, '独体', 8, 'not; no', '不'],
  ['是', 'shì', 72, 9, '上下', 9, 'is; am; are', '⿱日⿸𤴔乂'],
  ['了', 'le', 6, 2, '独体', 11, 'particle; finished', '了'],
  ['我', 'wǒ', 62, 7, '独体', 13, 'I; me', '⿰手戈'],
  ['他', 'tā', 9, 5, '左右', 14, 'he; him', '⿰亻也'],
  ['她', 'tā', 38, 6, '左右', 30, 'she; her', '⿰女也'],
  ['你', 'nǐ', 9, 7, '左右', 16, 'you', '⿰亻尔'],
  ['的', 'de', 106, 8, '左右', 17, 'possessive particle', '⿰白勺'],
  ['在', 'zài', 32, 6, '左右', 18, 'at; in', '⿸⿻一丿土'],
  ['有', 'yǒu', 74, 6, '上下', 19, 'have; there is', '⿸𠂇月'],
  ['这', 'zhè', 162, 7, '左右', 21, 'this', '⿺辶文'],
  ['来', 'lái', 75, 7, '独体', 22, 'come', '来'],
  ['到', 'dào', 18, 8, '左右', 23, 'arrive; to', '⿰至刂'],
  ['说', 'shuō', 149, 9, '左右', 24, 'say; speak', '⿰讠兑'],
  ['会', 'huì', 9, 6, '上下', 25, 'can; meeting', '⿱人云'],
  ['对', 'duì', 41, 5, '左右', 26, 'correct; right', '⿰又寸'],
  ['好', 'hǎo', 38, 6, '左右', 27, 'good; well', '⿰女子'],
  ['就', 'jiù', 43, 12, '左右', 28, 'then; just', '⿰京尤'],
  ['出', 'chū', 17, 5, '独体', 29, 'go out', '⿱凵山'],
  ['也', 'yě', 5, 3, '独体', 31, 'also; too', '也'],
  ['和', 'hé', 30, 8, '左右', 32, 'and; harmony', '⿰禾口'],
  ['地', 'dì', 32, 6, '左右', 33, 'earth; ground', '⿰土也'],
  ['多', 'duō', 36, 6, '上下', 34, 'many; much', '⿱夕夕'],
  ['时', 'shí', 72, 7, '左右', 35, 'time; hour', '⿰日寸'],
  ['小', 'xiǎo', 42, 3, '独体', 36, 'small; little', '小'],
  ['里', 'lǐ', 166, 7, '上下', 37, 'inside; mile', '⿱田土'],
  ['天', 'tiān', 37, 4, '独体', 38, 'sky; day', '⿱一大'],
  ['水', 'shuǐ', 85, 4, '独体', 39, 'water', '水'],
  ['火', 'huǒ', 86, 4, '独体', 100, 'fire', '火'],
  ['山', 'shān', 46, 3, '独体', 80, 'mountain', '山'],
  ['木', 'mù', 75, 4, '独体', 90, 'wood; tree', '木'],
  ['日', 'rì', 72, 4, '独体', 40, 'sun; day', '日'],
  ['月', 'yuè', 74, 4, '独体', 41, 'moon; month', '月'],
  ['金', 'jīn', 167, 8, '上下', 95, 'gold; metal', '金'],
  ['土', 'tǔ', 32, 3, '独体', 85, 'earth; soil', '土'],
  ['口', 'kǒu', 30, 3, '独体', 50, 'mouth', '口'],
  ['目', 'mù', 109, 5, '独体', 120, 'eye', '目'],
  ['手', 'shǒu', 64, 4, '独体', 55, 'hand', '手'],
  ['心', 'xīn', 61, 4, '独体', 60, 'heart; mind', '心'],
  ['河', 'hé', 85, 8, '左右', 200, 'river', '⿰氵可'],
  ['湖', 'hú', 85, 12, '左右', 400, 'lake', '⿰氵胡'],
  ['海', 'hǎi', 85, 10, '左右', 150, 'sea; ocean', '⿰氵每'],
  ['花', 'huā', 140, 7, '上下', 180, 'flower', '⿱艹化'],
  ['草', 'cǎo', 140, 9, '上下', 350, 'grass', '⿱艹早'],
  ['树', 'shù', 75, 9, '左右', 250, 'tree', '⿰木对'],
  ['林', 'lín', 75, 8, '左右', 300, 'forest', '⿰木木'],
  ['明', 'míng', 72, 8, '左右', 130, 'bright; clear', '⿰日月'],
  ['想', 'xiǎng', 61, 13, '上下', 70, 'think; want', '⿱相心'],
  ['看', 'kàn', 109, 9, '上下', 42, 'look; see', '⿱手目'],
  ['走', 'zǒu', 156, 7, '上下', 65, 'walk; go', '走'],
  ['跑', 'pǎo', 157, 12, '左右', 350, 'run', '⿰足包'],
  ['吃', 'chī', 30, 6, '左右', 110, 'eat', '⿰口乞'],
  ['喝', 'hē', 30, 12, '左右', 280, 'drink', '⿰口曷'],
  ['写', 'xiě', 14, 5, '上下', 140, 'write', '⿱冖与'],
  ['读', 'dú', 149, 10, '左右', 250, 'read', '⿰讠卖'],
  ['字', 'zì', 39, 6, '上下', 160, 'character; word', '⿱宀子'],
  ['词', 'cí', 149, 7, '左右', 220, 'word; term', '⿰讠司'],
  ['话', 'huà', 149, 8, '左右', 75, 'speech; words', '⿰讠舌'],
  ['语', 'yǔ', 149, 9, '左右', 170, 'language', '⿰讠吾'],
  ['文', 'wén', 67, 4, '独体', 45, 'writing; culture', '文'],
  ['书', 'shū', 5, 4, '独体', 125, 'book', '书'],
  ['笔', 'bǐ', 118, 10, '上下', 310, 'pen; brush', '⿱竹毛'],
  ['画', 'huà', 102, 8, '独体', 230, 'draw; painting', '画'],
  ['红', 'hóng', 120, 6, '左右', 260, 'red', '⿰纟工'],
  ['蓝', 'lán', 140, 13, '上下', 450, 'blue', '⿱艹监'],
  ['白', 'bái', 106, 5, '独体', 115, 'white', '白'],
  ['黑', 'hēi', 203, 12, '上下', 280, 'black', '黑'],
  ['马', 'mǎ', 187, 3, '独体', 200, 'horse', '马'],
  ['鱼', 'yú', 195, 8, '上下', 320, 'fish', '鱼'],
  ['鸟', 'niǎo', 196, 5, '独体', 380, 'bird', '鸟'],
  ['风', 'fēng', 182, 4, '独体', 190, 'wind', '风'],
  ['雨', 'yǔ', 173, 8, '独体', 240, 'rain', '雨'],
  ['雪', 'xuě', 173, 11, '上下', 400, 'snow', '⿱雨彐'],
  ['电', 'diàn', 102, 5, '独体', 135, 'electricity', '电'],
  ['车', 'chē', 159, 4, '独体', 105, 'car; vehicle', '车'],
  ['门', 'mén', 169, 3, '独体', 145, 'door; gate', '门'],
  ['开', 'kāi', 55, 4, '独体', 48, 'open', '开'],
  ['关', 'guān', 12, 6, '上下', 75, 'close; relation', '关'],
  ['长', 'cháng', 168, 4, '独体', 52, 'long; grow', '长'],
  ['高', 'gāo', 189, 10, '上下', 68, 'tall; high', '高'],
  ['家', 'jiā', 40, 10, '上下', 43, 'home; family', '⿱宀豕'],
  ['爱', 'ài', 87, 10, '上下', 82, 'love', '⿱爫友'],
  ['朋', 'péng', 74, 8, '左右', 270, 'friend', '⿰月月'],
  ['友', 'yǒu', 29, 4, '独体', 210, 'friend', '友'],
  ['春', 'chūn', 72, 9, '上下', 330, 'spring', '⿱春日'],
  ['夏', 'xià', 35, 10, '上下', 360, 'summer', '夏'],
  ['秋', 'qiū', 115, 9, '左右', 370, 'autumn', '⿰禾火'],
  ['冬', 'dōng', 15, 5, '上下', 340, 'winter', '冬'],
  ['东', 'dōng', 75, 5, '独体', 56, 'east', '东'],
  ['西', 'xī', 146, 6, '独体', 57, 'west', '西'],
  ['南', 'nán', 24, 9, '上下', 78, 'south', '南'],
  ['北', 'běi', 21, 5, '左右', 79, 'north', '北']
]

// 基础词语: [词, 拼音, 释义, 频率, 包含的汉字]
const WORDS: [string, string, string, number, string[]][] = [
  ['中国', 'zhōng guó', 'China', 1, ['中', '国']],
  ['学习', 'xué xí', 'study; learn', 5, ['学']],
  ['大家', 'dà jiā', 'everyone', 10, ['大', '家']],
  ['时间', 'shí jiān', 'time', 8, ['时']],
  ['出来', 'chū lái', 'come out', 15, ['出', '来']],
  ['好的', 'hǎo de', 'okay; good', 12, ['好', '的']],
  ['朋友', 'péng yǒu', 'friend', 20, ['朋', '友']],
  ['说话', 'shuō huà', 'speak; talk', 25, ['说', '话']],
  ['天气', 'tiān qì', 'weather', 30, ['天']],
  ['小心', 'xiǎo xīn', 'be careful', 35, ['小', '心']],
  ['水果', 'shuǐ guǒ', 'fruit', 40, ['水']],
  ['火车', 'huǒ chē', 'train', 45, ['火', '车']],
  ['河水', 'hé shuǐ', 'river water', 200, ['河', '水']],
  ['花草', 'huā cǎo', 'flowers and grass', 250, ['花', '草']],
  ['树林', 'shù lín', 'woods', 180, ['树', '林']],
  ['明天', 'míng tiān', 'tomorrow', 15, ['明', '天']],
  ['写字', 'xiě zì', 'write characters', 100, ['写', '字']],
  ['读书', 'dú shū', 'read books; study', 80, ['读', '书']],
  ['开门', 'kāi mén', 'open door', 120, ['开', '门']],
  ['下雨', 'xià yǔ', 'rain', 150, ['下', '雨']],
  ['看书', 'kàn shū', 'read a book', 60, ['看', '书']],
  ['走路', 'zǒu lù', 'walk', 90, ['走']],
  ['吃饭', 'chī fàn', 'eat a meal', 35, ['吃']],
  ['喝水', 'hē shuǐ', 'drink water', 50, ['喝', '水']],
  ['红花', 'hóng huā', 'red flower', 300, ['红', '花']],
  ['白天', 'bái tiān', 'daytime', 110, ['白', '天']],
  ['高山', 'gāo shān', 'high mountain', 200, ['高', '山']],
  ['大海', 'dà hǎi', 'ocean', 180, ['大', '海']],
  ['春天', 'chūn tiān', 'spring', 160, ['春', '天']],
  ['东西', 'dōng xi', 'thing; stuff', 25, ['东', '西']]
]

// 基础例句: [句子, 拼音, 翻译, 包含的汉字]
const SENTENCES: [string, string, string, string[]][] = [
  ['我是中国人。', 'wǒ shì zhōng guó rén.', 'I am Chinese.', ['我', '是', '中', '国', '人']],
  ['你好，你叫什么名字？', 'nǐ hǎo, nǐ jiào shén me míng zì?', 'Hello, what is your name?', ['你', '好', '字']],
  ['今天天气很好。', 'jīn tiān tiān qì hěn hǎo.', 'The weather is nice today.', ['天', '好']],
  ['我想学习中文。', 'wǒ xiǎng xué xí zhōng wén.', 'I want to learn Chinese.', ['我', '想', '学', '中', '文']],
  ['她在看书。', 'tā zài kàn shū.', 'She is reading a book.', ['她', '在', '看', '书']],
  ['这是我的朋友。', 'zhè shì wǒ de péng yǒu.', 'This is my friend.', ['这', '是', '我', '的', '朋', '友']],
  ['河水很清澈。', 'hé shuǐ hěn qīng chè.', 'The river water is very clear.', ['河', '水']],
  ['山上有很多树。', 'shān shàng yǒu hěn duō shù.', 'There are many trees on the mountain.', ['山', '上', '有', '多', '树']],
  ['明天我们去看花。', 'míng tiān wǒ men qù kàn huā.', 'Tomorrow we will go see flowers.', ['明', '天', '我', '看', '花']],
  ['他在家里写字。', 'tā zài jiā lǐ xiě zì.', 'He is writing characters at home.', ['他', '在', '家', '里', '写', '字']],
  ['春天来了，花开了。', 'chūn tiān lái le, huā kāi le.', 'Spring has come, flowers have bloomed.', ['春', '天', '来', '花', '开']],
  ['我喜欢读书。', 'wǒ xǐ huān dú shū.', 'I like reading.', ['我', '读', '书']],
  ['大海很美。', 'dà hǎi hěn měi.', 'The ocean is beautiful.', ['大', '海']],
  ['下雨了，小心走路。', 'xià yǔ le, xiǎo xīn zǒu lù.', 'It is raining, walk carefully.', ['下', '雨', '小', '心', '走']],
  ['火车上有很多人。', 'huǒ chē shàng yǒu hěn duō rén.', 'There are many people on the train.', ['火', '车', '上', '有', '多', '人']]
]

function build(): void {
  console.log('Building dictionary database...')
  const db = new Database(DB_PATH)

  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS radicals (
      id INTEGER PRIMARY KEY,
      radical TEXT NOT NULL,
      name TEXT,
      pinyin TEXT,
      stroke_count INTEGER,
      meaning TEXT,
      variants TEXT
    );
    CREATE TABLE IF NOT EXISTS characters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      character TEXT NOT NULL UNIQUE,
      unicode_hex TEXT NOT NULL,
      pinyin TEXT NOT NULL,
      pinyin_num TEXT,
      radical_id INTEGER REFERENCES radicals(id),
      stroke_count INTEGER NOT NULL DEFAULT 0,
      structure TEXT,
      frequency INTEGER,
      definition TEXT,
      decomposition TEXT,
      stroke_data TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_char_radical ON characters(radical_id);
    CREATE INDEX IF NOT EXISTS idx_char_freq ON characters(frequency);
    CREATE INDEX IF NOT EXISTS idx_char_strokes ON characters(stroke_count);
    CREATE INDEX IF NOT EXISTS idx_char_pinyin ON characters(pinyin);

    CREATE TABLE IF NOT EXISTS words (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      word TEXT NOT NULL,
      pinyin TEXT NOT NULL,
      definition TEXT NOT NULL,
      frequency INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_word ON words(word);

    CREATE TABLE IF NOT EXISTS character_words (
      character_id INTEGER REFERENCES characters(id),
      word_id INTEGER REFERENCES words(id),
      PRIMARY KEY (character_id, word_id)
    );
    CREATE TABLE IF NOT EXISTS sentences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sentence TEXT NOT NULL,
      pinyin TEXT,
      translation TEXT,
      source TEXT,
      difficulty INTEGER
    );
    CREATE TABLE IF NOT EXISTS character_sentences (
      character_id INTEGER REFERENCES characters(id),
      sentence_id INTEGER REFERENCES sentences(id),
      PRIMARY KEY (character_id, sentence_id)
    );
    CREATE TABLE IF NOT EXISTS user_characters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      character_id INTEGER REFERENCES characters(id),
      added_at TEXT DEFAULT (datetime('now')),
      familiarity INTEGER DEFAULT 0,
      next_review TEXT DEFAULT (datetime('now')),
      review_count INTEGER DEFAULT 0,
      notes TEXT,
      UNIQUE(character_id)
    );
    CREATE INDEX IF NOT EXISTS idx_uc_review ON user_characters(next_review);
    CREATE INDEX IF NOT EXISTS idx_uc_familiarity ON user_characters(familiarity);

    CREATE TABLE IF NOT EXISTS review_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_char_id INTEGER REFERENCES user_characters(id),
      reviewed_at TEXT DEFAULT (datetime('now')),
      rating INTEGER,
      time_spent_ms INTEGER
    );
    CREATE TABLE IF NOT EXISTS character_similarity (
      character_id INTEGER REFERENCES characters(id),
      similar_id INTEGER REFERENCES characters(id),
      score REAL,
      PRIMARY KEY (character_id, similar_id)
    );
    CREATE INDEX IF NOT EXISTS idx_sim ON character_similarity(character_id, score DESC);
  `)

  // Insert radicals
  const insertRadical = db.prepare(
    'INSERT OR REPLACE INTO radicals (id, radical, name, pinyin, stroke_count) VALUES (?, ?, ?, ?, ?)'
  )
  const insertRadicalMany = db.transaction((radicals: typeof KANGXI_RADICALS) => {
    for (const r of radicals) insertRadical.run(...r)
  })
  insertRadicalMany(KANGXI_RADICALS)
  console.log(`Inserted ${KANGXI_RADICALS.length} radicals`)

  // Insert characters
  const insertChar = db.prepare(
    `INSERT OR REPLACE INTO characters (character, unicode_hex, pinyin, radical_id, stroke_count, structure, frequency, definition, decomposition)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
  const insertCharMany = db.transaction((chars: typeof CHARACTERS) => {
    for (const c of chars) {
      const hex = c[0].codePointAt(0)!.toString(16).toUpperCase()
      insertChar.run(c[0], hex, c[1], c[2], c[3], c[4], c[5], c[6], c[7])
    }
  })
  insertCharMany(CHARACTERS)
  console.log(`Inserted ${CHARACTERS.length} characters`)

  // Build char->id map
  const charMap = new Map<string, number>()
  const allChars = db.prepare('SELECT id, character FROM characters').all() as any[]
  for (const c of allChars) charMap.set(c.character, c.id)

  // Insert words and character_words
  const insertWord = db.prepare(
    'INSERT INTO words (word, pinyin, definition, frequency) VALUES (?, ?, ?, ?)'
  )
  const insertCharWord = db.prepare(
    'INSERT OR IGNORE INTO character_words (character_id, word_id) VALUES (?, ?)'
  )
  const insertWordMany = db.transaction((words: typeof WORDS) => {
    for (const w of words) {
      const info = insertWord.run(w[0], w[1], w[2], w[3])
      const wordId = info.lastInsertRowid
      for (const ch of w[4]) {
        const cid = charMap.get(ch)
        if (cid) insertCharWord.run(cid, wordId)
      }
    }
  })
  insertWordMany(WORDS)
  console.log(`Inserted ${WORDS.length} words`)

  // Insert sentences and character_sentences
  const insertSentence = db.prepare(
    'INSERT INTO sentences (sentence, pinyin, translation) VALUES (?, ?, ?)'
  )
  const insertCharSentence = db.prepare(
    'INSERT OR IGNORE INTO character_sentences (character_id, sentence_id) VALUES (?, ?)'
  )
  const insertSentenceMany = db.transaction((sents: typeof SENTENCES) => {
    for (const s of sents) {
      const info = insertSentence.run(s[0], s[1], s[2])
      const sentId = info.lastInsertRowid
      for (const ch of s[3]) {
        const cid = charMap.get(ch)
        if (cid) insertCharSentence.run(cid, sentId)
      }
    }
  })
  insertSentenceMany(SENTENCES)
  console.log(`Inserted ${SENTENCES.length} sentences`)

  db.close()
  console.log(`Database built successfully at: ${DB_PATH}`)
}

build()
