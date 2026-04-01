/**
 * ChatMessages.tsx
 *
 * 职责（重构后）：
 *  - 渲染消息列表，负责消息气泡布局、头像、时间戳、编辑/复制操作按钮
 *  - 所有 Markdown 渲染逻辑已提取到 MarkdownRenderer 组件，本文件只调用它
 *
 * 重构前文件长达 447 行，顶部硬编码了 50+ 行的语言注册和两个大型组件。
 * 重构后本文件约 200 行，新增 Markdown 能力（如 LaTeX）只需修改 MarkdownRenderer.tsx。
 */
import { useAutoScroll } from '../../hooks/useAutoScroll';
import React, { useMemo } from 'react';
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

function ChatMessageItem({
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
}

// ─────────────────────────────────────────────
// 消息列表容器组件
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

  // 使用自定义 Hook 实现消息列表自动滚动到底部
  const chatMsgRef = useAutoScroll([visibleMessages]);

  return (
    <div className="chat-messages-wrapper">
      <div className="chat-message-container" ref={chatMsgRef}>
        {visibleMessages.map((chatMessage) => (
          <ChatMessageItem
            key={chatMessage.id}
            id={chatMessage.id}
            message={chatMessage.message}
            sender={chatMessage.sender}
            time={chatMessage.time}
            imageUrl={chatMessage.imageUrl}
            onStartEdit={onStartEdit}
            userAvatar={userAvatar}
          />
        ))}
      </div>
    </div>
  );
}

export default ChatMessages;
