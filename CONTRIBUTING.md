# Contributing

## Development

Install mise, then run `mise install` from the repository root. `mise.toml` supplies Node.js 24 (24.15 or newer) and pnpm 12.4.1. Run `mise exec -- pnpm install --frozen-lockfile`, then `mise exec -- pnpm check` before opening a pull request.

`check` runs type checking, regression tests, asset validation, the production build, and ZIP packaging. Tests execute the production content-script bundle against GitHub DOM fixtures in jsdom and exercise invalid assets, incomplete packages, and release versions without network access. They do not replace a real browser check when GitHub changes its page layout.

Write maintained source, scripts, tests, and build configuration in TypeScript. Browser code is checked by `tsconfig.json`; Node.js scripts, tests, and Vite configuration are checked by `tsconfig.node.json`. Shared icon-data types live in `src/icon-types.ts`. Generated maps and inventories remain JSON, and the shipped content script remains JavaScript.

Node.js runs scripts and tests directly using its built-in type stripping. Use explicit `.ts` extensions for local imports and `import type` for type-only imports. Keep TypeScript syntax erasable: enums, parameter properties, and other syntax requiring runtime transformation are disallowed by the compiler. Type stripping does not check types; run `pnpm typecheck` or the full `pnpm check` before submitting changes.

## CI and merging

The required `build` check runs against GitHub's PR merge commit. Keep `main` protected with this check required from GitHub Actions, require the branch to be up to date, and apply protection to administrators. Manual workflow runs are named `manual-build` so a branch-only build cannot satisfy the PR gate.

All three workflows use the shared setup action and the same `pnpm check` command. The sync workflow always lets `create-pull-request` inspect the diff, including when there is no change, so merged or unnecessary automation branches can be cleaned up. GitHub requires a maintainer to select **Approve workflows to run** for PRs created with `GITHUB_TOKEN`; the approved PR CI validates the merge result before merging.

## Upstream icon data

Do not copy code, selectors, assets, or documentation from the previously published GitHub icon browser extensions. The browser integration in this repository is developed independently. Icon assets and mappings come directly from releases of [`vscode-icons/vscode-icons`](https://github.com/vscode-icons/vscode-icons).

Run `pnpm sync:upstream` to refresh generated icon data. Review the upstream version, generated map, `THIRD_PARTY_NOTICES.md`, and `licenses/vscode-icons-assets.json` in the resulting diff. The synchronizer stops if the upstream license statement changes or if a mapped SVG is missing.

Do not edit files under `public/assets/vscode-icons/`, `src/generated/`, or the generated asset inventory by hand. Change the importer or upstream source release instead.

## Browser changes

Keep page matching limited to GitHub repository entries, preserve links and keyboard behavior, and keep all file and folder name processing local. Do not add a browser API permission unless a shipped feature needs it and its privacy disclosure is updated.

## Licensing

Original source changes use Apache-2.0. Do not modify upstream SVGs without recording the change and checking the applicable ShareAlike or branded-icon terms.
