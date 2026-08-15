#!/usr/bin/env python3
"""Generates all app icons (PWA + Apple touch) from a simple procedural design.
Run: python3 scripts/generate_icons.py
"""
import math
from PIL import Image, ImageDraw

TEAL = (15, 118, 110)
TEAL_LIGHT = (45, 212, 191)
ORANGE = (251, 146, 60)
WHITE = (255, 255, 255)

SIZES = [16, 32, 48, 72, 96, 120, 128, 144, 152, 167, 180, 192, 256, 384, 512]

def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))

def make_icon(size, padding_ratio=0.16, maskable=False):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Diagonal gradient background, rounded square
    for y in range(size):
        for x in range(0, size, max(1, size // 64)):
            t = (x + y) / (2 * size)
            color = lerp(TEAL, TEAL_LIGHT, t)
            draw.rectangle([x, y, x + max(1, size // 64), y], fill=color)

    radius = int(size * (0.0 if maskable else 0.22))
    mask = Image.new("L", (size, size), 0)
    mdraw = ImageDraw.Draw(mask)
    mdraw.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    bg = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    for y in range(size):
        for x in range(0, size, max(1, size // 64)):
            t = (x + y) / (2 * size)
            color = lerp(TEAL, TEAL_LIGHT, t)
            ImageDraw.Draw(bg).rectangle([x, y, x + max(1, size // 64), y], fill=color)
    out = Image.composite(bg, Image.new("RGBA", (size, size), (0, 0, 0, 0)), mask)
    draw = ImageDraw.Draw(out)

    cx, cy = size / 2, size / 2
    pad = size * (padding_ratio + (0.12 if maskable else 0))
    r = (size - 2 * pad) / 2
    stroke = max(2, int(size * 0.055))

    # Stylized stretching figure: head + torso lean + arm up + leg back (a "reach" pose)
    head_r = r * 0.22
    head_c = (cx - r * 0.05, cy - r * 0.72)
    draw.ellipse([head_c[0] - head_r, head_c[1] - head_r, head_c[0] + head_r, head_c[1] + head_r], fill=WHITE)

    torso_top = (cx - r * 0.05, cy - r * 0.5)
    torso_bot = (cx + r * 0.05, cy + r * 0.15)
    draw.line([torso_top, torso_bot], fill=WHITE, width=stroke)

    # raised arm reaching up-right
    arm_elbow = (cx + r * 0.35, cy - r * 0.55)
    arm_hand = (cx + r * 0.65, cy - r * 0.95)
    draw.line([torso_top, arm_elbow], fill=WHITE, width=stroke)
    draw.line([arm_elbow, arm_hand], fill=WHITE, width=stroke)

    # trailing arm reaching down-left
    arm2_elbow = (cx - r * 0.4, cy - r * 0.2)
    arm2_hand = (cx - r * 0.7, cy + r * 0.15)
    draw.line([torso_top, arm2_elbow], fill=WHITE, width=stroke)
    draw.line([arm2_elbow, arm2_hand], fill=WHITE, width=stroke)

    # standing leg
    leg1_knee = (cx + r * 0.15, cy + r * 0.55)
    leg1_foot = (cx + r * 0.1, cy + r * 0.95)
    draw.line([torso_bot, leg1_knee], fill=WHITE, width=stroke)
    draw.line([leg1_knee, leg1_foot], fill=WHITE, width=stroke)

    # trailing leg reaching back
    leg2_knee = (cx - r * 0.35, cy + r * 0.45)
    leg2_foot = (cx - r * 0.65, cy + r * 0.75)
    draw.line([torso_bot, leg2_knee], fill=WHITE, width=stroke)
    draw.line([leg2_knee, leg2_foot], fill=WHITE, width=stroke)

    for p in [arm_hand, arm2_hand, leg1_foot, leg2_foot]:
        rr = stroke * 0.55
        draw.ellipse([p[0] - rr, p[1] - rr, p[0] + rr, p[1] + rr], fill=WHITE)

    # small flame accent (streak) bottom-right, orange
    flame_cx, flame_cy = cx + r * 0.72, cy + r * 0.68
    flame_r = r * 0.28
    flame_pts = []
    for i in range(24):
        ang = i / 24 * 2 * math.pi
        wob = 1 + 0.18 * math.sin(ang * 3 + 1)
        flame_pts.append((flame_cx + math.cos(ang) * flame_r * wob * 0.9,
                           flame_cy + math.sin(ang) * flame_r * wob))
    draw.ellipse([flame_cx - flame_r * 1.15, flame_cy - flame_r * 1.15,
                  flame_cx + flame_r * 1.15, flame_cy + flame_r * 1.15], fill=WHITE)
    fr2 = flame_r * 0.62
    draw.ellipse([flame_cx - fr2, flame_cy - fr2 * 1.1, flame_cx + fr2, flame_cy + fr2 * 0.95], fill=ORANGE)

    return out

def main():
    import os
    out_dir = os.path.join(os.path.dirname(__file__), "..", "icons")
    os.makedirs(out_dir, exist_ok=True)
    for s in SIZES:
        icon = make_icon(s)
        icon.save(os.path.join(out_dir, f"icon-{s}.png"))
    # Apple touch icon (no transparency, iOS ignores alpha and shows black)
    apple = make_icon(180)
    apple_flat = Image.new("RGB", apple.size, TEAL)
    apple_flat.paste(apple, mask=apple.split()[3])
    apple_flat.save(os.path.join(out_dir, "apple-touch-icon.png"))
    # maskable icon (safe zone, full bleed bg)
    maskable = make_icon(512, maskable=True)
    maskable.save(os.path.join(out_dir, "icon-maskable-512.png"))
    print("done")

if __name__ == "__main__":
    main()
