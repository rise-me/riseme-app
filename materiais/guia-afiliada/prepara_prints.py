# Recorta os prints da Hotmart, borra dados pessoais e marca onde tocar (quadrado vermelho + seta).
import sys
from PIL import Image, ImageDraw, ImageFilter
SRC, OUT = sys.argv[1], sys.argv[2]
RED = (226, 35, 35)

def blur(im, box, r=14):
    reg = im.crop(box).filter(ImageFilter.GaussianBlur(r))
    im.paste(reg, box)

def mark(im, box, arrow='left', pad=6):
    d = ImageDraw.Draw(im)
    x0, y0, x1, y1 = box[0]-pad, box[1]-pad, box[2]+pad, box[3]+pad
    d.rounded_rectangle((x0, y0, x1, y1), radius=8, outline=RED, width=5)
    cy, cx = (y0+y1)//2, (x0+x1)//2
    L = 70
    if arrow == 'left':
        tip = (x0-8, cy); tail = (x0-8-L, cy)
        head = [tip, (tip[0]-22, cy-14), (tip[0]-22, cy+14)]
    elif arrow == 'right':
        tip = (x1+8, cy); tail = (x1+8+L, cy)
        head = [tip, (tip[0]+22, cy-14), (tip[0]+22, cy+14)]
    elif arrow == 'up':
        tip = (cx, y1+8); tail = (cx, y1+8+L)
        head = [tip, (cx-14, tip[1]+22), (cx+14, tip[1]+22)]
    else:  # down
        tip = (cx, y0-8); tail = (cx, y0-8-L)
        head = [tip, (cx-14, tip[1]-22), (cx+14, tip[1]-22)]
    d.line([tail, tip], fill=RED, width=7)
    d.polygon(head, fill=RED)

def job(name, out, crop, blurs=(), marks=()):
    im = Image.open(f'{SRC}/{name}').convert('RGB')
    for b in blurs: blur(im, b)
    for m in marks: mark(im, *m)
    im = im.crop(crop)
    im.save(f'{OUT}/{out}', quality=90)
    print(out, im.size)

# 1. página de afiliação no celular (sem login)
job('01-pagina-afiliacao.jpg', 'p1-link.jpg', (0, 0, 606, 723),
    marks=[((320, 677, 526, 718), 'down')])
# 2. tela de entrada (e-mail e senha da conta de teste borrados)
job('03-login-es.jpg', 'p2-entrar.jpg', (150, 190, 700, 690),
    blurs=[(176, 381, 553, 415), (176, 456, 553, 490)],
    marks=[((175, 566, 554, 606), 'right'), ((175, 504, 346, 526), 'right')])
# 3. Afiliarse Ahora
job('04-afiliarse-ahora.jpg', 'p3-afiliarse.jpg', (157, 186, 1134, 420),
    marks=[((896, 252, 1121, 283), 'down')])
# 4. copiar o link (código da afiliada de teste borrado)
job('05-hotlinks.jpg', 'p4-copiar.jpg', (88, 448, 1052, 562),
    blurs=[(240, 494, 335, 514)],
    marks=[((937, 488, 1036, 520), 'left')])
# 5. onde achar o link depois (foto do perfil borrada)
job('06-soy-afiliado.jpg', 'p5-mis-productos.jpg', (0, 55, 1000, 760),
    blurs=[(1250, 6, 1295, 46)],
    marks=[((40, 178, 145, 205), 'right'), ((344, 342, 436, 368), 'down'), ((431, 711, 453, 733), 'right')])
