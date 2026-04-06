import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import Editor from '@monaco-editor/react';
import { Play, Square, Trash2, History, Sparkles, Loader2 } from 'lucide-react';

import { api } from '@/utils/api';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from '@/components/ui/sheet';

import { ThemeProvider } from '@/components/theme-provider';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAutoScroll } from '@/hooks/useAutoScroll';

type CodeLang = 'html' | 'css' | 'javascript';
type MobileView = 'editor' | 'preview' | 'console';
type ConsoleLevel = 'log' | 'warn' | 'error' | 'info';

type DraftState = {
  html: string;
  css: string;
  javascript: string;
};

type ConsoleEntry = {
  id: string;
  level: ConsoleLevel;
  message: string;
  time: string;
};

type SandboxPayload = {
  channel: 'code-sandbox';
  runId: string;
  type: 'log' | 'warn' | 'error' | 'runtime-error' | 'runtime-ready';
  args?: unknown[];
  message?: string;
};

const STORAGE_KEY = 'code-sandbox-draft-v1';

const DEFAULT_DRAFT: DraftState = {
  html: `<div class="stage">\n  <h1>Live Sandbox</h1>\n  <p>Edit HTML / CSS / JS, then click Run.</p>\n  <button id="cta">Click me</button>\n</div>`,
  css: `:root {\n  color-scheme: light dark;\n}\n\nbody {\n  margin: 0;\n  min-height: 100vh;\n  display: grid;\n  place-items: center;\n  background: radial-gradient(circle at 20% 0%, #f4f8ff 0%, #e9eef7 45%, #dbe2f0 100%);\n  font-family: ui-monospace, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;\n}\n\n.stage {\n  width: min(560px, 90vw);\n  padding: 28px;\n  border-radius: 18px;\n  background: rgba(255, 255, 255, 0.88);\n  box-shadow: 0 20px 70px rgba(15, 23, 42, 0.14);\n}\n\nh1 {\n  margin-top: 0;\n}\n\n#cta {\n  margin-top: 14px;\n  border: 0;\n  border-radius: 10px;\n  padding: 10px 14px;\n  background: #111827;\n  color: #fff;\n  cursor: pointer;\n}`,
  javascript: `const button = document.getElementById('cta');\nif (button) {\n  button.addEventListener('click', () => {\n    console.log('Button clicked at', new Date().toLocaleTimeString());\n  });\n}`,
};

function readStoredDraft(): DraftState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_DRAFT;
    }

    const parsed = JSON.parse(raw) as Partial<DraftState>;
    return {
      html: typeof parsed.html === 'string' ? parsed.html : DEFAULT_DRAFT.html,
      css: typeof parsed.css === 'string' ? parsed.css : DEFAULT_DRAFT.css,
      javascript: typeof parsed.javascript === 'string' ? parsed.javascript : DEFAULT_DRAFT.javascript,
    };
  } catch {
    return DEFAULT_DRAFT;
  }
}

function formatLogArg(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function timestamp(): string {
  return new Date().toLocaleTimeString();
}

function buildSrcDoc(draft: DraftState, runId: string): string {
  const escapedUserJs = draft.javascript.replace(/<\/script/gi, '<\\/script');

  return `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>${draft.css}</style>
  </head>
  <body>
    ${draft.html}
    <script>
      (function () {
        const CHANNEL = 'code-sandbox';
        const RUN_ID = ${JSON.stringify(runId)};

        function emit(type, payload) {
          parent.postMessage(
            {
              channel: CHANNEL,
              runId: RUN_ID,
              type,
              ...payload,
            },
            '*'
          );
        }

        ['log', 'warn', 'error'].forEach(function (level) {
          const original = console[level];
          console[level] = function () {
            const args = Array.prototype.slice.call(arguments);
            emit(level, { args: args });
            original.apply(console, args);
          };
        });

        window.onerror = function (message, source, lineno, colno) {
          emit('runtime-error', {
            message:
              String(message) +
              ' (' +
              String(source || 'inline') +
              ':' +
              String(lineno || 0) +
              ':' +
              String(colno || 0) +
              ')',
          });
        };

        window.addEventListener('unhandledrejection', function (event) {
          const reason = event.reason;
          emit('runtime-error', {
            message:
              reason instanceof Error
                ? reason.message
                : typeof reason === 'string'
                  ? reason
                  : JSON.stringify(reason),
          });
        });

        emit('runtime-ready', { message: 'Sandbox ready' });
      })();
    </script>
    <script>${escapedUserJs}</script>
  </body>
</html>`;
}

export default function CodeRoute() {
  const { user, isLoading: authLoading } = useAuth();
  const { t } = useTranslation();
  const isMobile = useIsMobile();

  const [aiPrompt, setAiPrompt] = useState('');
  const [aiModel, setAiModel] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyRecords, setHistoryRecords] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [draft, setDraft] = useState<DraftState>(() => readStoredDraft());
  const [activeCodeTab, setActiveCodeTab] = useState<CodeLang>('html');
  const [mobileView, setMobileView] = useState<MobileView>('editor');
  const [previewDoc, setPreviewDoc] = useState('');
  const [previewKey, setPreviewKey] = useState(0);
  const [consoleEntries, setConsoleEntries] = useState<ConsoleEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [editorWidthPercent, setEditorWidthPercent] = useState(52);
  const [topHeightPercent, setTopHeightPercent] = useState(72);
  const consoleScrollRef = useAutoScroll(consoleEntries);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const currentRunIdRef = useRef('');
  const topSplitRef = useRef<HTMLDivElement | null>(null);
  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const dragModeRef = useRef<'vertical' | 'horizontal' | null>(null);
  const dragStartRef = useRef({
    x: 0,
    y: 0,
    editorWidthPercent: 52,
    topHeightPercent: 72,
  });

  useEffect(() => {
    const saveTimer = window.setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    }, 300);

    return () => {
      window.clearTimeout(saveTimer);
    };
  }, [draft]);

  useEffect(() => {
    const handler = (event: MessageEvent<unknown>) => {
      if (!iframeRef.current || event.source !== iframeRef.current.contentWindow) {
        return;
      }

      if (!event.data || typeof event.data !== 'object') {
        return;
      }

      const payload = event.data as SandboxPayload;
      if (payload.channel !== 'code-sandbox' || payload.runId !== currentRunIdRef.current) {
        return;
      }

      if (payload.type === 'runtime-ready') {
        setConsoleEntries((prev) => [
          ...prev,
          {
            id: `${Date.now()}-ready`,
            level: 'info',
            message: payload.message ?? 'Sandbox ready',
            time: timestamp(),
          },
        ]);
        return;
      }

      if (payload.type === 'runtime-error') {
        setConsoleEntries((prev) => [
          ...prev,
          {
            id: `${Date.now()}-runtime-error`,
            level: 'error',
            message: payload.message ?? 'Runtime error',
            time: timestamp(),
          },
        ]);
        return;
      }

      if (payload.type === 'log' || payload.type === 'warn' || payload.type === 'error') {
        const message = (payload.args ?? []).map(formatLogArg).join(' ');
        const level: ConsoleLevel = payload.type;
        setConsoleEntries((prev) => [
          ...prev,
          {
            id: `${Date.now()}-${payload.type}`,
            level,
            message,
            time: timestamp(),
          },
        ]);
      }
    };

    window.addEventListener('message', handler);
    return () => {
      window.removeEventListener('message', handler);
    };
  }, []);

  const stopResize = () => {
    dragModeRef.current = null;
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
  };

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      if (!dragModeRef.current) return;

      // 鼠标已松开（如移出窗口时松开），自动终止拖拽
      if (e.buttons === 0) {
        stopResize();
        return;
      }

      if (dragModeRef.current === 'vertical') {
        const width = topSplitRef.current?.clientWidth ?? 0;
        if (width <= 0) return;
        const deltaX = e.clientX - dragStartRef.current.x;
        const next = dragStartRef.current.editorWidthPercent + (deltaX / width) * 100;
        setEditorWidthPercent(Math.max(24, Math.min(76, next)));
        return;
      }

      const workspaceHeight = workspaceRef.current?.clientHeight ?? 0;
      if (workspaceHeight <= 0) return;
      const deltaY = e.clientY - dragStartRef.current.y;
      const nextTop = dragStartRef.current.topHeightPercent + (deltaY / workspaceHeight) * 100;
      setTopHeightPercent(Math.max(38, Math.min(86, nextTop)));
    };

    const onPointerUp = () => {
      if (dragModeRef.current) stopResize();
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, []);

  const startVerticalResize = (event: ReactPointerEvent<HTMLButtonElement>) => {
    dragModeRef.current = 'vertical';
    dragStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      editorWidthPercent,
      topHeightPercent,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
  };

  const startHorizontalResize = (event: ReactPointerEvent<HTMLButtonElement>) => {
    dragModeRef.current = 'horizontal';
    dragStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      editorWidthPercent,
      topHeightPercent,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'row-resize';
  };

  const editorLanguage = useMemo(() => {
    if (activeCodeTab === 'javascript') {
      return 'javascript';
    }
    return activeCodeTab;
  }, [activeCodeTab]);

  const runSandbox = () => {
    const nextRunId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    currentRunIdRef.current = nextRunId;

    setConsoleEntries([
      {
        id: `${Date.now()}-run`,
        level: 'info',
        message: t('code.runStarted'),
        time: timestamp(),
      },
    ]);
    setPreviewDoc(buildSrcDoc(draft, nextRunId));
    setPreviewKey((prev) => prev + 1);
    setIsRunning(true);

    if (isMobile) {
      setMobileView('preview');
    }
  };

  const stopSandbox = () => {
    currentRunIdRef.current = '';
    setPreviewDoc('<!doctype html><html><body></body></html>');
    setPreviewKey((prev) => prev + 1);
    setIsRunning(false);
    setConsoleEntries((prev) => [
      ...prev,
      {
        id: `${Date.now()}-stop`,
        level: 'warn',
        message: t('code.runStopped'),
        time: timestamp(),
      },
    ]);
  };

  const clearConsole = () => {
    setConsoleEntries([]);
  };

  const updateCurrentCode = (value: string | undefined) => {
    setDraft((prev) => ({
      ...prev,
      [activeCodeTab]: value ?? '',
    }));
  };

  const handleGenerateCode = async () => {
    if (!aiPrompt.trim() || aiGenerating) return;
    setAiGenerating(true);
    setConsoleEntries((prev) => [
      ...prev,
      {
        id: `${Date.now()}-ai-start`,
        level: 'info',
        message: t('code.generating'),
        time: timestamp(),
      },
    ]);
    try {
      const res = await api.generateCode(aiPrompt, aiModel);
      setDraft({
        html: res.html || '',
        css: res.css || '',
        javascript: res.javascript || '',
      });
      setConsoleEntries((prev) => [
        ...prev,
        {
          id: `${Date.now()}-ai-success`,
          level: 'info',
          message: t('code.generateSuccess'),
          time: timestamp(),
        },
      ]);
      if (isMobile) {
        setMobileView('editor');
      }
    } catch (err: any) {
      setConsoleEntries((prev) => [
        ...prev,
        {
          id: `${Date.now()}-ai-error`,
          level: 'error',
          message: err.message || t('code.generateError'),
          time: timestamp(),
        },
      ]);
    } finally {
      setAiGenerating(false);
    }
  };

  const loadHistoryData = async () => {
    setHistoryLoading(true);
    try {
      const res = await api.getCodeGenHistory();
      setHistoryRecords(res.records || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (historyOpen) {
      loadHistoryData();
    }
  }, [historyOpen]);

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

        <main className="min-h-0 flex-1 overflow-hidden p-3 md:p-4">
          <section className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card/80 shadow-[0_24px_80px_rgba(16,24,40,0.15)]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_0%,rgba(56,189,248,0.16),transparent_42%),radial-gradient(circle_at_90%_100%,rgba(16,185,129,0.14),transparent_36%)]" />

            <div className="relative flex flex-col gap-3 border-b border-border px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h1 className="text-lg font-semibold tracking-tight md:text-xl">{t('code.title')}</h1>
                  <p className="text-xs text-muted-foreground md:text-sm">{t('code.subtitle')}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button onClick={runSandbox} size="sm" className="gap-1.5">
                    <Play className="size-4" />
                    {t('code.run')}
                  </Button>
                  <Button onClick={stopSandbox} size="sm" variant="secondary" className="gap-1.5" disabled={!isRunning}>
                    <Square className="size-4" />
                    {t('code.stop')}
                  </Button>
                  <Button onClick={clearConsole} size="sm" variant="outline" className="gap-1.5 hidden lg:flex">
                    <Trash2 className="size-4" />
                    {t('code.clearConsole')}
                  </Button>
                  <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
                    <SheetTrigger asChild>
                      <Button size="sm" variant="outline" className="gap-1.5">
                        <History className="size-4" />
                        <span className="hidden md:inline">{t('code.history')}</span>
                      </Button>
                    </SheetTrigger>
                    <SheetContent className="w-full sm:max-w-md overflow-y-auto">
                      <SheetHeader className="mb-4">
                        <SheetTitle>{t('code.history')}</SheetTitle>
                        <SheetDescription className="sr-only">{t('code.history')}</SheetDescription>
                      </SheetHeader>
                      {historyLoading ? (
                        <div className="flex justify-center p-4">
                          <Loader2 className="size-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : historyRecords.length === 0 ? (
                        <div className="text-center text-muted-foreground p-4">{t('code.noHistory')}</div>
                      ) : (
                        <div className="flex flex-col gap-3">
                          {historyRecords.map((record) => (
                            <div key={record.id} className="rounded-lg border bg-card p-3 shadow-sm">
                              <h3 className="font-medium text-sm mb-1">{record.title}</h3>
                              <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{record.description || record.prompt}</p>
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                                  {record.model === 'doubao-seed-1-6-lite-251015' ? '豆包 1.6 Lite' :
                                    record.model === 'doubao-seed-2-0-pro-260215' ? '豆包 2.0 Pro' :
                                      record.model === 'doubao-seed-1-8-251228' ? '豆包 1.8' :
                                        record.model === 'glm-4-7-251222' ? 'GLM-4.7' : '豆包 1.8'}
                                </span>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="text-xs h-7"
                                  onClick={() => {
                                    setDraft({
                                      html: record.html || '',
                                      css: record.css || '',
                                      javascript: record.javascript || ''
                                    });
                                    setHistoryOpen(false);
                                  }}
                                >
                                  {t('code.loadHistory')}
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </SheetContent>
                  </Sheet>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 border-t border-border pt-3 mt-1">
                <div className="flex-1">
                  <Input
                    placeholder={t('code.aiGeneratePlaceholder')}
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleGenerateCode();
                    }}
                    disabled={aiGenerating}
                    className="bg-card/50"
                  />
                </div>
                <div className="flex gap-2">
                  <NativeSelect
                    value={aiModel}
                    onChange={(e) => setAiModel(e.target.value)}
                    className="w-28 md:w-32 text-sm"
                    disabled={aiGenerating}
                  >
                    <NativeSelectOption value="">{t('code.modelDefault')}</NativeSelectOption>
                    <NativeSelectOption value="doubao-seed-1-6-lite-251015">{t('code.modelLite')}</NativeSelectOption>
                    <NativeSelectOption value="doubao-seed-2-0-pro-260215">{t('code.modelPro')}</NativeSelectOption>
                    <NativeSelectOption value="doubao-seed-1-8-251228">{t('code.modelSeed18')}</NativeSelectOption>
                    <NativeSelectOption value="glm-4-7-251222">{t('code.modelGLM47')}</NativeSelectOption>
                  </NativeSelect>
                  <Button
                    onClick={handleGenerateCode}
                    disabled={!aiPrompt.trim() || aiGenerating}
                    className="gap-1.5 shrink-0"
                  >
                    {aiGenerating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                    {aiGenerating ? <span className="hidden md:inline">{t('code.generating')}</span> : t('code.aiGenerate')}
                  </Button>
                </div>
              </div>
            </div>

            {isMobile && (
              <div className="relative border-b border-border px-4 py-2">
                <Tabs value={mobileView} onValueChange={(value) => setMobileView(value as MobileView)}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="editor">{t('code.editor')}</TabsTrigger>
                    <TabsTrigger value="preview">{t('code.preview')}</TabsTrigger>
                    <TabsTrigger value="console">{t('code.console')}</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            )}

            {!isMobile ? (
              <div ref={workspaceRef} className="relative flex h-full min-h-0 flex-1 flex-col p-3 md:p-4">
                <div ref={topSplitRef} className="flex min-h-0 shrink-0" style={{ flexBasis: `${topHeightPercent}%` }}>
                  <div
                    className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border/80 bg-background/85"
                    style={{ width: `${editorWidthPercent}%` }}
                  >
                    <div className="border-b border-border/80 px-2 py-2">
                      <Tabs value={activeCodeTab} onValueChange={(value) => setActiveCodeTab(value as CodeLang)}>
                        <TabsList>
                          <TabsTrigger value="html">HTML</TabsTrigger>
                          <TabsTrigger value="css">CSS</TabsTrigger>
                          <TabsTrigger value="javascript">JavaScript</TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </div>

                    <div className="min-h-0 flex-1">
                      <Editor
                        height="100%"
                        theme="vs-dark"
                        language={editorLanguage}
                        value={draft[activeCodeTab]}
                        onChange={updateCurrentCode}
                        options={{
                          minimap: { enabled: false },
                          fontSize: 14,
                          scrollBeyondLastLine: false,
                          wordWrap: 'on',
                          automaticLayout: true,
                        }}
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    aria-label="Resize editor and preview"
                    onPointerDown={startVerticalResize}
                    className="group mx-1 w-2 shrink-0 cursor-col-resize rounded-md bg-transparent transition-colors hover:bg-accent"
                  >
                    <span className="mx-auto block h-full w-[2px] rounded-full bg-border group-hover:bg-primary/70" />
                  </button>

                  <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border/80 bg-background/75">
                    <div className="border-b border-border/80 px-3 py-2 text-sm font-medium text-muted-foreground">
                      {t('code.preview')}
                    </div>
                    <iframe
                      ref={iframeRef}
                      key={previewKey}
                      title="Code Sandbox Preview"
                      sandbox="allow-scripts"
                      srcDoc={previewDoc}
                      className="h-full w-full flex-1 border-0 bg-white"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  aria-label="Resize console height"
                  onPointerDown={startHorizontalResize}
                  className="group my-1 h-2 w-full shrink-0 cursor-row-resize rounded-md bg-transparent transition-colors hover:bg-accent"
                >
                  <span className="mx-auto mt-[3px] block h-[2px] w-16 rounded-full bg-border group-hover:bg-primary/70" />
                </button>

                <div
                  className="relative min-h-[120px] rounded-xl border border-border/80 bg-zinc-950/95 p-3"
                  style={{ flexBasis: `${100 - topHeightPercent}%` }}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <h2 className="text-sm font-medium text-zinc-300">{t('code.console')}</h2>
                    <span className="text-xs text-zinc-400">{consoleEntries.length} logs</span>
                  </div>
                  <div ref={consoleScrollRef} className="h-[calc(100%-2rem)] overflow-auto rounded-lg border border-zinc-800/90 bg-zinc-950 p-2 font-mono text-xs text-zinc-100">
                    {consoleEntries.length === 0 ? (
                      <p className="text-zinc-400">{t('code.consoleEmpty')}</p>
                    ) : (
                      consoleEntries.map((entry) => (
                        <p key={entry.id} className="mb-1 whitespace-pre-wrap break-words">
                          <span className="text-zinc-500">[{entry.time}]</span>{' '}
                          <span
                            className={
                              entry.level === 'error'
                                ? 'text-rose-300'
                                : entry.level === 'warn'
                                  ? 'text-amber-300'
                                  : entry.level === 'info'
                                    ? 'text-sky-300'
                                    : 'text-emerald-300'
                            }
                          >
                            {entry.level.toUpperCase()}
                          </span>{' '}
                          {entry.message}
                        </p>
                      ))
                    )}
                  </div>
                </div>

              </div>
            ) : (
              <>
                <div className="relative flex min-h-0 flex-1 flex-col gap-3 p-3">
                  {mobileView === 'editor' && (
                    <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-border/80 bg-background/85">
                      <div className="border-b border-border/80 px-2 py-2">
                        <Tabs value={activeCodeTab} onValueChange={(value) => setActiveCodeTab(value as CodeLang)}>
                          <TabsList>
                            <TabsTrigger value="html">HTML</TabsTrigger>
                            <TabsTrigger value="css">CSS</TabsTrigger>
                            <TabsTrigger value="javascript">JavaScript</TabsTrigger>
                          </TabsList>
                        </Tabs>
                      </div>
                      <div className="min-h-0 flex-1">
                        <Editor
                          height="100%"
                          theme="vs-dark"
                          language={editorLanguage}
                          value={draft[activeCodeTab]}
                          onChange={updateCurrentCode}
                          options={{
                            minimap: { enabled: false },
                            fontSize: 14,
                            scrollBeyondLastLine: false,
                            wordWrap: 'on',
                            automaticLayout: true,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {mobileView === 'preview' && (
                    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border/80 bg-background/75">
                      <div className="border-b border-border/80 px-3 py-2 text-sm font-medium text-muted-foreground">
                        {t('code.preview')}
                      </div>
                      <iframe
                        ref={iframeRef}
                        key={previewKey}
                        title="Code Sandbox Preview"
                        sandbox="allow-scripts"
                        srcDoc={previewDoc}
                        className="h-full w-full flex-1 border-0 bg-white"
                      />
                    </div>
                  )}
                </div>

                {mobileView === 'console' && (
                  <div className="relative border-t border-border px-3 py-3 md:px-4">
                    <div className="mb-2 flex items-center justify-between">
                      <h2 className="text-sm font-medium text-muted-foreground">{t('code.console')}</h2>
                      <span className="text-xs text-muted-foreground">{consoleEntries.length} logs</span>
                    </div>
                    <div ref={consoleScrollRef} className="h-36 overflow-auto rounded-lg border border-border/80 bg-zinc-950/95 p-2 font-mono text-xs text-zinc-100">
                      {consoleEntries.length === 0 ? (
                        <p className="text-zinc-400">{t('code.consoleEmpty')}</p>
                      ) : (
                        consoleEntries.map((entry) => (
                          <p key={entry.id} className="mb-1 whitespace-pre-wrap break-words">
                            <span className="text-zinc-500">[{entry.time}]</span>{' '}
                            <span
                              className={
                                entry.level === 'error'
                                  ? 'text-rose-300'
                                  : entry.level === 'warn'
                                    ? 'text-amber-300'
                                    : entry.level === 'info'
                                      ? 'text-sky-300'
                                      : 'text-emerald-300'
                              }
                            >
                              {entry.level.toUpperCase()}
                            </span>{' '}
                            {entry.message}
                          </p>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </section>
        </main>
      </div>
    </ThemeProvider>
  );
}
