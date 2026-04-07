export type PreviewDevice = 'desktop' | 'tablet' | 'mobile';

export type SandpackFileTree = Record<string, { code: string }>;

export type SandpackDependencyMap = Record<string, string>;

export type SandpackHistoryRecord = {
  id: string;
  prompt: string;
  title: string;
  description: string;
  assistantMessage?: string;
  changeSummary?: string;
  model: string;
  createdAt: number;
  parentCodeGenId?: string | null;
  entry: string;
  visibleFiles: string[];
  dependencies?: SandpackDependencyMap;
  externalResources?: string[];
  files: Array<{
    path: string;
    code: string;
  }>;
};

export type SandpackDialogueMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: number;
  recordId?: string;
  title?: string;
  description?: string;
  diagnosticsCount?: number;
};

export type SandpackResponsePayload = {
  requestId?: string;
  recordId?: string;
  parentCodeGenId?: string | null;
  title?: string;
  description?: string;
  assistantMessage?: string;
  changeSummary?: string;
  entry?: string;
  files?: Array<{ path: string; code: string }>;
  visibleFiles?: string[];
  dependencies?: SandpackDependencyMap;
  externalResources?: string[];
  diagnostics?: string[];
};
