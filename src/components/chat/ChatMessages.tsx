import { useAutoScroll } from '../../hooks/useAutoScroll';
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

// 注册语言到 PrismLight
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
import RobotProfileImage from '../../assets/robot.png';
import UserProfileImage from '../../assets/user.png';
import './ChatMessages.css';
import dayjs from 'dayjs';
import LoadingImage from '../../assets/loading-spinner.gif';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { ChevronsUpDown, Pencil, Copy, Download, Check } from 'lucide-react';

// =========================================================================
// 【自定义 Markdown 渲染组件库】
// 本部分用于拦截 react-markdown 默认生成的原始 HTML 节点，将其替换为
// 注入了 Tailwind 样式设计以及特定交互逻辑（如代码高亮、复制等）的高级组件。
// =========================================================================

const CodeBlock = ({ inline, className, children, ...props }: any) => {
  // copied 状态用于实现点击复制按钮后“切换为打钩图标”并在 2 秒后恢复的互动动画
  const [copied, setCopied] = React.useState(false);
  
  // 通过解析 className（形如 language-javascript）来捕捉当前代码块的编程语言
  const match = /language-(\w+)/.exec(className || '');
  
  // 复制当前代码的核心逻辑
  const handleCopy = () => {
    // 强制把 node 节点下的 children 转换为普通字符串，并删掉末尾残余的换行符
    navigator.clipboard.writeText(String(children).replace(/\n$/, ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000); // 2秒后重置状态，给用户视觉反馈
  };

  // 【情况 A】渲染带有语言指示的多行独立大代码块（例如 ts, bash, python 等）
  // 特点：具备黑背景、顶部状态栏（展示语言分类、提供复制按键）、并且注入了语法高亮引擎
  if (!inline && match) {
    return (
      <div className="relative group/code my-4 overflow-hidden rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-950">
        {/* 代码块顶部操作栏：背景色深沉，左侧指示语言名称，右侧提供隐形的 Hover 复制按键 */}
        <div className="flex items-center justify-between bg-zinc-900 px-4 py-1.5 border-b border-zinc-800 text-xs text-zinc-400 font-sans">
          <span>{match[1]}</span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 hover:text-white transition-colors"
            title="Copy code"
          >
            {/* 成功变为高亮绿色的 Check 图标，平时是 Copy 图标 */}
            {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
          </button>
        </div>
        {/* 核心高亮引擎：react-syntax-highlighter 替代了原生 <pre> 元素。
            指定 PreTag="div" 绕过了原生 <pre> 带来的全局 CSS 覆盖陷阱，
            同时内嵌精美且扁平的滚动条（scrollbar-thin）。 */}
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

  // 【情况 B】渲染没有明确语言标识、但依然跨行的独立大块级代码
  // 特点：基本与情况 A 相同，但没有语法高亮器处理，单纯作为普通等宽文本排列
  if (!inline) {
    return (
      <div className="relative group/code my-4 overflow-hidden rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-950">
        {/* 常规文本类型，指示栏依然保留并提供复制能力 */}
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
        {/* 不经过语法高亮器的原生等宽内容输出，保留强制滚动以防撑爆组件 */}
        <div className="p-4 overflow-x-auto text-[13px] text-zinc-50 font-mono leading-relaxed">
           <code className={className} {...props}>
             {children}
           </code>
        </div>
      </div>
    );
  }

  // 【情况 C】渲染行内小片代码片段（字里行间被 `包裹` 的高亮词组）
  // 特点：对比度强化，浅灰底色 + 粉红字体；如果是暗模式则深底色。强制打破长单词防溢出
  return (
    <code { ...props } className={cn("bg-zinc-100 dark:bg-zinc-800 text-pink-600 dark:text-pink-400 rounded px-1.5 py-0.5 text-sm font-mono break-words border border-zinc-200 dark:border-zinc-700", className)}>
      {children}
    </code>
  );
};

// 构造组件映射字典丢入 react-markdown 渲染层
const MarkdownComponents = {
  // 拦截全局代码块节点：用刚刚自定义好的 CodeBlock 强力替换它
  code(props: any) {
    const {children, className, node, ...rest} = props;
    const match = /language-(\w+)/.exec(className || '');
    // v9 版本移除了 inline 属性，所以我们通过有无回车来推断它是不是一个行内标签
    const isInline = !match && !String(children).includes('\n');
    return <CodeBlock inline={isInline} className={className} children={children} {...rest} />
  },
  
  // 拦截全局 Table 节点：完美防御巨型表格引发 UI 崩塌
  table(props: any) {
    // 外层包装一个带 overflow-x-auto 的独立滚动框，内部依然保持表格完整宽度
    return (
      <div className="overflow-x-auto my-4 w-full rounded border border-zinc-300 dark:border-zinc-700">
        <table className="min-w-full divide-y border-collapse divide-zinc-300 dark:divide-zinc-700 m-0" {...props} />
      </div>
    );
  },
  
  // 表头定制：加强描边，柔和背景填充，文字强加粗并锁定不可换行 (whitespace-nowrap)
  th(props: any) {
    return <th className="bg-zinc-100 dark:bg-zinc-800 px-4 py-2 text-left text-sm font-semibold border-b border-zinc-300 dark:border-zinc-700" {...props} />;
  },

  // 单元格定制：提供合理的上下左右内衬与柔和截断线
  td(props: any) {
    return <td className="px-4 py-2 text-sm border-b border-zinc-300 dark:border-zinc-700 whitespace-pre-wrap" {...props} />;
  }
};
// === 自定义组件结束 ===

// 定义单条消息的类型结构
interface ChatMessageType {
  id: string | number;
  message: {
    content: string,
    reasoning_content: string | ''
  };
  sender: string;
  time: number;
  imageUrl?: string; // 用户消息附带的图片
}

interface ChatMessagesProps {
  chatMessages: ChatMessageType[];

  onStartEdit?: (id: string | number, content: string) => void;
  userAvatar?: string; // 用户头像 URL
}



/**
 * 检查字符串是否是一个常见的图片 URL
 * 该函数能正确处理带有查询参数的 URL
 */
function isImageUrl(urlString: string) {
  if (!urlString || typeof urlString !== 'string') {
    return false;
  }

  // 正则表达式 /\.(jpeg|jpg|png|gif|webp|avif|bmp|svg)(\?.*)?$/i 
  // 其中的 (\?.*)? 就是用来匹配并忽略查询参数的。
  const imageRegex = /\.(jpeg|jpg|png|gif|webp|avif|bmp|svg)(\?.*)?$/i;

  try {
    // 检查它是否是一个有效的 URL
    new URL(urlString);
  } catch (e) {
    return false;
  }

  return imageRegex.test(urlString);
}



// 消息组件
function ChatMessageItem({
  message,
  sender,
  time,
  id,
  imageUrl,
  onStartEdit,
  userAvatar
}: ChatMessageType & {
  onStartEdit?: (id: string | number, content: string) => void;
  userAvatar?: string;
}) {


  const markdownStyles = cn(
    "prose prose-sm max-w-none break-words whitespace-pre-wrap",
    "text-black dark:text-white dark:prose-invert"
  );

  if (typeof message.content !== 'string') {
    return <div>error</div>;
  }
  const isImage = isImageUrl(message.content);

  let Time;
  if (!time) { Time = dayjs().format('YYYY-MM-DD h:mm A'); }
  Time = dayjs(time).format('YYYY-MM-DD h:mm A');

  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect(() => {
    if (message.reasoning_content && !message.content) {
      setIsOpen(true);
    } else if (message.content && message.reasoning_content) {
      setIsOpen(false);
    }
  }, [!!message.content, !!message.reasoning_content]);

  // 渲染带高亮的文本内容
  const renderContentWithHighlight = () => {
    if (message.content === 'Loading...') {
      return <img src={LoadingImage} className='loading-img' />;
    }

    if (isImage) {
      // 下载图片函数
      const downloadImage = async () => {
        try {
          window.open(message.content, '_self');
        } catch (error) {
          console.error('Download failed:', error);
          window.open(message.content, '_blank');
        }
      };

      return (
        <div className="relative group/image">
          <img src={message.content} alt="picture"
            style={{
              maxWidth: '100%',
              maxHeight: '400px',
              borderRadius: '8px',
              objectFit: 'contain'
            }}
          />
          {/* 图片操作按钮 - 右下角 */}
          <div className="absolute bottom-2 right-2 opacity-0 group-hover/image:opacity-100 transition-opacity flex gap-1">
            <button
              onClick={downloadImage}
              className="p-2 bg-black/50 text-white rounded-full hover:bg-black/70"
              title="Download"
            >
              <Download size={16} />
            </button>
          </div>
        </div>
      );
    }



    return (
      <div className={markdownStyles}>
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
          {message.content}
        </ReactMarkdown>
      </div>
    );
  };

  return (
    <div className={cn('chat-msg-area group')} data-message-id={id}>
      {message.reasoning_content && (
        <div className='reasoning-area mb-4 w-full'>
          <Collapsible
            open={isOpen}
            onOpenChange={setIsOpen}
            className="items-center">
            <div>
              <CollapsibleTrigger className="flex items-center justify-star gap-4 px-4 ml-15 bg-zinc-100 hover:bg-zinc-200 rounded-md pt-2 pb-2 dark:bg-zinc-800 dark:hover:bg-zinc-700">
                <h4 className="text-sm font-semibold">
                  {isOpen ? 'Hide Thinking' : 'Show Thinking'}
                </h4>
                <ChevronsUpDown />
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent>
              <div className="mt-2 px-4 py-3 ml-15 border-l-2 border-zinc-200 dark:border-zinc-700 pl-4 Thinking-content ">
                <div className={cn(markdownStyles, "text-muted-foreground text-xs sm:text-sm")}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
                    {message.reasoning_content}
                  </ReactMarkdown>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}
      <div className={sender === 'user' ? 'chat-user-msg relative' : 'chat-robot-msg relative'}>
        {sender === 'robot' && (
          <img src={RobotProfileImage}
            className="chat-message-profile"
          />
        )}
        <div className="chat-msg-text">
          {/* 显示用户上传的图片（多模态消息） */}
          {sender === 'user' && imageUrl && (
            <div className="mb-2">
              <img
                src={imageUrl}
                alt="Uploaded"
                className="max-w-full max-h-48 rounded-lg object-contain"
              />
            </div>
          )}
          {renderContentWithHighlight()}
          <div className="flex items-center justify-between gap-2 mt-1">
            <p className='msg-time'>{Time}</p>
            {sender === 'user' && (
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(message.content);
                  }}
                  className="p-1 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
                  title="Copy"
                >
                  <Copy size={12} />
                </button>
                <button
                  onClick={() => onStartEdit && onStartEdit(id, message.content)}
                  className="p-1 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
                  title="Edit"
                >
                  <Pencil size={12} />
                </button>
              </div>
            )}
            {/* AI 消息的复制按钮 */}
            {sender === 'robot' && !isImage && message.content !== 'Loading...' && (
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(message.content);
                  }}
                  className="p-1 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
                  title="Copy"
                >
                  <Copy size={12} />
                </button>
              </div>
            )}
          </div>
        </div>
        {sender === 'user' && (
          <img src={userAvatar || UserProfileImage}
            className="chat-message-profile"
          />
        )}
      </div>
    </div>
  );
}

export function ChatMessages(props: ChatMessagesProps) {
  const { chatMessages, userAvatar } = props;

  // 使用自定义 Hook 实现消息列表自动滚动到底部
  const chatMsgRef = useAutoScroll([chatMessages]);

  return (
    <div className="chat-messages-wrapper">
      {/* 消息列表 */}
      <div className="chat-message-container" ref={chatMsgRef}>
        {chatMessages.map((chatMessage) => (
          <ChatMessageItem
            key={chatMessage.id}
            id={chatMessage.id}
            message={chatMessage.message}
            sender={chatMessage.sender}
            time={chatMessage.time}
            imageUrl={chatMessage.imageUrl}
            onStartEdit={props.onStartEdit}
            userAvatar={userAvatar}
          />
        ))}
      </div>
    </div>
  );
}

export default ChatMessages;
