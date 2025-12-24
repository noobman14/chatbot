import { useAutoScroll } from './useAutoScroll';
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import RobotProfileImage from '../assets/robot.png';
import UserProfileImage from '../assets/user.png';
import './ChatMessages.css';
import dayjs from 'dayjs';
import LoadingImage from '../assets/loading-spinner.gif';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { ChevronsUpDown, Search, X, ChevronUp, ChevronDown, Pencil, Trash2, CheckSquare, Square, ListChecks } from 'lucide-react';

// 定义单条消息的类型结构
interface ChatMessageType {
  id: string | number;
  message: {
    content: string,
    reasoning_content: string | ''
  };
  sender: string;
  time: number;
}

interface ChatMessagesProps {
  chatMessages: ChatMessageType[];
  onStartEdit?: (id: string | number, content: string) => void;
  onDeleteMessage?: (id: string | number) => void;
  onBatchDelete?: (ids: (string | number)[]) => void;
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



// 带搜索高亮的消息组件
function ChatMessageWithHighlight({
  message,
  sender,
  time,
  id,
  searchKeyword,
  isMatch,
  onStartEdit,
  onDelete,
  isMultiSelectMode,
  isSelected,
  onToggleSelect
}: ChatMessageType & {
  searchKeyword: string;
  isMatch: boolean;
  onStartEdit?: (id: string | number, content: string) => void;
  onDelete?: (id: string | number) => void;
  isMultiSelectMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string | number) => void;
}) {

  const markdownStyles = cn(
    "prose prose-sm max-w-none break-words whitespace-pre-wrap",
    "text-black dark:text-white",
    "[\&_pre]:bg-zinc-900 [\&_pre]:text-blue-700 [\&_pre]:p-4 [\&_pre]:rounded-xl",
    "[\&_pre]:overflow-x-auto [\&_pre]:border [\&_pre]:border-zinc-700",
    "[\&_p_code]:bg-blue-100[\&_p_code]:text-blue-700[\&_p_code]:dark:bg-blue-900 [\&_p_code]:dark:text-blue-200",
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
      return (
        <div>
          <img src={message.content} alt="picture"
            style={{
              maxWidth: '100%',
              maxHeight: '400px',
              borderRadius: '8px',
              objectFit: 'contain'
            }}
          />
        </div>
      );
    }

    // 如果有搜索关键词且匹配，使用简单的高亮显示
    if (searchKeyword && isMatch) {
      const highlightedContent = message.content.replace(
        new RegExp(`(${searchKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'),
        '**==$1==**'
      );
      return (
        <div className={markdownStyles}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {highlightedContent}
          </ReactMarkdown>
        </div>
      );
    }

    return (
      <div className={markdownStyles}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {message.content}
        </ReactMarkdown>
      </div>
    );
  };

  return (
    <div className={cn('chat-msg-area group', isMatch && searchKeyword && 'search-match')} data-message-id={id}>
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
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {message.reasoning_content}
                  </ReactMarkdown>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}
      <div className={sender === 'user' ? 'chat-user-msg relative' : 'chat-robot-msg relative'}>
        {/* 多选复选框 */}
        {isMultiSelectMode && (
          <button
            onClick={() => onToggleSelect && onToggleSelect(id)}
            className="flex-shrink-0 p-1 mr-2"
          >
            {isSelected ? (
              <CheckSquare size={18} className="text-blue-500" />
            ) : (
              <Square size={18} className="text-zinc-400" />
            )}
          </button>
        )}
        {sender === 'robot' && (
          <img src={RobotProfileImage}
            className="chat-message-profile"
          />
        )}
        <div className="chat-msg-text">
          {renderContentWithHighlight()}
          <div className="flex items-center justify-between gap-2 mt-1">
            <p className='msg-time'>{Time}</p>
            {sender === 'user' && (
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                <button
                  onClick={() => onStartEdit && onStartEdit(id, message.content)}
                  className="p-1 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
                  title="Edit"
                >
                  <Pencil size={12} />
                </button>
                <button
                  onClick={() => onDelete && onDelete(id)}
                  className="p-1 text-zinc-500 hover:text-red-600"
                  title="Withdraw"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            )}
          </div>
        </div>
        {sender === 'user' && (
          <img src={UserProfileImage}
            className="chat-message-profile"
          />
        )}
      </div>
    </div>
  );
}

export function ChatMessages(props: ChatMessagesProps) {
  const { chatMessages } = props;
  // 搜索相关状态
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  // 多选模式状态
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());

  // 使用自定义 Hook 实现消息列表自动滚动到底部
  const chatMsgRef = useAutoScroll([chatMessages]);

  // 过滤匹配的消息
  const matchedMessages = useMemo(() => {
    if (!searchKeyword.trim()) return [];
    return chatMessages.filter(msg =>
      msg.message.content.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      (msg.message.reasoning_content && msg.message.reasoning_content.toLowerCase().includes(searchKeyword.toLowerCase()))
    );
  }, [chatMessages, searchKeyword]);

  // 跳转到指定匹配项
  const scrollToMatch = useCallback((index: number) => {
    if (matchedMessages.length === 0 || index < 0 || index >= matchedMessages.length) return;
    const targetMessage = matchedMessages[index];
    if (!targetMessage) return;

    // 使用 setTimeout 确保 DOM 更新后再滚动
    setTimeout(() => {
      const element = document.querySelector(`[data-message-id="${targetMessage.id}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 50);
  }, [matchedMessages]);

  // 当 currentMatchIndex 变化时自动滚动到对应消息
  useEffect(() => {
    if (searchKeyword && matchedMessages.length > 0) {
      scrollToMatch(currentMatchIndex);
    }
  }, [currentMatchIndex, matchedMessages.length, searchKeyword]);

  // 导航到上一个匹配项
  const goToPrevMatch = useCallback(() => {
    if (matchedMessages.length === 0) return;
    setCurrentMatchIndex(prev => {
      return prev === 0 ? matchedMessages.length - 1 : prev - 1;
    });
  }, [matchedMessages.length]);

  // 导航到下一个匹配项
  const goToNextMatch = useCallback(() => {
    if (matchedMessages.length === 0) return;
    setCurrentMatchIndex(prev => {
      return prev === matchedMessages.length - 1 ? 0 : prev + 1;
    });
  }, [matchedMessages.length]);

  // 清除搜索
  const clearSearch = useCallback(() => {
    setSearchKeyword('');
    setCurrentMatchIndex(0);
  }, []);

  // 切换搜索框显示
  const toggleSearch = useCallback(() => {
    setIsSearchOpen(prev => !prev);
    if (isSearchOpen) {
      clearSearch();
    }
  }, [isSearchOpen, clearSearch]);

  // 处理搜索输入
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchKeyword(e.target.value);
    setCurrentMatchIndex(0);
  }, []);

  // 处理键盘事件
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        goToPrevMatch();
      } else {
        goToNextMatch();
      }
    } else if (e.key === 'Escape') {
      toggleSearch();
    }
  }, [goToNextMatch, goToPrevMatch, toggleSearch]);

  // 判断消息是否匹配
  const isMessageMatch = useCallback((msg: ChatMessageType): boolean => {
    if (!searchKeyword.trim()) return false;
    const contentMatch = msg.message.content.toLowerCase().includes(searchKeyword.toLowerCase());
    const reasoningMatch = msg.message.reasoning_content
      ? msg.message.reasoning_content.toLowerCase().includes(searchKeyword.toLowerCase())
      : false;
    return contentMatch || reasoningMatch;
  }, [searchKeyword]);

  // 切换多选模式
  const toggleMultiSelectMode = useCallback(() => {
    setIsMultiSelectMode(prev => !prev);
    setSelectedIds(new Set()); // 清空选中项
  }, []);

  // 切换单个消息的选中状态
  const toggleSelect = useCallback((id: string | number) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  // 全选/取消全选
  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === chatMessages.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(chatMessages.map(m => m.id)));
    }
  }, [chatMessages, selectedIds.size]);

  // 批量删除
  const handleBatchDelete = useCallback(() => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`确定要删除这 ${selectedIds.size} 条消息吗？`)) return;

    if (props.onBatchDelete) {
      props.onBatchDelete(Array.from(selectedIds));
    }
    setSelectedIds(new Set());
    setIsMultiSelectMode(false);
  }, [selectedIds, props.onBatchDelete]);

  return (
    <div className="chat-messages-wrapper">
      {/* 工具栏：搜索 + 多选 */}
      <div className={cn("search-bar-container", isSearchOpen && "search-open")}>
        <button
          className="search-toggle-btn"
          onClick={toggleSearch}
          title="搜索消息 (Ctrl+F)"
        >
          <Search size={18} />
        </button>

        {/* 多选模式切换按钮 */}
        <button
          className={cn("search-toggle-btn ml-2", isMultiSelectMode && "bg-blue-500 text-white")}
          onClick={toggleMultiSelectMode}
          title="多选模式"
        >
          <ListChecks size={18} />
        </button>

        {isSearchOpen && (
          <div className="search-input-wrapper">
            <input
              type="text"
              className="search-input"
              placeholder="搜索消息..."
              value={searchKeyword}
              onChange={handleSearchChange}
              onKeyDown={handleKeyDown}
              autoFocus
            />
            {searchKeyword && (
              <>
                <span className="search-count">
                  {matchedMessages.length > 0
                    ? `${currentMatchIndex + 1}/${matchedMessages.length}`
                    : '0/0'
                  }
                </span>
                <div className="search-nav-buttons">
                  <button
                    className="search-nav-btn"
                    onClick={goToPrevMatch}
                    disabled={matchedMessages.length === 0}
                    title="上一个 (Shift+Enter)"
                  >
                    <ChevronUp size={16} />
                  </button>
                  <button
                    className="search-nav-btn"
                    onClick={goToNextMatch}
                    disabled={matchedMessages.length === 0}
                    title="下一个 (Enter)"
                  >
                    <ChevronDown size={16} />
                  </button>
                </div>
                <button
                  className="search-clear-btn"
                  onClick={clearSearch}
                  title="清除搜索"
                >
                  <X size={16} />
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* 多选操作栏 */}
      {isMultiSelectMode && (
        <div className="flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 border-b">
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-1 px-2 py-1 text-sm rounded hover:bg-zinc-200 dark:hover:bg-zinc-700"
          >
            {selectedIds.size === chatMessages.length ? (
              <><CheckSquare size={16} /> 取消全选</>
            ) : (
              <><Square size={16} /> 全选</>
            )}
          </button>
          <span className="text-sm text-zinc-500">
            已选中 {selectedIds.size} 条
          </span>
          <button
            onClick={handleBatchDelete}
            disabled={selectedIds.size === 0}
            className="flex items-center gap-1 px-2 py-1 text-sm text-red-600 rounded hover:bg-red-100 dark:hover:bg-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 size={16} /> 删除选中
          </button>
          <button
            onClick={toggleMultiSelectMode}
            className="ml-auto text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
          >
            取消
          </button>
        </div>
      )}

      {/* 消息列表 */}
      <div className="chat-message-container" ref={chatMsgRef}>
        {chatMessages.map((chatMessage) => (
          <ChatMessageWithHighlight
            key={chatMessage.id}
            id={chatMessage.id}
            message={chatMessage.message}
            sender={chatMessage.sender}
            time={chatMessage.time}
            searchKeyword={searchKeyword}
            isMatch={isMessageMatch(chatMessage)}
            onStartEdit={props.onStartEdit}
            onDelete={props.onDeleteMessage}
            isMultiSelectMode={isMultiSelectMode}
            isSelected={selectedIds.has(chatMessage.id)}
            onToggleSelect={toggleSelect}
          />
        ))}
      </div>
    </div>
  );
}

export default ChatMessages;
