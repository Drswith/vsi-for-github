# Product preview assets

These assets show VSI for GitHub **0.1.0** running on real GitHub pages in Ego Lite. Captured on **2026-09-24**, with repository commit `79fe91a` visible in the recording.

| File | Purpose |
| --- | --- |
| `hero.png` | 2560 × 1920 README image, composed from the two screenshots below. |
| `hero.html` | Editable 1280 × 960 composition, using the existing VSI brand icon. |
| `source-dark.png` | 660 × 1476 capture of the repository filename column in GitHub's dark dimmed appearance. |
| `source-light.png` | The same filename column in GitHub's light appearance. |
| `browsing.gif` | Looping preview of actual file listing and directory navigation. |
| `browsing.mp4` | H.264 recording with playback controls when opened in a video player. |

## Capture provenance

- Source: <https://github.com/Drswith/vsi-for-github>, followed by `public/` and `scripts/`.
- The unpacked extension was already loaded in Ego. Every visible icon in the source screenshots was checked for successful image loading.
- `ego-browser` captured the page; the Computer tool inspected and operated the native browser UI. All browser work used a single task space.
- The stills use a 1240 × 1120 viewport. The filename column was captured at `(33, 294, 330, 738)` with a 2× screenshot scale. Light and dark color schemes were emulated for this page without changing account or browser theme preferences.
- `hero.html` shows two contiguous eight-row excerpts. The file names, icon choices, and relative icon sizes inside each excerpt are unchanged. Headline, panel labels, and framing are presentation elements around the screenshots.
- The recording uses a 980 × 960 viewport. A 948 × 650 crop at `(16, 110)` excludes the browser toolbar and account navigation. It shows scrolling in the repository root, opening `public/`, returning to the root, opening `scripts/`, and returning again.
- The recording was encoded as H.264 at 12 fps and as a GIF at 8 fps with an optimized palette. The icons and transitions were captured from the running extension.

## Refreshing the assets

Build and load the extension using the root README instructions, then capture the same public repository pages with `ego-browser`. Use a single task space and finish it when capture is complete. Keep browser-owned permission prompts under user control.

To update the presentation without recapturing GitHub, serve the repository locally, open `artwork/previews/hero.html`, and capture a 1280 × 960 viewport at 2× scale. The HTML references the original source PNGs and `../vsi-icon.svg`.

The captured `vscode-icons` artwork retains its upstream terms. See [THIRD_PARTY_NOTICES.md](../../THIRD_PARTY_NOTICES.md). The original unframed screenshot is preserved at [github-file-icons-preview.png](../github-file-icons-preview.png).
