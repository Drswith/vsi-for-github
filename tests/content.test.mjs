import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { JSDOM } from "jsdom";
import { build } from "vite";

const iconMap = JSON.parse(await readFile(new URL("../src/generated/icons.generated.json", import.meta.url)));
const result = await build({ logLevel: "silent", build: { write: false } });
const bundle = result.output.find((entry) => entry.type === "chunk" && entry.isEntry).code;
const flushMutations = () => new Promise(setImmediate);

function row(name, { route = "blob", repository = "owner/repo", nativeIcon = true } = {}) {
  return `<tr class="react-directory-row"><td><div class="react-directory-filename-column">
    ${nativeIcon ? '<svg class="octicon" aria-hidden="true"></svg>' : ""}
    <a aria-label="${name}, (${route === "tree" ? "Directory" : "File"})"
       href="/${repository}/${route}/main/${name}">${name}</a>
  </div></td></tr>`;
}

function createPage(t, html, mode = "dark") {
  const dom = new JSDOM(html, { url: "https://github.com/owner/repo", runScripts: "outside-only" });
  t.after(() => dom.window.close());
  const { window } = dom;
  window.document.documentElement.setAttribute("data-color-mode", mode);
  const media = new window.EventTarget();
  media.matches = false;
  window.matchMedia = () => media;
  window.chrome = { runtime: { getURL: (asset) => `https://extension.invalid/${asset}` } };
  window.eval(bundle);
  return { window, document: window.document, media };
}

function iconPath(container) {
  const image = container.querySelector("img[data-vsi-for-github-icon]");
  assert.ok(image, "repository entry should receive an icon");
  return new URL(image.src).pathname.split("/").at(-1);
}

test("theme changes refresh icons beside links without an unrelated DOM mutation", async (t) => {
  const { document } = createPage(t, `<table>${row(".babelrc")}</table>`, "light");
  assert.notEqual(iconMap.light.files.names[".babelrc"], iconMap.dark.files.names[".babelrc"]);
  assert.equal(iconPath(document), iconMap.light.files.names[".babelrc"]);
  assert.equal(document.querySelector("img").closest("a"), null);

  document.documentElement.setAttribute("data-color-mode", "dark");
  await flushMutations();
  assert.equal(iconPath(document), iconMap.dark.files.names[".babelrc"]);

  document.documentElement.setAttribute("data-color-mode", "light");
  await flushMutations();
  assert.equal(iconPath(document), iconMap.light.files.names[".babelrc"]);
});

test("system theme changes refresh auto-mode icons", async (t) => {
  const { window, document, media } = createPage(t, `<table>${row(".babelrc")}</table>`, "auto");
  assert.equal(iconPath(document), iconMap.light.files.names[".babelrc"]);
  media.matches = true;
  media.dispatchEvent(new window.Event("change"));
  await flushMutations();
  assert.equal(iconPath(document), iconMap.dark.files.names[".babelrc"]);
});

test("inherited object keys use default file and folder icons", (t) => {
  const cases = [
    ["constructor", "blob", iconMap.dark.defaults.file],
    ["__proto__", "blob", iconMap.dark.defaults.file],
    ["file.constructor", "blob", iconMap.dark.defaults.file],
    ["file.__proto__", "blob", iconMap.dark.defaults.file],
    ["constructor", "tree", iconMap.dark.defaults.folder],
    ["__proto__", "tree", iconMap.dark.defaults.folder],
  ];
  const { document } = createPage(t, `<table>${cases.map(([name, route]) => row(name, { route })).join("")}</table>`);
  [...document.querySelectorAll("tr")].forEach((entry, index) => {
    assert.equal(iconPath(entry), cases[index][2], `${cases[index][1]} ${cases[index][0]}`);
  });
});

test("filename matching, compound extensions and unknown-file fallback remain intact", (t) => {
  const cases = [
    ["PACKAGE.JSON", iconMap.dark.files.names["package.json"]],
    ["types.d.ts", iconMap.dark.files.extensions["d.ts"]],
    ["unknown.vsi-unknown", iconMap.dark.defaults.file],
  ];
  const { document } = createPage(t, `<table>${cases.map(([name]) => row(name)).join("")}</table>`);
  [...document.querySelectorAll("tr")].forEach((entry, index) => {
    assert.ok(cases[index][1]);
    assert.equal(iconPath(entry), cases[index][1]);
  });
});

test("new repository rows are enhanced and repeated navigation does not duplicate icons", async (t) => {
  const { window, document } = createPage(t, `<table>${row("package.json")}</table>`);
  document.querySelector("tbody").insertAdjacentHTML("beforeend", row(".babelrc", { nativeIcon: false }));
  await flushMutations();
  document.dispatchEvent(new window.Event("turbo:load"));
  document.dispatchEvent(new window.Event("turbo:render"));
  await flushMutations();
  assert.equal(document.querySelectorAll("img[data-vsi-for-github-icon]").length, 2);
  assert.equal(document.querySelectorAll("a").length, 2);
  assert.equal(document.querySelectorAll("a")[1].getAttribute("href"), "/owner/repo/blob/main/.babelrc");
});

test("links outside repository rows and links to other repositories are left alone", (t) => {
  const { document } = createPage(t,
    `<a href="/owner/repo/blob/main/package.json">package.json</a>
     <table>${row("package.json", { repository: "someone/else" })}</table>`,
  );
  assert.equal(document.querySelectorAll("img[data-vsi-for-github-icon]").length, 0);
  assert.equal(document.querySelectorAll("svg").length, 1);
});
