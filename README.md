# VSI for GitHub

GitHub file icons powered by `vscode-icons`.

VSI for GitHub is an independently implemented Chromium Manifest V3 extension. It reads visible repository file and folder names on GitHub, resolves matching icons from the upstream `vscode-icons` theme and a curated set of common file-type aliases, and applies those icons locally in the page.

The browser integration is implemented in this repository. This project is not a fork of the previously published GitHub icon extensions, and it is not affiliated with Microsoft, GitHub, or the `vscode-icons` team.

## Current scope

- GitHub repository file and folder rows.
- Filename and extension matching from the upstream theme.
- Light and dark icon variants, with unknown files falling back to the upstream default icon.
- One Manifest V3 build for Chrome, Edge, and Brave.
- No background service worker, analytics, remote code, or extra browser API permissions.

The extension currently targets `github.com` repository pages. Other websites and GitHub surfaces such as search results and pull request diffs are outside the first implementation.

## Build

Requirements: Node.js 24 and pnpm 12.

```sh
pnpm install
pnpm build
pnpm package
```

`pnpm build` writes the unpacked extension to `dist/`. `pnpm package` creates `artifacts/vsi-for-github-<version>.zip` from that directory.

To update the bundled icon data from the latest `vscode-icons` GitHub Release:

```sh
pnpm sync:upstream
pnpm typecheck
pnpm build
```

The sync workflow runs on a schedule and creates a reviewable pull request when the upstream release changes. It validates the upstream license statement and records the release, package checksum, every bundled SVG path, and each SVG checksum before opening that pull request.

## Load in a browser

Build the project, then enable developer mode on the browser's extension page and select **Load unpacked** with `dist/`:

- Chrome: `chrome://extensions`
- Edge: `edge://extensions`
- Brave: `brave://extensions`

For end-user installation and update behavior, see [docs/DISTRIBUTION.md](docs/DISTRIBUTION.md). No extension store listing is published yet.

## Privacy and licensing

The extension uses visible file and folder names only to select icons. It processes them locally and does not collect, store, or transmit them. See [the privacy policy](docs/PRIVACY.md).

Project source code is licensed under Apache-2.0. Bundled `vscode-icons` artwork retains the upstream terms: the upstream project identifies icons as CC BY-SA 4.0 and branded icons as subject to their respective copyright terms. The VSIX does not identify branded assets individually; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and the generated [asset inventory](licenses/vscode-icons-assets.json) before preparing a store submission.

The project name refers to the `vscode-icons` icon set as an upstream data source. “VSI” is the independent product brand; it does not claim an official relationship with Microsoft, GitHub, or the upstream maintainers.
