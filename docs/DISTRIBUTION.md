# Installation and updates

## Local development

Build the extension with `pnpm build`, then open the browser's extension management page, enable developer mode, and select **Load unpacked** with the repository's `dist/` directory.

- Chrome: `chrome://extensions`
- Edge: `edge://extensions`
- Brave: `brave://extensions`

This is a development install. It does not update itself: rebuild the project and press **Reload** on the extension management page after a change.

## Public distribution

The same Manifest V3 build targets Chromium browsers. A normal Chrome install must be initiated from the Chrome Web Store; an arbitrary project website cannot silently install the extension. An official store install receives browser-managed updates. Edge and Brave can use their respective extension stores when listings are published.

GitHub Release ZIP files are downloadable packages for manual development or review. They do not provide one-click installation or store-managed updates. No store listing has been published yet.

To prepare a GitHub Release, set the same semantic version in `package.json` and `public/manifest.json`, then publish a GitHub Release from a matching `vX.Y.Z` tag. The release workflow checks that all three versions match, builds the extension, and attaches its ZIP. Publishing a GitHub Release does not publish to the browser stores.

Before submitting a store listing, publish the privacy policy at a stable public URL and enter that URL in the store dashboard. The repository copy is [docs/PRIVACY.md](PRIVACY.md).

In the Chrome Web Store privacy declarations, describe that the extension reads visible GitHub file and folder names (website content) and uses them locally to render icons. Do not report “no data handling” solely because names are not sent to a server; review the [Chrome Web Store user-data policy](https://developer.chrome.com/docs/webstore/user_data) when preparing the listing.
