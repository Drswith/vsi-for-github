import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import type { GeneratedIconMap, IconInventory } from "../../src/icon-types.ts";

export type ExtensionFiles = Record<string, Uint8Array>;

export interface ExtensionManifest {
  manifest_version: number;
  version: string;
  icons?: Record<string, string>;
  content_scripts: {
    matches?: string[];
    js?: string[];
    css?: string[];
  }[];
}

export interface ExtensionProject {
  packageJson: { name: string; version: string };
  iconMap: GeneratedIconMap;
  inventory: IconInventory;
  noticeFiles: ExtensionFiles;
}

type ReleaseEnvironment = Record<string, string | undefined>;

const notices = [
  "LICENSE",
  "NOTICE",
  "THIRD_PARTY_NOTICES.md",
  "licenses/vscode-icons-assets.json",
  "licenses/vscode-icons-source-MIT.txt",
];

export async function collectFiles(directory: string, prefix = ""): Promise<ExtensionFiles> {
  const files: ExtensionFiles = Object.create(null);
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relativePath = path.posix.join(prefix, entry.name);
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      Object.assign(files, await collectFiles(absolutePath, relativePath));
    } else if (entry.isFile()) {
      files[relativePath] = new Uint8Array(await readFile(absolutePath));
    } else {
      throw new Error(`Unsupported extension entry: ${relativePath}`);
    }
  }
  return files;
}

export async function readProject(root: string): Promise<ExtensionProject> {
  const [packageJson, iconMap, inventory] = await Promise.all([
    readJson<ExtensionProject["packageJson"]>(path.join(root, "package.json")),
    readJson<GeneratedIconMap>(path.join(root, "src/generated/icons.generated.json")),
    readJson<IconInventory>(path.join(root, "licenses/vscode-icons-assets.json")),
  ]);
  const noticeFiles = Object.fromEntries(await Promise.all(notices.map(async (filename) =>
    [filename, new Uint8Array(await readFile(path.join(root, filename)))],
  )));
  return { packageJson, iconMap, inventory, noticeFiles };
}

async function readJson<T>(filename: string): Promise<T> {
  // The runtime validators below check the parsed data before distribution.
  return JSON.parse(await readFile(filename, "utf8")) as T;
}

function requireFile(files: ExtensionFiles, filename: string): Uint8Array {
  assert.ok(typeof filename === "string" && filename.length > 0 &&
    !path.posix.isAbsolute(filename) && !filename.includes("\\") &&
    !filename.split("/").some((part) => part === ".." || part === "." || part === ""),
  `Invalid extension path: ${filename}`);
  assert.ok(Object.hasOwn(files, filename) && files[filename].length > 0,
    `Missing or empty extension file: ${filename}`);
  return files[filename];
}

function iconAssetPath(filename: string): string {
  assert.ok(typeof filename === "string" && /^[\w.-]+\.svg$/.test(filename),
    `Invalid icon filename: ${filename}`);
  return `assets/vscode-icons/${filename}`;
}

export function validateIconAssets(
  files: ExtensionFiles,
  { iconMap, inventory }: Pick<ExtensionProject, "iconMap" | "inventory">,
): number {
  assert.deepEqual(iconMap.upstream, inventory.upstream, "Icon map and inventory upstream metadata differ");
  const referenced = new Set<string>();
  for (const themeName of ["dark", "light"] as const) {
    const theme = iconMap[themeName];
    for (const key of ["file", "folder", "folderExpanded", "rootFolder", "rootFolderExpanded"] as const) {
      referenced.add(iconAssetPath(theme.defaults[key]));
    }
    for (const mapping of [theme.files.names, theme.files.extensions, theme.folders.names, theme.folders.namesExpanded]) {
      assert.ok(mapping && typeof mapping === "object" && !Array.isArray(mapping), "Invalid icon mapping");
      Object.values(mapping).forEach((filename) => referenced.add(iconAssetPath(filename)));
    }
  }

  assert.ok(Array.isArray(inventory.assets) && inventory.assets.length > 0, "Empty icon inventory");
  const inventoried = new Set<string>();
  for (const asset of inventory.assets) {
    assert.ok(!inventoried.has(asset.path), `Duplicate inventory entry: ${asset.path}`);
    inventoried.add(asset.path);
    assert.ok(referenced.has(asset.path), `Unreferenced inventory asset: ${asset.path}`);
    assert.match(asset.sha256, /^[a-f0-9]{64}$/, `Invalid asset checksum: ${asset.path}`);
    const bytes = requireFile(files, asset.path);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), asset.sha256,
      `Asset checksum mismatch: ${asset.path}`);
  }
  for (const filename of referenced) {
    assert.ok(inventoried.has(filename), `Mapped icon missing from inventory: ${filename}`);
  }
  for (const filename of Object.keys(files).filter((name) => name.startsWith("assets/vscode-icons/"))) {
    assert.ok(inventoried.has(filename), `Uninventoried icon asset: ${filename}`);
  }
  return inventoried.size;
}

export function validateReleaseVersion(version: string, env: ReleaseEnvironment = {}): void {
  if (env.GITHUB_EVENT_NAME !== "release") return;
  assert.equal(env.GITHUB_REF_TYPE, "tag", "A release must build a tag ref");
  assert.equal(env.GITHUB_REF_NAME, `v${version}`,
    `Release tag ${env.GITHUB_REF_NAME ?? "(missing)"} does not match package version ${version}`);
}

export function validateExtension(
  files: ExtensionFiles,
  project: ExtensionProject,
  env: ReleaseEnvironment = {},
): void {
  const manifest: ExtensionManifest = JSON.parse(new TextDecoder().decode(requireFile(files, "manifest.json")));
  assert.equal(manifest.manifest_version, 3, "Expected a Manifest V3 extension");
  assert.equal(manifest.version, project.packageJson.version, "Package and manifest versions differ");
  validateReleaseVersion(project.packageJson.version, env);

  assert.ok(Array.isArray(manifest.content_scripts) && manifest.content_scripts.some((script) => script.js?.length),
    "The extension has no content script");
  for (const script of manifest.content_scripts) {
    for (const filename of [...(script.js ?? []), ...(script.css ?? [])]) requireFile(files, filename);
  }
  for (const filename of Object.values(manifest.icons ?? {})) requireFile(files, filename);
  for (const filename of notices) {
    const bytes = requireFile(files, filename);
    assert.deepEqual(bytes, project.noticeFiles[filename], `Distribution notice differs from source: ${filename}`);
  }
  validateIconAssets(files, project);
}
