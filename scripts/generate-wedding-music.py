"""Render the original 'Lời hẹn' piano miniature. Optional: pip install numpy lameenc.
No recordings or melody from the reference wedding invitation are used.
"""
from pathlib import Path
import numpy as np
import lameenc

RATE = 44100
BEAT = 60 / 72
CHORDS = [
    (41, [65, 69, 72, 76]), (40, [64, 67, 71, 74]),
    (38, [62, 65, 69, 72]), (34, [62, 65, 69, 70]),
    (36, [64, 67, 69, 72]), (41, [65, 69, 72, 77]),
] * 2
sound = np.zeros(int((len(CHORDS) * 4 * BEAT + 3) * RATE))


def note(midi, start, strength, duration=3.2):
    t = np.arange(int(duration * RATE)) / RATE
    frequency = 440 * 2 ** ((midi - 69) / 12)
    voice = np.zeros_like(t)
    for harmonic, weight in [(1, 1), (2, .32), (3, .12), (4, .04)]:
        decay = np.exp(-t * (1.2 + harmonic * .25))
        voice += weight * decay * np.sin(2 * np.pi * frequency * harmonic * t)
    voice *= np.minimum(1, t / .008) * np.minimum(1, (duration - t) / .12)
    offset = int(start * RATE)
    stop = min(len(sound), offset + len(voice))
    sound[offset:stop] += voice[:stop - offset] * strength


for bar, (bass, chord) in enumerate(CHORDS):
    start = bar * 4 * BEAT
    note(bass, start, .3, 4)
    pattern = [0, 1, 2, 3, 2, 1, 3, 2]
    for index, degree in enumerate(pattern):
        note(chord[degree], start + index * BEAT / 2, .18 if index % 2 == 0 else .13)
    # An original sparse melody sits above the broken chords.
    note(chord[3] + 12, start + BEAT, .085)
    note(chord[2] + 12, start + BEAT * 3, .07)

# Quiet room echoes, then gentle fades at the loop boundaries.
dry = sound.copy()
for seconds, gain in [(.08, .08), (.17, .06), (.29, .04)]:
    shift = int(seconds * RATE)
    sound[shift:] += dry[:-shift] * gain
sound[:RATE] *= np.linspace(0, 1, RATE)
sound[-2 * RATE:] *= np.linspace(1, 0, 2 * RATE)
sound *= .72 / max(1, np.max(np.abs(sound)))
pcm = (sound * 32767).astype('<i2').tobytes()
encoder = lameenc.Encoder()
encoder.set_bit_rate(128)
encoder.set_in_sample_rate(RATE)
encoder.set_channels(1)
encoder.set_quality(2)
target = Path(__file__).resolve().parent.parent / 'public/audio/loi-hen.mp3'
target.write_bytes(encoder.encode(pcm) + encoder.flush())
print(target.name, target.stat().st_size, 'bytes')
