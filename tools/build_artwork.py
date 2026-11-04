"""Render original geometric caption backdrops, luminous widget rims and a catalogue.

Authoring only: Pillow is required here, never in the proxy runtime.
"""
import json
import math
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
BACKGROUNDS = ASSETS / "captions"
BACKGROUNDS.mkdir(exist_ok=True)
PALETTES = {
    "brand": ("#35230C", "#936326"),
    "love_1": ("#6B2448", "#282048"), "love_2": ("#6D2542", "#442A69"),
    "joy_1": ("#8C4222", "#57306E"), "joy_2": ("#305A70", "#74452A"),
    "mood_1": ("#182950", "#4A2D63"), "mood_2": ("#273B56", "#493556"),
    "tease_1": ("#542772", "#163D67"), "tease_2": ("#6A285F", "#303179"),
    "gentle_1": ("#194C43", "#273D57"), "gentle_2": ("#404C29", "#1B4B50"),
}


def sparkle(draw, x, y, radius, fill):
    draw.polygon([(x, y-radius), (x+radius*.3, y-radius*.3), (x+radius, y),
                  (x+radius*.3, y+radius*.3), (x, y+radius),
                  (x-radius*.3, y+radius*.3), (x-radius, y),
                  (x-radius*.3, y-radius*.3)], fill=fill)


def backdrop(name, colors):
    gradient = Image.linear_gradient("L").resize((320, 960)).rotate(90, expand=True)
    image = ImageOps.colorize(gradient, *colors).convert("RGBA")
    art = Image.new("RGBA", image.size)
    draw = ImageDraw.Draw(art)
    family = name.split("_")[0]
    for i in range(7):
        x, y = 40+i*155, 35+(i % 3)*110
        if family == "love":
            draw.ellipse((x-16,y-16,x+4,y+4), fill=(255,185,218,35))
            draw.ellipse((x,y-16,x+20,y+4), fill=(255,185,218,35))
            draw.polygon([(x-14,y), (x+18,y), (x+2,y+22)], fill=(255,185,218,35))
        elif family == "joy":
            draw.arc((x-55,y-55,x+55,y+55), 0, 330, fill=(255,223,150,48), width=4)
            sparkle(draw,x+30,y,10,(255,238,180,65))
        elif family == "gentle":
            draw.arc((x-65,y-40,x+40,y+60), 20, 260, fill=(192,245,218,48), width=3)
            draw.ellipse((x-7,y-18,x+7,y+18), fill=(192,245,218,27))
        else:
            sparkle(draw,x,y,9 if family == "mood" else 15,(220,210,255,60))
    draw.line([(0,275),(180,225),(390,265),(620,210),(960,240)], fill=(255,255,255,22), width=2)
    image = Image.alpha_composite(image, art)
    image.convert("RGB").save(BACKGROUNDS / f"{name}.png", optimize=True)


def widget(theme, colors):
    scale, size = 2, 1024
    gradient = ImageOps.colorize(Image.linear_gradient("L").resize((size*scale,size*scale)), *colors).convert("RGBA")
    mask = Image.new("L", gradient.size)
    draw = ImageDraw.Draw(mask)
    for inset, width in [(18, 16), (48, 3), (61, 2)]:
        draw.rounded_rectangle(tuple(v*scale for v in (inset,inset,1024-inset,1024-inset)), radius=(194-inset)*scale, outline=255, width=width*scale)
    glow = mask.filter(ImageFilter.GaussianBlur(10*scale)).point(lambda v: min(150,int(v*2)))
    alpha = Image.frombytes("L", mask.size, bytes(max(a,b) for a,b in zip(mask.tobytes(),glow.tobytes())))
    gradient.putalpha(alpha)
    stars = Image.new("RGBA", gradient.size)
    draw = ImageDraw.Draw(stars)
    for x,y,r in [(280,26,10),(720,26,6),(26,390,8),(998,650,11),(400,998,7),(800,980,8)]:
        sparkle(draw,x*scale,y*scale,r*scale,(255,248,233,245))
    gradient = Image.alpha_composite(gradient,stars)
    # Explicitly clear the photo area; the rim must never hide the center of a Locket.
    clear = Image.new("L",gradient.size)
    ImageDraw.Draw(clear).rounded_rectangle((90*scale,90*scale,934*scale,934*scale),radius=110*scale,fill=255)
    gradient.putalpha(Image.composite(Image.new("L",gradient.size,0),gradient.getchannel("A"),clear))
    gradient = gradient.resize((size,size),Image.Resampling.LANCZOS)
    assert gradient.getpixel((512,512))[3] == 0
    gradient.save(ASSETS / f"widget-{theme}.png",optimize=True)


if "--preview-only" not in sys.argv:
    for name, colors in PALETTES.items():
        backdrop(name, colors)
    widget("aura",("#B4A0FF","#FF8DC2"))
    widget("gold",("#FFF0AE","#D79D3E"))
    widget("rose",("#FFD2E6","#CF75A4"))

catalogue = json.loads((ROOT / "content/captions.json").read_text())
font_path = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
font = ImageFont.truetype(font_path,20)
small = ImageFont.truetype(font_path,13)
title = ImageFont.truetype(font_path,28)
cards = [(group,index,item) for group in catalogue for index,item in enumerate(group["items"])]
columns, width, height = 3, 480, 108
sheet = Image.new("RGB",(columns*width+48,math.ceil(len(cards)/columns)*height+100),"#10131D")
draw = ImageDraw.Draw(sheet)
draw.text((24,18),f"Cuios • {len(cards)} ghi chú • 90 nền riêng, 12 phong cách",font=title,fill="#FFFFFF")
for n,(group,index,item) in enumerate(cards):
    name = "brand" if group["id"] == "brand" else group["background"]+"_"+str(index%2+1)
    decoration = item[3] if group["id"] != "brand" and len(item) > 3 else None
    image_path = ASSETS/decoration["image"] if decoration else BACKGROUNDS/f"{name}.png"
    card = Image.open(image_path).convert("RGB").resize((width-16,height-14),Image.Resampling.LANCZOS)
    x,y = 24+(n%columns)*width,76+(n//columns)*height
    sheet.paste(card,(x,y))
    draw.text((x+16,y+10),f"{n+1:02d}  {group['section']}",font=small,fill="#E3DCED")
    text = item[1]
    shrimp = group["id"] == "brand" and item[0] == "cun"
    if shrimp: text = "Cưn"
    draw.text((x+16,y+42),text,font=font,fill="#FFFFFF")
    if shrimp:
        # A tiny geometric shrimp in the preview; iOS renders the real 🍤 emoji.
        draw.arc((x+69,y+40,x+99,y+70),15,290,fill="#FFB48F",width=8)
        draw.ellipse((x+81,y+42,x+96,y+54),fill="#FFC49D")
        draw.ellipse((x+87,y+44,x+90,y+47),fill="#3F2B13")
        draw.polygon([(x+93,y+64),(x+104,y+61),(x+102,y+72)],fill="#F18E72")
sheet.save(ASSETS/"captions-preview.jpg",quality=92)
print(f"Built {len(cards)}-caption preview" + (" only" if "--preview-only" in sys.argv else " and original artwork assets"))
