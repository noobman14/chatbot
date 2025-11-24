import { useAutoScroll } from './useAutoScroll';
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
import { ChevronsUpDown } from 'lucide-react';

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

// 单条消息组件
function ChatMessage({ message, sender, time }: ChatMessageType) {
  const markdownStyles = cn(
    "prose prose-sm max-w-none break-words whitespace-pre-wrap",
    "text-black dark:text-white",
    // 代码块外观自定义样式
    "[&_pre]:bg-zinc-900 [&_pre]:text-blue-700 [&_pre]:p-4 [&_pre]:rounded-xl",
    "[&_pre]:overflow-x-auto [&_pre]:border [&_pre]:border-zinc-700",
    // 行内代码外观自定义样式
    "[&_p_code]:bg-blue-100[&_p_code]:text-blue-700[&_p_code]:dark:bg-blue-900 [&_p_code]:dark:text-blue-200",
  );
  if (typeof message.content !== 'string') {
    return null;
  }

  // 格式化时间显示
  let Time;
  if (!time) { Time = dayjs().format('YYYY-MM-DD h:mm A'); }
  Time = dayjs(time).format('YYYY-MM-DD h:mm A');

  return (
    <div className='chat-msg-area '>
      {message.reasoning_content && (
        <div className='reasoning-area mb-4 w-full'>
          <Collapsible defaultOpen={false} className="items-center">
            <div>
              <CollapsibleTrigger className="flex items-center justify-star gap-4 px-4 ml-15 bg-zinc-100 hover:bg-zinc-200 rounded-md pt-2 pb-2 dark:bg-zinc-800 dark:hover:bg-zinc-700">
                <h4 className="text-sm font-semibold">
                  Show Thinking
                </h4>
                <ChevronsUpDown />
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent>
              {<div className="mt-2 px-4 py-3 ml-15 border-l-2 border-zinc-200 dark:border-zinc-700 pl-4 Thinking-content ">
                {/* 思考过程通常建议字体稍微淡 */}
                <div className={cn(markdownStyles, "text-muted-foreground text-xs sm:text-sm")}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {message.reasoning_content}
                  </ReactMarkdown>
                </div>
              </div>}
            </CollapsibleContent>
          </Collapsible>
        </div>
      )
      }
      <div className={sender === 'user' ? 'chat-user-msg' : 'chat-robot-msg'}>
        {/* 机器人头像 */}
        {sender === 'robot' &&
          (
            <img src={RobotProfileImage}
              className="chat-message-profile"
            />
          )}
        <div className="chat-msg-text">
          {/* 如果消息内容是 Loading... 则显示加载动画，否则渲染 Markdown 内容 */}
          {message.content === 'Loading...'
            ? (<img src={LoadingImage} className='loading-img' />)
            : (<div
              className={markdownStyles}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
            </div>)
          }
          <p className='msg-time'>{Time}</p>
        </div >
        {/* 用户头像 */}
        {
          sender === 'user' &&
          (
            <img src={UserProfileImage}
              className="chat-message-profile"
            />
          )}
      </div>
    </div >
  );

}



export function ChatMessages({ chatMessages }: ChatMessagesProps) {
  // 使用自定义 Hook 实现消息列表自动滚动到底部
  const chatMsgRef = useAutoScroll([chatMessages]);
  return (
    <div className="chat-message-container"
      ref={chatMsgRef}>
      {chatMessages.map((chatMessage) => {
        return (
          <ChatMessage
            key={chatMessage.id}
            id={chatMessage.id}
            message={chatMessage.message}
            sender={chatMessage.sender}
            time={chatMessage.time}
          />);
      })}
    </div>)
}
export default ChatMessages;
