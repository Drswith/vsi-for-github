import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { unzipSync, zipSync } from "fflate";
import { collectFiles, readProject, validateExtension } from "./lib/extension-validation.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const artifacts = path.join(root, "artifacts");
const project = await readProject(root);

const extensionFiles = await collectFiles(dist);
validateExtension(extensionFiles, project, process.env);
const archive = zipSync(extensionFiles, { level: 9 });
const unpacked = unzipSync(archive);
assert.deepEqual(Object.keys(unpacked).sort(), Object.keys(extensionFiles).sort(), "ZIP file list differs from dist");
for (const [filename, bytes] of Object.entries(extensionFiles)) {
  assert.deepEqual(unpacked[filename], bytes, `ZIP contents differ from dist: ${filename}`);
}
validateExtension(unpacked, project, process.env);
await mkdir(artifacts, { recursive: true });
const filename = `${project.packageJson.name}-${project.packageJson.version}.zip`;
await writeFile(path.join(artifacts, filename), archive);
console.log(`Created artifacts/${filename}`);
