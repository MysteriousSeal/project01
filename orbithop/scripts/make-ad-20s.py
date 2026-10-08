#!/usr/bin/env python3
"""Renders the 20-second Orbit Hop vertical ad (1080x1920, 60 fps) with its soundtrack.

Builds on the drawing, type, particle and audio toolkit in make-ad.py (the 10-second cut),
with a longer story: hops, perfects, fever, a comet catch, a boss, the worlds, rewards and
competition, then the end card.
Run from the game folder: python3 scripts/make-ad-20s.py  ->  marketing/orbit-hop-ad-20s.mp4
"""
import importlib.util
import math
import os
import shutil
import subprocess
import sys
import tempfile
from multiprocessing import Pool

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

_spec = importlib.util.spec_from_file_location('adkit', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'make-ad.py'))
k = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(k)

W, H, SS = k.W, k.H, k.SS
FPS = 60
DURATION = 20.0
BEAT = k.BEAT
SPACE, PANEL, MINT, GOLD, SKY, PINK, CYAN, WHITE = k.SPACE, k.PANEL, k.MINT, k.GOLD, k.SKY, k.PINK, k.CYAN, k.WHITE
font, prog, clamp, mix, hsv = k.font, k.prog, k.clamp, k.mix, k.hsv
ease_out_back, ease_out_cubic, ease_in_out, spring = k.ease_out_back, k.ease_out_cubic, k.ease_in_out, k.spring
circle, arc, text_center, kinetic, burst, star, card = k.circle, k.arc, k.text_center, k.kinetic, k.burst_particles, k.star, k.card

# ---------------------------------------------------------------- story beats (seconds)
B = lambda n: n * BEAT  # noqa: E731
FLIGHT = 0.3
LANDINGS = [B(n) for n in (4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 16)]  # last is the boss
PERFECT_AT = LANDINGS[2]  # the reticle shows what a perfect is
FEVER_AT = LANDINGS[4]  # x5 combo, as in the game
COMET_LANDING = LANDINGS[8]  # the comet is caught during the flight into this planet
BOSS_AT = LANDINGS[-1]
EXIT = B(16.6)
WORLDS_IN = B(17)
REWARDS_IN = B(19)
COMPETE_IN = B(22)
END_IN = B(25)

ZONES = [('DEEP SPACE', (11, 16, 38)), ('NEBULA', (29, 11, 46)), ('ICE FIELD', (6, 32, 43)), ('INFERNO', (42, 11, 11)), ('EMERALD VOID', (4, 38, 26)), ('THE BEYOND', (0, 0, 0))]

PLANETS = [
    dict(x=540, y=0, r=96, spin=1, color=(90, 110, 255)),
    dict(x=300, y=-470, r=80, spin=-1, color=(255, 138, 61)),
    dict(x=790, y=-930, r=76, spin=1, color=(94, 231, 255)),
    dict(x=330, y=-1390, r=86, spin=-1, color=(199, 125, 255)),
    dict(x=770, y=-1850, r=78, spin=1, color=(255, 77, 109)),
    dict(x=320, y=-2310, r=82, spin=-1, color=(125, 255, 178)),
    dict(x=780, y=-2770, r=74, spin=1, color=(255, 211, 77)),
    dict(x=330, y=-3230, r=84, spin=-1, color=(76, 201, 240)),
    dict(x=760, y=-3700, r=78, spin=1, color=(255, 112, 166)),
    dict(x=300, y=-4250, r=82, spin=-1, color=(139, 233, 253)),
    dict(x=760, y=-4720, r=80, spin=1, color=(199, 125, 255)),
    dict(x=540, y=-5300, r=132, spin=-1, color=(255, 120, 60), boss=True),
]
for p in PLANETS:
    p['orbit'] = p['r'] + (70 if p.get('boss') else 50)


def tangent_angle(c, q):
    dx, dy = q['x'] - c['x'], q['y'] - c['y']
    phi = math.atan2(dy, dx)
    off = math.acos(clamp(c['orbit'] / math.hypot(dx, dy), -1, 1))
    for th in (phi + off, phi - off):
        px, py = c['x'] + math.cos(th) * c['orbit'], c['y'] + math.sin(th) * c['orbit']
        if -math.sin(th) * c['spin'] * (q['x'] - px) + math.cos(th) * c['spin'] * (q['y'] - py) > 0:
            return th
    return phi


def build_path():
    segs, flights = [], []
    land_angle, t_land = math.pi * 0.25, 0.0
    for i in range(len(PLANETS) - 1):
        c, q = PLANETS[i], PLANETS[i + 1]
        t_launch = LANDINGS[i] - FLIGHT
        th = tangent_angle(c, q)
        span = t_launch - t_land
        delta = ((th - land_angle) * c['spin']) % (2 * math.pi)
        turns = max(0, round((3.2 * span - delta) / (2 * math.pi)))
        segs.append((i, t_land, t_launch, land_angle, (delta + 2 * math.pi * turns) / span * c['spin']))
        p0 = (c['x'] + math.cos(th) * c['orbit'], c['y'] + math.sin(th) * c['orbit'])
        ang_in = math.atan2(p0[1] - q['y'], p0[0] - q['x'])
        p1 = (q['x'] + math.cos(ang_in) * q['orbit'], q['y'] + math.sin(ang_in) * q['orbit'])
        flights.append((t_launch, LANDINGS[i], p0, p1))
        land_angle, t_land = ang_in, LANDINGS[i]
    segs.append((len(PLANETS) - 1, t_land, EXIT, land_angle, 4.2 * PLANETS[-1]['spin']))
    return segs, flights


SEGS, FLIGHTS = build_path()
BOSS_ENTRY = SEGS[-1][3]


def ball_at(t):
    if t >= EXIT:
        i, t0, t1, a0, w = SEGS[-1]
        p = PLANETS[i]
        a = a0 + w * (t1 - t0)
        x, y = p['x'] + math.cos(a) * p['orbit'], p['y'] + math.sin(a) * p['orbit']
        dt = t - EXIT
        return x + (540 - x) * min(1, dt * 2), y - (900 * dt + 5200 * dt * dt)
    for t0, t1, p0, p1 in FLIGHTS:
        if t0 <= t < t1:
            u = (t - t0) / (t1 - t0)
            return p0[0] + (p1[0] - p0[0]) * u, p0[1] + (p1[1] - p0[1]) * u
    for i, t0, t1, a0, w in SEGS:
        if t0 <= t < t1 or (i == 0 and t < t0):
            p = PLANETS[i]
            a = a0 + w * (t - t0)
            return p['x'] + math.cos(a) * p['orbit'], p['y'] + math.sin(a) * p['orbit']
    return ball_at(EXIT)


def current_planet(t):
    for i, t0, t1, *_ in SEGS:
        if t0 <= t < t1:
            return i
    return None


COMET_T = COMET_LANDING - FLIGHT / 2
COMET_POS = ball_at(COMET_T)
COMET_VX = -650


def comet_at(t):
    return COMET_POS[0] + COMET_VX * (t - COMET_T), COMET_POS[1] + 40 * (t - COMET_T)


def combo_at(t):
    return sum(1 for L in LANDINGS[:-1] if t >= L)


def score_at(t):
    s, combo = 0, 0
    for i, L in enumerate(LANDINGS):
        if t >= L:
            combo += 1
            s += 1 + combo + (10 if i == len(LANDINGS) - 1 else 0)
    return s


def coins_at(t):
    return (10 if t >= COMET_T else 0) + (15 if t >= BOSS_AT else 0) + sum(1 for L in LANDINGS[:-1] if t >= L)


def camera_track():
    cams, vels = [], []
    cam, vel = -1250.0, 0.0
    sub = 4
    dt = 1 / (FPS * sub)
    for i in range(int(DURATION * FPS) + 1):
        for j in range(sub):
            t = (i * sub + j) * dt
            _, by = ball_at(t)
            target = -1250.0 if t < LANDINGS[0] - 0.15 else by - 1180 if t < EXIT else by - 900
            stiff = 30 if t < EXIT else 90
            vel += (stiff * (target - cam) - 2 * math.sqrt(stiff) * vel) * dt
            cam += vel * dt
        cams.append(cam)
        vels.append(vel)
    return cams, vels


# ---------------------------------------------------------------- world
def draw_world(img, glow, t, cam):
    d = ImageDraw.Draw(img)
    gd = ImageDraw.Draw(glow)
    fever = FEVER_AT <= t < BOSS_AT - 0.6
    for i, p in enumerate(PLANETS):
        y = p['y'] - cam
        if y < -400 or y > H + 400:
            continue
        pop = ease_out_back(prog(t, 0.15 if i == 0 else LANDINGS[0] - 0.42 + (i - 1) * 0.1, 0.45))
        if pop <= 0:
            continue
        if p.get('boss'):
            draw_boss(d, gd, p, p['x'], y, t)
            continue
        q = dict(p, r=p['r'] * pop, orbit=p['orbit'] * pop)
        x = q['x']
        active = current_planet(t) == i
        circle(gd, x / 4, y / 4, (q['r'] + 26) / 4, fill=mix((0, 0, 0), q['color'], 0.35 if active else 0.18))
        circle(d, x, y, q['orbit'], outline=mix(SPACE, q['color'], 0.28), width=2)
        circle(d, x, y, q['r'], fill=mix(SPACE, q['color'], 0.82))
        circle(d, x - q['r'] * 0.28, y - q['r'] * 0.3, q['r'] * 0.42, fill=q['color'])
        circle(d, x + q['r'] * 0.2, y + q['r'] * 0.25, q['r'] * 0.22, fill=mix(SPACE, q['color'], 0.6))
        if active:
            seg = next(s for s in SEGS if s[0] == i)
            left = 1 - clamp((t - seg[1]) / max(seg[2] - seg[1], 0.01))
            arc(d, x, y, q['r'] + 14, -90, -90 + 360 * left, mix(SPACE, MINT, 0.9), 6)

    draw_reticle(d, t, cam)
    draw_comet(d, gd, t, cam)

    bx, by = ball_at(t)
    for j in range(22, 0, -1):
        tx, ty = ball_at(max(0.0, t - j * 0.0105))
        u = 1 - j / 23
        col = hsv(t * 1.6 + j * 0.05) if fever else mix(SPACE, SKY, u * 0.9)
        r = 4 + 15 * u
        circle(d, tx, ty - cam, r, fill=mix(SPACE, col, u))
        if fever:
            circle(gd, tx / 4, (ty - cam) / 4, r / 3, fill=mix((0, 0, 0), col, u * 0.7))
    if t < LANDINGS[0] - FLIGHT:
        seg = SEGS[0]
        a = seg[3] + seg[4] * (t - seg[1])
        dx, dy = -math.sin(a), math.cos(a)
        for i in range(1, 5):
            pulse = 0.5 + 0.5 * math.sin(t * 8 - i)
            circle(d, bx + dx * i * 34, by - cam + dy * i * 34, 6, fill=mix(SPACE, WHITE, (0.75 - i * 0.14) * pulse * prog(t, 0.6, 0.4)))
    ball = hsv(t * 1.6) if fever else WHITE
    circle(gd, bx / 4, (by - cam) / 4, 12, fill=mix((0, 0, 0), ball, 0.85))
    circle(d, bx, by - cam, 23, fill=ball)

    for i, L in enumerate(LANDINGS[:-1]):
        lx, ly = ball_at(L + 1e-4)
        burst(d, gd, lx, ly - cam, t, L, PLANETS[i + 1]['color'] if L < FEVER_AT else PINK, 16, 520, 10 + i)


def draw_reticle(d, t, cam):
    """On the third hop, a target locks onto the planet's center to show what a perfect is."""
    p = PLANETS[3]
    t0 = PERFECT_AT - 0.45
    if not (t0 <= t < PERFECT_AT + 0.7):
        return
    x, y = p['x'], p['y'] - cam
    lock = ease_out_cubic(prog(t, t0, 0.4))
    out = prog(t, PERFECT_AT + 0.25, 0.45)
    r = p['r'] * (2.2 - 1.6 * lock) + out * 60
    col = mix(SPACE, MINT, 1 - out)
    rot = (1 - lock) * 1.2
    for q in range(4):
        a = rot + q * math.pi / 2
        arc(d, x, y, r, a + 0.25, a + math.pi / 2 - 0.25, col, 6)
    if lock > 0.9:
        circle(d, x, y, 9, fill=col)


def draw_comet(d, gd, t, cam):
    if t < COMET_T - 1.3 or t > COMET_T + 0.9:
        return
    if t < COMET_T:
        cx, cy = comet_at(t)
        for j in range(20, 0, -1):
            tx, ty = comet_at(t - j * 0.016)
            u = 1 - j / 21
            circle(d, tx, ty - cam, 5 + 20 * u, fill=mix(SPACE, WHITE if j < 3 else SKY, u))
            if j % 4 == 0:
                circle(gd, tx / 4, (ty - cam) / 4, 3 + 5 * u, fill=mix((0, 0, 0), SKY, u * 0.6))
        circle(gd, cx / 4, (cy - cam) / 4, 18, fill=(120, 190, 230))
        circle(d, cx, cy - cam, 30, fill=WHITE, outline=SKY, width=6)
    else:
        burst(d, gd, COMET_POS[0], COMET_POS[1] - cam, t, COMET_T, SKY, 34, 760, 91, life=0.8, glow_gain=0.5)
        burst(d, gd, COMET_POS[0], COMET_POS[1] - cam, t, COMET_T, GOLD, 18, 520, 92, life=0.7, glow_gain=0)


def draw_boss(d, gd, p, x, y, t):
    gap_half, spin = 0.62, 1.35
    gap = BOSS_ENTRY + spin * (t - BOSS_AT)
    circle(gd, x / 4, y / 4, (p['r'] + 50) / 4, fill=mix((0, 0, 0), (255, 90, 40), 0.35 + 0.15 * math.sin(t * 6)))
    circle(d, x, y, p['r'], fill=mix(SPACE, p['color'], 0.8))
    circle(d, x - 40, y - 38, 52, fill=mix(SPACE, (255, 170, 80), 0.9))
    circle(d, x + 34, y + 30, 26, fill=mix(SPACE, (200, 60, 30), 0.9))
    for ex in (-38, 38):
        circle(d, x + ex, y - 6, 15, fill=(30, 8, 8))
        circle(d, x + ex + 4, y - 9, 5, fill=WHITE)
    R = p['orbit']
    if t < BOSS_AT:
        arc(d, x, y, R, gap + gap_half, gap - gap_half + 2 * math.pi, (255, 120, 90), 16)
        arc(gd, x / 4, y / 4, R / 4, gap + gap_half, gap - gap_half + 2 * math.pi, (160, 40, 30), 4)
        return
    dt = t - BOSS_AT
    rng = np.random.RandomState(42)
    for s in range(18):
        a = gap + gap_half + s * (2 * math.pi - 2 * gap_half) / 18
        dist = R + 900 * (1 - math.exp(-3 * dt)) / 3 * rng.uniform(0.6, 1.4)
        fade = clamp(1 - dt / 0.9)
        rot = a + dt * rng.uniform(-8, 8)
        if fade <= 0:
            continue
        sx, sy = x + math.cos(a) * dist, y + math.sin(a) * dist + 120 * dt * dt
        L = 34
        d.line([(sx - math.cos(rot + 1.57) * L) * SS, (sy - math.sin(rot + 1.57) * L) * SS, (sx + math.cos(rot + 1.57) * L) * SS, (sy + math.sin(rot + 1.57) * L) * SS], fill=mix(SPACE, (255, 140, 100), fade), width=14 * SS)
    burst(d, gd, x, y, t, BOSS_AT, GOLD, 60, 1100, 77, life=1.1, glow_gain=0.3)
    burst(d, gd, x, y, t, BOSS_AT + 0.05, PINK, 30, 800, 78, life=0.9, glow_gain=0)


# ---------------------------------------------------------------- overlays
def draw_hud(d, t):
    show = prog(t, LANDINGS[0] - 0.4, 0.3) * (1 - prog(t, EXIT + 0.05, 0.2))
    if show <= 0:
        return
    a = int(255 * show)
    pop = 1 + 0.25 * max([math.exp(-(t - L) * 9) if t >= L else 0 for L in LANDINGS] + [0])
    text_center(d, str(score_at(t)), font(int(96 * pop), mono=True), W / 2, 190, WHITE + (a,))
    coins = coins_at(t)
    cpop = 1 + 0.3 * max(math.exp(-(t - COMET_T) * 8) if t >= COMET_T else 0, math.exp(-(t - BOSS_AT) * 8) if t >= BOSS_AT else 0)
    d.text((70 * SS, 190 * SS), f'● {coins}', font=font(int(44 * cpop), mono=True), fill=GOLD + (a,), anchor='lm')
    combo = combo_at(t)
    if combo >= 2:
        col = PINK if t >= FEVER_AT else MINT
        x0, y0 = W - 230, 150
        d.rounded_rectangle([x0 * SS, y0 * SS, (x0 + 170) * SS, (y0 + 76) * SS], radius=38 * SS, fill=col + (int(a * 0.95),))
        text_center(d, f'x{combo}', font(46, mono=True), x0 + 85, y0 + 38, SPACE + (a,))


def draw_popups(d, t, cam):
    for i, L in enumerate(LANDINGS[:-1]):
        dt = t - L
        if L == FEVER_AT or not 0 <= dt < 0.9:
            continue
        p = PLANETS[i + 1]
        y = p['y'] - cam - p['orbit'] - 40 - dt * 90
        a = int(255 * clamp(1.6 - dt * 1.8))
        s = ease_out_back(prog(t, L, 0.25))
        text_center(d, f'PERFECT +{i + 2}', font(44 * max(s, 0.02)), p['x'], y, (MINT if L < FEVER_AT else PINK) + (a,))
    dt = t - COMET_T
    if 0 <= dt < 1.0:
        a = int(255 * clamp(1.8 - dt * 1.9))
        s = ease_out_back(prog(t, COMET_T, 0.3), 2)
        text_center(d, 'COMET! +10', font(72 * max(s, 0.02)), COMET_POS[0] if 260 < COMET_POS[0] < 820 else 540, COMET_POS[1] - cam - 120 - dt * 80, SKY + (a,))


def banner(d, txt, t, t0, t1, color, size, y, ghost=None):
    if not (t0 <= t < t1 + 0.3):
        return
    p = ease_out_back(prog(t, t0, 0.35), 1.5)
    out = ease_in_out(prog(t, t1, 0.3))
    scale = max(0.05, p * (1 + 0.25 * out))
    a = int(255 * (1 - out))
    f = font(size * scale)
    if ghost:
        jit = 10 * math.sin(t * 40) * (1 - prog(t, t0, 0.5))
        text_center(d, txt, f, W / 2 - 8 - jit, y, ghost[0] + (int(a * 0.6),))
        text_center(d, txt, f, W / 2 + 8 + jit, y, ghost[1] + (int(a * 0.6),))
    text_center(d, txt, f, W / 2, y, color + (a,))


def caption(d, t, txt, t0, t1, highlight=None, color=PINK):
    if not (t0 - 0.05 <= t < t1 + 0.35):
        return
    f = font(66)
    y = 1620
    p = ease_out_cubic(prog(t, t0, 0.4))
    out = ease_in_out(prog(t, t1, 0.3))
    a = int(255 * p * (1 - out))
    dy = (1 - p) * 50 - out * 40
    w = d.textlength(txt, font=f)
    pad = 40 * SS
    d.rounded_rectangle([W * SS / 2 - w / 2 - pad, (y + dy - 62) * SS, W * SS / 2 + w / 2 + pad, (y + dy + 62) * SS], radius=62 * SS, fill=SPACE + (int(a * 0.72),))
    x = W * SS / 2 - w / 2
    for word in txt.split(' '):
        col = color if highlight and highlight in word else WHITE
        d.text((x, (y + dy) * SS), word, font=f, fill=col + (a,), anchor='lm')
        x += d.textlength(word + ' ', font=f)


def tap_ripple(d, t):
    t0 = LANDINGS[0] - FLIGHT - 0.06
    for i in range(3):
        dt = t - t0 - i * 0.09
        if 0 <= dt < 0.7:
            r = 30 + dt * 260
            a = int(255 * (1 - dt / 0.7))
            d.ellipse([(W / 2 - r) * SS, (1640 - r) * SS, (W / 2 + r) * SS, (1640 + r) * SS], outline=WHITE + (a,), width=6 * SS)
    if t0 - 0.5 < t < t0 + 0.5:
        text_center(d, 'TAP', font(40), W / 2, 1760, WHITE + (int(255 * clamp(1 - abs(t - t0) / 0.5)),))


# ---------------------------------------------------------------- worlds, rewards, compete, end
def zone_tint(t):
    """During the worlds beat, the background rolls through every zone color."""
    u = prog(t, WORLDS_IN, REWARDS_IN - WORLDS_IN - 0.25) * (len(ZONES) - 1)
    i = min(int(u), len(ZONES) - 2)
    return mix(ZONES[i][1], ZONES[i + 1][1], ease_in_out(u - i))


def draw_worlds(d, t):
    out = ease_in_out(prog(t, REWARDS_IN - 0.3, 0.3))
    if out >= 1:
        return
    kinetic(d, '6 WORLDS', font(170), W / 2, 760, t, WORLDS_IN + 0.05, WHITE, stagger=0.05, out_at=REWARDS_IN - 0.3)
    kinetic(d, 'TO EXPLORE', font(96), W / 2, 920, t, WORLDS_IN + 0.3, SKY, stagger=0.03, out_at=REWARDS_IN - 0.28)
    u = prog(t, WORLDS_IN, REWARDS_IN - WORLDS_IN - 0.25) * (len(ZONES) - 1)
    i = min(int(round(u)), len(ZONES) - 1)
    a = int(255 * prog(t, WORLDS_IN + 0.5, 0.25) * (1 - out))
    frac = u - math.floor(u)
    roll = (1 - ease_out_cubic(clamp(frac * 3))) * 30
    text_center(d, f'ZONE {i + 1} · {ZONES[i][0]}', font(54, mono=True), W / 2, 1080 + roll, MINT + (a,))


def draw_rewards(d, t):
    leave = ease_in_out(prog(t, COMPETE_IN - 0.3, 0.3))
    if leave >= 1:
        return
    kinetic(d, 'UNLOCK IT ALL', font(104), W / 2, 330, t, REWARDS_IN, WHITE, stagger=0.035, out_at=COMPETE_IN - 0.3)
    text_center(d, '100% free. Earned by playing.', font(46, heavy=False), W / 2, 440, SKY + (int(255 * prog(t, REWARDS_IN + 0.4, 0.3) * (1 - leave)),))
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
        cx, cy, local = x + 175, y + 165, t - t0
        if i == 0:
            skins = [WHITE, (255, 138, 61), (125, 255, 178), (199, 125, 255), (255, 77, 109), (139, 233, 253)]
            col = skins[int(max(local, 0) / 0.32) % len(skins)]
            for j in range(10, 0, -1):
                ang, u = local * 4 - j * 0.12, 1 - j / 11
                circle(d, cx + math.cos(ang) * 80, cy + math.sin(ang) * 80, 6 + 12 * u, fill=mix(PANEL, col, u) + (a,))
            circle(d, cx, cy, 44, fill=mix(PANEL, col, 0.35) + (a,))
            circle(d, cx + math.cos(local * 4) * 80, cy + math.sin(local * 4) * 80, 22, fill=col + (a,))
        elif i == 1:
            for j, tc in enumerate([k.BRONZE, k.SILVER, GOLD, k.PLATINUM, k.DIAMOND]):
                lit = ease_out_back(prog(t, t0 + 0.35 + j * 0.13, 0.3))
                circle(d, cx - 120 + j * 60, cy, 22 + 6 * lit, fill=mix(PANEL, tc, 0.25 + 0.75 * lit) + (a,))
        else:
            fill = ease_in_out(prog(t, t0 + 0.3, 1.2))
            d.rounded_rectangle([(cx - 110) * SS, (cy + 30) * SS, (cx + 110) * SS, (cy + 52) * SS], radius=11 * SS, fill=(255, 255, 255, int(a * 0.15)))
            d.rounded_rectangle([(cx - 110) * SS, (cy + 30) * SS, (cx - 110 + max(22, 220 * fill)) * SS, (cy + 52) * SS], radius=11 * SS, fill=GOLD + (a,))
            text_center(d, f'TIER {1 + int(29 * fill)}', font(44, mono=True), cx, cy - 30, GOLD + (a,))
            star(d, cx + 105, cy - 80, 26, GOLD, a, local * 1.5)


BOARD = [('NovaQueen', 214), ('Zed', 188), ('Pilot-7F2A', 161), ('Mira', 140), ('YOU', 96)]


def draw_compete(d, t):
    leave = ease_in_out(prog(t, END_IN - 0.3, 0.3))
    if t < COMPETE_IN - 0.05 or leave >= 1:
        return
    kinetic(d, 'COMPETE DAILY', font(104), W / 2, 330, t, COMPETE_IN, WHITE, stagger=0.035, out_at=END_IN - 0.3)
    text_center(d, 'Same planets for everyone. Every day.', font(44, heavy=False), W / 2, 440, SKY + (int(255 * prog(t, COMPETE_IN + 0.4, 0.3) * (1 - leave)),))
    # daily medals card
    p = spring(prog(t, COMPETE_IN + 0.2, 0.9))
    a = int(255 * min(1, prog(t, COMPETE_IN + 0.2, 0.2)) * (1 - leave))
    x = 90 + (1 - p) * 900 - leave * 1200
    card(d, x, 540, 900, 230, GOLD, a)
    for j, (name, col) in enumerate([('Bronze', k.BRONZE), ('Silver', k.SILVER), ('Gold', GOLD)]):
        lit = ease_out_back(prog(t, COMPETE_IN + 0.55 + j * 0.2, 0.35))
        mx = x + 170 + j * 280
        circle(d, mx, 655, 44 * max(lit, 0.6), fill=mix(PANEL, col, 0.3 + 0.7 * lit) + (a,))
        star(d, mx, 655, 22 * max(lit, 0.01), PANEL, a)
        d.text(((mx + 62) * SS, 655 * SS), name, font=font(40), fill=mix(PANEL, col, 0.4 + 0.6 * lit) + (a,), anchor='lm')
    # leaderboard: YOU climbs from 5th to 1st
    p2 = spring(prog(t, COMPETE_IN + 0.4, 0.9))
    a2 = int(255 * min(1, prog(t, COMPETE_IN + 0.4, 0.2)) * (1 - leave))
    lx = 90 + (1 - p2) * 900 - leave * 1300
    card(d, lx, 810, 900, 760, PINK, a2)
    climb = ease_in_out(prog(t, COMPETE_IN + 0.9, 0.9))
    you_score = int(96 + climb * (231 - 96))
    others = BOARD[:4]
    for j, (name, score) in enumerate(others):
        slot = j + (1 if climb > 0 else 0) * climb  # everyone slides down one as YOU passes
        y = 900 + slot * 130
        d.text(((lx + 70) * SS, y * SS), f'#{j + 1 + int(round(climb))}', font=font(44, mono=True), fill=WHITE + (int(a2 * 0.6),), anchor='lm')
        d.text(((lx + 200) * SS, y * SS), name, font=font(46), fill=WHITE + (a2,), anchor='lm')
        d.text(((lx + 820) * SS, y * SS), str(score), font=font(44, mono=True), fill=WHITE + (int(a2 * 0.8),), anchor='rm')
    ys = 900 + (4 - 4 * climb) * 130
    d.rounded_rectangle([(lx + 30) * SS, (ys - 52) * SS, (lx + 870) * SS, (ys + 52) * SS], radius=30 * SS, fill=MINT + (a2,))
    d.text(((lx + 70) * SS, ys * SS), f'#{5 - int(round(4 * climb))}', font=font(44, mono=True), fill=SPACE + (a2,), anchor='lm')
    d.text(((lx + 200) * SS, ys * SS), 'YOU', font=font(46), fill=SPACE + (a2,), anchor='lm')
    d.text(((lx + 820) * SS, ys * SS), str(you_score), font=font(44, mono=True), fill=SPACE + (a2,), anchor='rm')
    if climb >= 1:
        cp = ease_out_back(prog(t, COMPETE_IN + 1.8, 0.35), 2.2)
        star(d, lx + 860, ys - 40, 34 * cp, GOLD, a2, t * 2)


def draw_end(img, glow, t):
    d = ImageDraw.Draw(img, 'RGBA')
    gd = ImageDraw.Draw(glow)
    t0 = END_IN
    f = font(190)
    total = d.textlength('ORBIT', font=f) + 4 * 26 * SS
    x = W * SS / 2 - total / 2
    for i, ch in enumerate('ORBIT'):
        p = ease_out_back(prog(t, t0 + i * 0.06, 0.45), 2.2)
        if p > 0:
            d.text((x, 760 * SS - (1 - p) * 220 * SS), ch, font=f, fill=WHITE + (int(255 * min(1, prog(t, t0 + i * 0.06, 0.15))),), anchor='lm')
        x += d.textlength(ch, font=f) + 26 * SS
    hp = prog(t, t0 + 0.35, 0.4)
    text_center(d, 'h o p', font(84, heavy=False, mono=True), W / 2 + (1 - ease_out_cubic(hp)) * 120, 900, MINT + (int(255 * hp),))
    op = prog(t, t0 + 0.15, 0.4)
    if op > 0:
        for j in range(22, -1, -1):
            ang = (t - j * 0.015) * 3.1 + 2.2
            u = 1 - j / 23
            px, py = W / 2 + math.cos(ang) * 470, 820 + math.sin(ang) * 175
            circle(d, px, py, (5 + 17 * u) if j else 24, fill=mix(SPACE, SKY if j else WHITE, u * op) + (255,))
            if j == 0:
                circle(gd, px / 4, py / 4, 11, fill=mix((0, 0, 0), WHITE, 0.8 * op))
    kinetic(d, 'How high can you hop?', font(64, heavy=False), W / 2, 1180, t, t0 + 0.55, SKY, stagger=0.018, dur=0.35, rise=40)
    cp = spring(prog(t, t0 + 0.8, 0.8))
    if cp > 0:
        pulse = 1 + 0.03 * math.sin((t - t0) * 7)
        bw, bh, cy = 620 * cp * pulse, 150 * cp * pulse, 1450
        d.rounded_rectangle([(W / 2 - bw / 2) * SS, (cy - bh / 2) * SS, (W / 2 + bw / 2) * SS, (cy + bh / 2) * SS], radius=int(bh / 2 * SS), fill=MINT + (255,))
        circle(gd, W / 2 / 4, cy / 4, 26 * cp, fill=(30, 80, 50))
        for start in (t0 + 1.05, t0 + 2.3):  # two shine sweeps over the longer hold
            sp = prog(t, start, 0.45)
            if 0 < sp < 1:
                left, right = W / 2 - bw / 2 + bh / 2, W / 2 + bw / 2 - bh / 2 + 40
                sx = left + sp * (right - left)
                d.polygon([((sx - 30) * SS, (cy - bh / 2) * SS), ((sx + 20) * SS, (cy - bh / 2) * SS), ((sx - 10) * SS, (cy + bh / 2) * SS), ((sx - 60) * SS, (cy + bh / 2) * SS)], fill=(255, 255, 255, 110))
        if cp > 0.6:
            text_center(d, 'PLAY FREE', font(66 * cp), W / 2, cy, SPACE + (255,))
    text_center(d, 'Free on iPhone & Android', font(42, heavy=False), W / 2, 1620, WHITE + (int(230 * prog(t, t0 + 1.0, 0.3)),))


# ---------------------------------------------------------------- frame
CAMS = VELS = None


def render_frame(i):
    t = i / FPS
    cam, vel = CAMS[i], VELS[i]
    fever = FEVER_AT <= t < BOSS_AT - 0.6
    tint = SPACE
    if t >= FEVER_AT - 0.2:
        tint = mix(SPACE, k.NEBULA, prog(t, FEVER_AT - 0.2, 0.5))
    if t >= BOSS_AT - 0.9:
        tint = mix(tint, k.INFERNO, prog(t, BOSS_AT - 0.9, 0.6))
    if t >= WORLDS_IN - 0.2:
        tint = mix(tint, zone_tint(t), prog(t, WORLDS_IN - 0.2, 0.3))
    if t >= REWARDS_IN - 0.3:
        tint = mix(tint, k.NEBULA, prog(t, REWARDS_IN - 0.3, 0.4))
    if t >= END_IN - 0.3:
        tint = mix(tint, SPACE, prog(t, END_IN - 0.3, 0.5))

    shake = 26 * math.exp(-(t - BOSS_AT) * 6) if t >= BOSS_AT else 0.0
    shake += 10 * math.exp(-(t - COMET_T) * 9) if t >= COMET_T else 0.0
    sx, sy = shake * math.sin(t * 91), shake * math.cos(t * 77)

    whip = vel * (1 - prog(t, REWARDS_IN - 0.4, 0.4)) if t >= EXIT else 0
    img = k.background(t, cam, whip, tint).convert('RGBA')
    glow = Image.new('RGB', (W // 4 * SS, H // 4 * SS))
    world = Image.new('RGBA', img.size, (0, 0, 0, 0))
    if t < WORLDS_IN + 0.6:
        draw_world(world, glow, t, cam)
    ui = Image.new('RGBA', img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(ui, 'RGBA')
    if t < WORLDS_IN:
        kinetic(d, 'ONE', font(230), W / 2, 380, t, 0.35, WHITE, stagger=0.07, dur=0.45, rise=110, out_at=LANDINGS[0] - 0.75)
        kinetic(d, 'TAP.', font(230), W / 2, 610, t, 0.85, MINT, stagger=0.07, dur=0.45, rise=110, out_at=LANDINGS[0] - 0.7)
        tap_ripple(d, t)
        draw_hud(d, t)
        draw_popups(d, t, cam)
        caption(d, t, 'Hop from planet to planet', LANDINGS[0] - 0.05, LANDINGS[1] + 0.3)
        caption(d, t, 'Hit the center for PERFECT', LANDINGS[1] + 0.65, FEVER_AT - 0.1, highlight='PERFECT', color=MINT)
        caption(d, t, 'Chain perfects. Go FEVER.', FEVER_AT + 0.15, LANDINGS[7] - 0.1, highlight='FEVER')
        caption(d, t, 'Catch comets for bonus coins', LANDINGS[7] + 0.05, LANDINGS[9] + 0.3, highlight='comets', color=SKY)
        caption(d, t, 'Beat the bosses', LANDINGS[9] + 0.6, EXIT + 0.05, highlight='bosses', color=GOLD)
        banner(d, 'FEVER!', t, FEVER_AT, FEVER_AT + 0.8, PINK, 200, 800, ghost=(CYAN, (255, 60, 120)))
        banner(d, 'BOSS CLEARED!', t, BOSS_AT, BOSS_AT + 0.6, GOLD, 96, 470, ghost=(PINK, (255, 120, 40)))
    if WORLDS_IN <= t < REWARDS_IN:
        draw_worlds(d, t)
    if REWARDS_IN - 0.05 <= t < COMPETE_IN + 0.05:
        draw_rewards(d, t)
    if COMPETE_IN - 0.05 <= t < END_IN + 0.1:
        draw_compete(d, t)
    if t >= END_IN - 0.05:
        draw_end(ui, glow, t)

    if shake:
        world = world.transform(world.size, Image.AFFINE, (1, 0, -sx * SS, 0, 1, -sy * SS))
    img.alpha_composite(world)
    g = glow.filter(ImageFilter.GaussianBlur(7 * SS / 2)).resize(img.size, Image.BILINEAR)
    img = Image.fromarray(np.minimum(255, np.asarray(img.convert('RGB'), np.uint16) + np.asarray(g, np.uint16) * 2).astype(np.uint8)).convert('RGBA')
    img.alpha_composite(ui)
    out = img.convert('RGB')

    flash = 0.0
    for at, amount, sharp in [(BOSS_AT, 0.4, 14), (FEVER_AT, 0.28, 14), (COMET_T, 0.25, 16)]:
        if t >= at:
            flash = max(flash, amount * math.exp(-(t - at) * sharp))
    flash = max(flash, 0.55 * math.exp(-(t - (WORLDS_IN - 0.02)) ** 2 * 900))
    if fever:
        beat = ((t - FEVER_AT) / BEAT) % 1
        out = Image.blend(out, Image.new('RGB', out.size, PINK), 0.06 * math.exp(-beat * 5))
    if flash > 0.01:
        out = Image.blend(out, Image.new('RGB', out.size, (255, 248, 230)), min(flash, 1))
    if t < 0.4:
        out = Image.blend(Image.new('RGB', out.size, (0, 0, 0)), out, t / 0.4)
    return out.resize((W, H), Image.LANCZOS)


def write_frame(args):
    i, path = args
    render_frame(i).save(os.path.join(path, f'f{i:05d}.png'), compress_level=1)
    return i


def init_worker(cams, vels):
    global CAMS, VELS
    CAMS, VELS = cams, vels


# ---------------------------------------------------------------- audio
def soundtrack():
    RATE = k.RATE
    buf = np.zeros(int(DURATION * RATE) + RATE)
    place, tone, kick, hat, NOTE = k.place, k.tone, k.kick, k.hat, k.NOTE
    sections = [
        (['F', 'A', 'C', 'E'], 0, 4), (['C', 'E', 'G', 'B'], 4, 9), (['A', 'C', 'E', 'G'], 9, 12), (['F', 'A', 'C', 'E'], 12, 14),
        (['A', 'C', 'E', 'G'], 14, 17), (['D', 'F', 'A', 'C'], 17, 19), (['F', 'A', 'C', 'E'], 19, 22), (['G', 'B', 'D', 'F'], 22, 25), (['C', 'E', 'G', 'D'], 25, 31),
    ]
    roots = {}
    for names, b0, b1 in sections:
        place(buf, k.chord(names, 3, B(b1 - b0) + 0.6), B(b0), 0.9)
        for b in range(b0, b1):
            roots[b] = names[0]
    scale = ['C', 'D', 'E', 'G', 'A']
    beats = int(DURATION / BEAT) + 1
    for b in range(beats):
        at = B(b)
        full = 3 <= b <= 16 or 19 <= b <= 24 or b >= 25
        if full:
            place(buf, kick(), at, 0.9 if b < 25 else 0.6)
        elif b in (1, 2):
            place(buf, kick(), at, 0.35)
        if 4 <= b <= 16 or 19 <= b <= 24:
            place(buf, hat(seed=b), at + BEAT / 2, 0.25)
            place(buf, hat(seed=b + 50), at + BEAT * 0.75, 0.12)
        if b >= 3 and b not in (17, 18):
            place(buf, tone(NOTE[roots.get(b, 'C')] / 4, BEAT * 0.9, ((1, 1.0), (2, 0.5), (3, 0.2)), decay=0.35), at, 0.35)
    for j in range(int(B(16 - 4) / (BEAT / 2))):
        place(buf, tone(NOTE[scale[(j * 2) % 5]] * 2, 0.25, ((1, 1.0), (2, 0.3)), decay=0.12), B(4) + j * BEAT / 2, 0.12)
    for j in range(int(B(25 - 19) / (BEAT / 2))):
        place(buf, tone(NOTE[scale[(j * 3) % 5]] * 2, 0.25, ((1, 1.0), (2, 0.3)), decay=0.12), B(19) + j * BEAT / 2, 0.1)
    for i, L in enumerate(LANDINGS[:-1]):
        place(buf, k.load_wav('launch'), L - FLIGHT, 0.6)
        place(buf, k.load_wav(f'perfect_{min(i + 2, 8)}'), L, 0.85)
    place(buf, k.load_wav('launch'), BOSS_AT - FLIGHT, 0.6)
    place(buf, k.load_wav('fever'), FEVER_AT, 0.8)
    place(buf, k.load_wav('comet'), COMET_T, 0.9)
    place(buf, k.riser(B(2)), BOSS_AT - B(2), 0.5)
    place(buf, k.load_wav('boss'), BOSS_AT, 1.0)
    place(buf, kick(0.6), BOSS_AT, 1.2)
    place(buf, k.whoosh(0.55), EXIT - 0.05, 0.8)
    for z in range(len(ZONES)):
        place(buf, tone(NOTE[scale[z % 5]] * 2, 0.35, ((1, 1.0), (2, 0.35), (3, 0.15)), decay=0.18), WORLDS_IN + 0.15 + z * (B(2) - 0.25) / (len(ZONES) - 1), 0.25)
    for i in range(3):
        place(buf, tone(NOTE[['C', 'E', 'G'][i]] * 2, 0.3, ((1, 1.0), (2, 0.4), (3, 0.15)), decay=0.15), REWARDS_IN + 0.25 + i * 0.18, 0.35)
    for j in range(5):
        place(buf, tone(NOTE[scale[j]] * 4, 0.2, ((1, 1.0), (2.01, 0.3)), decay=0.1), REWARDS_IN + 0.6 + j * 0.13, 0.25)
    for j in range(3):
        place(buf, tone(NOTE[['E', 'G', 'C'][j]] * 2 * (2 if j == 2 else 1), 0.3, ((1, 1.0), (2, 0.4)), decay=0.15), COMPETE_IN + 0.55 + j * 0.2, 0.3)
    place(buf, k.riser(0.9), COMPETE_IN + 0.9, 0.25)
    place(buf, k.load_wav('best'), COMPETE_IN + 1.8, 0.6)
    place(buf, k.load_wav('best'), END_IN, 0.7)
    place(buf, k.load_wav('coin'), END_IN + 1.05, 0.5)
    place(buf, k.load_wav('coin'), END_IN + 2.3, 0.4)
    buf = buf[: int(DURATION * RATE)]
    fade = np.ones_like(buf)
    tail = int(0.6 * RATE)
    fade[-tail:] = np.linspace(1, 0, tail)
    buf = np.tanh(buf * fade * 1.1)
    return buf / max(1e-6, np.abs(buf).max()) * 0.89


def main():
    out_dir = k.OUT_DIR
    os.makedirs(out_dir, exist_ok=True)
    cams, vels = camera_track()
    only = [float(x) for x in sys.argv[1:]]  # optional: preview these times (seconds) as PNGs
    if only:
        init_worker(cams, vels)
        for s in only:
            i = min(int(s * FPS), len(cams) - 1)
            render_frame(i).save(os.path.join(out_dir, f'preview20-{i:05d}.png'))
        return
    tmp = tempfile.mkdtemp(prefix='orbit-ad20-')
    try:
        frames = int(DURATION * FPS)
        with Pool(os.cpu_count(), initializer=init_worker, initargs=(cams, vels)) as pool:
            for done in pool.imap_unordered(write_frame, [(i, tmp) for i in range(frames)], chunksize=6):
                if done % 120 == 0:
                    print(f'frame {done}/{frames}', flush=True)
        wav = os.path.join(tmp, 'audio.wav')
        k.write_wav(wav, soundtrack())
        out = os.path.join(out_dir, 'orbit-hop-ad-20s.mp4')
        subprocess.run([
            'ffmpeg', '-y', '-loglevel', 'error', '-framerate', str(FPS), '-i', os.path.join(tmp, 'f%05d.png'), '-i', wav,
            '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
            '-c:a', 'aac', '-b:a', '192k', '-shortest', out,
        ], check=True)
        print('wrote', out)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


if __name__ == '__main__':
    main()
