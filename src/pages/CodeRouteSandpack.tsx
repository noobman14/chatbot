import { Navigate } from 'react-router-dom';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  SandpackCodeEditor,
  SandpackConsole,
  SandpackFileExplorer,
  SandpackLayout,
  SandpackPreview,
  SandpackProvider,
} from '@codesandbox/sandpack-react';
import { History, LayoutTemplate, Loader2, Sparkles, Trash2 } from 'lucide-react';

import { ThemeProvider } from '@/components/theme-provider';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/utils/api';

type PreviewDevice = 'desktop' | 'tablet' | 'mobile';
type SandpackFileTree = Record<string, { code: string }>;
type SandpackDependencyMap = Record<string, string>;
type SandpackHistoryRecord = {
  id: string;
  prompt: string;
  title: string;
  description: string;
  model: string;
  createdAt: number;
  entry: string;
  visibleFiles: string[];
  dependencies?: SandpackDependencyMap;
  externalResources?: string[];
  files: Array<{
    path: string;
    code: string;
  }>;
};

const MODEL_OPTIONS = [
  { value: 'doubao-seed-1-6-lite-251015', label: '豆包 1.6 Lite' },
  { value: 'doubao-seed-2-0-pro-260215', label: '豆包 2.0 Pro' },
  { value: 'doubao-seed-1-8-251228', label: '豆包 1.8' },
  { value: 'glm-4-7-251222', label: 'GLM-4.7' },
] as const;

const EXAMPLE_PROMPTS = [
  '做一个招聘官网首页，强调大标题、统计数字、CTA 区块。',
  '做一个数据看板页面，包含 KPI 卡片、图表区域和筛选栏。',
  '做一个课程详情页，包含章节目录、讲师信息和购买按钮。',
  '做一个产品对比页面，支持三列功能对比与价格方案。',
];

const PREVIEW_MAX_WIDTH: Record<PreviewDevice, string> = {
  desktop: '100%',
  tablet: '768px',
  mobile: '420px',
};

const DEFAULT_ACTIVE_FILE = '/App.tsx';
const DEFAULT_VISIBLE_FILES = ['/App.tsx', '/styles.css'];
const DEFAULT_EXTERNAL_RESOURCES = ['https://cdn.tailwindcss.com'];
const HISTORY_PAGE_SIZE = 10;
const MAX_SANDBOX_DEPENDENCIES = 12;
const MAX_EXTERNAL_RESOURCES = 8;
const BASE_SANDBOX_DEPENDENCIES: SandpackDependencyMap = {
  clsx: '2.1.1',
  'tailwind-merge': '3.4.0',
  'class-variance-authority': '0.7.1',
  'lucide-react': '0.554.0',
  '@radix-ui/react-slot': '1.2.4',
  dayjs: '1.11.19',
};
const ALLOWED_EXTERNAL_RESOURCE_HOSTS = new Set([
  'cdn.tailwindcss.com',
  'esm.sh',
  'cdn.jsdelivr.net',
  'unpkg.com',
]);

function normalizeFilePath(path: string): string {
  const normalized = path.trim().replace(/\\/g, '/');
  if (!normalized) {
    return '';
  }
  return normalized.startsWith('/') ? normalized : `/${normalized}`;
}

function buildSandpackFileTree(files: Array<{ path: string; code: string }>): SandpackFileTree {
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

function normalizeDependencies(rawDependencies?: SandpackDependencyMap | null): SandpackDependencyMap {
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

function mergeDependencies(rawDependencies?: SandpackDependencyMap | null): SandpackDependencyMap {
  const customDependencies = normalizeDependencies(rawDependencies);
  // 预装依赖版本由宿主统一兜底，避免 AI 返回版本不一致导致沙箱抖动。
  return {
    ...customDependencies,
    ...BASE_SANDBOX_DEPENDENCIES,
  };
}

function isAllowedExternalResource(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    return (parsed.protocol === 'https:' || parsed.protocol === 'http:')
      && ALLOWED_EXTERNAL_RESOURCE_HOSTS.has(host);
  } catch {
    return false;
  }
}

function normalizeExternalResources(rawResources?: string[] | null): string[] {
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

function mergeExternalResources(rawResources?: string[] | null): string[] {
  const merged = [...DEFAULT_EXTERNAL_RESOURCES, ...normalizeExternalResources(rawResources)];
  return Array.from(new Set(merged)).slice(0, MAX_EXTERNAL_RESOURCES);
}

function formatHistoryTime(ts: number): string {
  if (!Number.isFinite(ts)) {
    return '未知时间';
  }
  return new Date(ts).toLocaleString('zh-CN', { hour12: false });
}

const SANDBOX_FILES: SandpackFileTree = {
  '/App.tsx': {
    code: `import './styles.css';

export default function App() {
	return (
		<main className="page">
			<section className="hero-card">
				<p className="badge">Sandpack Ready</p>
				<h1>AI Generation Studio</h1>
				<p>
					This is a new sandbox workspace page. You can edit code in real time and
					preview the result on the right side.
				</p>
				<div className="actions">
					<button>Primary Action</button>
					<button className="ghost">Secondary</button>
				</div>
			</section>
		</main>
	);
}
`,
  },
  '/styles.css': {
    code: `:root {
	font-family: 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

* {
	box-sizing: border-box;
}

body {
	margin: 0;
	min-height: 100vh;
	background:
		radial-gradient(circle at 10% 0%, #d7f3ff 0%, transparent 38%),
		radial-gradient(circle at 95% 100%, #d3fae5 0%, transparent 36%),
		#f8fafc;
	color: #0f172a;
}

.page {
	min-height: 100vh;
	display: grid;
	place-items: center;
	padding: 28px;
}

.hero-card {
	width: min(720px, 94vw);
	border-radius: 20px;
	border: 1px solid #dbe4ee;
	padding: 30px;
	background: rgba(255, 255, 255, 0.86);
	box-shadow: 0 24px 80px rgba(15, 23, 42, 0.14);
	backdrop-filter: blur(4px);
}

.badge {
	display: inline-flex;
	margin: 0;
	border-radius: 999px;
	padding: 6px 10px;
	font-size: 12px;
	letter-spacing: 0.04em;
	color: #0f766e;
	background: #ccfbf1;
}

h1 {
	margin: 14px 0 10px;
	font-size: clamp(28px, 5vw, 44px);
	line-height: 1.1;
}

p {
	margin: 0;
	color: #334155;
	line-height: 1.6;
}

.actions {
	display: flex;
	flex-wrap: wrap;
	gap: 12px;
	margin-top: 20px;
}

button {
	border: 0;
	border-radius: 12px;
	padding: 10px 16px;
	font-weight: 600;
	cursor: pointer;
	background: #0f172a;
	color: #fff;
}

button.ghost {
	border: 1px solid #cbd5e1;
	background: #fff;
	color: #0f172a;
}
`,
  },
};

export default function CodeRouteSandpack() {
  const { user, isLoading: authLoading } = useAuth();

  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState<string>('doubao-seed-1-8-251228');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [device, setDevice] = useState<PreviewDevice>('desktop');
  const [showConsole, setShowConsole] = useState(false);
  const [editorTab, setEditorTab] = useState<'editor' | 'preview'>('editor');
  const [sandpackFiles, setSandpackFiles] = useState<SandpackFileTree>(SANDBOX_FILES);
  const [activeFile, setActiveFile] = useState(DEFAULT_ACTIVE_FILE);
  const [visibleFiles, setVisibleFiles] = useState<string[]>(DEFAULT_VISIBLE_FILES);
  const [sandpackDependencies, setSandpackDependencies] = useState<SandpackDependencyMap>(BASE_SANDBOX_DEPENDENCIES);
  const [externalResources, setExternalResources] = useState<string[]>(DEFAULT_EXTERNAL_RESOURCES);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generateMeta, setGenerateMeta] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyRecords, setHistoryRecords] = useState<SandpackHistoryRecord[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyLoadingMore, setHistoryLoadingMore] = useState(false);
  const [historyDeletingId, setHistoryDeletingId] = useState<string | null>(null);

  const previewFrameStyle = useMemo(() => ({ maxWidth: PREVIEW_MAX_WIDTH[device] }), [device]);
  const fallbackVisibleFiles = useMemo(() => {
    const paths = Object.keys(sandpackFiles);
    return paths.slice(0, Math.min(8, paths.length));
  }, [sandpackFiles]);
  const sandpackProviderKey = useMemo(() => JSON.stringify({
    dependencies: sandpackDependencies,
    resources: externalResources,
  }), [sandpackDependencies, externalResources]);
  const sandpackCustomSetup = useMemo(() => ({
    dependencies: sandpackDependencies,
  }), [sandpackDependencies]);
  const hasMoreHistory = historyRecords.length < historyTotal;

  const applyHistoryRecord = useCallback((record: SandpackHistoryRecord) => {
    const nextFiles = buildSandpackFileTree(record.files ?? []);
    const filePaths = Object.keys(nextFiles);
    if (filePaths.length === 0) {
      setGenerateError('该历史记录没有可恢复的文件。');
      return;
    }

    setSandpackFiles(nextFiles);

    const nextVisibleFiles = (record.visibleFiles ?? [])
      .map((path) => normalizeFilePath(path))
      .filter((path, index, list) => Boolean(nextFiles[path]) && list.indexOf(path) === index);

    const effectiveVisibleFiles = nextVisibleFiles.length > 0
      ? nextVisibleFiles
      : filePaths.slice(0, Math.min(8, filePaths.length));
    setVisibleFiles(effectiveVisibleFiles);
    setSandpackDependencies(mergeDependencies(record.dependencies));
    setExternalResources(mergeExternalResources(record.externalResources));

    const normalizedEntry = normalizeFilePath(record.entry ?? '');
    const nextActiveFile = nextFiles[normalizedEntry]
      ? normalizedEntry
      : (effectiveVisibleFiles[0] ?? filePaths[0]);

    setActiveFile(nextActiveFile);
    setEditorTab('editor');
    setHistoryOpen(false);
    setGenerateError(null);
    setGenerateMeta(`已恢复历史：${record.title || '未命名页面'}`);
  }, []);

  const loadHistoryData = useCallback(async (page: number = 1, append: boolean = false) => {
    if (!user) {
      return;
    }

    if (append) {
      setHistoryLoadingMore(true);
    } else {
      setHistoryLoading(true);
      setHistoryError(null);
    }

    try {
      const result = await api.getSandpackCodeGenHistory(page, HISTORY_PAGE_SIZE);
      const records = result.records ?? [];
      setHistoryPage(result.page ?? page);
      setHistoryTotal(result.total ?? 0);

      if (append) {
        setHistoryRecords((prev) => {
          const map = new Map<string, SandpackHistoryRecord>();
          for (const item of prev) {
            map.set(item.id, item);
          }
          for (const item of records) {
            map.set(item.id, item);
          }
          return Array.from(map.values());
        });
      } else {
        setHistoryRecords(records);
      }
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : '加载历史记录失败');
    } finally {
      if (append) {
        setHistoryLoadingMore(false);
      } else {
        setHistoryLoading(false);
      }
    }
  }, [user]);

  const loadMoreHistory = useCallback(() => {
    if (historyLoading || historyLoadingMore || !hasMoreHistory) {
      return;
    }
    void loadHistoryData(historyPage + 1, true);
  }, [hasMoreHistory, historyLoading, historyLoadingMore, historyPage, loadHistoryData]);

  const handleDeleteHistory = useCallback(async (recordId: string) => {
    if (historyDeletingId) {
      return;
    }

    const loadedCountBeforeDelete = historyRecords.length;
    const totalBeforeDelete = historyTotal;

    setHistoryDeletingId(recordId);
    setHistoryError(null);
    try {
      await api.deleteSandpackCodeGenHistory(recordId);

      const afterDeleteRecords = historyRecords.filter((record) => record.id !== recordId);
      const afterDeleteTotal = Math.max(0, totalBeforeDelete - 1);
      const desiredVisibleCount = Math.min(loadedCountBeforeDelete, afterDeleteTotal);

      setHistoryRecords(afterDeleteRecords);
      setHistoryTotal(afterDeleteTotal);

      // 删除后如果当前已加载列表少于应展示数量，自动补齐一条，避免“空洞感”。
      if (afterDeleteRecords.length < desiredVisibleCount) {
        const targetPage = Math.max(1, Math.ceil(desiredVisibleCount / HISTORY_PAGE_SIZE));
        const result = await api.getSandpackCodeGenHistory(targetPage, HISTORY_PAGE_SIZE);
        const pageRecords = result.records ?? [];

        const existingIds = new Set(afterDeleteRecords.map((item) => item.id));
        const mergedRecords = [...afterDeleteRecords];
        for (const item of pageRecords) {
          if (!existingIds.has(item.id)) {
            mergedRecords.push(item);
            existingIds.add(item.id);
          }
          if (mergedRecords.length >= desiredVisibleCount) {
            break;
          }
        }

        const backendTotal = result.total ?? afterDeleteTotal;
        const normalizedVisibleCount = Math.min(desiredVisibleCount, backendTotal);
        const normalizedRecords = mergedRecords.slice(0, normalizedVisibleCount);

        setHistoryRecords(normalizedRecords);
        setHistoryTotal(backendTotal);
        setHistoryPage(Math.max(1, Math.ceil(normalizedRecords.length / HISTORY_PAGE_SIZE)));
      } else {
        setHistoryPage(Math.max(1, Math.ceil(afterDeleteRecords.length / HISTORY_PAGE_SIZE)));
      }

      setGenerateMeta('历史记录已删除');
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : '删除历史记录失败');
    } finally {
      setHistoryDeletingId(null);
    }
  }, [historyDeletingId, historyRecords, historyTotal]);

  useEffect(() => {
    if (historyOpen) {
      void loadHistoryData(1, false);
    }
  }, [historyOpen, loadHistoryData]);

  const handleGenerate = async () => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt || isGenerating) {
      return;
    }

    setIsGenerating(true);
    setGenerateError(null);
    setGenerateMeta(null);

    try {
      const result = await api.generateSandpackCode(trimmedPrompt, model, 30000);
      //生成结果log调试
      console.log('生成结果', result);
      const nextFiles = buildSandpackFileTree(result.files ?? []);
      const filePaths = Object.keys(nextFiles);
      if (filePaths.length === 0) {
        throw new Error('未返回可用文件，请重试。');
      }

      setSandpackFiles(nextFiles);

      const apiVisibleFiles = (result.visibleFiles ?? [])
        .map((path) => normalizeFilePath(path))
        .filter((path, index, list) => Boolean(nextFiles[path]) && list.indexOf(path) === index);

      const nextVisibleFiles = apiVisibleFiles.length > 0
        ? apiVisibleFiles
        : filePaths.slice(0, Math.min(8, filePaths.length));
      setVisibleFiles(nextVisibleFiles);
      setSandpackDependencies(mergeDependencies(result.dependencies));
      setExternalResources(mergeExternalResources(result.externalResources));

      const normalizedEntry = normalizeFilePath(result.entry ?? '');
      const nextActiveFile = nextFiles[normalizedEntry]
        ? normalizedEntry
        : (nextVisibleFiles[0] ?? filePaths[0]);
      setActiveFile(nextActiveFile);
      setEditorTab('editor');

      const diagnosticsCount = Array.isArray(result.diagnostics) ? result.diagnostics.length : 0;
      setGenerateMeta(diagnosticsCount > 0
        ? `${result.title || '生成完成'}（${diagnosticsCount} 条提示）`
        : (result.title || '生成完成'));

      if (historyOpen) {
        void loadHistoryData(1, false);
      }
    } catch (error) {
      setGenerateError(error instanceof Error ? error.message : '生成失败，请稍后重试。');
    } finally {
      setIsGenerating(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <ThemeProvider>
      <div className="flex h-screen w-full flex-col overflow-hidden bg-background">
        <Header showSidebarTrigger={false} />

        <main className="flex min-h-0 flex-1 overflow-hidden p-4">
          <section className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[0_24px_80px_rgba(16,24,40,0.12)]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_6%_0%,rgba(56,189,248,0.16),transparent_40%),radial-gradient(circle_at_94%_100%,rgba(16,185,129,0.14),transparent_34%)]" />

            {/* 顶部标题栏 */}
            <div className="relative flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
              <div className="min-w-0">
                <h1 className="truncate text-xl font-semibold">Sandpack 代码沙箱</h1>
                <p className="text-sm text-muted-foreground">页面已切到 Sandpack 运行引擎，当前仅实现前端页面。</p>
              </div>

              <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
                <SheetTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-1.5">
                    <History className="size-4" />
                    <span>历史记录</span>
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-full sm:max-w-md">
                  <SheetHeader>
                    <SheetTitle>历史记录</SheetTitle>
                    <SheetDescription>最近的 Sandpack 生成记录，可点击回放。</SheetDescription>
                  </SheetHeader>
                  <div className="space-y-3 px-4 pb-4">
                    {historyLoading && (
                      <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                        历史加载中...
                      </div>
                    )}

                    {!historyLoading && historyError && (
                      <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                        {historyError}
                      </div>
                    )}

                    {!historyLoading && !historyError && historyRecords.length === 0 && (
                      <div className="rounded-lg border border-dashed border-border bg-muted/30 p-5 text-sm text-muted-foreground">
                        暂无历史数据
                      </div>
                    )}

                    {!historyLoading && !historyError && historyRecords.map((record) => (
                      <div
                        key={record.id}
                        className="rounded-lg border border-border bg-card p-3"
                      >
                        <button
                          type="button"
                          className="w-full text-left transition-colors hover:text-primary"
                          onClick={() => applyHistoryRecord(record)}
                        >
                          <p className="truncate text-sm font-medium">{record.title || '未命名页面'}</p>
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{record.prompt}</p>
                        </button>

                        <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="truncate">{record.model || '-'}</span>
                            <span>{formatHistoryTime(record.createdAt)}</span>
                          </div>

                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-destructive hover:text-destructive"
                            disabled={historyDeletingId === record.id}
                            onClick={() => void handleDeleteHistory(record.id)}
                          >
                            {historyDeletingId === record.id ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : (
                              <Trash2 className="size-3" />
                            )}
                            删除
                          </Button>
                        </div>
                      </div>
                    ))}

                    {!historyLoading && !historyError && hasMoreHistory && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={loadMoreHistory}
                        disabled={historyLoadingMore}
                        className="w-full"
                      >
                        {historyLoadingMore ? (
                          <>
                            <Loader2 className="size-4 animate-spin" />
                            加载中...
                          </>
                        ) : '加载更多'}
                      </Button>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* 主体内容区：左侧面板 + 右侧编辑区 */}
            <div className="relative flex min-h-0 flex-1 overflow-hidden">
              {/* 左侧控制面板 */}
              <aside className="flex w-[340px] shrink-0 flex-col border-r border-border bg-background/80">
                <div className="shrink-0 space-y-4 border-b border-border p-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">需求描述</p>
                    <Textarea
                      value={prompt}
                      onChange={(event) => setPrompt(event.target.value)}
                      placeholder="描述你希望生成的页面结构、风格和交互..."
                      className="min-h-[100px] resize-none bg-card w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">模型选择</p>
                    <NativeSelect value={model} onChange={(event) => setModel(event.target.value)} className="w-full bg-card">
                      {MODEL_OPTIONS.map((option) => (
                        <NativeSelectOption key={option.value} value={option.value}>
                          {option.label}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </div>

                  <Button
                    className="w-full gap-2"
                    disabled={!prompt.trim() || isGenerating}
                    onClick={handleGenerate}
                  >
                    <Sparkles className="size-4" />
                    {isGenerating ? '生成中...' : '生成'}
                  </Button>

                  {generateMeta && <p className="text-xs text-muted-foreground">{generateMeta}</p>}
                  {generateError && <p className="text-xs text-destructive">{generateError}</p>}
                </div>

                <div className="min-h-0 flex-1 overflow-auto p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">示例需求</p>
                  <div className="space-y-2">
                    {EXAMPLE_PROMPTS.map((item) => (
                      <button
                        key={item}
                        type="button"
                        className="w-full rounded-lg border border-border bg-card/50 px-3 py-2.5 text-left text-xs text-foreground transition-all hover:border-primary/50 hover:bg-card"
                        onClick={() => setPrompt(item)}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              </aside>

              {/* 右侧编辑区域 */}
              <div className="flex min-h-0 flex-1 flex-col">
                <SandpackProvider
                  key={sandpackProviderKey}
                  style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
                  template="react-ts"
                  files={sandpackFiles}
                  customSetup={sandpackCustomSetup}
                  options={{
                    activeFile,
                    visibleFiles: visibleFiles.length > 0 ? visibleFiles : fallbackVisibleFiles,
                    externalResources,
                    recompileMode: 'delayed',
                    recompileDelay: 300,
                  }}
                >
                  {/* 工作区工具栏 */}
                  <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <LayoutTemplate className="size-4" />
                        <span>工作区</span>
                      </div>

                      <Tabs value={editorTab} onValueChange={(value) => setEditorTab(value as 'editor' | 'preview')}>
                        <TabsList className="h-8">
                          <TabsTrigger value="editor" className="text-xs">编辑器</TabsTrigger>
                          <TabsTrigger value="preview" className="text-xs">预览</TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </div>

                    <div className="flex items-center gap-3">
                      <Button
                        size="sm"
                        variant={showConsole ? 'default' : 'outline'}
                        onClick={() => setShowConsole((prev) => !prev)}
                        className="whitespace-nowrap"
                      >
                        {showConsole ? '隐藏控制台' : '显示控制台'}
                      </Button>

                      {editorTab !== 'editor' && (<Tabs value={device} onValueChange={(value) => setDevice(value as PreviewDevice)}>
                        <TabsList className="h-8">
                          <TabsTrigger value="desktop" className="text-xs">Desktop</TabsTrigger>
                          <TabsTrigger value="tablet" className="text-xs">Tablet</TabsTrigger>
                          <TabsTrigger value="mobile" className="text-xs">Mobile</TabsTrigger>
                        </TabsList>
                      </Tabs>)}
                    </div>
                  </div>

                  {/* Sandpack 编辑器 */}
                  <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
                    {editorTab === 'editor' ? (
                      <div className='min-h-0 flex-1 overflow-hidden'>
                        <SandpackLayout style={{ height: '100%', minHeight: 0 }}>
                          <SandpackFileExplorer style={{ height: '100%', maxHeight: '100%' }} />
                          <SandpackCodeEditor
                            style={{ height: '100%', maxHeight: '100%', minHeight: 0 }}
                            showTabs
                            closableTabs
                            showLineNumbers
                            showInlineErrors
                            wrapContent={true}

                          />
                        </SandpackLayout>
                      </div>
                    ) : (
                      <div className='min-h-0 flex-1 overflow-hidden flex justify-center items-center bg-muted/20'>
                        <div className="h-full transition-all duration-300" style={{ width: '100%', ...previewFrameStyle }}>
                          <SandpackPreview
                            style={{ height: '100%' }}
                            showNavigator={true}
                            showRefreshButton={true}
                            showOpenInCodeSandbox={false}
                          />
                        </div>
                      </div>
                    )}

                    {/* 控制台 */}
                    {showConsole && (
                      <div className="h-40 shrink-0 border-t border-border bg-zinc-950/95">
                        <SandpackConsole className="h-full" resetOnPreviewRestart />
                      </div>
                    )}
                  </div>
                </SandpackProvider>
              </div>
            </div>
          </section>
        </main>
      </div>
    </ThemeProvider>
  );
}
