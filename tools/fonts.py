# 字体子集：把页面上用到的毛笔字、等宽数字裁成小子集，生成 styles/fonts.css（base64 内嵌）。
# 不依赖 Google Fonts（国内常打不开），离线也一样。
# 用法（在项目根目录）：python3 tools/fonts.py      需要：pip install fonttools brotli；npm install（取字体源文件）
# 新加了要用毛笔字显示的字：加进下面的 static 再跑一遍。
import re, base64, io, glob
from fontTools.ttLib import TTFont
from fontTools import subset

FS = 'node_modules/@fontsource/ma-shan-zheng/'
book = open('src/openings/openings.js', encoding='utf-8').read()
names = ''.join(re.findall(r"'([一-鿿]{2})'", book.split('const OPENINGS')[1].split('].map')[0]))
marks = '中雷磐月鸿影' + '陈棠晴'
static = ('枰间五子棋弈胜负和黑白平局' '人机对弈双定式杀法练习战绩谱规则与说明关于主页继续开始'
          '直指斜指局第题0123456789基本术语'
          '守中惊雷磐石斜月飞鸿如影随机成就铜银金?'
          '初白登宗破靡和缘服英速鏖翻独绝瓮览博循尽试门全气友教复'
          '札记档案' '临溪渡馆'
          '开一局再来一盘继续我的熟客今日下道'
          '谁执先摆颗单？')             # 猜先卡的标题
achg = ''.join(re.findall(r"g: '(.)'", open('src/features/achievements.js', encoding='utf-8').read()))   # 成就印章上的字
chars = sorted(set(names + marks + static + achg))
print('brush glyphs:', len(chars), ''.join(chars))

# fontsource 的切片：每片的 unicode-range
css = open(FS + 'index.css', encoding='utf-8').read()
faces = re.findall(r"ma-shan-zheng-\[(\d+)\]-400-normal \*/.*?unicode-range: ([^;]+);", css, re.S)
def in_range(cp, rng):
    for part in rng.split(','):
        part = part.strip()[2:]
        a, _, b = part.partition('-')
        if int(a, 16) <= cp <= int(b or a, 16): return True
    return False
need = {}
for c in chars:
    for idx, rng in faces:
        if in_range(ord(c), rng): need.setdefault(idx, []).append(c); break
    else: print('MISSING', c)

out = []
for idx, cs in need.items():
    f = TTFont(FS + f'files/ma-shan-zheng-{idx}-400-normal.woff2')
    opt = subset.Options(); opt.flavor = 'woff2'; opt.layout_features = []; opt.name_IDs = []; opt.notdef_outline = False
    sub = subset.Subsetter(opt); sub.populate(text=''.join(cs)); sub.subset(f)
    buf = io.BytesIO(); f.flavor = 'woff2'; f.save(buf)
    rng = ','.join(f'U+{ord(c):x}' for c in cs)
    out.append(f"@font-face{{font-family:'Ma Shan Zheng';font-display:swap;src:url(data:font/woff2;base64,{base64.b64encode(buf.getvalue()).decode()}) format('woff2');unicode-range:{rng}}}")
JB = 'node_modules/@fontsource/jetbrains-mono/files/'
jb_rng = open('node_modules/@fontsource/jetbrains-mono/index.css', encoding='utf-8').read()
latin = re.search(r"jetbrains-mono-latin-400-normal \*/.*?unicode-range: ([^;]+);", jb_rng, re.S).group(1)
for w in (400, 600):
    f = TTFont(JB + f'jetbrains-mono-latin-{w}-normal.woff2')
    opt = subset.Options(); opt.flavor = 'woff2'; opt.layout_features = ['kern', 'tnum']; opt.name_IDs = []
    sub = subset.Subsetter(opt); sub.populate(text=''.join(chr(c) for c in range(0x20, 0x7f)) + '·–—×…%'); sub.subset(f)
    buf = io.BytesIO(); f.flavor = 'woff2'; f.save(buf)
    out.append(f"@font-face{{font-family:'JetBrains Mono';font-weight:{w};font-display:swap;src:url(data:font/woff2;base64,{base64.b64encode(buf.getvalue()).decode()}) format('woff2');unicode-range:U+20-7e,U+b7,U+d7,U+2013-2014,U+2026,U+25}}")
open('styles/fonts.css', 'w', encoding='utf-8', newline='\n').write('\n'.join(out) + '\n')
print('styles/fonts.css', sum(len(x) for x in out), 'bytes')
