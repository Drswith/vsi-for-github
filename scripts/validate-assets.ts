import path from "node:path";
import { fileURLToPath } from "node:url";
import { collectFiles, readProject, validateIconAssets } from "./lib/extension-validation.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const project = await readProject(root);
const files = await collectFiles(path.join(root, "public"));
const count = validateIconAssets(files, project);
console.log(`Validated ${count} referenced icon assets and their SHA-256 checksums`);
