import {
  SandpackCodeEditor,
  SandpackConsole,
  SandpackFileExplorer,
  SandpackLayout,
  SandpackPreview,
  SandpackProvider,
} from '@codesandbox/sandpack-react';
import { LayoutTemplate } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

import type { PreviewDevice, SandpackDependencyMap, SandpackFileTree } from '../types';

type SandpackWorkspaceProps = {
  sandpackProviderKey: string;
  sandpackFiles: SandpackFileTree;
  sandpackCustomSetup: { dependencies: SandpackDependencyMap };
  activeFile: string;
  visibleFiles: string[];
  fallbackVisibleFiles: string[];
  externalResources: string[];
  editorTab: 'editor' | 'preview';
  onEditorTabChange: (value: 'editor' | 'preview') => void;
  showConsole: boolean;
  onToggleConsole: () => void;
  device: PreviewDevice;
  onDeviceChange: (value: PreviewDevice) => void;
  previewFrameStyle: { maxWidth: string };
};

export function SandpackWorkspace(props: SandpackWorkspaceProps) {
  const {
    sandpackProviderKey,
    sandpackFiles,
    sandpackCustomSetup,
    activeFile,
    visibleFiles,
    fallbackVisibleFiles,
    externalResources,
    editorTab,
    onEditorTabChange,
    showConsole,
    onToggleConsole,
    device,
    onDeviceChange,
    previewFrameStyle,
  } = props;

  return (
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
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <LayoutTemplate className="size-4" />
              <span>工作区</span>
            </div>

            <Tabs value={editorTab} onValueChange={(value) => onEditorTabChange(value as 'editor' | 'preview')}>
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
              onClick={onToggleConsole}
              className="whitespace-nowrap"
            >
              {showConsole ? '隐藏控制台' : '显示控制台'}
            </Button>

            {editorTab !== 'editor' && (
              <Tabs value={device} onValueChange={(value) => onDeviceChange(value as PreviewDevice)}>
                <TabsList className="h-8">
                  <TabsTrigger value="desktop" className="text-xs">Desktop</TabsTrigger>
                  <TabsTrigger value="tablet" className="text-xs">Tablet</TabsTrigger>
                  <TabsTrigger value="mobile" className="text-xs">Mobile</TabsTrigger>
                </TabsList>
              </Tabs>
            )}
          </div>
        </div>

        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
          {editorTab === 'editor' ? (
            <div className="min-h-0 flex-1 overflow-hidden">
              <SandpackLayout style={{ height: '100%', minHeight: 0 }}>
                <SandpackFileExplorer style={{ height: '100%', maxHeight: '100%' }} />
                <SandpackCodeEditor
                  style={{ height: '100%', maxHeight: '100%', minHeight: 0 }}
                  showTabs
                  closableTabs
                  showLineNumbers
                  showInlineErrors
                  wrapContent
                />
              </SandpackLayout>
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-hidden flex justify-center items-center bg-muted/20">
              <div className="h-full transition-all duration-300" style={{ width: '100%', ...previewFrameStyle }}>
                <SandpackPreview
                  style={{ height: '100%' }}
                  showNavigator
                  showRefreshButton
                  showOpenInCodeSandbox={false}
                />
              </div>
            </div>
          )}

          {showConsole && (
            <div className="h-40 shrink-0 border-t border-border bg-zinc-950/95">
              <SandpackConsole className="h-full" resetOnPreviewRestart />
            </div>
          )}
        </div>
      </SandpackProvider>
    </div>
  );
}
