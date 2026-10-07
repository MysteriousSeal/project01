"""Generates the Orbit Hop app icon, Android adaptive layers, splash image and favicon.

Flat, minimal style: solid colors only. Run from the game folder: python3 scripts/generate-assets.py
"""
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parent.parent / "assets"
SIZE = 1024
SS = 4
N = SIZE * SS

SPACE = (11, 16, 38)
PLANET = (154, 215, 255)
RING = (255, 255, 255)
MINT = (125, 255, 178)
WHITE = (255, 255, 255)

ORBIT_R = 300
RING_W = 18
PLANET_R = 175
BALL_R = 70
BALL_ANGLE = -math.pi / 4
TRAIL = [(0.44, 0.42, 150), (0.76, 0.26, 80)]


def px(v):
    return int(round(v * SS))


def circle(draw, cx, cy, r, **kw):
    draw.ellipse([px(cx - r), px(cy - r), px(cx + r), px(cy + r)], **kw)


def at(cx, cy, r, angle):
    return cx + math.cos(angle) * r, cy + math.sin(angle) * r


def art(cx, cy, k, mono=False):
    layer = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    orbit, ball = ORBIT_R * k, BALL_R * k
    circle(d, cx, cy, orbit, outline=(*RING, 255 if mono else 70), width=px(RING_W * k))
    circle(d, cx, cy, PLANET_R * k, fill=(*(WHITE if mono else PLANET), 255))
    for gap, scale, alpha in TRAIL:
        x, y = at(cx, cy, orbit, BALL_ANGLE - gap)
        circle(d, x, y, ball * scale, fill=(*(WHITE if mono else MINT), 255 if mono else alpha))
    bx, by = at(cx, cy, orbit, BALL_ANGLE)
    if not mono:
        circle(d, bx, by, ball + 16 * k, fill=(*SPACE, 255))
    circle(d, bx, by, ball, fill=(*(WHITE if mono else MINT), 255))
    return layer


def wordmark(layer, cy):
    d = ImageDraw.Draw(layer)
    heavy = ImageFont.truetype("/System/Library/Fonts/Avenir Next.ttc", px(150), index=8)
    mono = ImageFont.truetype("/System/Library/Fonts/Menlo.ttc", px(54))

    def spaced(text, font, spacing, y, fill):
        widths = [d.textlength(ch, font=font) for ch in text]
        x = (N - sum(widths) - spacing * (len(text) - 1)) / 2
        for ch, w in zip(text, widths):
            d.text((x, y), ch, font=font, fill=fill)
            x += w + spacing

    spaced("ORBIT", heavy, px(26), px(cy), (*WHITE, 255))
    spaced("hop", mono, px(30), px(cy + 168), (*MINT, 255))


def save(img, name, size=SIZE, mode="RGBA"):
    out = img.resize((size, size), Image.LANCZOS)
    if mode == "RGB":
        out = out.convert("RGB")
    out.save(OUT / name, optimize=True)
    print("wrote", name, out.size, out.mode)


def solid():
    return Image.new("RGBA", (N, N), (*SPACE, 255))


def main():
    icon = solid()
    icon.alpha_composite(art(512, 530, 1.0))
    save(icon, "icon.png", mode="RGB")
    save(icon, "favicon.png", size=48, mode="RGB")

    save(solid(), "android-icon-background.png", mode="RGB")
    save(art(512, 512, 0.78), "android-icon-foreground.png")
    save(art(512, 512, 0.78, mono=True), "android-icon-monochrome.png")

    splash = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    splash.alpha_composite(art(512, 360, 0.7))
    wordmark(splash, 640)
    save(splash, "splash-icon.png")


if __name__ == "__main__":
    main()
