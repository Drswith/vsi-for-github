import iconMap from "./generated/icons.generated.json";

type IconPathMap = Record<string, string>;

interface ThemeMappings {
  defaults: {
    file: string;
    folder: string;
    folderExpanded: string;
    rootFolder: string;
    rootFolderExpanded: string;
  };
  files: {
    names: IconPathMap;
    extensions: IconPathMap;
  };
  folders: {
    names: IconPathMap;
    namesExpanded: IconPathMap;
  };
}

interface GeneratedIconMap {
  dark: ThemeMappings;
  light: ThemeMappings;
}

declare const chrome: {
  runtime: {
    getURL(path: string): string;
  };
};

const themes = iconMap as GeneratedIconMap;
const iconAttribute = "data-vsi-for-github-icon";
const entrySelector = 'a[href*="/blob/"], a[href*="/tree/"]';
const iconClass = "vsi-for-github-icon";
const iconAssetDirectory = "assets/vscode-icons";

function getIconUrl(path: string): string {
  return chrome.runtime.getURL(`${iconAssetDirectory}/${path}`);
}

interface RepositoryPath {
  owner: string;
  repository: string;
}

interface FileEntry {
  link: HTMLAnchorElement;
  container: Element;
  name: string;
  isDirectory: boolean;
  isExpanded: boolean;
}

function getCurrentRepository(): RepositoryPath | undefined {
  const [, owner, repository] = window.location.pathname.split("/");
  if (!owner || !repository) return undefined;
  return { owner, repository };
}

function getEntryName(link: HTMLAnchorElement): string | undefined {
  const ariaLabel = link.getAttribute("aria-label")?.trim();
  const labeledName = ariaLabel?.replace(/,\s*\((?:File|Directory)\)\s*$/, "");
  const name = labeledName || link.getAttribute("title")?.trim() || link.textContent?.trim();
  return name || undefined;
}

function getFileEntry(
  link: HTMLAnchorElement,
  repository: RepositoryPath,
): FileEntry | undefined {
  const url = new URL(link.href, window.location.origin);
  if (url.origin !== window.location.origin) return undefined;

  const path = url.pathname.split("/").filter(Boolean);
  if (path[0] !== repository.owner || path[1] !== repository.repository) return undefined;

  const route = path[2];
  const isDirectory = route === "tree";
  if (!isDirectory && route !== "blob") return undefined;
  if (path.length < 5) return undefined;

  const row = link.closest("tr");
  const treeItem = link.closest('[role="treeitem"]');
  const isDirectoryRow = row?.classList.contains("react-directory-row") ?? false;
  if (!isDirectoryRow && !treeItem) return undefined;

  const name = getEntryName(link);
  if (!name) return undefined;

  const container =
    link.closest('[class*="directory-filename-column"]') ??
    link.closest("td") ??
    treeItem ??
    link;
  const expanded =
    link.getAttribute("aria-expanded") === "true" ||
    treeItem?.getAttribute("aria-expanded") === "true";

  return { link, container, name, isDirectory, isExpanded: expanded };
}

function isDarkMode(): boolean {
  const mode = document.documentElement.getAttribute("data-color-mode");
  if (mode === "dark") return true;
  if (mode === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function getIconPath(entry: FileEntry): string {
  const theme = isDarkMode() ? themes.dark : themes.light;
  const name = entry.name.toLowerCase();

  if (entry.isDirectory) {
    const folderMap = entry.isExpanded
      ? theme.folders.namesExpanded
      : theme.folders.names;
    const defaultIcon = entry.isExpanded
      ? theme.defaults.folderExpanded
      : theme.defaults.folder;
    return folderMap[name] ?? defaultIcon;
  }

  const namedIcon = theme.files.names[name];
  if (namedIcon) return namedIcon;

  let dotIndex = name.indexOf(".");
  while (dotIndex >= 0 && dotIndex < name.length - 1) {
    const extension = name.slice(dotIndex + 1);
    const extensionIcon = theme.files.extensions[extension];
    if (extensionIcon) return extensionIcon;
    dotIndex = name.indexOf(".", dotIndex + 1);
  }
  return theme.defaults.file;
}

function getExistingIcon(container: Element): HTMLImageElement | undefined {
  return (
    Array.from(container.querySelectorAll<HTMLImageElement>(`img[${iconAttribute}]`))[0] ??
    undefined
  );
}

function createIcon(path: string): HTMLImageElement {
  const image = document.createElement("img");
  image.className = iconClass;
  image.setAttribute(iconAttribute, "true");
  image.setAttribute("aria-hidden", "true");
  image.alt = "";
  image.src = getIconUrl(path);
  return image;
}

function applyIcon(entry: FileEntry): void {
  const path = getIconPath(entry);
  const source = getIconUrl(path);
  const existing = getExistingIcon(entry.container);
  if (existing) {
    if (existing.src !== source) existing.src = source;
    return;
  }

  const image = createIcon(path);
  const nativeIcon = Array.from(
    entry.container.querySelectorAll<SVGElement>('svg[aria-hidden="true"]'),
  ).find((svg) => {
    const isOcticon =
      svg.classList.contains("octicon") ||
      svg.getAttribute("data-component") === "Octicon";
    return (
      isOcticon &&
      Boolean(svg.compareDocumentPosition(entry.link) & Node.DOCUMENT_POSITION_FOLLOWING)
    );
  });

  if (nativeIcon) nativeIcon.replaceWith(image);
  else entry.link.prepend(image);
}

function enhanceEntries(): void {
  const repository = getCurrentRepository();
  if (!repository) return;

  document.querySelectorAll<HTMLAnchorElement>(entrySelector).forEach((link) => {
    const entry = getFileEntry(link, repository);
    if (entry) applyIcon(entry);
  });
}

let enhanceScheduled = false;
function scheduleEnhancement(): void {
  if (enhanceScheduled) return;
  enhanceScheduled = true;
  queueMicrotask(() => {
    enhanceScheduled = false;
    enhanceEntries();
  });
}

function refreshIconTheme(): void {
  document.querySelectorAll<HTMLImageElement>(`img[${iconAttribute}]`).forEach((image) => {
    const link = image.closest("a");
    if (!(link instanceof HTMLAnchorElement)) return;
    const repository = getCurrentRepository();
    if (!repository) return;
    const entry = getFileEntry(link, repository);
    if (entry) image.src = getIconUrl(getIconPath(entry));
  });
}

function installObservers(): void {
  const contentObserver = new MutationObserver((records) => {
    const hasPageChanges = records.some((record) => {
      const changedNodes = [...record.addedNodes, ...record.removedNodes];
      return changedNodes.some(
        (node) => !(node instanceof Element && node.hasAttribute(iconAttribute)),
      );
    });
    if (hasPageChanges) scheduleEnhancement();
  });

  contentObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  const themeObserver = new MutationObserver(refreshIconTheme);
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-color-mode", "data-light-theme", "data-dark-theme"],
  });

  document.addEventListener("turbo:load", scheduleEnhancement);
  document.addEventListener("turbo:render", scheduleEnhancement);
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", refreshIconTheme);
}

enhanceEntries();
installObservers();
