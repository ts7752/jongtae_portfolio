"""Optional local typography asset generation; the PNG is committed for CI."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parents[1]
canvas = Image.new('RGB', (1200, 630), '#f4f5f7')
draw = ImageDraw.Draw(canvas)
font = '/System/Library/Fonts/Supplemental/AppleGothic.ttf'
def text(x, y, value, size, color='#171b24'):
    draw.text((x, y), value, fill=color, font=ImageFont.truetype(font, size))
draw.rectangle((0, 0, 225, 630), fill='#171b24')
text(38, 68, '이종태', 35, '#ffffff')
text(38, 128, 'JONGTAE', 17, '#b9c6ed')
text(38, 158, 'LEE', 17, '#b9c6ed')
text(38, 467, '서비스 개발', 22, '#ffffff')
text(38, 501, '배포와 운영', 22, '#ffffff')
text(283, 70, '기획 · 설계 · 개발 · 배포 · 운영', 22, '#626775')
draw.line((283, 122, 1138, 122), fill='#dce0e7', width=2)
text(283, 190, '서비스를 만들고', 65)
text(283, 282, '운영까지 이어갑니다', 65, '#2855e7')
text(285, 414, '개발자 이종태의 서비스 개발과 운영 경험', 25, '#626775')
draw.rectangle((225, 560, 1200, 630), fill='#2855e7')
target = root / 'src/assets/social-card.png'
canvas.save(target, optimize=True)
print('Generated social-card.png (1200 × 630)')
