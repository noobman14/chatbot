import {
  ALLOWED_EXTERNAL_RESOURCE_HOSTS,
  BASE_SANDBOX_DEPENDENCIES,
  DEFAULT_EXTERNAL_RESOURCES,
  MAX_EXTERNAL_RESOURCES,
  MAX_SANDBOX_DEPENDENCIES,
} from './constants';
import type { SandpackDependencyMap, SandpackFileTree } from './types';

export function normalizeFilePath(path: string): string {
  const normalized = path.trim().replace(/\\/g, '/');
  if (!normalized) {
    return '';
  }
  return normalized.startsWith('/') ? normalized : `/${normalized}`;
}

export function buildSandpackFileTree(files: Array<{ path: string; code: string }>): SandpackFileTree {
  const nextFiles: SandpackFileTree = {};

  for (const file of files) {
    const path = normalizeFilePath(file.path);
    if (!path) {
      continue;
    }
    nextFiles[path] = { code: file.code ?? '' };
  }

  return nextFiles;
}

export function normalizeDependencies(rawDependencies?: SandpackDependencyMap | null): SandpackDependencyMap {
  if (!rawDependencies || typeof rawDependencies !== 'object') {
    return {};
  }

  const dependencies: SandpackDependencyMap = {};
  const maxCustomDependencies = Math.max(0, MAX_SANDBOX_DEPENDENCIES - Object.keys(BASE_SANDBOX_DEPENDENCIES).length);
  const entries = Object.entries(rawDependencies).slice(0, maxCustomDependencies);
  for (const [name, version] of entries) {
    const pkg = typeof name === 'string' ? name.trim() : '';
    const ver = typeof version === 'string' ? version.trim() : '';
    if (!pkg || !ver || BASE_SANDBOX_DEPENDENCIES[pkg]) {
      continue;
    }
    dependencies[pkg] = ver;
  }

  return dependencies;
}

export function mergeDependencies(rawDependencies?: SandpackDependencyMap | null): SandpackDependencyMap {
  const customDependencies = normalizeDependencies(rawDependencies);
  return {
    ...customDependencies,
    ...BASE_SANDBOX_DEPENDENCIES,
  };
}

export function isAllowedExternalResource(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    return (parsed.protocol === 'https:' || parsed.protocol === 'http:')
      && ALLOWED_EXTERNAL_RESOURCE_HOSTS.has(host);
  } catch {
    return false;
  }
}

export function normalizeExternalResources(rawResources?: string[] | null): string[] {
  if (!Array.isArray(rawResources)) {
    return [];
  }

  const deduped = new Set<string>();
  for (const item of rawResources) {
    if (deduped.size >= MAX_EXTERNAL_RESOURCES) {
      break;
    }
    if (typeof item !== 'string') {
      continue;
    }

    const value = item.trim();
    if (!value || !isAllowedExternalResource(value)) {
      continue;
    }
    deduped.add(value);
  }

  return Array.from(deduped);
}

export function mergeExternalResources(rawResources?: string[] | null): string[] {
  const merged = [...DEFAULT_EXTERNAL_RESOURCES, ...normalizeExternalResources(rawResources)];
  return Array.from(new Set(merged)).slice(0, MAX_EXTERNAL_RESOURCES);
}

export function formatHistoryTime(ts: number): string {
  if (!Number.isFinite(ts)) {
    return '未知时间';
  }
  return new Date(ts).toLocaleString('zh-CN', { hour12: false });
}
