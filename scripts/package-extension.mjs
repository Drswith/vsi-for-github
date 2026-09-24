import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { zipSync } from "fflate";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const artifacts = path.join(root, "artifacts");
const packageJson = JSON.parse(
  await readFile(path.join(root, "package.json"), "utf8"),
);

async function collectFiles(directory, prefix = "") {
  const files = {};
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relativePath = path.posix.join(prefix, entry.name);
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      Object.assign(files, await collectFiles(absolutePath, relativePath));
    } else if (entry.isFile()) {
      files[relativePath] = new Uint8Array(await readFile(absolutePath));
    }
  }
  return files;
}

const extensionFiles = await collectFiles(dist);
if (!extensionFiles["manifest.json"]) {
  throw new Error("dist/manifest.json is missing; run pnpm build first");
}
const manifest = JSON.parse(new TextDecoder().decode(extensionFiles["manifest.json"]));
if (manifest.version !== packageJson.version) {
  throw new Error(
    `package.json version ${packageJson.version} does not match manifest version ${manifest.version}`,
  );
}
const releaseTag = process.env.GITHUB_REF_NAME;
if (releaseTag?.startsWith("v") && releaseTag !== `v${packageJson.version}`) {
  throw new Error(`release tag ${releaseTag} does not match package version ${packageJson.version}`);
}
await mkdir(artifacts, { recursive: true });
const filename = `${packageJson.name}-${packageJson.version}.zip`;
await writeFile(path.join(artifacts, filename), zipSync(extensionFiles, { level: 9 }));
console.log(`Created artifacts/${filename}`);
