#!/usr/bin/env python3
"""Renders the 10-second Orbit Hop vertical ad (1080x1920, 30 fps) with its soundtrack.

Everything is procedural: the game's palette and fonts, a planned hop path through planets,
kinetic type, particles and a synthesized music bed mixed with the game's own sound effects.
Run from the game folder: python3 scripts/make-ad.py  ->  marketing/orbit-hop-ad.mp4
"""
import math
import os
import shutil
import subprocess
import sys
import tempfile
import wave
from multiprocessing import Pool

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 1080, 1920
FPS = 30
DURATION = 10.0
SS = 2  # supersampling factor
BEAT = 60 / 90  # 90 BPM; every landing hits a beat
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT_DIR = os.path.join(ROOT, 'marketing')
SOUNDS = os.path.join(ROOT, 'assets', 'sounds')

# Palette from src/game/palette.ts
SPACE = (11, 16, 38)
PANEL = (21, 27, 61)
MINT = (125, 255, 178)
GOLD = (255, 211, 77)
SKY = (154, 215, 255)
PINK = (255, 112, 166)
CYAN = (76, 201, 240)
WHITE = (255, 255, 255)
BRONZE = (208, 138, 79)
SILVER = (201, 211, 230)
PLATINUM = (143, 240, 230)
DIAMOND = (196, 161, 255)
INFERNO = (42, 11, 11)
NEBULA = (29, 11, 46)

AVENIR = '/System/Library/Fonts/Avenir Next.ttc'
MENLO = '/System/Library/Fonts/Menlo.ttc'
_fonts = {}


def font(size, heavy=True, mono=False):
    size = max(1, int(size))
    key = (size, heavy, mono)
    if key not in _fonts:
        _fonts[key] = ImageFont.truetype(MENLO, size * SS, index=1 if heavy else 0) if mono else ImageFont.truetype(AVENIR, size * SS, index=8 if heavy else 2)
    return _fonts[key]


# ---------------------------------------------------------------- easing
def clamp(x, a=0.0, b=1.0):
    return max(a, min(b, x))


def prog(t, start, dur):
    return clamp((t - start) / dur)


def ease_out_cubic(p):
    return 1 - (1 - p) ** 3


def ease_in_out(p):
    return 4 * p ** 3 if p < 0.5 else 1 - (-2 * p + 2) ** 3 / 2


def ease_out_back(p, s=1.9):
    p -= 1
    return 1 + (s + 1) * p ** 3 + s * p ** 2


def spring(p, freq=4.5, damp=5.5):
    return 1 - math.exp(-damp * p) * math.cos(freq * math.pi * p) if p > 0 else 0.0


def mix(a, b, k):
    k = clamp(k)
    return tuple(int(a[i] + (b[i] - a[i]) * k) for i in range(3))


def hsv(h, s=1.0, v=1.0):
    h = (h % 1) * 6
    i, f = int(h), h - int(h)
    p, q, u = v * (1 - s), v * (1 - s * f), v * (1 - s * (1 - f))
    r, g, b = [(v, u, p), (q, v, p), (p, v, u), (p, q, v), (u, p, v), (v, p, q)][i % 6]
    return int(r * 255), int(g * 255), int(b * 255)


# ---------------------------------------------------------------- the planned run
FLIGHT = 0.3
LANDINGS = [4 * BEAT, 5 * BEAT, 6 * BEAT, 7 * BEAT, 8 * BEAT, 9 * BEAT]  # 2.67 .. 6.0 s; last is the boss
EXIT = 9.6 * BEAT  # the ball leaves the boss and whips up out of frame
FEVER_AT = LANDINGS[3]
BOSS_AT = LANDINGS[5]
HUES = [(124, 92, 255), (255, 138, 61), (94, 231, 255), (199, 125, 255), (255, 77, 109), (125, 255, 178)]

PLANETS = [
    dict(x=540, y=0, r=96, spin=1, color=(90, 110, 255)),
    dict(x=300, y=-470, r=80, spin=-1, color=(255, 138, 61)),
    dict(x=790, y=-930, r=74, spin=1, color=(94, 231, 255)),
    dict(x=320, y=-1390, r=86, spin=-1, color=(199, 125, 255)),
    dict(x=770, y=-1850, r=78, spin=1, color=(255, 77, 109)),
    dict(x=540, y=-2420, r=132, spin=-1, color=(255, 120, 60), boss=True),
]
for p in PLANETS:
    p['orbit'] = p['r'] + (70 if p.get('boss') else 50)


def tangent_angle(c, q):
    """Orbit angle on planet c whose tangent (in c's spin direction) points straight at q's center."""
    dx, dy = q['x'] - c['x'], q['y'] - c['y']
    d = math.hypot(dx, dy)
    phi = math.atan2(dy, dx)
    off = math.acos(clamp(c['orbit'] / d, -1, 1))
    for th in (phi + off, phi - off):
        px, py = c['x'] + math.cos(th) * c['orbit'], c['y'] + math.sin(th) * c['orbit']
        tx, ty = -math.sin(th) * c['spin'], math.cos(th) * c['spin']
        if tx * (q['x'] - px) + ty * (q['y'] - py) > 0:
            return th
    return phi


def build_path():
    segs = []  # orbit segments: (planet index, t_from, t_to, angle_from, angular_speed)
    flights = []  # (t_from, t_to, (x0, y0), (x1, y1))
    land_angle = math.pi * 0.25
    t_land = 0.0
    for k in range(len(PLANETS) - 1):
        c, q = PLANETS[k], PLANETS[k + 1]
        t_launch = LANDINGS[k] - FLIGHT
        th_launch = tangent_angle(c, q)
        span = t_launch - t_land
        delta = ((th_launch - land_angle) * c['spin']) % (2 * math.pi)
        turns = max(0, round((3.2 * span - delta) / (2 * math.pi)))
        w = (delta + 2 * math.pi * turns) / span * c['spin']
        segs.append((k, t_land, t_launch, land_angle, w))
        p0 = (c['x'] + math.cos(th_launch) * c['orbit'], c['y'] + math.sin(th_launch) * c['orbit'])
        ang_in = math.atan2(p0[1] - q['y'], p0[0] - q['x'])
        p1 = (q['x'] + math.cos(ang_in) * q['orbit'], q['y'] + math.sin(ang_in) * q['orbit'])
        flights.append((t_launch, LANDINGS[k], p0, p1))
        land_angle, t_land = ang_in, LANDINGS[k]
    boss = len(PLANETS) - 1
    segs.append((boss, t_land, EXIT, land_angle, 4.2 * PLANETS[boss]['spin']))
    return segs, flights


SEGS, FLIGHTS = build_path()
BOSS_ENTRY_ANGLE = SEGS[-1][3]


def ball_at(t):
    if t >= EXIT:
        k, t0, t1, a0, w = SEGS[-1]
        p = PLANETS[k]
        a = a0 + w * (t1 - t0)
        x, y = p['x'] + math.cos(a) * p['orbit'], p['y'] + math.sin(a) * p['orbit']
        dt = t - EXIT
        return x + dt * 200 * (1 if x < 540 else -1) * 0.3, y - (900 * dt + 5200 * dt * dt)
    for t0, t1, p0, p1 in FLIGHTS:
        if t0 <= t < t1:
            k = (t - t0) / (t1 - t0)
            return p0[0] + (p1[0] - p0[0]) * k, p0[1] + (p1[1] - p0[1]) * k
    for k, t0, t1, a0, w in SEGS:
        if t0 <= t < t1 or (k == 0 and t < t0):
            p = PLANETS[k]
            a = a0 + w * (t - t0)
            return p['x'] + math.cos(a) * p['orbit'], p['y'] + math.sin(a) * p['orbit']
    return ball_at(EXIT)


def current_planet(t):
    for k, t0, t1, *_ in SEGS:
        if t0 <= t < t1:
            return k
    return None


def combo_at(t):
    return sum(1 for L in LANDINGS[:-1] if t >= L)


def score_at(t):
    s = 0
    for i, L in enumerate(LANDINGS):
        if t >= L:
            s += (6 + 10) if i == len(LANDINGS) - 1 else 1 + (i + 1)
    return s


# ---------------------------------------------------------------- camera (precomputed, smooth)
def camera_track():
    cams, vels = [], []
    cam = -1250.0
    vel = 0.0
    n = int(DURATION * FPS) + 1
    sub = 8
    dt = 1 / (FPS * sub)
    for i in range(n):
        for j in range(sub):
            t = (i * sub + j) * dt
            bx, by = ball_at(t)
            if t < LANDINGS[0] - 0.15:
                target = -1250.0
            elif t < EXIT:
                target = by - 1180
            else:
                target = by - 900
            stiffness = 30 if t < EXIT else 90
            acc = stiffness * (target - cam) - 2 * math.sqrt(stiffness) * vel
            vel += acc * dt
            cam += vel * dt
        cams.append(cam)
        vels.append(vel)
    return cams, vels


# ---------------------------------------------------------------- background
_bg_cache = {}


def starfield():
    if 'stars' not in _bg_cache:
        rng = np.random.RandomState(7)
        layers = []
        for depth, count, size in [(0.15, 140, 1.6), (0.4, 90, 2.4), (0.75, 45, 3.4)]:
            xs, ys = rng.uniform(0, W, count), rng.uniform(0, H * 1.5, count)
            tw = rng.uniform(0, 6.28, count)
            layers.append((depth, xs, ys, tw, size))
        _bg_cache['stars'] = layers
    return _bg_cache['stars']


def nebula_layer():
    if 'nebula' not in _bg_cache:
        img = Image.new('RGB', (W // 4, (H * 3) // 4), (0, 0, 0))
        d = ImageDraw.Draw(img)
        rng = np.random.RandomState(3)
        for _ in range(14):
            x, y = rng.uniform(0, W // 4), rng.uniform(0, (H * 3) // 4)
            r = rng.uniform(60, 160)
            col = [(60, 40, 140), (20, 80, 140), (120, 30, 110), (30, 60, 120)][rng.randint(4)]
            d.ellipse([x - r, y - r, x + r, y + r], fill=col)
        img = img.filter(ImageFilter.GaussianBlur(45))
        _bg_cache['nebula'] = np.asarray(img).astype(np.float32) / 255.0
    return _bg_cache['nebula']


def background(t, cam, vel, tint):
    base = np.zeros((H // 4, W // 4, 3), np.float32)
    base[:] = np.array(tint, np.float32) / 255.0
    neb = nebula_layer()
    off = int((-cam * 0.12 / 4) % neb.shape[0])
    rows = (np.arange(H // 4) + off) % neb.shape[0]
    base += neb[rows] * 0.55 * (0.6 + 0.4 * prog(t, 0, 1.2))
    img = Image.fromarray(np.clip(base * 255, 0, 255).astype(np.uint8)).resize((W * SS, H * SS), Image.BILINEAR)
    d = ImageDraw.Draw(img)
    streak = clamp(abs(vel) / 9000)
    fade_in = prog(t, 0, 0.9)
    for depth, xs, ys, tw, size in starfield():
        for x, y0, ph in zip(xs, ys, tw):
            y = (y0 - cam * depth) % (H * 1.5) - H * 0.25
            if y < -20 or y > H + 20:
                continue
            b = fade_in * (0.55 + 0.45 * math.sin(t * 2.4 + ph)) * (0.5 + depth * 0.6)
            col = mix(SPACE, WHITE, b)
            s = size * SS
            if streak > 0.05:
                L = streak * 260 * depth * SS
                d.line([x * SS, y * SS, x * SS, y * SS + L], fill=col, width=max(1, int(s)))
            else:
                d.ellipse([x * SS - s / 2, y * SS - s / 2, x * SS + s / 2, y * SS + s / 2], fill=col)
    return img


# ---------------------------------------------------------------- drawing helpers
def circle(d, x, y, r, fill=None, outline=None, width=1):
    x, y, r = x * SS, y * SS, r * SS
    d.ellipse([x - r, y - r, x + r, y + r], fill=fill, outline=outline, width=int(width * SS))


def arc(d, x, y, r, a0, a1, color, width):
    x, y, r = x * SS, y * SS, r * SS
    d.arc([x - r, y - r, x + r, y + r], math.degrees(a0), math.degrees(a1), fill=color, width=int(width * SS))


def text_center(d, txt, f, x, y, fill):
    w = d.textlength(txt, font=f)
    d.text((x * SS - w / 2, y * SS), txt, font=f, fill=fill, anchor='lm')


def kinetic(d, txt, f, x, y, t, t0, fill, stagger=0.045, dur=0.42, rise=70, out_at=None, out_dur=0.25):
    """Letters rise in one by one with an overshoot; optionally slide away together."""
    total = d.textlength(txt, font=f)
    cx = x * SS - total / 2
    away = ease_in_out(prog(t, out_at, out_dur)) if out_at is not None else 0
    if away >= 1:
        return
    for i, ch in enumerate(txt):
        w = d.textlength(ch, font=f)
        p = prog(t, t0 + i * stagger, dur)
        if p > 0:
            dy = (1 - ease_out_back(p)) * rise * SS - away * 90 * SS
            a = int(255 * min(1, p * 2.2) * (1 - away))
            d.text((cx, y * SS + dy), ch, font=f, fill=fill + (a,), anchor='lm')
        cx += w


def burst_particles(d, glow, x, y, t, t0, color, n, speed, seed, life=0.8, glow_gain=0.8):
    dt = t - t0
    if dt < 0 or dt > life:
        return
    rng = np.random.RandomState(seed)
    k = 3.2
    for _ in range(n):
        a = rng.uniform(0, 2 * math.pi)
        v = rng.uniform(0.35, 1) * speed
        sz = rng.uniform(4, 10)
        travel = v * (1 - math.exp(-k * dt)) / k
        px, py = x + math.cos(a) * travel, y + math.sin(a) * travel + 60 * dt * dt
        fade = 1 - dt / life
        r = sz * (0.4 + 0.6 * fade)
        circle(d, px, py, r, fill=mix(SPACE, color, fade))
        if glow_gain:
            circle(glow, px / 4, py / 4, r / 3, fill=mix((0, 0, 0), color, fade * glow_gain))


# ---------------------------------------------------------------- scenes
def draw_world(img, glow, t, cam):
    d = ImageDraw.Draw(img)
    gd = ImageDraw.Draw(glow)
    fever = FEVER_AT <= t < BOSS_AT

    def sy(y):
        return y - cam

    for i, p in enumerate(PLANETS):
        y = sy(p['y'])
        if y < -400 or y > H + 400:
            continue
        x = p['x']
        if p.get('boss'):
            if t > LANDINGS[0]:
                draw_boss(d, gd, p, x, y, t)
            continue
        pop = ease_out_back(prog(t, 0.15 if i == 0 else LANDINGS[0] - 0.42 + (i - 1) * 0.1, 0.45))
        if pop <= 0:
            continue
        p = dict(p, r=p['r'] * pop, orbit=p['orbit'] * pop)
        active = current_planet(t) == i
        circle(gd, x / 4, y / 4, (p['r'] + 26) / 4, fill=mix((0, 0, 0), p['color'], 0.35 if active else 0.18))
        circle(d, x, y, p['orbit'], outline=mix(SPACE, p['color'], 0.28), width=2)
        circle(d, x, y, p['r'], fill=mix(SPACE, p['color'], 0.82))
        circle(d, x - p['r'] * 0.28, y - p['r'] * 0.3, p['r'] * 0.42, fill=mix(SPACE, p['color'], 1.0))
        circle(d, x + p['r'] * 0.2, y + p['r'] * 0.25, p['r'] * 0.22, fill=mix(SPACE, p['color'], 0.6))
        if active:
            # fuse ring counting down around the planet the ball orbits
            seg = next(s for s in SEGS if s[0] == i)
            left = 1 - clamp((t - seg[1]) / max(seg[2] - seg[1], 0.01))
            arc(d, x, y, p['r'] + 14, -90, -90 + 360 * left, mix(SPACE, MINT, 0.9), 6)

    # trail
    bx, by = ball_at(t)
    for j in range(16, 0, -1):
        tx, ty = ball_at(max(0.0, t - j * 0.014))
        k = 1 - j / 17
        col = hsv(t * 1.6 + j * 0.05) if fever else mix(SPACE, SKY, k * 0.9)
        r = 4 + 15 * k
        circle(d, tx, sy(ty), r, fill=mix(SPACE, col, k))
        if fever:
            circle(gd, tx / 4, sy(ty) / 4, r / 3, fill=mix((0, 0, 0), col, k * 0.7))

    # aim dots in the hook, before the first tap
    if t < LANDINGS[0] - FLIGHT:
        seg = SEGS[0]
        a = seg[3] + seg[4] * (t - seg[1])
        dx, dy = -math.sin(a), math.cos(a)
        for i in range(1, 5):
            pulse = 0.5 + 0.5 * math.sin(t * 8 - i)
            circle(d, bx + dx * i * 34, sy(by) + dy * i * 34, 6, fill=mix(SPACE, WHITE, (0.75 - i * 0.14) * pulse * prog(t, 0.6, 0.4)))

    ball_col = hsv(t * 1.6) if fever else WHITE
    circle(gd, bx / 4, sy(by) / 4, 12, fill=mix((0, 0, 0), ball_col, 0.85))
    circle(d, bx, sy(by), 23, fill=ball_col)

    # landing bursts
    for i, L in enumerate(LANDINGS[:-1]):
        q = PLANETS[i + 1]
        burst_particles(d, gd, *ball_at(L + 0.0001)[:1], sy(ball_at(L + 0.0001)[1]), t, L, q['color'] if not (FEVER_AT <= L) else PINK, 16, 520, 10 + i)


def draw_boss(d, gd, p, x, y, t):
    gap_half = 0.62
    spin = 1.35
    gap = BOSS_ENTRY_ANGLE + spin * (t - BOSS_AT)
    circle(gd, x / 4, y / 4, (p['r'] + 50) / 4, fill=mix((0, 0, 0), (255, 90, 40), 0.35 + 0.15 * math.sin(t * 6)))
    circle(d, x, y, p['r'], fill=mix(SPACE, p['color'], 0.8))
    circle(d, x - 40, y - 38, 52, fill=mix(SPACE, (255, 170, 80), 0.9))
    circle(d, x + 34, y + 30, 26, fill=mix(SPACE, (200, 60, 30), 0.9))
    # angry eyes: it is a boss
    for ex in (-38, 38):
        circle(d, x + ex, y - 6, 15, fill=(30, 8, 8))
        circle(d, x + ex + 4, y - 9, 5, fill=WHITE)
    R = p['orbit']
    if t < BOSS_AT:
        # ring with a spinning gap the ball must thread
        a0, a1 = math.degrees(gap + gap_half), math.degrees(gap - gap_half + 2 * math.pi)
        arc(d, x, y, R, math.radians(a0), math.radians(a1), (255, 120, 90), 16)
        arc(gd, x / 4, y / 4, R / 4, math.radians(a0), math.radians(a1), (160, 40, 30), 4)
    else:
        # the ring shatters into shards flying outward
        dt = t - BOSS_AT
        rng = np.random.RandomState(42)
        for s in range(18):
            a = gap + gap_half + s * (2 * math.pi - 2 * gap_half) / 18
            dist = R + 900 * (1 - math.exp(-3 * dt)) / 3 * rng.uniform(0.6, 1.4)
            fade = clamp(1 - dt / 0.9)
            if fade <= 0:
                continue
            sx, sy_ = x + math.cos(a) * dist, y + math.sin(a) * dist + 120 * dt * dt
            rot = a + dt * rng.uniform(-8, 8)
            L = 34
            d.line([(sx - math.cos(rot + 1.57) * L) * SS, (sy_ - math.sin(rot + 1.57) * L) * SS, (sx + math.cos(rot + 1.57) * L) * SS, (sy_ + math.sin(rot + 1.57) * L) * SS], fill=mix(SPACE, (255, 140, 100), fade), width=14 * SS)
        burst_particles(d, gd, x, y, t, BOSS_AT, GOLD, 60, 1100, 77, life=1.1, glow_gain=0.3)
        burst_particles(d, gd, x, y, t, BOSS_AT + 0.05, PINK, 30, 800, 78, life=0.9, glow_gain=0)


def draw_hud(d, t):
    show = prog(t, LANDINGS[0] - 0.4, 0.3) * (1 - prog(t, EXIT + 0.05, 0.2))
    if show <= 0:
        return
    a = int(255 * show)
    score = score_at(t)
    pop = 1 + 0.25 * max([math.exp(-(t - L) * 9) if t >= L else 0 for L in LANDINGS] + [0])
    f = font(int(96 * pop), mono=True)
    text_center(d, str(score), f, W / 2, 190, WHITE + (a,))
    combo = combo_at(t)
    if combo >= 2:
        pill_col = PINK if t >= FEVER_AT else MINT
        x0, y0 = W - 230, 150
        d.rounded_rectangle([x0 * SS, y0 * SS, (x0 + 170) * SS, (y0 + 76) * SS], radius=38 * SS, fill=pill_col + (int(a * 0.95),))
        text_center(d, f'x{combo}', font(46, mono=True), x0 + 85, y0 + 38, SPACE + (a,))


def draw_popups(d, t, cam):
    for i, L in enumerate(LANDINGS[:-1]):
        dt = t - L
        if L == FEVER_AT:
            continue
        if 0 <= dt < 0.9:
            bx, by = ball_at(L + 0.0001)
            p = PLANETS[i + 1]
            y = p['y'] - cam - p['orbit'] - 40 - dt * 90
            a = int(255 * clamp(1.6 - dt * 1.8))
            s = ease_out_back(prog(t, L, 0.25))
            text_center(d, f'PERFECT +{i + 2}', font(int(44 * max(s, 0.01))), p['x'], y, (MINT if L < FEVER_AT else PINK) + (a,))


def banner(d, txt, t, t0, t1, color, size, y, ghost=None):
    if not (t0 <= t < t1 + 0.3):
        return
    p = ease_out_back(prog(t, t0, 0.35), 1.5)
    out = ease_in_out(prog(t, t1, 0.3))
    scale = max(0.05, p * (1 + 0.25 * out))
    a = int(255 * (1 - out))
    f = font(int(size * scale))
    if ghost:
        jitter = 10 * math.sin(t * 40) * (1 - prog(t, t0, 0.5))
        text_center(d, txt, f, W / 2 - 8 - jitter, y, ghost[0] + (int(a * 0.6),))
        text_center(d, txt, f, W / 2 + 8 + jitter, y, ghost[1] + (int(a * 0.6),))
    text_center(d, txt, f, W / 2, y, color + (a,))


def caption(d, t, txt, t0, t1, highlight=None):
    if not (t0 - 0.05 <= t < t1 + 0.35):
        return
    f = font(68)
    y = 1620
    p = ease_out_cubic(prog(t, t0, 0.4))
    out = ease_in_out(prog(t, t1, 0.3))
    a = int(255 * p * (1 - out))
    dy = (1 - p) * 50 - out * 40
    w = d.textlength(txt, font=f)
    # soft plate behind the caption for legibility over the action
    pad = 40 * SS
    d.rounded_rectangle([W * SS / 2 - w / 2 - pad, (y + dy - 62) * SS, W * SS / 2 + w / 2 + pad, (y + dy + 62) * SS], radius=62 * SS, fill=SPACE + (int(a * 0.72),))
    x = W * SS / 2 - w / 2
    for word in txt.split(' '):
        col = PINK if highlight and highlight in word else WHITE
        d.text((x, (y + dy) * SS), word, font=f, fill=col + (a,), anchor='lm')
        x += d.textlength(word + ' ', font=f)


def tap_ripple(d, t):
    t0 = LANDINGS[0] - FLIGHT - 0.06
    for i in range(3):
        dt = t - t0 - i * 0.09
        if 0 <= dt < 0.7:
            r = 30 + dt * 260
            a = int(255 * (1 - dt / 0.7))
            x, y = W / 2, 1640
            d.ellipse([(x - r) * SS, (y - r) * SS, (x + r) * SS, (y + r) * SS], outline=WHITE + (a,), width=6 * SS)
    if t0 - 0.5 < t < t0 + 0.5:
        a = int(255 * clamp(1 - abs(t - t0) / 0.5))
        text_center(d, 'TAP', font(40), W / 2, 1760, WHITE + (a,))


# ---------------------------------------------------------------- rewards scene
REWARDS_IN = 10.1 * BEAT
END_IN = 13 * BEAT


def card(d, x, y, w, h, color, a):
    d.rounded_rectangle([x * SS, y * SS, (x + w) * SS, (y + h) * SS], radius=44 * SS, fill=PANEL + (a,), outline=color + (a,), width=3 * SS)


def draw_rewards(img, t):
    d = ImageDraw.Draw(img, 'RGBA')
    leave = ease_in_out(prog(t, END_IN - 0.25, 0.3))
    kinetic(d, 'UNLOCK IT ALL', font(104), W / 2, 330, t, REWARDS_IN, WHITE, stagger=0.035)
    sub_a = int(255 * prog(t, REWARDS_IN + 0.4, 0.3) * (1 - leave))
    text_center(d, '100% free. Earned by playing.', font(46, heavy=False), W / 2, 440, (*SKY, sub_a))
    labels = [('SKINS & TRAILS', 'Collect looks for your orbit', SKY), ('TROPHIES', 'Bronze to Diamond tiers', GOLD), ('SEASON PASS', '30 free reward tiers', PINK)]
    for i, (title, sub, color) in enumerate(labels):
        t0 = REWARDS_IN + 0.25 + i * 0.18
        p = spring(prog(t, t0, 0.9))
        if p <= 0:
            continue
        x = 90 + (1 - p) * 900 - leave * 1200 * (1 + i * 0.2)
        y = 560 + i * 380
        a = int(255 * min(1, prog(t, t0, 0.2)) * (1 - leave))
        card(d, x, y, 900, 330, color, a)
        d.text(((x + 360) * SS, (y + 125) * SS), title, font=font(60), fill=color + (a,), anchor='lm')
        d.text(((x + 360) * SS, (y + 200) * SS), sub, font=font(38, heavy=False), fill=WHITE + (int(a * 0.8),), anchor='lm')
        cx, cy = x + 175, y + 165
        local = t - t0
        if i == 0:
            skins = [WHITE, (255, 138, 61), (125, 255, 178), (199, 125, 255), (255, 77, 109), (139, 233, 253)]
            col = skins[int(max(local, 0) / 0.32) % len(skins)]
            for j in range(10, 0, -1):
                ang = local * 4 - j * 0.12
                k = 1 - j / 11
                circle(d, cx + math.cos(ang) * 80, cy + math.sin(ang) * 80, 6 + 12 * k, fill=mix(PANEL, col, k) + (a,))
            circle(d, cx, cy, 44, fill=mix(PANEL, col, 0.35) + (a,))
            circle(d, cx + math.cos(local * 4) * 80, cy + math.sin(local * 4) * 80, 22, fill=col + (a,))
        elif i == 1:
            tiers = [BRONZE, SILVER, GOLD, PLATINUM, DIAMOND]
            for j, tc in enumerate(tiers):
                lit = ease_out_back(prog(t, t0 + 0.35 + j * 0.13, 0.3))
                mx = cx - 120 + j * 60
                r = 22 + 6 * lit
                circle(d, mx, cy, r, fill=mix(PANEL, tc, 0.25 + 0.75 * lit) + (a,))
                if lit > 0.5:
                    circle(d, mx - 6, cy - 7, 6, fill=WHITE + (int(a * 0.7),))
        else:
            fill = ease_in_out(prog(t, t0 + 0.3, 1.0))
            bw = 220
            d.rounded_rectangle([(cx - 110) * SS, (cy + 30) * SS, (cx + 110) * SS, (cy + 52) * SS], radius=11 * SS, fill=(255, 255, 255, int(a * 0.15)))
            d.rounded_rectangle([(cx - 110) * SS, (cy + 30) * SS, (cx - 110 + max(22, bw * fill)) * SS, (cy + 52) * SS], radius=11 * SS, fill=GOLD + (a,))
            text_center(d, f'TIER {1 + int(29 * fill)}', font(44, mono=True), cx, cy - 30, GOLD + (a,))
            star(d, cx + 105, cy - 80, 26, GOLD, a, local * 1.5)


def star(d, x, y, r, color, a, rot=0.0):
    pts = []
    for i in range(10):
        rr = r if i % 2 == 0 else r * 0.45
        ang = rot - math.pi / 2 + i * math.pi / 5
        pts.append(((x + math.cos(ang) * rr) * SS, (y + math.sin(ang) * rr) * SS))
    d.polygon(pts, fill=color + (a,))


# ---------------------------------------------------------------- end card
def draw_end(img, glow, t):
    d = ImageDraw.Draw(img, 'RGBA')
    gd = ImageDraw.Draw(glow)
    t0 = END_IN
    # logo
    f = font(190)
    word = 'ORBIT'
    total = d.textlength(word, font=f) + 4 * 26 * SS
    x = W * SS / 2 - total / 2
    for i, ch in enumerate(word):
        p = ease_out_back(prog(t, t0 + i * 0.06, 0.45), 2.2)
        a = int(255 * min(1, prog(t, t0 + i * 0.06, 0.15)))
        if p > 0:
            d.text((x, 760 * SS - (1 - p) * 220 * SS), ch, font=f, fill=WHITE + (a,), anchor='lm')
        x += d.textlength(ch, font=f) + 26 * SS
    hp = prog(t, t0 + 0.35, 0.4)
    letters = 'h o p'
    text_center(d, letters, font(84, heavy=False, mono=True), W / 2 + (1 - ease_out_cubic(hp)) * 120, 900, MINT + (int(255 * hp),))
    # the ball orbits the logo, leaving a trail
    op = prog(t, t0 + 0.15, 0.4)
    if op > 0:
        for j in range(18, -1, -1):
            ang = (t - j * 0.018) * 3.1 + 2.2
            k = 1 - j / 19
            px, py = W / 2 + math.cos(ang) * 470, 820 + math.sin(ang) * 175
            col = mix(SPACE, SKY if j else WHITE, k * op)
            circle(d, px, py, (5 + 17 * k) if j else 24, fill=col + (255,))
            if j == 0:
                circle(gd, px / 4, py / 4, 11, fill=mix((0, 0, 0), WHITE, 0.8 * op))
    kinetic(d, 'How high can you hop?', font(64, heavy=False), W / 2, 1180, t, t0 + 0.55, SKY, stagger=0.018, dur=0.35, rise=40)
    # call to action
    cp = spring(prog(t, t0 + 0.8, 0.8))
    if cp > 0:
        bw, bh = 620 * cp, 150 * cp
        cy = 1450
        pulse = 1 + 0.03 * math.sin((t - t0) * 9)
        bw, bh = bw * pulse, bh * pulse
        d.rounded_rectangle([(W / 2 - bw / 2) * SS, (cy - bh / 2) * SS, (W / 2 + bw / 2) * SS, (cy + bh / 2) * SS], radius=int(bh / 2 * SS), fill=MINT + (255,))
        circle(gd, W / 2 / 4, cy / 4, 26 * cp, fill=(30, 80, 50))
        # shine sweep across the button
        sp = prog(t, t0 + 1.05, 0.45)
        if 0 < sp < 1:
            # keep the sweep inside the pill's straight middle section
            left, right = W / 2 - bw / 2 + bh / 2, W / 2 + bw / 2 - bh / 2 + 40
            sx = left + sp * (right - left)
            d.polygon([((sx - 30) * SS, (cy - bh / 2) * SS), ((sx + 20) * SS, (cy - bh / 2) * SS), ((sx - 10) * SS, (cy + bh / 2) * SS), ((sx - 60) * SS, (cy + bh / 2) * SS)], fill=(255, 255, 255, 110))
        if cp > 0.6:
            text_center(d, 'PLAY FREE', font(int(66 * cp)), W / 2, cy, SPACE + (255,))
    fa = int(255 * prog(t, t0 + 1.0, 0.3))
    text_center(d, 'Free on iPhone & Android', font(42, heavy=False), W / 2, 1620, (*WHITE, int(fa * 0.9)))


# ---------------------------------------------------------------- frame
CAMS, VELS = None, None


def render_frame(i):
    t = i / FPS
    cam, vel = CAMS[i], VELS[i]
    fever = FEVER_AT <= t < BOSS_AT
    tint = SPACE
    if t >= FEVER_AT - 0.2:
        tint = mix(SPACE, NEBULA, prog(t, FEVER_AT - 0.2, 0.5))
    if t >= BOSS_AT - 0.7:
        tint = mix(tint, INFERNO, prog(t, BOSS_AT - 0.7, 0.6) * (1 - prog(t, EXIT, 0.4)))
    if t >= REWARDS_IN - 0.3:
        tint = mix(tint, NEBULA, prog(t, REWARDS_IN - 0.3, 0.4) * (1 - prog(t, END_IN - 0.2, 0.4)))

    shake = 0.0
    if t >= BOSS_AT:
        shake = 26 * math.exp(-(t - BOSS_AT) * 6)
    sx = shake * math.sin(t * 91)
    sy = shake * math.cos(t * 77)

    whip = vel * (1 - prog(t, REWARDS_IN - 0.1, 0.25)) if t >= EXIT else 0
    img = background(t, cam, whip, tint).convert('RGBA')
    glow = Image.new('RGB', (W // 4 * SS, H // 4 * SS))
    world = Image.new('RGBA', img.size, (0, 0, 0, 0))
    if t < REWARDS_IN + 0.15:
        draw_world(world, glow, t, cam)
    ui = Image.new('RGBA', img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(ui, 'RGBA')

    if t < REWARDS_IN:
        # hook
        kinetic(d, 'ONE', font(230), W / 2, 380, t, 0.35, WHITE, stagger=0.07, dur=0.45, rise=110, out_at=LANDINGS[0] - 0.75)
        kinetic(d, 'TAP.', font(230), W / 2, 610, t, 0.85, MINT, stagger=0.07, dur=0.45, rise=110, out_at=LANDINGS[0] - 0.7)
        tap_ripple(d, t)
        draw_hud(d, t)
        draw_popups(d, t, cam)
        caption(d, t, 'Hop from planet to planet', LANDINGS[0] - 0.05, FEVER_AT - 0.1)
        caption(d, t, 'Chain perfects. Go FEVER.', FEVER_AT + 0.15, BOSS_AT - 0.75, highlight='FEVER')
        caption(d, t, 'Beat the bosses', BOSS_AT - 0.55, EXIT + 0.05)
        banner(d, 'FEVER!', t, FEVER_AT, FEVER_AT + 0.75, PINK, 200, 800, ghost=(CYAN, (255, 60, 120)))
        banner(d, 'BOSS CLEARED!', t, BOSS_AT, BOSS_AT + 0.55, GOLD, 96, 760, ghost=(PINK, (255, 120, 40)))
    if REWARDS_IN - 0.05 <= t < END_IN + 0.1:
        draw_rewards(ui, t)
    if t >= END_IN - 0.05:
        draw_end(ui, glow, t)

    if shake:
        world = world.transform(world.size, Image.AFFINE, (1, 0, -sx * SS, 0, 1, -sy * SS))
    img.alpha_composite(world)
    g = glow.filter(ImageFilter.GaussianBlur(7 * SS / 2)).resize(img.size, Image.BILINEAR)
    img = Image.fromarray(np.minimum(255, np.asarray(img.convert('RGB'), np.uint16) + np.asarray(g, np.uint16) * 2).astype(np.uint8)).convert('RGBA')
    img.alpha_composite(ui)
    out = img.convert('RGB')

    # flashes on the big moments, and a fever pulse on the beat
    flash = 0.0
    if t >= BOSS_AT:
        flash = max(flash, 0.4 * math.exp(-(t - BOSS_AT) * 14))
    if t >= FEVER_AT:
        flash = max(flash, 0.28 * math.exp(-(t - FEVER_AT) * 14))
    if t >= EXIT + 0.12:
        flash = max(flash, 0.55 * math.exp(-(t - (REWARDS_IN - 0.02)) ** 2 * 900))
    if fever:
        beat = ((t - FEVER_AT) / BEAT) % 1
        out = Image.blend(out, Image.new('RGB', out.size, PINK), 0.06 * math.exp(-beat * 5))
    if flash > 0.01:
        out = Image.blend(out, Image.new('RGB', out.size, (255, 248, 230)), min(flash, 1))
    # fade from black at the start
    if t < 0.4:
        out = Image.blend(Image.new('RGB', out.size, (0, 0, 0)), out, t / 0.4)
    return out.resize((W, H), Image.LANCZOS)


def write_frame(args):
    i, path = args
    render_frame(i).save(os.path.join(path, f'f{i:04d}.png'), compress_level=1)
    return i


def init_worker(cams, vels):
    global CAMS, VELS
    CAMS, VELS = cams, vels


# ---------------------------------------------------------------- audio
RATE = 44100


def load_wav(name):
    with wave.open(os.path.join(SOUNDS, f'{name}.wav')) as w:
        data = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
        rate = w.getframerate()
    idx = np.arange(0, len(data), rate / RATE)
    return np.interp(idx, np.arange(len(data)), data)


def place(buf, sig, at, gain=1.0):
    i = int(at * RATE)
    if i >= len(buf):
        return
    n = min(len(sig), len(buf) - i)
    buf[i:i + n] += sig[:n] * gain


def env(n, attack, decay):
    t = np.arange(n) / RATE
    return np.minimum(1, t / max(attack, 1e-4)) * np.exp(-t / decay)


def tone(freq, dur, harmonics=((1, 1.0),), attack=0.005, decay=0.3):
    n = int(dur * RATE)
    t = np.arange(n) / RATE
    return sum(a * np.sin(2 * np.pi * freq * h * t) for h, a in harmonics) * env(n, attack, decay)


def kick(dur=0.35):
    n = int(dur * RATE)
    t = np.arange(n) / RATE
    f = 45 + 110 * np.exp(-t * 28)
    return np.sin(2 * np.pi * np.cumsum(f) / RATE) * np.exp(-t * 9)


def hat(dur=0.05, seed=0):
    rng = np.random.RandomState(seed)
    n = int(dur * RATE)
    s = rng.uniform(-1, 1, n)
    s = s - np.convolve(s, np.ones(4) / 4, 'same')
    return s * np.exp(-np.arange(n) / RATE * 70)


def riser(dur):
    rng = np.random.RandomState(5)
    n = int(dur * RATE)
    t = np.arange(n) / RATE
    noise = rng.uniform(-1, 1, n)
    k = np.clip(t / dur, 0, 1)
    smooth = np.convolve(noise, np.ones(8) / 8, 'same')
    sweep = np.sin(2 * np.pi * np.cumsum(200 + 1400 * k ** 2) / RATE)
    return (noise - smooth) * k ** 2 * 0.6 + sweep * k ** 3 * 0.25


def whoosh(dur):
    rng = np.random.RandomState(9)
    n = int(dur * RATE)
    t = np.arange(n) / RATE
    noise = rng.uniform(-1, 1, n)
    shape = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 2
    return (noise - np.convolve(noise, np.ones(6) / 6, 'same')) * shape * 0.7


NOTE = {n: 440 * 2 ** ((i - 9) / 12) for i, n in enumerate(['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'])}


def chord(names, octave, dur, gain=0.12):
    out = np.zeros(int(dur * RATE))
    for i, n in enumerate(names):
        f = NOTE[n] * 2 ** (octave - 4 + (1 if i and NOTE[n] < NOTE[names[0]] else 0))
        for det in (-0.4, 0.4):
            t = np.arange(len(out)) / RATE
            out += np.sin(2 * np.pi * (f + det) * t) * gain
    n = len(out)
    t = np.arange(n) / RATE
    return out * np.minimum(1, t / 0.4) * np.minimum(1, (dur - t) / 0.5).clip(0, 1)


def soundtrack():
    buf = np.zeros(int(DURATION * RATE) + RATE)
    beats = [i * BEAT for i in range(int(DURATION / BEAT) + 1)]
    # pads: F (hook) -> C (hops) -> Am (fever/boss) -> F -> C (end card)
    for names, t0, t1 in [(['F', 'A', 'C', 'E'], 0, 4 * BEAT), (['C', 'E', 'G', 'B'], 4 * BEAT, 7 * BEAT), (['A', 'C', 'E', 'G'], 7 * BEAT, 9 * BEAT), (['F', 'A', 'C', 'E'], 9 * BEAT, 13 * BEAT), (['C', 'E', 'G', 'D'], 13 * BEAT, DURATION)]:
        place(buf, chord(names, 3, t1 - t0 + 0.6), t0, 0.9)
    bass_notes = {0: 'F', 4: 'C', 7: 'A', 9: 'F', 13: 'C'}
    current = 'F'
    for i, b in enumerate(beats):
        current = bass_notes.get(i, current)
        if 3 <= i <= 9 or i >= 13:
            place(buf, kick(), b, 0.9)
        elif i in (1, 2):
            place(buf, kick(), b, 0.35)  # heartbeat in the hook
        if 4 <= i <= 9:
            place(buf, hat(seed=i), b + BEAT / 2, 0.25)
            place(buf, hat(seed=i + 50), b + BEAT / 4 * 3, 0.12)
        if i >= 3 and i not in (10, 11, 12):
            place(buf, tone(NOTE[current] / 4, BEAT * 0.9, ((1, 1.0), (2, 0.5), (3, 0.2)), decay=0.35), b, 0.35)
    # arpeggio through hops and fever
    scale = ['C', 'D', 'E', 'G', 'A']
    for j in range(int((9 * BEAT - 4 * BEAT) / (BEAT / 2))):
        at = 4 * BEAT + j * BEAT / 2
        n = scale[(j * 2) % 5]
        place(buf, tone(NOTE[n] * 2, 0.25, ((1, 1.0), (2, 0.3)), decay=0.12), at, 0.12)
    # game sound effects, timed to the picture
    for k, L in enumerate(LANDINGS[:-1]):
        place(buf, load_wav('launch'), L - FLIGHT, 0.6)
        place(buf, load_wav(f'perfect_{min(k + 2, 8)}'), L, 0.85)
    place(buf, load_wav('launch'), BOSS_AT - FLIGHT, 0.6)
    place(buf, load_wav('fever'), FEVER_AT, 0.8)
    place(buf, riser(BOSS_AT - (FEVER_AT + BEAT)), FEVER_AT + BEAT, 0.5)
    place(buf, load_wav('boss'), BOSS_AT, 1.0)
    place(buf, kick(0.6), BOSS_AT, 1.2)
    place(buf, whoosh(0.55), EXIT - 0.05, 0.8)
    for i in range(3):
        place(buf, tone(NOTE[['C', 'E', 'G'][i]] * 2, 0.3, ((1, 1.0), (2, 0.4), (3, 0.15)), decay=0.15), REWARDS_IN + 0.25 + i * 0.18, 0.35)
    for j in range(5):
        place(buf, tone(NOTE[scale[j]] * 4, 0.2, ((1, 1.0), (2.01, 0.3)), decay=0.1), REWARDS_IN + 0.43 + 0.35 + j * 0.13, 0.25)
    place(buf, load_wav('best'), END_IN, 0.7)
    place(buf, load_wav('coin'), END_IN + 1.05, 0.5)
    # gentle master: fade out the tail, normalize, soft clip
    buf = buf[: int(DURATION * RATE)]
    fade = np.ones_like(buf)
    tail = int(0.35 * RATE)
    fade[-tail:] = np.linspace(1, 0, tail)
    buf = np.tanh(buf * fade * 1.1)
    buf = buf / max(1e-6, np.abs(buf).max()) * 0.89
    return buf


def write_wav(path, samples):
    stereo = np.repeat((samples * 32767).astype(np.int16)[:, None], 2, axis=1)
    with wave.open(path, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(stereo.tobytes())


# ---------------------------------------------------------------- main
def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    only = [int(x) for x in sys.argv[1:]]  # optional: render only these frame numbers as PNG previews
    cams, vels = camera_track()
    if only:
        init_worker(cams, vels)
        for i in only:
            render_frame(i).save(os.path.join(OUT_DIR, f'preview-{i:04d}.png'))
            print('preview', i)
        return
    tmp = tempfile.mkdtemp(prefix='orbit-ad-')
    try:
        frames = int(DURATION * FPS)
        with Pool(os.cpu_count(), initializer=init_worker, initargs=(cams, vels)) as pool:
            for done in pool.imap_unordered(write_frame, [(i, tmp) for i in range(frames)], chunksize=4):
                if done % 30 == 0:
                    print(f'frame {done}/{frames}', flush=True)
        wav = os.path.join(tmp, 'audio.wav')
        write_wav(wav, soundtrack())
        out = os.path.join(OUT_DIR, 'orbit-hop-ad.mp4')
        subprocess.run([
            'ffmpeg', '-y', '-loglevel', 'error', '-framerate', str(FPS), '-i', os.path.join(tmp, 'f%04d.png'), '-i', wav,
            '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
            '-c:a', 'aac', '-b:a', '192k', '-shortest', out,
        ], check=True)
        print('wrote', out)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


if __name__ == '__main__':
    main()
