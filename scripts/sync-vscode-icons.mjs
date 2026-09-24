import { createHash } from "node:crypto";
import { appendFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { unzipSync } from "fflate";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRepository = "vscode-icons/vscode-icons";
const sourceUrl = `https://github.com/${sourceRepository}`;
const apiUrl = `https://api.github.com/repos/${sourceRepository}/releases/latest`;
const assetsDirectory = path.join(root, "public/assets/vscode-icons");
const generatedDirectory = path.join(root, "src/generated");
const licenseDirectory = path.join(root, "licenses");
const assetManifestPath = path.join(licenseDirectory, "vscode-icons-assets.json");

function fail(message) {
  throw new Error(message);
}

async function getRelease() {
  const response = await fetch(apiUrl, {
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "vsi-for-github-upstream-sync",
    },
  });
  if (!response.ok) fail(`GitHub release lookup failed: HTTP ${response.status}`);

  const release = await response.json();
  const asset = release.assets?.find((candidate) =>
    /^vscode-icons-\d+\.\d+\.\d+\.vsix$/.test(candidate.name),
  );
  if (!asset) fail(`Release ${release.tag_name} does not include a vscode-icons VSIX asset`);

  const download = await fetch(asset.browser_download_url, {
    headers: { "User-Agent": "vsi-for-github-upstream-sync" },
  });
  if (!download.ok) fail(`VSIX download failed: HTTP ${download.status}`);

  return {
    bytes: new Uint8Array(await download.arrayBuffer()),
    tag: release.tag_name,
    releaseUrl: release.html_url,
    packageAsset: asset.name,
  };
}

async function getInput() {
  const vsixIndex = process.argv.indexOf("--vsix");
  if (vsixIndex >= 0) {
    const filename = process.argv[vsixIndex + 1];
    if (!filename) fail("Pass a file path after --vsix");
    return {
      bytes: new Uint8Array(await readFile(path.resolve(filename))),
      tag: "local-package",
      releaseUrl: sourceUrl,
      packageAsset: path.basename(filename),
    };
  }
  return getRelease();
}

function parseJsonFile(archive, filename) {
  const bytes = archive[filename];
  if (!bytes) fail(`VSIX is missing ${filename}`);
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch (error) {
    fail(`Could not parse ${filename}: ${error.message}`);
  }
}

function normalizeIconPath(iconPath) {
  if (typeof iconPath !== "string" || iconPath.length === 0) {
    fail("Upstream icon definition has no iconPath");
  }
  const archivePath = path.posix.normalize(
    path.posix.join("extension/dist/src", iconPath),
  );
  if (!archivePath.startsWith("extension/icons/")) {
    fail(`Unexpected icon path outside extension/icons: ${iconPath}`);
  }
  return path.posix.basename(archivePath);
}

function objectMapToAssets(map, iconDefinitions) {
  const result = {};
  for (const [key, definitionId] of Object.entries(map ?? {}).sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    const definition = iconDefinitions[definitionId];
    if (!definition) fail(`Missing upstream icon definition ${definitionId}`);
    if (definition.iconPath) {
      const normalizedKey = key.toLowerCase();
      const filename = normalizeIconPath(definition.iconPath);
      if (Object.hasOwn(result, normalizedKey) && result[normalizedKey] !== filename) {
        fail(`Conflicting case-insensitive upstream icon mappings for ${normalizedKey}`);
      }
      result[normalizedKey] = filename;
    }
  }
  return result;
}

function createTheme(theme, iconDefinitions) {
  const getDefault = (key) => {
    const definition = iconDefinitions[theme[key]];
    if (!definition) fail(`Missing upstream default icon definition ${theme[key]}`);
    return definition.iconPath ? normalizeIconPath(definition.iconPath) : undefined;
  };

  return {
    defaults: {
      file: getDefault("file"),
      folder: getDefault("folder"),
      folderExpanded: getDefault("folderExpanded"),
      rootFolder: getDefault("rootFolder"),
      rootFolderExpanded: getDefault("rootFolderExpanded"),
    },
    files: {
      names: objectMapToAssets(theme.fileNames, iconDefinitions),
      extensions: objectMapToAssets(theme.fileExtensions, iconDefinitions),
    },
    folders: {
      names: objectMapToAssets(theme.folderNames, iconDefinitions),
      namesExpanded: objectMapToAssets(theme.folderNamesExpanded, iconDefinitions),
    },
  };
}

const commonFileNameAliases = {
  maintainers: "file_type_text.svg",
};

const commonFileExtensionAliases = {
  bash: "file_type_shell.svg",
  c: "file_type_c.svg",
  cc: "file_type_cpp.svg",
  cjs: "file_type_js_official.svg",
  cpp: "file_type_cpp.svg",
  cs: "file_type_csharp.svg",
  cts: "file_type_typescript_official.svg",
  cxx: "file_type_cpp.svg",
  css: "file_type_css.svg",
  h: "file_type_c.svg",
  hh: "file_type_cpp.svg",
  hpp: "file_type_cpp.svg",
  htm: "file_type_html.svg",
  html: "file_type_html.svg",
  hxx: "file_type_cpp.svg",
  java: "file_type_java.svg",
  js: "file_type_js_official.svg",
  jsx: "file_type_js_official.svg",
  json: "file_type_json_official.svg",
  jsonc: "file_type_json_official.svg",
  json5: "file_type_json5.svg",
  kt: "file_type_kotlin.svg",
  kts: "file_type_kotlin.svg",
  less: "file_type_less.svg",
  log: "file_type_text.svg",
  md: "file_type_markdown.svg",
  mdx: "file_type_markdown.svg",
  mjs: "file_type_js_official.svg",
  mts: "file_type_typescript_official.svg",
  php: "file_type_php.svg",
  py: "file_type_python.svg",
  rb: "file_type_ruby.svg",
  rs: "file_type_rust.svg",
  sass: "file_type_scss.svg",
  scss: "file_type_scss.svg",
  sh: "file_type_shell.svg",
  sql: "file_type_sql.svg",
  swift: "file_type_swift.svg",
  text: "file_type_text.svg",
  ts: "file_type_typescript_official.svg",
  tsx: "file_type_typescript_official.svg",
  txt: "file_type_text.svg",
  xml: "file_type_xml.svg",
  yaml: "file_type_yaml_official.svg",
  yml: "file_type_yaml_official.svg",
  zsh: "file_type_shell.svg",
};

function addCommonFileAliases(theme) {
  for (const [name, filename] of Object.entries(commonFileNameAliases)) {
    if (!Object.hasOwn(theme.files.names, name)) theme.files.names[name] = filename;
  }
  for (const [extension, filename] of Object.entries(commonFileExtensionAliases)) {
    if (!Object.hasOwn(theme.files.extensions, extension)) {
      theme.files.extensions[extension] = filename;
    }
  }
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function writeJson(filename, value) {
  await mkdir(path.dirname(filename), { recursive: true });
  await writeFile(filename, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeActionOutput(key, value) {
  if (!process.env.GITHUB_OUTPUT) return;
  await appendFile(process.env.GITHUB_OUTPUT, `${key}=${value}\n`);
}

const input = await getInput();
const archive = unzipSync(input.bytes);
const packageJson = parseJsonFile(archive, "extension/package.json");
if (packageJson.license !== "MIT") {
  fail(`Upstream source-code license changed from MIT to ${packageJson.license ?? "unspecified"}`);
}
const upstreamReadmeBytes = archive["extension/README.md"];
if (!upstreamReadmeBytes) fail("VSIX is missing its upstream README license notices");
const upstreamReadme = new TextDecoder().decode(upstreamReadmeBytes);
const upstreamSourceLicense = archive["extension/LICENSE.txt"];
if (!upstreamSourceLicense) fail("VSIX is missing its upstream source-code license text");
if (!/The source code is licensed under the \[MIT\]/i.test(upstreamReadme)) {
  fail("Upstream source-code license notice changed; review before syncing");
}
if (!/The MIT License/i.test(new TextDecoder().decode(upstreamSourceLicense))) {
  fail("Upstream source-code license text is not the expected MIT license");
}
const iconLicense = upstreamReadme.match(
  /The icons are licensed under the \[Creative Commons[^\]]*\]\((https:\/\/creativecommons\.org\/licenses\/by-sa\/[^)]+)\)/i,
);
if (iconLicense?.[1] !== "https://creativecommons.org/licenses/by-sa/4.0/") {
  fail("Upstream icon licensing changed or is not explicit; review the license notices before syncing");
}
if (!/Branded icons are licensed under their copyright license\./i.test(upstreamReadme)) {
  fail("Upstream branded-icon licensing notice changed; review before syncing");
}

const iconThemePath = packageJson.contributes?.iconThemes?.[0]?.path;
if (typeof iconThemePath !== "string") fail("VSIX has no default icon theme path");
const themeArchivePath = path.posix.join("extension", iconThemePath);
const upstreamTheme = parseJsonFile(archive, themeArchivePath);
const iconDefinitions = upstreamTheme.iconDefinitions ?? {};
const dark = createTheme(upstreamTheme, iconDefinitions);
const upstreamLight = upstreamTheme.light ?? {};
const light = {
  defaults: { ...dark.defaults },
  files: {
    names: { ...dark.files.names },
    extensions: { ...dark.files.extensions },
  },
  folders: {
    names: { ...dark.folders.names },
    namesExpanded: { ...dark.folders.namesExpanded },
  },
};
if (Object.keys(upstreamLight).length > 0) {
  const lightOverrides = createTheme(upstreamLight, iconDefinitions);
  const definedDefaults = Object.fromEntries(
    Object.entries(lightOverrides.defaults).filter(([, value]) => value),
  );
  light.defaults = { ...dark.defaults, ...definedDefaults };
  light.files = {
    names: { ...dark.files.names, ...lightOverrides.files.names },
    extensions: { ...dark.files.extensions, ...lightOverrides.files.extensions },
  };
  light.folders = {
    names: { ...dark.folders.names, ...lightOverrides.folders.names },
    namesExpanded: {
      ...dark.folders.namesExpanded,
      ...lightOverrides.folders.namesExpanded,
    },
  };
}

for (const theme of [dark, light]) addCommonFileAliases(theme);

const version = packageJson.version;
if (input.tag !== "local-package" && input.tag.replace(/^v/, "") !== version) {
  fail(`Release tag ${input.tag} does not match VSIX version ${version}`);
}
const releaseUrl =
  input.tag === "local-package" ? `${sourceUrl}/releases/tag/v${version}` : input.releaseUrl;
const activeIconNames = new Set();
for (const theme of [dark, light]) {
  Object.values(theme.defaults).forEach((filename) => activeIconNames.add(filename));
  Object.values(theme.files).forEach((mapping) =>
    Object.values(mapping).forEach((filename) => activeIconNames.add(filename)),
  );
  Object.values(theme.folders).forEach((mapping) =>
    Object.values(mapping).forEach((filename) => activeIconNames.add(filename)),
  );
}

const sortedIconNames = [...activeIconNames].sort((a, b) => a.localeCompare(b));
const assetFiles = [];
for (const filename of sortedIconNames) {
  const archivePath = `extension/icons/${filename}`;
  const bytes = archive[archivePath];
  if (!bytes) fail(`VSIX does not contain mapped icon asset ${archivePath}`);
  assetFiles.push({
    path: `assets/vscode-icons/${filename}`,
    upstreamPath: `icons/${filename}`,
    sha256: sha256(bytes),
    licenseStatus: "upstream-defined; per-file branded-icon classification is not included in the VSIX",
  });
}

const releaseInfo = {
  repository: sourceRepository,
  version,
  tag: `v${version}`,
  releaseUrl,
  packageAsset: input.packageAsset,
  packageSha256: sha256(input.bytes),
  mappingSource: "extension/dist/src/vsicons-icon-theme.json",
  licenseSource: `${sourceUrl}/blob/v${version}/README.md#license`,
};

const generatedMap = { upstream: releaseInfo, dark, light };
await rm(assetsDirectory, { recursive: true, force: true });
await mkdir(assetsDirectory, { recursive: true });
for (const asset of assetFiles) {
  const bytes = archive[`extension/icons/${path.posix.basename(asset.path)}`];
  await writeFile(path.join(root, "public", asset.path), bytes);
}
await writeJson(path.join(generatedDirectory, "icons.generated.json"), generatedMap);
await writeJson(assetManifestPath, {
  upstream: releaseInfo,
  rightsSummary: {
    mappings:
      "Derived from the upstream icon theme manifest and supplemented with common file-name and extension aliases that point to unmodified upstream SVGs; the upstream identifies its source code as MIT-licensed. See licenses/vscode-icons-source-MIT.txt.",
    icons: "CC BY-SA 4.0, except branded icons which retain their respective copyright terms",
    perFileClassification:
      "The upstream VSIX does not identify which individual SVGs are branded icons. Do not infer a per-file license from this generated inventory.",
    licenseSource: releaseInfo.licenseSource,
  },
  assets: assetFiles,
});
await writeFile(
  path.join(licenseDirectory, "vscode-icons-source-MIT.txt"),
  upstreamSourceLicense,
);

const notices = `# Third-party notices\n\n` +
  `## vscode-icons mappings\n\n` +
  `The generated filename and folder mappings are derived from the default icon-theme manifest in ` +
  `[${sourceRepository}](${sourceUrl}), release [v${version}](${releaseUrl}). ` +
  `Common file-name and extension aliases are added for GitHub entries that otherwise have no icon mapping; ` +
  `they point to unmodified upstream SVG artwork. ` +
  `The upstream project licenses its source code under MIT; a copy of the upstream license text is ` +
  `included at [licenses/vscode-icons-source-MIT.txt](licenses/vscode-icons-source-MIT.txt).\n\n` +
  `## vscode-icons artwork\n\n` +
  `This extension bundles ${assetFiles.length} SVG assets and their file/folder mappings from ` +
  `[${sourceRepository}](${sourceUrl}), release [v${version}](${releaseUrl}). ` +
  `The upstream project states that its icons are licensed under ` +
  `[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/); branded icons remain ` +
  `under their respective copyright terms. This project does not claim ownership of those assets.\n\n` +
  `The upstream VSIX does not provide per-file branded-icon license metadata. ` +
  `The generated inventory at [licenses/vscode-icons-assets.json](licenses/vscode-icons-assets.json) ` +
  `records every bundled path and SHA-256 while leaving that classification explicit. ` +
  `No SVGs are modified during synchronization.\n\n` +
  `The VSI for GitHub source code is licensed separately under Apache-2.0.\n`;
await writeFile(path.join(root, "THIRD_PARTY_NOTICES.md"), notices);

await writeActionOutput("version", version);
await writeActionOutput("release_url", releaseUrl);
console.log(`Synced vscode-icons v${version}: ${assetFiles.length} referenced SVG assets`);
