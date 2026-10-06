import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { unzipSync, zipSync } from "fflate";
import { validateExtension, validateIconAssets, validateReleaseVersion } from "../scripts/lib/extension-validation.ts";
import type { ExtensionFiles, ExtensionProject } from "../scripts/lib/extension-validation.ts";
import type { IconInventory, ThemeMappings, UpstreamRelease } from "../src/icon-types.ts";

const bytes = (text: string) => new TextEncoder().encode(text);
const json = (value: unknown) => bytes(JSON.stringify(value));

function fixture() {
  const files: ExtensionFiles = {
    "assets/vscode-icons/default.svg": bytes('<svg xmlns="http://www.w3.org/2000/svg"/>'),
    "assets/vscode-icons/special.svg": bytes('<svg xmlns="http://www.w3.org/2000/svg"><path/></svg>'),
    "content.js": bytes("(() => {})();"),
    "content.css": bytes("img { width: 20px; }"),
    "icons/vsi-16.png": new Uint8Array([137, 80, 78, 71]),
  };
  const theme: ThemeMappings = {
    defaults: {
      file: "default.svg", folder: "default.svg", folderExpanded: "default.svg",
      rootFolder: "default.svg", rootFolderExpanded: "default.svg",
    },
    files: { names: { "package.json": "special.svg" }, extensions: { json: "special.svg" } },
    folders: { names: {}, namesExpanded: {} },
  };
  const upstream: UpstreamRelease = {
    repository: "vscode-icons/vscode-icons", version: "12.19.0", tag: "v12.19.0",
    releaseUrl: "https://github.com/vscode-icons/vscode-icons/releases/tag/v12.19.0",
    packageAsset: "vscode-icons-12.19.0.vsix", packageSha256: "0".repeat(64),
    mappingSource: "extension/dist/src/vsicons-icon-theme.json",
    licenseSource: "https://github.com/vscode-icons/vscode-icons/blob/v12.19.0/README.md#license",
  };
  const inventory: IconInventory = {
    upstream,
    assets: Object.entries(files).filter(([name]) => name.endsWith(".svg")).map(([name, data]) => ({
      path: name,
      upstreamPath: name.replace("assets/vscode-icons/", "icons/"),
      sha256: createHash("sha256").update(data).digest("hex"),
      licenseStatus: "test fixture",
    })),
  };
  const noticeFiles = Object.fromEntries([
    "LICENSE", "NOTICE", "THIRD_PARTY_NOTICES.md", "licenses/vscode-icons-source-MIT.txt",
  ].map((name) => [name, bytes(`Notice for ${name}`)]));
  noticeFiles["licenses/vscode-icons-assets.json"] = json(inventory);
  Object.assign(files, noticeFiles);
  const manifest = {
    manifest_version: 3,
    version: "0.1.0",
    icons: { 16: "icons/vsi-16.png" },
    content_scripts: [{ matches: ["https://github.com/*"], js: ["content.js"], css: ["content.css"] }],
  };
  files["manifest.json"] = json(manifest);
  return {
    files,
    manifest,
    project: {
      packageJson: { name: "vsi-for-github", version: "0.1.0" },
      iconMap: { upstream: structuredClone(upstream), dark: structuredClone(theme), light: structuredClone(theme) },
      inventory,
      noticeFiles,
    } satisfies ExtensionProject,
  };
}

test("complete source assets and packaged ZIP pass validation", () => {
  const { files, project } = fixture();
  assert.equal(validateIconAssets(files, project), 2);
  validateExtension(files, project);
  validateExtension(unzipSync(zipSync(files)), project);
});

test("a missing referenced SVG is rejected in source and ZIP", () => {
  const { files, project } = fixture();
  delete files["assets/vscode-icons/special.svg"];
  assert.throws(() => validateIconAssets(files, project), /Missing or empty.*special\.svg/);
  assert.throws(() => validateExtension(unzipSync(zipSync(files)), project), /Missing or empty.*special\.svg/);
});

test("modified SVG bytes fail the recorded SHA-256 check", () => {
  const { files, project } = fixture();
  files["assets/vscode-icons/special.svg"] = bytes("changed artwork");
  assert.throws(() => validateExtension(files, project), /Asset checksum mismatch/);
});

test("new mappings cannot refer to an asset absent from the inventory", () => {
  const { files, project } = fixture();
  project.iconMap.light.files.names["new.file"] = "new.svg";
  assert.throws(() => validateIconAssets(files, project), /Mapped icon missing from inventory/);
});

test("untracked or stale icon assets are rejected", () => {
  const { files, project } = fixture();
  files["assets/vscode-icons/extra.svg"] = bytes("unrecorded artwork");
  assert.throws(() => validateIconAssets(files, project), /Uninventoried icon asset/);
});

test("duplicate inventory entries and mismatched upstream metadata are rejected", () => {
  const { files, project } = fixture();
  project.inventory.assets.push(project.inventory.assets[0]);
  assert.throws(() => validateIconAssets(files, project), /Duplicate inventory entry/);
  project.inventory.assets.pop();
  project.iconMap.upstream.version = "different";
  assert.throws(() => validateIconAssets(files, project), /upstream metadata differ/);
});

for (const filename of ["manifest.json", "content.js", "content.css", "icons/vsi-16.png", "LICENSE", "licenses/vscode-icons-assets.json"]) {
  test(`a ZIP missing ${filename} cannot be distributed`, () => {
    const { files, project } = fixture();
    delete files[filename];
    assert.throws(() => validateExtension(unzipSync(zipSync(files)), project), /Missing or empty extension file/);
  });
}

test("stale distribution notices and manifest versions are rejected", () => {
  const { files, project, manifest } = fixture();
  files.NOTICE = bytes("stale notice");
  assert.throws(() => validateExtension(files, project), /Distribution notice differs/);
  files.NOTICE = project.noticeFiles.NOTICE;
  files["manifest.json"] = json({ ...manifest, version: "0.2.0" });
  assert.throws(() => validateExtension(files, project), /Package and manifest versions differ/);
});

test("manifest resources must use local extension paths", () => {
  const { files, project, manifest } = fixture();
  manifest.content_scripts[0].js = ["../content.js"];
  files["manifest.json"] = json(manifest);
  assert.throws(() => validateExtension(files, project), /Invalid extension path/);
});

test("release builds require the exact version tag", () => {
  const env = { GITHUB_EVENT_NAME: "release", GITHUB_REF_TYPE: "tag" };
  validateReleaseVersion("0.1.0", { ...env, GITHUB_REF_NAME: "v0.1.0" });
  for (const tag of ["0.1.0", "0.2.0", "release-0.2.0", "v0.2.0", "", undefined]) {
    assert.throws(() => validateReleaseVersion("0.1.0", { ...env, GITHUB_REF_NAME: tag }), /Release tag/);
  }
  assert.throws(() => validateReleaseVersion("0.1.0", { ...env, GITHUB_REF_TYPE: "branch" }), /tag ref/);
});

test("ordinary branch and PR builds do not interpret ref names as release tags", () => {
  for (const event of ["workflow_dispatch", "push", "pull_request", undefined]) {
    validateReleaseVersion("0.1.0", {
      GITHUB_EVENT_NAME: event, GITHUB_REF_TYPE: "branch", GITHUB_REF_NAME: "vscode-icons-upgrade",
    });
  }
});
