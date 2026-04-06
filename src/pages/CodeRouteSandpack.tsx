import { Navigate } from 'react-router-dom';
import { useMemo, useState } from 'react';
import {
  SandpackCodeEditor,
  SandpackConsole,
  SandpackFileExplorer,
  SandpackLayout,
  SandpackPreview,
  SandpackProvider,
} from '@codesandbox/sandpack-react';
import { History, LayoutTemplate, Sparkles } from 'lucide-react';

import { autocompletion } from "@codemirror/autocomplete";

import { ThemeProvider } from '@/components/theme-provider';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';

type PreviewDevice = 'desktop' | 'tablet' | 'mobile';

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

const SANDBOX_FILES = {
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
  const [model, setModel] = useState<string>('doubao-seed-1-6-lite-251015');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [device, setDevice] = useState<PreviewDevice>('desktop');
  const [showConsole, setShowConsole] = useState(false);
  const [editorTab, setEditorTab] = useState<'editor' | 'preview'>('editor');

  const previewFrameStyle = useMemo(() => ({ maxWidth: PREVIEW_MAX_WIDTH[device] }), [device]);

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
                    <SheetDescription>联调接入后，这里将展示生成记录和回放入口。</SheetDescription>
                  </SheetHeader>
                  <div className="px-4 pb-4">
                    <div className="rounded-lg border border-dashed border-border bg-muted/30 p-5 text-sm text-muted-foreground">
                      暂无历史数据
                    </div>
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
                      className="min-h-[100px] resize-none bg-card"
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

                  <Button className="w-full gap-2" disabled>
                    <Sparkles className="size-4" />
                    生成（联调未接入）
                  </Button>
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
                  style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
                  template="react-ts"
                  files={SANDBOX_FILES}
                  options={{
                    activeFile: '/App.tsx',
                    visibleFiles: ['/App.tsx', '/styles.css'],
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

                      <Tabs value={device} onValueChange={(value) => setDevice(value as PreviewDevice)}>
                        <TabsList className="h-8">
                          <TabsTrigger value="desktop" className="text-xs">Desktop</TabsTrigger>
                          <TabsTrigger value="tablet" className="text-xs">Tablet</TabsTrigger>
                          <TabsTrigger value="mobile" className="text-xs">Mobile</TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </div>
                  </div>

                  {/* Sandpack 编辑器 */}
                  <div className="flex-1 overflow-hidden flex flex-col">
                    {editorTab === 'editor' ? (
                      <div className='flex-1'>
                        <SandpackLayout style={{ height: '100%' }}>
                          <SandpackFileExplorer style={{ height: '100%' }} />
                          <SandpackCodeEditor
                            style={{ height: '100%' }}
                            showTabs
                            closableTabs
                            showLineNumbers
                            showInlineErrors
                            wrapContent

                            extensions={[autocompletion()]}
                          />
                        </SandpackLayout>
                      </div>
                    ) : (
                      <div className='flex-1 flex items-center justify-center bg-muted/20'>
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
