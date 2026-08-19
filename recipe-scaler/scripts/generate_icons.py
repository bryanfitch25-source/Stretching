#!/usr/bin/env python3
"""Regenerate all raster icon/store assets from the master SVGs.

Run after editing www/icons/icon.svg, icon-foreground.svg, or
icon-background.svg, and any time after a fresh `npx cap add android`
(the generated android/ project isn't committed to git, so its launcher
icons need to be regenerated here rather than tracked).

Requires: pip install pillow cairosvg
"""
import io
import math
from pathlib import Path

import cairosvg
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
ICONS = ROOT / "www" / "icons"
STORE = ROOT / "store-assets"
ANDROID_RES = ROOT / "android" / "app" / "src" / "main" / "res"

TERRACOTTA = "#C1502E"
CREAM = "#FBF3E7"
INK = "#2B2420"
INK_SOFT = "#6B5D4F"

# Android adaptive-icon layer sizes, in px, per density bucket (108dp canvas).
DENSITIES = {"mdpi": 108, "hdpi": 162, "xhdpi": 216, "xxhdpi": 324, "xxxhdpi": 432}
# Legacy (pre-API26) launcher icon sizes (48dp canvas).
LEGACY_SIZES = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}


def svg_to_png_bytes(svg_path: Path, size: int) -> bytes:
    return cairosvg.svg2png(url=str(svg_path), output_width=size, output_height=size)


def render_svg(svg_path: Path, size: int) -> Image.Image:
    return Image.open(io.BytesIO(svg_to_png_bytes(svg_path, size))).convert("RGBA")


def circle_mask(size: int) -> Image.Image:
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, size - 1, size - 1), fill=255)
    return mask


def generate_web_favicon_and_store_icon():
    STORE.mkdir(exist_ok=True)
    icon_512 = render_svg(ICONS / "icon.svg", 512)
    icon_512.save(STORE / "icon-512.png")
    print(f"  wrote {STORE / 'icon-512.png'}")


def generate_android_launcher_icons():
    if not ANDROID_RES.exists():
        print("  android/ not present (run `npx cap add android` first) — skipping launcher icons")
        return

    # Background color: adaptive icon uses @color/ic_launcher_background directly,
    # so we just need to repoint that color — no background PNG needed.
    color_xml = ANDROID_RES / "values" / "ic_launcher_background.xml"
    color_xml.write_text(
        '<?xml version="1.0" encoding="utf-8"?>\n'
        "<resources>\n"
        f'    <color name="ic_launcher_background">{TERRACOTTA}</color>\n'
        "</resources>\n"
    )
    print(f"  wrote {color_xml}")

    fg_svg = ICONS / "icon-foreground.svg"

    for density, size in DENSITIES.items():
        out_dir = ANDROID_RES / f"mipmap-{density}"
        if not out_dir.exists():
            continue
        fg = render_svg(fg_svg, size)
        fg.save(out_dir / "ic_launcher_foreground.png")

    for density, size in LEGACY_SIZES.items():
        out_dir = ANDROID_RES / f"mipmap-{density}"
        if not out_dir.exists():
            continue
        # Legacy icon = flattened background + foreground, no adaptive masking.
        legacy = Image.new("RGBA", (size, size), TERRACOTTA)
        fg = render_svg(fg_svg, size)
        legacy.alpha_composite(fg)
        legacy.convert("RGB").save(out_dir / "ic_launcher.png")

        round_icon = legacy.copy()
        round_icon.putalpha(circle_mask(size))
        round_icon.save(out_dir / "ic_launcher_round.png")

    print(f"  wrote launcher icons for {', '.join(DENSITIES)}")


def load_font(name: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(f"/usr/share/fonts/truetype/dejavu/{name}.ttf", size)


def generate_feature_graphic():
    W, H = 1024, 500
    img = Image.new("RGB", (W, H), CREAM)
    draw = ImageDraw.Draw(img)

    # App mark, left side.
    mark_size = 300
    mark = render_svg(ICONS / "icon.svg", mark_size)
    img.paste(mark, (70, (H - mark_size) // 2), mark)

    # Wordmark + tagline, right side.
    title_font = load_font("DejaVuSerif-Bold", 96)
    tagline_font = load_font("DejaVuSans", 34)

    text_x = 70 + mark_size + 50
    draw.text((text_x, 150), "Yield", font=title_font, fill=INK)
    draw.text((text_x, 270), "Scale any recipe by servings", font=tagline_font, fill=INK_SOFT)
    draw.text((text_x, 315), "or pan size — right on your phone.", font=tagline_font, fill=INK_SOFT)

    STORE.mkdir(exist_ok=True)
    img.save(STORE / "feature-graphic.png")
    print(f"  wrote {STORE / 'feature-graphic.png'}")


if __name__ == "__main__":
    print("Generating web/store icon...")
    generate_web_favicon_and_store_icon()
    print("Generating Android launcher icons...")
    generate_android_launcher_icons()
    print("Generating Play Store feature graphic...")
    generate_feature_graphic()
    print("Done.")
