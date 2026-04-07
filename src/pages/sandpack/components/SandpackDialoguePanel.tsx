import type { RefObject } from 'react';
import { Bot, Loader2, Sparkles, UserRound } from 'lucide-react';

import { MarkdownRenderer } from '@/components/chat/MarkdownRenderer';
import { Button } from '@/components/ui/button';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';

import type { SandpackDialogueMessage } from '../types';

type ModelOption = {
  value: string;
  label: string;
};

type SandpackDialoguePanelProps = {
  currentRecordId: string | null;
  model: string;
  modelOptions: readonly ModelOption[];
  onModelChange: (value: string) => void;
  generateMeta: string | null;
  generateError: string | null;
  threadLoading: boolean;
  dialogueMessages: SandpackDialogueMessage[];
  dialogueScrollRef: RefObject<HTMLDivElement | null>;
  isGenerating: boolean;
  examplePrompts: string[];
  dialogueInput: string;
  onDialogueInputChange: (value: string) => void;
  onExamplePromptClick: (prompt: string) => void;
  onSubmit: () => void;
};

export function SandpackDialoguePanel(props: SandpackDialoguePanelProps) {
  const {
    currentRecordId,
    model,
    modelOptions,
    onModelChange,
    generateMeta,
    generateError,
    threadLoading,
    dialogueMessages,
    dialogueScrollRef,
    isGenerating,
    examplePrompts,
    dialogueInput,
    onDialogueInputChange,
    onExamplePromptClick,
    onSubmit,
  } = props;

  return (
    <aside className="flex w-[360px] shrink-0 flex-col border-r border-border bg-background/80">
      <div className="shrink-0 space-y-3 border-b border-border p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">需求对话</p>
          <span className="rounded-full border border-border bg-card px-2 py-0.5 text-[11px] text-muted-foreground">
            {currentRecordId ? 'Patch 模式' : '首轮生成'}
          </span>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">模型选择</p>
          <NativeSelect value={model} onChange={(event) => onModelChange(event.target.value)} className="w-full bg-card">
            {modelOptions.map((option) => (
              <NativeSelectOption key={option.value} value={option.value}>
                {option.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>

        {generateMeta && <p className="text-xs text-muted-foreground">{generateMeta}</p>}
        {generateError && <p className="text-xs text-destructive">{generateError}</p>}
      </div>

      <div ref={dialogueScrollRef} className="min-h-0 flex-1 space-y-3 overflow-auto p-4">
        {threadLoading && (
          <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            对话链恢复中...
          </div>
        )}

        {!threadLoading && dialogueMessages.length === 0 && (
          <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3 text-xs text-muted-foreground">
            先发送一条需求开始生成，后续输入将自动作为 patch 指令。
          </div>
        )}

        {dialogueMessages.map((message) => (
          <div key={message.id} className="space-y-2">
            <div className={`flex items-start gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {message.role !== 'user' && (
                <div className="mt-0.5 rounded-md border border-border bg-card p-1 text-muted-foreground">
                  <Bot className="size-3.5" />
                </div>
              )}

              <div className={`max-w-[90%] rounded-xl border px-3 py-2 text-xs leading-relaxed ${message.role === 'user'
                ? 'border-primary/40 bg-primary/10 text-foreground'
                : message.role === 'assistant'
                  ? 'border-border bg-card text-foreground'
                  : 'border-destructive/30 bg-destructive/10 text-destructive'
                }`}>
                <MarkdownRenderer content={message.content} />
                {message.role === 'assistant' && (message.title || message.description || message.diagnosticsCount) && (
                  <div className="mt-2 space-y-1 border-t border-border/70 pt-2 text-[11px] text-muted-foreground">
                    {message.title && <p>标题：{message.title}</p>}
                    {message.description && <p>说明：{message.description}</p>}
                    {Number.isFinite(message.diagnosticsCount) && (message.diagnosticsCount ?? 0) > 0 && (
                      <p>诊断：{message.diagnosticsCount} 条</p>
                    )}
                  </div>
                )}
              </div>

              {message.role === 'user' && (
                <div className="mt-0.5 rounded-md border border-border bg-card p-1 text-muted-foreground">
                  <UserRound className="size-3.5" />
                </div>
              )}
            </div>
          </div>
        ))}

        {isGenerating && (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
            {currentRecordId ? '应用 patch 中...' : '代码生成中...'}
          </div>
        )}
      </div>

      <div className="shrink-0 space-y-3 border-t border-border p-4">
        <div className="grid grid-cols-1 gap-2">
          {examplePrompts.map((item) => (
            <button
              key={item}
              type="button"
              className="rounded-lg border border-border bg-card/50 px-3 py-2 text-left text-[11px] text-foreground transition-all hover:border-primary/50 hover:bg-card"
              onClick={() => onExamplePromptClick(item)}
            >
              {item}
            </button>
          ))}
        </div>

        <Textarea
          value={dialogueInput}
          onChange={(event) => onDialogueInputChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              onSubmit();
            }
          }}
          placeholder={currentRecordId
            ? '继续描述你要调整的点，例如：把主按钮改成橙色并补一个价格卡。'
            : '描述你希望生成的页面结构、风格和交互...'}
          className="min-h-24 resize-none bg-card w-full"
        />

        <Button
          className="w-full gap-2"
          disabled={!dialogueInput.trim() || isGenerating}
          onClick={onSubmit}
        >
          <Sparkles className="size-4" />
          {isGenerating ? '处理中...' : (currentRecordId ? '发送 Patch' : '生成首版')}
        </Button>
      </div>
    </aside>
  );
}
