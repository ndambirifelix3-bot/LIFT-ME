"""Builds every Lift Me logo and icon file from the client's logo (assets/brand/logo-source.png).

Run:  python3 scripts/make-brand-assets.py      (needs Pillow + numpy)

The source logo is gold + white on a dark navy background. We cut it out onto a transparent
background ("un-mixing" each pixel from the navy), so it sits cleanly on any dark screen, then
place it on square canvases for the app icons.

If the client later supplies a vector (SVG/AI/PDF) or a transparent PNG of the logo, replace the
cut-out step with that file for sharper icons.
"""
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets/brand/logo-source.png"
OUT = ROOT / "assets"

NAVY = np.array([1, 6, 26], dtype=float)  # the logo's background colour around the artwork
ICON_BG = (1, 6, 26)  # icon backgrounds use the same navy so the logo looks identical
FULL_LOGO_BOX = (270, 85, 1275, 880)  # pin + LIFTME + tagline + swoosh (left, top, right, bottom)
MARK_BOX = (270, 85, 990, 535)  # pin with speed lines only


def cut_out(img: Image.Image) -> Image.Image:
    """Turn the navy background transparent, keeping soft edges."""
    a = np.asarray(img.convert("RGB")).astype(float)
    # Gold and white both have a strong red channel; the navy has almost none.
    alpha = np.clip((a[..., 0] - NAVY[0]) / 190.0, 0, 1)
    safe = np.maximum(alpha, 1e-3)[..., None]
    fg = np.clip((a - (1 - alpha[..., None]) * NAVY) / safe, 0, 255)
    rgba = np.dstack([fg, alpha * 255]).astype(np.uint8)
    return Image.fromarray(rgba, "RGBA")


def trim(img: Image.Image) -> Image.Image:
    return img.crop(img.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox())


def place(logo: Image.Image, size: int, fill: float, bg=None) -> Image.Image:
    """Centre `logo` on a size x size canvas, using `fill` of the width/height."""
    canvas = Image.new("RGBA", (size, size), bg + (255,) if bg else (0, 0, 0, 0))
    scale = fill * size / max(logo.size)
    resized = logo.resize((round(logo.width * scale), round(logo.height * scale)), Image.LANCZOS)
    canvas.alpha_composite(resized, ((size - resized.width) // 2, (size - resized.height) // 2))
    return canvas


def silhouette(logo: Image.Image) -> Image.Image:
    """Single-colour shape for Android's themed (monochrome) icon."""
    alpha = logo.getchannel("A")
    black = Image.new("RGBA", logo.size, (0, 0, 0, 255))
    black.putalpha(alpha)
    return black


def og_image(full: Image.Image) -> Image.Image:
    """Link-preview picture: the full logo centred on black, 1200x630."""
    bg = Image.new("RGBA", (1200, 630), (16, 16, 16, 255))
    h = 500
    w = round(h * full.width / full.height)
    logo = full.resize((w, h), Image.LANCZOS)
    bg.paste(logo, ((1200 - w) // 2, (630 - h) // 2), logo)
    return bg.convert("RGB")


def main() -> None:
    source = Image.open(SRC)
    full = trim(cut_out(source.crop(FULL_LOGO_BOX)))
    mark = trim(cut_out(source.crop(MARK_BOX)))

    outputs = {
        # Transparent logos used inside the app (welcome + loading screens).
        # (2x the largest size shown; colours reduced in save() to keep them small: ~45 KB and ~10 KB.)
        "brand/logo-full.png": full.resize((600, round(600 * full.height / full.width)), Image.LANCZOS),
        "brand/logo-mark.png": place(mark, 256, 1.0),
        # Link preview (WhatsApp, Facebook, X): 1200x630, logo on black.
        "../public/brand/og-image.png": og_image(full),
        # Instant splash in public/index.html (shown 220 px wide before the app's code loads).
        "../public/brand/splash-logo.png": full.resize((440, round(440 * full.height / full.width)), Image.LANCZOS),
        # Main app icon (iOS rounds the corners itself).
        "icon.png": place(mark, 1024, 0.72, ICON_BG),
        # Android adaptive icon: navy background layer + logo in the centre safe zone.
        "android-icon-background.png": Image.new("RGBA", (512, 512), ICON_BG + (255,)),
        "android-icon-foreground.png": place(mark, 512, 0.58),
        "android-icon-monochrome.png": place(silhouette(mark), 432, 0.58),
        # Splash screen (background colour is set in app.config.ts).
        "splash-icon.png": place(full, 1024, 0.95),
        "favicon.png": place(mark, 48, 0.9, ICON_BG),
        # PWA (installable web app) icons, copied to the website from public/.
        "../public/icons/icon-192.png": place(mark, 192, 0.72, ICON_BG),
        "../public/icons/icon-512.png": place(mark, 512, 0.72, ICON_BG),
        # "maskable": Android may crop it to a circle, so keep the logo inside the middle 80%.
        "../public/icons/maskable-512.png": place(mark, 512, 0.56, ICON_BG),
        "../public/icons/apple-touch-icon.png": place(mark, 180, 0.72, ICON_BG),
    }
    for name, image in outputs.items():
        path = OUT / name
        path.parent.mkdir(parents=True, exist_ok=True)
        # iOS shows transparency as black, so home-screen icons are saved without it.
        if name.endswith(("apple-touch-icon.png", "icon.png")):
            image = image.convert("RGB")
        # The in-app logos have few colours: a 256-colour palette makes them ~6x smaller, same look.
        if "brand/" in name:
            image = image.quantize(colors=256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE)
        image.save(path, optimize=True)
        print("wrote", path.resolve().relative_to(ROOT), image.size)


if __name__ == "__main__":
    main()
