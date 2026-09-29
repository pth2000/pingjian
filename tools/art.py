"""画像处理：把 AI 画好的图变成游戏里用的 webp，放进 assets/art/，构建时自动嵌进页面。

用法（在项目根目录）：
  python3 tools/art.py avatar 图.png xieyue [--center 600,470 --radius 400]
      头像：从原图裁一个正方形（游戏里再裁成圆），存成 assets/art/avatar_<id>.webp（256×256）。
      不给 --center/--radius 时按「脸在中间偏上」自动裁；不满意就看预览图，给出圆心和半径（原图像素）再跑。
  python3 tools/art.py full 图.png xieyue
      立绘：自动抠掉纸色背景（rembg，isnet-anime 模型），裁掉四周空白；人太瘦长时两侧补透明边，
      让各人在卡片里一样大。存成 assets/art/full_<id>.webp（宽 520）。
  python3 tools/art.py player m 图.png [--center x,y --radius r]
      玩家头像（m 青衫 / f 红袖），存成 assets/art/player_<m|f>.webp。

每次都会在 tests/out/ 下存一张预览图（头像：几种尺寸的圆形；立绘：浅色和深色底）。
对手 id：wuming 守中、chong 惊雷、laogui 磐石、xieyue 斜月、yehu 飞鸿、atu 如影。
需要：pip install pillow rembg onnxruntime
"""
import argparse, os
from PIL import Image, ImageDraw

SITE = (230, 234, 228)
os.makedirs('tests/out', exist_ok=True)


def circ(img, cx, cy, r, size):
    c = img.crop((cx - r, cy - r, cx + r, cy + r)).resize((size, size), Image.LANCZOS)
    m = Image.new('L', (size * 4, size * 4), 0)
    ImageDraw.Draw(m).ellipse((0, 0, size * 4 - 1, size * 4 - 1), fill=255)
    o = Image.new('RGB', (size, size), SITE)
    o.paste(c, (0, 0), m.resize((size, size), Image.LANCZOS))
    return o


def square(src, center, radius, out, name):
    im = Image.open(src).convert('RGB')
    w, h = im.size
    if center: cx, cy = map(int, center.split(','))
    else: cx, cy = w // 2, int(h * 0.4)
    r = radius or int(min(w, h) * 0.33)
    r = min(r, cx, cy, w - cx, h - cy)
    im.crop((cx - r, cy - r, cx + r, cy + r)).resize((256, 256), Image.LANCZOS).save(out, quality=84, method=6)
    pv = Image.new('RGB', (420, 150), SITE); x = 10
    for s in (120, 72, 44, 26):
        pv.paste(circ(im, cx, cy, r, s), (x, 10 + (120 - s) // 2)); x += s + 24
    pv.save(f'tests/out/preview_{name}.png')
    print(f'{out}  (圆心 {cx},{cy} 半径 {r})  预览 tests/out/preview_{name}.png')


def full(src, name):
    from rembg import remove, new_session
    im = remove(Image.open(src).convert('RGB'), session=new_session('isnet-anime')).convert('RGBA')
    x0, y0, x1, y1 = im.getchannel('A').point(lambda v: 255 if v > 20 else 0).getbbox()
    im = im.crop((max(0, x0 - 10), max(0, y0 - 10), min(im.width, x1 + 10), min(im.height, y1 + 10)))
    if im.width / im.height < 0.56:               # 太瘦长：补透明边，和其他人一样大
        c = Image.new('RGBA', (round(im.height * 0.58), im.height), (0, 0, 0, 0)); c.paste(im, ((c.width - im.width) // 2, 0)); im = c
    im = im.resize((520, round(im.height * 520 / im.width)), Image.LANCZOS)
    out = f'assets/art/full_{name}.webp'; im.save(out, quality=80, method=6)
    pv = Image.new('RGB', (640, 470), (0, 0, 0))
    for k, bg in enumerate([(243, 245, 240), (34, 33, 31)]):
        t = im.resize((300, round(im.height * 300 / im.width))).crop((0, 0, 300, 450))
        b = Image.new('RGBA', t.size, bg + (255,)); b.alpha_composite(t); pv.paste(b.convert('RGB'), (10 + k * 320, 10))
    pv.save(f'tests/out/preview_full_{name}.png')
    print(f'{out}  {im.size}  预览 tests/out/preview_full_{name}.png')


ap = argparse.ArgumentParser(description='画像处理')
sp = ap.add_subparsers(dest='cmd', required=True)
a = sp.add_parser('avatar'); a.add_argument('src'); a.add_argument('id'); a.add_argument('--center'); a.add_argument('--radius', type=int)
f = sp.add_parser('full'); f.add_argument('src'); f.add_argument('id')
p = sp.add_parser('player'); p.add_argument('g', choices=['m', 'f']); p.add_argument('src'); p.add_argument('--center'); p.add_argument('--radius', type=int)
x = ap.parse_args()
if x.cmd == 'avatar': square(x.src, x.center, x.radius, f'assets/art/avatar_{x.id}.webp', x.id)
elif x.cmd == 'player': square(x.src, x.center, x.radius, f'assets/art/player_{x.g}.webp', 'player_' + x.g)
else: full(x.src, x.id)
