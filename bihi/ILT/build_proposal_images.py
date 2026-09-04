"""Generate flat-geometric banner images for the 10 ILT project proposals.

Style: slate gradient background with coral (#f56a6a) and cream (#f2f0ea)
motifs, matching the Editorial template's accent palette. Each proposal gets
one iconographic composition. Rerun after editing any draw function.
"""
import math
import os

from PIL import Image, ImageDraw

OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "images")
CORAL = (245, 106, 106)
CORAL_DARK = (216, 88, 88)
CREAM = (242, 240, 234)
DARK = (47, 53, 57)
SLATE_TOP = (52, 59, 65)
SLATE_BOTTOM = (72, 81, 88)
W, H = 800, 500


def canvas():
    img = Image.new("RGB", (W, H), SLATE_TOP)
    d = ImageDraw.Draw(img)
    # Vertical gradient
    for y in range(H):
        t = y / (H - 1)
        c = tuple(round(SLATE_TOP[i] + (SLATE_BOTTOM[i] - SLATE_TOP[i]) * t) for i in range(3))
        d.line([(0, y), (W, y)], fill=c)
    # Soft background circles
    d.ellipse((560, -140, 940, 240), fill=(86, 96, 104))
    d.ellipse((-120, 340, 200, 660), fill=(62, 70, 77))
    return img, d


def line(d, pts, color, width):
    d.line(pts, fill=color, width=width, joint="curve")
    r = width // 2
    for x, y in (pts[0], pts[-1]):
        d.ellipse((x - r, y - r, x + r, y + r), fill=color)


def arc_ring(d, box, start, end, color, width):
    d.arc(box, start, end, fill=color, width=width)


def prop01_cold_case(d):
    # Magnifying glass
    arc_ring(d, (280, 130, 500, 350), 0, 360, CORAL, 26)
    line(d, [(462, 312), (580, 430)], CREAM, 40)
    # Fingerprint whorls inside the lens
    arc_ring(d, (330, 180, 450, 300), 200, 90, CREAM, 7)
    arc_ring(d, (350, 200, 430, 280), 200, 90, CORAL, 7)
    line(d, [(398, 208), (398, 272)], CREAM, 7)
    # Question-mark dots of evidence
    for x, y in [(600, 160), (650, 200), (170, 120)]:
        d.ellipse((x, y, x + 18, y + 18), fill=CREAM)


def prop02_soundwaves(d):
    # Microphone capsule
    d.rounded_rectangle((358, 110, 442, 285), radius=42, fill=CORAL)
    for y in (160, 200, 240):
        d.line([(374, y), (426, y)], fill=CORAL_DARK, width=8)
    # U bracket and stand
    arc_ring(d, (318, 130, 482, 300), 0, 180, CREAM, 18)
    line(d, [(400, 296), (400, 392)], CREAM, 14)
    line(d, [(338, 396), (462, 396)], CREAM, 14)
    # Sound arcs both sides
    for i, r in enumerate((30, 55)):
        arc_ring(d, (250 - r, 200 - r - 20, 250 + r, 200 + r + 20), 110, 250, CORAL, 8)
        arc_ring(d, (550 - r, 200 - r - 20, 550 + r, 200 + r + 20), 290, 70, CORAL, 8)


def prop03_escape_room(d):
    # Padlock
    arc_ring(d, (330, 120, 470, 270), 180, 360, CREAM, 22)
    d.rounded_rectangle((305, 235, 495, 395), radius=20, fill=CORAL)
    d.ellipse((378, 285, 422, 329), fill=DARK)
    d.rectangle((391, 310, 409, 355), fill=DARK)
    # Combination dial dots
    for x in (340, 460):
        d.ellipse((x - 12, 355, x + 12, 379), fill=CREAM)


def prop04_arcade(d):
    # Joystick
    d.rounded_rectangle((295, 330, 505, 385), radius=18, fill=CORAL)
    line(d, [(400, 335), (400, 225)], CREAM, 18)
    d.ellipse((362, 155, 438, 231), fill=CORAL)
    d.ellipse((382, 175, 418, 211), fill=CORAL_DARK)
    # Tokens
    for x, y in ((540, 180), (590, 255), (215, 225)):
        d.ellipse((x - 26, y - 26, x + 26, y + 26), fill=CREAM)
        d.ellipse((x - 10, y - 10, x + 10, y + 10), fill=DARK)


def prop05_sprout(d):
    # Pot and rim
    d.polygon([(320, 305), (480, 305), (452, 415), (348, 415)], fill=CORAL)
    d.rounded_rectangle((305, 280, 495, 315), radius=10, fill=CORAL_DARK)
    # Stems and leaves
    for x, top in ((400, 160), (352, 205), (448, 195)):
        line(d, [(x, 290), (x, top)], CREAM, 9)
    d.ellipse((372, 120, 428, 168), fill=CREAM)
    d.ellipse((318, 165, 368, 210), fill=CORAL)
    d.ellipse((432, 152, 482, 197), fill=CREAM)
    # Sun
    arc_ring(d, (540, 90, 650, 200), 0, 360, CORAL, 14)


def prop06_documentary(d):
    # Clapperboard
    d.rounded_rectangle((280, 255, 560, 390), radius=14, fill=CORAL)
    d.rounded_rectangle((280, 205, 560, 258), radius=10, fill=CREAM)
    for i in range(4):
        x = 300 + i * 68
        d.polygon([(x, 210), (x + 34, 210), (x + 20, 253), (x - 14, 253)], fill=DARK)
    # Record dot and lens
    d.ellipse((505, 300, 549, 344), fill=CREAM)
    d.ellipse((517, 312, 537, 332), fill=CORAL)
    line(d, [(310, 320), (470, 320)], CORAL_DARK, 0)


def prop07_game_studio(d):
    # Controller
    d.rounded_rectangle((245, 225, 555, 355), radius=60, fill=CORAL)
    # D-pad
    d.rectangle((295, 272, 355, 302), fill=CREAM)
    d.rectangle((310, 257, 340, 317), fill=CREAM)
    # Buttons
    d.ellipse((440, 258, 468, 286), fill=CREAM)
    d.ellipse((482, 292, 510, 320), fill=CREAM)
    d.ellipse((440, 292, 468, 320), fill=CORAL_DARK)
    d.ellipse((482, 258, 510, 286), fill=CORAL_DARK)
    # Cable
    arc_ring(d, (330, 120, 470, 260), 180, 360, CREAM, 10)


def prop08_fashion(d):
    # T-shirt
    d.polygon([
        (330, 160), (470, 160), (545, 225), (505, 280), (492, 258),
        (492, 405), (308, 405), (308, 258), (295, 280), (255, 225)
    ], fill=CORAL)
    d.ellipse((365, 148, 435, 178), fill=SLATE_TOP)
    # Heart on chest
    d.ellipse((368, 240, 400, 272), fill=CREAM)
    d.ellipse((382, 240, 414, 272), fill=CREAM)
    d.polygon([(368, 258), (414, 258), (391, 292)], fill=CREAM)
    # Stitch dashes across the sleeve
    for i in range(3):
        x = 320 + i * 26
        d.line([(x, 415), (x + 14, 415)], fill=CREAM, width=6)


def prop09_trail(d):
    # Ground line
    line(d, [(220, 380), (580, 380)], CREAM, 10)
    # Pines
    for cx, top, s, color in ((300, 180, 1.0, CREAM), (400, 150, 1.25, CORAL), (500, 190, 0.9, CREAM)):
        h = int(120 * s)
        w2 = int(46 * s)
        d.polygon([(cx, top), (cx - w2, top + h), (cx + w2, top + h)], fill=color)
        d.rectangle((cx - int(8 * s), top + h, cx + int(8 * s), 380), fill=DARK)
    # Trail dashes
    for i in range(5):
        x = 260 + i * 62
        y = 415 - i * 6
        d.line([(x, y), (x + 34, y)], fill=CORAL, width=9)
    # Sun
    arc_ring(d, (590, 70, 690, 170), 0, 360, CREAM, 12)


def prop10_sports(d):
    # Bar chart
    line(d, [(240, 390), (580, 390)], CREAM, 10)
    for i, h in enumerate((90, 140, 190, 240)):
        x = 280 + i * 76
        d.rectangle((x, 390 - h, x + 52, 390), fill=CORAL if i % 2 == 0 else CORAL_DARK)
    # Trend arrow
    line(d, [(300, 280), (500, 130)], CREAM, 10)
    d.polygon([(505, 122), (515, 168), (462, 140)], fill=CREAM)
    # Basketball
    d.ellipse((130, 110, 250, 230), fill=CORAL)
    line(d, [(130, 170), (250, 170)], DARK, 7)
    line(d, [(190, 110), (190, 230)], DARK, 7)
    arc_ring(d, (152, 118, 228, 222), 40, 140, DARK, 7)
    arc_ring(d, (152, 118, 228, 222), 220, 320, DARK, 7)


DRAWERS = {
    "prop01": prop01_cold_case,
    "prop02": prop02_soundwaves,
    "prop03": prop03_escape_room,
    "prop04": prop04_arcade,
    "prop05": prop05_sprout,
    "prop06": prop06_documentary,
    "prop07": prop07_game_studio,
    "prop08": prop08_fashion,
    "prop09": prop09_trail,
    "prop10": prop10_sports,
}


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    for name, drawer in DRAWERS.items():
        img, d = canvas()
        drawer(d)
        out = os.path.join(OUTPUT_DIR, f"{name}.jpg")
        img.save(out, "JPEG", quality=90)
        print(f"Generated {out}")


if __name__ == "__main__":
    main()
