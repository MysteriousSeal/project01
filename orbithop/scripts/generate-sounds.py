#!/usr/bin/env python3
"""Synthesizes the game's sound effects into assets/sounds as small 16-bit mono WAV files.

Everything is generated from sine tones, sweeps and filtered noise, so there are no
third-party audio assets. Run from the game folder: python3 scripts/generate-sounds.py
"""
import math
import os
import random
import struct
import wave

RATE = 22050
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'sounds')

# Pentatonic scale for combo-driven perfect landings: C5 D5 E5 G5 A5 C6 D6 E6.
PERFECT_SCALE = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51]


def env(t, dur, attack=0.005, curve=4.0):
    if t < attack:
        return t / attack
    return max(0.0, 1 - (t - attack) / max(dur - attack, 1e-6)) ** curve * 1.0


def tone(freq, dur, vol=0.5, harmonics=((1, 1.0),), attack=0.005, curve=3.0):
    n = int(dur * RATE)
    return [
        vol * env(i / RATE, dur, attack, curve) * sum(a * math.sin(2 * math.pi * freq * h * i / RATE) for h, a in harmonics)
        for i in range(n)
    ]


def sweep(f0, f1, dur, vol=0.5, curve=2.0, attack=0.005):
    n = int(dur * RATE)
    out, phase = [], 0.0
    for i in range(n):
        k = i / n
        f = f0 * (f1 / f0) ** k
        phase += 2 * math.pi * f / RATE
        out.append(vol * env(i / RATE, dur, attack, curve) * math.sin(phase))
    return out


def noise(dur, vol=0.3, curve=3.0, smooth=0.5, seed=1):
    rng = random.Random(seed)
    n = int(dur * RATE)
    out, last = [], 0.0
    for i in range(n):
        last = last * smooth + rng.uniform(-1, 1) * (1 - smooth)
        out.append(vol * env(i / RATE, dur, 0.002, curve) * last)
    return out


def mix(*parts):
    n = max(len(p) for _, p in parts)
    out = [0.0] * n
    for offset, p in parts:
        start = int(offset * RATE)
        for i, v in enumerate(p):
            if start + i < n:
                out[start + i] += v
            else:
                out.append(v)
    return out


def seq(notes, step, dur, vol=0.4, harmonics=((1, 1.0), (2, 0.3))):
    return mix(*[(i * step, tone(f, dur, vol, harmonics)) for i, f in enumerate(notes)])


BELL = ((1, 1.0), (2, 0.45), (3, 0.2), (4.2, 0.1))


def sounds():
    yield 'launch', mix((0, sweep(260, 620, 0.09, 0.28, 1.5)), (0, noise(0.07, 0.12, 2, 0.7)))
    yield 'land', mix((0, tone(392, 0.13, 0.45, ((1, 1.0), (2, 0.25)), curve=4)), (0, noise(0.03, 0.15, 3, 0.85)))
    for i, f in enumerate(PERFECT_SCALE, start=1):
        yield f'perfect_{i}', tone(f, 0.32, 0.42, BELL, curve=3)
    yield 'coin', mix((0, tone(987.77, 0.07, 0.35, BELL)), (0.06, tone(1318.51, 0.16, 0.35, BELL)))
    yield 'power', seq([659.25, 830.61, 987.77], 0.06, 0.16, 0.35)
    yield 'saved', mix((0, tone(1567.98, 0.3, 0.3, BELL)), (0, sweep(400, 1200, 0.15, 0.2)))
    yield 'fever', mix((0, seq([523.25, 659.25, 783.99, 1046.5, 1318.51], 0.05, 0.18, 0.3, BELL)), (0.25, tone(1567.98, 0.35, 0.18, BELL)))
    yield 'milestone', seq([783.99, 1174.66], 0.09, 0.3, 0.38, BELL)
    yield 'best', seq([523.25, 659.25, 783.99, 1046.5], 0.1, 0.4, 0.33, BELL)
    yield 'boss', mix((0, sweep(110, 55, 0.35, 0.55, 2)), (0, noise(0.25, 0.3, 2.5, 0.8)), (0.12, seq([392, 493.88, 587.33], 0.0, 0.5, 0.18, BELL)))
    yield 'comet', mix(*[(i * 0.035, tone(1200 + i * 260, 0.18, 0.22, BELL)) for i in range(7)])
    yield 'zone', mix((0, tone(261.63, 0.7, 0.18, ((1, 1.0), (1.5, 0.5), (2, 0.4)), attack=0.2, curve=1.5)))
    yield 'ghost', seq([880, 1174.66], 0.07, 0.18, 0.3, BELL)
    yield 'death', mix((0, sweep(420, 70, 0.45, 0.5, 1.6)), (0, noise(0.3, 0.35, 2, 0.75)))
    yield 'revive', mix((0, sweep(220, 880, 0.35, 0.3, 1.2)), (0.25, seq([659.25, 880, 1318.51], 0.0, 0.45, 0.2, BELL)))


def write(name, samples):
    peak = max(1e-6, max(abs(s) for s in samples))
    scale = min(1.0, 0.9 / peak)
    path = os.path.join(OUT, f'{name}.wav')
    with wave.open(path, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(b''.join(struct.pack('<h', int(max(-1, min(1, s * scale)) * 32767)) for s in samples))


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    for name, samples in sounds():
        write(name, samples)
        print(f'{name}.wav  {len(samples) / RATE:.2f}s')
