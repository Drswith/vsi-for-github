# Contributing

## Development

Use Node.js 24 and pnpm 12. Run `pnpm install`, then `pnpm typecheck` and `pnpm build` before opening a pull request.

## Upstream icon data

Do not copy code, selectors, assets, or documentation from the previously published GitHub icon browser extensions. The browser integration in this repository is developed independently. Icon assets and mappings come directly from releases of [`vscode-icons/vscode-icons`](https://github.com/vscode-icons/vscode-icons).

Run `pnpm sync:upstream` to refresh generated icon data. Review the upstream version, generated map, `THIRD_PARTY_NOTICES.md`, and `licenses/vscode-icons-assets.json` in the resulting diff. The synchronizer stops if the upstream license statement changes or if a mapped SVG is missing.

Do not edit files under `public/assets/vscode-icons/`, `src/generated/`, or the generated asset inventory by hand. Change the importer or upstream source release instead.

## Browser changes

Keep page matching limited to GitHub repository entries, preserve links and keyboard behavior, and keep all file and folder name processing local. Do not add a browser API permission unless a shipped feature needs it and its privacy disclosure is updated.

## Licensing

Original source changes use Apache-2.0. Do not modify upstream SVGs without recording the change and checking the applicable ShareAlike or branded-icon terms.
