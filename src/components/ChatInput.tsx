//import { Chatbot } from 'supersimpledev';
import { useState, useEffect, useRef, type ChangeEvent } from 'react'
import './ChatInput.css';
import { Button } from '@/components/ui/button';
import { Textarea } from "@/components/ui/textarea"
import { NativeSelect, NativeSelectOption, } from "@/components/ui/native-select"
import { api } from '@/utils/api';
import { useTranslation } from 'react-i18next';
import { useNotification } from '@/hooks/useNotification';

export function ChatInput({ currentChatId, setChatMessages }: any) {
  const { t } = useTranslation();
  const [inputText, setInputText] = useState('');
  const [Loading, setLoading] = useState(false); // 加载状态，用于禁用输入框和按钮
  const [mode, setMode] = useState('disabled');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 通知功能
  const { sendNotification } = useNotification();

  // 当加载状态结束时，自动聚焦到输入框
  useEffect(() => {
    const inputEl = inputRef.current;
    if (inputEl && !Loading) {
      inputEl.focus();
    }
  }, [Loading])

  // 保存输入框的文本内容
  function saveInputText(event: ChangeEvent<HTMLTextAreaElement>) {
    setInputText(event.target.value);
  }

  function handleSelectChange(event: ChangeEvent<HTMLSelectElement>) {
    setMode(event.target.value);
  }

  // 发送消息的核心逻辑
  async function sendMessage() {
    // 如果没有当前会话、输入为空或正在加载中，则不发送
    if (!currentChatId || inputText === '' || Loading) {
      return;
    }
    setLoading(true);

    const text = inputText;

    // 清空输入框
    setInputText('');

    const newMsgId = crypto.randomUUID();
    const newAiMsgId = crypto.randomUUID();

    // 乐观更新：立即在界面上显示用户的消息和"Loading..."占位符
    const userMsg = {
      message: {
        content: text,
        reasoning_content: ''
      },
      sender: 'user',
      id: newMsgId,
      time: Date.now(),
    };

    const aiMsgPlaceholder = {
      message: {
        content: t('common.loading'), // 初始显示 Loading
        reasoning_content: ''
      },
      sender: 'robot',
      id: newAiMsgId,
      time: Date.now(),
    };

    // 使用函数式更新确保基于最新状态
    setChatMessages((prevV: any[]) => [
      ...prevV,
      userMsg,
      aiMsgPlaceholder
    ]);

    // 在 try-catch 外部声明，以便在 catch 块中也能访问
    let currentAiContent = "";
    let currentReasoning = "";

    try {
      // 图片生成模式：使用非流式接口
      if (mode === 'picture') {
        const result = await api.sendMessage(currentChatId, {
          content: text,
          mode: mode
        });

        currentAiContent = result.aiMessage.message.content;
        currentReasoning = result.aiMessage.message.reasoning_content || '';

        // 更新 AI 消息内容
        setChatMessages((prev: any[]) => {
          const newMessages = [...prev];
          const aiMsgIndex = newMessages.findIndex(msg => msg.id === newAiMsgId);
          if (aiMsgIndex !== -1) {
            newMessages[aiMsgIndex] = {
              ...newMessages[aiMsgIndex],
              message: {
                content: currentAiContent,
                reasoning_content: currentReasoning
              }
            };
          }
          return newMessages;
        });
      } else {
        // 聊天模式：使用流式接口
        let firstChunk = true;

        for await (const chunk of api.streamMessage(currentChatId, {
          content: text,
          mode: mode
        })) {
          if (firstChunk) {
            // 收到第一个 chunk 时，清除 "Loading..."
            currentAiContent = "";
            firstChunk = false;
          }

          if (chunk.type === 'thinking') {
            currentReasoning += chunk.text;
          } else if (chunk.type === 'content') {
            currentAiContent += chunk.text;
          } else if (chunk.type === 'error') {
            // 收到服务端错误
            currentAiContent = chunk.text;
          }

          // 实时更新 AI 消息内容
          setChatMessages((prev: any[]) => {
            const newMessages = [...prev];
            const aiMsgIndex = newMessages.findIndex(msg => msg.id === newAiMsgId);
            if (aiMsgIndex !== -1) {
              newMessages[aiMsgIndex] = {
                ...newMessages[aiMsgIndex],
                message: {
                  content: currentAiContent, // 如果还在思考，content 为空字符串(非Loading)
                  reasoning_content: currentReasoning
                }
              };
            }
            return newMessages;
          });
        }
      }

      // AI 回复完成，发送通知
      sendNotification(t('notification.newMessage'), t('notification.aiReplied'));

    } catch (error) {
      console.error('Failed to send message:', error);
      // 发生错误时，更新消息显示错误
      // 如果已经接收到内容，说明流式传输成功，不显示错误（可能只是浏览器的 chunked encoding 误报）
      // 只有在完全没有收到内容时才显示错误
      setChatMessages((prev: any[]) => {
        const newMessages = [...prev];
        const aiMsgIndex = newMessages.findIndex(msg => msg.id === newAiMsgId);
        if (aiMsgIndex !== -1) {
          const hasContent = currentAiContent.length > 0;
          const hasReasoning = currentReasoning.length > 0;

          // 如果已经接收到内容或推理过程，说明传输成功，只是浏览器报错
          if (hasContent || hasReasoning) {
            // 保留已接收的内容，不显示错误警告
            newMessages[aiMsgIndex] = {
              ...newMessages[aiMsgIndex],
              message: {
                content: currentAiContent,
                reasoning_content: currentReasoning
              }
            };
          } else {
            // 完全没有收到内容，显示真正的错误
            newMessages[aiMsgIndex] = {
              ...newMessages[aiMsgIndex],
              message: {
                content: t('chat.error'),
                reasoning_content: ''
              }
            };
          }
        }
        return newMessages;
      });
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className='chat-area'>
      <div className="chat-input-container">
        <Textarea
          ref={inputRef}
          placeholder={Loading ? t('common.loading') : t('chat.inputPlaceholder')}
          disabled={Loading}
          onChange={saveInputText}
          onKeyDown={(event) => {
            // 按下 Enter 键发送消息，Shift+Enter 换行
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              sendMessage();
            }
            // 按下 Escape 键清空输入框
            if (event.key === 'Escape') {
              setInputText('');
            }
          }}
          value={inputText}
          className="chat-input min-h-0 border-0 shadow-none focus-visible:ring-0"
        />
        <NativeSelect onChange={handleSelectChange} className='shrink-0 w-max'>
          <NativeSelectOption value='disabled' className='shrink-0'>{t('chat.modeFast')}</NativeSelectOption>
          <NativeSelectOption value='enabled' className='shrink-0'>{t('chat.modeThink')}</NativeSelectOption>
          <NativeSelectOption value='picture' className='shrink-0'>{t('chat.modePicture')}</NativeSelectOption>
        </NativeSelect>
        <Button
          disabled={Loading}
          onClick={sendMessage}
          className="send-button ml-3"
        >{t('chat.send')}</Button>
      </div ></div>

  );
}
