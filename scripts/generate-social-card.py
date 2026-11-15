"""Optional local typography asset generation; the PNG is committed for CI."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parents[1]
canvas = Image.new('RGB', (1200, 630), '#f8f8f3')
draw = ImageDraw.Draw(canvas)
font = '/System/Library/Fonts/Supplemental/AppleGothic.ttf'
def text(x, y, value, size, color='#202a25'):
    draw.text((x, y), value, fill=color, font=ImageFont.truetype(font, size))
draw.rectangle((0, 0, 16, 630), fill='#355d46')
text(72, 65, 'JONGTAE LEE  /  이종태', 28, '#355d46')
draw.line((72, 126, 1128, 126), fill='#d8ded5', width=2)
text(72, 183, '예약이 결제가 되고,', 62)
text(72, 269, '실제 여행이 되기까지.', 62)
text(76, 408, 'Backend Engineer · Database & Operations', 30, '#355d46')
text(76, 516, '데이터 모델부터 결제 정합성, 배포와 복구까지.', 26, '#626e65')
target = root / 'src/assets/social-card.png'
canvas.save(target, optimize=True)
print('Generated social-card.png (1200 × 630)')
