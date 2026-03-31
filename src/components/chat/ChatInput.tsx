//import { Chatbot } from 'supersimpledev';
import { useState, useEffect, useRef, type ChangeEvent } from 'react'
import './ChatInput.css';
import { Button } from '@/components/ui/button';
import { Textarea } from "@/components/ui/textarea"
import { NativeSelect, NativeSelectOption, } from "@/components/ui/native-select"
import { api } from '@/utils/api';
import { useTranslation } from 'react-i18next';

import { ImagePlus, X, Sparkles } from 'lucide-react';
import { useImageUpload } from '../../hooks/useImageUpload';

interface ChatInputProps {
  currentChatId: string | null;
  chatMessages?: any[];
  setChatMessages: (fn: (prev: any[]) => any[]) => void;
  editingMessage?: { id: string | number; content: string } | null;
  onCancelEdit?: () => void;
  refreshMessages?: () => Promise<void>;
}

export function ChatInput({ currentChatId, setChatMessages, editingMessage, onCancelEdit, refreshMessages }: ChatInputProps) {
  const { t } = useTranslation();
  const [inputText, setInputText] = useState('');

  // Image upload state extracted to custom hook
  const {
    imageData,
    imageMimeType,
    imagePreview,
    fileInputRef,
    handleImageSelect,
    removeImage,
    handleImageButtonClick
  } = useImageUpload();

  const [Loading, setLoading] = useState(false); // 加载状态，用于禁用输入框和按钮
  const [mode, setMode] = useState('disabled');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 当 editingMessage 变化时，填充输入框
  useEffect(() => {
    if (editingMessage) {
      setInputText(editingMessage.content);
      inputRef.current?.focus();
    }
  }, [editingMessage]);

  // 润色状态
  const [polishing, setPolishing] = useState(false);

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

  // AI 润色 prompt
  async function handlePolish() {
    if (!inputText.trim() || polishing || Loading) {
      return;
    }

    setPolishing(true);
    const originalText = inputText;

    try {
      // 调用润色API，直接获取结果
      const polishedText = await api.polishPrompt(originalText);
      setInputText(polishedText);
    } catch (error) {
      console.error('润色失败:', error);
      // 润色失败时保持原始内容不变
    } finally {
      setPolishing(false);
    }
  }
  // 发送消息的核心逻辑
  async function sendMessage() {
    // 如果没有当前会话、输入为空或正在加载中，则不发送
    if (!currentChatId || inputText === '' || Loading) {
      return;
    }
    setLoading(true);

    const text = inputText;
    // 保存图片预览，在清空前获取
    const currentImagePreview = imagePreview;

    // 清空输入框
    setInputText('');
    removeImage();

    // 如果是编辑模式，先删除该消息及之后的所有消息
    if (editingMessage) {
      try {
        // 调用后端 API 删除该消息及之后的所有消息
        await api.deleteMessagesAfter(currentChatId, editingMessage.id.toString());

        // 更新本地状态：删除该消息及之后的所有消息
        setChatMessages((prev: any[]) => {
          const index = prev.findIndex(m => m.id === editingMessage.id);
          if (index !== -1) {
            return prev.slice(0, index);
          }
          return prev;
        });

        // 清除编辑状态
        onCancelEdit?.();
      } catch (error) {
        console.error('Failed to delete messages:', error);
        setLoading(false);
        return;
      }
    }

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
      imageUrl: currentImagePreview || undefined, // 包含图片预览
    };

    const aiMsgPlaceholder = {
      message: {
        content: 'Loading...', // 初始显示 Loading
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
          mode: mode,
          image_data: imageData || undefined,
          image_mime_type: imageMimeType || undefined
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
        // 聊天模式：使用流式接口（支持多模态）
        let firstChunk = true;

        for await (const chunk of api.streamMessage(currentChatId, {
          content: text,
          mode: mode,
          image_data: imageData || undefined,
          image_mime_type: imageMimeType || undefined
        })) {
          if (firstChunk) {
            // 收到第一个 chunk 时，清除 "Loading...消息"
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
                content: 'Sorry, I encountered an error while processing your request.',
                reasoning_content: ''
              }
            };
          }
        }
        return newMessages;
      });
    } finally {
      setLoading(false);
      // 刷新消息列表，确保本地 ID 与服务器同步
      // 延迟一小段时间，确保服务器完成保存
      if (refreshMessages) {
        setTimeout(() => {
          refreshMessages().catch(err => console.error('Failed to refresh messages:', err));
        }, 500);
      }
    }
  }
  return (
    <div className='chat-area'>
      {imagePreview && (
        <div className="px-4 pt-2 relative inline-block">
          <div className="relative group inline-block">
            <img
              src={imagePreview}
              alt="Preview"
              className="h-20 w-auto rounded-lg border border-zinc-200 dark:border-zinc-700 object-cover"
            />
            <button
              onClick={removeImage}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-600"
              title={t('chat.removeImage')}
            >
              <X size={12} />
            </button>
          </div>
        </div>
      )}
      <div className="chat-input-container flex-nowrap overflow-x-hidden gap-1 md:gap-2">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageSelect}
          accept="image/*"
          className="hidden"
        />

        {/* 图片上传按钮 - 在所有模式下都显示（支持多模态对话） */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleImageButtonClick}
          disabled={Loading}
          className="shrink-0 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
          title={t('chat.uploadImage')}
        >
          <ImagePlus size={20} />
        </Button>

        <Textarea
          ref={inputRef}
          placeholder={Loading ? t('common.loading') : (editingMessage ? t("chat.editingMessage") : t("chat.inputPlaceholder"))}
          disabled={Loading}
          onChange={saveInputText}
          onKeyDown={(event) => {
            // 按下 Enter 键发送消息，Shift+Enter 换行
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              sendMessage();
            }
            // 按下 Escape 键取消编辑或清空输入框
            if (event.key === 'Escape') {
              if (editingMessage) {
                setInputText('');
                onCancelEdit?.();
              } else {
                setInputText('');
              }
            }
          }}
          value={inputText}
          className="chat-input flex-1 min-w-0 min-h-0 border-0 shadow-none focus-visible:ring-0 mr-1"
        />
        {editingMessage && (
          <Button
            onClick={() => { setInputText(''); onCancelEdit?.(); }}
            variant="ghost"
            className="text-red-500 hover:text-red-700 shrink-0 px-2"
          >Cancel</Button>
        )}

        {/* AI 润色按钮 - 只在图片模式下显示 */}
        {mode === 'picture' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePolish}
            disabled={Loading || polishing || !inputText.trim()}
            className="polish-btn shrink-0"
            title={t('chat.polish')}
          >
            <Sparkles size={16} className="mr-1 hidden md:inline-block" />
            <span className="hidden md:inline-block">{polishing ? t('chat.polishing') : t('chat.polish')}</span>
            <span className="inline-block md:hidden">✨</span>
          </Button>
        )}
        <NativeSelect onChange={handleSelectChange} className='shrink-0 w-24 md:w-max max-w-28'>
          <NativeSelectOption value='disabled' className='shrink-0'>{t('mode.fast')}</NativeSelectOption>
          <NativeSelectOption value='enabled' className='shrink-0'>{t('mode.think')}</NativeSelectOption>
          <NativeSelectOption value='picture' className='shrink-0'>{t('mode.picture')}</NativeSelectOption>
        </NativeSelect>
        <Button
          disabled={Loading}
          onClick={sendMessage}
          className="send-button shrink-0 px-3 md:px-4"
        >{editingMessage ? t('chat.resend') : t('chat.send')}</Button>
      </div></div>

  );
}

