"""Create 90 reproducible, individual caption textures; never touch branded artwork.

Authoring dependencies: Pillow and NumPy. No generation or randomness in the proxy.
"""
from pathlib import Path
import hashlib
import io
import json
import math
import random

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
VERSION = "4.0.2"
SEED = "cuios-94-art-v1"
WIDTH, HEIGHT = 768, 256
DEST = ROOT / "assets" / "captions" / ("v" + VERSION)
STYLES = ["aurora", "hologram", "neon", "galaxy", "prism", "liquid",
          "silk", "ember", "ocean", "bloom", "sunset", "cyber"]
PALETTES = [
    ("#111032", "#9380FF", "#FF6FC9", "#7CF5E7"),
    ("#081C2B", "#28E3C0", "#6D82FF", "#BCFFE3"),
    ("#29102C", "#FF5FA2", "#B584FF", "#FFE1AD"),
    ("#24150D", "#FFAA51", "#F4689C", "#FFE4A4"),
    ("#101F35", "#48BFFF", "#8C93FF", "#BCF6FF"),
    ("#1F1236", "#C679FF", "#FC8AAB", "#AAECFF"),
    ("#10261F", "#8DE1AC", "#45B6D4", "#F6EDAC"),
    ("#281527", "#F4A3C5", "#AD9CF4", "#FFF0D6"),
    ("#151C31", "#739AE8", "#51E3DD", "#E3B9FC"),
    ("#2A171B", "#FF8573", "#ECA66F", "#FCE8B6"),
    ("#17182E", "#A7B6ED", "#E99DDE", "#B2E8FC"),
    ("#12252A", "#60CDC7", "#9B98E8", "#D4FFE9"),
]


def rgb(value):
    return np.array([int(value[i:i+2], 16) for i in (1, 3, 5)], dtype=np.float32)


def color_hex(value):
    return "#" + "".join(f"{int(v):02X}" for v in np.clip(value, 0, 255))


def seed_for(key):
    return int.from_bytes(hashlib.sha256((SEED + key).encode()).digest()[:8], "big")


def render(style, palette, seed):
    rng = random.Random(seed)
    base, first, second, accent = [rgb(c) for c in palette]
    y, x = np.mgrid[-1:1:complex(HEIGHT), -3:3:complex(WIDTH)]
    x, y = x.astype(np.float32), y.astype(np.float32)
    phase, tilt = rng.uniform(-math.pi, math.pi), rng.uniform(-0.38, 0.38)
    u, v = x + y * tilt, y - x * tilt * .15
    canvas = np.broadcast_to(base, (HEIGHT, WIDTH, 3)).copy()
    canvas *= (.8 + .25 * np.sin(u * .75 + phase) ** 2)[..., None]

    def glow(mask, color, power=1):
        nonlocal canvas
        canvas += np.clip(mask, 0, 1)[..., None] * color * power

    glow(np.exp(-((u+1.8)**2/3 + (v+.55)**2/1.3)), first, .25)
    glow(np.exp(-((u-1.7)**2/3 + (v-.6)**2/1.1)), second, .27)
    if style in ("aurora", "neon"):
        for i, color in enumerate([first, second, accent]):
            path = .5 * np.sin(u * (.72+i*.17) + phase+i) + (i-1)*.33
            distance = v-path
            glow(np.exp(-distance**2/(.018 if style == "neon" else .085)), color, .62)
            glow(np.exp(-distance**2/.0008), color, .5 if style == "neon" else .15)
    elif style == "hologram":
        surface = np.sin(u*2.7+v*3.2+phase+1.4*np.sin(v*2-u*.5))
        glow((surface+1)*.5, first, .39)
        glow((np.cos(u*3.2-v*2.1+phase)+1)*.5, second, .33)
        glow(np.exp(-surface**2/.022), accent, .38)
    elif style == "galaxy":
        nebula = np.sin(u*1.4+phase)+.55*np.cos(v*3.5-u*.7)
        glow(np.exp(-(nebula-v*.7)**2/.43), first, .47)
        glow(np.exp(-((u-1.1)**2/2+(v+.22)**2/.22)), second, .48)
    elif style == "liquid":
        liquid = np.sin(u*1.6+phase+1.2*np.cos(v*2.4))+.7*np.sin(v*3.3-u*.8)
        glow((np.sin(liquid*2)+1)*.5, first, .36)
        glow((np.cos(liquid*3+phase)+1)*.5, second, .33)
        glow(np.exp(-np.sin(liquid*2.6)**2/.012), accent, .27)
    elif style == "silk":
        folds = u*2.5+v*.9+1.7*np.sin(v*2+phase)
        glow((np.cos(folds)+1)**2*.25, first, .5)
        glow((np.sin(folds*.7+phase)+1)*.5, second, .22)
        glow(np.exp(-np.sin(folds)**2/.018), accent, .18)
    elif style == "ember":
        glow(np.exp(-((v-.8)**2/.65)), first, .65)
        for i in range(5):
            path = (i-2)*1.35 + .28*np.sin(v*3+i+phase)
            glow(np.exp(-(u-path)**2/.035)*(v+1)*.5, second if i%2 else accent, .33)
    elif style == "ocean":
        radius = np.sqrt((u-1.6)**2+(v+.45)**2*2)
        glow((np.sin(radius*13+phase)+1)*.5*np.exp(-radius*.3), first, .26)
        glow(np.exp(-(v-.4*np.sin(u*1.3+phase))**2/.15), second, .39)
    elif style == "bloom":
        for cx, cy in [(-2.4,-.75),(2.2,.7)]:
            dx, dy = u-cx, v-cy
            angle, radius = np.arctan2(dy, dx), np.sqrt(dx**2+dy**2)
            flower = np.exp(-(radius-(.5+.22*np.cos(angle*5+phase)))**2/.036)
            glow(flower, first if cx<0 else second, .65)
            glow(np.exp(-radius**2/.13), accent, .32)
    elif style == "sunset":
        glow(np.exp(-(v+.25)**2/.32), first, .59)
        glow(np.exp(-(v-.45)**2/.26), second, .36)
        glow(np.exp(-((u-1.65)**2/.28+(v+.3)**2/.28)), accent, .58)
        glow(np.sin(u*2+v*10+phase)**2*np.exp(-(v-.4)**2/.45), first, .13)
    elif style == "prism":
        glow((np.sin(u*1.5+v*2+phase)+1)*.5, first, .35)
        glow((np.cos(u*1.1-v*3+phase)+1)*.5, second, .23)
    elif style == "cyber":
        glow(np.exp(-(v-.5)**2/.18), first, .4)
        glow(np.exp(-((u+1.9)**2/.9+(v+.4)**2/.4)), second, .45)

    image = Image.fromarray(np.uint8(np.clip(canvas, 0, 255))).convert("RGBA")
    overlay = Image.new("RGBA", image.size)
    draw = ImageDraw.Draw(overlay)
    a, b, c = [tuple(int(n) for n in color) for color in (first, second, accent)]
    if style == "prism":
        for i in range(9):
            cx = rng.randint(-90, WIDTH+90)
            points = [(cx, -30), (cx+rng.randint(90,250), HEIGHT+30), (cx+rng.randint(-120,30), HEIGHT+30)]
            draw.polygon(points, fill=(*[a,b][i%2], rng.randint(28,65)))
            draw.line(points[:2], fill=(*c,70), width=1)
    if style == "cyber":
        horizon = HEIGHT*.45
        for bottom in range(-WIDTH, WIDTH*2, 80):
            draw.line([(WIDTH/2,horizon),(bottom,HEIGHT)], fill=(*a,88), width=1)
        for k in range(1,9):
            row = horizon+(HEIGHT-horizon)*(k/8)**2
            draw.line([(0,row),(WIDTH,row)], fill=(*b,90), width=1)
    if style in ("ocean", "hologram"):
        for _ in range(8):
            cx, cy, radius = rng.randint(0,WIDTH), rng.randint(-40,HEIGHT+40), rng.randint(14,65)
            draw.ellipse((cx-radius,cy-radius,cx+radius,cy+radius), outline=(*c,45), width=1)
            draw.arc((cx-radius+3,cy-radius+3,cx+radius-3,cy+radius-3), 205,275, fill=(*c,110), width=1)
    sparkles = 90 if style == "galaxy" else 30 if style == "ember" else 9
    for _ in range(sparkles):
        cx, cy = rng.randrange(WIDTH), rng.randrange(HEIGHT)
        if abs(cx-WIDTH/2)<WIDTH*.32 and abs(cy-HEIGHT/2)<HEIGHT*.22:
            continue
        radius = rng.choice([1,1,1,2,3])
        opacity = rng.randint(70,210)
        draw.ellipse((cx-radius,cy-radius,cx+radius,cy+radius),fill=(*c,opacity))
        if radius==3 and style!="ember":
            draw.line([(cx-7,cy),(cx+7,cy)],fill=(*c,opacity//2),width=1)
            draw.line([(cx,cy-7),(cx,cy+7)],fill=(*c,opacity//2),width=1)
    glow_layer = overlay.filter(ImageFilter.GaussianBlur(4))
    image = Image.alpha_composite(Image.alpha_composite(image,glow_layer),overlay)
    # Keep the native white caption readable; effects remain strongest at the edges.
    pixels = np.asarray(image.convert("RGB"),dtype=np.float32)
    central = np.exp(-((x/2.2)**2+(y/.62)**2))
    pixels *= (1-.32*central)[...,None]
    # Suppress overbright ribbons under the white caption without flattening the edges.
    luminance = np.sum((pixels/255)**2.2 * np.array([.2126,.7152,.0722]),axis=2)
    contrast = np.minimum(1,(.14/np.maximum(luminance,1e-5))**(1/2.2))
    text_band = np.exp(-(y/.44)**8)
    pixels *= (1-text_band*(1-contrast))[...,None]
    image = Image.fromarray(np.uint8(np.clip(pixels,0,255)))
    # A palette PNG keeps 90 backgrounds small enough for mobile loading.
    return image.quantize(colors=256,method=Image.Quantize.MEDIANCUT,dither=Image.Dither.NONE)


def main():
    catalogue = json.loads((ROOT/"content/captions.json").read_text())
    captions = [(group,item) for group in catalogue if group["id"]!="brand" for item in group["items"]]
    assert len(captions)==90
    DEST.mkdir(exist_ok=True,parents=True)
    rng = random.Random(SEED)
    styles = (STYLES*8)[:len(captions)]
    rng.shuffle(styles)
    manifest = {"version":VERSION,"seed":SEED,"width":WIDTH,"height":HEIGHT,"items":[]}
    for (group,item),style in zip(captions,styles):
        key = group["id"]+"_"+item[0]
        seed = seed_for(key)
        local = random.Random(seed)
        palette = PALETTES[local.randrange(len(PALETTES))]
        image = render(style,palette,seed)
        output = io.BytesIO()
        image.save(output,format="PNG",optimize=True)
        data = output.getvalue()
        digest = hashlib.sha256(data).hexdigest()
        name = key+"-"+digest[:10]+".png"
        (DEST/name).write_bytes(data)
        first,second = rgb(palette[0]),rgb(palette[1])
        colors = [color_hex(first*local.uniform(.85,1.3)),color_hex(first*.6+second*local.uniform(.19,.33))]
        decoration = {"style":style,"image":"captions/v"+VERSION+"/"+name,"colors":colors}
        item[3:] = [decoration]
        manifest["items"].append({"id":"cuios_"+key,**decoration,"sha256":digest,"bytes":len(data)})
    (ROOT/"content/captions.json").write_text(json.dumps(catalogue,ensure_ascii=False,indent=2)+"\n")
    (ROOT/"content/caption_backgrounds.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+"\n")
    total = sum(item["bytes"] for item in manifest["items"])
    print(f"Built {len(captions)} distinct backgrounds, {len(STYLES)} styles, {total/1024/1024:.2f} MiB; brand untouched")


if __name__=="__main__":
    main()
