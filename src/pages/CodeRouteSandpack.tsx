import { Navigate } from 'react-router-dom';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { ThemeProvider } from '@/components/theme-provider';
import { Header } from '@/components/layout/Header';
import { useAutoScroll } from '@/hooks/useAutoScroll';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/utils/api';

import {
  DEFAULT_ACTIVE_FILE,
  DEFAULT_EXTERNAL_RESOURCES,
  DEFAULT_VISIBLE_FILES,
  HISTORY_PAGE_SIZE,
  MODEL_OPTIONS,
  PREVIEW_MAX_WIDTH,
  BASE_SANDBOX_DEPENDENCIES,
  SANDBOX_FILES,
} from './sandpack/constants';
import {
  buildSandpackFileTree,
  mergeDependencies,
  mergeExternalResources,
  normalizeFilePath,
} from './sandpack/helpers';
import { SandpackDialoguePanel } from './sandpack/components/SandpackDialoguePanel';
import { SandpackHistorySheet } from './sandpack/components/SandpackHistorySheet';
import { SandpackWorkspace } from './sandpack/components/SandpackWorkspace';
import type {
  PreviewDevice,
  SandpackDependencyMap,
  SandpackDialogueMessage,
  SandpackFileTree,
  SandpackHistoryRecord,
  SandpackResponsePayload,
} from './sandpack/types';

export default function CodeRouteSandpack() {
  const { user, isLoading: authLoading } = useAuth();

  const [dialogueInput, setDialogueInput] = useState('');
  const [dialogueMessages, setDialogueMessages] = useState<SandpackDialogueMessage[]>([]);
  const [currentRecordId, setCurrentRecordId] = useState<string | null>(null);
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
  const [threadLoading, setThreadLoading] = useState(false);

  const dialogueScrollRef = useAutoScroll(dialogueMessages);

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

  const pushSystemMessage = useCallback((content: string) => {
    setDialogueMessages((prev) => [...prev, {
      id: crypto.randomUUID(),
      role: 'system',
      content,
      createdAt: Date.now(),
    }]);
  }, []);

  const buildThreadMessages = useCallback((records: SandpackHistoryRecord[]): SandpackDialogueMessage[] => {
    const messages: SandpackDialogueMessage[] = [];
    for (const record of records) {
      const prompt = (record.prompt ?? '').trim();
      if (prompt) {
        messages.push({
          id: `${record.id}:user`,
          role: 'user',
          content: prompt,
          createdAt: record.createdAt,
          recordId: record.id,
        });
      }

      const assistantSummary = (
        record.assistantMessage
        || record.changeSummary
        || record.description
        || record.title
        || '代码已更新。'
      ).trim();

      messages.push({
        id: `${record.id}:assistant`,
        role: 'assistant',
        content: assistantSummary,
        createdAt: record.createdAt,
        recordId: record.id,
        title: record.title,
        description: record.description,
      });
    }
    return messages;
  }, []);

  const applySandpackPayload = useCallback((result: SandpackResponsePayload) => {
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

    if (result.recordId) {
      setCurrentRecordId(result.recordId);
    }

    const diagnosticsCount = Array.isArray(result.diagnostics) ? result.diagnostics.length : 0;
    setGenerateMeta(diagnosticsCount > 0
      ? `${result.title || '生成完成'}（${diagnosticsCount} 条提示）`
      : (result.title || '生成完成'));
    setGenerateError(null);
  }, []);

  const applyHistoryRecord = useCallback(async (record: SandpackHistoryRecord) => {
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
    setCurrentRecordId(record.id);
    setEditorTab('editor');
    setHistoryOpen(false);
    setGenerateError(null);
    setGenerateMeta(`已恢复历史：${record.title || '未命名页面'}`);

    setThreadLoading(true);
    try {
      const thread = await api.getSandpackCodeGenThread(record.id);
      const threadRecords = thread.records ?? [];
      if (threadRecords.length > 0) {
        setDialogueMessages(buildThreadMessages(threadRecords));
      } else {
        setDialogueMessages(buildThreadMessages([record]));
      }
    } catch (error) {
      setDialogueMessages(buildThreadMessages([record]));
      pushSystemMessage(error instanceof Error ? `恢复对话链失败：${error.message}` : '恢复对话链失败');
    } finally {
      setThreadLoading(false);
    }
  }, [buildThreadMessages, pushSystemMessage]);

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

      if (recordId === currentRecordId) {
        setCurrentRecordId(null);
        pushSystemMessage('当前对话节点已删除，请输入新需求重新开始。');
      }
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : '删除历史记录失败');
    } finally {
      setHistoryDeletingId(null);
    }
  }, [currentRecordId, historyDeletingId, historyRecords, historyTotal, pushSystemMessage]);

  useEffect(() => {
    if (historyOpen) {
      void loadHistoryData(1, false);
    }
  }, [historyOpen, loadHistoryData]);

  const handleGenerate = async () => {
    const trimmedPrompt = dialogueInput.trim();
    if (!trimmedPrompt || isGenerating) {
      return;
    }

    const userMessage: SandpackDialogueMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmedPrompt,
      createdAt: Date.now(),
      recordId: currentRecordId ?? undefined,
    };
    setDialogueMessages((prev) => [...prev, userMessage]);
    setDialogueInput('');

    setIsGenerating(true);
    setGenerateError(null);
    setGenerateMeta(null);

    try {
      const result = currentRecordId
        ? await api.patchSandpackCode(currentRecordId, trimmedPrompt, model, 32768)
        : await api.generateSandpackCode(trimmedPrompt, model, 32768);
      applySandpackPayload(result);

      const diagnosticsCount = Array.isArray(result.diagnostics) ? result.diagnostics.length : 0;
      const assistantContent = (
        result.assistantMessage
        || result.changeSummary
        || result.description
        || result.title
        || (currentRecordId ? 'Patch 已应用。' : '已完成首轮代码生成。')
      ).trim();

      setDialogueMessages((prev) => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: assistantContent,
        createdAt: Date.now(),
        recordId: result.recordId ?? currentRecordId ?? undefined,
        title: result.title,
        description: result.description,
        diagnosticsCount,
      }]);

      if (historyOpen) {
        void loadHistoryData(1, false);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '生成失败，请稍后重试。';
      setGenerateError(message);
      pushSystemMessage(message);
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

            <div className="relative flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
              <div className="min-w-0">
                <h1 className="truncate text-xl font-semibold">Sandpack 代码沙箱</h1>
                <p className="text-sm text-muted-foreground">页面已切到 Sandpack 运行引擎，当前仅实现前端页面。</p>
              </div>

              <SandpackHistorySheet
                open={historyOpen}
                onOpenChange={setHistoryOpen}
                loading={historyLoading}
                loadingMore={historyLoadingMore}
                error={historyError}
                records={historyRecords}
                deletingId={historyDeletingId}
                hasMore={hasMoreHistory}
                onApply={(record) => {
                  void applyHistoryRecord(record);
                }}
                onDelete={(recordId) => {
                  void handleDeleteHistory(recordId);
                }}
                onLoadMore={loadMoreHistory}
              />
            </div>

            <div className="relative flex min-h-0 flex-1 overflow-hidden">
              <SandpackDialoguePanel
                currentRecordId={currentRecordId}
                model={model}
                modelOptions={MODEL_OPTIONS}
                onModelChange={setModel}
                generateMeta={generateMeta}
                generateError={generateError}
                threadLoading={threadLoading}
                dialogueMessages={dialogueMessages}
                dialogueScrollRef={dialogueScrollRef}
                isGenerating={isGenerating}
                dialogueInput={dialogueInput}
                onDialogueInputChange={setDialogueInput}
                onExamplePromptClick={setDialogueInput}
                onSubmit={() => {
                  void handleGenerate();
                }}
              />

              <SandpackWorkspace
                sandpackProviderKey={sandpackProviderKey}
                sandpackFiles={sandpackFiles}
                sandpackCustomSetup={sandpackCustomSetup}
                activeFile={activeFile}
                visibleFiles={visibleFiles}
                fallbackVisibleFiles={fallbackVisibleFiles}
                externalResources={externalResources}
                editorTab={editorTab}
                onEditorTabChange={setEditorTab}
                showConsole={showConsole}
                onToggleConsole={() => setShowConsole((prev) => !prev)}
                device={device}
                onDeviceChange={setDevice}
                previewFrameStyle={previewFrameStyle}
              />
            </div>
          </section>
        </main>
      </div>
    </ThemeProvider>
  );
}
