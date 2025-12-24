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
import { ChevronsUpDown, Search, X, ChevronUp, ChevronDown, Copy, Check, Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';

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
  isMatch
}: ChatMessageType & { searchKeyword: string; isMatch: boolean }) {
  const { t } = useTranslation();

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
  const [copied, setCopied] = React.useState(false);

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

  // 复制内容到剪贴板（仅用于文本）
  const handleCopy = async () => {
    try {
      // 以下代码用于复制图片，但由于跨域限制暂时注释
      // if (isImage) {
      //   try {
      //     const response = await fetch(message.content);
      //     const blob = await response.blob();
      //     await navigator.clipboard.write([
      //       new ClipboardItem({ [blob.type]: blob })
      //     ]);
      //   } catch {
      //     await navigator.clipboard.writeText(message.content);
      //   }
      // } else {
      //   await navigator.clipboard.writeText(message.content);
      // }
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Copy failed:', error);
    }
  };

  // 下载图片
  const handleDownload = () => {
    window.open(message.content, '_self');
  };

  return (
    <div className={cn('chat-msg-area', isMatch && searchKeyword && 'search-match')} data-message-id={id}>
      {message.reasoning_content && (
        <div className='reasoning-area mb-4 w-full'>
          <Collapsible
            open={isOpen}
            onOpenChange={setIsOpen}
            className="items-center">
            <div>
              <CollapsibleTrigger className="flex items-center justify-star gap-4 px-4 ml-15 bg-zinc-100 hover:bg-zinc-200 rounded-md pt-2 pb-2 dark:bg-zinc-800 dark:hover:bg-zinc-700">
                <h4 className="text-sm font-semibold">
                  {isOpen ? t('chat.hideThinking') : t('chat.showThinking')}
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
      <div className={sender === 'user' ? 'chat-user-msg' : 'chat-robot-msg'}>
        {sender === 'robot' && (
          <img src={RobotProfileImage}
            className="chat-message-profile"
          />
        )}
        <div className="chat-msg-text">
          {renderContentWithHighlight()}
          <div className="msg-footer">
            <p className='msg-time'>{Time}</p>
            {message.content && message.content !== 'Loading...' && (
              isImage ? (
                <button
                  className="copy-btn"
                  onClick={handleDownload}
                  title={t('images.download')}
                >
                  <Download size={14} />
                </button>
              ) : (
                <button
                  className="copy-btn"
                  onClick={handleCopy}
                  title={t('chat.copy')}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </button>
              )
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

export function ChatMessages({ chatMessages }: ChatMessagesProps) {
  const { t } = useTranslation();

  // 搜索相关状态
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

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

  return (
    <div className="chat-messages-wrapper">
      {/* 搜索栏 */}
      <div className={cn("search-bar-container", isSearchOpen && "search-open")}>
        <button
          className="search-toggle-btn"
          onClick={toggleSearch}
          title={t('chat.searchTooltip')}
        >
          <Search size={18} />
        </button>

        {isSearchOpen && (
          <div className="search-input-wrapper">
            <input
              type="text"
              className="search-input"
              placeholder={t('chat.searchPlaceholder')}
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
                    title={t('chat.prevMatch')}
                  >
                    <ChevronUp size={16} />
                  </button>
                  <button
                    className="search-nav-btn"
                    onClick={goToNextMatch}
                    disabled={matchedMessages.length === 0}
                    title={t('chat.nextMatch')}
                  >
                    <ChevronDown size={16} />
                  </button>
                </div>
                <button
                  className="search-clear-btn"
                  onClick={clearSearch}
                  title={t('chat.clearSearch')}
                >
                  <X size={16} />
                </button>
              </>
            )}
          </div>
        )}
      </div>

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
          />
        ))}
      </div>
    </div>
  );
}

export default ChatMessages;
