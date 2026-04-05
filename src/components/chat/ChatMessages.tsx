/**
 * ChatMessages.tsx
 *
 * 职责：
 *  - 渲染消息列表，负责消息气泡布局、头像、时间戳、编辑/复制操作按钮
 *  - 所有 Markdown 渲染逻辑已提取到 MarkdownRenderer 组件，本文件只调用它
 *  - 使用 @tanstack/react-virtual 实现虚拟列表，仅渲染可视区域内的消息，
 *    提升长对话的性能表现
 */
import React, { useMemo, useRef, useEffect, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import RobotProfileImage from '../../assets/robot.png';
import UserProfileImage from '../../assets/user.png';
import './ChatMessages.css';
import dayjs from 'dayjs';
import LoadingImage from '../../assets/loading-spinner.gif';
import { cn } from '@/lib/utils';
import { useChatStore } from '@/store/chatStore';
import { getHiddenMessagesForSession } from '@/utils/hiddenMessages';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { ChevronsUpDown, Pencil, Copy, Download } from 'lucide-react';

// Markdown 渲染能力已完整封装在 MarkdownRenderer 组件中
import { MarkdownRenderer } from './MarkdownRenderer';

// ─────────────────────────────────────────────
// 类型定义
// ─────────────────────────────────────────────

/** 单条消息的数据结构 */
interface ChatMessageType {
  id: string | number;
  message: {
    content: string;
    reasoning_content: string | '';
  };
  sender: string;
  time: number;
  imageUrl?: string; // 用户消息附带的图片（多模态输入）
}

interface ChatMessagesProps {
  onStartEdit?: (id: string | number, content: string) => void;
  userAvatar?: string; // 用户头像 URL
}

// ─────────────────────────────────────────────
// 工具函数
// ─────────────────────────────────────────────

/**
 * 判断字符串是否为常见图片 URL。
 * 能正确处理带有查询参数的 URL（例如 CDN 签名 URL）。
 */
function isImageUrl(urlString: string): boolean {
  if (!urlString || typeof urlString !== 'string') return false;

  try {
    new URL(urlString); // 校验 URL 合法性
  } catch {
    return false;
  }

  // (\\?.*)? 用于匹配并忽略查询参数
  return /\.(jpeg|jpg|png|gif|webp|avif|bmp|svg)(\?.*)?$/i.test(urlString);
}

// ─────────────────────────────────────────────
// 单条消息组件
// ─────────────────────────────────────────────

// 使用 React.memo 包裹单条消息组件，避免虚拟列表重建时不必要的重渲染
const ChatMessageItem = React.memo(function ChatMessageItem({
  message,
  sender,
  time,
  id,
  imageUrl,
  onStartEdit,
  userAvatar,
}: ChatMessageType & {
  onStartEdit?: (id: string | number, content: string) => void;
  userAvatar?: string;
}) {
  if (typeof message.content !== 'string') {
    return <div>error</div>;
  }

  const isImage = isImageUrl(message.content);

  // 格式化时间戳
  const Time = time
    ? dayjs(time).format('YYYY-MM-DD h:mm A')
    : dayjs().format('YYYY-MM-DD h:mm A');

  // 思考过程折叠状态：思考中自动展开，回答到来后自动收起
  const [isOpen, setIsOpen] = React.useState(false);
  React.useEffect(() => {
    if (message.reasoning_content && !message.content) {
      setIsOpen(true);
    } else if (message.content && message.reasoning_content) {
      setIsOpen(false);
    }
  }, [!!message.content, !!message.reasoning_content]);

  /**
   * 渲染消息主体内容：
   *  - Loading 状态      → 加载动画
   *  - 图片 URL          → <img> + 下载按钮
   *  - 普通 Markdown 文本 → <MarkdownRenderer>（核心简化点）
   */
  function renderContent() {
    if (message.content === 'Loading...') {
      return <img src={LoadingImage} className='loading-img' />;
    }

    if (isImage) {
      return (
        <div className="relative group/image">
          <img
            src={message.content}
            alt="picture"
            style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: '8px', objectFit: 'contain' }}
          />
          {/* 图片操作按钮：悬浮时显示于右下角 */}
          <div className="absolute bottom-2 right-2 opacity-0 group-hover/image:opacity-100 transition-opacity flex gap-1">
            <button
              onClick={() => window.open(message.content, '_self')}
              className="p-2 bg-black/50 text-white rounded-full hover:bg-black/70"
              title="Download"
            >
              <Download size={16} />
            </button>
          </div>
        </div>
      );
    }

    // 普通文本：交由 MarkdownRenderer 处理，本组件不再关心内部实现细节
    return <MarkdownRenderer content={message.content} />;
  }

  return (
    <div className={cn('chat-msg-area group')} data-message-id={id}>
      {/* 深度思考区域：使用 Collapsible 折叠/展开 */}
      {message.reasoning_content && (
        <div className='reasoning-area mb-4 w-full'>
          <Collapsible open={isOpen} onOpenChange={setIsOpen} className="items-center">
            <div>
              <CollapsibleTrigger className="flex items-center justify-star gap-4 px-4 ml-15 bg-zinc-100 hover:bg-zinc-200 rounded-md pt-2 pb-2 dark:bg-zinc-800 dark:hover:bg-zinc-700">
                <h4 className="text-sm font-semibold">
                  {isOpen ? 'Hide Thinking' : 'Show Thinking'}
                </h4>
                <ChevronsUpDown />
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent>
              <div className="mt-2 px-4 py-3 ml-15 border-l-2 border-zinc-200 dark:border-zinc-700 pl-4 Thinking-content">
                {/* 思考过程同样使用 MarkdownRenderer，额外附加弱化色调样式 */}
                <MarkdownRenderer
                  content={message.reasoning_content}
                  className="text-muted-foreground text-xs sm:text-sm"
                />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}

      {/* 消息气泡 */}
      <div className={sender === 'user' ? 'chat-user-msg relative' : 'chat-robot-msg relative'}>
        {sender === 'robot' && (
          <img src={RobotProfileImage} className="chat-message-profile" />
        )}

        <div className="chat-msg-text">
          {/* 用户上传的图片（多模态消息，显示在文字上方） */}
          {sender === 'user' && imageUrl && (
            <div className="mb-2">
              <img
                src={imageUrl}
                alt="Uploaded"
                className="max-w-full max-h-48 rounded-lg object-contain"
              />
            </div>
          )}

          {/* 消息主体内容 */}
          {renderContent()}

          {/* 底部操作区：时间戳 + 复制/编辑按钮 */}
          <div className="flex items-center justify-between gap-2 mt-1">
            <p className='msg-time'>{Time}</p>

            {/* 用户消息操作按钮：复制 + 编辑 */}
            {sender === 'user' && (
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                <button
                  onClick={() => navigator.clipboard.writeText(message.content)}
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

            {/* AI 消息操作按钮：复制（非图片、非 Loading 时显示） */}
            {sender === 'robot' && !isImage && message.content !== 'Loading...' && (
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                <button
                  onClick={() => navigator.clipboard.writeText(message.content)}
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
          <img src={userAvatar || UserProfileImage} className="chat-message-profile" />
        )}
      </div>
    </div>
  );
});

// ─────────────────────────────────────────────
// 消息列表容器组件（虚拟列表实现）
// ─────────────────────────────────────────────

export function ChatMessages(props: ChatMessagesProps) {
  const { userAvatar, onStartEdit } = props;

  const { sessions, currentChatId } = useChatStore();
  const currentSession = sessions.find(s => s.id === currentChatId);
  const currentMessages = currentSession ? currentSession.messages : [];

  const visibleMessages = useMemo(() => {
    if (!currentChatId) return currentMessages;
    const hiddenIds = getHiddenMessagesForSession(currentChatId);
    return currentMessages.filter(msg => !hiddenIds.includes(msg.id.toString()));
  }, [currentMessages, currentChatId]);

  // 滚动容器引用
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  // 记录上一次消息数量，用于判断是否需要自动滚动
  const prevCountRef = useRef<number>(0);

  // ── 虚拟列表核心配置 ──
  const virtualizer = useVirtualizer({
    count: visibleMessages.length,
    // 滚动容器 DOM 元素
    getScrollElement: () => scrollContainerRef.current,
    // 预估每条消息的高度（px），实际高度由 measureElement 自动测量
    estimateSize: () => 120,
    // 在可视区域上下额外渲染的消息数量，减少快速滚动时的白屏
    overscan: 5,
  });

  // ── 新消息到来时自动滚动到底部 ──
  useEffect(() => {
    const currentCount = visibleMessages.length;
    if (currentCount > prevCountRef.current && currentCount > 0) {
      // 使用 requestAnimationFrame 确保 DOM 已更新后再滚动
      requestAnimationFrame(() => {
        virtualizer.scrollToIndex(currentCount - 1, { align: 'end', behavior: 'smooth' });
      });
    }
    prevCountRef.current = currentCount;
  }, [visibleMessages.length, virtualizer]);

  // ── 切换会话时立即跳到底部（无动画） ──
  useEffect(() => {
    if (visibleMessages.length > 0) {
      requestAnimationFrame(() => {
        virtualizer.scrollToIndex(visibleMessages.length - 1, { align: 'end' });
      });
    }
  }, [currentChatId]);

  // 测量元素回调，用于精确获取每条消息的实际高度
  const measureElement = useCallback(
    (el: HTMLDivElement | null) => {
      if (el) {
        virtualizer.measureElement(el);
      }
    },
    [virtualizer]
  );

  return (
    <div className="chat-messages-wrapper">
      {/* 外层滚动容器 */}
      <div className="chat-message-container" ref={scrollContainerRef}>
        {/* 撑起虚拟列表总高度的占位容器 */}
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {/* 仅渲染当前可视区域内的消息项 */}
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const chatMessage = visibleMessages[virtualRow.index];
            return (
              <div
                key={chatMessage.id}
                ref={measureElement}
                data-index={virtualRow.index}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  // 通过 translateY 将消息定位到正确的垂直位置
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <ChatMessageItem
                  id={chatMessage.id}
                  message={chatMessage.message}
                  sender={chatMessage.sender}
                  time={chatMessage.time}
                  imageUrl={chatMessage.imageUrl}
                  onStartEdit={onStartEdit}
                  userAvatar={userAvatar}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default ChatMessages;
