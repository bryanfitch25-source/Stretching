# StretchLine

A daily/weekly/monthly stretching app built for people on their feet all day — designed around a chef's typical aches: legs, shoulders, back, hands, and forearms. Installs to your iPhone home screen and runs entirely offline, storing all your data on-device (no server, no account).

## Features

- **Today** — a themed daily stretch session (different focus each day of the week) plus one-tap "Quick Relief" for any single area
- **Pre-Shift Warm-Up** — a dedicated 8-move, ~3-minute dynamic warm-up (marching, arm circles, torso twists, wrist/finger warm-up) meant to be done standing in the kitchen right before you clock in
- **Week** — see and repeat each day's plan
- **Month** — a rotating monthly challenge (days stretched, total minutes, or full-area coverage) with a calendar heatmap and reward badges
- **Library** — every stretch, filterable by area, with a custom session builder
- **Progress** — streak stats, a 7-week activity heatmap, and all unlockable badges
- **Streak meter** with "streak freezes" earned every 10 days, so one missed day doesn't wipe your progress
- Guided session player with a countdown ring, haptic + sound cues, and chef-specific tips
- 100% offline after first load (service worker caches the app shell); all progress lives in `localStorage` on your phone

## Installing on your iPhone (11 or any model)

1. Open the site in **Safari** (must be Safari, not Chrome, for the home-screen install to work on iOS).
2. Tap the **Share** icon (square with an arrow) in the toolbar.
3. Tap **Add to Home Screen**, then **Add**.
4. Launch StretchLine from your home screen — it opens full-screen, no browser bar, and works without a connection.

## Local development

No build step — it's plain HTML/CSS/JS. Serve the folder over HTTP (service workers require it) and open it:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Deployment

`.github/workflows/pages.yml` deploys the site to GitHub Pages automatically on every push to `main`. First-time setup: in the repo **Settings → Pages**, set **Source** to **GitHub Actions** (only needs doing once).

## Regenerating icons

Icons are procedurally generated (`scripts/generate_icons.py`, requires Pillow):

```bash
pip install pillow
python3 scripts/generate_icons.py
```
