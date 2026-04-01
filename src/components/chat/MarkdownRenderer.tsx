/**
 * MarkdownRenderer.tsx
 *
 * 独立的 Markdown 渲染组件。
 *
 * 职责：
 *  - 集中管理所有 react-markdown 相关依赖的导入与配置
 *  - 按需注册 PrismLight 语言（大幅减小打包体积）
 *  - 提供增强的代码块组件（带复制按钮、语法高亮）
 *  - 提供增强的表格组件（可横向滚动，防止布局溢出）
 *  - 暴露简洁的 <MarkdownRenderer content={...} /> 接口
 *
 * 如需日后扩展（如支持 LaTeX 数学公式），只需在本文件引入对应插件，
 * ChatMessages.tsx 及其他调用方无需任何改动。
 */

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// 使用 PrismLight 轻量版本代替全量 Prism，按需注册语言以大幅减小打包体积
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

// 按需注册常用编程语言（全量 Prism 包含约 300 种语言，约 700KB）
import javascript from 'react-syntax-highlighter/dist/esm/languages/prism/javascript';
import typescript from 'react-syntax-highlighter/dist/esm/languages/prism/typescript';
import python from 'react-syntax-highlighter/dist/esm/languages/prism/python';
import java from 'react-syntax-highlighter/dist/esm/languages/prism/java';
import css from 'react-syntax-highlighter/dist/esm/languages/prism/css';
import markup from 'react-syntax-highlighter/dist/esm/languages/prism/markup';
import bash from 'react-syntax-highlighter/dist/esm/languages/prism/bash';
import json from 'react-syntax-highlighter/dist/esm/languages/prism/json';
import sql from 'react-syntax-highlighter/dist/esm/languages/prism/sql';
import go from 'react-syntax-highlighter/dist/esm/languages/prism/go';
import cpp from 'react-syntax-highlighter/dist/esm/languages/prism/cpp';
import csharp from 'react-syntax-highlighter/dist/esm/languages/prism/csharp';
import rust from 'react-syntax-highlighter/dist/esm/languages/prism/rust';
import yaml from 'react-syntax-highlighter/dist/esm/languages/prism/yaml';
import markdown from 'react-syntax-highlighter/dist/esm/languages/prism/markdown';
import diff from 'react-syntax-highlighter/dist/esm/languages/prism/diff';

import { Check, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────────────────────
// 注册语言到 PrismLight（模块级，仅执行一次）
// ─────────────────────────────────────────────────────────────────────────────
SyntaxHighlighter.registerLanguage('javascript', javascript);
SyntaxHighlighter.registerLanguage('js', javascript);
SyntaxHighlighter.registerLanguage('typescript', typescript);
SyntaxHighlighter.registerLanguage('ts', typescript);
SyntaxHighlighter.registerLanguage('python', python);
SyntaxHighlighter.registerLanguage('java', java);
SyntaxHighlighter.registerLanguage('css', css);
SyntaxHighlighter.registerLanguage('html', markup);
SyntaxHighlighter.registerLanguage('xml', markup);
SyntaxHighlighter.registerLanguage('bash', bash);
SyntaxHighlighter.registerLanguage('shell', bash);
SyntaxHighlighter.registerLanguage('json', json);
SyntaxHighlighter.registerLanguage('sql', sql);
SyntaxHighlighter.registerLanguage('go', go);
SyntaxHighlighter.registerLanguage('cpp', cpp);
SyntaxHighlighter.registerLanguage('c', cpp);
SyntaxHighlighter.registerLanguage('csharp', csharp);
SyntaxHighlighter.registerLanguage('rust', rust);
SyntaxHighlighter.registerLanguage('yaml', yaml);
SyntaxHighlighter.registerLanguage('yml', yaml);
SyntaxHighlighter.registerLanguage('markdown', markdown);
SyntaxHighlighter.registerLanguage('md', markdown);
SyntaxHighlighter.registerLanguage('diff', diff);

// ─────────────────────────────────────────────────────────────────────────────
// 【CodeBlock】增强版代码块组件
//  - 情况 A：带语言标识的大块代码 → 语法高亮 + 顶部操作栏（语言名 + 复制按钮）
//  - 情况 B：无语言标识的大块代码 → 等宽文本 + 顶部操作栏（复制按钮）
//  - 情况 C：行内代码片段 → 粉红字体 + 浅灰底色，强制打断长单词防溢出
// ─────────────────────────────────────────────────────────────────────────────
const CodeBlock = ({ inline, className, children, ...props }: any) => {
  // copied 状态：点击后 2 秒内显示绿色 ✓，再自动还原
  const [copied, setCopied] = React.useState(false);

  // 从 className（形如 language-javascript）中解析语言名
  const match = /language-(\w+)/.exec(className || '');

  /** 复制当前代码到剪贴板 */
  const handleCopy = () => {
    // 删掉末尾残余的换行符，避免复制结果多一个空行
    navigator.clipboard.writeText(String(children).replace(/\n$/, ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 【情况 A】带语言标识的独立大代码块：语法高亮 + 顶部操作栏
  if (!inline && match) {
    return (
      <div className="relative group/code my-4 overflow-hidden rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-950">
        {/* 顶部操作栏：左侧语言名，右侧复制按钮 */}
        <div className="flex items-center justify-between bg-zinc-900 px-4 py-1.5 border-b border-zinc-800 text-xs text-zinc-400 font-sans">
          <span>{match[1]}</span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 hover:text-white transition-colors"
            title="Copy code"
          >
            {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
          </button>
        </div>
        {/* 语法高亮引擎：PreTag="div" 避免原生 <pre> 的全局 CSS 覆盖陷阱 */}
        <SyntaxHighlighter
          {...props}
          style={vscDarkPlus}
          language={match[1]}
          PreTag="div"
          customStyle={{ margin: 0, padding: '1rem', background: 'transparent' }}
          className="scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent text-[13px] leading-relaxed overflow-x-auto"
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      </div>
    );
  }

  // 【情况 B】无语言标识的独立大代码块：等宽文本 + 复制按钮
  if (!inline) {
    return (
      <div className="relative group/code my-4 overflow-hidden rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-950">
        <div className="flex items-center justify-between bg-zinc-900 px-4 py-1.5 border-b border-zinc-800 text-xs text-zinc-400 font-sans">
          <span>text</span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 hover:text-white transition-colors"
            title="Copy code"
          >
            {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
          </button>
        </div>
        {/* 纯等宽文本输出，保留横向滚动以防撑爆布局 */}
        <div className="p-4 overflow-x-auto text-[13px] text-zinc-50 font-mono leading-relaxed">
          <code className={className} {...props}>
            {children}
          </code>
        </div>
      </div>
    );
  }

  // 【情况 C】行内代码片段：粉色字 + 浅灰底，强制截断超长单词
  return (
    <code
      {...props}
      className={cn(
        'bg-zinc-100 dark:bg-zinc-800 text-pink-600 dark:text-pink-400 rounded px-1.5 py-0.5 text-sm font-mono break-words border border-zinc-200 dark:border-zinc-700',
        className
      )}
    >
      {children}
    </code>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 【MarkdownComponents】react-markdown 节点拦截映射表
//  通过此字典，将原始 HTML 节点替换为注入了样式与交互的自定义组件。
// ─────────────────────────────────────────────────────────────────────────────
const MarkdownComponents = {
  // 拦截代码块节点：统一交由 CodeBlock 处理
  code(props: any) {
    const { children, className, node, ...rest } = props;
    const match = /language-(\w+)/.exec(className || '');
    // react-markdown v9 移除了 inline 属性，通过有无回车来推断是否为行内代码
    const isInline = !match && !String(children).includes('\n');
    return <CodeBlock inline={isInline} className={className} children={children} {...rest} />;
  },

  // 拦截 Table：外层套可横向滚动容器，防止巨型表格撑爆布局
  table(props: any) {
    return (
      <div className="overflow-x-auto my-4 w-full rounded border border-zinc-300 dark:border-zinc-700">
        <table className="min-w-full divide-y border-collapse divide-zinc-300 dark:divide-zinc-700 m-0" {...props} />
      </div>
    );
  },

  // 表头：加强描边 + 柔和背景 + 加粗文字
  th(props: any) {
    return (
      <th
        className="bg-zinc-100 dark:bg-zinc-800 px-4 py-2 text-left text-sm font-semibold border-b border-zinc-300 dark:border-zinc-700"
        {...props}
      />
    );
  },

  // 单元格：合理内衬 + 柔和截断线 + 允许换行（防止单元格过窄被截断）
  td(props: any) {
    return (
      <td
        className="px-4 py-2 text-sm border-b border-zinc-300 dark:border-zinc-700 whitespace-pre-wrap"
        {...props}
      />
    );
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 【MarkdownRenderer】对外暴露的核心渲染组件
// ─────────────────────────────────────────────────────────────────────────────

interface MarkdownRendererProps {
  /** 需要渲染的 Markdown 文本内容 */
  content: string;
  /** 追加到 prose 容器的额外 CSS class（可选） */
  className?: string;
}

/**
 * 渲染 Markdown 内容，内置 GFM（表格、删除线等）支持和代码语法高亮。
 *
 * 用法：
 * ```tsx
 * <MarkdownRenderer content={message.content} />
 * <MarkdownRenderer content={message.reasoning_content} className="text-muted-foreground text-xs" />
 * ```
 */
export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  const baseStyle = cn(
    'prose prose-sm max-w-none break-words whitespace-pre-wrap',
    'text-black dark:text-white dark:prose-invert',
    className
  );

  return (
    <div className={baseStyle}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

export default MarkdownRenderer;
