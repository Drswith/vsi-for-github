import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const distLicenses = path.join(dist, "licenses");

await mkdir(distLicenses, { recursive: true });
await Promise.all([
  copyFile(path.join(root, "LICENSE"), path.join(dist, "LICENSE")),
  copyFile(path.join(root, "NOTICE"), path.join(dist, "NOTICE")),
  copyFile(
    path.join(root, "THIRD_PARTY_NOTICES.md"),
    path.join(dist, "THIRD_PARTY_NOTICES.md"),
  ),
  copyFile(
    path.join(root, "licenses/vscode-icons-assets.json"),
    path.join(distLicenses, "vscode-icons-assets.json"),
  ),
  copyFile(
    path.join(root, "licenses/vscode-icons-source-MIT.txt"),
    path.join(distLicenses, "vscode-icons-source-MIT.txt"),
  ),
]);
