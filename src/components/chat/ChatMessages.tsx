import { useAutoScroll } from '../../hooks/useAutoScroll';
import React from 'react';
import ReactMarkdown from 'react-markdown';



import remarkGfm from 'remark-gfm';
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
import { ChevronsUpDown, Pencil, Copy, Download } from 'lucide-react';

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
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
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
