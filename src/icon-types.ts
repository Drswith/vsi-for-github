export type IconPathMap = Record<string, string>;

export interface ThemeDefaults {
  file: string;
  folder: string;
  folderExpanded: string;
  rootFolder: string;
  rootFolderExpanded: string;
}

export interface ThemeMappings {
  defaults: ThemeDefaults;
  files: {
    names: IconPathMap;
    extensions: IconPathMap;
  };
  folders: {
    names: IconPathMap;
    namesExpanded: IconPathMap;
  };
}

export interface UpstreamRelease {
  repository: string;
  version: string;
  tag: string;
  releaseUrl: string;
  packageAsset: string;
  packageSha256: string;
  mappingSource: string;
  licenseSource: string;
}

export interface GeneratedIconMap {
  upstream: UpstreamRelease;
  dark: ThemeMappings;
  light: ThemeMappings;
}

export interface IconAsset {
  path: string;
  upstreamPath: string;
  sha256: string;
  licenseStatus: string;
}

export interface IconInventory {
  upstream: UpstreamRelease;
  assets: IconAsset[];
}
